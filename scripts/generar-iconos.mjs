// Genera los iconos PNG de la PWA (192 y 512 px) sin dependencias, dibujando la misma
// figura que icons/icon.svg con supermuestreo. Uso: node scripts/generar-iconos.mjs
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const VERDE = [0x12, 0xa8, 0x6b];
const BLANCO = [255, 255, 255];
const MENTA = [0x9b, 0xe2, 0xb8];

// Hojas aproximadas como elipses giradas (coordenadas en el lienzo de 512)
const enElipse = (x, y, cx, cy, rx, ry, ang) => {
  const c = Math.cos(ang); const s = Math.sin(ang);
  const dx = x - cx; const dy = y - cy;
  const u = (dx * c + dy * s) / rx; const v = (-dx * s + dy * c) / ry;
  return u * u + v * v <= 1;
};

function colorEn(x, y, maskable) {
  // Fondo redondeado (en el maskable se rellena entero)
  const r = 112;
  const fuera = !maskable && ((x < r && y < r && (x - r) ** 2 + (y - r) ** 2 > r * r)
    || (x > 512 - r && y < r && (x - 512 + r) ** 2 + (y - r) ** 2 > r * r)
    || (x < r && y > 512 - r && (x - r) ** 2 + (y - 512 + r) ** 2 > r * r)
    || (x > 512 - r && y > 512 - r && (x - 512 + r) ** 2 + (y - 512 + r) ** 2 > r * r));
  if (fuera) return null;
  // En el maskable, el dibujo se reduce al 80 % para respetar la zona segura
  const k = maskable ? 0.8 : 1;
  const px = 256 + (x - 256) / k; const py = 256 + (y - 256) / k;
  const d = Math.hypot(px - 256, py - 276);
  if (Math.abs(d - 150) <= 14) return BLANCO;
  if (enElipse(px, py, 300, 248, 30, 92, 0.75)) return MENTA;
  if (enElipse(px, py, 230, 268, 24, 66, -0.45)) return BLANCO;
  return VERDE;
}

function png(tam, maskable) {
  const SS = 4;
  const filas = [];
  for (let y = 0; y < tam; y++) {
    const fila = Buffer.alloc(1 + tam * 4);
    for (let x = 0; x < tam; x++) {
      let r = 0; let g = 0; let b = 0; let a = 0;
      for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) {
        const c = colorEn(((x + (sx + 0.5) / SS) * 512) / tam, ((y + (sy + 0.5) / SS) * 512) / tam, maskable);
        if (c) { r += c[0]; g += c[1]; b += c[2]; a += 255; }
      }
      const n = SS * SS; const al = a / n;
      const o = 1 + x * 4;
      fila[o] = al ? Math.round((r / n) * (255 / al)) : 0;
      fila[o + 1] = al ? Math.round((g / n) * (255 / al)) : 0;
      fila[o + 2] = al ? Math.round((b / n) * (255 / al)) : 0;
      fila[o + 3] = Math.round(al);
    }
    filas.push(fila);
  }
  const crc = (buf) => {
    let c = ~0;
    for (const byte of buf) { c ^= byte; for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1)); }
    return ~c >>> 0;
  };
  const trozo = (tipo, datos) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(datos.length);
    const td = Buffer.concat([Buffer.from(tipo), datos]);
    const c = Buffer.alloc(4); c.writeUInt32BE(crc(td));
    return Buffer.concat([len, td, c]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(tam, 0); ihdr.writeUInt32BE(tam, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    trozo('IHDR', ihdr), trozo('IDAT', deflateSync(Buffer.concat(filas))), trozo('IEND', Buffer.alloc(0)),
  ]);
}

writeFileSync(path.join(RAIZ, 'icons', 'icon-192.png'), png(192, true));
writeFileSync(path.join(RAIZ, 'icons', 'icon-512.png'), png(512, true));
console.log('Iconos generados en icons/');
