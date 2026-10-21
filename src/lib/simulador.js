// Simulador «¿y si…?»: cambia tus kcal, tus sesiones o lo extra del fin de semana y mira dónde llegarías
// (peso y % de grasa) el día de tu carrera o en unas semanas. Balance energético semana a semana:
// - el gasto parte del real (fórmula + la corrección con tus datos) y baja ~25 kcal por kg que pierdes;
// - cada kg de cambio son ~7.700 kcal;
// - lo que pierdes o ganas se reparte entre grasa y músculo según cuánto entrenas y lo brusco del cambio;
// - comiendo cerca de lo que gastas y entrenando, hay algo de recomposición (−grasa, +músculo).
// Es una estimación para comparar opciones, no una promesa: el cuerpo no es una calculadora.
import { calcularObjetivos } from './nutricion.js';
import { sumarDias } from './planificador.js';

const KCAL_KG = 7700;
const POR_KG = 25; // kcal/día que deja de gastar cada kg menos

/** Punto de partida: tu peso, tu grasa, tu gasto real, las kcal de tu plan y tus sesiones. */
export function baseSimulador(e, hoy) {
  const p = e.perfil;
  const o = calcularObjetivos(p);
  const pesos = [...(e.pesos || [])].sort((a, b) => a.fecha.localeCompare(b.fecha));
  const grasa = p.grasa || pesos.filter((x) => x.grasa).at(-1)?.grasa || null;
  const carrera = e.hyrox?.config?.fechaCarrera > hoy ? e.hyrox.config.fechaCarrera : null;
  return {
    peso: p.peso,
    grasa,
    gasto: Math.round(o.get + (p.ajusteGasto || 0)),
    kcal: o.kcal,
    sesiones: o.diasEntreno || (e.hyrox?.config?.dias || []).length || 0,
    kcalSesion: o.kcalSesion || 450,
    minimo: o.base.minimo,
    carrera,
    objetivo: p.objetivo,
  };
}

/**
 * Proyección semana a semana. `opc`: { kcal, sesiones, extraFinde (kcal de más el sábado y el domingo), semanas }.
 * Devuelve la línea (peso y grasa por semana) y el final.
 */
export function simular(base, opc) {
  const semanas = Math.max(1, Math.round(opc.semanas));
  let peso = base.peso;
  let grasaKg = base.grasa ? (peso * base.grasa) / 100 : null;
  const linea = [{ s: 0, peso, grasa: base.grasa }];
  let deficitMax = 0;
  for (let s = 1; s <= semanas; s++) {
    const gasto = base.gasto + POR_KG * (peso - base.peso) + ((opc.sesiones - base.sesiones) * base.kcalSesion) / 7;
    const ingesta = opc.kcal + ((opc.extraFinde || 0) * 2) / 7;
    const balance = ingesta - gasto; // kcal/día
    deficitMax = Math.max(deficitMax, -balance / gasto);
    const dPeso = (balance * 7) / KCAL_KG;
    if (grasaKg != null) {
      // Qué parte del cambio es grasa
      let parteGrasa;
      if (dPeso < 0) parteGrasa = -balance / gasto > 0.25 ? 0.65 : opc.sesiones >= 3 ? 0.85 : 0.7;
      else parteGrasa = opc.sesiones >= 3 ? 0.55 : 0.8;
      grasaKg += dPeso * parteGrasa;
      // Recomposición: cerca del mantenimiento y entrenando, algo de grasa se cambia por músculo
      if (Math.abs(balance) < 250 && opc.sesiones >= 3) grasaKg -= 0.04 * Math.min(1, opc.sesiones / 4);
    }
    peso += dPeso;
    linea.push({ s, peso, grasa: grasaKg != null ? (grasaKg / peso) * 100 : null });
  }
  const fin = linea.at(-1);
  const magraIni = base.grasa ? base.peso * (1 - base.grasa / 100) : null;
  return {
    linea,
    semanas,
    peso: fin.peso,
    grasa: fin.grasa,
    dPeso: fin.peso - base.peso,
    dGrasaKg: grasaKg != null ? grasaKg - (base.peso * base.grasa) / 100 : null,
    dMagra: magraIni != null ? fin.peso - grasaKg - magraIni : null,
    ritmo: (fin.peso - base.peso) / semanas,
    deficitMax,
  };
}

/** Avisos de la simulación (lo que un buen nutricionista te diría antes de hacerlo). */
export function avisosSimulacion(base, opc, r) {
  const l = [];
  if (opc.kcal < base.minimo) l.push({ tipo: 'mal', texto: `Por debajo de ${base.minimo} kcal no llegas a lo mínimo para entrenar y estar sano.` });
  if (r.deficitMax > 0.25) l.push({ tipo: 'mal', texto: 'Déficit muy agresivo: parte de lo que pierdes sería músculo y tus entrenos lo notarían.' });
  else if (r.ritmo < -(base.peso * 0.01)) l.push({ tipo: 'mal', texto: 'Más de un 1 % de tu peso por semana: demasiado rápido para mantener el músculo.' });
  if (r.dMagra != null && r.dMagra < -0.8) l.push({ tipo: 'mal', texto: `Perderías unos ${Math.abs(r.dMagra).toFixed(1).replace('.', ',')} kg de masa magra.` });
  if (r.ritmo > base.peso * 0.005) l.push({ tipo: 'ojo', texto: 'Subes rápido: buena parte sería grasa.' });
  if (opc.sesiones > 6) l.push({ tipo: 'ojo', texto: 'Más de 6 sesiones a la semana sin descanso aumenta el riesgo de lesión.' });
  if ((opc.extraFinde || 0) >= 600) l.push({ tipo: 'ojo', texto: 'Lo del fin de semana se come gran parte del déficit de la semana.' });
  if (!l.length && Math.abs(r.ritmo) <= base.peso * 0.0075 && r.deficitMax <= 0.2) l.push({ tipo: 'bien', texto: 'Ritmo sostenible: este cambio se puede mantener sin perder rendimiento.' });
  return l;
}

/** Semanas hasta una fecha. */
export const semanasHasta = (hoy, fecha) => Math.max(1, Math.round((new Date(`${fecha}T12:00`) - new Date(`${hoy}T12:00`)) / (7 * 86400000)));
export const fechaTras = (hoy, semanas) => sumarDias(hoy, semanas * 7);
