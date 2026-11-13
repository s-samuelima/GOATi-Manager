// Gera uma distribuição estática para Vercel, sem publicar o config.js local.
// A chave publishable é visível no navegador por definição; nunca use secret/service_role.
import {copyFile, cp, mkdir, rm, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const out = path.join(root, 'dist');
const url = String(process.env.GOATI_SUPABASE_URL || '').trim().replace(/\/+$/, '');
const key = String(process.env.GOATI_SUPABASE_PUBLISHABLE_KEY || '').trim();

if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url)) {
  throw new Error('Defina GOATI_SUPABASE_URL com a URL do projeto Supabase (sem /rest/v1).');
}
if (!/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)) {
  throw new Error('Defina GOATI_SUPABASE_PUBLISHABLE_KEY (nunca use sb_secret_ nem service_role).');
}

await rm(out, {recursive:true, force:true});
await mkdir(out, {recursive:true});
for (const file of ['index.html','manifest.webmanifest','sw.js']) {
  await copyFile(path.join(root,file),path.join(out,file));
}
for (const directory of ['src','assets']) {
  await cp(path.join(root,directory),path.join(out,directory), {recursive:true});
}
const browserConfig = {SUPABASE_URL:url,SUPABASE_ANON_KEY:key,APP_NAME:'GOATi Manager'};
await writeFile(path.join(out,'config.js'),
  '// Configuração PUBLICÁVEL gerada no build da Vercel. Não contém secrets.\n'+
  'window.GOAT_TI_CONFIG = '+JSON.stringify(browserConfig)+';\n', 'utf8');
console.log('GOATi Manager: build estático gerado em dist/ com configuração pública Supabase.');
