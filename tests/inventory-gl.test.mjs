import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {getNextDemoAssetTag,prepareAssetImport,qrTarget,LABEL_SIZES,qrSvg,downloadAssetLabels,assetsForGlRange,ASSET_OWNER_NAME} from '../src/inventory.js';
const root=new URL('../',import.meta.url);
const main=readFileSync(new URL('src/main.js',root),'utf8');
const migration=readFileSync(new URL('supabase/migrations/20261116_inventory_gl_itam.sql',root),'utf8');
const schema=readFileSync(new URL('supabase/schema.sql',root),'utf8');

test('Migração SQL troca patrimônio antigo sem alterar UUIDs ou chamados',()=>{
 assert.match(migration,/alter table public\.assets add column if not exists legacy_tag/);
 assert.match(migration,/where id=r\.id/);
 assert.match(migration,/nextval\('public\.gl_asset_tag_seq'\)/);
 assert.match(migration,/create sequence if not exists public\.gl_asset_tag_seq/);
 assert.match(migration,/alter table public\.assets add constraint tag_gl/);
 assert.match(migration,/new\.tag is distinct from old\.tag/);
 assert.doesNotMatch(migration,/delete\s+from\s+public\.assets/i);
 assert.doesNotMatch(migration,/drop\s+table\s+public\.tickets/i);
 assert.match(schema,/create table if not exists public\.asset_events/);
});
test('Autorização do inventário depende da permissão concedida e status ativo',()=>{
 assert.match(migration,/private\.can_view_inventory\(\)/);
 assert.match(migration,/private\.can_edit_inventory\(\)/);
 assert.match(migration,/p\.role='funcionario' and p\.can_manage_inventory=true/);
 assert.match(migration,/p\.status='ativo'/);
 assert.match(migration,/drop policy if exists assets_delete/);
 assert.match(migration,/revoke delete on public\.assets from authenticated/);
 assert.match(migration,/public\.audit_log/);
 assert.match(migration,/anterior_inventario/);
 assert.match(main,/function canViewInventory\(\)/);
 assert.match(main,/function canEditInventory\(\)/);
 assert.match(main,/name="can_manage_inventory"/);
});
test('Vinculação com chamados não expõe tickets de outros usuários de TI',()=>{
 assert.match(migration,/create or replace function public\.link_ticket_asset/);
 assert.match(migration,/owner_id<>\(select auth\.uid\(\)\)/);
 assert.match(migration,/target_asset is not null/);
 assert.match(migration,/grant execute on function public\.link_ticket_asset/);
 assert.match(main,/form-ticket-asset/);
});
test('Contagem GL de demo é global para todas as categorias',()=>{
 const old=[{tag:'GOAT-TI-PC-001'},{tag:'GL-000005',category:'Monitor'},{tag:'GL-000002',category:'Computador'}];
 assert.equal(getNextDemoAssetTag(old),'GL-000006');
 assert.equal(getNextDemoAssetTag([]),'GL-000001');
});
test('Link do QR carrega somente código patrimonial e respeita domínio',()=>{
 const url=qrTarget('GL-000001','https://goati.example.com');
 const parsed=new URL(url);
 assert.equal(parsed.origin,'https://goati.example.com');
 assert.equal(parsed.searchParams.get('patrimonio'),'GL-000001');
 assert.equal(parsed.pathname,'/');
 assert.doesNotMatch(url,/email=|senha=|imei=/i);
 assert.match(main,/openDeepLinkedAsset/);
 assert.match(main,/state\.authView='login'/);
});
test('CSV prepara o inventário e expande lotes sem criar GL no navegador',()=>{
 const imported=prepareAssetImport([
  ['Categoria','Marca','Modelo','Número de série','Quantidade','Colaborador responsável','Setor'],
  ['Monitor','LG','19 pol.','','3','Amanda','Comercial'],
  ['Notebook','Dell','Latitude 5000','SERIAL123','1','Amanda','Comercial']
 ],'Equipamentos',[]);
 assert.equal(imported.items.length,4);
 assert.equal(imported.rows,2);
 assert.equal(imported.errors.length,0);
 assert.deepEqual(imported.items.map(x=>x.quantity),[1,1,1,1]);
 assert.ok(imported.items.every(x=>!Object.hasOwn(x,'tag')));
});
test('CSV informa erros de linha por série duplicada e quantidade inválida',()=>{
 const result=prepareAssetImport([
  ['Categoria','Marca','Modelo','Número de série','Quantidade'],
  ['Notebook','Dell','X','SERIE1','1'],
  ['Notebook','Dell','Y','SERIE1','1'],
  ['Monitor','LG','19','','0']
 ],'Equipamentos',[]);
 assert.equal(result.items.length,1);
 assert.equal(result.errors.length,2);
 assert.equal(result.errors[0].line,3);
 assert.match(result.errors[0].message,/duplicado/);
 assert.match(result.errors[1].message,/Quantidade inválida/);
 assert.match(main,/preview\.errors\.length/);
 assert.match(main,/cloud\.insert\('assets',batch\)/);
});
test('Importação identifica duplicidade com dados antigos',()=>{
 const result=prepareAssetImport([
  ['Categoria','Modelo','Número de série'],
  ['Notebook','Novo','ABC-XYZ']
 ],'Equipamentos',[{serial:'abc-xyz'}]);
 assert.equal(result.errors.length,1);
});
test('Etiquetas incluem três formatos e PDF vetorial',()=>{
 assert.deepEqual(LABEL_SIZES.map(x=>x.key),['50x30','60x30','70x40']);
 assert.match(main,/m\.type==='labels'/);
 assert.match(main,/data-action="asset-label"/);
 assert.match(main,/downloadAssetLabels\(/);
});
test('QR gera SVG sem imagem externa e PDF válido em uma página',async()=>{
 const previous={window:globalThis.window,document:globalThis.document,create:URL.createObjectURL,revoke:URL.revokeObjectURL};
 let generated;
 const QR=function(el,options){this._oQRCode={
  getModuleCount:()=>21,
  isDark:(r,c)=>r===0||c===0||r===20||c===20
 };};
 QR.CorrectLevel={M:0};
 globalThis.window={QRCode:QR};
 globalThis.document={createElement:(type)=>type==='a'?{click(){},remove(){},set href(s){},set download(v){}}:{},body:{appendChild(){}}};
 URL.createObjectURL=(blob)=>{generated=blob;return'blob:fake-test';};
 URL.revokeObjectURL=()=>{};
 try{
  const svg=qrSvg('GL-000001',100);
  assert.match(svg,/<svg/);
  assert.match(svg,/viewBox="0 0 29 29"/);
  const summary=downloadAssetLabels([{tag:'GL-000001',category:'Computador',brand:'Dell',model:'Teste'}],'60x30');
  assert.equal(summary.labels,1);assert.equal(summary.pages,1);
  const contents=new Uint8Array(await generated.arrayBuffer());
  assert.equal(String.fromCharCode(...contents.slice(0,8)),'%PDF-1.4');
  assert.ok(contents.length>1000);
  const pdfText=new TextDecoder('windows-1252').decode(contents);
  assert.match(pdfText,/Global Soluções/);
  assert.match(pdfText,/Financeiras/);
  assert.doesNotMatch(pdfText,/GOATi Manager \| TI/);
  assert.equal(ASSET_OWNER_NAME,'Global Soluções Financeiras');
  assert.ok(main.includes('Proprietária: '+ '${esc(ASSET_OWNER_NAME)}'));
 }finally{
  globalThis.window=previous.window;globalThis.document=previous.document;
  URL.createObjectURL=previous.create;URL.revokeObjectURL=previous.revoke;
 }
});

test('Impressão por número GL aceita único número e intervalo em ordem crescente',()=>{
 const rows=[{id:'three',tag:'GL-000003'},{id:'other',tag:'GOAT-OLD-001'},{id:'one',tag:'GL-000001'},{id:'two',tag:'GL-000002'}];
 const single=assetsForGlRange(rows,'GL-000002');
 assert.deepEqual(single.assets.map(x=>x.id),['two']);
 assert.equal(single.missing,0);
 const interval=assetsForGlRange(rows,'1','GL-000003');
 assert.deepEqual(interval.assets.map(x=>x.id),['one','two','three']);
 assert.equal(interval.from,'GL-000001');
 assert.equal(interval.to,'GL-000003');
});
test('Intervalo não imprime patrimônio fora da faixa nem duplica etiquetas',()=>{
 const rows=[{id:'a',tag:'GL-000020'},{id:'b',tag:'GL-000022'},{id:'c',tag:'GL-000019'}];
 const selected=assetsForGlRange(rows,'20','22');
 assert.deepEqual(selected.assets.map(x=>x.id),['a','b']);
 assert.equal(selected.missing,1);
 assert.throws(()=>assetsForGlRange(rows,'22','20'),/menor/);
 assert.throws(()=>assetsForGlRange(rows,'GL-xyz','22'),/válido/);
 assert.throws(()=>assetsForGlRange(rows,'25','26'),/Nenhum/);
 assert.throws(()=>assetsForGlRange(rows,'1','5001'),/5.000/);
 assert.throws(()=>assetsForGlRange([{id:'a',tag:'GL-000020'},{id:'b',tag:'GL-000020'}],'20'),/duplicado/);
});
test('Inventário fornece seleção geral e impressão por intervalo',()=>{
 assert.match(main,/data-action="select-all-assets"/);
 assert.match(main,/data-action="clear-selected-assets"/);
 assert.match(main,/data-action="labels-range"/);
 assert.match(main,/form-labels-range/);
 assert.ok(main.includes('assetsForGlRange(state.data.assets'));
 assert.match(main,/rangeMissing/);
});
