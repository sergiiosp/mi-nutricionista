// Respuestas HTTP con CORS (la app vive en GitHub Pages y el servidor en workers.dev).
export const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-Base, X-Fecha',
  'Access-Control-Expose-Headers': 'X-Rev',
  'Access-Control-Max-Age': '86400',
};

export const json = (datos, status = 200, extra = {}) => new Response(JSON.stringify(datos), { status, headers: { 'Content-Type': 'application/json', ...CORS, ...extra } });
export const error = (texto, status = 400) => json({ error: texto }, status);

export async function sha256(texto) {
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto));
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
