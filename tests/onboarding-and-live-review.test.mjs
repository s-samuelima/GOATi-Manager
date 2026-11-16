import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const src=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const migration=readFileSync(new URL('../supabase/migrations/20261116_signup_auto_access_delete_users.sql',import.meta.url),'utf8');
const extract=(begin,end)=>{const a=src.indexOf(begin),b=src.indexOf(end,a+begin.length);assert.ok(a>=0&&b>a,'Trecho ausente '+begin);return src.slice(a,b);};
const submit=extract('async function handleSubmit(form){',"app.addEventListener('click'");
const poll=extract('async function checkEmployeeReviewUpdates(){','let employeeReviewCheckRunning=false;');

test('Novo visitante vê Criar conta; usuário existente encontra Fazer login',()=>{
 assert.match(src,/authView:'signup',authEmail:/);
 assert.match(src,/Já tem cadastro\?/);
 assert.match(src,/Fazer login/);
});
test('SQL ativa apenas novos perfis como funcionário e preserva contas existentes',()=>{
 assert.match(migration,/create or replace function private\.create_profile_for_user/);
 assert.match(migration,/'funcionario','ativo'/);
 assert.doesNotMatch(migration,/update\s+public\.profiles\s+set\s+status/i);
});
test('Exclusão no servidor é restrita, registra auditoria e preserva histórico',()=>{
 assert.match(migration,/private\.is_admin\(\)/);
 assert.match(migration,/target_user=\(select auth\.uid\(\)\)/);
 assert.match(migration,/item\.role='admin'/);
 assert.match(migration,/public\.tickets where requester_id=target_user/);
 assert.match(migration,/public\.ticket_messages where author_id=target_user/);
 assert.match(migration,/public\.reviews where author_id=target_user/);
 assert.match(migration,/ticket_time_entries/);
 assert.match(migration,/public\.audit_log/);
 assert.doesNotMatch(migration,/delete from public\.tickets/i);
});
test('Cadastro com login liberado entra sem pedir aprovação',async()=>{
 let logged=0, loaded=0, signed=0;
 const cloud={session:null,signup:async()=>{signed++;},login:async()=>{logged++;cloud.session={user:{id:'user'}};}};
 const state={authEmail:'',authLoginFailed:false,authView:'signup'};
 const fn=runInNewContext(submit+'\nhandleSubmit',{state,cloud,formData:f=>f.fd,loadAccount:async()=>{loaded++;},toast:()=>{},isLoginCredentialFailure:()=>false});
 const fd=new Map([['name','Pessoa Teste'],['sector','TI'],['email','pessoa@teste.com'],['password','12345678'],['confirm','12345678']]);
 await fn({id:'form-signup',fd});
 assert.equal(signed,1);assert.equal(logged,1);assert.equal(loaded,1);assert.equal(state.authEmail,'');
});
test('Excluir usuário requer confirmação; recusa histórico mesmo em demo',async()=>{
 const state={modal:{type:'delete-user',id:'user'},data:{profiles:[{id:'user',role:'funcionario'}],tickets:[{requester_id:'user'}],messages:[],reviews:[],timeEntries:[]}};
 const fn=runInNewContext(submit+'\nhandleSubmit',{state,formData:f=>f.fd,isAdmin:()=>true,userId:()=> 'admin',navigator:{onLine:true},demo:true,persist:async()=>{},reload:async()=>{},toast:()=>{}});
 await assert.rejects(fn({id:'form-delete-user',dataset:{id:'user'},fd:new Map([['confirmation','EXCLUIR']])}),/histórico de atendimento/);
 assert.equal(state.data.profiles.length,1);
 await assert.rejects(fn({id:'form-delete-user',dataset:{id:'user'},fd:new Map([['confirmation','ERRADO']])}),/Digite EXCLUIR/);
});
function employeeCheck({status='ativo'}={}){
 const state={user:{id:'user'},profile:{status:'ativo'},modal:null,view:'dashboard',data:{tickets:[{id:'t1',requester_id:'user',status:'andamento'}],reviews:[]}};
 let prompts=0,pending=0;
 const cloud={profile:async()=>({id:'user',status}),list:async table=>table==='tickets'?[{id:'t1',requester_id:'user',status:'resolvido'}]:[]};
 const fn=runInNewContext(poll+'\ncheckEmployeeReviewUpdates',{state,configured:true,canManage:()=>false,isActive:()=>true,navigator:{onLine:true},userId:()=> 'user',cloud,showReviewPromptIfNeeded:()=>{prompts++;return true;},renderPending:()=>{pending++;},renderShell:()=>{}});
 return{run:()=>fn(),state,prompts:()=>prompts,pending:()=>pending};
}
test('Funcionário com aplicativo aberto recebe convite quando chamado é resolvido',async()=>{
 const x=employeeCheck();await x.run();
 assert.equal(x.state.data.tickets[0].status,'resolvido');assert.equal(x.prompts(),1);
});
test('Sessão de usuário bloqueado perde acesso aos registros locais',async()=>{
 const x=employeeCheck({status:'bloqueado'});await x.run();
 assert.equal(x.state.profile.status,'bloqueado');assert.equal(x.pending(),1);assert.equal(x.state.data.tickets.length,0);
});
