// Descarga el catálogo de alimentación de la tienda online de Mercadona
// (API pública no oficial de tienda.mercadona.es) y lo guarda en
// data/catalogo-mercadona.json. Uso: node scripts/descargar-catalogo.mjs [almacen]
// El almacén por defecto es "mad1" (Madrid); los precios pueden variar por zona.

import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ALMACEN = process.argv[2] || 'mad1';
const BASE = 'https://tienda.mercadona.es/api';
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Subcategorías de alimentación (se omiten bebidas alcohólicas, limpieza, higiene, etc.)
const CATEGORIAS = [
  112, 115, 116, 117, // aceite, especias, salsas
  133, 135, // frutos secos, encurtidos
  118, 120, 121, // arroz, pasta, legumbres
  89, 90, 92, // azúcar, mermelada/miel, chocolate
  83, 86, 88, // café, cacao, infusiones
  37, 38, 40, 42, 43, 44, 45, 46, 47, // carne
  78, 79, 80, // cereales, tortitas, galletas
  48, 50, 51, 52, 53, 54, 56, // charcutería y quesos
  145, 147, 148, 149, 150, // congelados
  122, 123, 126, 127, 129, 130, // conservas
  27, 28, 29, // fruta y verdura
  72, 75, 77, // leche, mantequilla, huevos
  31, 32, 34, 36, // pescado y marisco
  59, 60, 62, 69, // pan y harinas
  140, 142, 897, // platos preparados
  103, 104, 105, 106, 109, // yogures
  98, 99, 143, // zumos
];

const espera = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJson(url) {
  for (let intento = 1; intento <= 3; intento++) {
    const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (res.ok) return res.json();
    console.warn(`  ${res.status} en ${url} (intento ${intento})`);
    await espera(1500 * intento);
  }
  throw new Error(`No se pudo descargar ${url}`);
}

function simplificar(p, categoria) {
  const pi = p.price_instructions;
  return {
    id: p.id,
    nombre: p.display_name,
    formato: [p.packaging, pi.unit_size ? `${pi.unit_size} ${pi.size_format}` : null].filter(Boolean).join(' · '),
    precio: Number(pi.unit_price), // precio del envase / unidad
    tamano: pi.unit_size, // tamaño del envase en size_format
    unidadTamano: pi.size_format, // kg, l, ud...
    precioRef: Number(pi.reference_price), // precio por kg / l
    unidadRef: pi.reference_format,
    pesoAproximado: pi.approx_size,
    granel: pi.selling_method === 2,
    imagen: p.thumbnail,
    url: p.share_url,
    categoria,
  };
}

const productos = {};
for (const id of CATEGORIAS) {
  const cat = await getJson(`${BASE}/categories/${id}/?lang=es&wh=${ALMACEN}`);
  let n = 0;
  for (const sub of cat.categories || []) {
    for (const p of sub.products || []) {
      productos[p.id] = simplificar(p, `${cat.name} › ${sub.name}`);
      n++;
    }
  }
  console.log(`${cat.name}: ${n} productos`);
  await espera(250);
}

const salida = {
  almacen: ALMACEN,
  actualizado: new Date().toISOString(),
  productos,
};
await writeFile(path.join(RAIZ, 'data', 'catalogo-mercadona.json'), JSON.stringify(salida, null, 1));
console.log(`\nTotal: ${Object.keys(productos).length} productos guardados.`);
