<script>
  // Foto real de la receta (o la de su versión adaptada a tus alergias). Si no la hay, un hueco gris
  // con unos cubiertos, como hacen las apps de comida: sin colores que compitan con las fotos de al lado.
  import Icono from './Icono.svelte';
  import { fotoReceta } from '../lib/foto-receta.js';

  let { receta, alto = 140, redondeo = 18, clase = '' } = $props();
  const foto = $derived(fotoReceta(receta));
  const icono = $derived(Math.round(Math.min(56, Math.max(18, alto * 0.3))));
</script>

<div class="foto {clase}" style="height:{alto}px;border-radius:{redondeo}px">
  {#if foto}
    <img src={foto} alt={receta.nombre} loading="lazy" />
  {:else}
    <div class="hueco" role="img" aria-label="{receta?.nombre ?? 'Plato'}, sin foto">
      <Icono n="utensils" tam={icono} grosor={alto < 100 ? 1.8 : 1.4} />
    </div>
  {/if}
</div>

<style>
  .foto { position: relative; overflow: hidden; flex-shrink: 0; background: var(--superficie-2); }
  img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .hueco { position: absolute; inset: 0; display: grid; place-items: center; color: var(--texto-3); }
</style>
