// Gasto real (estilo MacroFactor): lo que comes de media menos lo que dice la tendencia del peso.
// Si comes 2.500 kcal y bajas 0,25 kg/semana, gastas ≈ 2.500 + 0,25 × 7.700 / 7 ≈ 2.775 kcal al día.
// Las fórmulas fallan ±10 %; esto se calibra con tus datos y se reajusta una vez por semana.
import { resumenDia } from './logros.js';
import { tendencia } from './progreso.js';
import { sumarDias } from './planificador.js';

const KCAL_KG = 7700;
const VENTANA = 28; // días que se miran hacia atrás
export const MINIMOS = { dias: 10, pesajes: 5, semanas: 2 };

/**
 * Estimación del gasto real con los últimos 28 días (sin hoy, que está a medias).
 * Solo cuentan los días bien registrados (al menos el 60 % de tu objetivo apuntado).
 */
export function gastoReal(e, objetivos, hoy) {
  const desde = sumarDias(hoy, -VENTANA);
  const fechas = Array.from({ length: VENTANA }, (_, i) => sumarDias(desde, i));
  const dias = fechas.map((f) => resumenDia(e, objetivos, f)).filter((r) => r && r.m.kcal >= r.od.kcal * 0.6);
  const pesos = (e.pesos || []).filter((p) => p.fecha >= desde && p.fecha < hoy);
  const t = tendencia(pesos, VENTANA);
  const faltan = { dias: Math.max(0, MINIMOS.dias - dias.length), pesajes: Math.max(0, MINIMOS.pesajes - pesos.length), semanas: t && t.dias >= MINIMOS.semanas * 7 ? 0 : MINIMOS.semanas };
  if (faltan.dias || faltan.pesajes || faltan.semanas) return { listo: false, faltan, dias: dias.length, pesajes: pesos.length };
  const ingesta = dias.reduce((s, r) => s + r.m.kcal, 0) / dias.length;
  const tdee = ingesta - (t.kgSemana / 7) * KCAL_KG;
  // Un valor imposible (registros incompletos, retención fuerte…) no se usa
  if (tdee < objetivos.tmb * 1.1 || tdee > objetivos.tmb * 2.8) return { listo: false, raro: true, faltan, dias: dias.length, pesajes: pesos.length };
  return { listo: true, tdee: Math.round(tdee / 10) * 10, ingesta: Math.round(ingesta), kgSemana: t.kgSemana, dias: dias.length, pesajes: pesos.length };
}

/**
 * Ajuste semanal: la diferencia entre tu gasto real y el de la fórmula, a medio camino del anterior
 * (para no dar bandazos) y con un tope de ±400 kcal.
 */
export function ajusteGasto(estimacion, objetivos, anterior = 0) {
  if (!estimacion?.listo) return anterior;
  const objetivo = Math.max(-400, Math.min(400, estimacion.tdee - objetivos.get));
  return Math.round((anterior + (objetivo - anterior) * 0.5) / 10) * 10;
}
