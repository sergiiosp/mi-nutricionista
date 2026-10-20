// Cálculos nutricionales: gasto energético, objetivos de macros, macros de ingredientes
// y escalado de recetas a un objetivo concreto.

import { ALIMENTOS, FRUTOS_SECOS } from '../data/alimentos.js';
import { PRECIOS } from '../data/precios.js';

// Perfil antiguo (antes del cuestionario ampliado): factor de actividad único
export const ACTIVIDAD = {
  sedentario: { f: 1.2, nombre: 'Sedentario', desc: 'Trabajo sentado y apenas hago ejercicio' },
  ligero: { f: 1.375, nombre: 'Ligero', desc: 'Camino a diario o entreno 1-2 días por semana' },
  moderado: { f: 1.55, nombre: 'Moderado', desc: 'Entreno 3-4 días por semana' },
  alto: { f: 1.725, nombre: 'Alto', desc: 'Entreno 5-6 días o tengo un trabajo físico' },
  muy_alto: { f: 1.9, nombre: 'Muy alto', desc: 'Entreno a diario intenso y trabajo físico' },
};

// Actividad diaria sin contar el entreno (NEAT). El factor incluye la digestión (~10 %).
export const TRABAJO = {
  sentado: { f: 1.25, nombre: 'Sentado', desc: 'Oficina, ordenador, conducir', emoji: '💻' },
  de_pie: { f: 1.35, nombre: 'De pie / en movimiento', desc: 'Comercio, hostelería, docencia, sanidad', emoji: '🚶' },
  fisico: { f: 1.5, nombre: 'Físico', desc: 'Obra, almacén, reparto, campo', emoji: '🏗️' },
  no: { f: 1.25, nombre: 'No trabajo ahora', desc: 'Estudio, en paro, jubilado…', emoji: '🏠' },
};

export const PASOS = {
  pocos: { extra: -0.05, nombre: 'Menos de 5.000' },
  normal: { extra: 0, nombre: '5.000 – 8.000' },
  bastantes: { extra: 0.08, nombre: '8.000 – 12.000' },
  muchos: { extra: 0.15, nombre: 'Más de 12.000' },
};

// MET por intensidad [suave, moderada, intensa] (Compendio de Actividades Físicas)
export const DEPORTES = {
  fuerza: { nombre: 'Fuerza / gimnasio', emoji: '🏋️', met: [3.5, 5, 6], clase: 'fuerza' },
  hiit: { nombre: 'CrossFit / HIIT / funcional', emoji: '🔥', met: [6, 8, 10], clase: 'mixto' },
  carrera: { nombre: 'Correr', emoji: '🏃', met: [7, 9.5, 11.5], clase: 'resistencia' },
  ciclismo: { nombre: 'Ciclismo / spinning', emoji: '🚴', met: [5.5, 8, 10.5], clase: 'resistencia' },
  natacion: { nombre: 'Natación', emoji: '🏊', met: [5.5, 8, 10], clase: 'resistencia' },
  equipo: { nombre: 'Fútbol, pádel, baloncesto…', emoji: '⚽', met: [5, 7, 9], clase: 'mixto' },
  otro: { nombre: 'Yoga, pilates, baile…', emoji: '🧘', met: [3, 4.5, 6], clase: 'ligero' },
};
export const INTENSIDAD = { suave: 0, moderada: 1, intensa: 2 };

export const OBJETIVOS = {
  perder: { nombre: 'Perder grasa', emoji: '🔥', proteinaKg: 2.0, ritmos: { suave: -0.15, moderado: -0.2, rapido: -0.25 } },
  recomposicion: { nombre: 'Recomposición', emoji: '⚖️', desc: 'Perder grasa y ganar músculo a la vez', proteinaKg: 2.0, ritmos: { unico: -0.08 } },
  mantener: { nombre: 'Mantener peso', emoji: '🎯', proteinaKg: 1.6, ritmos: { unico: 0 } },
  ganar: { nombre: 'Ganar músculo', emoji: '💪', proteinaKg: 1.8, ritmos: { suave: 0.05, moderado: 0.1, rapido: 0.15 } },
};

export const RITMOS = { suave: 'Suave', moderado: 'Moderado', rapido: 'Rápido' };

const KCAL_POR_KG = 7700;

/** Clase dominante del entreno: 'fuerza', 'resistencia', 'mixto' o null si no entrena. */
export function claseEntreno(perfil) {
  if (!perfil.entrena || !perfil.deportes?.length) return null;
  const clases = new Set(perfil.deportes.map((d) => DEPORTES[d]?.clase).filter(Boolean));
  if (clases.has('fuerza')) return 'fuerza';
  if (clases.has('mixto')) return 'mixto';
  if (clases.has('resistencia')) return 'resistencia';
  return 'ligero';
}

/** kcal netas (por encima del reposo) de una sesión de entreno. */
export function kcalSesion(perfil) {
  if (!perfil.entrena || !perfil.deportes?.length) return 0;
  const i = INTENSIDAD[perfil.intensidad] ?? 1;
  const mets = perfil.deportes.map((d) => DEPORTES[d]?.met[i]).filter(Boolean);
  if (!mets.length) return 0;
  const met = mets.reduce((a, b) => a + b, 0) / mets.length;
  return Math.round((met - 1) * perfil.peso * ((perfil.duracionEntreno || 60) / 60));
}

export function repartoMacros(kcal, proteina, grasaBase, pesoRef, minHidratos = 0) {
  let grasa = grasaBase;
  let hidratos = (kcal - proteina * 4 - grasa * 9) / 4;
  const minimo = Math.max(80, minHidratos);
  if (hidratos < minimo) {
    // Primero se recorta grasa (hasta un mínimo saludable) para no dejar los hidratos demasiado bajos
    grasa = Math.max(0.6 * pesoRef, (kcal - proteina * 4 - minimo * 4) / 9);
    hidratos = (kcal - proteina * 4 - grasa * 9) / 4;
  }
  return { kcal: Math.round(kcal), proteina, grasa: Math.round(grasa), hidratos: Math.max(0, Math.round(hidratos)) };
}

export function calcularObjetivos(perfil) {
  const { sexo, edad, altura, peso, objetivo } = perfil;
  const h = altura / 100;
  const imc = peso / (h * h);
  // Con el % de grasa de tu báscula, el metabolismo sale de la masa magra (Katch-McArdle), más fiable
  // si tienes más músculo de la media; sin ese dato, de peso, altura y edad (Mifflin-St Jeor)
  const grasaPct = perfil.grasa >= 4 && perfil.grasa <= 60 ? perfil.grasa : null;
  const magra = grasaPct ? peso * (1 - grasaPct / 100) : null;
  const tmb = magra ? 370 + 21.6 * magra : 10 * peso + 6.25 * altura - 5 * edad + (sexo === 'h' ? 5 : -161);
  const condiciones = perfil.condiciones || [];

  // Gasto en días de descanso (actividad diaria) y de entreno (+ la sesión)
  const ampliado = !!perfil.trabajo;
  const factor = ampliado
    ? (TRABAJO[perfil.trabajo]?.f ?? 1.25) + (PASOS[perfil.pasos]?.extra ?? 0)
    : ACTIVIDAD[perfil.actividad]?.f ?? 1.375;
  const getDescanso = tmb * factor;
  const sesion = ampliado ? kcalSesion(perfil) : 0;
  const diasEntreno = ampliado && perfil.entrena ? (perfil.diasEntreno || []).length : 0;
  const getEntreno = getDescanso + sesion;
  const getMedio = getDescanso + (sesion * diasEntreno) / 7;

  const obj = OBJETIVOS[objetivo];
  let ritmo = obj.ritmos[perfil.ritmo] ?? Object.values(obj.ritmos)[0];
  // Seguridad: sin déficit en embarazo/lactancia y déficit muy suave si hay historial de TCA
  if (condiciones.includes('embarazo')) ritmo = Math.max(ritmo, 0);
  if (condiciones.includes('tca')) ritmo = Math.max(ritmo, -0.1);
  // Ajuste manual (tú o el repaso semanal) + el del gasto real calculado con tus datos (lib/gasto.js)
  const ajuste = (perfil.ajusteKcal || 0) + (perfil.ajusteGasto || 0);
  const minimo = sexo === 'h' ? 1500 : 1200;
  const limitado = getDescanso * (1 + ritmo) + ajuste < minimo;
  const kcalDe = (get) => Math.round(Math.max(get * (1 + ritmo) + ajuste, minimo) / 10) * 10;
  const kcalEntreno = kcalDe(getEntreno);
  const kcalDescanso = kcalDe(getDescanso);
  const kcalMedia = Math.round((kcalEntreno * diasEntreno + kcalDescanso * (7 - diasEntreno)) / 7 / 10) * 10;

  // Proteína: según objetivo y tipo de entreno; con IMC alto, sobre un peso de referencia
  const pesoImc25 = 25 * h * h;
  const pesoRef = imc > 30 ? pesoImc25 + 0.25 * (peso - pesoImc25) : peso;
  const clase = ampliado ? claseEntreno(perfil) : null;
  let gKg = obj.proteinaKg;
  if (ampliado) {
    if (!clase) gKg -= 0.4;
    else if (clase === 'ligero') gKg -= 0.3;
    else if (clase === 'resistencia') gKg -= 0.2;
  } else if (perfil.actividad === 'sedentario' || perfil.actividad === 'ligero') {
    gKg -= 0.3;
  }
  gKg = Math.max(gKg, 1.2);
  // Con masa magra conocida, la proteína va sobre ella (×1,2 ≈ los mismos g/kg de peso con un ~17 % de grasa)
  const proteina = Math.round(Math.min(magra ? magra * gKg * 1.2 : pesoRef * gKg, (kcalMedia * 0.35) / 4));
  const grasaBase = Math.max(0.8 * pesoRef, (kcalMedia * 0.27) / 9);

  // Deportes de resistencia con sesiones largas: mínimo de hidratos para rendir
  const largas = clase === 'resistencia' && (perfil.duracionEntreno || 0) >= 60;
  const minHidratosEntreno = largas ? (perfil.intensidad === 'intensa' ? 5 : 4) * peso : 0;

  const entreno = { ...repartoMacros(kcalEntreno, proteina, grasaBase, pesoRef, minHidratosEntreno), get: Math.round(getEntreno) };
  const descanso = { ...repartoMacros(kcalDescanso, proteina, grasaBase, pesoRef), get: Math.round(getDescanso) };
  const media = (k) => Math.round((entreno[k] * diasEntreno + descanso[k] * (7 - diasEntreno)) / 7);
  const horasEntreno = (perfil.duracionEntreno || 0) / 60;

  return {
    imc: Math.round(imc * 10) / 10,
    tmb: Math.round(tmb),
    metodoTmb: magra ? 'magra' : 'peso',
    magraKg: magra ? Math.round(magra * 10) / 10 : null,
    get: Math.round(getMedio),
    kcal: kcalMedia,
    proteina,
    gKg: Math.round((proteina / peso) * 10) / 10,
    grasa: media('grasa'),
    hidratos: media('hidratos'),
    fibra: Math.round((kcalMedia / 1000) * 14),
    agua: Math.round((peso * 35) / 100) / 10, // litros en día de descanso
    aguaEntreno: Math.round((peso * 35 + horasEntreno * 600) / 100) / 10,
    kcalSesion: sesion,
    diasEntreno,
    clase,
    cambioSemanalKg: Math.round((((kcalMedia - getMedio) * 7) / KCAL_POR_KG) * 100) / 100,
    limitado,
    porTipo: { entreno, descanso },
    // Para calcular días con sesiones concretas (plan HYROX)
    base: { getDescanso, ritmo, ajuste, minimo, proteina, grasaBase, pesoRef, peso, objetivo },
  };
}

/**
 * Objetivo de un día con sesiones concretas (plan HYROX): el gasto de cada sesión se suma
 * y los hidratos mínimos dependen del tipo de sesión. En carga y carrera no hay déficit.
 * @param sesiones [{ kcal, carbos (g/kg), carga?, tipo }]
 */
export function metaDia(objetivos, sesiones) {
  if (!sesiones?.length) return objetivos.porTipo.descanso;
  const b = objetivos.base;
  const extra = sesiones.reduce((s, x) => s + (x.kcal || 0), 0);
  const sinDeficit = sesiones.some((x) => x.carga || x.tipo === 'carrera');
  const ritmo = sinDeficit ? Math.max(b.ritmo, 0) : b.ritmo;
  // Perdiendo grasa se priorizan los hidratos alrededor del entreno, pero sin forzar superávit
  const recorte = !sinDeficit && ['perder', 'recomposicion'].includes(b.objetivo) ? 0.75 : 1;
  const minCarbos = Math.max(0, ...sesiones.map((x) => x.carbos || 0)) * b.peso * recorte;
  let kcal = Math.max((b.getDescanso + extra) * (1 + ritmo) + (sinDeficit ? 0 : b.ajuste), b.minimo);
  if (minCarbos) kcal = Math.max(kcal, b.proteina * 4 + 0.6 * b.pesoRef * 9 + minCarbos * 4);
  kcal = Math.round(kcal / 10) * 10;
  return { ...repartoMacros(kcal, b.proteina, b.grasaBase, b.pesoRef, minCarbos), get: Math.round(b.getDescanso + extra) };
}

/** Objetivos de un día concreto (entreno o descanso). */
export function objetivosDia(objetivos, entreno) {
  return objetivos.porTipo[entreno ? 'entreno' : 'descanso'];
}

// ── Alimentos ───────────────────────────────────────────────────────────────

export function alimento(id) {
  const a = ALIMENTOS[id];
  if (!a) throw new Error(`Alimento desconocido: ${id}`);
  return a;
}

export function macrosDe(id, gramos) {
  const a = alimento(id);
  const k = gramos / 100;
  return { kcal: a.kcal * k, p: a.p * k, c: a.c * k, g: a.g * k, f: (a.f || 0) * k };
}

export function sumarMacros(lista) {
  const t = { kcal: 0, p: 0, c: 0, g: 0, f: 0 };
  for (const m of lista) {
    t.kcal += m.kcal; t.p += m.p; t.c += m.c; t.g += m.g; t.f += m.f || 0;
  }
  return t;
}

export function producto(id) {
  const a = alimento(id);
  return a.mercadona ? PRECIOS[a.mercadona] || null : null;
}

// Gramos (en bruto, tal como se compran) que trae un envase del producto de Mercadona
export function gramosPorEnvase(id) {
  const a = alimento(id);
  if (a.envaseG) return a.envaseG;
  const p = producto(id);
  if (!p || !p.contenido) return null;
  if (p.unidadContenido === 'ud') return a.unidad ? p.contenido * a.unidad.g : null;
  return p.contenido;
}

// Coste proporcional de consumir X gramos comestibles de un alimento
export function costeDe(id, gramos) {
  const p = producto(id);
  const envase = gramosPorEnvase(id);
  if (!p || !envase) return 0;
  const bruto = gramos / (alimento(id).rendimiento || 1);
  return (bruto / envase) * p.precio;
}

// Texto legible de una cantidad: "2 huevos", "150 g", "200 ml"
export function cantidadTexto(id, gramos) {
  const a = alimento(id);
  if (a.unidad && (a.redondeo === 'unidad' || a.grupo === 'fruta' || id === 'aguacate')) {
    const n = gramos / a.unidad.g;
    const nr = Math.round(n * 2) / 2;
    if (a.redondeo === 'unidad' || Math.abs(n - nr) < 0.12) {
      const txt = nr === 0.5 ? `½ ${a.unidad.n}` : `${formatoNum(nr)} ${nr === 1 ? a.unidad.n : a.unidad.pl}`;
      return a.redondeo === 'unidad' ? txt : `${txt} (${Math.round(gramos)} g)`;
    }
  }
  const u = a.medida === 'ml' ? 'ml' : 'g';
  if (id === 'aceite') {
    // 1 cucharada sopera ≈ 10 g · 1 cucharadita ≈ 4 g
    const cdas = gramos / 10;
    const extra = gramos < 3 ? 'un chorrito' : gramos < 7.5 ? '1 cdta' : `${formatoNum(Math.round(cdas * 2) / 2)} cda`;
    return `${Math.round(gramos)} g (${extra})`;
  }
  return `${Math.round(gramos)} ${u}`;
}

function formatoNum(n) {
  return Number.isInteger(n) ? String(n) : String(n).replace('.', ',').replace(',5', '½').replace(/^0½$/, '½');
}

// ── Escalado de recetas ────────────────────────────────────────────────────

const LIMITES = { P: [0.5, 2.6], C: [0.3, 3.2], G: [0.4, 3] };
// Pesos del ajuste: errores de proteína, hidratos, grasa y calorías (todos en kcal)
const PESOS = [1.6, 1, 1, 1.2];

function vector(m) {
  return [m.p * 4, m.c * 4, m.g * 9, m.kcal];
}

function redondear(id, g) {
  const a = alimento(id);
  if (a.redondeo === 'unidad' && a.unidad) {
    return Math.max(1, Math.round(g / a.unidad.g)) * a.unidad.g;
  }
  const paso = a.paso || (g < 20 ? 1 : g < 300 ? 5 : 10);
  return Math.max(paso, Math.round(g / paso) * paso);
}

/**
 * Ajusta las cantidades de una receta para acercarse a un objetivo { kcal, p, c, g }.
 * Escala por grupos (proteína, hidratos, grasa) con mínimos cuadrados acotados.
 */
export function escalarReceta(receta, objetivo, limites = receta.limites || LIMITES) {
  const grupos = { P: [], C: [], G: [] };
  const fijos = [];
  for (const ing of receta.ingredientes) {
    (ing.rol ? grupos[ing.rol] : fijos).push(ing);
  }
  const T = vector(objetivo);
  const F = vector(sumarMacros(fijos.map((i) => macrosDe(i.a, i.g))));
  const roles = Object.keys(grupos).filter((r) => grupos[r].length);
  const M = Object.fromEntries(roles.map((r) => [r, vector(sumarMacros(grupos[r].map((i) => macrosDe(i.a, i.g))))]));
  const x = Object.fromEntries(roles.map((r) => [r, 1]));

  // Descenso por coordenadas con límites (converge en pocas iteraciones con 3 variables)
  for (let it = 0; it < 60; it++) {
    for (const r of roles) {
      let num = 0;
      let den = 0;
      for (let i = 0; i < 4; i++) {
        let resto = T[i] - F[i];
        for (const o of roles) if (o !== r) resto -= x[o] * M[o][i];
        num += PESOS[i] * M[r][i] * resto;
        den += PESOS[i] * M[r][i] * M[r][i];
      }
      if (den > 0) x[r] = Math.min(limites[r][1], Math.max(limites[r][0], num / den));
    }
  }

  const ingredientes = receta.ingredientes.map((ing) => ({
    a: ing.a,
    g: redondear(ing.a, ing.rol ? ing.g * x[ing.rol] : ing.g),
  }));
  return { recetaId: receta.id, ingredientes, factores: x };
}

export function macrosComida(ingredientes) {
  return sumarMacros(ingredientes.map((i) => macrosDe(i.a, i.g)));
}

export function costeComida(ingredientes) {
  return ingredientes.reduce((s, i) => s + costeDe(i.a, i.g), 0);
}

// ── Restricciones del perfil ───────────────────────────────────────────────

const EXCLUSIONES_DIETA = {
  omnivora: [],
  sin_cerdo: ['cerdo'],
  pescetariana: ['carne', 'cerdo'],
  vegetariana: ['carne', 'cerdo', 'pescado', 'marisco'],
};

export const DIETAS = {
  omnivora: 'Como de todo',
  sin_cerdo: 'Sin cerdo',
  pescetariana: 'Pescetariana (sin carne)',
  vegetariana: 'Vegetariana (huevo y lácteos sí)',
};

/** Cruza los alérgenos de un alimento con los tuyos («frutos_secos» = todos o una mezcla sin especificar). */
export function tieneAlergeno(del, mias) {
  if (!mias.length || !del.length) return false;
  if (del.some((x) => mias.includes(x))) return true;
  const nuez = (x) => FRUTOS_SECOS.includes(x);
  if (mias.includes('frutos_secos') && del.some(nuez)) return true;
  if (del.includes('frutos_secos') && mias.some(nuez)) return true;
  return false;
}

export function alimentoPermitido(id, perfil) {
  const a = alimento(id);
  if ((EXCLUSIONES_DIETA[perfil.dieta] || []).includes(a.dieta)) return false;
  if (tieneAlergeno(a.al, perfil.alergias || [])) return false;
  if ((perfil.noMeGusta || []).includes(id)) return false;
  return true;
}

export function recetaPermitida(receta, perfil) {
  // Recetas con verdura cruda (tomate en tostada, ensaladas…) fuera si no la toleras
  if (receta.crudas && (perfil.alergias || []).includes('verdura_cruda')) return false;
  // Los batidos de proteína en polvo, solo si dijiste que la tomas
  if (!perfil.whey && receta.ingredientes.some((i) => i.a === 'proteina_whey')) return false;
  return receta.ingredientes.every((i) => alimentoPermitido(i.a, perfil));
}
