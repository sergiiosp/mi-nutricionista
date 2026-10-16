// Productos envasados de Mercadona para montar comidas: código de barras y alérgenos de la
// tienda online de Mercadona, macros de la etiqueta vía Open Food Facts (si falta o no cuadra,
// se usan los valores de referencia de esta lista). Escribe src/data/productos.js.
// Uso: node scripts/productos-mercadona.mjs
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

// clave, id Mercadona, grupo, dieta, macros de referencia por 100 g [kcal, p, c, g, fibra], extra
// (en extra, `al` añade alérgenos que la tienda no declara en la ficha)
const LISTA = [
  // Cereales y tortitas
  ['tortitas_maiz', '14158', 'hidrato', 'vegetal', [368, 7.5, 80, 1.8, 4], { unidad: { n: 'tortita', pl: 'tortitas', g: 7.5 }, redondeo: 'unidad' }],
  ['tortitas_maiz_campestre', '14786', 'hidrato', 'vegetal', [400, 8, 76, 7, 4], { unidad: { n: 'tortita', pl: 'tortitas', g: 8.5 }, redondeo: 'unidad' }],
  ['tortitas_maiz_jamon', '35776', 'hidrato', 'vegetal', [395, 8, 77, 5.5, 3.5], { unidad: { n: 'tortita', pl: 'tortitas', g: 8.5 }, redondeo: 'unidad' }],
  ['tortitas_maiz_chocolate', '14015', 'hidrato', 'vegetal', [480, 7, 62, 22, 4], { unidad: { n: 'tortita', pl: 'tortitas', g: 13 }, redondeo: 'unidad' }],
  ['tortitas_arroz_chocolate', '14142', 'hidrato', 'lacteo', [480, 7, 63, 22, 3], { unidad: { n: 'tortita', pl: 'tortitas', g: 16 }, redondeo: 'unidad' }],
  ['tortitas_arroz_choco_blanco', '14141', 'hidrato', 'lacteo', [490, 6, 63, 23, 1], { unidad: { n: 'tortita', pl: 'tortitas', g: 15 }, redondeo: 'unidad' }],
  ['tortitas_legumbres', '86483', 'hidrato', 'vegetal', [380, 14, 68, 4, 6], { unidad: { n: 'tortita', pl: 'tortitas', g: 9 }, redondeo: 'unidad' }],
  ['cereales_trigo_0', '9488', 'hidrato', 'vegetal', [375, 12, 74, 1.5, 8], {}],
  ['cereales_espelta_0', '9571', 'hidrato', 'vegetal', [370, 13, 70, 2.5, 9], { al: ['gluten'] }],
  ['cereales_fibra', '60236', 'hidrato', 'vegetal', [330, 14, 48, 3.5, 27], {}],
  ['avena_chocolate', '20292', 'hidrato', 'vegetal', [400, 11, 62, 9, 9], {}],
  ['granola', '9474', 'hidrato', 'vegetal', [450, 10, 60, 17, 7], { al: ['gluten', 'frutos_secos'] }],
  ['avena_sin_gluten', '86368', 'hidrato', 'vegetal', [370, 13, 59, 7, 10], {}],
  ['panecillos_tostados', '13445', 'hidrato', 'vegetal', [390, 13, 68, 5, 10], { al: ['gluten'], unidad: { n: 'panecillo', pl: 'panecillos', g: 9 }, redondeo: 'unidad' }],
  ['tortilla_trigo_integral', '80942', 'hidrato', 'vegetal', [300, 9, 48, 7, 6], { unidad: { n: 'tortilla', pl: 'tortillas', g: 60 }, redondeo: 'unidad' }],
  ['quinoa_cocida', '22278', 'hidrato', 'vegetal', [140, 4.5, 23, 2.5, 3], { unidad: { n: 'vasito', pl: 'vasitos', g: 125 } }],
  // Bebidas y lácteos
  ['bebida_avena', '23912', 'lacteo', 'vegetal', [45, 0.5, 7.5, 1.4, 0.8], { medida: 'ml' }],
  ['bebida_almendra', '23926', 'lacteo', 'vegetal', [15, 0.5, 0.3, 1.2, 0.3], { medida: 'ml' }],
  ['bebida_arroz', '23047', 'lacteo', 'vegetal', [50, 0.1, 10, 1, 0], { medida: 'ml' }],
  ['bebida_coco_arroz', '13846', 'lacteo', 'vegetal', [25, 0.1, 3, 1.2, 0], { medida: 'ml' }],
  ['leche_sin_lactosa', '10722', 'lacteo', 'lacteo', [46, 3.1, 4.7, 1.6, 0], { medida: 'ml' }],
  ['leche_proteinas', '10678', 'lacteo', 'lacteo', [49, 6, 6, 0.3, 0], { medida: 'ml' }],
  ['kefir', '20029', 'lacteo', 'lacteo', [58, 3.3, 4, 3.3, 0], {}],
  ['postre_proteinas_fresa', '20996', 'lacteo', 'lacteo', [65, 8.3, 7, 0.1, 0], { unidad: { n: 'tarrina', pl: 'tarrinas', g: 120 }, redondeo: 'unidad' }],
  ['postre_proteinas_arandanos', '21073', 'lacteo', 'lacteo', [65, 8.3, 7, 0.1, 0], { unidad: { n: 'tarrina', pl: 'tarrinas', g: 120 }, redondeo: 'unidad' }],
  ['postre_proteinas_coco', '52855', 'lacteo', 'lacteo', [65, 8.3, 7, 0.1, 0], { unidad: { n: 'tarrina', pl: 'tarrinas', g: 120 }, redondeo: 'unidad' }],
  ['postre_sin_lactosa', '20164', 'lacteo', 'lacteo', [40, 4.5, 5, 0.1, 0], {}],
  ['yogur_griego_ligero', '21358', 'lacteo', 'lacteo', [80, 6, 4.5, 2, 0], {}],
  // Extras y toppings
  ['matcha', '15099', 'otros', 'vegetal', [320, 30, 5, 5, 38], { fijo: 2 }],
  ['semillas_lino', '34962', 'grasa', 'vegetal', [530, 18, 2, 42, 27], {}],
  ['mezcla_semillas', '34963', 'grasa', 'vegetal', [560, 22, 10, 45, 12], {}],
  ['cacahuete_polvo', '13738', 'proteina', 'vegetal', [400, 50, 14, 12, 12], {}],
  ['crema_avellana', '11630', 'grasa', 'lacteo', [540, 6, 56, 32, 3], {}],
  ['frutos_secos_mix', '16833', 'grasa', 'vegetal', [600, 20, 12, 52, 8], { al: ['frutos_secos'] }],
  // Proteínas y platos
  ['salmon_ahumado', '53444', 'proteina', 'pescado', [180, 22, 0, 10, 0], {}],
  ['caballa_aceite', '13628', 'proteina', 'pescado', [220, 22, 0, 15, 0], { unidad: { n: 'lata', pl: 'latas', g: 90 }, redondeo: 'unidad' }],
  ['huevos_cocidos', '31010', 'proteina', 'huevo', [140, 12.5, 0.5, 10, 0], { unidad: { n: 'huevo', pl: 'huevos', g: 52 }, redondeo: 'unidad' }],
  ['pollo_asado', '13707', 'proteina', 'carne', [190, 25, 0.5, 10, 0], {}],
  ['edamame', '70740', 'proteina', 'vegetal', [125, 12, 4, 5.5, 5], {}],
  ['gazpacho', '15604', 'verdura', 'vegetal', [50, 1, 4, 3.5, 1], { medida: 'ml', al: ['verdura_cruda'] }],
  ['salmorejo', '39902', 'verdura', 'vegetal', [90, 1.5, 7, 6, 1], { medida: 'ml', al: ['verdura_cruda'] }],
];

// Alérgenos que declara Mercadona («Contiene …», no las trazas)
const ALERGENOS = [
  [/gluten|trigo|cebada|centeno|espelta|avena/i, 'gluten'],
  [/leche|lactosa/i, 'lactosa'],
  [/huevo/i, 'huevo'],
  [/soja/i, 'soja'],
  [/frutos de c[aá]scara|almendra|avellana|nuez|anacardo|pistacho|cacahuete/i, 'frutos_secos'],
  [/pescado/i, 'pescado'],
  [/crust[aá]ceo|molusco/i, 'marisco'],
];
function alergenos(texto = '') {
  const contiene = String(texto).replace(/<[^>]+>/g, '').split(/Puede contener|Trazas|trazas/)[0];
  return [...new Set(ALERGENOS.filter(([re]) => re.test(contiene)).map(([, a]) => a))];
}

async function json(url) {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': 'MiNutricionista/1.0 (uso personal)' } });
      if (r.ok) return await r.json();
      if (r.status === 404) return null;
    } catch { /* reintento */ }
    await espera(1500 * (i + 1));
  }
  return null;
}

const redondea = (x) => Math.round(x * 10) / 10;
const productos = {};
const informe = [];
for (const [clave, id, grupo, dieta, ref, { al: alExtra = [], ...resto }] of LISTA) {
  const m = await json(`https://tienda.mercadona.es/api/products/${id}/?lang=es&wh=mad1`);
  let macros = { kcal: ref[0], p: ref[1], c: ref[2], g: ref[3], f: ref[4] };
  let fuente = 'referencia';
  if (m?.ean) {
    const off = await json(`https://world.openfoodfacts.org/api/v2/product/${m.ean}.json?fields=nutriments`);
    const n = off?.product?.nutriments;
    if (n && n['energy-kcal_100g'] != null && n.proteins_100g != null && n.carbohydrates_100g != null && n.fat_100g != null) {
      const o = { kcal: n['energy-kcal_100g'], p: n.proteins_100g, c: n.carbohydrates_100g, g: n.fat_100g, f: n.fiber_100g ?? ref[4] };
      const calc = o.p * 4 + o.c * 4 + o.g * 9 + (o.f || 0) * 2;
      // Se acepta si es coherente y no se aleja una barbaridad de la referencia
      if (o.kcal > 0 && Math.abs(calc - o.kcal) / o.kcal < 0.2 && Math.abs(o.kcal - ref[0]) / ref[0] < 0.45) { macros = o; fuente = 'etiqueta'; }
    }
    await espera(400);
  }
  productos[clave] = {
    nombre: (m?.display_name || clave).replace(/\s+/g, ' ').trim(),
    kcal: Math.round(macros.kcal), p: redondea(macros.p), c: redondea(macros.c), g: redondea(macros.g), f: redondea(macros.f || 0),
    grupo, dieta, al: [...new Set([...(m ? alergenos(m.nutrition_information?.allergens) : []), ...alExtra])], mercadona: id, ...resto,
  };
  informe.push(`${fuente === 'etiqueta' ? '✓' : '·'} ${clave}: ${productos[clave].nombre} (${fuente})`);
}

await writeFile(path.join(RAIZ, 'src/data/productos.js'), `// Generado por scripts/productos-mercadona.mjs — productos de Mercadona con los macros de su etiqueta
// (Open Food Facts) y los alérgenos que declara la tienda. No editar a mano.
export const PRODUCTOS = ${JSON.stringify(productos, null, 1)};
`);
console.log(informe.join('\n'));
