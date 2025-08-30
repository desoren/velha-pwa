const CACHE = 'velha-v2';
const ASSETS = ['./','./index.html','./manifest.webmanifest','./icons/icon-512.svg'];
self.addEventListener('install', e => { e.waitUntil((async()=>{ const c=await caches.open(CACHE); await c.addAll(ASSETS); self.skipWaiting();})()); });
self.addEventListener('activate', e => { e.waitUntil((async()=>{ const ks=await caches.keys(); await Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k))); await self.clients.claim(); })()); });
self.addEventListener('fetch', e => {
  const r=e.request; if(r.method!=='GET') return;
  e.respondWith((async()=>{ const c=await caches.open(CACHE);
    try{ const res=await fetch(r); if(new URL(r.url).origin===location.origin) c.put(r,res.clone()); return res; }
    catch{ const cached=await c.match(r,{ignoreSearch:true}); return cached || (r.mode==='navigate'? c.match('./index.html') : Response.error()); }
  })());
});