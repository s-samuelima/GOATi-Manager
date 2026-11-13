import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const source=readFileSync(new URL('../src/main.js', import.meta.url),'utf8');
const start=source.indexOf('async function handleAction(el,event){');
const end=source.indexOf('async function handleSubmit(form)',start);
assert.ok(start>=0&&end>start,'A função handleAction deve existir');
const handler=source.slice(start,end);

test('Clique dentro do modal não gera erro nem fecha janela',async()=>{
  const state={modal:{type:'new-ticket'}};
  let renders=0;
  const handleAction=runInNewContext(handler+';handleAction',{
    state,renderShell:()=>{renders++;}
  });
  const backdrop={dataset:{action:'close-backdrop'}};
  const input={};
  await handleAction(backdrop,{target:input});
  assert.deepEqual(state.modal,{type:'new-ticket'});
  assert.equal(renders,0);
});

test('Clique no fundo do modal fecha janela normalmente',async()=>{
  const state={modal:{type:'new-ticket'}};
  let renders=0;
  const handleAction=runInNewContext(handler+';handleAction',{
    state,renderShell:()=>{renders++;}
  });
  const backdrop={dataset:{action:'close-backdrop'}};
  await handleAction(backdrop,{target:backdrop});
  assert.equal(state.modal,null);
  assert.equal(renders,1);
});
