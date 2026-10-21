<script>
  import Segmentos from '../components/Segmentos.svelte';
  import Resumen from './progreso/Resumen.svelte';
  import Cuerpo from './progreso/Cuerpo.svelte';
  import EntrenoStats from './progreso/Entreno.svelte';
  import { ir } from '../stores/ruta.js';

  let { sub = '' } = $props();
  const OPCIONES = [
    { id: 'resumen', nombre: 'Semana', emoji: '📊' },
    { id: 'cuerpo', nombre: 'Cuerpo', emoji: '⚖️' },
    { id: 'entreno', nombre: 'Entreno', emoji: '🏋️' },
  ];
  // Peso, medidas y fotos viven dentro de Cuerpo (los enlaces antiguos #progreso/peso siguen funcionando)
  const PARTES = ['peso', 'medidas', 'fotos'];
  const pestañaDe = (s) => (PARTES.includes(s) ? 'cuerpo' : OPCIONES.some((o) => o.id === s) ? s : s === 'logros' ? 'resumen' : null);
  let pestaña = $state(pestañaDe(sub) || 'resumen');
  const parte = $derived(PARTES.includes(sub) ? sub : 'peso');
  // Si un enlace lleva a otra pestaña de esta misma sección (#seccion/pestaña), se cambia
  $effect(() => { const p = pestañaDe(sub); if (p) pestaña = p; });
</script>

<h1 class="titulo">Progreso</h1>
<Segmentos opciones={OPCIONES} bind:valor={pestaña} onchange={(id) => ir('progreso', id)} />

{#if pestaña === 'resumen'}<Resumen />
{:else if pestaña === 'entreno'}<EntrenoStats />
{:else}<Cuerpo {parte} />{/if}
