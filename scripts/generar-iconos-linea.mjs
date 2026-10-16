// Extrae de @lucide/svelte solo los iconos de línea que usa la app → src/data/iconos-linea.js
// Uso: node scripts/generar-iconos-linea.mjs  (tras añadir emojis o iconos nuevos en src/lib/iconos.js)
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ICONOS = path.join(RAIZ, 'node_modules/@lucide/svelte/dist/icons');

// Nombres usados: los del mapa de emojis y cualquier n="…" / icono('…') en el código
const nombres = new Set(['circle-dot']);
const mapa = readFileSync(path.join(RAIZ, 'src/lib/iconos.js'), 'utf8');
for (const m of mapa.matchAll(/'[^']+':\s*'([a-z0-9-]+)'/g)) nombres.add(m[1]);
(function recorrer(dir) {
  for (const f of readdirSync(dir)) {
    const p = path.join(dir, f);
    if (statSync(p).isDirectory()) recorrer(p);
    else if (/\.(svelte|js)$/.test(f)) {
      const texto = readFileSync(p, 'utf8');
      for (const m of texto.matchAll(/\bn="([a-z0-9-]+)"/g)) nombres.add(m[1]);
      for (const m of texto.matchAll(/\bicono[A-Za-z]*:\s*'([a-z0-9-]+)'/g)) nombres.add(m[1]);
      for (const m of texto.matchAll(/(?:iconoSVG|nombreIcono)\('([a-z0-9-]+)'/g)) nombres.add(m[1]);
    }
  }
})(path.join(RAIZ, 'src'));

const trazos = {};
const faltan = [];
for (const n of [...nombres].sort()) {
  let fuente;
  try { fuente = readFileSync(path.join(ICONOS, `${n}.svelte`), 'utf8'); } catch { faltan.push(n); continue; }
  const m = fuente.match(/const iconData = (\{.*?\});/s);
  trazos[n] = JSON.parse(m[1]).node;
}
if (faltan.length) console.warn(`⚠️ No existen en Lucide: ${faltan.join(', ')}`);
writeFileSync(path.join(RAIZ, 'src/data/iconos-linea.js'),
  `// Generado por scripts/generar-iconos-linea.mjs a partir de Lucide (ISC). No editar a mano.\nexport const TRAZOS = ${JSON.stringify(trazos)};\n`);
console.log(`${Object.keys(trazos).length} iconos de línea → src/data/iconos-linea.js`);
