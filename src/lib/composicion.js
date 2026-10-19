// Composición de un plato para dibujarlo sin foto: ingrediente principal y proporciones
// de proteína, hidrato y verdura (por peso, como el «plato» de las guías de alimentación).
import { ALIMENTOS } from '../data/alimentos.js';
import { cortoDe } from './combos.js';

const MARCAS = /\s+(hacendado|la carloteña|noel|campofrío)\b.*$/i;

/** Nombre corto de un alimento, en minúscula: «pechuga de pollo», «arroz», «brócoli». */
const NOMBRES = {
  yogur_proteinas: 'yogur proteico', postre_proteinas_natural_bote: 'yogur proteico', claras: 'claras de huevo', pan_molde: 'pan de molde',
  pera: 'pera', bebida_soja: 'bebida de soja', pisto: 'pisto', cereales_trigo_0: 'cereales', pasta_larga: 'espaguetis', tiras_pollo_horno: 'pollo asado', tiras_pollo_natural: 'pollo',
};

export function corto(id) {
  if (NOMBRES[id]) return NOMBRES[id];
  const n = cortoDe('p', id) !== id ? cortoDe('p', id) : cortoDe('d', id);
  return String(n)
    .replace(/\s*\([^)]*\)/g, '')
    .replace(MARCAS, '')
    .replace(/\s*\+?\d+([.,]\d+)?\s*%/g, '') // «92 %», «0%»
    .replace(/^(filetes|tiras|lomos|dados|bastones) de\s+/i, '')
    .replace(/\s+(al horno|al natural|en lonchas|finas lonchas|lonchas|cocid[oa]s?|larg[oa]|para microondas|ultracongelad[oa]s?|congelad[oa]s?|pelad[oa]s?|laminad[oa]s?)\b.*$/i, '')
    .toLowerCase().trim();
}

function tipo(a) {
  if (!a) return null;
  if (a.grupo === 'proteina' || (a.grupo === 'lacteo' && a.p >= 6)) return 'p';
  if (a.grupo === 'hidrato') return 'c';
  if (a.grupo === 'verdura' || a.grupo === 'fruta') return 'v';
  return null;
}

/** { titulo, sub, p, c, v } con p + c + v = 1 (o todo 0 si no hay nada que medir). */
export function composicion(receta) {
  const ings = receta?.ingredientes || [];
  const suma = { p: 0, c: 0, v: 0 };
  for (const i of ings) {
    const t = tipo(ALIMENTOS[i.a]);
    if (t) suma[t] += i.g || 0;
  }
  const total = suma.p + suma.c + suma.v;
  const prop = total ? { p: suma.p / total, c: suma.c / total, v: suma.v / total } : { p: 0, c: 0, v: 0 };
  // Principal: la proteína del plato (o lo que más pesa); debajo, sus acompañantes
  const conTipo = ings.filter((i) => ALIMENTOS[i.a]).map((i) => ({ ...i, t: tipo(ALIMENTOS[i.a]) }));
  const principal = conTipo.find((i) => i.rol === 'P') || [...conTipo].filter((i) => i.t === 'p').sort((a, b) => b.g - a.g)[0]
    || [...conTipo].sort((a, b) => b.g - a.g)[0];
  const resto = conTipo.filter((i) => i !== principal && (i.t === 'c' || i.t === 'v')).sort((a, b) => b.g - a.g).slice(0, 2);
  const titulo = principal ? corto(principal.a) : '';
  return {
    titulo: titulo ? titulo[0].toUpperCase() + titulo.slice(1) : receta?.nombre || '',
    sub: resto.map((i) => corto(i.a)).join(' · '),
    ...prop,
  };
}
