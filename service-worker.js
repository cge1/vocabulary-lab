const CACHE_NAME='vocabulary-lab-shell-v2';
const APP_SHELL=[
  './','./index.html','./styles.css','./icon.svg','./manifest.webmanifest',
  './core.js','./learn-test.js','./study-wrong.js','./firebase-config.js','./cloud-sync.js','./pwa.js',
  './words-1.js','./words-2.js','./words-3.js','./words-4.js','./words-5.js'
];
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(APP_SHELL)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);
  if(url.origin!==self.location.origin)return;
  if(req.mode==='navigate'){
    event.respondWith(fetch(req).then(res=>{const copy=res.clone();caches.open(CACHE_NAME).then(c=>c.put('./index.html',copy));return res}).catch(()=>caches.match('./index.html')));
    return;
  }
  event.respondWith(caches.match(req).then(cached=>cached||fetch(req).then(res=>{if(res&&res.status===200){const copy=res.clone();caches.open(CACHE_NAME).then(c=>c.put(req,copy))}return res})));
});
