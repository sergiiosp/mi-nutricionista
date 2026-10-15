# Mi Nutricionista

App web (PWA) que actúa como nutricionista personal:

- **Primera consulta**: cuestionario con tus datos, actividad, objetivo, preferencias, alergias y alimentos que no te gustan.
- **Cálculo de objetivos**: metabolismo basal (Mifflin-St Jeor), gasto por trabajo, pasos y entrenamiento (MET), y calorías y macros distintas para días de entreno y de descanso.
- **Horario de comidas**: se colocan según tu hora de levantarte, de trabajo, de entreno y de dormir, con comida pre y post-entreno y más hidratos alrededor del entreno.
- **Salud y suplementos**: adapta los alimentos (anemia, tensión, colesterol, diabetes…) y recomienda solo suplementos con evidencia (creatina, cafeína, vitamina D, omega-3…), con dosis, momento y precauciones.
- **Menú semanal** con recetas reales cuyas cantidades se ajustan a tus macros (cada comida se escala por grupos: proteína, hidratos y grasa).
- **Cambiar platos**: alternativas ya ajustadas a tus macros.
- **Lista de la compra de Mercadona**: agrupada por secciones, con nº de envases, precio, foto, enlace al producto y opción de copiarla o compartirla.
- **Progreso**: registro de peso, gráfica con tendencia y recomendación de ajuste de calorías cada dos semanas.
- Funciona sin conexión y se puede instalar en el móvil como una app.

> Los cálculos son orientativos y no sustituyen a un dietista-nutricionista o médico.

## Arrancar en el ordenador

Hace falta un servidor local (los módulos JS no funcionan abriendo el `index.html` con doble clic):

```bash
python -m http.server 8080
```

Y abre http://localhost:8080

## Usarla en el móvil

La app es estática (HTML + JS), así que basta con publicar la carpeta en cualquier hosting con HTTPS: GitHub Pages, Netlify o Cloudflare Pages. Después ábrela en el móvil y elige **«Añadir a pantalla de inicio»**.

Los datos (perfil, menús, pesos) se guardan **en cada dispositivo**. Para pasarlos del ordenador al móvil, usa *Perfil → Descargar copia* y luego *Restaurar copia*.

## Actualizar precios de Mercadona

Mercadona no tiene API oficial. Los precios se descargan de la API pública de su tienda online (`tienda.mercadona.es`), que **no da los valores nutricionales**. Por eso los macros vienen de una base revisada (`data/alimentos.js`) y los precios y envases, de la API.

```bash
node scripts/actualizar-precios.mjs
```

Por defecto usa el almacén `mad1` (Madrid). Para otra zona, pasa su código: `node scripts/actualizar-precios.mjs bcn1`. Después sube `VERSION` en `sw.js` para que el móvil descargue los precios nuevos.

## Añadir alimentos y recetas

1. Busca el producto en el catálogo: `node scripts/descargar-catalogo.mjs` genera `data/catalogo-mercadona.json` con unos 2.000 productos de alimentación (id, nombre, formato y precio).
2. Añade el alimento a `data/alimentos.js` con sus macros por 100 g y el `mercadona: 'id'` del producto.
3. Añade la receta a `data/recetas.js`. Los ingredientes con `rol: 'P' | 'C' | 'G'` se escalan; el resto (verduras, condimentos) mantiene su cantidad.
4. Ejecuta `node scripts/actualizar-precios.mjs` y `node scripts/probar-motor.mjs`. La prueba comprueba que los menús de varios perfiles cuadran con sus objetivos.

## Estructura

```
index.html, css/, icons/, manifest.webmanifest, sw.js   → interfaz y PWA
js/nutricion.js     → cálculos, macros, escalado de recetas
js/planificador.js  → generador de menús y alternativas
js/compra.js        → lista de la compra (envases, coste, pasillos)
js/progreso.js      → tendencia de peso y recomendaciones
js/horario.js       → horario de comidas y reparto según el entreno
js/salud.js         → salud, hábitos y suplementación
js/vistas/          → pantallas
data/alimentos.js   → alimentos con macros y producto de Mercadona
data/recetas.js     → recetario
data/precios.js     → precios (generado por el script)
scripts/            → actualizar precios, descargar catálogo, iconos y pruebas
```
