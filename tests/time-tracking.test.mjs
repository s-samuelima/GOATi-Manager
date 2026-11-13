import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const source=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const sql=readFileSync(new URL('../supabase/migrations/20261113_ticket_time_tracking.sql',import.meta.url),'utf8');
const start=source.indexOf('function ticketTimeEntries('),end=source.indexOf('function renderModal(){',start);
assert.ok(start>=0&&end>start,'helpers presentes');
const helpers=source.slice(start,end);
function helperCtx(data){
 const state={data,role:'admin',timerMigrationMissing:false};
 const context={state,isAdmin:()=>true,canManage:()=>true,demo:true,userId:()=> 'admin-1',esc:String,dateLong:x=>x};
 return runInNewContext(helpers+'\n({ticketTotalSeconds,formatDuration,ticketTimerPanel})',context);
}
test('Formato de tempo HH:MM:SS e soma de sessões',()=>{
 const data={timeEntries:[
  {ticket_id:'t1',technician_id:'admin-1',started_at:'2026-11-13T12:00:00Z',ended_at:'2026-11-13T12:05:05Z'},
  {ticket_id:'t1',technician_id:'admin-1',started_at:'2026-11-13T12:10:00Z',ended_at:'2026-11-13T12:13:01Z'}
 ],profiles:[]};
 const h=helperCtx(data);
 assert.equal(h.ticketTotalSeconds('t1'),486);
 assert.equal(h.formatDuration(486),'00:08:06');
});
test('Painel do administrador oferece início e pausa',()=>{
 const h=helperCtx({timeEntries:[],profiles:[]});
 assert.match(h.ticketTimerPanel({id:'t1',status:'aberto'}),/Iniciar atendimento/);
 const p=helperCtx({timeEntries:[{ticket_id:'t1',technician_id:'admin-1',started_at:new Date().toISOString(),ended_at:null}],profiles:[]});
 assert.match(p.ticketTimerPanel({id:'t1',status:'andamento'}),/Pausar/);
 assert.match(p.ticketTimerPanel({id:'t1',status:'andamento'}),/Finalizar atendimento/);
});
test('Acionar cronômetro na demonstração grava sessões',async()=>{
 const i=source.indexOf(" if(act==='ticket-timer'&&isAdmin())"),j=source.indexOf(" if(act==='select-ticket'",i);
 assert.ok(i>0&&j>i,'ação de cronômetro presente');
 const branch=source.slice(i,j);
 const ticket={id:'t1',status:'aberto'};
 const state={data:{timeEntries:[]},modal:null,timerMigrationMissing:false};
 const timestamps=['2026-11-13T12:00:00.000Z','2026-11-13T12:03:00.000Z'];
 let persisted=0;
 const fn=runInNewContext('(async function(el){const act=el.dataset.action;'+branch+'})',{
  state,demo:true,isAdmin:()=>true,navigator:{onLine:true},getTicket:()=>ticket,userId:()=> 'admin-1',
  makeId:()=> 'sess-1',now:()=>timestamps.shift()||'2026-11-13T12:03:00.000Z',
  persist:async()=>{persisted++;},reload:async()=>{},renderShell:()=>{},toast:()=>{},cloud:{timerAction:async()=>{}}
 });
 await fn({dataset:{action:'ticket-timer',id:'t1',operation:'start'}});
 assert.equal(ticket.status,'andamento');
 assert.equal(state.data.timeEntries.length,1);
 await fn({dataset:{action:'ticket-timer',id:'t1',operation:'pause'}});
 assert.equal(state.data.timeEntries[0].ended_at,'2026-11-13T12:03:00.000Z');
 assert.equal(persisted,2);
});
test('Qualquer parte da linha abre o chamado e seleção de exclusão é separada',()=>{
 assert.match(source,/tr class="ticket-clickable" tabindex="0" data-action="ticket"/);
 assert.match(source,/data-action="select-ticket"/);
 assert.match(source,/ticket-clickable\[data-action="ticket"\]/);
});
test('Avaliações permanecem no chamado e no menu lateral',()=>{
 assert.match(source,/Avaliação do usuário/);
 assert.match(source,/key:'avaliacoes'/);
 assert.match(source,/Avaliar atendimento/);
});
test('SQL mantém RLS, usa relógio de servidor e não remove chamados',()=>{
 assert.match(sql,/enable row level security/i);
 assert.match(sql,/private\.is_admin/);
 assert.match(sql,/unique index if not exists ticket_time_one_active_per_tech/);
 assert.match(sql,/pg_catalog\.now\(\)/);
 assert.doesNotMatch(sql,/delete\s+from\s+public\.tickets/i);
});
