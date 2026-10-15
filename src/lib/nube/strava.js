// Strava en la app: conectar, importar entrenos y darlos por hechos en el plan.
import { writable, get } from 'svelte/store';
import { estado, actualizar } from '../../stores/estado.js';
import { avisar } from '../../stores/ui.js';
import { planDe } from '../hyrox/index.js';
import { emparejar } from '../hyrox/strava.js';
import { reajustarPlan } from '../acciones.js';
import { meta, guardarMeta, apiJSON } from './sincro.js';

const DIA = 86400;

/** { configurado, conectado, nombre, foto, desde, cargando, error, url } */
export const strava = writable({ cargando: true });

/** Estado de la conexión y enlace de autorización preparado (así el botón abre Strava al instante). */
export async function comprobarStrava() {
  if (!meta.clave) return strava.set({ conectado: false });
  try {
    const e = await apiJSON('/strava/estado');
    let url = null;
    if (e.configurado && !e.conectado) url = (await apiJSON('/strava/inicio', { cuerpo: {} })).url;
    strava.set({ ...e, url, preparado: Date.now() });
    meta.stravaConectado = e.conectado;
    meta.stravaComprobado = Date.now();
    guardarMeta();
    return e;
  } catch (e) {
    strava.set({ error: e.message });
    return null;
  }
}

export async function desconectarStrava() {
  await apiJSON('/strava/desconectar', { cuerpo: {} });
  Object.assign(meta, { stravaUltima: null, stravaConectado: false, stravaComprobado: Date.now() });
  guardarMeta();
  await comprobarStrava();
}

/**
 * Trae los entrenos de los últimos días, los guarda y marca como hechas las sesiones que encajan.
 * Automático como mucho cada 15 minutos; con `forzar` siempre.
 */
export async function importarStrava({ forzar = false } = {}) {
  if (!meta.clave || !navigator.onLine) return null;
  const ahora = Math.floor(Date.now() / 1000);
  if (!forzar && meta.stravaUltima && ahora - meta.stravaUltima < 15 * 60) return null;
  // Sin Strava conectado se vuelve a mirar cada 6 h (por si lo conectas desde otro dispositivo)
  if (!forzar && meta.stravaConectado === false && Date.now() - (meta.stravaComprobado || 0) < 6 * 3600_000) return null;
  meta.stravaUltima = ahora;
  guardarMeta();
  const e0 = get(estado);
  // Primera vez: 2 semanas; luego, 3 días hacia atrás (por si subes algo con retraso)
  const despues = Object.keys(e0.strava || {}).length ? ahora - 3 * DIA : ahora - 14 * DIA;
  let lista;
  try {
    lista = await apiJSON(`/strava/actividades?despues=${despues}`);
  } catch (err) {
    if (err.status === 409 || err.status === 503) {
      Object.assign(meta, { stravaConectado: false, stravaComprobado: Date.now() });
      guardarMeta();
      strava.update((s) => ({ ...s, conectado: false }));
    }
    if (forzar) throw err;
    return null;
  }
  if (!meta.stravaConectado) { meta.stravaConectado = true; guardarMeta(); }
  const e = get(estado);
  const nuevas = lista.filter((a) => !e.strava?.[a.id]);
  if (!nuevas.length) return { nuevas: 0, sesiones: 0 };
  const plan = planDe(e);
  const { asignadas, registros } = emparejar(nuevas, plan, e.hyrox?.registros, e.strava);
  actualizar((x) => {
    x.strava ||= {};
    for (const a of nuevas) x.strava[a.id] = { ...a, sesion: asignadas[a.id] || null };
    if (x.hyrox) for (const [id, r] of Object.entries(registros)) x.hyrox.registros[id] = { ...r, fechaRegistro: r.fechaRegistro || x.strava[r.strava[0]]?.inicio.slice(0, 10) };
  });
  const sesiones = Object.keys(registros).length;
  if (sesiones) reajustarPlan();
  avisar(sesiones ? `Strava: ${sesiones === 1 ? '1 sesión marcada' : `${sesiones} sesiones marcadas`} como hecha${sesiones === 1 ? '' : 's'}` : `Strava: ${nuevas.length} entreno${nuevas.length === 1 ? '' : 's'} importado${nuevas.length === 1 ? '' : 's'}`, '⌚');
  return { nuevas: nuevas.length, sesiones };
}

/** Olvida una actividad importada (y la sesión que había marcado, si solo venía de ella). */
export function quitarActividad(id) {
  actualizar((x) => {
    const a = x.strava?.[id];
    if (!a) return;
    const r = a.sesion && x.hyrox?.registros[a.sesion];
    if (r?.fuente === 'strava') {
      const resto = (r.strava || []).filter((i) => i !== id);
      if (resto.length) r.strava = resto;
      else delete x.hyrox.registros[a.sesion];
    }
    x.strava[id] = { ...a, sesion: null, ignorada: true };
  });
  reajustarPlan();
}
