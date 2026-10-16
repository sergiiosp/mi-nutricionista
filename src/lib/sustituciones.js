// Recetas adaptadas a ti: si un ingrediente no lo tomas (alergia, dieta, no te gusta o prefieres
// bebida vegetal), se cambia por el primero de su lista que sí puedas, en vez de quitar la receta.
import { alimentoPermitido } from './nutricion.js';
import { ALIMENTOS } from '../data/alimentos.js';

export const SUSTITUTOS = {
  nueces: ['almendra_tostada', 'pistacho', 'pipas_calabaza', 'pipas_girasol'],
  almendras: ['almendra_tostada', 'pistacho', 'pipas_calabaza', 'pipas_girasol'],
  crema_cacahuete: ['almendra_tostada', 'pistacho', 'pipas_girasol', 'pipas_calabaza'],
  frutos_secos_mix: ['almendra_tostada', 'pistacho', 'pipas_calabaza', 'mezcla_semillas'],
  cacahuete_polvo: ['proteina_whey', 'pipas_calabaza'],
  crema_avellana: ['cacao'],
  granola: ['avena', 'cereales_trigo_0'],
  leche_semi: ['bebida_avena', 'bebida_almendra', 'bebida_soja', 'leche_sin_lactosa'],
  leche_desnatada: ['bebida_soja', 'bebida_avena', 'bebida_almendra', 'leche_sin_lactosa'],
  leche_sin_lactosa: ['bebida_avena', 'bebida_almendra', 'bebida_soja'],
  leche_proteinas: ['bebida_soja', 'bebida_avena'],
};

// Cómo se nombra cada ingrediente en el título y los pasos de las recetas
const PALABRAS = {
  nueces: [/nueces/gi, /\bnuez\b/gi], almendras: [/almendras/gi], crema_cacahuete: [/crema de cacahuete/gi, /cacahuete/gi],
  frutos_secos_mix: [/frutos secos/gi], cacahuete_polvo: [/cacahuete en polvo/gi], crema_avellana: [/crema de avellanas?( y cacao)?/gi],
  granola: [/granola/gi], leche_semi: [/leche semidesnatada/gi, /\bleche\b/gi], leche_desnatada: [/leche desnatada/gi, /\bleche\b/gi],
  leche_sin_lactosa: [/leche sin lactosa/gi, /\bleche\b/gi], leche_proteinas: [/leche \+?proteínas/gi, /\bleche\b/gi],
};
const CORTO = {
  almendra_tostada: 'almendras tostadas', pistacho: 'pistachos', pipas_calabaza: 'pipas de calabaza', pipas_girasol: 'pipas de girasol',
  mezcla_semillas: 'semillas', proteina_whey: 'proteína whey', cacao: 'cacao puro', avena: 'copos de avena', cereales_trigo_0: 'cereales de trigo',
  bebida_avena: 'bebida de avena', bebida_almendra: 'bebida de almendras', bebida_soja: 'bebida de soja', leche_sin_lactosa: 'leche sin lactosa',
};
const LECHES = ['leche_semi', 'leche_desnatada', 'leche_sin_lactosa', 'leche_proteinas'];

/** ¿Hay que cambiar este ingrediente para ti? */
function noVale(id, perfil) {
  if (perfil.leche && perfil.leche !== 'vaca' && LECHES.includes(id)) return true;
  return !alimentoPermitido(id, perfil);
}

/** Primer sustituto que puedes tomar (con tu bebida vegetal preferida delante). */
export function sustitutoDe(id, perfil) {
  let lista = SUSTITUTOS[id];
  if (!lista) return null;
  if (LECHES.includes(id) && perfil.leche && perfil.leche !== 'vaca') lista = [`bebida_${perfil.leche}`, ...lista];
  return lista.find((x) => ALIMENTOS[x] && !noVale(x, perfil)) || null;
}

const cache = new Map();
const claveDe = (perfil) => JSON.stringify([perfil.alergias, perfil.dieta, perfil.noMeGusta, perfil.leche]);

/** Receta con los cambios que necesitas (la misma receta si no hace falta ninguno). */
export function adaptarReceta(receta, perfil) {
  if (!receta || !perfil || !receta.ingredientes) return receta;
  const k = `${receta.id}|${claveDe(perfil)}`;
  if (cache.has(k)) return cache.get(k);
  const cambios = [];
  const ingredientes = receta.ingredientes.map((i) => {
    if (!noVale(i.a, perfil)) return i;
    const otro = sustitutoDe(i.a, perfil);
    if (!otro) return i;
    cambios.push([i.a, otro]);
    return { ...i, a: otro };
  });
  let res = receta;
  if (cambios.length) {
    const cambiar = (t) => cambios.reduce((txt, [de, a]) => (PALABRAS[de] || []).reduce((x, re) => x.replace(re, CORTO[a] || ALIMENTOS[a].nombre.toLowerCase()), txt), t);
    res = {
      ...receta,
      ingredientes,
      nombre: cambiar(receta.nombre),
      pasos: (receta.pasos || []).map(cambiar),
      consejo: receta.consejo ? cambiar(receta.consejo) : receta.consejo,
      sinFoto: cambios.some(([de]) => ['nueces', 'almendras', 'crema_cacahuete', 'frutos_secos_mix', 'crema_avellana', 'granola', 'cacahuete_polvo'].includes(de)),
      adaptada: cambios.map(([de, a]) => `${CORTO[a] || ALIMENTOS[a].nombre} en vez de ${ALIMENTOS[de].nombre.toLowerCase()}`),
    };
  }
  cache.set(k, res);
  return res;
}

// Perfil con el que se adaptan las recetas que se consultan por id (lo fija la app al cargar tu estado)
let perfilActivo = null;
export function fijarPerfilRecetas(perfil) { perfilActivo = perfil || null; }
export function adaptarActiva(receta) { return perfilActivo ? adaptarReceta(receta, perfilActivo) : receta; }
