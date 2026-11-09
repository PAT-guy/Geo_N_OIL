// Service worker de GeoExplorer : permet de jouer hors ligne une fois le jeu visité.
// Stratégie « réseau d'abord » : avec du réseau, on charge toujours la dernière version (aucune version périmée
// coincée en cache) ; sans réseau, on sert la copie gardée. Les sauvegardes et records sont dans localStorage,
// que ce fichier ne touche jamais.
const CACHE = 'geoexplorer-v1';
const FICHIERS = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png', './icons/favicon.svg',
  './fonts/ibm-plex-mono-latin-400-normal.woff2', './fonts/ibm-plex-mono-latin-500-normal.woff2', './fonts/ibm-plex-mono-latin-600-normal.woff2', './fonts/ibm-plex-sans-latin-400-normal.woff2', './fonts/ibm-plex-sans-latin-500-normal.woff2', './fonts/ibm-plex-sans-latin-600-normal.woff2', './fonts/source-serif-4-latin-wght-normal.woff2'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FICHIERS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request; if(r.method !== 'GET' || new URL(r.url).origin !== location.origin) return;
  e.respondWith(fetch(r).then(rep => { if(rep && rep.ok){ const copie = rep.clone(); caches.open(CACHE).then(c => c.put(r, copie)); } return rep; })
    .catch(() => caches.match(r).then(m => m || caches.match('./index.html'))));
});
