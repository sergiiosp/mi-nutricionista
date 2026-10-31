// Revisión del mes: cada 4 semanas, en 10 minutos y en un solo sitio: báscula, fotos y un test.
// Cada paso se guarda al momento (si cierras a medias, sigues donde lo dejaste) y al final ves qué ha
// cambiado desde la revisión anterior.
import { sumarDias } from './planificador.js';

export const CADA = 28;
const diasEntre = (a, b) => Math.round((new Date(`${b}T12:00`) - new Date(`${a}T12:00`)) / 86400000);
const ordenar = (l) => [...(l || [])].sort((a, b) => a.fecha.localeCompare(b.fecha));

/** Si toca la revisión, la que está a medias y cuándo es la próxima. */
export function estadoRevision(e, hoy) {
  const ultima = (e.revisiones || []).at(-1)?.fecha || null;
  // La primera, a las 2 semanas de empezar (con un primer pesaje como referencia)
  const base = ultima || ordenar(e.pesos)[0]?.fecha || null;
  const dias = base ? diasEntre(base, hoy) : null;
  const enCurso = e.revision?.inicio || null;
  const pospuesta = e.revisionPospuesta && sumarDias(e.revisionPospuesta, 3) > hoy;
  const toca = !!enCurso || (dias != null && dias >= (ultima ? CADA : 14));
  return { toca, aviso: toca && !pospuesta, enCurso, ultima, proxima: base ? sumarDias(base, ultima ? CADA : 14) : null, dias };
}

/** Los tres pasos y si ya están hechos en esta revisión (lo apuntado desde que empezó; un test de la última semana vale). */
export function pasosRevision(e, inicio) {
  const poses = new Set((e.fotosProgreso || []).filter((f) => f.fecha >= inicio).map((f) => f.pose || 'frente'));
  return [
    { id: 'bascula', titulo: 'Báscula', icono: 'scale', texto: 'Peso, grasa, músculo y agua', hecho: (e.pesos || []).some((p) => p.fecha >= inicio) },
    { id: 'fotos', titulo: 'Fotos', icono: 'camera', texto: 'De frente, de lado y de espaldas', hecho: poses.size >= 3, poses: [...poses] },
    { id: 'test', titulo: 'Test', icono: 'timer', texto: 'Un 5 km a tope, o SkiErg o remo', hecho: (e.tests || []).some((t) => t.fecha >= sumarDias(inicio, -7)), opcional: true },
  ];
}

/** El valor de un campo en una fecha (el último registro hasta esa fecha) y el último de todos. */
function antesYAhora(lista, k, hasta) {
  const con = ordenar(lista).filter((x) => x[k] != null && x[k] !== '');
  const ahora = con.at(-1);
  const antes = [...con].reverse().find((x) => x.fecha <= hasta && x !== ahora);
  return ahora && antes ? { antes: antes[k], ahora: ahora[k], desde: antes.fecha } : ahora ? { antes: null, ahora: ahora[k] } : null;
}

/**
 * Qué ha cambiado desde la revisión anterior (o desde hace 4 semanas, en la primera). Cada fila: valor de
 * antes y de ahora, la diferencia y si va en la buena dirección para tu objetivo.
 */
export function resumenRevision(e, inicio) {
  const previa = [...(e.revisiones || [])].reverse().find((r) => r.fecha < inicio)?.fecha || sumarDias(inicio, -CADA);
  const objetivo = e.perfil?.objetivo;
  const filas = [];
  const fila = (id, nombre, unidad, dec, x, bueno) => {
    if (!x) return;
    const dif = x.antes != null ? Math.round((x.ahora - x.antes) * 10 ** dec) / 10 ** dec : null;
    filas.push({ id, nombre, unidad, dec, antes: x.antes, ahora: x.ahora, dif, bien: dif == null || dif === 0 ? null : bueno(dif) });
  };
  fila('peso', 'Peso', 'kg', 1, antesYAhora(e.pesos, 'peso', previa), (d) => (objetivo === 'perder' ? d < 0 : objetivo === 'ganar' ? d > 0 : Math.abs(d) <= 1 ? true : null));
  fila('grasa', 'Grasa', '%', 1, antesYAhora(e.pesos, 'grasa', previa), (d) => d < 0);
  fila('musculo', 'Músculo', 'kg', 1, antesYAhora(e.pesos, 'musculo', previa), (d) => d > 0);
  const t5k = antesYAhora((e.tests || []).filter((t) => t.id === '5k'), 'seg', previa);
  fila('5k', '5 km', 'seg', 0, t5k, (d) => d < 0);
  const buenas = filas.filter((f) => f.bien === true).length, malas = filas.filter((f) => f.bien === false).length;
  const titular = !filas.some((f) => f.dif != null) ? 'Primera revisión: esta es tu foto de partida. En 4 semanas verás qué ha cambiado.'
    : buenas >= malas * 2 && buenas ? 'Mes bueno: casi todo se mueve hacia tu objetivo.'
      : buenas >= malas ? 'Mes correcto: avanzas, con algún punto que vigilar.'
        : 'Mes flojo en números: mira qué ha fallado y ajustamos sin dramas.';
  return { desde: previa, filas, titular, buenas, malas };
}
