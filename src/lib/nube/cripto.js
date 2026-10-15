// Cifrado de extremo a extremo: tus datos salen del dispositivo comprimidos y cifrados con tu clave.
// El servidor solo ve un bloque ilegible y un token derivado de la clave (nunca la clave).
const enc = new TextEncoder();
const dec = new TextDecoder();

export const b64u = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
export const desdeB64u = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));

const sha = async (texto) => new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(texto)));
const llaveAES = async (bytes) => crypto.subtle.importKey('raw', bytes, 'AES-GCM', false, ['encrypt', 'decrypt']);

/** Clave secreta nueva (24 bytes aleatorios, 32 caracteres). */
export const nuevaClave = () => b64u(crypto.getRandomValues(new Uint8Array(24)));
export const claveValida = (c) => typeof c === 'string' && /^[\w-]{32}$/.test(c);

/** Token para identificarte ante el servidor y llave para cifrar, ambos derivados de la clave. */
export async function derivar(clave) {
  return { token: b64u(await sha(`token:${clave}`)), llave: await llaveAES(await sha(`cifrado:${clave}`)) };
}

async function transformar(bytes, flujo) {
  return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(flujo)).arrayBuffer());
}

async function cifrarBytes(llave, bytes) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cifrado = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, llave, bytes));
  const out = new Uint8Array(12 + cifrado.length);
  out.set(iv);
  out.set(cifrado, 12);
  return out;
}
const descifrarBytes = async (llave, datos) => new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: datos.slice(0, 12) }, llave, datos.slice(12)));

/** Objeto → bytes cifrados. Primer byte: 1 = comprimido con gzip, 0 = sin comprimir. */
export async function cifrar(llave, objeto) {
  let bytes = enc.encode(JSON.stringify(objeto));
  let formato = 0;
  if (typeof CompressionStream !== 'undefined') {
    bytes = await transformar(bytes, new CompressionStream('gzip'));
    formato = 1;
  }
  const cuerpo = new Uint8Array(bytes.length + 1);
  cuerpo[0] = formato;
  cuerpo.set(bytes, 1);
  return cifrarBytes(llave, cuerpo);
}

export async function descifrar(llave, datos) {
  const cuerpo = await descifrarBytes(llave, new Uint8Array(datos));
  const bytes = cuerpo[0] === 1 ? await transformar(cuerpo.slice(1), new DecompressionStream('gzip')) : cuerpo.slice(1);
  return JSON.parse(dec.decode(bytes));
}

// ── Código para vincular otro dispositivo ────────────────────────────────
const LETRAS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin 0/O ni 1/I

export function nuevoCodigo() {
  const r = crypto.getRandomValues(new Uint8Array(8));
  return [...r].map((x) => LETRAS[x % 32]).join('');
}
export const limpiarCodigo = (c) => String(c).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
export const formatoCodigo = (c) => `${c.slice(0, 4)}-${c.slice(4)}`;

/** El servidor guarda la clave cifrada con el código; solo quien tenga el código puede abrirla. */
export async function sobreDeCodigo(codigo, clave) {
  const llave = await llaveAES(await sha(`emparejar:${codigo}`));
  return { id: b64u(await sha(`emparejar-id:${codigo}`)), sobre: b64u(await cifrarBytes(llave, enc.encode(clave))) };
}
export async function abrirSobre(codigo, sobre) {
  const llave = await llaveAES(await sha(`emparejar:${codigo}`));
  return dec.decode(await descifrarBytes(llave, desdeB64u(sobre)));
}
export const idDeCodigo = async (codigo) => b64u(await sha(`emparejar-id:${codigo}`));
