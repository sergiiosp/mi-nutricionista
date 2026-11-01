<script>
  // Icono relleno para los datos (llama de kcal, muslo, espiga y aguacate de los macros…), al estilo de Cal AI.
  // Los de navegación y acciones siguen siendo de línea (Icono).
  import { RELLENOS } from '../data/iconos-rellenos.js';

  let { n, tam = 18, clase = '' } = $props();
  const ic = $derived(RELLENOS[n]);
</script>

{#if ic}
  <svg class="icono relleno {clase}" width={tam} height={tam} viewBox={ic.vb} fill="currentColor" aria-hidden="true">
    {#each ic.d as d (d)}<path {d} />{/each}
  </svg>
{/if}
