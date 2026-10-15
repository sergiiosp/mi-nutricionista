// Estimación de tiempo, estrategia de carrera y nutrición del día de carrera y de la semana previa.
import { ESTACIONES, TIEMPOS_BASE, NIVELES } from '../../data/hyrox.js';
import { ritmos, mmss } from './ritmos.js';
import { aMin, aHora } from '../horario.js';

const PRO = 1.15; // las estaciones con pesos Pro cuestan más
const DOUBLES = 0.6; // en parejas cada uno hace aprox. la mitad del trabajo de estación

/** Mejores tiempos por estación registrados en simulacros (segundos). */
export function mejoresEstaciones(registros = {}) {
  const mejor = {};
  for (const r of Object.values(registros)) {
    for (const [id, t] of Object.entries(r.estaciones || {})) if (t > 0 && (!mejor[id] || t < mejor[id])) mejor[id] = t;
  }
  return mejor;
}

/**
 * Tiempo estimado por tramo (8 carreras + 8 estaciones + roxzone).
 * Usa tus marcas registradas cuando existen; si no, referencias por nivel.
 */
export function estimarCarrera(config, perfil, registros = {}) {
  const nivel = NIVELES[config.nivel] || NIVELES.intermedio;
  const rit = ritmos(config, perfil);
  const mejores = mejoresEstaciones(registros);
  const mujer = perfil?.sexo === 'm';
  const kCat = config.categoria === 'pro' ? PRO : config.categoria === 'doubles' ? DOUBLES : 1;
  // Las carreras se van ralentizando con la fatiga
  const fatiga = [0.96, 0.98, 1, 1.01, 1.02, 1.03, 1.04, 1.04];
  const tramos = [];
  ESTACIONES.forEach((e, i) => {
    const run = rit.hyrox * fatiga[i];
    let est = mejores[e.id] || TIEMPOS_BASE[e.id] * nivel.k * (mujer ? 1.05 : 1) * kCat;
    if (!mejores[e.id] && e.id === 'ski' && config.marcas?.ski1000) est = config.marcas.ski1000 * 1.04;
    if (!mejores[e.id] && e.id === 'row' && config.marcas?.row1000) est = config.marcas.row1000 * 1.05;
    tramos.push({ tipo: 'run', n: i + 1, nombre: `Carrera ${i + 1}`, seg: run });
    tramos.push({ tipo: 'estacion', id: e.id, n: i + 1, nombre: e.nombre, emoji: e.emoji, seg: est, real: !!mejores[e.id] });
  });
  const roxzone = nivel.roxzone * 8;
  let acumulado = 0;
  for (const t of tramos) { acumulado += t.seg + (t.tipo === 'estacion' ? nivel.roxzone : 0); t.acumulado = acumulado; }
  const carreras = tramos.filter((t) => t.tipo === 'run').reduce((s, t) => s + t.seg, 0);
  const estaciones = tramos.filter((t) => t.tipo === 'estacion').reduce((s, t) => s + t.seg, 0);
  return { tramos, carreras, estaciones, roxzone, total: carreras + estaciones + roxzone, ritmoCarrera: rit.hyrox, basadoEnMarcas: !rit.estimado || Object.keys(mejores).length > 0 };
}

const BLOQUES_WB = { principiante: '10 bloques de 10 con 3-4 respiraciones de pausa', intermedio: '25-20-20-20-15 con pausas de 5 respiraciones', avanzado: '34-33-33 o del tirón si vas fresco' };

export function estrategia(config, est) {
  const consejos = {
    ski: 'Ritmo cómodo y constante. No te emociones: es la primera estación.',
    push: 'Pasos cortos sin parar. Si necesitas pausa, al final del largo.',
    pull: 'Tirones largos usando el peso del cuerpo y caminando hacia atrás. Controla la respiración.',
    bbj: 'Burpee-salto-respira. Saltos medios y ritmo fijo hasta el final.',
    row: 'Empieza 2-3 s/500 m más lento y aprieta los últimos 250 m.',
    farmers: 'Paso ligero, casi trotando. Si tu agarre aguanta, sin soltar.',
    lunges: 'Lento pero sin parar. Respira en cada zancada.',
    wallballs: `Divide desde el principio: ${BLOQUES_WB[config.nivel] || BLOQUES_WB.intermedio}.`,
  };
  return {
    general: [
      `Corre los km a ${mmss(est.ritmoCarrera)}/km. El primero, algo más controlado: la adrenalina engaña.`,
      'Entra y sal del roxzone andando rápido, sin pararte, y aprovecha para beber.',
      'Las estaciones de piernas (sled push, lunges) cargan los km siguientes: sal de ellas trotando suave 100 m.',
      'Del km 6 al 8 es donde se gana o se pierde tiempo: guarda algo para el final.',
    ],
    estaciones: consejos,
  };
}

/** Plan de comidas del día de carrera según la hora de salida. */
export function nutricionDiaCarrera(perfil, horaSalida = '10:00', duracionMin = 90, salud = {}) {
  const peso = perfil?.peso || 75;
  const salida = aMin(horaSalida);
  const g = (x) => Math.round((x * peso) / 5) * 5;
  const cafeina = Math.min(300, Math.round((3 * peso) / 25) * 25);
  const items = [
    { min: -210, emoji: '🍞', titulo: 'Desayuno de carrera', texto: `${g(2)} g de hidratos, poca grasa y poca fibra: pan blanco o tostado con miel o confitura, plátano y un yogur o vaso de leche. Lo que ya hayas probado en los simulacros.` },
    { min: -90, emoji: '💧', titulo: 'Bebe', texto: '400-500 ml de agua o bebida isotónica a sorbos.' },
    { min: -60, emoji: '🍌', titulo: 'Tentempié', texto: 'Medio plátano, una barrita o 3-4 dátiles (20-30 g de hidratos).' },
  ];
  if (!salud.sinCafeina) items.push({ min: -50, emoji: '☕', titulo: 'Cafeína', texto: `${cafeina} mg (≈3 mg/kg): café solo o una cápsula. Solo si ya la has probado entrenando.` });
  items.push({ min: -20, emoji: '🔥', titulo: 'Calentamiento', texto: '15 min de trote suave, movilidad y 2 progresiones. Sorbos de agua.' });
  if (duracionMin > 75) items.push({ min: 45, emoji: '🧃', titulo: 'Durante la carrera', texto: 'Tras la estación 4 (burpees), un gel (25 g) con agua en el roxzone. Sorbos de agua o isotónica cuando la veas.' });
  else items.push({ min: 30, emoji: '🧃', titulo: 'Durante la carrera', texto: 'Con menos de 75 min no necesitas comer: sorbos de agua en el roxzone si te apetece.' });
  items.push({ min: duracionMin + 30, emoji: '🥤', titulo: 'Recuperación', texto: `En la primera hora: ${g(1)} g de hidratos y ${g(0.3)} g de proteína (batido de leche con plátano y cacao, o bocadillo de pavo y fruta). Bebe 1,5 veces el peso perdido.` });
  return items.map((x) => ({ ...x, hora: aHora(salida + x.min) })).sort((a, b) => a.min - b.min);
}

export function semanaCarrera(perfil) {
  const peso = perfil?.peso || 75;
  return [
    { dia: 'De -6 a -3 días', emoji: '🥗', texto: 'Comes normal según tu menú. El entreno baja, así que no hace falta comer menos. Duerme todo lo que puedas.' },
    { dia: 'Días -2 y -1', emoji: '🍝', texto: `Carga de hidratos: unos ${Math.round(peso * 6)}-${Math.round(peso * 7)} g al día (6-7 g/kg). Más arroz, pasta, pan, patata y fruta; menos grasa y verdura fibrosa para no ir pesado. Tu menú ya lo tiene en cuenta.` },
    { dia: 'Víspera', emoji: '🌙', texto: 'Cena temprana y conocida: arroz o pasta con pollo o pescado. Nada de comidas nuevas, picante ni alcohol. Deja preparado el desayuno y la ropa.' },
    { dia: 'Toda la semana', emoji: '💧', texto: 'Bebe agua con regularidad y algo de sal en las comidas los dos últimos días. Orina clara = bien hidratado.' },
  ];
}
