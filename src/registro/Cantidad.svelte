<script>
  // Elegir cuánto has comido: raciones visuales o gramos, con macros en vivo
  import Emoji from '../components/Emoji.svelte';
  import FotoReceta from '../components/FotoReceta.svelte';
  import Macros from '../components/Macros.svelte';
  import { describir } from '../lib/registro.js';
  import { racionesAlimento, racionesProducto } from '../lib/raciones.js';
  import { TAMANOS } from '../data/fuera.js';

  /** enPlato: cuántas cosas llevas ya en el plato · onmas: añadir esto y seguir con otra cosa */
  let { item, ctx, franjaNombre, onañadir, onmas, enPlato = 0 } = $props();
  const d = $derived(describir(item, ctx));

  const raciones = $derived(
    item.tipo === 'alimento' ? racionesAlimento(item.id)
      : item.tipo === 'producto' ? racionesProducto(item.producto)
        : item.tipo === 'fuera' ? Object.values(TAMANOS).map((t) => ({ nombre: t.nombre, emoji: t.k < 1 ? '🤏' : t.k > 1 ? '🙌' : '👌', g: t.k }))
          : [0.5, 1, 1.5, 2].map((r) => ({ nombre: r === 1 ? '1 ración' : `${String(r).replace('.', ',')} raciones`, emoji: r < 1 ? '🌓' : r === 1 ? '1️⃣' : r === 1.5 ? '➕' : '2️⃣', g: r }))
  );
  function inicial() {
    if (d?.raciones) return 1;
    const una = raciones.find((r) => /^1 /.test(r.nombre) || r.nombre.startsWith('1 ración'));
    return una?.g || raciones[0]?.g || 100;
  }
  let cantidad = $state(0);
  $effect.pre(() => {
    if (!cantidad) cantidad = inicial();
  });
  const m = $derived(d.macros(cantidad || 0));
  const paso = $derived(d.raciones ? 0.5 : cantidad >= 100 ? 10 : 5);

  function cambiar(delta) {
    const nuevo = Math.max(paso, Math.round(((cantidad || 0) + delta) * 100) / 100);
    cantidad = nuevo;
  }
</script>

<div class="cant-cab">
  {#if item.tipo === 'receta'}
    <FotoReceta receta={item.receta} alto={72} redondeo={18} tamEmoji={44} clase="foto-cantidad" />
  {:else if d.imagen}
    <img class="producto" src={d.imagen} alt="" />
  {:else}
    <div class="icono"><Emoji e={d.emoji} tam={46} /></div>
  {/if}
  <div class="nombre">
    <b>{d.nombre}</b>
    {#if d.marca}<small>{d.marca}</small>{/if}
  </div>
</div>

<div class="raciones">
  {#each raciones as r (r.nombre)}
    <button class="racion" class:activa={Math.abs(r.g - cantidad) < 0.01} onclick={() => (cantidad = r.g)}>
      <Emoji e={r.emoji} tam={22} />
      <span>{r.nombre}</span>
      {#if r.nota}<small>{r.nota}</small>{/if}
    </button>
  {/each}
</div>

{#if !d.tamanos}
  <div class="ajuste">
    <button class="mas-menos" aria-label="Menos" onclick={() => cambiar(-paso)}>−</button>
    <label>
      <input enterkeyhint="done" type="number" inputmode="decimal" min="0" step={paso} bind:value={cantidad} aria-label="Cantidad" />
      <span>{d.raciones ? (cantidad === 1 ? 'ración' : 'raciones') : d.unidad}</span>
    </label>
    <button class="mas-menos" aria-label="Más" onclick={() => cambiar(paso)}>+</button>
  </div>
{/if}

<div class="resultado">
  <div class="kcal"><b>{Math.round(m.kcal)}</b> kcal</div>
  <Macros {m} kcal={false} />
</div>

<button class="boton ancho" disabled={!(cantidad > 0)} onclick={() => onañadir?.(cantidad)}>
  {enPlato ? `Guardar el plato (${enPlato + 1})` : `Guardar en ${franjaNombre ? franjaNombre.toLowerCase() : 'el día'}`}
</button>
{#if onmas}
  <button class="boton boton-sec ancho mas" disabled={!(cantidad > 0)} onclick={() => onmas(cantidad)}>
    + Añadir algo más al plato
  </button>
  {#if !enPlato}<p class="pie-nota centro">Por ejemplo: la sopa, luego la pasta y luego el pollo, cada uno con su cantidad.</p>{/if}
{/if}

<style>
  .cant-cab { display: flex; gap: 14px; align-items: center; margin: 4px 0 14px; }
  .icono { width: 72px; height: 72px; border-radius: 20px; display: grid; place-items: center; background: var(--superficie); box-shadow: var(--sombra); flex-shrink: 0; }
  .producto { width: 72px; height: 72px; border-radius: 18px; object-fit: contain; background: #fff; padding: 4px; box-shadow: var(--sombra); }
  :global(.foto-cantidad) { width: 72px; }
  .nombre { display: grid; }
  .nombre b { font-size: 1.1rem; line-height: 1.25; }
  .nombre small { color: var(--texto-2); font-weight: 700; }
  .raciones { display: grid; grid-template-columns: repeat(auto-fill, minmax(96px, 1fr)); gap: 8px; }
  .racion { display: grid; justify-items: center; gap: 2px; padding: 10px 6px; border-radius: 16px; border: 2px solid transparent; background: var(--superficie); box-shadow: var(--sombra); cursor: pointer; font-weight: 700; font-size: 0.82rem; color: var(--texto); text-align: center; }
  .racion small { color: var(--texto-2); font-weight: 600; font-size: 0.7rem; }
  .racion.activa { border-color: var(--primario); background: var(--primario-claro); }
  .ajuste { display: flex; align-items: center; justify-content: center; gap: 14px; margin: 16px 0 6px; }
  .mas-menos { width: 48px; height: 48px; border-radius: 50%; border: 0; background: var(--superficie); box-shadow: var(--sombra); font-size: 1.5rem; font-weight: 700; cursor: pointer; color: var(--texto); }
  .ajuste label { display: flex; align-items: baseline; gap: 6px; }
  .ajuste input { width: 110px; text-align: center; font-size: 1.8rem; font-weight: 700; border: 0; border-bottom: 3px solid var(--primario); background: transparent; padding: 2px; color: var(--texto); }
  .ajuste input:focus { outline: none; }
  .ajuste span { font-weight: 700; color: var(--texto-2); }
  .resultado { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 10px; margin: 12px 0 16px; }
  .kcal { font-weight: 700; color: var(--texto-2); }
  .kcal b { font-size: 1.6rem; font-weight: 700; color: var(--texto); }
  .ancho { width: 100%; }
  .boton:disabled { opacity: 0.5; cursor: not-allowed; }
  .mas { margin-top: 8px; }
  .centro { text-align: center; }
</style>
