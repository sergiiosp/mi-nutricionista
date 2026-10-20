// Horario de comidas: coloca cada comida según tu día (despertar, trabajo, entreno, dormir)
// y reparte los macros, con más hidratos antes y después de entrenar.

// Reparto base del día según el número de comidas (fracción de cada macro).
// Cena ligera y, antes de dormir, un lácteo rico en caseína (proteína de absorción lenta para la noche):
// por eso la «recena» lleva mucha proteína y poco de lo demás (pM).
const RECENA = { id: 'recena', nombre: 'Antes de dormir', tipo: 'recena', pct: 0.06, pM: { p: 0.15, c: 0.03, g: 0.03 } };
export const REPARTOS = {
  3: [
    { id: 'desayuno', nombre: 'Desayuno', tipo: 'desayuno', pct: 0.27 },
    { id: 'comida', nombre: 'Comida', tipo: 'comida', pct: 0.42 },
    { id: 'cena', nombre: 'Cena', tipo: 'cena', pct: 0.25 },
    RECENA,
  ],
  4: [
    { id: 'desayuno', nombre: 'Desayuno', tipo: 'desayuno', pct: 0.23 },
    { id: 'comida', nombre: 'Comida', tipo: 'comida', pct: 0.38 },
    { id: 'merienda', nombre: 'Merienda', tipo: 'snack', pct: 0.14 },
    { id: 'cena', nombre: 'Cena', tipo: 'cena', pct: 0.19 },
    RECENA,
  ],
  5: [
    { id: 'desayuno', nombre: 'Desayuno', tipo: 'desayuno', pct: 0.2 },
    { id: 'media', nombre: 'Media mañana', tipo: 'snack', pct: 0.1 },
    { id: 'comida', nombre: 'Comida', tipo: 'comida', pct: 0.34 },
    { id: 'merienda', nombre: 'Merienda', tipo: 'snack', pct: 0.12 },
    { id: 'cena', nombre: 'Cena', tipo: 'cena', pct: 0.18 },
    RECENA,
  ],
};

/** ¿Lleva el día un lácteo antes de dormir? (se puede quitar en el perfil; sin lactosa o vegano, no) */
export const conRecena = (perfil) => perfil?.recena !== false && !(perfil?.alergias || []).includes('lactosa') && perfil?.dieta !== 'vegana';

export const aMin = (hhmm) => {
  const [h, m] = String(hhmm || '00:00').split(':').map(Number);
  return h * 60 + (m || 0);
};
export const aHora = (min) => {
  const m = ((Math.round(min / 15) * 15) % 1440 + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};

export function esDiaEntreno(perfil, fechaISO) {
  if (!perfil.entrena || !perfil.diasEntreno?.length) return false;
  const [y, m, d] = fechaISO.split('-').map(Number);
  return perfil.diasEntreno.includes(new Date(y, m - 1, d).getDay());
}

const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

/**
 * Franjas del día con hora, etiqueta (pre/post entreno) y reparto de macros.
 * @returns {{ franjas: Array, entreno: {inicio, fin}|null, consejos: string[] }}
 */
/** @param sesionDia opcional { hora, duracion } de la sesión concreta del día (plan HYROX) */
export function horarioDia(perfil, entreno, sesionDia = null) {
  let base = (REPARTOS[perfil.comidas] || REPARTOS[4]).map((f) => ({ ...f, pctM: { ...(f.pM || { p: f.pct, c: f.pct, g: f.pct }) } }));
  // Sin lácteo antes de dormir: su parte vuelve a la cena
  if (!conRecena(perfil)) {
    const r = base.find((f) => f.id === 'recena');
    const cena = base.find((f) => f.id === 'cena');
    for (const k of ['p', 'c', 'g']) cena.pctM[k] += r.pctM[k];
    cena.pct += r.pct;
    base = base.filter((f) => f !== r);
  }
  const consejos = [];

  // Perfiles antiguos sin horario: horas españolas típicas
  const despertar = aMin(perfil.despertar || '07:30');
  let dormir = aMin(perfil.dormir || '23:30');
  if (dormir <= despertar) dormir += 1440;
  const trabaja = perfil.trabajo && perfil.trabajo !== 'no' && perfil.trabajoInicio && perfil.trabajoFin;
  const tIni = trabaja ? aMin(perfil.trabajoInicio) : null;
  const tFin = trabaja ? aMin(perfil.trabajoFin) : null;

  const horas = {};
  horas.desayuno = despertar + 30;
  // Comida a la española (14:00), o al salir si tu jornada termina a mediodía
  horas.comida = trabaja && tFin >= 12 * 60 + 30 && tFin <= 16 * 60 ? tFin + 30 : 14 * 60;
  horas.comida = clamp(horas.comida, horas.desayuno + 4 * 60, horas.desayuno + 8 * 60);
  // Cena al menos 2 h y media antes de dormir y 4 h después de comer
  horas.cena = clamp(Math.min(21 * 60 + 15, dormir - 150), horas.comida + 4 * 60, dormir - 90);
  horas.media = (horas.desayuno + horas.comida) / 2;
  horas.merienda = (horas.comida + horas.cena) / 2;
  horas.recena = Math.max(horas.cena + 90, dormir - 45);

  const franjas = base.map((f) => ({ ...f, hora: horas[f.id], etiqueta: null }));
  let sesion = null;

  const horaSesion = sesionDia?.hora || perfil.horaEntreno;
  if (entreno && horaSesion) {
    let ini = aMin(horaSesion);
    if (ini < despertar - 60) ini += 1440;
    const fin = ini + (sesionDia?.duracion || perfil.duracionEntreno || 60);
    sesion = { inicio: ini, fin };
    const snacks = franjas.filter((f) => f.tipo === 'snack');

    // Ninguna comida durante el entreno ni justo antes (menos de 45 min)
    for (const f of franjas) {
      if (f.hora > ini - 45 && f.hora < fin + 15) f.hora = f.hora < ini ? ini - 90 : fin + 30;
    }

    // Pre-entreno: la última comida entre 3 h y 1 h antes
    let pre = [...franjas].reverse().find((f) => f.hora <= ini - 60 && f.hora >= ini - 180);
    if (!pre) {
      const snack = snacks.find((s) => Math.abs(s.hora - (ini - 75)) < 4 * 60);
      if (snack) { snack.hora = ini - 75; pre = snack; }
    }
    if (pre) pre.etiqueta = 'pre';
    else if (ini - despertar < 90) consejos.push('Entrenas nada más levantarte: si te encuentras bien, puedes hacerlo en ayunas; si no, toma medio plátano o un café antes.');
    else consejos.push('Llegas al entreno con más de 3 h sin comer: toma una pieza de fruta 30-45 min antes.');

    // Post-entreno: la primera comida en las 3 h siguientes
    let post = franjas.filter((f) => f !== pre && f.hora >= fin).sort((a, b) => a.hora - b.hora)[0];
    if (!post || post.hora - fin > 180) {
      const snack = snacks.find((s) => s !== pre && s.hora > ini);
      if (snack) { snack.hora = fin + 30; post = snack; }
    }
    if (post && post.hora - fin <= 180) post.etiqueta = 'post';
    else consejos.push('Al acabar, toma algo con proteína (un yogur +Proteínas o un vaso de leche) si tu siguiente comida tarda más de 3 h.');

    // Más hidratos alrededor del entreno, menos grasa justo antes (se digiere mejor)
    for (const f of franjas) {
      if (f.id === 'recena') continue;
      if (f.etiqueta === 'pre') { f.pctM.c *= 1.35; f.pctM.g *= 0.6; }
      else if (f.etiqueta === 'post') { f.pctM.c *= 1.3; f.pctM.p *= 1.15; }
      else f.pctM.c *= 0.88;
    }
  }
  for (const k of ['p', 'c', 'g']) {
    const total = franjas.reduce((s, f) => s + f.pctM[k], 0);
    for (const f of franjas) f.pctM[k] /= total;
  }

  franjas.sort((a, b) => a.hora - b.hora);
  // Evita que dos comidas queden pegadas tras los ajustes (mínimo 1 h 30 entre ellas)
  for (let i = 1; i < franjas.length; i++) {
    if (franjas[i].hora - franjas[i - 1].hora < 90) franjas[i].hora = franjas[i - 1].hora + 90;
  }
  const horaComida = franjas.find((f) => f.id === 'comida')?.hora ?? 14 * 60;
  for (const f of franjas) {
    f.horaTexto = aHora(f.hora);
    // Un tentempié movido por el entreno se nombra según cuándo cae
    if (f.tipo === 'snack') f.nombre = f.hora < horaComida ? 'Media mañana' : 'Merienda';
  }
  const cena = franjas.find((f) => f.id === 'cena');
  if (cena && dormir - cena.hora < 90) consejos.push('Cenas muy cerca de la hora de dormir: intenta que sea ligera y sin mucha grasa.');

  return {
    franjas,
    entreno: sesion ? { inicio: aHora(sesion.inicio), fin: aHora(sesion.fin) } : null,
    consejos,
  };
}

/** Objetivo de macros de una franja a partir del objetivo del día. */
export function objetivoFranja(objDia, franja) {
  const pct = franja.pctM || { p: franja.pct, c: franja.pct, g: franja.pct };
  const p = objDia.proteina * pct.p;
  const c = objDia.hidratos * pct.c;
  const g = objDia.grasa * pct.g;
  return { kcal: p * 4 + c * 4 + g * 9, p, c, g };
}
