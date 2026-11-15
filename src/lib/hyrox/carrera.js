// Estimación de tiempo, estrategia de carrera y nutrición del día de carrera y de la semana previa.
import { ESTACIONES, TIEMPOS_BASE, NIVELES } from '../../data/hyrox.js';
import { ritmos, mmss } from './ritmos.js';
import { estacionesDeTests } from './tests.js';
import { aMin, aHora } from '../horario.js';

const PRO = 1.15; // las estaciones con pesos Pro cuestan más
// En parejas solo trabaja uno a la vez: cada estación lleva ~82 % del tiempo de hacerla solo y, como descansas en
// ellas, los km salen ~10 % más rápidos. Calibrado con una HYROX Doubles real (11-nov-2026: 40:15 corriendo y 27:05
// de estaciones con un 5 km de 24:00); antes se suponía un 60 % y salían estaciones de 20 min y km de 5:30
const DOUBLES = 0.82;
const DOUBLES_KM = 0.9;
const factores = (cat) => ({ km: cat === 'doubles' ? DOUBLES_KM : 1, est: cat === 'pro' ? PRO : cat === 'doubles' ? DOUBLES : 1 });

/** Pasa tiempos por tramo ({ km: [8], estaciones: { id: seg }, roxzone }) de una categoría a otra. */
export function convertirTiempos(t, de, a) {
  if (de === a) return { km: [...t.km], estaciones: { ...t.estaciones }, roxzone: t.roxzone };
  const f = factores(de);
  const g = factores(a);
  return {
    km: t.km.map((s) => (s * g.km) / f.km),
    estaciones: Object.fromEntries(Object.entries(t.estaciones).map(([id, s]) => [id, (s * g.est) / f.est])),
    roxzone: t.roxzone,
  };
}

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
export function estimarCarrera(config, perfil, registros = {}, tests = []) {
  const nivel = NIVELES[config.nivel] || NIVELES.intermedio;
  const rit = ritmos(config, perfil);
  // Tu última HYROX (Configurar), pasada a la categoría de la próxima. Con ella, solo cuentan los simulacros y
  // tests de después: lo de antes ya lo dice la carrera
  const ult = config.ultimaCarrera?.km?.length === 8 ? config.ultimaCarrera : null;
  const real = ult && convertirTiempos(ult, ult.categoria, config.categoria);
  const despues = (f) => !ult || (!!f && f > ult.fecha);
  const regs = Object.fromEntries(Object.entries(registros).filter(([, r]) => despues(r.fecha)));
  // Tus tiempos por estación: el último test manda; si no, tu mejor tiempo en simulacros
  const mejores = { ...mejoresEstaciones(regs), ...estacionesDeTests(tests.filter((t) => despues(t.fecha))) };
  const mujer = perfil?.sexo === 'm';
  const f = factores(config.categoria);
  // Si has mejorado tu 5 km desde esa carrera, sus km bajan en la misma proporción
  const k5 = ult?.t5k && config.marcas?.t5k ? config.marcas.t5k / ult.t5k : 1;
  // Sin carrera real, las carreras se van ralentizando con la fatiga
  const fatiga = [0.96, 0.98, 1, 1.01, 1.02, 1.03, 1.04, 1.04];
  const tramos = [];
  ESTACIONES.forEach((e, i) => {
    const run = real ? real.km[i] * k5 : rit.hyrox * f.km * fatiga[i];
    let est = mejores[e.id] || real?.estaciones[e.id] || TIEMPOS_BASE[e.id] * nivel.k * (mujer ? 1.05 : 1) * f.est;
    if (!mejores[e.id] && !real && e.id === 'ski' && config.marcas?.ski1000) est = config.marcas.ski1000 * 1.04;
    if (!mejores[e.id] && !real && e.id === 'row' && config.marcas?.row1000) est = config.marcas.row1000 * 1.05;
    tramos.push({ tipo: 'run', n: i + 1, nombre: `Carrera ${i + 1}`, seg: run });
    tramos.push({ tipo: 'estacion', id: e.id, n: i + 1, nombre: e.nombre, emoji: e.emoji, seg: est, real: !!mejores[e.id] });
  });
  return resumir(tramos, real ? real.roxzone / 8 : nivel.roxzone, { basadoEnMarcas: !!real || !rit.estimado || Object.keys(mejores).length > 0, ultima: ult });
}

function resumir(tramos, rox, extra = {}) {
  let acumulado = 0;
  for (const t of tramos) { acumulado += t.seg + (t.tipo === 'estacion' ? rox : 0); t.acumulado = acumulado; }
  const carreras = tramos.filter((t) => t.tipo === 'run').reduce((s, t) => s + t.seg, 0);
  const estaciones = tramos.filter((t) => t.tipo === 'estacion').reduce((s, t) => s + t.seg, 0);
  return { tramos, carreras, estaciones, roxzone: rox * 8, total: carreras + estaciones + rox * 8, ritmoCarrera: carreras / 8, ...extra };
}

/** Tu objetivo por tramos (Configurar), pasado a la categoría de tu próxima carrera; null si no tienes. */
export function objetivoCarrera(config) {
  const o = config.objetivo;
  if (!(o?.km?.length === 8)) return null;
  const t = convertirTiempos(o, o.categoria, config.categoria);
  const tramos = [];
  ESTACIONES.forEach((e, i) => {
    tramos.push({ tipo: 'run', n: i + 1, nombre: `Carrera ${i + 1}`, seg: t.km[i] });
    tramos.push({ tipo: 'estacion', id: e.id, n: i + 1, nombre: e.nombre, emoji: e.emoji, seg: t.estaciones[e.id] });
  });
  return resumir(tramos, t.roxzone / 8);
}

/** Un objetivo nuevo de `total` segundos: el que ya tenías escalado o, si no tenías, tu estimación escalada. */
export function nuevoObjetivo(config, est, total) {
  const previo = objetivoCarrera(config);
  const base = previo ? config.objetivo : { categoria: config.categoria, km: est.tramos.filter((t) => t.tipo === 'run').map((t) => t.seg), estaciones: Object.fromEntries(est.tramos.filter((t) => t.tipo === 'estacion').map((t) => [t.id, t.seg])), roxzone: est.roxzone };
  const k = total / (previo || est).total;
  return { categoria: base.categoria, km: base.km.map((s) => Math.round(s * k)), estaciones: Object.fromEntries(Object.entries(base.estaciones).map(([id, s]) => [id, Math.round(s * k)])), roxzone: Math.round(base.roxzone * k) };
}

/**
 * Dónde ganas más tiempo: cada estación, las carreras y la roxzone frente al nivel siguiente
 * (o un 10 % mejor si ya eres avanzado). Devuelve los tramos con más margen, de más a menos.
 */
export function oportunidades(config, perfil, est, obj = null) {
  // Con objetivo (Configurar), cada tramo frente a tu objetivo
  if (obj) {
    const lista = est.tramos.filter((t) => t.tipo === 'estacion').map((t) => {
      const objetivo = obj.tramos.find((x) => x.id === t.id).seg;
      return { id: t.id, nombre: t.nombre, emoji: t.emoji, seg: t.seg, objetivo, gana: Math.max(0, t.seg - objetivo), real: t.real };
    });
    lista.push({ id: 'carrera', nombre: 'Los 8 km corriendo', emoji: '🏃', seg: est.carreras, objetivo: obj.carreras, gana: Math.max(0, est.carreras - obj.carreras) });
    lista.push({ id: 'roxzone', nombre: 'Transiciones (roxzone)', emoji: '🔁', seg: est.roxzone, objetivo: obj.roxzone, gana: Math.max(0, est.roxzone - obj.roxzone) });
    return { nivelRef: 'tu objetivo', lista: lista.filter((x) => x.gana >= 5).sort((a, b) => b.gana - a.gana) };
  }
  const orden = ['principiante', 'intermedio', 'avanzado'];
  const nivel = NIVELES[config.nivel] || NIVELES.intermedio;
  const sig = NIVELES[orden[orden.indexOf(config.nivel) + 1]] || null;
  const ref = sig || { k: nivel.k * 0.9, carrera: nivel.carrera * 0.95, roxzone: nivel.roxzone * 0.8 };
  const mujer = perfil?.sexo === 'm';
  const kCat = config.categoria === 'pro' ? PRO : config.categoria === 'doubles' ? DOUBLES : 1;
  const lista = est.tramos.filter((t) => t.tipo === 'estacion').map((t) => {
    const objetivo = TIEMPOS_BASE[t.id] * ref.k * (mujer ? 1.05 : 1) * kCat;
    return { id: t.id, nombre: t.nombre, emoji: t.emoji, seg: t.seg, objetivo, gana: Math.max(0, t.seg - objetivo), real: t.real };
  });
  const carreraObj = est.carreras * (ref.carrera / nivel.carrera);
  lista.push({ id: 'carrera', nombre: 'Los 8 km corriendo', emoji: '🏃', seg: est.carreras, objetivo: carreraObj, gana: Math.max(0, est.carreras - carreraObj) });
  lista.push({ id: 'roxzone', nombre: 'Transiciones (roxzone)', emoji: '🔁', seg: est.roxzone, objetivo: ref.roxzone * 8, gana: Math.max(0, est.roxzone - ref.roxzone * 8) });
  return { nivelRef: sig ? sig.nombre : 'un 10 % mejor', lista: lista.filter((x) => x.gana >= 5).sort((a, b) => b.gana - a.gana) };
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
    { min: -180, emoji: '🍞', titulo: 'Desayuno de carrera', texto: `${g(2)} g de hidratos, poca grasa, poca fibra y sin lácteo: pan blanco o tostado con miel o confitura, plátano y zumo. Lo que ya hayas probado en los simulacros.` },
    { min: -90, emoji: '💧', titulo: 'Bebe', texto: '400-500 ml de agua o bebida isotónica a sorbos.' },
    { min: -60, emoji: '🍌', titulo: 'Tentempié', texto: 'Medio plátano, un gel o 2 tortitas de arroz con miel (20-30 g de hidratos).' },
  ];
  if (!salud.sinCafeina) items.push({ min: -50, emoji: '☕', titulo: 'Cafeína', texto: `${cafeina} mg (≈3 mg/kg): café solo o una cápsula. Solo si ya la has probado entrenando.` });
  items.push({ min: -20, emoji: '🔥', titulo: 'Calentamiento', texto: '15 min de trote suave, movilidad y 2 progresiones. Sorbos de agua.' });
  if (duracionMin > 75) items.push({ min: 45, emoji: '🧃', titulo: 'Durante la carrera', texto: 'Tras la estación 4 (burpees), un gel (25 g) con agua en el roxzone. Sorbos de agua o isotónica cuando la veas.' });
  else items.push({ min: 30, emoji: '🧃', titulo: 'Durante la carrera', texto: 'Con menos de 75 min no necesitas comer: sorbos de agua en el roxzone si te apetece.' });
  items.push({ min: duracionMin + 30, emoji: '🥤', titulo: 'Recuperación', texto: `En la primera hora: ${g(1)} g de hidratos y ${g(0.3)} g de proteína (bocadillo de pavo con zumo o un plátano). Bebe 1,5 veces el peso perdido.` });
  return items.map((x) => ({ ...x, hora: aHora(salida + x.min) })).sort((a, b) => a.min - b.min);
}

export function semanaCarrera(perfil) {
  const peso = perfil?.peso || 75;
  return [
    { dia: 'De -6 a -3 días', emoji: '🥗', texto: 'Comes normal según tu menú. El entreno baja, así que no hace falta comer menos. Duerme todo lo que puedas.' },
    { dia: 'Días -2 y -1', emoji: '🍝', texto: `Carga de hidratos: unos ${Math.round(peso * 6)}-${Math.round(peso * 7)} g al día (6-7 g/kg). Más arroz, pasta, pan, patata y fruta; menos grasa, verdura fibrosa y lácteo para no ir pesado, y la proteína justa. Tu menú ya lo tiene en cuenta.` },
    { dia: 'Víspera', emoji: '🌙', texto: 'Cena temprana y conocida: arroz o pasta con pollo o pescado, y nada de lácteo antes de dormir. Nada de comidas nuevas, picante ni alcohol. Deja preparado el desayuno y la ropa.' },
    { dia: 'Toda la semana', emoji: '💧', texto: 'Bebe agua con regularidad y algo de sal en las comidas los dos últimos días. Orina clara = bien hidratado.' },
  ];
}
