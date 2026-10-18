// Búsqueda de alimentos tolerante: sin tildes, singular o plural, sinónimos y sin marcas.
export const normal = (s = '') => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

// Las marcas no cuentan (los alimentos de la app ya son de Mercadona)
const MARCAS = ['hacendado', 'mercadona', 'de', 'con', 'el', 'la', 'los', 'las'];

// Cómo lo dice la gente → cómo puede venir en el nombre del producto
const SINONIMOS = {
  boniato: ['batata'], batata: ['boniato'],
  mermelada: ['confitura'], confitura: ['mermelada'],
  yogur: ['postre lacteo', 'bifidus', 'kefir'], yogurt: ['yogur', 'postre lacteo'],
  york: ['jamon cocido'], fiambre: ['lonchas', 'pavo', 'jamon cocido'], embutido: ['lonchas', 'lomo', 'pavo'],
  noquis: ['gnocchi'], gnochi: ['gnocchi'], ñoquis: ['gnocchi'],
  espaguetis: ['spaghetti'], macarrones: ['macarron'],
  wrap: ['tortilla'], fajita: ['tortilla'],
  leche: ['bebida', 'leche'], proteina: ['proteinas', '+proteinas'],
  congelado: ['ultracongelad', 'congelad'], congelada: ['ultracongelad', 'congelad'],
  pechuga: ['pechuga', 'pechuguita'], light: ['ligero', 'light', '0%'], desnatado: ['0%', 'desnatad'],
};

/** Quita la terminación de plural para comparar «tortitas» con «tortita» o «nueces» con «nuez». */
const raiz = (p) => (p.length > 4 ? p.replace(/(es|s)$/, '') : p);

export function partes(q) {
  return normal(q.trim()).split(/\s+/).filter((p) => p && !MARCAS.includes(p));
}

/** ¿El texto contiene todas las palabras buscadas (o un sinónimo de cada una)? */
export function coincide(texto, q) {
  const t = normal(texto);
  const ps = partes(q);
  return ps.length > 0 && ps.every((p) => [p, raiz(p), ...(SINONIMOS[p] || SINONIMOS[raiz(p)] || []).map(normal)].some((v) => t.includes(v)));
}

/** Texto donde buscar un alimento: su nombre y sus otras formas de llamarlo. */
export const textoAlimento = (a) => `${a.nombre} ${a.alias || ''}`;
