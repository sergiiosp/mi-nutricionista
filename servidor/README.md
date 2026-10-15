# Servidor de Mi Nutricionista

Cloudflare Worker + base de datos D1 (plan gratuito: 100.000 peticiones al día). Hace cuatro cosas:

- **Sincronización** entre dispositivos: guarda un único bloque con tus datos **cifrado en el dispositivo** (AES-GCM con una clave que nunca sale de tus dispositivos). El servidor no puede leerlo.
- **Copias de seguridad**: la última versión de cada día, durante 30 días.
- **Strava**: conexión OAuth (el secreto de la aplicación solo vive aquí) y lectura de tus actividades.
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

### Strava

1. Crea una aplicación en https://www.strava.com/settings/api con **Authorization Callback Domain** = `mi-nutricionista.<tu-subdominio>.workers.dev`.
2. Pon su *Client ID* en `STRAVA_CLIENT_ID` de `wrangler.toml`.
3. Guarda el *Client Secret* como secreto (te lo pide al ejecutar):

```bash
npx wrangler secret put STRAVA_SECRET
```

4. `npm run deploy` otra vez.

## Desarrollo local

```bash
npm run tablas-local
```

```bash
npm run dev
```

El servidor queda en http://127.0.0.1:8787 y la app en modo desarrollo (`npm run dev` en la raíz) lo usa automáticamente. Para lanzar el cron a mano: `curl "http://127.0.0.1:8787/__scheduled?cron=*/5+*+*+*+*"`.

`MAX_CUENTAS` (en `wrangler.toml`) limita cuántas cuentas admite el servidor, para que nadie más lo use como almacén.
