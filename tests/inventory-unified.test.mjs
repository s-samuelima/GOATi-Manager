import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {buildInventoryOverview,inventoryCategory,INVENTORY_CATEGORIES} from '../src/inventory.js';

test('Estoque e patrimônio entram na mesma contagem de unidades por categoria',()=>{
 const assets=[{id:'monitor',tag:'GL-000021',category:'Monitor',brand:'LG',quantity:1}];
 const stock=[{id:'stock-monitor',name:'Monitor LG',quantity:3},{id:'keyboard',name:'Teclado HP',quantity:18}];
 const before=structuredClone({assets,stock});
 const overview=buildInventoryOverview(assets,stock);
 assert.equal(overview.totalQuantity,22);
 assert.equal(overview.totalRecords,3);
 const monitors=overview.groups.find(group=>group.key==='monitores');
 assert.equal(monitors.quantity,4);
 assert.deepEqual(new Set(monitors.items.map(item=>item.source)),new Set(['asset','stock']));
 assert.equal(overview.groups.find(group=>group.key==='teclados').quantity,18);
 assert.deepEqual({assets,stock},before);
});

test('Lotes antigos contam todas as unidades e estoque zerado continua em zero',()=>{
 const overview=buildInventoryOverview(
  [{id:'cables',category:'Cabo',quantity:8},{id:'legacy',category:'Computador'}],
  [{id:'empty',name:'Mouse HP',quantity:0},{id:'hdmi',name:'Cabo HDMI',quantity:'13'}]
 );
 assert.equal(overview.totalQuantity,22);
 assert.equal(overview.groups.find(group=>group.key==='cabos').quantity,21);
 assert.equal(overview.groups.find(group=>group.key==='computadores').quantity,1);
 assert.equal(overview.groups.find(group=>group.key==='mouses').quantity,0);
 assert.equal(overview.groups.find(group=>group.key==='mouses').items.length,1);
});

test('Categorias reconhecem singular, plural e nomes usados no inventário',()=>{
 const cases=[['Computador Dell','computadores'],['Computadores Dell','computadores'],['CPU Dell','computadores'],['Monitor Brazil PC','monitores'],['Monitores LG','monitores'],['Mouse HP','mouses'],['Mouses HP','mouses'],['Teclado PC Brazil','teclados'],['Cabo USB para impressora','cabos'],['Notebook Lenovo','notebooks'],['Headset Fox Ray','fones'],['Fonte de alimentação LG','fontes'],['Carregador Lenovo','fontes'],['Adaptador para mouse USB','fontes'],['Celular Samsung','celulares'],['Roteador TP-Link','rede'],['Material sem classificação','outros']];
 for(const [name,expected] of cases)assert.equal(inventoryCategory({name}),expected,name);
 assert.equal(inventoryCategory({category:'Teclado',model:'Mouse MS1028'},'asset'),'teclados');
});

test('Filtro de categoria reúne as duas origens e busca ignora acentos',()=>{
 const assets=[{id:'asset',category:'Monitor',brand:'LG',tag:'GL-000021',serial:'SERIE-123',quantity:1,sector:'Jurídico',location:'Estação 03'}];
 const stock=[{id:'stock',name:'Monitor LG',quantity:3,location:'Estoque de TI'},{id:'mouse',name:'Mouse HP',quantity:1}];
 const monitors=buildInventoryOverview(assets,stock,{category:'monitores'});
 assert.equal(monitors.visibleQuantity,4);
 assert.equal(monitors.visibleItems.length,2);
 for(const search of ['juridico','estacao','serie-123','GL-000021']){
  const found=buildInventoryOverview(assets,stock,{search});
  assert.deepEqual(found.visibleItems.map(item=>item.id),['asset']);
  assert.equal(found.totalQuantity,5);
 }
 assert.equal(buildInventoryOverview(assets,stock,{category:'mouses',search:'LG'}).visibleItems.length,0);
});

test('IDs iguais em tabelas diferentes não confundem estoque e patrimônio',()=>{
 const overview=buildInventoryOverview([{id:'same',category:'Monitor',quantity:1}],[{id:'same',name:'Monitor LG',quantity:2}]);
 assert.equal(overview.totalQuantity,3);
 assert.equal(new Set(overview.items.map(item=>item.key)).size,2);
});

test('Inventário vazio mantém totais zerados e não inventa registros',()=>{
 const overview=buildInventoryOverview();
 assert.equal(overview.totalQuantity,0);
 assert.equal(overview.totalRecords,0);
 assert.deepEqual(overview.visibleGroups,[]);
 assert.ok(overview.groups.every(group=>group.quantity===0&&group.items.length===0));
});


test('PDF de inventário inclui estoque, patrimônio e a mesma soma da tela',()=>{
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 const reportSource=main.slice(main.indexOf('function report(kind){'),main.indexOf('function formData(form){'));
 let exported;
 const state={period:'mensal',data:{
  tickets:[],activities:[],reviews:[],movements:[],maintenance:[],
  assets:[{id:'asset',tag:'GL-000021',category:'Monitor',brand:'LG',quantity:1}],
  stock_items:[{id:'stock',name:'Monitor LG',quantity:3,location:'Estoque de TI'},{id:'mouse',name:'Mouse HP',quantity:1}]
 }};
 const context=vm.createContext({state,buildInventoryOverview,INVENTORY_CATEGORIES,
  canManage:()=>true,canViewInventory:()=>true,periodFilter:()=>[],
  now:()=>new Date().toISOString(),today:()=> '2026-11-23',dateLong:value=>value,
  downloadPDF:value=>{exported=value;},toast:()=>{}});
 vm.runInContext(reportSource+";report('inventario');",context);
 assert.equal(exported.rows.length,3);
 assert.equal(exported.rows.reduce((total,row)=>total+row[2],0),5);
 assert.ok(exported.rows.some(row=>row[1]==='Mouse HP'&&row[2]===1));
 assert.ok(exported.rows.some(row=>row[4]==='GL-000021'));
 assert.equal(exported.metrics.find(([label])=>label==='Unidades')[1],5);
});
