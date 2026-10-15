<script>
  // Foto real de la receta (si la hay) o tarjeta ilustrada con su icono 3D
  import Emoji from './Emoji.svelte';
  import { FOTOS_RECETAS } from '../data/fotos.js';

  let { receta, alto = 140, redondeo = 18, tamEmoji = 64, clase = '' } = $props();
  const tieneFoto = $derived(!!FOTOS_RECETAS[receta?.id]);
  const TONOS = {
    desayuno: ['#ffe9b8', '#ffd28a'], snack: ['#ffd9cf', '#ffb8a5'], comida: ['#c9f2dd', '#9fe3c2'], cena: ['#ddd8ff', '#c1b8ff'],
  };
  const tono = $derived(TONOS[receta?.prefiere || receta?.tipos?.[0]] || TONOS.comida);
</script>

<div class="foto {clase}" style="height:{alto}px;border-radius:{redondeo}px;--t1:{tono[0]};--t2:{tono[1]}">
  {#if tieneFoto}
    <img src="img/recetas/{receta.id}.webp" alt={receta.nombre} loading="lazy" />
  {:else}
    <div class="ilustrada"><Emoji e={receta?.emoji || '🍽️'} tam={tamEmoji} /></div>
  {/if}
</div>

<style>
  .foto { position: relative; overflow: hidden; background: linear-gradient(135deg, var(--t1), var(--t2)); flex-shrink: 0; }
  img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .ilustrada { position: absolute; inset: 0; display: grid; place-items: center; }
  .ilustrada :global(img) { filter: drop-shadow(0 8px 14px rgb(0 0 0 / 0.18)); }
</style>
