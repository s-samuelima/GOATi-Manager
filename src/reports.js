// Geração PDF local, sem dependências externas, adequada a tabelas de gestão.
// PDF válido com Helvetica/WinAnsi e quebra de página; acentos latinos são preservados.
const latin=s=>String(s??'').replace(/[\u2010-\u2015]/g,'-').replace(/[\u2018\u2019]/g,"'").replace(/[\u201C\u201D]/g,'"').replace(/[^\x00-\xFF]/g,'?');
function byteString(s){const out=new Uint8Array(s.length);for(let i=0;i<s.length;i++)out[i]=s.charCodeAt(i)&255;return out;}
const safe=s=>latin(s).replaceAll('\\','\\\\').replaceAll('(','\\(').replaceAll(')','\\)').replace(/[\r\n\t]+/g,' ');
function split(s,max){const w=latin(s).split(/\s+/);const lines=[];let str='';for(const a of w){if((str+' '+a).length>max){if(str)lines.push(str);str=a;}else str=str?str+' '+a:a;}if(str)lines.push(str);return lines.length?lines:[''];}
export function downloadPDF({title,subtitle,headers,rows,filename='goat_relatorio.pdf',metrics=[],details=[]}){
 const pages=[], W=595,H=842,m=39;let y=H-75,cmds=[];
 const txt=(value,x,yy,size=10,bold=false,color='#252d39')=>{const [r,g,b]=[1,3,5].map(i=>parseInt(color.slice(i,i+2),16)/255).map(n=>Number.isFinite(n)?n:0);cmds.push(`${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg BT /${bold?'F2':'F1'} ${size} Tf 1 0 0 1 ${x.toFixed(2)} ${yy.toFixed(2)} Tm (${safe(value)}) Tj ET`);};
 const rect=(x,yy,w,h,color)=>{const [r,g,b]=[1,3,5].map(i=>parseInt(color.slice(i,i+2),16)/255);cmds.push(`${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg ${x} ${yy} ${w} ${h} re f`);};
 const page=()=>{if(cmds.length){rect(m,38,W-2*m,1,'#e6e8ee');txt('GOATi MANAGER  ·  DOCUMENTO GERADO PELO SISTEMA',m,25,8,false,'#7c8592');txt('Página '+(pages.length+1),W-80,25,8,false,'#7c8592');pages.push(cmds.join('\n'));cmds=[];}y=H-75;};
 const top=(n)=>{rect(0,H-13,W,13,'#d95367');txt('GOAT  /  TI MANAGER',m,H-49,12,true,'#cc4054');txt(title,m,H-82,20,true,'#222b39');txt(subtitle||'',m,H-102,9,false,'#697586');y=H-126;};
 const noItems=rows?.length?rows:[['Nenhum registro encontrado para os filtros selecionados.']];
 top(1);
 if(metrics.length){for(const entry of metrics){txt(`${entry[0]}: ${entry[1]}`,m,y,10,true);y-=18;}y-=11;}
 // Renderiza linhas com quebra de texto e largura dinâmica.
 const cols=headers.length;const usable=W-m*2;const width=usable/Math.max(cols,1);const maxChars=Math.max(9,Math.floor(width/5.7));
 function tableHeader(){rect(m,y-10,usable,25,'#2d3444');headers.forEach((h,i)=>txt(split(h,maxChars)[0].slice(0,maxChars),m+i*width+5,y-2,8,true,'#ffffff'));y-=31;}
 tableHeader();
 for(let n=0;n<noItems.length;n++){
  const vals=noItems[n].map(v=>String(v??''));const lines=vals.map(v=>split(v,maxChars));const height=Math.max(22,...lines.map(a=>a.length*12+8));
  if(y-height<65){page();top(pages.length+1);tableHeader();}
  if(n%2===0)rect(m,y-height+3,usable,height,'#f4f5f8');
  for(let c=0;c<cols;c++){for(let k=0;k<Math.min(lines[c]?.length||0,7);k++){txt(lines[c][k],m+c*width+5,y-10-k*12,8,false,'#303849');}}
  y-=height;
 }
 if(details.length){
  if(y<120){page();top(pages.length+1);}
  y-=28;txt('FICHAS DETALHADAS DOS EQUIPAMENTOS',m,y,12,true,'#d95367');y-=23;
  for(const item of details){
   if(y<145){page();top(pages.length+1);}
   rect(m,y-8,W-m*2,25,'#f0f1f5');txt(item.title,m+8,y,10,true,'#293342');y-=33;
   for(const line of item.lines){
    for(const fragment of split(line,95)){
     if(y<67){page();top(pages.length+1);}
     txt(fragment,m+7,y,9,false,'#394352');y-=14;
    }
   }
   y-=20;
  }
 }
 page();
 // Objetos PDF e offsets xref por bytes (WinAnsi/Latin1).
 const objects=[''];const add=s=>{objects.push(s);return objects.length-1;};
 const catalog=add(''),pagesId=add(''),font1=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'),font2=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
 const ids=[];
 pages.forEach((p,i)=>{
  const content=add(`<< /Length ${byteString(p).length} >>\nstream\n${p}\nendstream`);
  const pageId=add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 ${font1} 0 R /F2 ${font2} 0 R >> >> /Contents ${content} 0 R >>`);ids.push(pageId);
 });
 objects[catalog]=`<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
 objects[pagesId]=`<< /Type /Pages /Kids [${ids.map(id=>`${id} 0 R`).join(' ')}] /Count ${ids.length} >>`;
 let output='%PDF-1.4\n%\xE2\xE3\xCF\xD3\n',offsets=[0];
 for(let i=1;i<objects.length;i++){offsets.push(byteString(output).length);output+=`${i} 0 obj\n${objects[i]}\nendobj\n`;}
 const xref=byteString(output).length;
 output+=`xref\n0 ${objects.length}\n0000000000 65535 f \n`;
 for(let i=1;i<objects.length;i++)output+=`${String(offsets[i]).padStart(10,'0')} 00000 n \n`;
 output+=`trailer\n<< /Root ${catalog} 0 R /Size ${objects.length} >>\nstartxref\n${xref}\n%%EOF`;
 const url=URL.createObjectURL(new Blob([byteString(output)],{type:'application/pdf'}));const link=document.createElement('a');link.href=url;link.download=filename;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);
}
export function downloadCSV(headers,rows,filename){const quote=s=>'"'+String(s??'').replaceAll('"','""')+'"';const csv='\ufeff'+[headers,...rows].map(row=>row.map(quote).join(';')).join('\r\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);}
export function parseCSV(text){const delimiter=(text.split(/\r?\n/)[0].match(/;/g)||[]).length>=(text.split(/\r?\n/)[0].match(/,/g)||[]).length?';':',';let cell='',row=[],out=[],quote=false;for(let i=0;i<text.length;i++){const ch=text[i];if(ch==='"'){if(quote&&text[i+1]==='"'){cell+='"';i++;}else quote=!quote;}else if(ch===delimiter&&!quote){row.push(cell);cell='';}else if((ch==='\r'||ch==='\n')&&!quote){if(ch==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(x=>x.trim()))out.push(row);row=[];cell='';}else cell+=ch;}row.push(cell);if(row.some(x=>x.trim()))out.push(row);return out;}
