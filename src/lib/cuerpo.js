// Composición corporal de la báscula (bioimpedancia): grasa (%), músculo (kg) y agua (%) en cada pesaje.
// Estas básculas varían 1-2 puntos de un día a otro según lo hidratado que estés, así que para
// ajustar el plan se usan medias y tendencias, nunca una medición suelta.
import { sumarDias } from './planificador.js';

const ordenar = (l) => [...l].sort((a, b) => a.fecha.localeCompare(b.fecha));
const media = (l) => l.reduce((s, x) => s + x, 0) / l.length;
const diasEntre = (a, b) => Math.round((new Date(`${b}T12:00`) - new Date(`${a}T12:00`)) / 86400000);

// Datos de la báscula, en el orden de FitDays (lo que se puede calcular no se pide: IMC, masa grasa,
// peso sin grasa, agua y proteína en kg y % de músculo)
export const CAMPOS = [
  { k: 'grasa', n: 'Grasa corporal', u: '%', r: [3, 60] },
  { k: 'perdidaGrasa', n: 'Pérdida de grasa', u: 'kg', r: [0, 150] },
  { k: 'musculo', n: 'Masa muscular', u: 'kg', r: [15, 120] },
  { k: 'esqueletico', n: 'Músculo esquelético', u: '%', r: [20, 70] },
  { k: 'hueso', n: 'Masa esquelética', u: 'kg', r: [1, 8] },
  { k: 'proteina', n: 'Proteína', u: '%', r: [5, 30] },
  { k: 'agua', n: 'Agua corporal', u: '%', r: [30, 75] },
  { k: 'subcutanea', n: 'Grasa subcutánea', u: '%', r: [2, 60] },
  { k: 'visceral', n: 'Grasa visceral', u: 'nivel', r: [1, 30], paso: 1 },
  { k: 'bmr', n: 'BMR', u: 'kcal', r: [800, 4000], paso: 1 },
  { k: 'edad', n: 'Edad corporal', u: 'años', r: [10, 100], paso: 1 },
];
export const RANGOS = Object.fromEntries(CAMPOS.map((c) => [c.k, c.r]));

/** % de grasa para los cálculos: media de las 3 últimas mediciones de las últimas 4 semanas. */
export function grasaReferencia(pesos, hoy) {
  const r = ordenar(pesos).filter((p) => p.grasa && p.fecha >= sumarDias(hoy, -28) && p.fecha <= hoy).slice(-3);
  return r.length ? Math.round(media(r.map((p) => p.grasa)) * 10) / 10 : null;
}

const grasaKg = (p) => (p.grasa ? (p.peso * p.grasa) / 100 : null);

/** Lo último medido, con lo que se calcula: masa grasa, peso sin grasa, agua y proteína en kg, % de músculo e IMC. */
export function ultimaComposicion(pesos, altura = null) {
  const p = ordenar(pesos).filter((x) => CAMPOS.some((c) => x[c.k] != null)).at(-1);
  if (!p) return null;
  const kg = (pct) => (pct ? (p.peso * pct) / 100 : null);
  return {
    ...p,
    grasaKg: grasaKg(p),
    magraKg: p.grasa ? p.peso - grasaKg(p) : null,
    aguaKg: kg(p.agua),
    proteinaKg: kg(p.proteina),
    tasaMuscular: p.musculo ? (p.musculo / p.peso) * 100 : null,
    imc: altura ? p.peso / (altura / 100) ** 2 : null,
  };
}

/** Grasa visceral (escala de las básculas, 1-30): hasta 9 bien, 10-14 alta, 15 o más muy alta. */
export function avisoVisceral(nivel) {
  if (!nivel || nivel < 10) return null;
  return nivel >= 15
    ? { alto: true, texto: `Grasa visceral muy alta (${nivel}): es la que rodea los órganos y la más ligada a riesgo cardiovascular. Coméntalo con tu médico; déficit suave, caminar a diario y menos alcohol la bajan rápido.` }
    : { alto: false, texto: `Grasa visceral algo alta (${nivel}; lo sano es menos de 10). Es la primera que se va con déficit suave, pasos diarios y entreno: vigílala cada mes.` };
}

/**
 * Cambio de grasa y músculo (kg) entre la media de las 2 primeras y las 2 últimas mediciones
 * (de las últimas 8 semanas). Necesita al menos 10 días para decir algo.
 */
export function cambioCuerpo(pesos) {
  const con = ordenar(pesos).filter((p) => p.grasa || p.musculo);
  if (con.length < 3) return null;
  const ini = con.filter((p) => p.fecha >= sumarDias(con.at(-1).fecha, -56)).slice(0, 2);
  const fin = con.slice(-2);
  const dias = diasEntre(ini[0].fecha, fin.at(-1).fecha);
  if (dias < 10) return null;
  const dif = (f) => {
    const a = ini.map(f).filter((x) => x != null);
    const b = fin.map(f).filter((x) => x != null);
    return a.length && b.length ? Math.round((media(b) - media(a)) * 10) / 10 : null;
  };
  return { dias, desde: ini[0].fecha, grasaKg: dif(grasaKg), musculo: dif((p) => p.musculo || null), esqueletico: dif((p) => p.esqueletico || null), visceral: dif((p) => p.visceral || null), peso: dif((p) => p.peso) };
}

/** Qué dice ese cambio de tu objetivo (sobre todo en recomposición, donde el peso engaña). */
export function veredicto(c, objetivo) {
  if (!c || c.grasaKg == null) return null;
  const g = c.grasaKg;
  const m = c.musculo;
  if (objetivo === 'ganar') {
    if (m != null && m > 0.2 && g <= m) return { bien: true, texto: 'Ganas músculo sin acumular apenas grasa.' };
    if (g > 0.6 && (m == null || m < g / 2)) return { bien: false, texto: 'Sube más grasa que músculo: conviene bajar un poco las kcal.' };
    return { bien: true, texto: 'Vas ganando de forma controlada.' };
  }
  if (g <= -0.3 && (m == null || m >= -0.2)) return { bien: true, texto: objetivo === 'recomposicion' ? 'Recomposición funcionando: baja la grasa y el músculo se mantiene o sube.' : 'Pierdes grasa conservando el músculo.' };
  if (m != null && m < -0.5) return { bien: false, texto: 'Estás perdiendo músculo: revisa la proteína y no recortes más kcal.' };
  if (g > 0.4) return { bien: false, texto: 'La grasa sube: revisa el picoteo y las comidas fuera.' };
  return { bien: true, texto: 'Composición estable: dale unas semanas más para ver la tendencia.' };
}

/** Si el agua de hoy se aparta de tu media, el peso de hoy engaña (retención o deshidratación). */
export function avisoAgua(pesos) {
  const con = ordenar(pesos).filter((p) => p.agua);
  if (con.length < 3) return null;
  const ultima = con.at(-1);
  const ref = media(con.slice(-6, -1).map((p) => p.agua));
  const d = ultima.agua - ref;
  if (d <= -1.5) return 'Hoy tienes menos agua de lo normal: la báscula puede marcar más grasa de la real (y algo menos de peso). Bebe y mira la tendencia, no el día.';
  if (d >= 1.5) return 'Hoy tienes más agua de lo normal (retención, sal, entreno fuerte…): el peso puede salir algo más alto sin que sea grasa.';
  return null;
}
