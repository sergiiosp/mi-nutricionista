import { mount } from 'svelte';
import './app.css';
import App from './App.svelte';
import { iniciarNube } from './lib/nube/sincro.js';
import { iniciarAvisos } from './lib/nube/avisos.js';

// Enlace del QR para vincular este dispositivo (#vincular=CLAVE): se guarda y se quita de la barra
const vincular = location.hash.match(/^#vincular=([\w-]{32})$/);
if (vincular) {
  sessionStorage.setItem('vincular', vincular[1]);
  history.replaceState(null, '', `${location.pathname}#ajustes/conectar`);
}

const app = mount(App, { target: document.getElementById('app') });

// Fuera la pantalla de carga
setTimeout(() => {
  const carga = document.getElementById('carga');
  carga?.classList.add('fuera');
  setTimeout(() => carga?.remove(), 400);
}, 60);

// Service worker (solo en producción): la app funciona sin conexión y recibe recordatorios
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  const habiaVersion = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register('sw.js').then((reg) => {
    // Al volver a la app se mira si hay versión nueva publicada
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => {}); });
  }).catch(() => {});
  // Cuando la versión nueva toma el control, se recarga una vez para estrenarla
  let recargando = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!habiaVersion || recargando) return;
    recargando = true;
    location.reload();
  });
  navigator.serviceWorker.addEventListener('message', (ev) => {
    if (ev.data?.tipo === 'ir') location.hash = new URL(ev.data.url).hash;
  });
}

// Sincronización con tus otros dispositivos y recordatorios
iniciarNube();
iniciarAvisos();

export default app;
