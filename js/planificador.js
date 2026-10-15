// Generador de menús semanales a partir del recetario y los objetivos del perfil.

import { RECETAS } from '../data/recetas.js';
import { ALIMENTOS } from '../data/alimentos.js';
import { escalarReceta, recetaPermitida, costeComida, macrosComida } from './nutricion.js';

// Reparto del día según el número de comidas. pct = fracción de las kcal y macros del día
export const REPARTOS = {
  3: [
    { id: 'desayuno', nombre: 'Desayuno', tipo: 'desayuno', pct: 0.25 },
    { id: 'comida', nombre: 'Comida', tipo: 'comida', pct: 0.42 },
    { id: 'cena', nombre: 'Cena', tipo: 'cena', pct: 0.33 },
  ],
  4: [
    { id: 'desayuno', nombre: 'Desayuno', tipo: 'desayuno', pct: 0.23 },
    { id: 'comida', nombre: 'Comida', tipo: 'comida', pct: 0.37 },
    { id: 'merienda', nombre: 'Merienda', tipo: 'snack', pct: 0.12 },
    { id: 'cena', nombre: 'Cena', tipo: 'cena', pct: 0.28 },
  ],
  5: [
    { id: 'desayuno', nombre: 'Desayuno', tipo: 'desayuno', pct: 0.2 },
    { id: 'media', nombre: 'Media mañana', tipo: 'snack', pct: 0.1 },
    { id: 'comida', nombre: 'Comida', tipo: 'comida', pct: 0.33 },
    { id: 'merienda', nombre: 'Merienda', tipo: 'snack', pct: 0.11 },
    { id: 'cena', nombre: 'Cena', tipo: 'cena', pct: 0.26 },
  ],
};

export const recetaPorId = Object.fromEntries(RECETAS.map((r) => [r.id, r]));

export function objetivoFranja(objetivos, franja) {
  return {
    kcal: objetivos.kcal * franja.pct,
    p: objetivos.proteina * franja.pct,
    c: objetivos.hidratos * franja.pct,
    g: objetivos.grasa * franja.pct,
  };
}

// Generador pseudoaleatorio con semilla (mulberry32) para que un plan sea reproducible
function rng(semilla) {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Proteína principal de una receta (para no repetir la misma en comida y cena)
function proteinaPrincipal(receta) {
  const p = receta.ingredientes.filter((i) => i.rol === 'P').sort((a, b) => b.g - a.g)[0];
  return p ? p.a : null;
}

export function candidatas(perfil, franja) {
  let lista = RECETAS.filter((r) => r.tipos.includes(franja.tipo) && recetaPermitida(r, perfil));
  if (perfil.tiempoMax) {
    const rapidas = lista.filter((r) => r.tiempo <= perfil.tiempoMax);
    if (rapidas.length >= 3) lista = rapidas;
  }
  return lista;
}

function puntuar(receta, ctx) {
  const { franja, usos, proteinasDia, perfil, aleatorio, enUso, errorAjuste } = ctx;
  let s = aleatorio() * 3;
  const n = usos[receta.id] || 0;
  s -= n * (franja.tipo === 'desayuno' || franja.tipo === 'snack' ? 1.2 : 3.5);
  if (receta.prefiere && receta.prefiere !== franja.tipo) s -= 1.2;
  const prot = proteinaPrincipal(receta);
  if (prot && proteinasDia.includes(prot)) s -= 2.5;
  if (perfil.presupuesto === 'ajustado') s -= ctx.costeRelativo(receta) * 2;
  if (perfil.sobras && franja.tipo === 'comida' && receta.batch) s += 0.8;
  // Recetas que encajan mal en los macros de la franja (aun escaladas) salen menos
  s -= errorAjuste(receta) * 8;
  // Reaprovechar ingredientes ya comprados abarata la cesta y evita desperdicio
  for (const i of receta.ingredientes) {
    if (ALIMENTOS[i.a].despensa) continue;
    s += enUso.has(i.a) ? 0.4 : -0.4;
  }
  return s;
}

function crearComida(receta, franja, objetivos) {
  const escalada = escalarReceta(receta, objetivoFranja(objetivos, franja));
  return { franja: franja.id, recetaId: receta.id, ingredientes: escalada.ingredientes };
}

// Desviación relativa de una comida respecto al objetivo de su franja
function errorComida(ingredientes, obj) {
  const m = macrosComida(ingredientes);
  return Math.abs(m.kcal - obj.kcal) / obj.kcal + (0.8 * Math.abs(m.p - obj.p)) / Math.max(obj.p, 1);
}

/**
 * Genera un plan de N días empezando en `inicio` (fecha ISO yyyy-mm-dd).
 * perfil.sobras = true → la comida se cocina para dos días seguidos (táper).
 */
export function generarPlan(perfil, objetivos, { inicio, dias = 7, semilla = Date.now() } = {}) {
  const aleatorio = rng(semilla);
  const franjas = REPARTOS[perfil.comidas] || REPARTOS[4];
  const usos = {};
  const listas = Object.fromEntries(franjas.map((f) => [f.id, candidatas(perfil, f)]));

  // Coste medio de cada receta a ración base, para la preferencia de presupuesto
  const costes = Object.fromEntries(RECETAS.map((r) => [r.id, costeComida(r.ingredientes)]));
  const medio = Object.values(costes).reduce((a, b) => a + b, 0) / RECETAS.length;
  const costeRelativo = (r) => costes[r.id] / medio - 1;

  // Cada receta se escala una sola vez por franja (el objetivo es el mismo todos los días)
  const escaladas = {};
  const comidaEscalada = (receta, franja) => {
    const k = `${franja.id}|${receta.id}`;
    if (!escaladas[k]) {
      const comida = crearComida(receta, franja, objetivos);
      escaladas[k] = { comida, error: errorComida(comida.ingredientes, objetivoFranja(objetivos, franja)) };
    }
    return escaladas[k];
  };

  const enUso = new Set();
  const resultado = [];
  for (let d = 0; d < dias; d++) {
    const proteinasDia = [];
    const comidas = [];
    for (const franja of franjas) {
      const lista = listas[franja.id];
      let receta;
      const anterior = resultado[d - 1]?.comidas.find((c) => c.franja === franja.id);
      if (perfil.sobras && franja.tipo === 'comida' && d % 2 === 1 && anterior) {
        receta = recetaPorId[anterior.recetaId]; // segundo día del táper
      } else if (lista.length) {
        const errorAjuste = (r) => comidaEscalada(r, franja).error;
        const ctx = { franja, usos, proteinasDia, perfil, aleatorio, costeRelativo, enUso, errorAjuste };
        receta = lista.map((r) => [r, puntuar(r, ctx)]).sort((a, b) => b[1] - a[1])[0][0];
      }
      if (!receta) continue;
      usos[receta.id] = (usos[receta.id] || 0) + 1;
      const prot = proteinaPrincipal(receta);
      if (prot) proteinasDia.push(prot);
      for (const i of receta.ingredientes) enUso.add(i.a);
      const { comida } = comidaEscalada(receta, franja);
      comidas.push(structuredClone(comida));
    }
    resultado.push({ fecha: sumarDias(inicio, d), comidas });
  }
  return { creado: new Date().toISOString(), inicio, semilla, comidasDia: perfil.comidas, dias: resultado };
}

/** Alternativas para sustituir una comida concreta del plan, ordenadas por encaje. */
export function alternativas(plan, diaIdx, franjaId, perfil, objetivos) {
  const franja = (REPARTOS[plan.comidasDia] || REPARTOS[4]).find((f) => f.id === franjaId);
  const actual = plan.dias[diaIdx].comidas.find((c) => c.franja === franjaId)?.recetaId;
  const usos = {};
  for (const d of plan.dias) for (const c of d.comidas) usos[c.recetaId] = (usos[c.recetaId] || 0) + 1;
  const obj = objetivoFranja(objetivos, franja);
  return candidatas(perfil, franja)
    .filter((r) => r.id !== actual)
    .map((r) => {
      const comida = crearComida(r, franja, objetivos);
      const m = macrosComida(comida.ingredientes);
      const desvio = Math.abs(m.kcal - obj.kcal) / obj.kcal + Math.abs(m.p - obj.p) / Math.max(obj.p, 1);
      return { comida, macros: m, usos: usos[r.id] || 0, orden: desvio + (usos[r.id] || 0) * 0.15 };
    })
    .sort((a, b) => a.orden - b.orden);
}

export function sustituir(plan, diaIdx, franjaId, comida) {
  const dia = plan.dias[diaIdx];
  dia.comidas = dia.comidas.map((c) => (c.franja === franjaId ? comida : c));
}

/** Recalcula las cantidades de todo el plan con unos objetivos nuevos (mismas recetas). */
export function reescalarPlan(plan, objetivos) {
  const franjas = REPARTOS[plan.comidasDia] || REPARTOS[4];
  for (const dia of plan.dias) {
    dia.comidas = dia.comidas.map((c) => {
      const receta = recetaPorId[c.recetaId];
      const franja = franjas.find((f) => f.id === c.franja);
      return receta && franja ? crearComida(receta, franja, objetivos) : c;
    });
  }
}

export function sumarDias(iso, n) {
  const [y, m, d] = iso.split('-').map(Number);
  const f = new Date(Date.UTC(y, m - 1, d + n));
  return f.toISOString().slice(0, 10);
}

export function hoyISO() {
  const f = new Date();
  return `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-${String(f.getDate()).padStart(2, '0')}`;
}
