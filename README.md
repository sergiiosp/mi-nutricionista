# Mi Nutricionista

Nutricionista y entrenador personal para HYROX en una app web instalable en el móvil. Publicada en **https://sergiiosp.github.io/mi-nutricionista/**

## Qué hace

- **Primera consulta**: cuestionario con tus datos, horario y trabajo, entrenamiento, objetivo, salud y hábitos, preferencias y lo que no te gusta.
- **Objetivos**: metabolismo basal (Mifflin-St Jeor), gasto por trabajo, pasos y entreno (MET), calorías y macros distintas para días de entreno y de descanso.
- **Menú semanal** con recetas reales (con foto) ajustadas a tus macros y colocadas según tu horario, con comida pre y post-entreno.
- **Día dinámico**: registras lo que comes y ves en vivo lo que te queda; si comes algo fuera del plan, las comidas que quedan se reajustan solas y te sugiere qué comer para completar.
- **Registro sin IA**: escáner de código de barras (Open Food Facts), buscador de alimentos, recetas y productos, raciones visuales (puño, palma, cuchara…), comidas propias, platos típicos de comer fuera y foto del plato como diario.
- **Entrenador HYROX**: plan por fases (base, construcción, específico y puesta a punto) hasta tu carrera, con descargas, sesiones detalladas (carrera, estaciones, fuerza, *compromised running* y simulacros), tus ritmos y los pesos de tu categoría, sustitutos si te falta material y alternativas si tienes lesiones. Registras cada sesión (RPE, sensaciones, tiempos) y el plan se ajusta solo; puedes mover entrenos de día. Incluye estimación de tiempo de carrera, estrategia por estación, nutrición del día de carrera y de la semana previa, y fichas de técnica de las 8 estaciones.
- **Comida según el entreno**: cada día del menú se calcula con la sesión que toca (más hidratos en tiradas largas, series y simulacros, carga de hidratos antes de la carrera).
- **Comida**: menú de la semana, recetario, lista de la compra de Mercadona (con «lo tengo en casa» y compartir por WhatsApp) y plan de batch cooking.
- **Progreso**: resumen semanal, peso con tendencia y ajuste de calorías, medidas, fotos de progreso privadas, rachas y logros.
- **Mi plan**: horario de comidas, suplementos con evidencia (dosis y precauciones), adaptaciones por salud y hábitos.
- **Conectar** (Mi plan → Conectar): sincroniza móvil y ordenador vinculándolos con un QR o un código de 8 letras (datos cifrados de extremo a extremo), copias de seguridad diarias en el servidor, **Strava** (y el Apple Watch a través de Strava: los entrenos se importan solos, marcan como hecha la sesión del plan y, si son extra, suman calorías a ese día) y **recordatorios** en el móvil para comer, entrenar, pesarte y tomar los suplementos.
- Funciona sin conexión y se instala en el móvil («Añadir a pantalla de inicio»).

> Los cálculos son orientativos y no sustituyen a un dietista-nutricionista o médico.

## Desarrollo

Hecha con [Svelte 5](https://svelte.dev) + [Vite](https://vite.dev).

```bash
npm install
```

```bash
npm run dev
```

Abre http://localhost:8080. Para generar la versión de producción (carpeta `dist/`, con service worker):

```bash
npm run build
```

Cada `git push` a `main` publica automáticamente en GitHub Pages, y los lunes GitHub Actions actualiza los precios de Mercadona (`.github/workflows/publicar.yml`).

## Datos

- **Macros**: base revisada en `src/data/alimentos.js` (la API de Mercadona no da valores nutricionales).
- **Precios y envases**: API pública de la tienda online de Mercadona → `npm run precios` (escribe `src/data/precios.js`).
- **Productos envasados**: [Open Food Facts](https://world.openfoodfacts.org), en tiempo real desde la app.
- **Fotos de recetas**: Wikimedia Commons (licencias libres; créditos en Mi plan → Ajustes → Créditos).
- **Iconos 3D**: Fluent Emoji de Microsoft (MIT). Si usas emojis nuevos en el código, ejecuta `node scripts/copiar-emojis.mjs <carpeta assets del paquete @lobehub/fluent-emoji-3d>`.

Tus datos se guardan en el dispositivo (localStorage y, las fotos, IndexedDB). Si activas la sincronización, también en tu servidor, cifrados con una clave que solo tienen tus dispositivos. Las fotos nunca salen del dispositivo.

## Servidor

La sincronización, las copias, Strava y los recordatorios usan un Cloudflare Worker gratuito: está en [`servidor/`](servidor/README.md) con sus instrucciones de puesta en marcha.

## Estructura

```
src/App.svelte            → navegación, hojas y avisos
src/pages/                → Hoy, Entreno, Comida (semana, recetas, compra, batch), Progreso, Mi plan, cuestionario
src/registro/             → registrar comida: escáner, buscador, cantidad, comer fuera, mis comidas
src/components/           → tarjetas de comida, receta, anillo, hojas…
src/lib/nutricion.js      → gasto energético, objetivos, macros, escalado de recetas
src/lib/planificador.js   → generador de menús y alternativas
src/lib/horario.js        → horario de comidas y reparto según el entreno
src/lib/dia.js            → día dinámico: lo que llevas, lo que falta, reajuste y sugerencias
src/lib/salud.js          → salud, hábitos y suplementación
src/lib/hyrox/            → plan HYROX, sesiones, ritmos, estimación y nutrición de carrera, estadísticas
src/data/hyrox.js         → estaciones, pesos oficiales, ejercicios
src/lib/nube/             → sincronización cifrada, Strava y recordatorios (cliente del servidor)
src/lib/hyrox/strava.js   → emparejar entrenos de Strava con sesiones y calorías extra
servidor/                 → Cloudflare Worker: datos cifrados, copias, Strava y Web Push
src/lib/compra.js, batch.js, logros.js, off.js, raciones.js, registro.js, fotos.js
src/data/                 → alimentos, recetas, precios, platos de fuera, créditos de fotos
scripts/                  → precios, catálogo, iconos, service worker y prueba del motor
```

## Comprobar el motor

```bash
npm test
```

Genera menús para varios perfiles (oficinista que entrena por la tarde, corredora que compite, entreno en ayunas, anemia e hipertensión…) y comprueba que cuadran con sus objetivos.
