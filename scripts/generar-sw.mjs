// Genera dist/sw.js tras compilar: precarga la app (para usarla sin conexión) y guarda en caché
// las imágenes de productos, la fuente y los datos de Open Food Facts según se usan.
import { readdirSync, statSync, writeFileSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const DIST = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');

function ficheros(dir, base = '') {
  return readdirSync(dir).flatMap((f) => {
    const ruta = path.join(dir, f);
    const rel = base ? `${base}/${f}` : f;
    return statSync(ruta).isDirectory() ? ficheros(ruta, rel) : [rel];
  });
}

const todos = ficheros(DIST).filter((f) => f !== 'sw.js');
// Lo imprescindible se precarga; las fotos e iconos se guardan al verlos por primera vez
const precarga = ['./', ...todos.filter((f) => !/^(img|emoji)\//.test(f))];
const hash = createHash('sha256');
for (const f of todos) hash.update(f).update(readFileSync(path.join(DIST, f)));
const version = hash.digest('hex').slice(0, 10);

const sw = `// Generado por scripts/generar-sw.mjs
const CACHE = 'nutricionista-${version}';
const PRECARGA = ${JSON.stringify(precarga)};

self.addEventListener('install', (ev) => {
  ev.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECARGA)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (ev) => {
  ev.waitUntil(caches.keys()
    .then((k) => Promise.all(k.filter((x) => x.startsWith('nutricionista-') && x !== CACHE).map((x) => caches.delete(x))))
    .then(() => self.clients.claim()));
});

const guardar = (req, res) => {
  if (res.ok || res.type === 'opaque') {
    const copia = res.clone();
    caches.open(CACHE).then((c) => c.put(req, copia));
  }
  return res;
};

self.addEventListener('fetch', (ev) => {
  const req = ev.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    if (req.mode === 'navigate') {
      // La página: red primero para ver siempre la última versión
      // (sin la caché HTTP: así una versión nueva se ve en cuanto se publica)
      ev.respondWith(fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' }).then((r) => guardar(req, r)).catch(() => caches.match('./')));
      return;
    }
    // Archivos con huella (assets/), fotos e iconos: caché primero
    ev.respondWith(caches.match(req, { ignoreSearch: true }).then((r) => r || fetch(req).then((x) => guardar(req, x))));
  } else if (/imgix\.net$|fonts\.(googleapis|gstatic)\.com$|openfoodfacts\.org$|jsdelivr\.net$/.test(url.hostname)) {
    // Imágenes de productos, fuente, wasm del escáner y fotos de Open Food Facts
    ev.respondWith(caches.match(req).then((r) => r || fetch(req).then((x) => guardar(req, x))));
  }
});

// Recordatorios (Web Push desde el servidor)
self.addEventListener('push', (ev) => {
  let d = {};
  try { d = ev.data.json(); } catch { d = { cuerpo: ev.data ? ev.data.text() : '' }; }
  ev.waitUntil(self.registration.showNotification(d.titulo || 'Mi Nutricionista', {
    body: d.cuerpo || '',
    icon: 'icons/icon-192.png',
    badge: 'icons/icon-192.png',
    tag: d.etiqueta || undefined,
    data: { url: d.url || '#hoy' },
  }));
});

self.addEventListener('notificationclick', (ev) => {
  ev.notification.close();
  const destino = new URL(ev.notification.data?.url || '#hoy', self.registration.scope).href;
  ev.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((ventanas) => {
    const v = ventanas.find((w) => w.url.startsWith(self.registration.scope));
    if (v) { v.postMessage({ tipo: 'ir', url: destino }); return v.focus(); }
    return self.clients.openWindow(destino);
  }));
});
`;
writeFileSync(path.join(DIST, 'sw.js'), sw);
console.log(`sw.js generado (${precarga.length} archivos precargados, versión ${version})`);
