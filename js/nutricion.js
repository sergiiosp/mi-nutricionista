// Cálculos nutricionales: gasto energético, objetivos de macros, macros de ingredientes
// y escalado de recetas a un objetivo concreto.

import { ALIMENTOS } from '../data/alimentos.js';
import { PRECIOS } from '../data/precios.js';

export const ACTIVIDAD = {
  sedentario: { f: 1.2, nombre: 'Sedentario', desc: 'Trabajo sentado y apenas hago ejercicio' },
  ligero: { f: 1.375, nombre: 'Ligero', desc: 'Camino a diario o entreno 1-2 días por semana' },
  moderado: { f: 1.55, nombre: 'Moderado', desc: 'Entreno 3-4 días por semana' },
  alto: { f: 1.725, nombre: 'Alto', desc: 'Entreno 5-6 días o tengo un trabajo físico' },
  muy_alto: { f: 1.9, nombre: 'Muy alto', desc: 'Entreno a diario intenso y trabajo físico' },
};

export const OBJETIVOS = {
  perder: { nombre: 'Perder grasa', proteinaKg: 2.0, ritmos: { suave: -0.15, moderado: -0.2, rapido: -0.25 } },
  recomposicion: { nombre: 'Recomposición', desc: 'Perder grasa y ganar músculo a la vez', proteinaKg: 2.0, ritmos: { unico: -0.08 } },
  mantener: { nombre: 'Mantener peso', proteinaKg: 1.6, ritmos: { unico: 0 } },
  ganar: { nombre: 'Ganar músculo', proteinaKg: 1.8, ritmos: { suave: 0.05, moderado: 0.1, rapido: 0.15 } },
};

export const RITMOS = { suave: 'Suave', moderado: 'Moderado', rapido: 'Rápido' };

const KCAL_POR_KG = 7700;

export function calcularObjetivos(perfil) {
  const { sexo, edad, altura, peso, actividad, objetivo } = perfil;
  const h = altura / 100;
  const imc = peso / (h * h);
  const tmb = 10 * peso + 6.25 * altura - 5 * edad + (sexo === 'h' ? 5 : -161);
  const get = tmb * ACTIVIDAD[actividad].f;

  const obj = OBJETIVOS[objetivo];
  const ritmo = obj.ritmos[perfil.ritmo] ?? Object.values(obj.ritmos)[0];
  const minimo = sexo === 'h' ? 1500 : 1200;
  let kcal = get * (1 + ritmo) + (perfil.ajusteKcal || 0);
  const limitado = kcal < minimo;
  kcal = Math.round(Math.max(kcal, minimo) / 10) * 10;

  // Con IMC alto, la proteína se calcula sobre un peso de referencia (no sobre la masa grasa)
  const pesoImc25 = 25 * h * h;
  const pesoRef = imc > 30 ? pesoImc25 + 0.25 * (peso - pesoImc25) : peso;
  // Sin entrenamiento de fuerza regular no hace falta tanta proteína
  const pocoActivo = actividad === 'sedentario' || actividad === 'ligero';
  const gKg = obj.proteinaKg - (pocoActivo ? 0.3 : 0);
  const proteina = Math.round(Math.min(pesoRef * gKg, (kcal * 0.35) / 4));

  let grasa = Math.max(0.8 * pesoRef, (kcal * 0.27) / 9);
  let hidratos = (kcal - proteina * 4 - grasa * 9) / 4;
  if (hidratos < 80) {
    // Dietas muy bajas en calorías: se reduce la grasa hasta un mínimo antes que los hidratos
    grasa = Math.max(0.6 * pesoRef, (kcal - proteina * 4 - 80 * 4) / 9);
    hidratos = (kcal - proteina * 4 - grasa * 9) / 4;
  }

  return {
    imc: Math.round(imc * 10) / 10,
    tmb: Math.round(tmb),
    get: Math.round(get),
    kcal,
    proteina,
    grasa: Math.round(grasa),
    hidratos: Math.max(0, Math.round(hidratos)),
    fibra: Math.round((kcal / 1000) * 14),
    agua: Math.round((peso * 35) / 100) / 10, // litros
    cambioSemanalKg: Math.round((((kcal - get) * 7) / KCAL_POR_KG) * 100) / 100,
    limitado,
  };
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
export function escalarReceta(receta, objetivo) {
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
      if (den > 0) x[r] = Math.min(LIMITES[r][1], Math.max(LIMITES[r][0], num / den));
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

export function alimentoPermitido(id, perfil) {
  const a = alimento(id);
  if ((EXCLUSIONES_DIETA[perfil.dieta] || []).includes(a.dieta)) return false;
  if (a.al.some((x) => (perfil.alergias || []).includes(x))) return false;
  if ((perfil.noMeGusta || []).includes(id)) return false;
  return true;
}

export function recetaPermitida(receta, perfil) {
  return receta.ingredientes.every((i) => alimentoPermitido(i.a, perfil));
}
