// Resumen de cada día y de la semana a partir de los registros.
import { sumarMacros, objetivosDia } from './nutricion.js';
import { esDiaEntreno } from './horario.js';
import { sumarDias } from './planificador.js';
import { tendencia } from './progreso.js';

export function resumenDia(e, objetivos, fecha) {
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
