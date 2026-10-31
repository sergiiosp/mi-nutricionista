<script>
  import Segmentos from '../components/Segmentos.svelte';
  import Resumen from './progreso/Resumen.svelte';
  import Cuerpo from './progreso/Cuerpo.svelte';
  import EntrenoStats from './progreso/Entreno.svelte';
  import { ir } from '../stores/ruta.js';

  let { sub = '' } = $props();
  const OPCIONES = [
    { id: 'resumen', nombre: 'Cómo vas', emoji: '📊' },
    { id: 'cuerpo', nombre: 'Cuerpo', emoji: '⚖️' },
    { id: 'entreno', nombre: 'Entreno', emoji: '🏋️' },
  ];
  // Peso y fotos viven dentro de Cuerpo (los enlaces antiguos #progreso/peso y #progreso/medidas siguen funcionando)
  const PARTES = ['peso', 'fotos'];
  const pestañaDe = (s) => (PARTES.includes(s) || s === 'medidas' ? 'cuerpo' : OPCIONES.some((o) => o.id === s) ? s : s === 'logros' ? 'resumen' : null);
  // La marca el enlace (#progreso/pestaña) y se puede cambiar tocando las pestañas
  let pestaña = $derived(pestañaDe(sub) || 'resumen');
  const parte = $derived(PARTES.includes(sub) ? sub : 'peso');
</script>

<h1 class="titulo">Progreso</h1>
<Segmentos opciones={OPCIONES} bind:valor={pestaña} onchange={(id) => ir('progreso', id)} />

{#if pestaña === 'resumen'}<Resumen />
{:else if pestaña === 'entreno'}<EntrenoStats />
{:else}<Cuerpo {parte} />{/if}
