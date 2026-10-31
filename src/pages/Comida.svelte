<script>
  import Segmentos from '../components/Segmentos.svelte';
  import Semana from './comida/Semana.svelte';
  import Probar from './comida/Probar.svelte';
  import Compra from './comida/Compra.svelte';
  import { ir } from '../stores/ruta.js';

  let { sub = '' } = $props();
  const OPCIONES = [
    { id: 'semana', nombre: 'Semana', emoji: '📅' },
    { id: 'recetas', nombre: 'Para probar', emoji: '📖' },
    { id: 'compra', nombre: 'Compra', emoji: '🛒' },
  ];
  // El batch ya no es pestaña: lo propone Hoy el día de preparar (el enlace antiguo #comida/batch lleva al menú)
  const pestañaDe = (s) => (s === 'batch' ? 'semana' : OPCIONES.some((o) => o.id === s) ? s : null);
  // La marca el enlace (#comida/pestaña) y se puede cambiar tocando las pestañas
  let pestaña = $derived(pestañaDe(sub) || 'semana');
</script>

<h1 class="titulo">Comida</h1>
<Segmentos opciones={OPCIONES} bind:valor={pestaña} onchange={(id) => ir('comida', id)} />

{#if pestaña === 'semana'}<Semana />
{:else if pestaña === 'recetas'}<Probar />
{:else}<Compra />{/if}
