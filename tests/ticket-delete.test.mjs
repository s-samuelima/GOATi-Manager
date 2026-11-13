import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const src=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const sql=readFileSync(new URL('../supabase/migrations/20261113_admin_delete_tickets.sql',import.meta.url),'utf8');
const extract=(a,b)=>{const i=src.indexOf(a),j=src.indexOf(b,i+a.length);assert.ok(i>=0&&j>i);return src.slice(i,j);};
const submit=extract('async function handleSubmit(form){',"app.addEventListener('click'");
const modal=extract('function renderModal(){','function authPage(){');
const ids=['c79aa0aa-b77e-4e13-98f9-3126ed902fe1','c79aa0aa-b77e-4e13-98f9-3126ed902fe2'];
function mock({admin=true,online=true,demo=false,confirmation='EXCLUIR'}={}){
 const state={modal:{type:'delete-tickets',ids:[...ids]},selectedTicketIds:new Set(ids),lastNotified:new Set(ids),data:{tickets:ids.map((id,i)=>({id,number:i+1,title:'Teste',status:'aberto'})),messages:ids.map(ticket_id=>({ticket_id})),reviews:ids.map(ticket_id=>({ticket_id}))}};
 const deleted=[];let persisted=0;
 const handleSubmit=runInNewContext(submit+'\nhandleSubmit',{state,formData:()=>new Map([['confirmation',confirmation]]),isAdmin:()=>admin,navigator:{onLine:online},demo,cloud:{deleteTicket:async id=>{deleted.push(id);return{id};}},persist:async()=>{persisted++},reload:async()=>{},toast:()=>{}});
 return{state,deleted,persisted:()=>persisted,run:()=>handleSubmit({id:'form-delete-tickets'})};
}
test('Admin exclui chamados selecionados',async()=>{const x=mock();await x.run();assert.deepEqual(x.deleted,ids);assert.equal(x.state.selectedTicketIds.size,0);assert.equal(x.state.modal,null);});
test('Funcionário não pode excluir',async()=>{const x=mock({admin:false});await assert.rejects(x.run(),/Apenas administradores/);assert.equal(x.deleted.length,0);});
test('Confirmação EXCLUIR é obrigatória',async()=>{const x=mock({confirmation:'excluir'});await assert.rejects(x.run(),/Digite EXCLUIR/);assert.equal(x.deleted.length,0);});
test('Exclusão online exige internet',async()=>{const x=mock({online:false});await assert.rejects(x.run(),/Conecte-se à internet/);});
test('Demonstração remove também mensagens e avaliações',async()=>{const x=mock({demo:true});await x.run();assert.equal(x.state.data.tickets.length,0);assert.equal(x.state.data.messages.length,0);assert.equal(x.state.data.reviews.length,0);assert.equal(x.persisted(),1);});
test('Modal de exclusão é exclusivo do administrador',()=>{const render=admin=>runInNewContext(modal+'\nrenderModal',{state:{modal:{type:'delete-tickets',ids:[ids[0]]},data:{tickets:[{id:ids[0],number:1,title:'Teste'}]}},isAdmin:()=>admin,icon:()=>'',esc:String})();assert.match(render(true),/Digite EXCLUIR/);assert.equal(render(false),'');});
test('SQL cria permissão RLS e auditoria, não apaga dados sozinho',()=>{assert.match(sql,/tickets_delete_admin/);assert.match(sql,/private\.is_admin/);assert.match(sql,/public\.audit_log/);assert.doesNotMatch(sql,/delete\s+from\s+public\.tickets/i);});
