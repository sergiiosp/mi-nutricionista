// Recordatorios en el móvil: la app calcula los avisos de los próximos 7 días y el servidor
// los envía a su hora como notificaciones (Web Push), aunque la app esté cerrada.
import { get } from 'svelte/store';
import { estado } from '../../stores/estado.js';
import { calcularObjetivos } from '../nutricion.js';
import { recomendaciones, recordatoriosDia } from '../salud.js';
import { esDiaEntreno, aMin, aHora } from '../horario.js';
import { estadoDia } from '../dia.js';
import { explicarPlan } from '../coach.js';
import { sesionesDia } from '../hyrox/index.js';
import { hoyISO, sumarDias, recetaPorId } from '../planificador.js';
import { meta, guardarMeta, apiJSON } from './sincro.js';
import { desdeB64u } from './cripto.js';

const MIN = 60_000;
export const PREFS_DEFECTO = { activo: false, comidas: true, entreno: true, suplementos: true, pesarse: true, inteligentes: true, diaPeso: 1, horaPeso: '08:00' };
export const prefsAvisos = () => ({ ...PREFS_DEFECTO, ...(meta.avisos || {}) });

const NOMBRES = { desayuno: 'Desayuno', media: 'Media mañana', comida: 'Comida', merienda: 'Merienda', cena: 'Cena', recena: 'Antes de dormir' };
const EMOJIS = { desayuno: '☕', media: '🍎', comida: '🍽️', merienda: '🥪', cena: '🌙', recena: '🌙' };
const nombreFranja = (c) => (['media', 'merienda'].includes(c.franja) && c.hora ? (c.hora < '14:00' ? 'Media mañana' : 'Merienda') : NOMBRES[c.franja] || 'Comida');

export function soporteAvisos() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
    return { ok: false, motivo: ios ? 'En iPhone, primero añade la app a la pantalla de inicio (Compartir → «Añadir a pantalla de inicio») y ábrela desde ese icono.' : 'Este navegador no admite notificaciones.' };
  }
  if (Notification.permission === 'denied') return { ok: false, motivo: 'Las notificaciones están bloqueadas para esta app: actívalas en los ajustes del navegador o del móvil.' };
  return { ok: true };
}

/** Avisos de los próximos 7 días: [{ t, titulo, cuerpo, url, etiqueta }] */
export function calcularAvisos(e, prefs = prefsAvisos(), ahora = Date.now()) {
  if (!e.perfil) return [];
  const t = (fecha, hora) => new Date(`${fecha}T${hora}:00`).getTime();
  const hoy = hoyISO();
  const lista = [];
  const recs = prefs.suplementos ? recomendaciones(e.perfil, calcularObjetivos(e.perfil)) : null;

  for (let i = 0; i < 7; i++) {
    const fecha = sumarDias(hoy, i);
    const dia = e.plan?.dias.find((d) => d.fecha === fecha);
    const regs = e.registros[fecha] || [];
    const comidas = [];

    if (prefs.comidas && dia) {
      for (const c of dia.comidas) {
        if (!c.hora || regs.some((r) => r.franja === c.franja) || e.saltadas[`${fecha}|${c.franja}`]) continue;
        const receta = recetaPorId[c.recetaId];
        const aviso = { t: t(fecha, c.hora), titulo: `${EMOJIS[c.franja] || '🍽️'} ${nombreFranja(c)} · ${c.hora}`, cuerpo: receta ? `Toca: ${receta.nombre}` : 'Hora de comer', url: '#hoy', etiqueta: `comida-${fecha}-${c.franja}`, franja: c };
        comidas.push(aviso);
        lista.push(aviso);
        // ¿Se te olvidó apuntarla? Si a la hora y media sigue sin marcar (al apuntarla, este aviso se borra)
        if (prefs.inteligentes && ['comida', 'cena'].includes(c.franja)) {
          lista.push({ t: t(fecha, c.hora) + 90 * MIN, titulo: `¿Ya has comido?`, cuerpo: `Aún no has apuntado la ${nombreFranja(c).toLowerCase()}. Un toque y el resto del día se ajusta.`, url: '#hoy', etiqueta: `olvido-${fecha}-${c.franja}` });
        }
      }
    }

    if (prefs.entreno) {
      const sesiones = sesionesDia(e, fecha);
      for (const s of sesiones) {
        if (e.hyrox?.registros?.[s.id] || s.tipo === 'carrera') continue;
        const cuando = t(fecha, s.hora) - 60 * MIN;
        const junto = comidas.find((a) => a.t === cuando); // coincide con el pre-entreno: un solo aviso
        // Si el menú tiene una comida «pre» y aún no la has tomado, el aviso te la recuerda
        const pre = prefs.inteligentes ? comidas.find((a) => a.franja?.etiqueta === 'pre' && a.t <= cuando && a.t >= cuando - 180 * MIN) : null;
        const cuerpo = pre ? `En 1 h entrenas: si no has tomado aún tu pre-entreno (${recetaPorId[pre.franja.recetaId]?.nombre || nombreFranja(pre.franja)}), es el momento.` : `A las ${s.hora} · ${s.duracion} min. Ve preparando el pre-entreno.`;
        if (junto) junto.cuerpo += ` · ${s.emoji} ${s.hora} ${s.titulo}`;
        else lista.push({ t: cuando, titulo: `${s.emoji} Hoy toca: ${s.titulo}`, cuerpo, url: '#entreno', etiqueta: `entreno-${s.id}` });
      }
      if (!e.hyrox?.config && e.perfil.horaEntreno && esDiaEntreno(e.perfil, fecha)) {
        lista.push({ t: t(fecha, e.perfil.horaEntreno) - 60 * MIN, titulo: '💪 Hoy entrenas', cuerpo: `A las ${e.perfil.horaEntreno}. Ve preparando el pre-entreno.`, url: '#hoy', etiqueta: `entreno-${fecha}` });
      }
    }

    if (recs && dia) {
      const franjas = dia.comidas.map((c) => ({ id: c.franja, horaTexto: c.hora || '' }));
      for (const x of recordatoriosDia(recs, franjas, dia.sesion || null)) {
        if (!x.hora || x.durante) continue;
        const cuando = t(fecha, x.hora);
        const junto = comidas.find((a) => a.t === cuando);
        if (junto) junto.cuerpo += ` · ${x.emoji} ${x.texto}`; // mismo momento que una comida: un solo aviso
        else lista.push({ t: cuando, titulo: `${x.emoji} ${x.texto}`, cuerpo: 'Recordatorio de tus suplementos', url: '#ajustes/salud', etiqueta: `sup-${fecha}-${x.hora}` });
      }
    }

    if (prefs.inteligentes) {
      const despertar = e.perfil.despertar || '07:30';
      const dormir = e.perfil.dormir || '23:30';
      // Los lunes, lo que toca esta semana (Tu plan)
      if (new Date(`${fecha}T12:00`).getDay() === 1) {
        try {
          const c = explicarPlan(e, calcularObjetivos(e.perfil), fecha);
          lista.push({ t: t(fecha, aHora(aMin(despertar) + 45)), titulo: `Tu semana · ${c.cabecera.toLowerCase()}`, cuerpo: c.resumen, url: '#hoy', etiqueta: `coach-${fecha}` });
        } catch { /* sin plan aún */ }
      }
      // Día de viaje: por la mañana, la guía para pedir fuera
      if (dia?.viaje) lista.push({ t: t(fecha, aHora(aMin(despertar) + 30)), titulo: '📍 Hoy comes fuera', cuerpo: 'Mira qué pedir según el sitio para no salirte del día.', url: '#hoy', etiqueta: `viaje-${fecha}` });
      // Carreras de tu agenda: la víspera y el desayuno del día
      for (const ev of e.agenda?.eventos || []) {
        if (ev.fecha === sumarDias(fecha, 1)) lista.push({ t: t(fecha, '20:00'), titulo: `🏁 Mañana: ${ev.nombre || 'tu carrera'}`, cuerpo: `Sales a las ${ev.hora || '09:00'}. Cena pronto y con hidratos, deja la ropa y el dorsal preparados y desayuna lo de siempre.`, url: '#entreno', etiqueta: `carrera-vispera-${ev.id}` });
        if (ev.fecha === fecha) lista.push({ t: t(fecha, ev.hora || '09:00') - 150 * MIN, titulo: '🏁 Desayuno de carrera', cuerpo: 'Ahora: hidratos fáciles (tostadas con mermelada, plátano) y agua. Nada nuevo hoy.', url: '#hoy', etiqueta: `carrera-desayuno-${ev.id}` });
      }
      // Hoy: si ni con lo que queda del menú llegas a la proteína, un aviso antes de dormir
      if (i === 0 && dia) {
        const d = estadoDia(e, calcularObjetivos(e.perfil), fecha);
        if (d.huecoFinal.p >= 20) lista.push({ t: t(fecha, aHora(aMin(dormir) - 120)), titulo: `Te faltan ~${Math.round(d.huecoFinal.p)} g de proteína`, cuerpo: e.perfil.whey ? 'Un batido de proteína o un yogur proteico y cierras el día.' : 'Un yogur proteico, queso batido o unas lonchas de pavo y cierras el día.', url: '#hoy', etiqueta: `proteina-${fecha}` });
      }
    }

    if (prefs.pesarse && new Date(`${fecha}T12:00`).getDay() === Number(prefs.diaPeso) && !e.pesos.some((p) => p.fecha === fecha)) {
      lista.push({ t: t(fecha, prefs.horaPeso), titulo: '⚖️ Toca pesarse', cuerpo: 'En ayunas y después de ir al baño. Apúntalo en Progreso → Cuerpo para ajustar tu plan.', url: '#progreso/peso', etiqueta: `peso-${fecha}` });
    }
  }
  return lista.filter((a) => a.t > ahora + MIN).sort((a, b) => a.t - b.t).slice(0, 250).map(({ franja, ...a }) => a);
}

// ── Suscripción push de este dispositivo ─────────────────────────────────

async function registroSW() {
  const espera = new Promise((_, no) => setTimeout(() => no(new Error('Los avisos funcionan en la app publicada (no en modo desarrollo)')), 6000));
  return Promise.race([navigator.serviceWorker.ready, espera]);
}

async function suscripcion(crear = true) {
  const reg = await registroSW();
  let sub = await reg.pushManager.getSubscription();
  if (!crear) return sub;
  const { clave } = await apiJSON('/avisos/clave');
  if (sub && meta.avisosClave !== clave) { await sub.unsubscribe().catch(() => {}); sub = null; } // el servidor cambió de claves
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: desdeB64u(clave) });
  meta.avisosClave = clave;
  return sub;
}

let ultimaFirma = '';

/** Sube la lista de avisos de este dispositivo (si ha cambiado). */
export async function subirAvisos(forzar = false) {
  const prefs = prefsAvisos();
  if (!meta.clave || !prefs.activo || !navigator.onLine) return;
  const lista = calcularAvisos(get(estado), prefs);
  const firma = JSON.stringify(lista);
  if (!forzar && firma === ultimaFirma) return;
  const sub = await suscripcion(true);
  await apiJSON('/avisos', { method: 'PUT', cuerpo: { suscripcion: sub.toJSON(), lista } });
  ultimaFirma = firma;
  meta.avisosSubidos = Date.now();
  guardarMeta();
  return lista.length;
}

/** Pide permiso, suscribe este dispositivo y programa los avisos. Llamar desde un toque del usuario. */
export async function activarAvisos(prefs = {}) {
  const s = soporteAvisos();
  if (!s.ok) throw new Error(s.motivo);
  const permiso = await Notification.requestPermission();
  if (permiso !== 'granted') throw new Error('Sin permiso no puedo enviarte avisos. Puedes darlo en los ajustes del navegador.');
  meta.avisos = { ...prefsAvisos(), ...prefs, activo: true };
  guardarMeta();
  try {
    await subirAvisos(true);
  } catch (e) {
    meta.avisos.activo = false;
    guardarMeta();
    throw e;
  }
}

export async function cambiarPrefsAvisos(cambios) {
  meta.avisos = { ...prefsAvisos(), ...cambios };
  guardarMeta();
  await subirAvisos(true);
}

export async function desactivarAvisos() {
  const sub = await suscripcion(false).catch(() => null);
  if (sub) {
    await apiJSON('/avisos', { method: 'DELETE', cuerpo: { endpoint: sub.endpoint } }).catch(() => {});
    await sub.unsubscribe().catch(() => {});
  }
  meta.avisos = { ...prefsAvisos(), activo: false };
  guardarMeta();
  ultimaFirma = '';
}

export async function probarAviso() {
  const sub = await suscripcion(false);
  if (!sub) throw new Error('Este dispositivo no tiene los avisos activados');
  const r = await apiJSON('/avisos/prueba', { cuerpo: { endpoint: sub.endpoint } });
  if (!r.ok) throw new Error(`El servicio de notificaciones respondió ${r.status}`);
}

/** Mantiene la lista al día: al abrir la app y cuando cambian el menú, el plan o los registros. */
export function iniciarAvisos() {
  let t;
  let primera = true;
  estado.subscribe(() => {
    if (primera) { primera = false; return; }
    clearTimeout(t);
    t = setTimeout(() => subirAvisos().catch(() => {}), 15_000);
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') subirAvisos().catch(() => {});
  });
  setTimeout(() => subirAvisos().catch(() => {}), 3000);
}
