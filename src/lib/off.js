// Open Food Facts: base de datos abierta de productos envasados (incluye muchos de Hacendado).
// https://world.openfoodfacts.org — datos bajo licencia ODbL.

const CAMPOS = 'code,product_name,product_name_es,brands,nutriments,serving_size,serving_quantity,product_quantity,image_front_small_url,image_front_url';

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

export function normalizar(p) {
  const n = p.nutriments || {};
  const kcal = num(n['energy-kcal_100g']) || num(n['energy_100g']) / 4.184;
  const por100 = {
    kcal,
    p: num(n.proteins_100g),
    c: num(n.carbohydrates_100g),
    g: num(n.fat_100g),
    f: num(n.fiber_100g),
  };
  const nombre = (p.product_name_es || p.product_name || '').trim();
  return {
    id: `off:${p.code}`,
    codigo: p.code,
    nombre: nombre || 'Producto sin nombre',
    marca: (p.brands || '').split(',')[0].trim(),
    imagen: p.image_front_small_url || p.image_front_url || null,
    por100,
    completo: kcal > 0,
    racion: p.serving_quantity ? { g: num(p.serving_quantity), texto: `1 ración (${p.serving_size})` } : null,
    cantidadEnvase: num(p.product_quantity) || null,
  };
}

async function pedir(url, ms = 9000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`Open Food Facts respondió ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

/** Producto por código de barras (EAN). Devuelve null si no existe. */
export async function porCodigo(codigo) {
  const d = await pedir(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(codigo)}.json?fields=${CAMPOS}`);
  if (d.status !== 1 || !d.product) return null;
  return normalizar({ ...d.product, code: d.product.code || codigo });
}

/** Búsqueda de productos por texto (prioriza los vendidos en España). */
export async function buscar(texto) {
  const q = encodeURIComponent(texto);
  const ruta = `/cgi/search.pl?search_terms=${q}&search_simple=1&action=process&json=1&page_size=20&lc=es&fields=${CAMPOS}`;
  // El buscador de Open Food Facts responde 503 a ratos cuando está saturado: se reintenta
  const hosts = ['world', 'world', 'es', 'world'];
  let ultimoError;
  for (let i = 0; i < hosts.length; i++) {
    try {
      const d = await pedir(`https://${hosts[i]}.openfoodfacts.org${ruta}`, 8000);
      return (d.products || []).map(normalizar).filter((p) => p.completo);
    } catch (e) {
      ultimoError = e;
      await new Promise((ok) => setTimeout(ok, 500 + i * 500));
    }
  }
  throw ultimoError;
}

export function macrosProducto(p, gramos) {
  const k = gramos / 100;
  return { kcal: p.por100.kcal * k, p: p.por100.p * k, c: p.por100.c * k, g: p.por100.g * k, f: p.por100.f * k };
}
