// Copias automáticas en este dispositivo (IndexedDB): una por día, las últimas 14.
// La del día se hace al abrir la app, antes de cualquier cambio, así siempre se puede volver atrás.
import { get as leer, set as escribir, del as borrar, keys } from 'idb-keyval';
import { get } from 'svelte/store';
import { estado, importar } from '../stores/estado.js';
import { hoyISO } from './planificador.js';

const PREFIJO = 'copia:';
const MAX = 14;

/** Resumen corto para reconocer la copia sin abrirla. */
function resumen(e) {
  const comidas = Object.values(e.registros || {}).reduce((s, l) => s + l.length, 0);
  const sesiones = Object.keys(e.hyrox?.registros || {}).length;
  return { comidas, sesiones, pesos: (e.pesos || []).length };
}

/** Guarda la copia de hoy si aún no existe (forzar: la reemplaza). */
export async function copiarHoy(forzar = false) {
  try {
    const e = get(estado);
    if (!e.perfil) return;
    const clave = PREFIJO + hoyISO();
    if (!forzar && (await leer(clave))) return;
    await escribir(clave, { fecha: hoyISO(), hora: new Date().toISOString(), datos: JSON.stringify(e), resumen: resumen(e) });
    const viejas = (await keys()).filter((k) => String(k).startsWith(PREFIJO)).sort().slice(0, -MAX);
    await Promise.all(viejas.map((k) => borrar(k)));
  } catch {
    // sin IndexedDB (modo privado): no hay copias automáticas
  }
}

/** Copias disponibles, de la más reciente a la más antigua: [{ fecha, hora, resumen }] */
export async function listarCopiasLocales() {
  try {
    const claves = (await keys()).filter((k) => String(k).startsWith(PREFIJO)).sort().reverse();
    const lista = await Promise.all(claves.map((k) => leer(k)));
    return lista.filter(Boolean).map(({ fecha, hora, resumen: r }) => ({ fecha, hora, resumen: r }));
  } catch {
    return [];
  }
}

/** Vuelve a una copia. Antes guarda cómo estaba todo ahora, por si te arrepientes. */
export async function restaurarCopiaLocal(fecha) {
  const copia = await leer(PREFIJO + fecha);
  if (!copia) throw new Error('No encuentro esa copia');
  await escribir(`${PREFIJO}antes-de-restaurar`, { fecha: 'antes-de-restaurar', hora: new Date().toISOString(), datos: JSON.stringify(get(estado)), resumen: resumen(get(estado)) });
  importar(copia.datos);
}

/** Pide al navegador que no borre los datos de la app aunque falte espacio. */
export function pedirAlmacenamientoPersistente() {
  navigator.storage?.persist?.().catch(() => {});
}
