// Atualiza o HTML de demonstração a partir das fontes, sem dependências externas.
import {readFileSync,writeFileSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=dirname(dirname(fileURLToPath(import.meta.url)));
const read=p=>readFileSync(join(root,p),'utf8');
const css=read('src/styles.css');
let javascript=['storage','api','reports','seed','main'].map(name=>{
 let source=read(`src/${name}.js`);
 source=source.replace(/^import .*?;\s*$/gm,'');
 source=source.replace(/\bexport\s+(?=(?:const|function|async function|class)\b)/g,'');
 return `// ===== ${name}.js =====\n${source}`;
}).join('\n');
for(const filename of ['goati-mark.png','goati-mascot.png','goati-192.png','goati-512.png']){
 const base64=readFileSync(join(root,'assets',filename)).toString('base64');
 javascript=javascript.replaceAll('/assets/'+filename,'data:image/png;base64,'+base64);
}
const html='<!doctype html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark light"><title>GOATi Manager — Demonstração</title><style>'+css+'</style></head><body><div id="app"><div class="boot"><span class="spinner"></span><p>Carregando demonstração GOATi...</p></div></div><div id="toast-region" class="toasts" aria-live="polite"></div><script>window.GOAT_TI_CONFIG={SUPABASE_URL:"",SUPABASE_ANON_KEY:"",APP_NAME:"GOATi Manager"};</script><script>\n'+javascript.replaceAll('</script>','<\\/script>')+'\n</script></body></html>';
writeFileSync(join(root,'GOATi_Manager_DEMO.html'),html);
console.log('Demonstração regenerada:',(html.length/1024/1024).toFixed(2),'MiB');
