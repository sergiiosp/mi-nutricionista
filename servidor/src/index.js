// Servidor de Mi Nutricionista: sincronización cifrada entre dispositivos, copias diarias,
// y recordatorios (Web Push). Cloudflare Workers + D1, plan gratuito.
import { clavesVapid, enviarPush } from './push.js';
import { buzon } from './buzon.js';
import { CORS, json, error, sha256 } from './util.js';

const MAX_DATOS = 1_800_000; // bytes (D1 admite filas de hasta 2 MB)
const DIAS_COPIAS = 30;
const MIN = 60_000;

// D1 devuelve los BLOB como ArrayBuffer o como lista de números según la versión
const binario = (datos, extra = {}) => new Response(new Uint8Array(datos), { headers: { 'Content-Type': 'application/octet-stream', 'Cache-Control': 'no-store', ...CORS, ...extra } });

/** La cuenta se identifica por el hash del token (el token sale de tu clave secreta, que nunca llega aquí). */
async function cuentaDe(req, env) {
  const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  if (!/^[\w-]{40,}$/.test(token)) return null;
  const id = await sha256(token);
  const fila = await env.DB.prepare('SELECT id, rev FROM cuentas WHERE id = ?').bind(id).first();
  return fila ? { id, rev: fila.rev } : { id, rev: null };
}

async function rutas(req, env, url) {
  const { pathname: p } = url;
  const m = req.method;
  const ahora = Date.now();

  // ── Sin cuenta ─────────────────────────────────────────────────────────
  if (p === '/' && m === 'GET') return json({ ok: true, app: 'Mi Nutricionista' });
  if (p === '/avisos/clave' && m === 'GET') return json({ clave: (await clavesVapid(env.DB)).publica });
  if (p === '/emparejar/canjear' && m === 'POST') {
    const { codigo } = await req.json();
    const fila = await env.DB.prepare('SELECT sobre, expira FROM emparejamientos WHERE codigo = ?').bind(String(codigo)).first();
    if (!fila || fila.expira < ahora) return error('Código incorrecto o caducado', 404);
    await env.DB.prepare('DELETE FROM emparejamientos WHERE codigo = ?').bind(String(codigo)).run();
    return json({ sobre: fila.sobre });
  }
  // Buzón de notas (tiene su propia clave: no hace falta la sincronización)
  if (p === '/buzon' || p.startsWith('/buzon/')) return buzon(req, env, url, ahora);

  // ── Con cuenta ─────────────────────────────────────────────────────────
  const cuenta = await cuentaDe(req, env);
  if (!cuenta) return error('Falta la clave de la cuenta', 401);

  if (p === '/cuenta' && m === 'POST') {
    if (cuenta.rev === null) {
      const { n } = await env.DB.prepare('SELECT COUNT(*) AS n FROM cuentas').first();
      if (n >= Number(env.MAX_CUENTAS || 3)) return error('Este servidor ya no admite más cuentas', 403);
      await env.DB.prepare('INSERT INTO cuentas (id, rev, creado) VALUES (?, 0, ?)').bind(cuenta.id, ahora).run();
    }
    return json({ ok: true, rev: cuenta.rev ?? 0 });
  }
  if (cuenta.rev === null) return error('Cuenta no encontrada', 404);

  if (p === '/cuenta' && m === 'DELETE') {
    const subs = await env.DB.prepare('SELECT endpoint FROM suscripciones WHERE cuenta = ?').bind(cuenta.id).all();
    await env.DB.batch([
      ...subs.results.map((s) => env.DB.prepare('DELETE FROM avisos WHERE endpoint = ?').bind(s.endpoint)),
      env.DB.prepare('DELETE FROM suscripciones WHERE cuenta = ?').bind(cuenta.id),
      env.DB.prepare('DELETE FROM copias WHERE cuenta = ?').bind(cuenta.id),
      env.DB.prepare('DELETE FROM cuentas WHERE id = ?').bind(cuenta.id),
    ]);
    return json({ ok: true });
  }

  // Datos sincronizados (un único bloque cifrado con número de revisión)
  if (p === '/datos' && m === 'GET') {
    const desde = Number(url.searchParams.get('desde') ?? -1);
    if (desde === cuenta.rev) return new Response(null, { status: 204, headers: { ...CORS, 'X-Rev': String(cuenta.rev) } });
    const fila = await env.DB.prepare('SELECT rev, datos FROM cuentas WHERE id = ?').bind(cuenta.id).first();
    if (!fila.datos) return new Response(null, { status: 204, headers: { ...CORS, 'X-Rev': String(fila.rev) } });
    return binario(fila.datos, { 'X-Rev': String(fila.rev) });
  }
  if (p === '/datos' && m === 'PUT') {
    const base = Number(req.headers.get('X-Base'));
    const datos = new Uint8Array(await req.arrayBuffer());
    if (!datos.length || datos.length > MAX_DATOS) return error('Tamaño no válido', 413);
    const res = await env.DB.prepare('UPDATE cuentas SET rev = rev + 1, datos = ?, tam = ?, actualizado = ? WHERE id = ? AND rev = ?')
      .bind(datos, datos.length, ahora, cuenta.id, base).run();
    if (!res.meta.changes) return json({ error: 'Hay cambios más nuevos en el servidor', rev: cuenta.rev }, 409);
    // Copia de seguridad del día (la última versión de cada día, durante 30 días)
    const fecha = /^\d{4}-\d{2}-\d{2}$/.test(req.headers.get('X-Fecha') || '') ? req.headers.get('X-Fecha') : new Date().toISOString().slice(0, 10);
    const limite = new Date(ahora - DIAS_COPIAS * 86400000).toISOString().slice(0, 10);
    await env.DB.batch([
      env.DB.prepare('INSERT OR REPLACE INTO copias (cuenta, fecha, rev, datos, tam) VALUES (?, ?, ?, ?, ?)').bind(cuenta.id, fecha, base + 1, datos, datos.length),
      env.DB.prepare('DELETE FROM copias WHERE cuenta = ? AND fecha < ?').bind(cuenta.id, limite),
    ]);
    return json({ rev: base + 1 });
  }

  // Copias de seguridad
  if (p === '/copias' && m === 'GET') {
    const { results } = await env.DB.prepare('SELECT fecha, rev, tam FROM copias WHERE cuenta = ? ORDER BY fecha DESC').bind(cuenta.id).all();
    return json(results);
  }
  const copia = p.match(/^\/copias\/(\d{4}-\d{2}-\d{2})$/);
  if (copia && m === 'GET') {
    const fila = await env.DB.prepare('SELECT datos FROM copias WHERE cuenta = ? AND fecha = ?').bind(cuenta.id, copia[1]).first();
    return fila ? binario(fila.datos) : error('No existe esa copia', 404);
  }

  // Vincular otro dispositivo: se guarda tu clave cifrada con un código de un solo uso (10 min)
  if (p === '/emparejar' && m === 'POST') {
    const { codigo, sobre } = await req.json();
    if (!/^[\w-]{20,}$/.test(codigo) || typeof sobre !== 'string' || sobre.length > 500) return error('Datos no válidos');
    await env.DB.prepare('INSERT OR REPLACE INTO emparejamientos (codigo, sobre, expira) VALUES (?, ?, ?)').bind(codigo, sobre, ahora + 10 * MIN).run();
    return json({ ok: true, expira: ahora + 10 * MIN });
  }

  // Recordatorios: cada dispositivo guarda su suscripción push y su lista de avisos
  if (p === '/avisos' && m === 'PUT') {
    const { suscripcion, lista } = await req.json();
    if (!suscripcion?.endpoint?.startsWith('https://') || !suscripcion.keys?.p256dh || !suscripcion.keys?.auth) return error('Suscripción no válida');
    if (!Array.isArray(lista) || lista.length > 300) return error('Lista no válida');
    const ep = suscripcion.endpoint;
    const corta = (s, n) => String(s || '').slice(0, n);
    await env.DB.batch([
      env.DB.prepare('INSERT OR REPLACE INTO suscripciones (endpoint, cuenta, datos, creado) VALUES (?, ?, ?, ?)').bind(ep, cuenta.id, JSON.stringify(suscripcion), ahora),
      env.DB.prepare('DELETE FROM avisos WHERE endpoint = ?').bind(ep),
      ...lista.filter((a) => Number(a.t) > ahora).map((a) => env.DB.prepare('INSERT INTO avisos (endpoint, t, titulo, cuerpo, url, etiqueta) VALUES (?, ?, ?, ?, ?, ?)')
        .bind(ep, Number(a.t), corta(a.titulo, 80), corta(a.cuerpo, 200), corta(a.url, 100), corta(a.etiqueta, 40))),
    ]);
    return json({ ok: true, programados: lista.length });
  }
  if (p === '/avisos' && m === 'DELETE') {
    const { endpoint } = await req.json();
    await env.DB.batch([
      env.DB.prepare('DELETE FROM avisos WHERE endpoint = ?').bind(String(endpoint)),
      env.DB.prepare('DELETE FROM suscripciones WHERE endpoint = ? AND cuenta = ?').bind(String(endpoint), cuenta.id),
    ]);
    return json({ ok: true });
  }
  if (p === '/avisos/prueba' && m === 'POST') {
    const { endpoint } = await req.json();
    const fila = await env.DB.prepare('SELECT datos FROM suscripciones WHERE endpoint = ? AND cuenta = ?').bind(String(endpoint), cuenta.id).first();
    if (!fila) return error('Este dispositivo no tiene los avisos activados', 404);
    const status = await enviarPush(JSON.parse(fila.datos), { titulo: '¡Avisos activados! 🔔', cuerpo: 'Así te llegarán los recordatorios de comidas, entreno y suplementos.', url: '#hoy' }, await clavesVapid(env.DB), env.APP_URL);
    return json({ ok: status < 300, status });
  }

  return error('No encontrado', 404);
}

/** Cron: envía los avisos que ya tocan (con 15 min de margen) y limpia lo caducado. */
async function enviarPendientes(env) {
  const ahora = Date.now();
  const { results } = await env.DB.prepare(
    'SELECT a.rowid AS id, a.endpoint, a.t, a.titulo, a.cuerpo, a.url, a.etiqueta, s.datos FROM avisos a JOIN suscripciones s ON s.endpoint = a.endpoint WHERE a.t <= ? ORDER BY a.t LIMIT 50',
  ).bind(ahora).all();
  if (results.length) {
    const vapid = await clavesVapid(env.DB);
    const caducadas = new Set();
    for (const a of results) {
      if (caducadas.has(a.endpoint) || a.t < ahora - 15 * MIN) continue; // demasiado tarde: no molesta
      try {
        const status = await enviarPush(JSON.parse(a.datos), { titulo: a.titulo, cuerpo: a.cuerpo, url: a.url, etiqueta: a.etiqueta }, vapid, env.APP_URL);
        if (status === 404 || status === 410) caducadas.add(a.endpoint);
      } catch { /* si falla, el aviso se descarta */ }
    }
    await env.DB.batch([
      ...results.map((a) => env.DB.prepare('DELETE FROM avisos WHERE rowid = ?').bind(a.id)),
      ...[...caducadas].flatMap((ep) => [
        env.DB.prepare('DELETE FROM avisos WHERE endpoint = ?').bind(ep),
        env.DB.prepare('DELETE FROM suscripciones WHERE endpoint = ?').bind(ep),
      ]),
    ]);
  }
  await env.DB.prepare('DELETE FROM emparejamientos WHERE expira < ?').bind(ahora).run();
}

export default {
  async fetch(req, env) {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    try {
      return await rutas(req, env, new URL(req.url));
    } catch (e) {
      return error(`Error del servidor: ${e.message}`, 500);
    }
  },
  async scheduled(_ev, env, ctx) {
    ctx.waitUntil(enviarPendientes(env));
  },
};
