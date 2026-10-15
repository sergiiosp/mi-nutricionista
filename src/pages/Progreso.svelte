<script>
  import Segmentos from '../components/Segmentos.svelte';
  import Resumen from './progreso/Resumen.svelte';
  import Peso from './progreso/Peso.svelte';
  import Medidas from './progreso/Medidas.svelte';
  import Fotos from './progreso/Fotos.svelte';
  import Logros from './progreso/Logros.svelte';
  import EntrenoStats from './progreso/Entreno.svelte';
  import { ir } from '../stores/ruta.js';

  let { sub = '' } = $props();
  const OPCIONES = [
    { id: 'resumen', nombre: 'Semana', emoji: '📊' },
    { id: 'entreno', nombre: 'Entreno', emoji: '🏋️' },
    { id: 'peso', nombre: 'Peso', emoji: '⚖️' },
    { id: 'medidas', nombre: 'Medidas', emoji: '📏' },
    { id: 'fotos', nombre: 'Fotos', emoji: '📸' },
    { id: 'logros', nombre: 'Logros', emoji: '🏅' },
  ];
  let pestaña = $state(OPCIONES.some((o) => o.id === sub) ? sub : 'resumen');
</script>

<h1 class="titulo">Progreso</h1>
<Segmentos opciones={OPCIONES} bind:valor={pestaña} onchange={(id) => ir('progreso', id)} />

{#if pestaña === 'resumen'}<Resumen />
{:else if pestaña === 'entreno'}<EntrenoStats />
{:else if pestaña === 'peso'}<Peso />
{:else if pestaña === 'medidas'}<Medidas />
{:else if pestaña === 'fotos'}<Fotos />
{:else}<Logros />{/if}
