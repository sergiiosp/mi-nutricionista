<script>
  // Comer fuera: platos típicos con macros estimados
  import Emoji from '../components/Emoji.svelte';
  import { FUERA } from '../data/fuera.js';

  let { onelegir } = $props();
  const grupos = [...new Set(FUERA.map((p) => p.grupo))];
  let grupo = $state(grupos[0]);
</script>

<p class="pie-nota">Valores medios de raciones habituales: varían de un sitio a otro, pero te sirven para no perder el control del día.</p>
<div class="filtros">
  {#each grupos as g (g)}
    <button class="filtro" class:activo={grupo === g} onclick={() => (grupo = g)}>{g}</button>
  {/each}
</div>
<div class="rejilla">
  {#each FUERA.filter((p) => p.grupo === grupo) as p (p.id)}
    <button class="plato" onclick={() => onelegir?.({ tipo: 'fuera', plato: p })}>
      <Emoji e={p.emoji} tam={40} />
      <b>{p.nombre}</b>
      <small>~{p.kcal} kcal</small>
    </button>
  {/each}
</div>

<style>
  .rejilla { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 8px; margin-top: 8px; }
  .plato { display: grid; justify-items: center; gap: 4px; padding: 14px 8px; border: 0; border-radius: 18px; background: var(--superficie); box-shadow: var(--sombra); cursor: pointer; text-align: center; color: var(--texto); }
  @media (hover: hover) and (pointer: fine) { .plato:hover { box-shadow: var(--sombra), inset 0 0 0 2px var(--primario); } }
  .plato b { font-size: 0.86rem; line-height: 1.2; }
  .plato small { color: var(--texto-2); font-weight: 700; }
</style>
