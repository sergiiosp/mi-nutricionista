// Service worker: la app funciona sin conexión (por ejemplo, dentro del súper).
// Sube VERSION cada vez que cambies archivos para que los móviles descarguen la nueva versión.
const VERSION = 'p20261015';
const CACHE = `nutricionista-${VERSION}`;
const ARCHIVOS = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/styles.css',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'js/app.js',
  'js/estado.js',
  'js/ui.js',
  'js/nutricion.js',
  'js/planificador.js',
  'js/compra.js',
  'js/progreso.js',
  'js/vistas/bienvenida.js',
  'js/vistas/principal.js',
  'data/alimentos.js',
  'data/recetas.js',
  'data/precios.js',
];

self.addEventListener('install', (ev) => {
  ev.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (ev) => {
  ev.waitUntil(
    caches.keys()
      .then((claves) => Promise.all(claves.filter((k) => k.startsWith('nutricionista-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (ev) => {
  const { request } = ev;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (url.origin === location.origin) {
    // Archivos propios: red primero (para ver cambios al momento) y caché si no hay conexión
    ev.respondWith(
      fetch(request, { cache: 'no-cache' })
        .then((res) => {
          const copia = res.clone();
          caches.open(CACHE).then((c) => c.put(request, copia));
          return res;
        })
        .catch(() => caches.match(request, { ignoreSearch: true }).then((r) => r || caches.match('index.html'))),
    );
  } else if (url.hostname.endsWith('imgix.net')) {
    // Fotos de productos de Mercadona: caché primero
    ev.respondWith(
      caches.match(request).then((r) => r || fetch(request).then((res) => {
        const copia = res.clone();
        caches.open(CACHE).then((c) => c.put(request, copia));
        return res;
      })),
    );
  }
});
