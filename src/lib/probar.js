// «Para probar»: cada semana, unos platos de tu recetario que aún no has comido (o que no están en tu menú) para
// salir de la rutina, con tus alergias y gustos. La lista es la misma toda la semana y cambia cada lunes.
import { RECETAS } from '../data/recetas.js';
import { adaptarReceta } from './sustituciones.js';
import { recetaPermitida } from './nutricion.js';
import { estiloDe, sumarDias, recetaPorId, proteinaPrincipal } from './planificador.js';
import { tipoFranja } from './complementos.js';

export const lunesDe = (f) => sumarDias(f, -((new Date(`${f}T12:00`).getDay() + 6) % 7));
const hash = (texto) => [...texto].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0, 2166136261);
const PRINCIPAL = (r) => r.tipos.includes('comida') || r.tipos.includes('cena');
const POR_ID = new Map(RECETAS.map((r) => [r.id, r]));
// Misma carne aunque sea otro corte (lomo y solomillo de cerdo, pechuga y picada de pollo…)
const FAMILIAS = [['pollo', /pollo/], ['cerdo', /cerdo|lomo/], ['vacuno', /vacuno|ternera/], ['pavo', /pavo/]];
const familia = (id) => (id ? FAMILIAS.find(([, re]) => re.test(id))?.[0] || id : null);

/** Los platos de la semana, elegidos de nuevo: cada plato tiene su sorteo fijo (semana + plato), así que la
 * elección no se descoloca si el menú cambia un poco. */
function elegir(e, lunes, { principales, desayunos }) {
  const perfil = e.perfil;
  const enMenu = new Set((e.plan?.dias || []).flatMap((d) => d.comidas.map((c) => c.recetaId)));
  const probadas = new Set(Object.values(e.registros || {}).flat().map((r) => r.ref).filter(Boolean));
  const no = new Set([...(perfil.recetasNo || []), ...(e.favoritas || [])]);
  const pool = RECETAS.filter((r) => !r.fuera && !r.viaje && !no.has(r.id) && !enMenu.has(r.id))
    .map((r) => adaptarReceta(r, perfil))
    .filter((r) => r && recetaPermitida(r, perfil))
    // Primero lo que nunca has comido
    .map((r) => ({ r, orden: hash(`${lunes}:${r.id}`) / 2 ** 32 + (probadas.has(r.id) ? 1 : 0) }))
    .sort((a, b) => a.orden - b.orden)
    .map((x) => x.r);
  // Comidas y cenas: un plato por estilo (casero, dos como mucho) y sin repetir la proteína, para que haya de todo
  const lista = [];
  const estilos = {};
  const proteinas = new Set();
  for (const r of pool.filter(PRINCIPAL)) {
    if (lista.length >= principales) break;
    const est = estiloDe(r);
    const prot = familia(proteinaPrincipal(r));
    if ((estilos[est] || 0) >= (est === 'casero' ? 2 : 1) || (prot && proteinas.has(prot))) continue;
    estilos[est] = (estilos[est] || 0) + 1;
    if (prot) proteinas.add(prot);
    lista.push(r);
  }
  lista.push(...pool.filter((r) => r.tipos.includes('desayuno') && !PRINCIPAL(r)).slice(0, desayunos));
  return lista;
}

/**
 * Platos para probar esta semana: comidas y cenas de estilos distintos y algún desayuno. En cuanto pones uno en tu
 * menú, la lista de la semana se guarda (estado.probar.lista) y ya no cambia; lo puesto sale marcado.
 */
export function paraProbar(e, hoy, { principales = 4, desayunos = 1 } = {}) {
  const lunes = lunesDe(hoy);
  const guardada = e.probar?.lunes === lunes ? e.probar : null;
  const no = new Set(e.perfil.recetasNo || []);
  const recetas = guardada?.lista?.length
    ? guardada.lista.filter((id) => POR_ID.has(id) && !no.has(id)).map((id) => adaptarReceta(POR_ID.get(id), e.perfil)).filter((r) => r && recetaPermitida(r, e.perfil))
    : elegir(e, lunes, { principales, desayunos });
  const probadas = new Set(Object.values(e.registros || {}).flat().map((r) => r.ref).filter(Boolean));
  return recetas.map((r) => ({ receta: r, nueva: !probadas.has(r.id), puesta: guardada?.puestas?.[r.id] || null }));
}

/** Dónde puede ir un plato: las comidas del menú de su tipo, desde mañana (las `n` primeras). */
export function huecosPara(plan, receta, hoy, n = 4) {
  const lista = [];
  (plan?.dias || []).forEach((d, diaIdx) => {
    if (d.fecha <= hoy || d.viaje) return;
    for (const c of d.comidas) {
      if (c.libre || recetaPorId[c.recetaId]?.fuera || c.recetaId === receta.id) continue;
      if (receta.tipos.includes(tipoFranja(c.franja))) lista.push({ diaIdx, fecha: d.fecha, franja: c.franja, actual: c.recetaId });
    }
  });
  return lista.slice(0, n);
}
