<script>
  import Segmentos from '../components/Segmentos.svelte';
  import Emoji from '../components/Emoji.svelte';
  import Configurar from './entreno/Configurar.svelte';
  import Semana from './entreno/Semana.svelte';
  import PlanFases from './entreno/PlanFases.svelte';
  import Carrera from './entreno/Carrera.svelte';
  import { estado } from '../stores/estado.js';
  import { ir } from '../stores/ruta.js';

  let { sub = '' } = $props();
  const OPCIONES = [
    { id: 'semana', nombre: 'Semana', emoji: '📅' },
    { id: 'plan', nombre: 'Plan', emoji: '🗺️' },
    { id: 'carrera', nombre: 'Tu HYROX', emoji: '🏆' },
  ];
  // Las estaciones viven ahora en Tu HYROX (el enlace antiguo #entreno/estaciones lleva allí)
  const pestañaDe = (s) => (s === 'estaciones' ? 'carrera' : OPCIONES.some((o) => o.id === s) ? s : null);
  // La marca el enlace (#entreno/pestaña) y se puede cambiar tocando las pestañas
  let pestaña = $derived(pestañaDe(sub) || 'semana');
  let configurando = $state(false);
</script>

<h1 class="titulo">Entreno</h1>

{#if !$estado.hyrox || configurando}
  {#if !$estado.hyrox}
    <div class="tarjeta intro">
      <Emoji e="🏆" tam={56} />
      <div>
        <b>Tu plan para HYROX</b>
        <p>Te preparo un plan por fases hasta tu carrera: carrera, estaciones, fuerza y simulacros, con tus ritmos y los pesos de tu categoría. La comida de cada día se adapta a la sesión que toque.</p>
      </div>
    </div>
  {/if}
  <Configurar onguardado={() => { configurando = false; pestaña = 'semana'; }} oncancelar={$estado.hyrox ? () => (configurando = false) : null} />
{:else}
  <Segmentos opciones={OPCIONES} bind:valor={pestaña} onchange={(id) => ir('entreno', id)} />
  {#if pestaña === 'semana'}<Semana />
  {:else if pestaña === 'plan'}<PlanFases oneditar={() => (configurando = true)} />
  {:else}<Carrera />{/if}
{/if}

<style>
  .intro { display: flex; gap: 14px; align-items: flex-start; background: linear-gradient(135deg, var(--amarillo-claro), var(--superficie) 70%); }
  .intro p { margin: 4px 0 0; font-weight: 600; font-size: 0.92rem; }
</style>
