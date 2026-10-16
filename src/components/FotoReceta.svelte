<script>
  // Foto real de la receta o, si no la hay, un fondo oscuro con su icono de línea
  import Icono from './Icono.svelte';
  import { FOTOS_RECETAS } from '../data/fotos.js';

  let { receta, alto = 140, redondeo = 18, tamEmoji = 64, clase = '' } = $props();
  // Si la receta se adaptó cambiando un fruto seco, la foto ya no es fiel (sale lo que no puedes comer)
  const tieneFoto = $derived(!!FOTOS_RECETAS[receta?.id] && !receta?.sinFoto);
</script>

<div class="foto {clase}" style="height:{alto}px;border-radius:{redondeo}px">
  {#if tieneFoto}
    <img src="img/recetas/{receta.id}.webp" alt={receta.nombre} loading="lazy" />
  {:else}
    <div class="ilustrada"><span class="aro"></span><Icono e={receta?.emoji || '🍽️'} tam={Math.round(tamEmoji * 0.62)} grosor={1.6} /></div>
  {/if}
</div>

<style>
  .foto { position: relative; overflow: hidden; flex-shrink: 0; background: radial-gradient(circle at 30% 20%, var(--superficie-3), var(--superficie-2)); }
  img { width: 100%; height: 100%; object-fit: cover; display: block; }
  /* Sin foto: bloque con el color de la sección (no un hueco gris) */
  .ilustrada {
    position: absolute; inset: 0; display: grid; place-items: center; color: var(--primario-fuerte);
    background: radial-gradient(120% 120% at 20% 10%, color-mix(in srgb, var(--primario) 38%, transparent), transparent 62%),
      linear-gradient(160deg, color-mix(in srgb, var(--primario) 22%, var(--superficie-2)), var(--primario-claro));
  }
  .ilustrada :global(svg) { position: relative; filter: drop-shadow(0 4px 10px rgb(0 0 0 / 0.25)); }
  .aro { position: absolute; width: 74%; aspect-ratio: 1; border-radius: 50%; background: color-mix(in srgb, var(--primario) 16%, transparent); }
</style>
