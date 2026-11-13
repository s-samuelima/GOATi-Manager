const VERSION='goati-v1.3.1';
const APP_SHELL=['/','/index.html','/config.js','/manifest.webmanifest','/assets/goati-mark.png','/assets/goati-192.png','/assets/goati-512.png','/assets/goati-mascot.png','/src/styles.css','/src/main.js','/src/storage.js','/src/api.js','/src/reports.js','/src/seed.js'];
self.addEventListener('install',event=>event.waitUntil(caches.open(VERSION).then(c=>c.addAll(APP_SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(Promise.all([caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==VERSION).map(k=>caches.delete(k)))),self.clients.claim()])));
self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET'||new URL(req.url).origin!==self.location.origin)return;
  // Priorizar rede na configuracao para evitar dados de uma implantacao anterior.
  if(new URL(req.url).pathname==='/config.js'){
    event.respondWith(fetch(req).catch(()=>caches.match('/config.js')));
    return;
  }
  if(req.mode==='navigate'){
    event.respondWith(fetch(req).catch(()=>caches.match('/index.html')));
    return;
  }
  event.respondWith(caches.match(req).then(cached=>cached||fetch(req).then(response=>{
    if(response.ok){const clone=response.clone();caches.open(VERSION).then(c=>c.put(req,clone));}return response;
  })));
});
