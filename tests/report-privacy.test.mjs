import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {downloadPDF} from '../src/reports.js';

const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const periodSource=main.slice(main.indexOf('function periodWindow(){'),main.indexOf('function reportsPage(){'));
const reportSource=main.slice(main.indexOf('function report(kind){'),main.indexOf('function formData(form){'));
const reference=new Date('2026-11-23T12:00:00');
class FixedDate extends Date{
 constructor(...args){super(...(args.length?args:[reference.getTime()]));}
 static now(){return reference.getTime();}
}
const dateShort=value=>new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date(value));
function makeReport(kind,{period='mensal',rangeFrom='',rangeTo='',allowed=true,data}={}){
 const state={period,rangeFrom,rangeTo,data:data||{
  tickets:[
   {id:'t1',number:1,created_at:'2026-11-23T10:00:00',requester_name:'Ana',sector:'Comercial',status:'resolvido',title:'Chamado de hoje',total_seconds:44321},
   {id:'t2',number:2,created_at:'2026-11-22T10:00:00',requester_name:'Bruno',sector:'Financeiro',status:'aberto',title:'Chamado anterior'},
   {id:'old',number:3,created_at:'2026-10-31T10:00:00',title:'FORA DO PERIODO'}
  ],
  activities:[
   {id:'a1',date:'2026-11-23',title:'Atividade de hoje',category:'Redes',sector:'TI',status:'Concluída',minutes:987},
   {id:'a2',date:'2026-11-22',title:'Atividade anterior',category:'Suporte',sector:'TI',status:'Pendente',minutes:987},
   {id:'old',date:'2026-10-31',title:'FORA DO PERIODO',minutes:987}
  ],
  timeEntries:[{ticket_id:'t1',started_at:'2026-11-23T08:00:00',ended_at:'2026-11-23T09:00:00'}],reviews:[]
 }};
 let output;
 const context=vm.createContext({
  state,Date:FixedDate,dateShort,now:()=>reference.toISOString(),today:()=> '2026-11-23',
  canManage:()=>allowed,canViewInventory:()=>false,
  statusNames:{aberto:'Aberto',resolvido:'Resolvido',andamento:'Em andamento'},
  ticketTotalSeconds:()=>{throw new Error('O PDF não deve consultar o tempo de atendimento.');},
  formatDuration:()=>{throw new Error('O PDF não deve formatar duração.');},
  downloadPDF:payload=>{output=payload;},toast:()=>{}
 });
 vm.runInContext(periodSource+reportSource+';report('+JSON.stringify(kind)+');',context);
 return {output,state};
}
async function capturePdf(payload){
 const previous={document:globalThis.document,create:URL.createObjectURL,revoke:URL.revokeObjectURL,setTimeout:globalThis.setTimeout};
 let blob,filename;
 try{
  globalThis.document={createElement:()=>({click(){},remove(){},set href(value){},set download(value){filename=value;}}),body:{appendChild(){}}};
  URL.createObjectURL=value=>{blob=value;return 'blob:goati-test';};URL.revokeObjectURL=()=>{};
  globalThis.setTimeout=()=>0;
  downloadPDF(payload);
  return {bytes:new Uint8Array(await blob.arrayBuffer()),filename};
 }finally{
  globalThis.document=previous.document;URL.createObjectURL=previous.create;URL.revokeObjectURL=previous.revoke;globalThis.setTimeout=previous.setTimeout;
 }
}
const assertPrivate=output=>assert.doesNotMatch(JSON.stringify(output),/Tempo TI|Tempo de TI|Duração|Horas registradas|987|44321|started_at|ended_at/);

test('Chamados e atividades individuais não exportam campos ou totais de tempo',()=>{
 for(const kind of ['chamados','atividades']){
  const {output,state}=makeReport(kind);
  assert.ok(output.rows.length);
  assertPrivate(output);
  assert.equal(state.data.activities[0].minutes,987);
  assert.equal(state.data.tickets[0].total_seconds,44321);
  assert.equal(state.data.timeEntries[0].ended_at,'2026-11-23T09:00:00');
 }
});

test('PDF conjunto mantém duas seções e aplica o mesmo período nas duas origens',()=>{
 for(const [period,rangeFrom,rangeTo,count] of [
  ['diario','','',1],['semanal','','',1],['mensal','','',2],['personalizado','2026-11-22','2026-11-23',2]
 ]){
  const {output}=makeReport('consolidado',{period,rangeFrom,rangeTo});
  assert.equal(output.sections.length,2);
  assert.equal(output.sections[0].title,'Chamados');
  assert.equal(output.sections[1].title,'Atividades de TI');
  assert.equal(output.sections[0].rows.length,count,period);
  assert.equal(output.sections[1].rows.length,count,period);
  assert.equal(output.metrics.find(([label])=>label==='Total de registros')[1],count*2);
  assert.match(output.subtitle,/Período:/);
  assert.doesNotMatch(JSON.stringify(output),/FORA DO PERIODO/);
  assertPrivate(output);
 }
});

test('Relatório conjunto informa ausência de registros sem perder uma das seções',async()=>{
 const {output}=makeReport('consolidado',{data:{tickets:[],activities:[],reviews:[]}});
 assert.equal(output.sections.length,2);
 assert.ok(output.sections.every(section=>section.rows.length===0));
 const {bytes,filename}=await capturePdf(output);
 const text=new TextDecoder('windows-1252').decode(bytes);
 assert.equal(filename,'GOATi_consolidado_2026-11-23.pdf');
 assert.match(text,/Chamados/);
 assert.match(text,/Atividades de TI/);
 assert.equal((text.match(/Nenhum registro encontrado/g)||[]).length,2);
});

test('Permissão dos relatórios continua impedindo exportação por funcionário comum',()=>{
 for(const kind of ['consolidado','chamados','atividades'])assert.equal(makeReport(kind,{allowed:false}).output,undefined);
});

test('PDF conjunto paginado preserva as duas tabelas, o último registro e xref válido',async()=>{
 const {output}=makeReport('consolidado');
 output.sections[0].rows=Array.from({length:35},(_,i)=>[i+1,'23/11/2026','Colaborador','Comercial','Resolvido',i===34?'FINALCHAMADO':'Configuração de estação e correção de acesso']);
 output.sections[1].rows=Array.from({length:18},(_,i)=>['23/11/2026',i===17?'FINALATIVIDADE':'Revisão dos equipamentos de informática','Manutenção','TI','Concluída']);
 const {bytes}=await capturePdf(output);
 const text=new TextDecoder('windows-1252').decode(bytes);
 assert.equal(text.slice(0,8),'%PDF-1.4');
 assert.ok((text.match(/\/Type \/Page /g)||[]).length>1);
 assert.match(text,/Atividades de TI/);assert.match(text,/FINALCHAMADO/);assert.match(text,/FINALATIVIDADE/);
 const xref=Number(/startxref\n(\d+)/.exec(text)[1]);
 assert.equal(new TextDecoder().decode(bytes.slice(xref,xref+4)),'xref');
 assertPrivate(output);
});

test('Células com muito texto continuam na página seguinte sem truncar o final',async()=>{
 const {bytes}=await capturePdf({title:'Relatório de teste',headers:['Atividade'],rows:[['Procedimento documentado '.repeat(180)+'FIMDOREGISTRO']]});
 const text=new TextDecoder('windows-1252').decode(bytes);
 assert.match(text,/FIMDOREGISTRO/);
 assert.ok((text.match(/\/Type \/Page /g)||[]).length>1);
});

test('Registros que cabem em uma página não são cortados na quebra da tabela',async()=>{
 const rows=Array.from({length:25},(_,i)=>{
  const code=String(i).padStart(3,'0');
  return ['REG_'+code,'Texto com várias palavras para registrar um procedimento no computador da equipe. '.repeat(2)+'FIM_'+code];
 });
 const {bytes}=await capturePdf({title:'Atividades de TI',headers:['Código','Descrição'],rows});
 const text=new TextDecoder('windows-1252').decode(bytes);
 const streams=[...text.matchAll(/stream\n([\s\S]*?)\nendstream/g)].map(match=>match[1]);
 for(let i=0;i<rows.length;i++){
  const code=String(i).padStart(3,'0');
  const page=streams.find(stream=>stream.includes('(REG_'+code+') Tj'));
  assert.ok(page?.includes('FIM_'+code),'Registro '+code+' deve permanecer inteiro na mesma página.');
 }
});
