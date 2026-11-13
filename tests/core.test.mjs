import test from 'node:test';
import assert from 'node:assert/strict';
import {parseCSV} from '../src/reports.js';
import {seed,guides,normalizeData,resolveHelpArticles} from '../src/seed.js';

test('CSV com ponto e vírgula, UTF-8 e campos entre aspas',()=>{
 const rows=parseCSV('"Tag de patrimônio";"Modelo"\n"GOAT-TI-PC-001";"OptiPlex 980"\n"GOAT-TI-MON-002";"24\"\" LED"');
 assert.equal(rows.length,3);
 assert.equal(rows[1][0],'GOAT-TI-PC-001');
 assert.equal(rows[2][1],'24" LED');
});
test('CSV aceita vírgula com quebras e campos escapados',()=>{
 const rows=parseCSV('tag,descricao\nX,"linha1\nlinha2"');
 assert.deepEqual(rows,[['tag','descricao'],['X','linha1\nlinha2']]);
});
test('Guias de autoatendimento possuem passos',()=>{
 assert.ok(guides.length>=8);
 for(const g of guides)assert.ok(g.title&&g.steps.length>=3);
});
test('Exemplos de inventário usam tag GOAT',()=>{
 for(const a of seed.assets)assert.match(a.tag,/^GOAT-TI-[A-Z]+-\d{3,}$/);
});

test('Dados anteriores sem guias sao migrados sem perder registros',()=>{
 const old={tickets:[{id:'persistente-1',title:'Registro real do usuario'}],assets:[{id:'patrimonio-1',tag:'GOAT-TI-PC-999'}],profiles:seed.profiles};
 const migrated=normalizeData(old);
 assert.deepEqual(migrated.guides,[]);
 assert.equal(migrated.tickets[0].title,'Registro real do usuario');
 assert.equal(migrated.assets[0].tag,'GOAT-TI-PC-999');
 assert.ok(migrated.profiles.some(p=>p.id==='demo-admin'));
});
test('Colecoes corrompidas nao derrubam a Central de Ajuda',()=>{
 const migrated=normalizeData({guides:undefined,messages:null,maintenance:'invalido',profiles:[]});
 for(const [key,value] of Object.entries(migrated))assert.ok(Array.isArray(value),`${key} deveria ser uma lista`);
 assert.ok(migrated.profiles.length>=seed.profiles.length);
});

test('Central de Ajuda mistura guias internos e personalizados sem falhar se ausentes',()=>{
 assert.equal(resolveHelpArticles(undefined).length,guides.length);
 assert.equal(resolveHelpArticles({}).length,guides.length);
 const x=resolveHelpArticles([{id:'custom',title:'Guia da equipe',summary:'Teste',category:'Periféricos',steps:['Verificar'],active:true}]);
 assert.equal(x.length,guides.length+1);
 assert.equal(x.at(-1).steps[0],'Verificar');
});
test('Central de Ajuda esconde guia desativado para funcionários',()=>{
 const custom=[{id:'hidden',title:'Em revisão',active:false,steps:[]}];
 assert.equal(resolveHelpArticles(custom,false).length,guides.length);
 assert.equal(resolveHelpArticles(custom,true).length,guides.length+1);
});
