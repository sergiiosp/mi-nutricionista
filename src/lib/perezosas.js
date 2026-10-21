// Pantallas y hojas que se cargan aparte: la app arranca solo con Hoy y el resto se trae en cuanto
// hay calma (y queda en la caché del service worker, así que funciona sin conexión).
const CARGADORES = {
  entreno: () => import('../pages/Entreno.svelte'),
  comida: () => import('../pages/Comida.svelte'),
  progreso: () => import('../pages/Progreso.svelte'),
  ajustes: () => import('../pages/Ajustes.svelte'),
  cuestionario: () => import('../pages/Cuestionario.svelte'),
  sesion: () => import('../components/DetalleSesion.svelte'),
  registrarSesion: () => import('../components/RegistrarSesion.svelte'),
  estacion: () => import('../components/FichaEstacion.svelte'),
  guiaFuera: () => import('../components/GuiaFuera.svelte'),
  diaLibre: () => import('../components/DiaLibre.svelte'),
  camara: () => import('../components/CamaraGuia.svelte'),
  cocina: () => import('../components/ModoCocina.svelte'),
  tuPlan: () => import('../components/TuPlan.svelte'),
  test: () => import('../components/RegistrarTest.svelte'),
  diaCarrera: () => import('../components/ModoCarrera.svelte'),
  informe: () => import('../components/Informe.svelte'),
};

const promesas = {};
/** Promesa del componente (se pide una sola vez). */
export const cargar = (k) => (promesas[k] ||= CARGADORES[k]().then((m) => m.default));

/** Precarga todo lo que falta cuando el móvil está libre. */
export function precargarTodo() {
  const todo = () => Object.keys(CARGADORES).forEach((k) => cargar(k).catch(() => { delete promesas[k]; }));
  if ('requestIdleCallback' in window) requestIdleCallback(todo, { timeout: 2500 });
  else setTimeout(todo, 1200);
}
