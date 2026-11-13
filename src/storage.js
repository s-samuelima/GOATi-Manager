// IndexedDB somente para DEMO e fila de chamados offline do titular autenticado.
const NAME='goat-ti-manager-v1', VERSION=1;
function open(){return new Promise((resolve,reject)=>{const r=indexedDB.open(NAME,VERSION);r.onupgradeneeded=()=>{const db=r.result;if(!db.objectStoreNames.contains('demo'))db.createObjectStore('demo',{keyPath:'key'});if(!db.objectStoreNames.contains('queue'))db.createObjectStore('queue',{keyPath:'id'});};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
async function action(store,mode,callback){const db=await open();return new Promise((resolve,reject)=>{const tx=db.transaction(store,mode);let output;try{output=callback(tx.objectStore(store));}catch(e){reject(e);return;}let value;output.onsuccess=()=>value=output.result;tx.oncomplete=()=>{db.close();resolve(value);};tx.onerror=()=>{db.close();reject(tx.error);};});}
export const storage={
  get:(key)=>action('demo','readonly',s=>s.get(key)),
  put:(key,value)=>action('demo','readwrite',s=>s.put({key,value})),
  queueList:()=>action('queue','readonly',s=>s.getAll()),
  queueAdd:(item)=>action('queue','readwrite',s=>s.put(item)),
  queueDelete:(id)=>action('queue','readwrite',s=>s.delete(id)),
  queueCount:async(owner)=> (await storage.queueList()).filter(q=>q.owner===owner).length,
  // Em computadores compartilhados, rascunhos offline devem ser apagados após envio.
};
