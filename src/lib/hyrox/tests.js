// Días de test: 5 km, SkiErg y remo de 1.000 m y las estaciones a distancia de carrera. Cada 4-6 semanas
// se repiten para ver si mejoras; las marcas más recientes alimentan los ritmos y el predictor de HYROX.
import { ESTACIONES } from '../../data/hyrox.js';
import { sumarDias } from '../planificador.js';

export const TESTS = [
  { id: '5k', nombre: '5 km corriendo', corto: '5 km', icono: 'footprints', horas: false, ejemplo: '24:00' },
  { id: 'ski1000', nombre: 'SkiErg 1.000 m', corto: 'SkiErg', icono: 'waves-horizontal', ejemplo: '4:00' },
  { id: 'row1000', nombre: 'Remo 1.000 m', corto: 'Remo', icono: 'waves-horizontal', ejemplo: '3:50' },
  ...ESTACIONES.filter((e) => !['ski', 'row'].includes(e.id)).map((e) => ({ id: e.id, nombre: `${e.nombre} ${e.distancia.replace(/ \(.*\)/, '')}`, corto: e.nombre, emoji: e.emoji, ejemplo: '4:00', estacion: true })),
];
export const testPorId = Object.fromEntries(TESTS.map((t) => [t.id, t]));
const MARCA = { '5k': 't5k', ski1000: 'ski1000', row1000: 'row1000' };
const ESTACION_DE = { ski1000: 'ski', row1000: 'row' };

/** { id: [{ fecha, seg }] } de más antiguo a más reciente. */
export function historialTests(tests = []) {
  const h = {};
  for (const t of [...tests].sort((a, b) => a.fecha.localeCompare(b.fecha))) (h[t.id] ||= []).push(t);
  return h;
}

/** Días desde el último test (null si no has hecho ninguno) y si ya toca (más de 5 semanas). */
export function estadoTests(tests = [], hoy) {
  const ultimo = [...tests].sort((a, b) => b.fecha.localeCompare(a.fecha))[0];
  const dias = ultimo ? Math.round((new Date(`${hoy}T12:00`) - new Date(`${ultimo.fecha}T12:00`)) / 86400000) : null;
  return { ultimo: ultimo?.fecha || null, dias, toca: dias == null || dias >= 35, proximo: ultimo ? sumarDias(ultimo.fecha, 35) : hoy };
}

/** Marcas para los ritmos (5 km, SkiErg, remo): las del último test de cada una. */
export function marcasDeTests(tests = []) {
  const h = historialTests(tests);
  const m = {};
  for (const [id, clave] of Object.entries(MARCA)) if (h[id]?.length) m[clave] = h[id].at(-1).seg;
  return m;
}

/** Tiempo por estación del último test (para el predictor), con el SkiErg y el remo incluidos. */
export function estacionesDeTests(tests = []) {
  const h = historialTests(tests);
  const r = {};
  for (const [id, l] of Object.entries(h)) {
    const est = ESTACION_DE[id] || (testPorId[id]?.estacion ? id : null);
    if (est) r[est] = l.at(-1).seg;
  }
  return r;
}
