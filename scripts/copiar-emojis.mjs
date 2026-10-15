// Copia a public/emoji los iconos Fluent 3D (licencia MIT, Microsoft) de los emojis que usa la app.
// Busca emojis en src/ y los toma del paquete @lobehub/fluent-emoji-3d.
// Uso: node scripts/copiar-emojis.mjs <carpeta-del-paquete>/assets
import { readFileSync, readdirSync, statSync, copyFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ORIGEN = process.argv[2];
if (!ORIGEN || !existsSync(ORIGEN)) {
  console.error('Indica la carpeta assets del paquete @lobehub/fluent-emoji-3d (npm pack @lobehub/fluent-emoji-3d)');
  process.exit(1);
}
const DESTINO = path.join(RAIZ, 'public', 'emoji');
mkdirSync(DESTINO, { recursive: true });

export function codigoEmoji(e) {
  return [...e].map((c) => c.codePointAt(0).toString(16)).join('-');
}

function ficheros(dir) {
  return readdirSync(dir).flatMap((f) => {
    const ruta = path.join(dir, f);
    return statSync(ruta).isDirectory() ? ficheros(ruta) : /\.(js|svelte)$/.test(f) ? [ruta] : [];
  });
}

const segmentador = new Intl.Segmenter('es', { granularity: 'grapheme' });
const emojis = new Set();
for (const f of ficheros(path.join(RAIZ, 'src'))) {
  for (const { segment } of segmentador.segment(readFileSync(f, 'utf8'))) {
    if (/\p{Extended_Pictographic}/u.test(segment)) emojis.add(segment);
  }
}

const disponibles = [];
for (const e of emojis) {
  const conFe0f = codigoEmoji(e);
  const sinFe0f = conFe0f.replace(/-fe0f/g, '');
  const candidato = [conFe0f, sinFe0f, `${sinFe0f}-fe0f`].find((c) => existsSync(path.join(ORIGEN, `${c}.webp`)));
  if (!candidato) { console.log(`sin icono 3D: ${e} (${conFe0f})`); continue; }
  copyFileSync(path.join(ORIGEN, `${candidato}.webp`), path.join(DESTINO, `${sinFe0f}.webp`));
  disponibles.push(sinFe0f);
}
writeFileSync(path.join(RAIZ, 'src', 'data', 'emojis.js'),
  `// Generado por scripts/copiar-emojis.mjs — iconos Fluent 3D disponibles en public/emoji\nexport const EMOJIS_3D = new Set(${JSON.stringify(disponibles.sort())});\n`);
console.log(`${disponibles.length} iconos copiados`);
