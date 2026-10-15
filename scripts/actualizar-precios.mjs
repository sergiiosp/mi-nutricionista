// Actualiza precios y envases de los productos de Mercadona usados en data/alimentos.js.
// Escribe data/precios.js (lo carga la app). Uso:
//   node scripts/actualizar-precios.mjs [almacen]
// El almacén por defecto es "mad1" (Madrid). Los precios pueden variar ligeramente por zona.

import { writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const ALMACEN = process.argv[2] || 'mad1';
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { ALIMENTOS, ESPECIAS } = await import(pathToFileURL(path.join(RAIZ, 'src', 'data', 'alimentos.js')).href);

const espera = (ms) => new Promise((r) => setTimeout(r, ms));

async function producto(id) {
  for (let intento = 1; intento <= 3; intento++) {
    const res = await fetch(`https://tienda.mercadona.es/api/products/${id}/?lang=es&wh=${ALMACEN}`);
    if (res.ok) return res.json();
    if (res.status === 404 || res.status === 410) return null;
    await espera(1500 * intento);
  }
  return null;
}

// Gramos (o ml, o unidades) que contiene un envase según la API
function contenido(pi) {
  if (pi.drained_weight) return { cantidad: pi.drained_weight * 1000, unidad: 'g' };
  const t = pi.unit_size;
  switch (pi.size_format) {
    case 'kg': if (t) return { cantidad: t * 1000, unidad: 'g' }; break;
    case 'l': if (t) return { cantidad: t * 1000, unidad: 'g' }; break;
    case 'ud': if (t) return { cantidad: t, unidad: 'ud' }; break;
  }
  // Peso variable (congelados por ejemplo): se deduce del precio por kg
  if (pi.reference_format === 'kg' && Number(pi.reference_price) > 0) {
    return { cantidad: Math.round((Number(pi.unit_price) / Number(pi.reference_price)) * 1000), unidad: 'g' };
  }
  return { cantidad: null, unidad: null };
}

const ids = new Set();
for (const a of Object.values(ALIMENTOS)) if (a.mercadona) ids.add(a.mercadona);
for (const e of Object.values(ESPECIAS)) if (e.mercadona) ids.add(e.mercadona);

const precios = {};
const fallidos = [];
for (const id of ids) {
  const p = await producto(id);
  if (!p || !p.price_instructions) { fallidos.push(id); continue; }
  const pi = p.price_instructions;
  const c = contenido(pi);
  precios[id] = {
    nombre: p.display_name,
    formato: [p.packaging, pi.unit_size ? `${pi.unit_size} ${pi.size_format}` : null].filter(Boolean).join(' · '),
    precio: Number(pi.unit_price),
    precioRef: Number(pi.reference_price),
    unidadRef: pi.reference_format,
    contenido: c.cantidad,
    unidadContenido: c.unidad,
    aproximado: !!pi.approx_size,
    imagen: p.thumbnail,
    url: p.share_url,
    categoria: p.categories?.[0]?.name || '',
    subcategoria: p.categories?.[0]?.categories?.[0]?.name || '',
    disponible: p.published !== false && !p.unavailable_from,
  };
  process.stdout.write('.');
  await espera(150);
}

const salida = `// Generado por scripts/actualizar-precios.mjs — no editar a mano.
export const PRECIOS_INFO = ${JSON.stringify({ almacen: ALMACEN, actualizado: new Date().toISOString() })};
export const PRECIOS = ${JSON.stringify(precios, null, 1)};
`;
await writeFile(path.join(RAIZ, 'src', 'data', 'precios.js'), salida);
console.log(`\n${Object.keys(precios).length} productos actualizados.`);
if (fallidos.length) {
  console.log(`No encontrados (revisa el id en data/alimentos.js): ${fallidos.join(', ')}`);
  process.exitCode = 1;
}
