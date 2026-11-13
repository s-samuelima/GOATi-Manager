// Servidor local para desenvolvimento. Não substitui hospedagem HTTPS corporativa.
import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const port=Number(process.env.PORT||4173);
const allowed=new Set(['/','/index.html','/config.js','/manifest.webmanifest','/sw.js','/assets/goati-mark.png','/assets/goati-mascot.png','/assets/goati-192.png','/assets/goati-512.png','/src/main.js','/src/api.js','/src/storage.js','/src/reports.js','/src/seed.js','/src/styles.css']);
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json'};
createServer(async(req,res)=>{
 try{
  const u=new URL(req.url||'/',`http://localhost:${port}`);
  if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);res.end('Method Not Allowed');return;}
  let p=u.pathname;
  if(!allowed.has(p))p=(p.startsWith('/src/')||p.startsWith('/assets/')||p.includes('.'))?'': '/index.html';
  if(!p){res.writeHead(404);res.end('Not Found');return;}
  const full=path.join(root,p==='/'?'index.html':p);
  const data=await readFile(full);
  const ext=path.extname(full);
  const headers={'Content-Type':mime[ext]||'application/octet-stream','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','Cache-Control':p==='/sw.js'||p==='/config.js'?'no-cache':'public, max-age=60'};
  res.writeHead(200,headers);res.end(req.method==='HEAD'?'':data);
 }catch(e){res.writeHead(500);res.end('Internal Server Error');}
}).listen(port,'127.0.0.1',()=>console.log(`GOATi Manager em http://localhost:${port}`));
