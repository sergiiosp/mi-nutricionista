import { mount } from 'svelte';
import './app.css';
import App from './App.svelte';
import { iniciarNube } from './lib/nube/sincro.js';
import { iniciarAvisos } from './lib/nube/avisos.js';
import { importarStrava } from './lib/nube/strava.js';

// Enlace del QR para vincular este dispositivo (#vincular=CLAVE): se guarda y se quita de la barra
const vincular = location.hash.match(/^#vincular=([\w-]{32})$/);
if (vincular) {
  sessionStorage.setItem('vincular', vincular[1]);
  history.replaceState(null, '', `${location.pathname}#ajustes/conectar`);
}

const app = mount(App, { target: document.getElementById('app') });

// Service worker (solo en producción): la app funciona sin conexión y recibe recordatorios
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
  navigator.serviceWorker.addEventListener('message', (ev) => {
    if (ev.data?.tipo === 'ir') location.hash = new URL(ev.data.url).hash;
  });
}

// Sincronización con tus otros dispositivos, recordatorios y entrenos de Strava
iniciarNube();
iniciarAvisos();
const traerStrava = () => importarStrava().catch(() => {});
setTimeout(traerStrava, 2000);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') traerStrava(); });

export default app;
