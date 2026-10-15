// Enrutado por hash: #hoy, #entreno, #comida/compra, #progreso/medidas, #ajustes…
import { readable } from 'svelte/store';

function leer() {
  const [pagina, sub] = location.hash.replace(/^#\/?/, '').split('/');
  return { pagina: pagina || 'hoy', sub: sub || '' };
}

export const ruta = readable(leer(), (set) => {
  const al = () => set(leer());
  window.addEventListener('hashchange', al);
  return () => window.removeEventListener('hashchange', al);
});

export function ir(pagina, sub = '') {
  location.hash = sub ? `#${pagina}/${sub}` : `#${pagina}`;
}
