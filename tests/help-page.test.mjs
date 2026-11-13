import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolveHelpArticles,guides} from '../src/seed.js';
const source=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const start=source.indexOf('function helpPage(){');
const end=source.indexOf('function tutorialPage(){',start);
const code=source.slice(start,end);
function helpPageMock(custom,filter='all',search='',admin=true){
 const state={data:{guides:custom},filter,search};
 const icon=()=>'<svg></svg>';const esc=(v)=>String(v??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
 const isAdmin=()=>admin;
 return Function('state','resolveHelpArticles','icon','esc','isAdmin',code+'\nreturn helpPage();')(state,resolveHelpArticles,icon,esc,isAdmin);
}
test('Página de ajuda renderiza sem dados salvos e apresenta guias',()=>{
 const html=helpPageMock(undefined);
 assert.match(html, /Central de Ajuda/);
 assert.match(html, /data-action="help-category"/);
 assert.match(html, /data-action="guide"/);
 assert.match(html, /data-action="new-ticket"/);
 assert.ok(html.match(/class="help-article"/g).length>=guides.length);
});
test('Pesquisa e categorias não lançam erro em coleção inválida',()=>{
 const result=helpPageMock('dados antigos','Internet','internet');
 assert.match(result, /Como funciona o modo offline|Estou sem internet/);
 assert.doesNotMatch(result,/Computer não liga/);
 const empty=helpPageMock(null,'all','palavraqueenaoexiste');
 assert.match(empty,/Nenhum tutorial encontrado/);
});
test('Conteúdo escapado de tutorial não é injetado no HTML',()=>{
 const html=helpPageMock([{id:'x',title:'<script>alert(1)</script>',category:'Outros',summary:'&',steps:['Teste'],active:true}]);
 assert.match(html,/&lt;script&gt;/);
 assert.doesNotMatch(html,/<script>alert/);
});
