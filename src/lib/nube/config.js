// Dirección del servidor (Cloudflare Worker). En desarrollo, el de `npm run dev` en servidor/.
const env = import.meta.env || {}; // (fuera de Vite, p. ej. en las pruebas con Node, no existe)
export const SERVIDOR = env.VITE_SERVIDOR || (env.DEV ? 'http://127.0.0.1:8787' : 'https://mi-nutricionista.mi-nutricionista-servidor.workers.dev');
