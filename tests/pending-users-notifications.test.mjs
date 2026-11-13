import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const source=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const start=source.indexOf('function pendingProfiles(){');
const end=source.indexOf('function initials(n){',start);
assert.ok(start>0&&end>start,'Helpers de notificações devem existir');
const code=source.slice(start,end);
function create({admin=true,profiles=[]}={}){
 const state={role:admin?'admin':'funcionario',data:{profiles},seenPendingUsers:new Set(),pendingUsersInitialized:false,view:'dashboard',modal:null,mobile:false};
 const alerts=[];let rendered=0;
 const context={state,isAdmin:()=>state.role==='admin',icon:()=>'',renderShell:()=>{rendered++;},toast:(message,type,action)=>alerts.push({message,type,action}),Notification:undefined,esc:s=>String(s),window:{focus:()=>{}}};
 const f=runInNewContext(code+'\n({pendingProfiles,navItem,openPendingApproval,rememberPendingProfiles})',context);
 return{f,state,alerts,rendered:()=>rendered};
}
const user={id:'new1',full_name:'Colaborador Novo',status:'pendente'};
test('Contador no menu Usuários corresponde aos perfis pendentes',()=>{
 const x=create({profiles:[user,{id:'old',status:'ativo'}]});
 assert.equal(x.f.pendingProfiles().length,1);
 assert.match(x.f.navItem({key:'usuarios',name:'Usuários',icon:'users'}),/nav-pending-count/);
 assert.match(x.f.navItem({key:'usuarios',name:'Usuários',icon:'users'}),/>1<\/span>/);
});
test('Admin consegue abrir diretamente o modal de aprovação',()=>{
 const x=create({profiles:[user]});
 x.f.openPendingApproval('new1');
 assert.equal(x.state.view,'usuarios');
 assert.equal(x.state.modal.type,'user');
 assert.equal(x.state.modal.id,'new1');
 assert.equal(x.rendered(),1);
});
test('Novos cadastros disparam um alerta acionável, sem duplicação',()=>{
 const x=create({profiles:[]});
 x.f.rememberPendingProfiles([]);
 x.f.rememberPendingProfiles([user]);
 x.f.rememberPendingProfiles([user]);
 assert.equal(x.alerts.length,1);
 assert.match(x.alerts[0].message,/Colaborador Novo/);
 assert.equal(x.alerts[0].action.label,'Analisar cadastro');
 x.state.data.profiles=[user];
 x.alerts[0].action.onClick();
 assert.equal(x.state.modal.id,'new1');
});
test('Cadastros antigos mantêm contador, mas não geram alerta repetido no início',()=>{
 const x=create({profiles:[user]});x.f.rememberPendingProfiles([user]);
 assert.equal(x.alerts.length,0);
 assert.equal(x.f.pendingProfiles().length,1);
});
test('Funcionários não recebem alertas de outros cadastros nem veem contador',()=>{
 const x=create({admin:false,profiles:[user]});
 x.f.rememberPendingProfiles([user]);
 assert.equal(x.alerts.length,0);
 assert.equal(x.f.pendingProfiles().length,0);
 assert.doesNotMatch(x.f.navItem({key:'usuarios',name:'Usuários',icon:'users',admin:true}),/Usuários/);
});
test('Consulta periódica observa perfil e mantém alertas de chamados',()=>{
 assert.match(source,/cloud\.list\('profiles'/);
 assert.match(source,/cloud\.list\('tickets'/);
 assert.match(source,/new Notification\('GOATi Manager · Novo chamado'/);
 assert.match(source,/data-action="review-pending"/);
});
