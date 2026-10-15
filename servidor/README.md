# Servidor de Mi Nutricionista

Cloudflare Worker + base de datos D1 (plan gratuito: 100.000 peticiones al día). Hace tres cosas:

- **Sincronización** entre dispositivos: guarda un único bloque con tus datos **cifrado en el dispositivo** (AES-GCM con una clave que nunca sale de tus dispositivos). El servidor no puede leerlo.
- **Copias de seguridad**: la última versión de cada día, durante 30 días.
- **Recordatorios**: guarda los avisos que calcula cada dispositivo y los envía a su hora (Web Push, cada 5 minutos).

## Puesta en marcha

```bash
npm install
```

```bash
npx wrangler login
```

```bash
npx wrangler d1 create mi-nutricionista
```

Copia el `database_id` que aparece en `wrangler.toml` y crea las tablas:

```bash
npm run tablas
```

```bash
npm run deploy
```

La dirección que da (`https://mi-nutricionista.<tu-subdominio>.workers.dev`) va en `src/lib/nube/config.js` de la app.

## Desarrollo local

```bash
npm run tablas-local
```

```bash
npm run dev
```

El servidor queda en http://127.0.0.1:8787 y la app en modo desarrollo (`npm run dev` en la raíz) lo usa automáticamente. Para lanzar el cron a mano: `curl "http://127.0.0.1:8787/__scheduled?cron=*/5+*+*+*+*"`.

`MAX_CUENTAS` (en `wrangler.toml`) limita cuántas cuentas admite el servidor, para que nadie más lo use como almacén.
