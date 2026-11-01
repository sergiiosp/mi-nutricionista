// Logo de Pulso: la P que late (la letra P con el latido dentro), blanca sobre negro.
// Escribe public/icons/icon.svg y los SVG de trabajo para sacar los PNG (con Edge sin ventana, ver abajo).
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TMP = path.join(RAIZ, 'brag-output/work/icono');
mkdirSync(TMP, { recursive: true });

// La marca en 512×512 (se usa también, en negro, en la cabecera de la app: App.svelte)
export const MARCA = '<path d="M150 410V102H286C358 102 404 148 404 210C404 272 358 318 286 318H150" fill="none" stroke="currentColor" stroke-width="44" stroke-linecap="round" stroke-linejoin="round"/><path d="M150 210H218L246 156L282 266L310 210H352" fill="none" stroke="currentColor" stroke-width="30" stroke-linecap="round" stroke-linejoin="round"/>';
const NEGRO = '#111114';
// escala: lo que ocupa la marca dentro del icono (0,62 normal; 0,5 en el «maskable», que Android recorta en círculo)
const icono = (redondo, escala) => {
  const t = (512 * (1 - escala)) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <!-- Pulso: la P que late (la letra P con el latido dentro) -->
  <rect width="512" height="512"${redondo ? ' rx="112"' : ''} fill="${NEGRO}"/>
  <g transform="translate(${t} ${t}) scale(${escala})" color="#fff">${MARCA}</g>
</svg>
`;
};

writeFileSync(path.join(RAIZ, 'public/icons/icon.svg'), icono(true, 0.62));
writeFileSync(path.join(TMP, 'redondo.svg'), icono(true, 0.62));
writeFileSync(path.join(TMP, 'cuadrado.svg'), icono(false, 0.62));
writeFileSync(path.join(TMP, 'maskable.svg'), icono(false, 0.5));
for (const n of ['redondo', 'cuadrado', 'maskable']) {
  writeFileSync(path.join(TMP, `${n}.html`), `<!doctype html><style>html,body{margin:0;background:transparent}img{display:block;width:512px;height:512px}</style><img src="${n}.svg">`);
}
console.log('ok');
