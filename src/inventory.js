// Etiquetas patrimoniais e importacao do GOATi Manager (sem servicos externos).
// QRCode.js MIT vendorizado em src/vendor/qrcode.min.js.
const mm=number=>Number(number)*72/25.4;
const safeAscii=s=>String(s??'').replace(/[\u2010-\u2015]/g,'-').replace(/[^\x20-\xFF]/g,'?');
const pdfStr=s=>safeAscii(s).replaceAll('\\','\\\\').replaceAll('(','\\(').replaceAll(')','\\)');
const bytes=s=>{const u=new Uint8Array(s.length);for(let i=0;i<s.length;i++)u[i]=s.charCodeAt(i)&255;return u;};

export const ASSET_OWNER_NAME='Global Soluções Financeiras';
const ASSET_OWNER_LABEL_LINES=['Global Soluções','Financeiras'];

// A mesma visão reúne o estoque por quantidade e os bens já identificados.
export const INVENTORY_CATEGORIES=[
 {key:'computadores',label:'Computadores / CPU',prefix:'Computador',icon:'monitor',core:true,pattern:/^(computador(?:es)?|cpus?|desktops?|gabinetes?|pc)( |$)/},
 {key:'monitores',label:'Monitores',prefix:'Monitor',icon:'monitor',core:true,pattern:/^(monitor(?:es)?|telas?)( |$)/},
 {key:'mouses',label:'Mouses',prefix:'Mouse',icon:'mouse',core:true,pattern:/^mouses?( |$)/},
 {key:'teclados',label:'Teclados',prefix:'Teclado',icon:'grid',core:true,pattern:/^teclados?( |$)/},
 {key:'cabos',label:'Cabos',prefix:'Cabo',icon:'package',core:true,pattern:/^cabos?( |$)/},
 {key:'notebooks',label:'Notebooks',prefix:'Notebook',icon:'monitor',pattern:/^(notebooks?|laptops?)( |$)/},
 {key:'fones',label:'Fones e headsets',prefix:'Headset',icon:'headphones',pattern:/^(fones?|headsets?|headphones?)( |$)/},
 {key:'fontes',label:'Fontes e carregadores',prefix:'Fonte',icon:'package',pattern:/^(fontes?|carregador(?:es)?|adaptador(?:es)?)( |$)/},
 {key:'impressoras',label:'Impressoras',prefix:'Impressora',icon:'printer',pattern:/^impressoras?( |$)/},
 {key:'celulares',label:'Celulares',prefix:'Celular',icon:'package',pattern:/^(celular(?:es)?|smartphones?|telefones?)( |$)/},
 {key:'rede',label:'Rede e energia',prefix:'Switch',icon:'wifi',pattern:/^(switch(?:es)?|roteador(?:es)?|routers?|nobreaks?|estabilizadores?)( |$)/},
 {key:'outros',label:'Outros itens',prefix:'',icon:'package',pattern:null}
];

export function inventoryCategory(item,source='stock'){
 const text=normalize(source==='asset'?item.category:(item.category||item.name));
 return INVENTORY_CATEGORIES.find(category=>category.pattern?.test(text))?.key||'outros';
}

/** Quantidades são unidades, nunca o número de linhas ou de etiquetas. */
export function buildInventoryOverview(assets=[],stockItems=[],{category='all',search=''}={}){
 const quantity=(value,fallback)=>{
  if(value===undefined||value===null||value==='')return fallback;
  const number=Number(value);
  return Number.isInteger(number)&&number>=0?number:fallback;
 };
 const groups=INVENTORY_CATEGORIES.map(type=>({...type,items:[],quantity:0}));
 const byCategory=new Map(groups.map(group=>[group.key,group]));
 const items=[
  ...assets.map(record=>({source:'asset',record,name:[record.category,record.brand,record.model].filter(Boolean).join(' ')||'Equipamento',quantity:quantity(record.quantity,1)})),
  ...stockItems.map(record=>({source:'stock',record,name:record.name||'Item de estoque',quantity:quantity(record.quantity,0)}))
 ].map(item=>{
  const {record,source}=item;
  const key=inventoryCategory(record,source);
  return {...item,id:record.id,key:source+':'+record.id,category:key,location:record.location||'',tag:source==='asset'?record.tag||'':'',
   searchText:normalize([item.name,byCategory.get(key).label,record.tag,record.legacy_tag,record.serial,record.owner,record.sector,record.location,record.status].join(' '))};
 });
 for(const item of items){const group=byCategory.get(item.category);group.items.push(item);group.quantity+=item.quantity;}
 for(const group of groups)group.items.sort((a,b)=>a.name.localeCompare(b.name,'pt-BR')||a.location.localeCompare(b.location,'pt-BR')||a.key.localeCompare(b.key));
 const query=normalize(search);
 const visibleGroups=groups.filter(group=>category==='all'||group.key===category).map(group=>{
  const visible=group.items.filter(item=>!query||item.searchText.includes(query));
  return {...group,items:visible,quantity:visible.reduce((sum,item)=>sum+item.quantity,0)};
 }).filter(group=>group.items.length);
 return {
  groups,items:groups.flatMap(group=>group.items),visibleGroups,
  visibleItems:visibleGroups.flatMap(group=>group.items),
  totalQuantity:items.reduce((sum,item)=>sum+item.quantity,0),
  totalRecords:items.length,
  visibleQuantity:visibleGroups.reduce((sum,group)=>sum+group.quantity,0)
 };
}

export const LABEL_SIZES=[
 {key:'50x30',name:'50 × 30 mm',width:50,height:30},
 {key:'60x30',name:'60 × 30 mm (padrão)',width:60,height:30},
 {key:'70x40',name:'70 × 40 mm',width:70,height:40}
];

/** Resolve códigos GL e mantém a ordem patrimonial na impressão. */
export function assetsForGlRange(assets,begin,end=''){
 const parse=(value)=>{
  const raw=String(value??'').trim();
  const match=/^(?:GL-)?([0-9]{1,6})$/i.exec(raw);
  const number=match?Number(match[1]):0;
  if(!number||number>999999)throw new Error('Informe um patrimônio válido, como 21 ou GL-000021.');
  return number;
 };
 const from=parse(begin),to=parse(String(end??'').trim()?end:begin);
 if(to<from)throw new Error('O patrimônio final não pode ser menor que o inicial.');
 if(to-from>=5000)throw new Error('Escolha um intervalo de até 5.000 números GL.');
 const picked=new Map();
 for(const asset of assets||[]){
  const match=/^GL-([0-9]{6})$/i.exec(String(asset.tag||''));
  if(!match)continue;
  const number=Number(match[1]);
  if(number<from||number>to)continue;
  if(picked.has(number))throw new Error('Patrimônio GL duplicado no inventário: GL-'+String(number).padStart(6,'0'));
  picked.set(number,asset);
 }
 if(!picked.size)throw new Error('Nenhum patrimônio cadastrado nesse intervalo GL.');
 const selected=[...picked.entries()].sort((a,b)=>a[0]-b[0]).map(([,asset])=>asset);
 return {
  assets:selected,
  from:'GL-'+String(from).padStart(6,'0'),
  to:'GL-'+String(to).padStart(6,'0'),
  missing:to-from+1-selected.length
 };
}

export function qrTarget(tag,origin=(typeof location!=='undefined'?location.origin:'http://localhost')){
 const url=new URL('/',origin);
 url.searchParams.set('patrimonio',String(tag));
 return url.toString();
}
export function getNextDemoAssetTag(assets){
 const max=Math.max(0,...assets.map(a=>/^GL-(\d+)$/.test(a.tag||'')?Number(a.tag.slice(3)):0));
 return 'GL-'+String(max+1).padStart(6,'0');
}
export function qrMatrix(text){
 if(typeof window==='undefined'||typeof window.QRCode!=='function')
  throw new Error('Gerador QR Code indisponível. Atualize o aplicativo e tente novamente.');
 const holder=document.createElement('div');
 const qr=new window.QRCode(holder,{text:String(text),width:210,height:210,correctLevel:window.QRCode.CorrectLevel.M});
 const matrix=qr._oQRCode;
 if(!matrix||!matrix.getModuleCount())throw new Error('Não foi possível gerar o QR Code.');
 const n=matrix.getModuleCount();
 return Array.from({length:n},(_,row)=>Array.from({length:n},(_,col)=>matrix.isDark(row,col)));
}
export function qrSvg(tag,size=150){
 const matrix=qrMatrix(qrTarget(tag));
 const n=matrix.length,quiet=4,dim=n+quiet*2;
 const squares=[];
 for(let y=0;y<n;y++)for(let x=0;x<n;x++)if(matrix[y][x])squares.push('<rect x="'+(x+quiet)+'" y="'+(y+quiet)+'" width="1" height="1"/>');
 return '<svg class="asset-qr" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+dim+' '+dim+'" width="'+Number(size)+'" height="'+Number(size)+'" role="img" aria-label="QR Code do patrimônio"><rect width="'+dim+'" height="'+dim+'" fill="#fff"/><g fill="#000">'+squares.join('')+'</g></svg>';
}
function drawPdf({pages,pageWidth=mm(210),pageHeight=mm(297),filename}){
 const objects=[''];const add=content=>{objects.push(content);return objects.length-1;};
 const catalog=add(''),pageList=add('');
 const font=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
 const bold=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
 const pageIds=[];
 for(const commands of pages){
  const stream=commands.join('\n');
  const streamId=add('<< /Length '+bytes(stream).length+' >>\nstream\n'+stream+'\nendstream');
  const pageId=add('<< /Type /Page /Parent '+pageList+' 0 R /MediaBox [0 0 '+pageWidth.toFixed(3)+' '+pageHeight.toFixed(3)+'] /Resources << /Font << /F1 '+font+' 0 R /F2 '+bold+' 0 R >> >> /Contents '+streamId+' 0 R >>');
  pageIds.push(pageId);
 }
 objects[catalog]='<< /Type /Catalog /Pages '+pageList+' 0 R >>';
 objects[pageList]='<< /Type /Pages /Kids ['+pageIds.map(i=>i+' 0 R').join(' ')+'] /Count '+pageIds.length+' >>';
 let output='%PDF-1.4\n%\xE2\xE3\xCF\xD3\n',offsets=[0];
 for(let i=1;i<objects.length;i++){offsets.push(bytes(output).length);output+=i+' 0 obj\n'+objects[i]+'\nendobj\n';}
 const xref=bytes(output).length;
 output+='xref\n0 '+objects.length+'\n0000000000 65535 f \n';
 for(let i=1;i<objects.length;i++)output+=String(offsets[i]).padStart(10,'0')+' 00000 n \n';
 output+='trailer\n<< /Root '+catalog+' 0 R /Size '+objects.length+' >>\nstartxref\n'+xref+'\n%%EOF';
 const url=URL.createObjectURL(new Blob([bytes(output)],{type:'application/pdf'}));
 const link=document.createElement('a');link.href=url;link.download=filename;document.body.appendChild(link);link.click();link.remove();
 setTimeout(()=>URL.revokeObjectURL(url),3000);
}
export function downloadAssetLabels(assets,format='60x30'){
 if(!assets?.length)throw new Error('Selecione ao menos um patrimônio.');
 const size=LABEL_SIZES.find(s=>s.key===format)||LABEL_SIZES[1];
 const W=mm(210),H=mm(297),margin=mm(8),gap=mm(3),w=mm(size.width),h=mm(size.height);
 const cols=Math.floor((W-2*margin+gap)/(w+gap)),rows=Math.floor((H-2*margin+gap)/(h+gap));
 if(cols<1||rows<1)throw new Error('Formato de etiqueta não cabe no papel A4.');
 const perPage=cols*rows,pages=[];
 const xy=(n)=>({x:margin+(n%cols)*(w+gap),y:H-margin-(Math.floor(n/cols)+1)*h-Math.floor(n/cols)*gap});
 const txt=(cmd,value,x,y,pt,big=false)=>cmd.push('0 0 0 rg BT /'+(big?'F2':'F1')+' '+pt+' Tf 1 0 0 1 '+x.toFixed(2)+' '+y.toFixed(2)+' Tm ('+pdfStr(value)+') Tj ET');
 for(let start=0;start<assets.length;start+=perPage){
  const commands=[];
  for(let local=0;local<Math.min(perPage,assets.length-start);local++){
   const asset=assets[start+local],{x,y}=xy(local);
   commands.push('1 1 1 rg '+x.toFixed(2)+' '+y.toFixed(2)+' '+w.toFixed(2)+' '+h.toFixed(2)+' re f');
   commands.push('0.8 0.8 0.8 RG 0.5 w '+x.toFixed(2)+' '+y.toFixed(2)+' '+w.toFixed(2)+' '+h.toFixed(2)+' re S');
   const matrix=qrMatrix(qrTarget(asset.tag)),quiet=4,n=matrix.length;
   const qrSide=Math.min(h-mm(4),w*0.41),unit=qrSide/(n+quiet*2);
   const qx=x+mm(1.6),qy=y+(h-qrSide)/2;
   commands.push('0 0 0 rg');
   for(let r=0;r<n;r++)for(let col=0;col<n;col++)if(matrix[r][col]){
    const px=qx+(col+quiet)*unit,py=qy+qrSide-(r+quiet+1)*unit;
    commands.push(px.toFixed(3)+' '+py.toFixed(3)+' '+(unit+0.025).toFixed(3)+' '+(unit+0.025).toFixed(3)+' re f');
   }
   const tx=qx+qrSide+mm(1.5),maxChars=Math.max(10,Math.floor((w-(tx-x)-mm(1))/3.9));
   txt(commands,asset.tag,tx,y+h-mm(8),Math.min(12,size.width===50?10:12),true);
   txt(commands,ASSET_OWNER_LABEL_LINES[0],tx,y+h-mm(12.3),6,true);
   txt(commands,ASSET_OWNER_LABEL_LINES[1],tx,y+h-mm(15.6),6,true);
   txt(commands,(asset.category||'Equipamento').slice(0,maxChars),tx,y+h-mm(19.7),7,true);
   txt(commands,[asset.brand,asset.model].filter(Boolean).join(' ').slice(0,maxChars),tx,y+h-mm(23.4),6);
   if(Number(asset.quantity)>1)txt(commands,'LOTE: '+asset.quantity+' unidades',tx,y+mm(3),6);
  }
  pages.push(commands);
 }
 const tag=assets.length===1?assets[0].tag:'lote-'+assets.length;
 drawPdf({pages,filename:'GOATi_etiquetas_'+tag+'.pdf'});
 return{labels:assets.length,pages:pages.length,format:size.key};
}
const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/[^a-z0-9]+/g,' ');
const pick=(headers,row,labels)=>{
 const index=headers.findIndex(h=>labels.some(term=>normalize(h)===normalize(term)));
 return index<0?'':String(row[index]??'').trim();
};
const dateValue=value=>{
 if(!value)return null;
 if(/^\d{4}-\d{2}-\d{2}$/.test(value))return value;
 const br=value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
 return br?br[3]+'-'+br[2]+'-'+br[1]:null;
};
export function prepareAssetImport(csvRows,kind,existingAssets=[]){
 const rows=(Array.isArray(csvRows)?csvRows:[]).filter(r=>Array.isArray(r)&&r.some(v=>String(v||'').trim()));
 if(rows.length<2)throw new Error('Arquivo CSV sem registros ou cabeçalho.');
 const headers=rows[0];
 const get=(row,labels)=>pick(headers,row,labels);
 const hasRecognized=headers.some(h=>['categoria','marca','modelo','numero de serie','tag de patrimonio','tag do patrimonio','colaborador responsavel','tipo de cabo','setor'].includes(normalize(h)));
 if(!hasRecognized)throw new Error('Não foi possível identificar as colunas do CSV.');
 const used=new Set(existingAssets.map(a=>normalize(a.serial)).filter(Boolean)),items=[],errors=[],preview=[];
 const defaultCategory=kind==='Celulares'?'Celular':kind==='Cabos'?'Cabo':'Outro';
 let expanded=0;
 for(let index=1;index<rows.length;index++){
  const row=rows[index],line=index+1;
  const serial=get(row,['Nº de série','Numero de serie','Número de série','Serial','Serial number']);
  const quantityText=get(row,['Quantidade total','Quantidade','Unidades']);
  const quantity=quantityText?Number(quantityText):1;
  const category=get(row,['Categoria','Tipo de equipamento'])||defaultCategory;
  const brand=get(row,['Marca','Fabricante']),model=get(row,['Modelo']);
  const acquiredText=get(row,['Data de aquisição','Data aquisicao']);
  const warrantyText=get(row,['Garantia até','Fim da garantia','Garantia']);
  const acquired_on=dateValue(acquiredText),warranty_until=dateValue(warrantyText);
  const reasons=[];
  if(!Number.isInteger(quantity)||quantity<1||quantity>50)reasons.push('Quantidade inválida (1 a 50)');
  if(serial&&used.has(normalize(serial)))reasons.push('Número de série duplicado');
  if(serial&&quantity>1)reasons.push('Equipamentos com número de série exigem quantidade 1');
  if(acquiredText&&!acquired_on)reasons.push('Data de aquisição inválida');
  if(warrantyText&&!warranty_until)reasons.push('Data de garantia inválida');
  if([category,brand,model,serial].some(s=>s.length>180))reasons.push('Campo com mais de 180 caracteres');
  if(expanded+(Number.isInteger(quantity)&&quantity>0?quantity:0)>500)reasons.push('Limite de 500 equipamentos por importação');
  if(reasons.length){errors.push({line,message:reasons.join('; ')});continue;}
  if(serial)used.add(normalize(serial));
  const item={
   category,brand,model,serial,
   owner:get(row,['Colaborador responsável','Responsável','Responsavel']),
   sector:get(row,['Setor','Setor / responsável']),
   location:get(row,['Localização','Localização / estação','Localização / estoque']),
   status:get(row,['Status','Situação'])||'Em uso',
   condition:get(row,['Conservação','Condição'])||'Bom',
   imei:get(row,['IMEI 1','IMEI']),
   line:get(row,['Nº da linha','Número da linha']),
   notes:get(row,['Observações','Descricao','Descrição']),
   acquired_on,warranty_until,quantity:1
  };
  for(let n=0;n<quantity;n++)items.push({...item});
  preview.push({line,category,brand,model,serial,quantity});
  expanded+=quantity;
 }
 return{items,errors,preview,rows:rows.length-1,expanded};
}
