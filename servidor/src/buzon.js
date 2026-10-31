// Buzón: notas desde la app (fallos, ideas, dudas sobre la dieta o los entrenos) que se revisan en las
// sesiones de mejora desde el ordenador (scripts/buzon.mjs, con wrangler) y vuelven a la app con su estado
// y la respuesta. Queda ligado al primer móvil que escribe; scripts/buzon.mjs nuevo-movil lo desliga.
import { json, error, sha256 } from './util.js';

const MAX_TEXTO = 3000;
const MAX_CONTEXTO = 30_000;
const MAX_FOTO = 1_400_000; // captura en JPEG como data URL (D1 admite filas de hasta 2 MB)
const MAX_DIA = 60; // notas en 24 h: de sobra para una persona y un tope si alguien abusa
const TIPOS = ['fallo', 'idea', 'nocuadra', 'pregunta', 'nota'];
const TEMAS = ['app', 'dieta', 'entreno'];

export async function buzon(req, env, url, ahora) {
  const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  if (!/^[\w-]{40,}$/.test(token)) return error('Falta la clave del buzón', 401);
  const quien = await sha256(`buzon:${token}`);
  const leerDueno = async () => (await env.DB.prepare("SELECT valor FROM ajustes WHERE clave = 'buzon_dueno'").first())?.valor || null;
  let dueno = await leerDueno();
  if (dueno && dueno !== quien) return error('Este buzón está ligado a otro móvil', 403);
  const { pathname: p } = url;
  const m = req.method;

  // Tus notas, con su estado y la respuesta (sin las capturas)
  if (p === '/buzon' && m === 'GET') {
    if (!dueno) return json([]);
    const { results } = await env.DB.prepare('SELECT id, creada, tipo, tema, texto, estado, respuesta, actualizada, foto IS NOT NULL AS conFoto FROM buzon ORDER BY creada DESC LIMIT 200').all();
    return json(results.map((n) => ({ ...n, conFoto: !!n.conFoto })));
  }

  if (p === '/buzon' && m === 'POST') {
    const n = await req.json().catch(() => null);
    if (!n || !/^[\w-]{8,64}$/.test(n.id || '')) return error('Nota no válida');
    const texto = String(n.texto || '').trim();
    if (!texto || texto.length > MAX_TEXTO) return error('Escribe algo (como mucho 3.000 letras)');
    const contexto = n.contexto ? JSON.stringify(n.contexto) : null;
    if (contexto && contexto.length > MAX_CONTEXTO) return error('Demasiado contexto', 413);
    const foto = typeof n.foto === 'string' && n.foto.startsWith('data:image/') ? n.foto : null;
    if (foto && foto.length > MAX_FOTO) return error('La captura es demasiado grande', 413);
    // El primer móvil que escribe se queda el buzón
    if (!dueno) {
      await env.DB.prepare("INSERT OR IGNORE INTO ajustes (clave, valor) VALUES ('buzon_dueno', ?)").bind(quien).run();
      dueno = await leerDueno();
      if (dueno !== quien) return error('Este buzón está ligado a otro móvil', 403);
    }
    const { n: hoy } = await env.DB.prepare('SELECT COUNT(*) AS n FROM buzon WHERE creada > ?').bind(ahora - 86_400_000).first();
    if (hoy >= MAX_DIA) return error('Demasiadas notas en un día: prueba mañana', 429);
    const creada = Number(n.creada) > 0 && Number(n.creada) <= ahora + 60_000 ? Number(n.creada) : ahora;
    await env.DB.prepare('INSERT OR IGNORE INTO buzon (id, creada, tipo, tema, texto, contexto, foto, estado, actualizada) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(n.id, creada, TIPOS.includes(n.tipo) ? n.tipo : 'nota', TEMAS.includes(n.tema) ? n.tema : 'app', texto, contexto, foto, 'enviada', ahora).run();
    return json({ ok: true, id: n.id });
  }

  // Borrar una nota que aún no se ha revisado
  const borrar = p.match(/^\/buzon\/([\w-]{8,64})$/);
  if (borrar && m === 'DELETE') {
    const res = await env.DB.prepare("DELETE FROM buzon WHERE id = ? AND estado IN ('enviada', 'vista')").bind(borrar[1]).run();
    return json({ ok: true, borrada: res.meta.changes > 0 });
  }

  return error('No encontrado', 404);
}
