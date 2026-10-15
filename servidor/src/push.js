// Notificaciones Web Push (RFC 8291 cifrado aes128gcm + RFC 8292 VAPID) solo con WebCrypto.
const enc = new TextEncoder();

export const b64u = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
export const desdeB64u = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));

function unir(...partes) {
  const total = partes.reduce((a, p) => a + p.length, 0);
  const out = new Uint8Array(total);
  let i = 0;
  for (const p of partes) { out.set(p, i); i += p.length; }
  return out;
}

async function hkdf(salt, ikm, info, bytes) {
  const clave = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, clave, bytes * 8));
}

/** Claves VAPID del servidor: se crean solas la primera vez y se guardan en la base de datos. */
export async function clavesVapid(db) {
  const fila = await db.prepare("SELECT valor FROM ajustes WHERE clave = 'vapid'").first();
  if (fila) {
    const { privada, publica } = JSON.parse(fila.valor);
    return { publica, privada: await crypto.subtle.importKey('jwk', privada, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']) };
  }
  const par = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const privada = await crypto.subtle.exportKey('jwk', par.privateKey);
  const publica = b64u(await crypto.subtle.exportKey('raw', par.publicKey));
  await db.prepare("INSERT OR IGNORE INTO ajustes (clave, valor) VALUES ('vapid', ?)").bind(JSON.stringify({ privada, publica })).run();
  return clavesVapid(db); // por si otra petición la creó a la vez
}

async function jwtVapid(audiencia, vapid, contacto) {
  const cab = b64u(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const cuerpo = b64u(enc.encode(JSON.stringify({ aud: audiencia, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: contacto })));
  const firma = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, vapid.privada, enc.encode(`${cab}.${cuerpo}`));
  return `${cab}.${cuerpo}.${b64u(firma)}`;
}

/** Cifra el mensaje para una suscripción (aes128gcm, un único registro). */
export async function cifrarPush(suscripcion, texto, sal = crypto.getRandomValues(new Uint8Array(16)), parServidor = null) {
  const uaPublica = desdeB64u(suscripcion.keys.p256dh);
  const secreto = desdeB64u(suscripcion.keys.auth);
  const par = parServidor || await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const asPublica = new Uint8Array(await crypto.subtle.exportKey('raw', par.publicKey));
  const uaClave = await crypto.subtle.importKey('raw', uaPublica, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const compartido = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaClave }, par.privateKey, 256));
  const ikm = await hkdf(secreto, compartido, unir(enc.encode('WebPush: info\0'), uaPublica, asPublica), 32);
  const cek = await hkdf(sal, ikm, enc.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(sal, ikm, enc.encode('Content-Encoding: nonce\0'), 12);
  const clave = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const cifrado = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, clave, unir(enc.encode(texto), new Uint8Array([2]))));
  const rs = new Uint8Array([0, 0, 16, 0]); // 4096
  return unir(sal, rs, new Uint8Array([asPublica.length]), asPublica, cifrado);
}

/** Envía una notificación. Devuelve el código HTTP del servicio push (404/410 = suscripción caducada). */
export async function enviarPush(suscripcion, mensaje, vapid, contacto) {
  const destino = new URL(suscripcion.endpoint);
  const jwt = await jwtVapid(destino.origin, vapid, contacto);
  const cuerpo = await cifrarPush(suscripcion, JSON.stringify(mensaje));
  const r = await fetch(suscripcion.endpoint, {
    method: 'POST',
    headers: {
      Authorization: `vapid t=${jwt}, k=${vapid.publica}`,
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      TTL: '3600',
      Urgency: 'normal',
    },
    body: cuerpo,
  });
  return r.status;
}
