// Rachas, logros y resumen semanal a partir de los registros.
import { sumarMacros, objetivosDia } from './nutricion.js';
import { esDiaEntreno } from './horario.js';
import { sumarDias } from './planificador.js';
import { tendencia } from './progreso.js';

function resumenDia(e, objetivos, fecha) {
  const regs = e.registros[fecha] || [];
  if (!regs.length) return null;
  const m = sumarMacros(regs.map((r) => r.macros));
  const dia = e.plan?.dias.find((d) => d.fecha === fecha);
  const od = dia?.objetivo || objetivosDia(objetivos, dia ? dia.entreno : esDiaEntreno(e.perfil, fecha));
  return {
    fecha, m, od,
    proteinaOk: m.p >= od.proteina * 0.9,
    kcalOk: Math.abs(m.kcal - od.kcal) <= od.kcal * 0.1,
  };
}

function racha(e, objetivos, hoy, condicion) {
  let n = 0;
  // Si hoy aún no cumple, la racha cuenta hasta ayer
  let f = hoy;
  const rHoy = resumenDia(e, objetivos, hoy);
  if (!rHoy || !condicion(rHoy)) f = sumarDias(hoy, -1);
  for (;;) {
    const r = resumenDia(e, objetivos, f);
    if (!r || !condicion(r)) break;
    n++;
    f = sumarDias(f, -1);
  }
  return n;
}

export function rachas(e, objetivos, hoy) {
  return {
    registro: racha(e, objetivos, hoy, () => true),
    proteina: racha(e, objetivos, hoy, (r) => r.proteinaOk),
    calorias: racha(e, objetivos, hoy, (r) => r.kcalOk),
  };
}

export function logros(e, objetivos, hoy) {
  const dias = Object.keys(e.registros).filter((f) => (e.registros[f] || []).length);
  const resumenes = dias.map((f) => resumenDia(e, objetivos, f)).filter(Boolean);
  const r = rachas(e, objetivos, hoy);
  const maxRacha = (cond) => {
    let max = 0; let act = 0; let anterior = null;
    for (const x of resumenes.slice().sort((a, b) => a.fecha.localeCompare(b.fecha))) {
      const seguido = anterior && sumarDias(anterior, 1) === x.fecha;
      act = cond(x) ? (seguido ? act + 1 : 1) : 0;
      max = Math.max(max, act);
      anterior = x.fecha;
    }
    return max;
  };
  const maxProteina = maxRacha((x) => x.proteinaOk);
  const maxRegistro = maxRacha(() => true);
  const pesos = [...e.pesos].sort((a, b) => a.fecha.localeCompare(b.fecha));
  const perdido = pesos.length > 1 ? pesos[0].peso - pesos.at(-1).peso : 0;
  const regsEntreno = Object.values(e.hyrox?.registros || {});
  const sesiones = regsEntreno.filter((r) => ['completa', 'parcial'].includes(r.estado)).length;
  const conPesos = regsEntreno.filter((r) => r.series && Object.keys(r.series).length).length;
  const med = [...(e.medidas || [])].filter((m) => m.cintura).sort((a, b) => a.fecha.localeCompare(b.fecha));
  const cinturaMenos = med.length > 1 ? med[0].cintura - med.at(-1).cintura : 0;
  const repasos = Object.keys(e.feedback?.semanas || {}).length;
  // p: [lo que llevas, lo que hace falta] para enseñar cuánto falta
  const lista = [
    { id: 'primer-registro', emoji: '🌱', nombre: 'Primer paso', desc: 'Registra tu primera comida', p: [dias.length, 1] },
    { id: 'racha-3', emoji: '🔥', nombre: 'En marcha', desc: '3 días seguidos registrando lo que comes', p: [maxRegistro, 3] },
    { id: 'racha-7', emoji: '📅', nombre: 'Semana completa', desc: '7 días seguidos registrando', p: [maxRegistro, 7] },
    { id: 'racha-30', emoji: '🏆', nombre: 'Hábito creado', desc: '30 días seguidos registrando', p: [maxRegistro, 30] },
    { id: 'proteina-5', emoji: '💪', nombre: 'Proteína a tope', desc: '5 días seguidos llegando a tu proteína (90 % o más)', p: [maxProteina, 5] },
    { id: 'proteina-14', emoji: '🦾', nombre: 'Máquina de proteína', desc: '14 días seguidos llegando a tu proteína', p: [maxProteina, 14] },
    { id: 'clavado', emoji: '🎯', nombre: 'Clavado', desc: 'Un día dentro de tus calorías (±10 %)', p: [resumenes.filter((x) => x.kcalOk).length, 1] },
    { id: 'peso-4', emoji: '⚖️', nombre: 'Constancia en la báscula', desc: 'Apunta tu peso 4 veces', p: [e.pesos.length, 4] },
    e.perfil?.objetivo === 'perder'
      ? { id: 'kilo', emoji: '📉', nombre: 'Primer kilo', desc: 'Pierde tu primer kilo', p: [Math.max(0, Math.round(perdido * 10) / 10), 1] }
      : { id: 'cintura', emoji: '📏', nombre: 'Menos cintura', desc: 'Baja 2 cm de cintura (apunta tus medidas)', p: [Math.max(0, Math.round(cinturaMenos * 10) / 10), 2] },
    { id: 'sesiones-10', emoji: '🏋️', nombre: 'Diez entrenos', desc: 'Registra 10 sesiones de entreno', p: [sesiones, 10] },
    { id: 'pesos', emoji: '📈', nombre: 'Cuaderno de cargas', desc: 'Apunta tus pesos en 5 sesiones de fuerza', p: [conPesos, 5] },
    { id: 'repaso', emoji: '📝', nombre: 'Me escucho', desc: 'Haz tu primer repaso semanal', p: [repasos, 1] },
    { id: 'chef', emoji: '👨‍🍳', nombre: 'Chef casero', desc: 'Crea una comida propia', p: [e.propias.length, 1] },
    { id: 'foto', emoji: '📸', nombre: 'Antes y después', desc: 'Guarda una foto de progreso', p: [(e.fotosProgreso || []).length, 1] },
  ].map((l) => ({ ...l, ok: l.p[0] >= l.p[1], p: [Math.min(l.p[0], l.p[1]), l.p[1]] }));
  return { rachas: r, lista, conseguidos: lista.filter((l) => l.ok).length };
}

/** Resumen de los últimos 7 días (hasta ayer, más hoy si ya hay registros). */
export function resumenSemanal(e, objetivos, hoy) {
  const fechas = Array.from({ length: 7 }, (_, i) => sumarDias(hoy, -6 + i));
  // Las medias solo con días cerrados: hoy aún está a medias y falsearía los datos
  const dias = fechas.filter((f) => f !== hoy).map((f) => resumenDia(e, objetivos, f)).filter(Boolean);
  const media = (k) => (dias.length ? dias.reduce((s, d) => s + d.m[k], 0) / dias.length : 0);
  const objMedio = (k) => (dias.length ? dias.reduce((s, d) => s + d.od[k], 0) / dias.length : 0);
  const pesos = e.pesos.filter((p) => p.fecha >= fechas[0]);
  const t = tendencia(e.pesos);
  const consejos = [];
  if (dias.length < 4) consejos.push('Registra al menos 4-5 días por semana para que los datos sean fiables.');
  if (dias.length && media('p') < objMedio('proteina') * 0.9) consejos.push(`Vas corto de proteína (${Math.round(media('p'))} g de media frente a ${Math.round(objMedio('proteina'))} g). Añade un lácteo +Proteínas o una lata de atún al día.`);
  if (dias.length && media('kcal') > objMedio('kcal') * 1.1) consejos.push('Esta semana te has pasado de calorías de media. Revisa las comidas fuera y el picoteo.');
  if (dias.length && media('kcal') < objMedio('kcal') * 0.85) consejos.push('Estás comiendo bastante menos de lo previsto. Comer muy poco cuesta mantenerlo y puede hacerte perder músculo.');
  if (!consejos.length && dias.length) consejos.push('¡Buena semana! Sigue así.');
  return {
    fechas, diasRegistrados: dias.length,
    kcal: media('kcal'), p: media('p'), c: media('c'), g: media('g'),
    objetivoKcal: objMedio('kcal'), objetivoP: objMedio('proteina'),
    diasProteina: dias.filter((d) => d.proteinaOk).length,
    diasKcal: dias.filter((d) => d.kcalOk).length,
    pesoSemana: pesos.length,
    tendencia: t,
    consejos,
    porDia: fechas.map((f) => ({ fecha: f, r: resumenDia(e, objetivos, f) })),
  };
}
