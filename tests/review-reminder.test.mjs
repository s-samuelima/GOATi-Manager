import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const source=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const beginning=source.indexOf('function pendingReviewTickets(){');
const end=source.indexOf('function dashboard(){',beginning);
assert.ok(beginning>0&&end>beginning);
const logic=source.slice(beginning,end);
function prepare({role='funcionario',tickets=[],reviews=[],userId='user1',status='ativo'}={}){
 const state={user:{id:userId},profile:{status},role,modal:null,reviewPromptShown:new Set(),data:{tickets,reviews}};
 let renders=0;
 const context={state,isActive:()=>state.profile.status==='ativo',canManage:()=>state.role==='admin'||state.role==='gestao',userId:()=>state.user.id,ticketsSorted:ts=>ts.sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)),renderShell:()=>{renders++;}};
 const methods=runInNewContext(logic+'\n({pendingReviewTickets,showReviewPromptIfNeeded})',context);
 return{state,methods,renders:()=>renders};
}
const ready={id:'ticket1',requester_id:'user1',status:'resolvido',created_at:'2026-11-13T12:00:00Z'};
test('Ao entrar, funcionário recebe convite para avaliar um chamado resolvido',()=>{
 const x=prepare({tickets:[ready]});
 assert.equal(x.methods.pendingReviewTickets().length,1);
 assert.equal(x.methods.showReviewPromptIfNeeded(),true);
 assert.equal(x.state.modal.type,'rate');
 assert.equal(x.state.modal.id,'ticket1');
 assert.equal(x.renders(),1);
});
test('Não insiste no aviso após fechamento durante a mesma sessão',()=>{
 const x=prepare({tickets:[ready]});
 x.methods.showReviewPromptIfNeeded();
 x.state.modal=null;
 assert.equal(x.methods.showReviewPromptIfNeeded(),false);
});
test('Não solicita avaliação quando já existe registro',()=>{
 const x=prepare({tickets:[ready],reviews:[{ticket_id:'ticket1'}]});
 assert.equal(x.methods.showReviewPromptIfNeeded(),false);
});
test('Não solicita avaliação de chamados de outras pessoas ou não resolvidos',()=>{
 const x=prepare({tickets:[{...ready,requester_id:'outro'},{...ready,id:'ticket2',status:'aberto'}]});
 assert.equal(x.methods.showReviewPromptIfNeeded(),false);
});
test('Administrador e gestão não recebem convite de funcionário',()=>{
 for(const role of ['admin','gestao']){
  const x=prepare({role,tickets:[ready]});assert.equal(x.methods.showReviewPromptIfNeeded(),false);
 }
});
test('O formulário possui estrelas selecionáveis e comentário opcional',()=>{
 assert.match(source,/class="review-star-choice"/);
 assert.match(source,/type="radio" name="rating"/);
 assert.match(source,/Comentário \(opcional\)/);
 assert.match(source,/class="review-reminder"/);
 assert.match(source,/data-action="go" data-view="avaliacoes"/);
});
