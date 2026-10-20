// Generador de menús semanales: cada día tiene su horario y su objetivo (entreno o descanso).

import { RECETAS } from '../data/recetas.js';
import { ALIMENTOS } from '../data/alimentos.js';
import { escalarReceta, recetaPermitida, costeComida, macrosComida, objetivosDia, metaDia, calcularObjetivos } from './nutricion.js';
import { REPARTOS, horarioDia, objetivoFranja, esDiaEntreno } from './horario.js';
import { preferenciasAlimentos } from './salud.js';
import { comboDesdeId, esCombo, combosAleatorios, familiaDe } from './combos.js';
import { adaptarReceta, adaptarActiva } from './sustituciones.js';

export { REPARTOS, objetivoFranja };

// Recetas del recetario y, además, las comidas montadas por ingredientes (ids «combo:…»)
const RECETARIO = Object.fromEntries(RECETAS.map((r) => [r.id, r]));
export const recetaPorId = new Proxy(RECETARIO, {
  // Las recetas salen ya adaptadas a tu perfil (frutos secos o leche que no tomas cambiados por otros)
  get: (t, k) => (t[k] ? adaptarActiva(t[k]) : esCombo(k) ? comboDesdeId(k) : undefined),
});

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

export function candidatas(perfil, franja, { favoritas = [], viaje = null } = {}) {
  const no = new Set(perfil.recetasNo || []); // platos que dijiste que no repetirías
  let lista = RECETAS.filter((r) => r.tipos.includes(franja.tipo) && !no.has(r.id) && (viaje || !r.fuera)).map((r) => adaptarReceta(r, perfil)).filter((r) => recetaPermitida(r, perfil));
  // De viaje: comer fuera (restaurante) y/o cosas del súper que no hay que cocinar
  if (viaje) {
    const modos = viaje.comida || ['fuera', 'super'];
    const fuera = modos.includes('fuera');
    const deViaje = lista.filter((r) => (fuera && r.fuera) || (modos.includes('super') && r.viaje) || (!fuera && !modos.includes('super') && r.tiempo <= 5));
    if (deViaje.length) return deViaje;
  }
  if (perfil.tiempoMax) {
    const rapidas = lista.filter((r) => r.tiempo <= perfil.tiempoMax);
    if (rapidas.length >= 3) lista = rapidas;
  }
  // Tus comidas favoritas (recetas o montadas por ti) también entran en el menú
  const ids = new Set(lista.map((r) => r.id));
  for (const id of favoritas) {
    const r = adaptarReceta(recetaPorId[id], perfil);
    if (r && !ids.has(id) && r.tipos.includes(franja.tipo) && recetaPermitida(r, perfil)) { lista.push(r); ids.add(id); }
  }
  // Si con tus alergias y gustos no queda ninguna receta, se monta una con lo que sí comes
  if (!lista.length) lista = combosAleatorios(perfil, familiaDe(franja.tipo), 8, franja.tipo.length * 7919);
  return lista;
}

// Fracción de las kcal de una receta que viene de la grasa (antes de entrenar, cuanto menos mejor)
const grasaRelativaCache = {};
function grasaRelativa(r) {
  if (!grasaRelativaCache[r.id]) {
    const m = macrosComida(r.ingredientes);
    grasaRelativaCache[r.id] = { grasa: (m.g * 9) / Math.max(m.kcal, 1), fibra: m.f };
  }
  return grasaRelativaCache[r.id];
}

function puntuar(receta, ctx) {
  const { franja, usos, proteinasDia, perfil, aleatorio, enUso, errorAjuste, prefs, favoritas } = ctx;
  let s = aleatorio() * 3;
  const n = usos[receta.id] || 0;
  s -= n * (franja.tipo === 'desayuno' || franja.tipo === 'snack' ? 1.2 : 3.5);
  if (receta.prefiere && receta.prefiere !== franja.tipo) s -= 1.2;
  if (favoritas?.has(receta.id)) s += 4; // tus favoritas salen a menudo (sin repetirse cada día)
  const prot = proteinaPrincipal(receta);
  if (prot && proteinasDia.includes(prot)) s -= 2.5;
  if (perfil.presupuesto === 'ajustado') s -= ctx.costeRelativo(receta) * 2;
  if (perfil.sobras && franja.tipo === 'comida' && receta.batch) s += 0.8;
  if (franja.etiqueta === 'pre') {
    // Antes de entrenar: poca grasa y poca fibra para no ir pesado
    const { grasa, fibra } = grasaRelativa(receta);
    s -= Math.max(0, grasa - 0.25) * 12 + Math.max(0, fibra - 8) * 0.3;
  }
  // Recetas que encajan mal en los macros de la franja (aun escaladas) salen menos
  s -= errorAjuste(receta) * 8;
  for (const i of receta.ingredientes) {
    // Reaprovechar ingredientes ya comprados abarata la cesta y evita desperdicio
    if (!ALIMENTOS[i.a].despensa) s += enUso.has(i.a) ? 0.4 : -0.4;
    // Ajustes por salud (hierro, sal, colesterol…)
    if (prefs.bonus.has(i.a)) s += 0.5;
    if (prefs.penal.has(i.a)) s -= 1;
  }
  return s;
}

function crearComida(receta, franja, objDia, obj = objetivoFranja(objDia, franja)) {
  const escalada = escalarReceta(receta, obj);
  return { franja: franja.id, recetaId: receta.id, ingredientes: escalada.ingredientes, hora: franja.horaTexto, etiqueta: franja.etiqueta };
}

/**
 * Lleva la cuenta del día comida a comida: si las anteriores se quedaron cortas (o se pasaron)
 * de kcal o proteína, las siguientes compensan una parte, para que el total del día cuadre.
 */
function balanceDia(objDia, franjas) {
  const objs = franjas.map((f) => objetivoFranja(objDia, f));
  const hecho = { kcal: 0, p: 0, objKcal: 0, objP: 0 };
  return {
    objetivo(idx) {
      const base = objs[idx];
      const quedan = objs.slice(idx).reduce((s, o) => s + o.kcal, 0);
      const parte = base.kcal / Math.max(quedan, 1);
      const acotar = (v, min, max) => Math.min(max, Math.max(min, v));
      const dKcal = acotar((hecho.objKcal - hecho.kcal) * parte, -0.25 * base.kcal, 0.25 * base.kcal);
      const dP = acotar((hecho.objP - hecho.p) * parte, -0.25 * base.p, 0.4 * base.p);
      // El resto del cambio de kcal se reparte entre hidratos y grasa en su proporción
      const resto = base.c * 4 + base.g * 9;
      const k = Math.max(0.5, 1 + (dKcal - dP * 4) / Math.max(resto, 1));
      const p = base.p + dP;
      const c = base.c * k;
      const g = base.g * k;
      // Redondeado para que comidas escaladas con objetivos casi iguales se reaprovechen
      return { kcal: Math.round(p * 4 + c * 4 + g * 9), p: Math.round(p), c: Math.round(c), g: Math.round(g) };
    },
    anotar(idx, ingredientes) {
      const m = macrosComida(ingredientes);
      hecho.kcal += m.kcal;
      hecho.p += m.p;
      hecho.objKcal += objs[idx].kcal;
      hecho.objP += objs[idx].p;
    },
  };
}

// Desviación relativa de una comida respecto al objetivo de su franja.
// Quedarse corto de proteína pesa más que pasarse, y mucho más si falta más de un 25 %:
// con pocas recetas (dietas con restricciones) es mejor repetir plato que, por no repetir,
// elegir uno que no llega a la proteína del día.
function errorComida(ingredientes, obj) {
  const m = macrosComida(ingredientes);
  const dp = (m.p - obj.p) / Math.max(obj.p, 1);
  const prot = dp < 0 ? -1.6 * dp + 4 * Math.max(0, -dp - 0.25) : 0.8 * dp;
  return Math.abs(m.kcal - obj.kcal) / obj.kcal + prot;
}

/** Datos de un día: si se entrena, su horario y su objetivo. */
/**
 * @param proveedor opcional (fecha) => sesiones del plan HYROX ese día; si existe, manda sobre los días fijos de entreno
 */
export function contextoDia(perfil, objetivos, fecha, proveedor = null, viajes = null) {
  const viaje = (viajes || []).find((v) => fecha >= v.desde && fecha <= v.hasta) || null;
  const sesiones = proveedor ? proveedor(fecha) : null;
  if (sesiones) {
    // Caminar o recuperar no es día de entreno (no hay pre ni post), pero su gasto sí cuenta
    const principal = sesiones.filter((s) => !s.carga && !['recuperacion', 'caminar'].includes(s.tipo)).sort((a, b) => b.duracion - a.duracion)[0];
    const entreno = !!principal;
    const horario = horarioDia(perfil, entreno, principal ? { hora: principal.hora, duracion: principal.duracion, tipo: principal.tipo } : null);
    return { entreno, horario, objDia: metaDia(objetivos, sesiones), sesiones, viaje };
  }
  const entreno = esDiaEntreno(perfil, fecha);
  const horario = horarioDia(perfil, entreno);
  return { entreno, horario, objDia: objetivosDia(objetivos, entreno), viaje };
}

/**
 * Genera un plan de N días empezando en `inicio` (fecha ISO yyyy-mm-dd).
 * perfil.sobras = true → la comida se cocina para dos días seguidos (táper).
 */
export function generarPlan(perfil, objetivos, { inicio, dias = 7, semilla = Date.now(), proveedor = null, favoritas = [], viajes = null } = {}) {
  const aleatorio = rng(semilla);
  const usos = {};
  const prefs = preferenciasAlimentos(perfil);

  // Coste medio de cada receta a ración base, para la preferencia de presupuesto
  const costes = Object.fromEntries(RECETAS.map((r) => [r.id, costeComida(r.ingredientes)]));
  const medio = Object.values(costes).reduce((a, b) => a + b, 0) / RECETAS.length;
  const costeRelativo = (r) => (costes[r.id] ?? costeComida(r.ingredientes)) / medio - 1;

  // Cada receta se escala una vez por franja y objetivo
  const escaladas = {};
  const comidaEscalada = (receta, franja, objDia, obj) => {
    const k = `${obj.p}|${obj.c}|${obj.g}|${franja.id}|${franja.etiqueta}|${franja.horaTexto}|${receta.id}`;
    if (!escaladas[k]) {
      const comida = crearComida(receta, franja, objDia, obj);
      escaladas[k] = { comida, error: errorComida(comida.ingredientes, obj) };
    }
    return escaladas[k];
  };

  const enUso = new Set();
  const resultado = [];
  for (let d = 0; d < dias; d++) {
    const fecha = sumarDias(inicio, d);
    const { entreno, horario, objDia, viaje } = contextoDia(perfil, objetivos, fecha, proveedor, viajes);
    const balance = balanceDia(objDia, horario.franjas);
    const proteinasDia = [];
    const comidas = [];
    for (const [idx, franja] of horario.franjas.entries()) {
      const obj = balance.objetivo(idx);
      let receta;
      const anterior = resultado[d - 1]?.comidas.find((c) => c.franja === franja.id);
      if (perfil.sobras && !viaje && franja.tipo === 'comida' && d % 2 === 1 && anterior && !recetaPorId[anterior.recetaId]?.fuera) {
        receta = recetaPorId[anterior.recetaId]; // segundo día del táper
      } else {
        const lista = candidatas(perfil, franja, { favoritas, viaje });
        if (lista.length) {
          const errorAjuste = (r) => comidaEscalada(r, franja, objDia, obj).error;
          const ctx = { franja, usos, proteinasDia, perfil, aleatorio, costeRelativo, enUso, errorAjuste, prefs, favoritas: new Set(favoritas) };
          receta = lista.map((r) => [r, puntuar(r, ctx)]).sort((a, b) => b[1] - a[1])[0][0];
        }
      }
      if (!receta) continue;
      usos[receta.id] = (usos[receta.id] || 0) + 1;
      const prot = proteinaPrincipal(receta);
      if (prot) proteinasDia.push(prot);
      for (const i of receta.ingredientes) enUso.add(i.a);
      const comida = structuredClone(comidaEscalada(receta, franja, objDia, obj).comida);
      balance.anotar(idx, comida.ingredientes);
      comidas.push(comida);
    }
    resultado.push({ fecha, entreno, sesion: horario.entreno, consejos: horario.consejos, objetivo: objDia, comidas, ...(viaje ? { viaje: { comida: viaje.comida || [] } } : {}) });
  }
  return { version: 2, creado: new Date().toISOString(), inicio, semilla, comidasDia: perfil.comidas, dias: resultado };
}

/** Franja y macros objetivo de una comida concreta del plan. */
export function objetivoComida(plan, diaIdx, franjaId, perfil, objetivos, proveedor = null) {
  const dia = plan?.dias[diaIdx];
  if (!dia) return null;
  const { franja, objDia } = franjaDelDia(perfil, objetivos, dia, franjaId, proveedor);
  return franja ? { franja, obj: objetivoFranja(objDia, franja) } : null;
}

function franjaDelDia(perfil, objetivos, dia, franjaId, proveedor, viajes = null) {
  const ctx = contextoDia(perfil, objetivos, dia.fecha, proveedor, viajes);
  return { ...ctx, franja: ctx.horario.franjas.find((f) => f.id === franjaId) };
}

/** Alternativas para sustituir una comida concreta del plan, ordenadas por encaje. */
export function alternativas(plan, diaIdx, franjaId, perfil, objetivos, proveedor = null, favoritas = [], viajes = null) {
  const dia = plan.dias[diaIdx];
  const { franja, objDia, viaje } = franjaDelDia(perfil, objetivos, dia, franjaId, proveedor, viajes);
  if (!franja) return [];
  const actual = dia.comidas.find((c) => c.franja === franjaId)?.recetaId;
  const usos = {};
  for (const d of plan.dias) for (const c of d.comidas) usos[c.recetaId] = (usos[c.recetaId] || 0) + 1;
  const obj = objetivoFranja(objDia, franja);
  return candidatas(perfil, franja, { favoritas, viaje })
    .filter((r) => r.id !== actual)
    .map((r) => {
      const comida = crearComida(r, franja, objDia);
      const m = macrosComida(comida.ingredientes);
      const desvio = Math.abs(m.kcal - obj.kcal) / obj.kcal + Math.abs(m.p - obj.p) / Math.max(obj.p, 1);
      const pre = franja.etiqueta === 'pre' ? Math.max(0, grasaRelativa(r).grasa - 0.25) : 0;
      return { comida, macros: m, usos: usos[r.id] || 0, orden: desvio + (usos[r.id] || 0) * 0.15 + pre };
    })
    .sort((a, b) => a.orden - b.orden);
}

export function sustituir(plan, diaIdx, franjaId, comida) {
  const dia = plan.dias[diaIdx];
  dia.comidas = dia.comidas.map((c) => (c.franja === franjaId ? comida : c));
}

/** Añade las comidas que falten en el plan (p. ej. un desayuno que no se pudo elegir). Devuelve cuántas. */
export function completarPlan(plan, perfil, objetivos, proveedor = null, favoritas = [], viajes = null) {
  let n = 0;
  plan.dias.forEach((dia, i) => {
    const { horario, objDia, viaje } = contextoDia(perfil, objetivos, dia.fecha, proveedor, viajes);
    for (const franja of horario.franjas) {
      if (dia.comidas.some((c) => c.franja === franja.id)) continue;
      const lista = candidatas(perfil, franja, { favoritas, viaje });
      if (!lista.length) continue;
      const receta = lista[(i * 7 + franja.id.length) % lista.length];
      dia.comidas.push(crearComida(receta, franja, objDia));
      n++;
    }
    dia.comidas.sort((a, b) => (a.hora || '').localeCompare(b.hora || ''));
  });
  return n;
}

/** Recalcula horario y cantidades de todo el plan (mismas recetas) tras cambiar el perfil. */
export function reescalarPlan(plan, perfil, objetivos, proveedor = null, desde = hoyISO()) {
  for (const dia of plan.dias) {
    if (dia.fecha < desde) continue; // los días pasados (y hoy, si se pide desde mañana) se quedan como fueron
    // Un día «fijado» (p. ej. hoy, al apuntar un peso nuevo) sigue con el peso con el que se planificó
    const p = dia.perfilFijo ? { ...perfil, ...dia.perfilFijo } : perfil;
    const ctx = contextoDia(p, dia.perfilFijo ? calcularObjetivos(p) : objetivos, dia.fecha, proveedor);
    const { entreno, horario } = ctx;
    // Día libre (perfil.diaLibre): los días de antes ahorran kcal y esa comida tiene el margen extra
    const libre = diaLibreActivo(perfil.diaLibre, dia.fecha);
    const objDia = libre?.ahorro ? cambiarKcal(ctx.objDia, -libre.ahorro) : ctx.objDia;
    dia.entreno = entreno;
    dia.objetivo = libre?.extra ? cambiarKcal(objDia, libre.extra) : objDia;
    dia.ahorro = libre?.ahorro || 0;
    dia.libre = libre?.extra ? { franja: libre.franja, extra: libre.extra } : null;
    dia.sesion = horario.entreno;
    dia.consejos = horario.consejos;
    // Mismo reparto que al generar: en orden del día, compensando lo que va quedando
    const balance = balanceDia(objDia, horario.franjas);
    const porFranja = Object.fromEntries(dia.comidas.map((c) => [c.franja, c]));
    dia.comidas = horario.franjas
      .map((franja, idx) => {
        const receta = recetaPorId[porFranja[franja.id]?.recetaId];
        if (!receta) return null;
        const comida = crearComida(receta, franja, objDia, balance.objetivo(idx));
        balance.anotar(idx, comida.ingredientes);
        if (dia.libre?.franja === franja.id) {
          // La comida libre: el plato de base más el margen ahorrado (no va a la compra; comes lo que quieras)
          const m = macrosComida(comida.ingredientes);
          const meta = { p: m.p, c: m.c + (dia.libre.extra * 0.55) / 4, g: m.g + (dia.libre.extra * 0.45) / 9 };
          meta.kcal = meta.p * 4 + meta.c * 4 + meta.g * 9;
          // Es un hueco, no una receta que cocinar: se escala sin los límites normales para que cuadre el margen
          comida.ingredientes = escalarReceta(receta, meta, { P: [0.5, 6], C: [0.3, 8], G: [0.4, 8] }).ingredientes;
          comida.libre = dia.libre.extra;
        }
        return comida;
      })
      .filter(Boolean);
  }
}

/** ¿Este día ahorra kcal o es el día libre? { ahorro } o { extra, franja } (null si no le toca). */
export function diaLibreActivo(dl, fecha) {
  if (!dl?.fecha || !dl.ahorro) return null;
  const dias = diasAhorro(dl);
  if (fecha === dl.fecha) return { extra: dl.ahorro * dias.length, franja: dl.franja || 'cena' };
  if (dias.includes(fecha)) return { ahorro: dl.ahorro };
  return null;
}
/** Días que ahorran: desde el día siguiente a crearlo hasta la víspera del día libre (máx. 6). */
export function diasAhorro(dl) {
  const lista = [];
  for (let f = dl.desde; f < dl.fecha && lista.length < 6; f = sumarDias(f, 1)) lista.push(f);
  return lista;
}
function cambiarKcal(obj, kcal) {
  return { ...obj, kcal: obj.kcal + kcal, hidratos: Math.max(0, Math.round(obj.hidratos + (kcal * 0.55) / 4)), grasa: Math.max(0, Math.round(obj.grasa + (kcal * 0.45) / 9)) };
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
