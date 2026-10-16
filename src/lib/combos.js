// Comidas montadas por ingredientes ("combos"): copos de avena + bebida de almendra + yogur +
// Proteínas + plátano… Se comportan como recetas: su id lleva los ingredientes
// (combo:d:avena+bebida_almendra+yogur_proteinas+platano) y las cantidades se ajustan a los
// macros de cada comida igual que las recetas del recetario.
import { ALIMENTOS } from '../data/alimentos.js';
import { MONTAR, BASES_DE_BOL, LISTOS, DULCE, SALADO } from '../data/montar.js';
import { escalarReceta, macrosComida, alimentoPermitido, cantidadTexto } from './nutricion.js';

// Ingredientes sin ajuste de cantidad (se ponen tal cual)
const FIJOS = new Set(['matcha', 'cacao']);
// Cuánto puede crecer o encoger cada grupo respecto a la ración de partida (más estrecho que en
// las recetas: así no salen 180 g de pan ni medio litro de leche)
const LIMITES_COMBO = { P: [0.5, 2], C: [0.7, 2.4], G: [0.3, 2.5] };

// id → { corto, racion, grupo, orden } por familia (d: desayunos y tentempiés · p: platos)
const INFO = {};
for (const [fam, def] of Object.entries(MONTAR)) {
  INFO[fam] = {};
  def.grupos.forEach((g, gi) => g.items.forEach(([id, corto, racion], i) => {
    INFO[fam][id] ??= { corto, racion, grupo: g.id, orden: gi * 100 + i };
  }));
}

export const familiaDe = (tipo) => (tipo === 'comida' || tipo === 'cena' ? 'p' : 'd');
export const esCombo = (id) => typeof id === 'string' && id.startsWith('combo:');
export const cortoDe = (fam, id) => INFO[fam]?.[id]?.corto || ALIMENTOS[id]?.nombre?.toLowerCase() || id;

/** «5 tortitas sabor jamón», «285 ml de claras de huevo», «1 plátano». */
export function textoIngrediente(fam, a, g) {
  const q = cantidadTexto(a, g);
  const c = cortoDe(fam, a);
  const cl = c.toLowerCase();
  const u = ALIMENTOS[a]?.unidad;
  if (u) {
    for (const w of [u.pl, u.n]) {
      if (!q.includes(` ${w}`)) continue;
      if (cl === u.n || cl === u.pl) return q; // «1 plátano (100 g)»
      if (cl.startsWith(`${w} `)) return q.replace(` ${w}`, ` ${c}`); // «2 huevos cocidos»
      if (cl.startsWith(`${u.pl} `)) return q.replace(` ${w}`, ` ${w} ${c.slice(u.pl.length + 1)}`); // «1 tortita de maíz»
      return `${q} de ${c}`;
    }
  }
  return `${q} de ${c}`;
}

export function idCombo(fam, ids) {
  const orden = (id) => INFO[fam]?.[id]?.orden ?? 9999;
  return `combo:${fam}:${[...new Set(ids)].sort((a, b) => orden(a) - orden(b)).join('+')}`;
}

function rolDe(id, grupo) {
  if (FIJOS.has(id) || grupo === 'verdura' || grupo === 'liquido') return undefined; // la bebida va en vaso o bol entero
  if (grupo === 'proteina') return 'P';
  if (grupo === 'base' || grupo === 'hidrato') return 'C';
  if (grupo === 'grasa') return 'G';
  const a = ALIMENTOS[id];
  const kp = a.p * 4;
  const kc = a.c * 4;
  const kg = a.g * 9;
  return kp >= kc && kp >= kg ? 'P' : kg > kc ? 'G' : 'C';
}

const lista = (xs) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} y ${xs.at(-1)}`);
const capital = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);

function nombreCombo(fam, ids) {
  const c = (id) => cortoDe(fam, id);
  if (fam === 'd') {
    const [primero, ...resto] = ids;
    return capital(resto.length ? `${c(primero)} con ${lista(resto.map(c))}` : c(primero));
  }
  // En los platos el aceite no da nombre al plato
  const nombrables = ids.filter((id) => id !== 'aceite');
  const [primero, ...resto] = nombrables;
  return capital(resto.length ? `${c(primero)} con ${lista(resto.map(c))}` : c(primero));
}

function pasosCombo(fam, ids) {
  const c = (id) => cortoDe(fam, id);
  const grupo = (g) => ids.filter((id) => INFO[fam][id]?.grupo === g);
  const pasos = [];
  if (fam === 'd') {
    const [base] = grupo('base');
    const liq = grupo('liquido');
    const prot = grupo('proteina');
    const extra = grupo('extra');
    if (base && BASES_DE_BOL.has(base)) {
      pasos.push(`Pon ${lista(grupo('base').map(c))} en un bol${liq.length ? ` con la ${c(liq[0])}` : ''}${prot.length && !liq.length ? ` con ${lista(prot.map(c))}` : ''}.`);
      if (prot.length && liq.length) pasos.push(`Añade ${lista(prot.map(c))}.`);
    } else if (base) {
      pasos.push(`Prepara ${lista(grupo('base').map(c))}${prot.length ? ` y ponles encima ${lista(prot.map(c))}` : ''}.`);
      if (liq.length) pasos.push(`Acompáñalo con un vaso de ${c(liq[0])}.`);
    }
    if (ids.includes('matcha')) pasos.push('Disuelve el matcha en un poco de agua caliente (sin hervir) o directamente en la bebida.');
    const resto = extra.filter((x) => x !== 'matcha');
    if (resto.length) pasos.push(`Termina con ${lista(resto.map(c))}.`);
  } else {
    const [prot] = grupo('proteina');
    const hid = grupo('hidrato');
    const ver = grupo('verdura');
    const gra = grupo('grasa');
    for (const h of hid) pasos.push(LISTOS.has(h) ? `Calienta ${c(h)} (ya viene cocido).` : `Cuece ${c(h)} según el paquete.`);
    if (prot) pasos.push(LISTOS.has(prot) ? `Prepara ${c(prot)}: ya está listo para comer.` : `Haz ${c(prot)} a la plancha, al horno o en la sartén con sal y tus especias favoritas.`);
    if (ver.length) pasos.push(`Prepara ${lista(ver.map(c))}: salteado, al vapor o en ensalada.`);
    pasos.push(gra.length ? `Aliña con ${lista(gra.map(c))} y sirve.` : 'Sirve todo junto.');
  }
  return pasos;
}

const EMOJI_DIETA = { carne: '🍗', cerdo: '🥩', pescado: '🐟', marisco: '🦐', huevo: '🍳', vegetal: '🫘', lacteo: '🥛' };
function emojiCombo(fam, ids) {
  if (fam === 'd') {
    const [base] = ids;
    return base?.startsWith('tortitas') ? '🍘' : base?.startsWith('pan') || base === 'tortilla_trigo' ? '🍞' : '🥣';
  }
  return EMOJI_DIETA[ALIMENTOS[ids[0]]?.dieta] || '🍽️';
}

const cache = new Map();
/** Receta equivalente a un combo a partir de su id (o undefined si no es válido). */
export function comboDesdeId(id) {
  if (cache.has(id)) return cache.get(id);
  const [, fam, cadena] = String(id).split(':');
  const def = MONTAR[fam];
  const ids = (cadena || '').split('+').filter((x) => ALIMENTOS[x]);
  if (!def || !ids.length) return undefined;
  const ingredientes = ids.map((a) => {
    const info = INFO[fam][a] || { racion: 50 };
    const rol = rolDe(a, info.grupo);
    return rol ? { a, g: info.racion, rol } : { a, g: info.racion };
  });
  const crudos = ids.some((x) => ['pollo_pechuga', 'pollo_contramuslo', 'pavo_pechuga', 'ternera_filete', 'picada_vacuno', 'cerdo_lomo', 'cerdo_solomillo', 'salmon', 'merluza', 'langostino', 'arroz', 'arroz_integral', 'pasta', 'pasta_integral', 'patata', 'batata'].includes(x));
  const receta = {
    id, combo: true, familia: fam, nombre: nombreCombo(fam, ids), emoji: emojiCombo(fam, ids), tipos: def.tipos,
    tiempo: fam === 'd' ? 5 : crudos ? 20 : 10, ingredientes, pasos: pasosCombo(fam, ids), especias: [], batch: fam === 'p' && crudos, limites: LIMITES_COMBO,
  };
  cache.set(id, receta);
  return receta;
}

export function errorMacros(ingredientes, obj) {
  const m = macrosComida(ingredientes);
  return Math.abs(m.kcal - obj.kcal) / obj.kcal + (0.8 * Math.abs(m.p - obj.p)) / Math.max(obj.p, 1);
}

/** Ajusta un combo a unos macros y dice si le falta algo importante. */
export function montarCombo(fam, ids, objetivo) {
  if (!ids.length) return null;
  const receta = comboDesdeId(idCombo(fam, ids));
  if (!receta) return null;
  const { ingredientes } = escalarReceta(receta, objetivo);
  const m = macrosComida(ingredientes);
  const avisos = [];
  if (m.p < objetivo.p * 0.75) avisos.push({ grupo: 'proteina', texto: `Le faltan unos ${Math.round(objetivo.p - m.p)} g de proteína: añade algo del grupo Proteína.` });
  if (objetivo.g > 8 && m.g < objetivo.g * 0.6) avisos.push({ grupo: fam === 'd' ? 'extra' : 'grasa', texto: fam === 'd' ? 'Le falta algo de grasa: añade frutos secos, crema de cacahuete, semillas o aguacate.' : 'Le falta grasa: añade aceite de oliva, aguacate o frutos secos.' });
  if (m.c > objetivo.c * 1.35 && m.c - objetivo.c > 10) avisos.push({ grupo: null, texto: 'Lleva más hidratos de la cuenta: quita algo de base o de fruta.' });
  if (m.kcal < objetivo.kcal * 0.8) avisos.push({ grupo: fam === 'd' ? 'base' : 'hidrato', texto: `Se queda corto (${Math.round(m.kcal)} de ${Math.round(objetivo.kcal)} kcal): añade otra base o fruta.` });
  if (m.kcal > objetivo.kcal * 1.2) avisos.push({ grupo: null, texto: `Se pasa (${Math.round(m.kcal)} de ${Math.round(objetivo.kcal)} kcal): quita algún ingrediente.` });
  return { receta, ingredientes, macros: m, avisos };
}

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

/** Ingredientes permitidos de cada grupo según tu perfil (alergias, dieta, lo que no te gusta). */
export function gruposPermitidos(fam, perfil) {
  return MONTAR[fam].grupos.map((g) => ({ ...g, items: g.items.filter(([id]) => ALIMENTOS[id] && alimentoPermitido(id, perfil)) }));
}

/** Combinaciones al azar con sentido (sin evaluar macros). */
export function combosAleatorios(perfil, fam, n = 40, semilla = 1) {
  const r = rng(semilla);
  const G = Object.fromEntries(gruposPermitidos(fam, perfil).map((g) => [g.id, g.items.map(([id]) => id)]));
  const elegir = (xs) => (xs.length ? xs[Math.floor(r() * xs.length)] : null);
  const ids = new Set();
  for (let i = 0; i < n * 3 && ids.size < n; i++) {
    const sel = [];
    if (fam === 'd') {
      const base = elegir(G.base);
      if (!base) break;
      sel.push(base);
      const bol = BASES_DE_BOL.has(base);
      // Dulce o salado según la base (las neutras, como el pan o las tortitas de arroz, valen para las dos)
      const dulce = DULCE.has(base) || (!SALADO.has(base) && r() < 0.5);
      const encaja = (x) => (dulce ? DULCE.has(x) : SALADO.has(x));
      if (dulce && r() < (bol ? 0.75 : 0.1)) sel.push(elegir(G.liquido));
      if (r() < 0.9 || (bol && !sel[1])) sel.push(elegir(G.proteina.filter(encaja)));
      if (dulce) {
        if (r() < 0.75) sel.push(elegir(G.extra.filter((x) => ALIMENTOS[x].grupo === 'fruta')));
        if (r() < 0.4) sel.push(elegir(G.extra.filter((x) => encaja(x) && ALIMENTOS[x].grupo !== 'fruta')));
      } else {
        sel.push(elegir(G.extra.filter(encaja)));
        if (r() < 0.3) sel.push(elegir(G.extra.filter(encaja)));
      }
    } else {
      const prot = elegir(G.proteina);
      if (!prot) break;
      sel.push(prot);
      const legumbre = ['garbanzos', 'lentejas', 'alubias'].includes(prot);
      // El pan y las tortillas se dejan para cuando montas tú el plato
      if (!legumbre || r() < 0.3) sel.push(elegir(G.hidrato.filter((x) => x !== prot && x !== 'pan_integral' && x !== 'tortilla_trigo')));
      sel.push(elegir(G.verdura));
      if (r() < 0.35) sel.push(elegir(G.verdura));
      sel.push(G.grasa.includes('aceite') && r() < 0.75 ? 'aceite' : elegir(G.grasa));
    }
    ids.add(idCombo(fam, sel.filter(Boolean)));
  }
  return [...ids].map(comboDesdeId).filter(Boolean);
}

/** Las mejores combinaciones nuevas para unos macros, sin repetir la base o la proteína principal. */
export function proponerCombos(perfil, fam, objetivo, { n = 4, semilla = 1, excluir = [] } = {}) {
  const fuera = new Set(excluir);
  const evaluadas = combosAleatorios(perfil, fam, 60, semilla)
    .filter((r) => !fuera.has(r.id))
    .map((receta) => {
      const { ingredientes } = escalarReceta(receta, objetivo);
      return { receta, ingredientes, error: errorMacros(ingredientes, objetivo) };
    })
    .sort((a, b) => a.error - b.error);
  const usados = new Set();
  const out = [];
  for (const x of evaluadas) {
    const clave = x.receta.ingredientes[0].a;
    if (usados.has(clave)) continue;
    usados.add(clave);
    out.push(x);
    if (out.length >= n) break;
  }
  return out;
}
