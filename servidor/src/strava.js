// Conexión con Strava (OAuth). El secreto de la aplicación vive solo en el servidor (wrangler secret).
// Apple Watch → app Salud → Strava → aquí: los entrenos del reloj llegan igual.
import { json } from './util.js';

const API = 'https://www.strava.com/api/v3';
const MIN = 60_000;

const pagina = (titulo, texto, enlace) => new Response(`<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${titulo}</title><body style="font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:90vh;margin:0;padding:16px;background:#f3faf6;color:#163a2c;text-align:center">
<div><h1 style="font-size:1.5rem">${titulo}</h1><p>${texto}</p><p><a href="${enlace}" style="display:inline-block;padding:12px 20px;border-radius:14px;background:#12a86b;color:#fff;font-weight:700;text-decoration:none">Volver a Mi Nutricionista</a></p></div></body></html>`,
{ headers: { 'Content-Type': 'text/html; charset=utf-8' } });

export async function iniciarStrava(cuenta, env, url) {
  if (!env.STRAVA_CLIENT_ID || !env.STRAVA_SECRET) return json({ error: 'Strava aún no está configurado en el servidor' }, 503);
  const estado = crypto.randomUUID();
  await env.DB.prepare('INSERT INTO strava_estados (estado, cuenta, expira) VALUES (?, ?, ?)').bind(estado, cuenta, Date.now() + 15 * MIN).run();
  const auth = new URL('https://www.strava.com/oauth/authorize');
  auth.search = new URLSearchParams({
    client_id: env.STRAVA_CLIENT_ID,
    redirect_uri: `${url.origin}/strava/vuelta`,
    response_type: 'code',
    approval_prompt: 'auto',
    scope: 'activity:read_all',
    state: estado,
  });
  return json({ url: auth.toString() });
}

export async function vueltaStrava(url, env) {
  const volver = `${env.APP_URL}#ajustes/conectar`;
  const estado = url.searchParams.get('state') || '';
  const fila = await env.DB.prepare('SELECT cuenta, expira FROM strava_estados WHERE estado = ?').bind(estado).first();
  await env.DB.prepare('DELETE FROM strava_estados WHERE estado = ?').bind(estado).run();
  if (!fila || fila.expira < Date.now()) return pagina('Enlace caducado', 'Vuelve a la app y pulsa otra vez «Conectar con Strava».', volver);
  if (url.searchParams.get('error')) return pagina('Conexión cancelada', 'No has dado permiso a la app para leer tus entrenos.', volver);
  if (!(url.searchParams.get('scope') || '').includes('activity:read')) {
    return pagina('Falta un permiso', 'Para importar tus entrenos marca la casilla «Ver datos sobre tus actividades».', volver);
  }
  const r = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: env.STRAVA_CLIENT_ID, client_secret: env.STRAVA_SECRET, code: url.searchParams.get('code'), grant_type: 'authorization_code' }),
  });
  if (!r.ok) return pagina('No se pudo conectar', 'Strava no ha aceptado la conexión. Inténtalo de nuevo en un rato.', volver);
  const t = await r.json();
  const nombre = [t.athlete?.firstname, t.athlete?.lastname].filter(Boolean).join(' ');
  await env.DB.prepare('INSERT OR REPLACE INTO strava (cuenta, atleta, nombre, foto, acceso, refresco, expira, conectado) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(fila.cuenta, t.athlete?.id || null, nombre, t.athlete?.profile_medium || '', t.access_token, t.refresh_token, t.expires_at * 1000, Date.now()).run();
  return pagina('¡Strava conectado! 🎉', 'Tus entrenos se importarán solos y se darán por hechos en tu plan. Ya puedes volver a la app.', volver);
}

/** Token de acceso válido (lo renueva si caduca en menos de 5 minutos). */
async function acceso(cuenta, env) {
  const s = await env.DB.prepare('SELECT * FROM strava WHERE cuenta = ?').bind(cuenta).first();
  if (!s) return null;
  if (s.expira > Date.now() + 5 * MIN) return s.acceso;
  const r = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: env.STRAVA_CLIENT_ID, client_secret: env.STRAVA_SECRET, refresh_token: s.refresco, grant_type: 'refresh_token' }),
  });
  if (!r.ok) {
    if (r.status === 400 || r.status === 401) await env.DB.prepare('DELETE FROM strava WHERE cuenta = ?').bind(cuenta).run(); // permiso retirado
    return null;
  }
  const t = await r.json();
  await env.DB.prepare('UPDATE strava SET acceso = ?, refresco = ?, expira = ? WHERE cuenta = ?').bind(t.access_token, t.refresh_token, t.expires_at * 1000, cuenta).run();
  return t.access_token;
}

export async function estadoStrava(cuenta, env) {
  const s = await env.DB.prepare('SELECT nombre, foto, conectado FROM strava WHERE cuenta = ?').bind(cuenta).first();
  return json({ configurado: !!(env.STRAVA_CLIENT_ID && env.STRAVA_SECRET), conectado: !!s, nombre: s?.nombre || '', foto: s?.foto || '', desde: s?.conectado || null });
}

/** Actividades desde una fecha (segundos epoch), resumidas a lo que usa la app. */
export async function actividadesStrava(cuenta, env, url) {
  const token = await acceso(cuenta, env);
  if (!token) return json({ error: 'Strava no está conectado', conectado: false }, 409);
  const despues = Math.max(0, Number(url.searchParams.get('despues')) || Math.floor(Date.now() / 1000) - 7 * 86400);
  const r = await fetch(`${API}/athlete/activities?after=${despues}&per_page=100`, { headers: { Authorization: `Bearer ${token}` } });
  if (r.status === 429) return json({ error: 'Strava pide esperar un poco (límite de peticiones)' }, 429);
  if (!r.ok) return json({ error: `Strava respondió ${r.status}` }, 502);
  const lista = (await r.json()).map((a) => ({
    id: String(a.id),
    nombre: a.name,
    tipo: a.sport_type || a.type,
    inicio: a.start_date_local?.slice(0, 16), // hora local: AAAA-MM-DDTHH:MM
    duracion: a.moving_time, // s
    total: a.elapsed_time, // s
    distancia: a.distance, // m
    desnivel: a.total_elevation_gain,
    fc: a.average_heartrate ? Math.round(a.average_heartrate) : null,
    kj: a.kilojoules || null,
  }));
  return json(lista);
}

export async function desconectarStrava(cuenta, env) {
  const s = await env.DB.prepare('SELECT acceso FROM strava WHERE cuenta = ?').bind(cuenta).first();
  if (!s) return;
  const token = await acceso(cuenta, env).catch(() => null);
  if (token) await fetch('https://www.strava.com/oauth/deauthorize', { method: 'POST', headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
  await env.DB.prepare('DELETE FROM strava WHERE cuenta = ?').bind(cuenta).run();
}
