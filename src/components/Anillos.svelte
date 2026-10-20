<script>
  // Anillos concéntricos (estilo Apple Fitness): cada anillo se llena hacia su meta.
  // anillos: [{ valor, meta, color }] de fuera a dentro.
  import { onMount } from 'svelte';
  let { anillos = [], tam = 148, grosor = 14 } = $props();
  const hueco = 4;
  let listo = $state(false);
  onMount(() => requestAnimationFrame(() => (listo = true)));
</script>

<svg class="anillos" width={tam} height={tam} viewBox="0 0 {tam} {tam}" role="img" aria-hidden="true">
  {#each anillos as a, i (i)}
    {@const r = tam / 2 - grosor / 2 - i * (grosor + hueco)}
    {@const c = 2 * Math.PI * r}
    {@const p = a.meta ? Math.min(1, a.valor / a.meta) : 0}
    <circle cx={tam / 2} cy={tam / 2} {r} fill="none" style="stroke:{a.color}" stroke-opacity="0.18" stroke-width={grosor} />
    <circle class="arco" cx={tam / 2} cy={tam / 2} {r} fill="none" style="stroke:{a.color};transition-delay:{i * 120}ms" stroke-width={grosor} stroke-linecap="round"
      stroke-dasharray={c} stroke-dashoffset={listo ? c * (1 - p) : c} transform="rotate(-90 {tam / 2} {tam / 2})"
      opacity={p ? 1 : 0} />
  {/each}
</svg>

<style>
  .anillos { flex-shrink: 0; }
  .arco { transition: stroke-dashoffset 0.9s var(--ease-out); }
  @media (prefers-reduced-motion: reduce) { .arco { transition: none; } }
</style>
