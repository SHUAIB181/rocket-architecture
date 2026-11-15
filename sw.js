// Offline cache: static files cache-first; API and NASA calls always go to the network.
const CACHE = 'mission-architect-v4';
const FILES = ['./', 'index.html', 'css/styles.css', 'css/flow.css', 'manifest.webmanifest', 'js/guard.js', 'js/mission-data.js', 'js/systems-engine.js', 'js/audio.js', 'js/visualizer.js', 'js/simulation.js', 'js/launch-sim.js', 'js/app.js', 'js/ui-fx.js', 'js/sources.js', 'js/mission-math.js', 'js/extras.js', 'js/extras2.js', 'js/autodebug.js', 'js/ai-core.js', 'js/assistant.js', 'js/flow.js'];
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== CACHE).map(x => caches.delete(x)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url); if (e.request.method !== 'GET' || u.origin !== location.origin || u.pathname.startsWith('/api/')) return;
  e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(r => { const c = r.clone(); caches.open(CACHE).then(x => x.put(e.request, c)); return r; })));
});
