// Ritmos de entrenamiento a partir de tus marcas (o de tu nivel si aún no las tienes).
import { NIVELES } from '../../data/hyrox.js';

export function mmss(s) {
  if (!Number.isFinite(s)) return '—';
  const t = Math.round(s);
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
}
export function hms(s) {
  const t = Math.round(s);
  const h = Math.floor(t / 3600);
  return h ? `${h}:${String(Math.floor((t % 3600) / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}` : mmss(t);
}
/** "25:30", "1:25:30" o "90" (segundos) → segundos */
export function aSegundos(texto) {
  if (texto === '' || texto == null) return null;
  const partes = String(texto).trim().replace(',', '.').split(':').map(Number);
  if (partes.some((x) => !Number.isFinite(x))) return null;
  return partes.reduce((acc, x) => acc * 60 + x, 0);
}

const SKI = { principiante: 300, intermedio: 270, avanzado: 240 };
const ROW = { principiante: 285, intermedio: 255, avanzado: 228 };

/**
 * @param ajusteSeg segundos a restar (si vas sobrado) o sumar (si vas cargado) por km
 */
export function ritmos(config, perfil, ajusteSeg = 0) {
  const nivel = NIVELES[config.nivel] || NIVELES.intermedio;
  const mujer = perfil?.sexo === 'm';
  const m = config.marcas || {};
  const t5k = m.t5k || nivel.t5k * (mujer ? 1.12 : 1);
  const r5k = t5k / 5 + ajusteSeg;
  const ski = (m.ski1000 || SKI[config.nivel] * (mujer ? 1.12 : 1)) / 2;
  const row = (m.row1000 || ROW[config.nivel] * (mujer ? 1.12 : 1)) / 2;
  return {
    t5k,
    r5k,
    z2: r5k * 1.3,
    umbral: r5k * 1.07,
    intervalo: r5k * 0.99,
    cortas: r5k * 0.94,
    hyrox: r5k * nivel.carrera,
    ski500: ski,
    row500: row,
    estimado: !m.t5k,
  };
}
