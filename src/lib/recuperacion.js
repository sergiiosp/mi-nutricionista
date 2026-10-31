// Recuperación y esfuerzo del día, al estilo de WHOOP o Bevel pero sin pulsera: la recuperación sale de lo que
// contestas en «¿Cómo llegas?» (sueño, agujetas y energía, 0-2 cada uno) y el esfuerzo, de tus sesiones
// (duración × lo dura que fue: la carga de entreno).
import { sumarDias } from './planificador.js';
import { sesionesDia } from './hyrox/index.js';

export const FACTORES = [
  { id: 'sueno', n: 'Sueño', op: ['Mal', 'Normal', 'Bien'] },
  { id: 'agujetas', n: 'Agujetas', op: ['Muchas', 'Algunas', 'Nada'] },
  { id: 'energia', n: 'Energía', op: ['Baja', 'Normal', 'Alta'] },
];
const pct = (f) => Math.round((FACTORES.reduce((t, x) => t + (f[x.id] ?? 1), 0) / 6) * 100);

/** Recuperación de un día (0-100 %) con cada factor frente a tu media de las 2 semanas anteriores. */
export function recuperacion(e, fecha) {
  const forma = e.hyrox?.forma || {};
  const previos = Object.entries(forma).filter(([f]) => f < fecha && f >= sumarDias(fecha, -14)).map(([, f]) => f);
  const media = previos.length ? Math.round(previos.reduce((t, f) => t + pct(f), 0) / previos.length) : null;
  const hoy = forma[fecha];
  if (!hoy) return { contestada: false, media };
  const valor = pct(hoy);
  const factores = FACTORES.map((x) => {
    const v = hoy[x.id] ?? 1;
    const m = previos.length ? previos.reduce((t, f) => t + (f[x.id] ?? 1), 0) / previos.length : null;
    return { ...x, valor: v, texto: x.op[v], media: m, comparado: m == null ? null : v > m + 0.4 ? 'mejor' : v < m - 0.4 ? 'peor' : 'igual' };
  });
  // El consejo, para el factor más bajo (y, si empatan, el que más baja frente a tu media)
  const peor = [...factores].sort((a, b) => a.valor - b.valor || (a.valor - (a.media ?? a.valor)) - (b.valor - (b.media ?? b.valor)))[0];
  const consejo = {
    sueno: 'Para recuperar mejor, acuéstate antes esta noche y deja las pantallas media hora antes.',
    agujetas: 'Vienes cargado de piernas: camina, estira y no añadas nada fuerte hoy.',
    energia: 'Con poca energía, revisa que llegues a tus hidratos y no te saltes comidas.',
  }[peor.id];
  const frase = valor >= 67 ? 'Llegas bien: la sesión de hoy va tal cual.'
    : valor >= 34 ? 'Llegas algo tocado: hoy la sesión es más suave (menos volumen y un punto menos de esfuerzo).'
      : 'Llegas fundido: sesión de mantenimiento. Mejor sumar mañana que romperte hoy.';
  return { contestada: true, valor, media, nivel: hoy.nivel, factores, frase, consejo: peor.valor < 2 ? consejo : null };
}

/** Carga de un día: minutos × esfuerzo (RPE) de las sesiones hechas; si es hoy y aún no está hecha, la prevista. */
function cargaDia(e, fecha, hoy) {
  const regs = e.hyrox?.registros || {};
  let carga = 0, prevista = false;
  for (const s of sesionesDia(e, fecha)) {
    const r = regs[s.id];
    if (r && ['completa', 'parcial'].includes(r.estado)) carga += (r.duracion || s.duracion * (r.estado === 'parcial' ? 0.5 : 1)) * (r.rpe || s.rpe);
    else if (fecha === hoy && !r) { carga += s.duracion * s.rpe; prevista = true; }
  }
  return { carga: Math.round(carga), prevista };
}

/** Esfuerzo: el de hoy (esfuerzo y minutos) y la carga de los últimos 7 días frente a tu semana habitual. */
export function esfuerzo(e, hoy) {
  const sesiones = sesionesDia(e, hoy);
  const principal = [...sesiones].sort((a, b) => b.duracion * b.rpe - a.duracion * a.rpe)[0] || null;
  const reg = principal ? e.hyrox?.registros?.[principal.id] : null;
  const dias = Array.from({ length: 7 }, (_, i) => {
    const fecha = sumarDias(hoy, i - 6);
    return { fecha, ...cargaDia(e, fecha, hoy) };
  });
  const semana = dias.reduce((t, d) => t + (d.prevista ? 0 : d.carga), 0);
  // Tu semana habitual: media de las 3 semanas anteriores
  const anteriores = [1, 2, 3].map((k) => Array.from({ length: 7 }, (_, i) => cargaDia(e, sumarDias(hoy, i - 6 - 7 * k), hoy).carga).reduce((a, b) => a + b, 0));
  const habitual = anteriores.some((x) => x > 0) ? Math.round(anteriores.reduce((a, b) => a + b, 0) / 3) : null;
  return {
    hoy: principal ? { titulo: principal.titulo, rpe: reg?.rpe || principal.rpe, duracion: reg?.duracion || principal.duracion, hecha: !!reg && reg.estado !== 'no' } : null,
    dias, semana, habitual, ratio: habitual ? semana / habitual : null,
  };
}
