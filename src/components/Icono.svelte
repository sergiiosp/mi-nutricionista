<script>
  // Icono de línea (Lucide). `n` = nombre del icono; `e` = emoji de los datos (se traduce).
  import { TRAZOS } from '../data/iconos-linea.js';
  import { nombreIcono } from '../lib/iconos.js';

  let { n = null, e = null, tam = 22, grosor = 1.8, clase = '' } = $props();
  const nodos = $derived(TRAZOS[nombreIcono(n || e)] || []);
</script>

<svg class="icono {clase}" width={tam} height={tam} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width={grosor}
  stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  {#each nodos as [etiqueta, atributos], i (i)}
    <svelte:element this={etiqueta} xmlns="http://www.w3.org/2000/svg" {...atributos} />
  {/each}
</svg>
