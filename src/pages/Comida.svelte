<script>
  import Segmentos from '../components/Segmentos.svelte';
  import Semana from './comida/Semana.svelte';
  import Recetas from './comida/Recetas.svelte';
  import Compra from './comida/Compra.svelte';
  import Batch from './comida/Batch.svelte';
  import { ir } from '../stores/ruta.js';

  let { sub = '' } = $props();
  const OPCIONES = [
    { id: 'semana', nombre: 'Semana', emoji: '📅' },
    { id: 'recetas', nombre: 'Recetas', emoji: '📖' },
    { id: 'compra', nombre: 'Compra', emoji: '🛒' },
    { id: 'batch', nombre: 'Batch', emoji: '🥡' },
  ];
  let pestaña = $state(OPCIONES.some((o) => o.id === sub) ? sub : 'semana');
  // Si un enlace lleva a otra pestaña de esta misma sección (#seccion/pestaña), se cambia
  $effect(() => { if (OPCIONES.some((o) => o.id === sub)) pestaña = sub; });
</script>

<h1 class="titulo">Comida</h1>
<Segmentos opciones={OPCIONES} bind:valor={pestaña} onchange={(id) => ir('comida', id)} />

{#if pestaña === 'semana'}<Semana />
{:else if pestaña === 'recetas'}<Recetas />
{:else if pestaña === 'compra'}<Compra />
{:else}<Batch />{/if}
