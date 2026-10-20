import { mount } from 'svelte';
import './app.css';
import App from './App.svelte';
import { iniciarNube } from './lib/nube/sincro.js';
import { iniciarAvisos } from './lib/nube/avisos.js';
import { completarMenu, congelarSesiones, reajustarPlan } from './lib/acciones.js';
import { get } from 'svelte/store';
import { estado } from './stores/estado.js';
import { hoja } from './stores/ui.js';
import { copiarHoy, pedirAlmacenamientoPersistente } from './lib/copias.js';
import { fijarPerfilRecetas } from './lib/sustituciones.js';

// Enlace del QR para vincular este dispositivo (#vincular=CLAVE): se guarda y se quita de la barra
const vincular = location.hash.match(/^#vincular=([\w-]{32})$/);
if (vincular) {
  sessionStorage.setItem('vincular', vincular[1]);
  history.replaceState(null, '', `${location.pathname}#ajustes/conectar`);
}

// Las recetas se adaptan a tu perfil (frutos secos o leche que no tomas)
estado.subscribe((e) => fijarPerfilRecetas(e.perfil));

// Copia del día antes de tocar nada (Ajustes → Copias en este móvil) y que el móvil no borre los datos
pedirAlmacenamientoPersistente();
copiarHoy().finally(() => {
  // Las sesiones registradas guardan su copia (para que no cambien si cambia el plan)
  congelarSesiones();
  // Si al menú le falta alguna comida (p. ej. el desayuno o la de antes de dormir), se completa al abrir
  // y se recalculan las cantidades para que el reparto del día siga cuadrando
  if (completarMenu()) reajustarPlan();
});

// iOS solo aplica :active (la respuesta al pulsar) si la página escucha toques
document.addEventListener('touchstart', () => {}, { passive: true });

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
  // Versión nueva: se estrena en un momento tranquilo (al volver a la app sin nada a medias),
  // nunca mientras registras algo, para no perder lo que estás escribiendo
  let nueva = false;
  const tranquilo = () => !get(hoja) && !document.querySelector('.cuestionario') && !document.activeElement?.matches?.('input, textarea, select');
  const estrenar = () => { if (nueva && tranquilo()) { nueva = false; location.reload(); } };
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (habiaVersion) nueva = true; });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') setTimeout(estrenar, 300); });
  navigator.serviceWorker.addEventListener('message', (ev) => {
    if (ev.data?.tipo === 'ir') location.hash = new URL(ev.data.url).hash;
  });
}

// Sincronización con tus otros dispositivos y recordatorios
iniciarNube();
iniciarAvisos();

export default app;
