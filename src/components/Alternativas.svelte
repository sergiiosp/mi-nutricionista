<script>
  import Icono from './Icono.svelte';
  import { get } from 'svelte/store';
  import FotoReceta from './FotoReceta.svelte';
  import Macros from './Macros.svelte';
  import { estado } from '../stores/estado.js';
  import { cerrarHoja, avisar } from '../stores/ui.js';
  import { alternativas, recetaPorId } from '../lib/planificador.js';
  import { objetivosActuales, sustituirComida } from '../lib/acciones.js';
  import { proveedorDe } from '../lib/hyrox/index.js';

  let { diaIdx, franja } = $props();
  const e = get(estado);
  const actual = e.plan.dias[diaIdx]?.comidas.find((c) => c.franja === franja);
  let filtro = $state('todas');
  const lista = alternativas(e.plan, diaIdx, franja, e.perfil, objetivosActuales(), proveedorDe(e));
  const visibles = $derived(lista.filter((a) => filtro === 'todas' || (filtro === 'rapidas' ? recetaPorId[a.comida.recetaId].tiempo <= 15 : !a.usos)).slice(0, 12));

  function elegir(alt) {
    sustituirComida(diaIdx, franja, alt.comida);
    cerrarHoja();
    avisar(`Cambiado por ${recetaPorId[alt.comida.recetaId].nombre}`, '🔄');
  }
</script>

<p class="pie-nota">Ahora: <b>{recetaPorId[actual?.recetaId]?.nombre}</b>. Todas vienen ajustadas a tus macros de esta comida.</p>
<div class="filtros">
  <button class="filtro" class:activo={filtro === 'todas'} onclick={() => (filtro = 'todas')}>Todas</button>
  <button class="filtro" class:activo={filtro === 'rapidas'} onclick={() => (filtro = 'rapidas')}><Icono e="⚡" tam={18} /> Rápidas</button>
  <button class="filtro" class:activo={filtro === 'nuevas'} onclick={() => (filtro = 'nuevas')}><Icono e="✨" tam={18} /> No repetidas</button>
</div>
<div class="lista">
  {#each visibles as alt (alt.comida.recetaId)}
    {@const r = recetaPorId[alt.comida.recetaId]}
    <button class="alt" onclick={() => elegir(alt)}>
      <FotoReceta receta={r} alto={64} redondeo={16} tamEmoji={36} />
      <span class="info">
        <b>{r.nombre}</b>
        <small>{r.tiempo} min{alt.usos ? ` · ya está ${alt.usos}× esta semana` : ''}</small>
        <Macros m={alt.macros} peque />
      </span>
    </button>
  {:else}
    <p>No hay alternativas con esos filtros.</p>
  {/each}
</div>

<style>
  .lista { display: grid; gap: 8px; margin-top: 6px; }
  .alt { display: grid; grid-template-columns: 64px 1fr; gap: 12px; align-items: center; text-align: left; padding: 10px; border: 0; border-radius: 18px; background: var(--superficie); box-shadow: var(--sombra); cursor: pointer; color: var(--texto); }
  .alt:hover { box-shadow: var(--sombra), inset 0 0 0 2px var(--primario); }
  .info { display: grid; gap: 2px; min-width: 0; }
  .info small { color: var(--texto-2); font-weight: 600; }
</style>
