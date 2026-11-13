import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const source=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const authStart=source.indexOf('function authPage(){');
const authEnd=source.indexOf('async function init(){',authStart);
assert.ok(authStart>=0&&authEnd>authStart);
const authCode=source.slice(authStart,authEnd);
const submitStart=source.indexOf('function isLoginCredentialFailure(');
const submitEnd=source.indexOf("app.addEventListener('click'",submitStart);
assert.ok(submitStart>=0&&submitEnd>submitStart);
const submitCode=source.slice(submitStart,submitEnd);
const actionStart=source.indexOf('async function handleAction(el,event){');
const actionEnd=source.indexOf('function isLoginCredentialFailure',actionStart);
assert.ok(actionStart>=0&&actionEnd>actionStart);
const actionCode=source.slice(actionStart,actionEnd);

function renderAuth({authView='login',authEmail='',authLoginFailed=false}={}){
 const state={authView,authEmail,authLoginFailed,theme:'dark'};
 const app={innerHTML:''};
 const document={documentElement:{dataset:{}}};
 const field=(id,label,type,value)=>'<input id="f-'+id+'" value="'+value+'" type="'+type+'">';
 const selection=()=>'<select></select>';
 const authPage=runInNewContext(authCode+'\nauthPage',{state,app,document,field,selection,sectors:[],icon:()=>'<svg></svg>',demo:false});
 authPage();return app.innerHTML;
}

test('Login inválido apresenta criar conta e recuperação sem enumerar usuários',()=>{
 const html=renderAuth({authEmail:'novo@exemplo.com',authLoginFailed:true});
 assert.match(html,/Não foi possível entrar com esses dados/);
 assert.match(html,/Criar minha conta/);
 assert.match(html,/Recuperar senha/);
 assert.match(html,/Tentar novamente/);
 assert.match(html,/value="novo@exemplo.com"/);
 assert.doesNotMatch(html,/E-mail não cadastrado|Usuário não encontrado/);
});
test('Cadastro conserva e-mail predefinido e pede aprovação',()=>{
 const html=renderAuth({authView:'signup',authEmail:'novo@exemplo.com'});
 assert.match(html,/form-signup/);assert.match(html,/value="novo@exemplo.com"/);
 assert.match(html,/aprovação administrativa/);
});
test('Falha de credenciais exibe ajuda sem criar usuário automaticamente',async()=>{
 const state={authEmail:'',authLoginFailed:false,authView:'login'};
 let renders=0,signups=0;
 const cloud={login:async()=>{throw new Error('Invalid login credentials');},signup:async()=>{signups++;}};
 const handleSubmit=runInNewContext(submitCode+'\nhandleSubmit',{
  state,cloud,formData:f=>f.fd,authPage:()=>{renders++;},loadAccount:async()=>{},toast:()=>{}
 });
 const fd=new Map([['email','  novo@exemplo.com '],['password','senhaerrada']]);
 await handleSubmit({id:'form-login',fd});
 assert.equal(state.authLoginFailed,true);assert.equal(state.authEmail,'novo@exemplo.com');
 assert.equal(renders,1);assert.equal(signups,0);
});
test('Falha de rede não é confundida com conta inexistente',async()=>{
 const state={authEmail:'',authLoginFailed:false};
 const handleSubmit=runInNewContext(submitCode+'\nhandleSubmit',{
  state,cloud:{login:async()=>{throw new Error('Tempo de conexão esgotado.');}},formData:f=>f.fd,authPage:()=>{},loadAccount:async()=>{},toast:()=>{}
 });
 await assert.rejects(handleSubmit({id:'form-login',fd:new Map([['email','x@y.com'],['password','senha']])}),/Tempo de conexão esgotado/);
 assert.equal(state.authLoginFailed,false);
});
test('Trocar para cadastro preserva o e-mail digitado',async()=>{
 const state={authView:'login',authEmail:'',authLoginFailed:true};let renders=0;
 const handleAction=runInNewContext(actionCode+'\nhandleAction',{
  state,document:{getElementById:id=>id==='f-email'?{value:'  funcionario@exemplo.com  '}:null},authPage:()=>{renders++;}
 });
 await handleAction({dataset:{action:'auth-view',view:'signup'}},{});
 assert.equal(state.authView,'signup');assert.equal(state.authEmail,'funcionario@exemplo.com');
 assert.equal(state.authLoginFailed,false);assert.equal(renders,1);
});
test('Login válido não exibe ajuda de erro',async()=>{
 const state={authEmail:'',authLoginFailed:true};let accountLoads=0;
 const handleSubmit=runInNewContext(submitCode+'\nhandleSubmit',{
  state,cloud:{login:async()=>({})},formData:f=>f.fd,loadAccount:async()=>{accountLoads++;},toast:()=>{}
 });
 await handleSubmit({id:'form-login',fd:new Map([['email','conta@exemplo.com'],['password','senha']])});
 assert.equal(accountLoads,1);assert.equal(state.authEmail,'');
 assert.equal(state.authLoginFailed,false);
});
