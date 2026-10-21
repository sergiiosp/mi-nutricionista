// Copias automáticas en este dispositivo (IndexedDB): una por día, las últimas 14.
// La del día se hace al abrir la app, antes de cualquier cambio, así siempre se puede volver atrás.
import { get as leer, set as escribir, del as borrar, keys } from 'idb-keyval';
import { get } from 'svelte/store';
import { estado, importar, actualizar } from '../stores/estado.js';
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

// ── Copia fuera del móvil (iCloud Drive, Archivos…): todo, también las fotos de progreso ──────

const aDataURL = (blob) => new Promise((ok, mal) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = mal; r.readAsDataURL(blob); });

/** Archivo con todos tus datos y tus fotos de progreso (JSON). */
export async function archivoCopia() {
  const e = get(estado);
  const fotos = {};
  for (const f of e.fotosProgreso || []) {
    try { const b = await leer(`foto:${f.id}`); if (b) fotos[f.id] = await aDataURL(b); } catch { /* foto perdida */ }
  }
  const texto = JSON.stringify({ ...e, _fotos: fotos, _copia: { fecha: hoyISO(), app: 'Pulso' } });
  return new File([texto], `pulso-${hoyISO()}.json`, { type: 'application/json' });
}

/**
 * Guarda la copia fuera del móvil: en iPhone abre «Compartir» para elegir «Guardar en Archivos»
 * (iCloud Drive); si no se puede compartir, se descarga. Devuelve true si se guardó.
 */
export async function guardarCopiaFuera() {
  const archivo = await archivoCopia();
  try {
    if (navigator.canShare?.({ files: [archivo] })) {
      await navigator.share({ files: [archivo], title: 'Copia de Pulso' });
    } else {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(archivo);
      a.download = archivo.name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    }
  } catch (err) {
    if (err?.name === 'AbortError') return false; // cerraste el menú sin guardar
    throw err;
  }
  actualizar((x) => { x.ultimaCopia = hoyISO(); });
  return true;
}

/** Restaura un archivo de copia (con o sin fotos). Antes guarda cómo estaba todo. */
export async function restaurarArchivo(texto) {
  const datos = JSON.parse(texto);
  await escribir(`${PREFIJO}antes-de-restaurar`, { fecha: 'antes-de-restaurar', hora: new Date().toISOString(), datos: JSON.stringify(get(estado)), resumen: resumen(get(estado)) });
  for (const [id, url] of Object.entries(datos._fotos || {})) {
    try { await escribir(`foto:${id}`, await (await fetch(url)).blob()); } catch { /* foto dañada */ }
  }
  delete datos._fotos;
  delete datos._copia;
  importar(JSON.stringify(datos));
}

/** Pide al navegador que no borre los datos de la app aunque falte espacio. */
export function pedirAlmacenamientoPersistente() {
  navigator.storage?.persist?.().catch(() => {});
}
