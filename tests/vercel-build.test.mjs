import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFile, stat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const run=(env)=>spawnSync(process.execPath,['scripts/build-vercel.mjs'],{cwd:root,encoding:'utf8',env:{...process.env,...env}});

test('build Vercel recusa deploy sem chave publishable',()=>{
  const r=run({GOATI_SUPABASE_URL:'https://example.supabase.co',GOATI_SUPABASE_PUBLISHABLE_KEY:''});
  assert.notEqual(r.status,0);
  assert.match(r.stderr,/GOATI_SUPABASE_PUBLISHABLE_KEY/);
});

test('build estático gera todos os arquivos, sem conteúdo privado',async()=>{
  const r=run({GOATI_SUPABASE_URL:'https://example.supabase.co',GOATI_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_TESTE123'});
  assert.equal(r.status,0,r.stderr);
  for(const file of ['index.html','config.js','sw.js','manifest.webmanifest','src/main.js','src/api.js','src/styles.css','assets/goati-mark.png','assets/goati-mascot.png']){
    assert.ok((await stat(path.join(root,'dist',file))).size>0,file);
  }
  const config=await readFile(path.join(root,'dist','config.js'),'utf8');
  assert.match(config,/sb_publishable_TESTE123/);
  assert.doesNotMatch(config,/service_role|sb_secret_/);
  await assert.rejects(stat(path.join(root,'dist','supabase','schema.sql')));
  await assert.rejects(stat(path.join(root,'dist','server.mjs')));
});
