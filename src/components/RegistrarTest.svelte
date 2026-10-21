<script>
  // Apuntar un test: cuál, cuándo y el tiempo. Con el 5 km, el SkiErg o el remo se actualizan tus ritmos.
  import Icono from './Icono.svelte';
  import Emoji from './Emoji.svelte';
  import CampoTiempo from './CampoTiempo.svelte';
  import { estado } from '../stores/estado.js';
  import { avisar, cerrarHoja } from '../stores/ui.js';
  import { guardarTest } from '../lib/acciones.js';
  import { TESTS, testPorId, historialTests } from '../lib/hyrox/tests.js';
  import { aSegundos, mmss } from '../lib/hyrox/ritmos.js';
  import { hoyISO } from '../lib/planificador.js';

  let { id: idInicial = '5k' } = $props();
  let id = $state(idInicial);
  let fecha = $state(hoyISO());
  let tiempo = $state('');
  const hist = $derived(historialTests($estado.tests || []));
  const ultimo = $derived(hist[id]?.at(-1));
  const t = $derived(testPorId[id]);

  function guardar() {
    const seg = aSegundos(tiempo);
    if (!seg) return avisar('Pon el tiempo del test', '⚠️');
    const dif = guardarTest(fecha, id, seg);
    avisar(dif == null ? `Primera marca: ${mmss(seg)}` : dif < 0 ? `¡Mejoras ${mmss(-dif)}!` : `${mmss(seg)}: ${mmss(dif)} más que la última vez`, dif != null && dif < 0 ? '🎉' : '⏱️');
    cerrarHoja();
  }
</script>

<div class="test">
  <p class="intro">Hazlo descansado, con buen calentamiento y siempre igual (mismo sitio, misma máquina), para que se pueda comparar.</p>
  <div class="opciones-test" role="radiogroup" aria-label="Qué test">
    {#each TESTS as x (x.id)}
      <button role="radio" aria-checked={id === x.id} class:activo={id === x.id} onclick={() => (id = x.id)}>
        {#if x.emoji}<Emoji e={x.emoji} tam={16} />{:else}<Icono n={x.icono} tam={16} />{/if} {x.corto}
      </button>
    {/each}
  </div>
  <div class="campos">
    <label class="campo"><span>Fecha</span><input type="date" bind:value={fecha} max={hoyISO()} /></label>
    <CampoTiempo bind:value={tiempo} etiqueta={t.nombre} ejemplo={t.ejemplo} horas={t.horas} />
  </div>
  {#if ultimo}<p class="pie-nota">La última vez ({ultimo.fecha.slice(8)}/{ultimo.fecha.slice(5, 7)}): <b>{mmss(ultimo.seg)}</b>.</p>{/if}
  {#if ['5k', 'ski1000', 'row1000'].includes(id)}<p class="pie-nota">Con esta marca se recalculan tus ritmos de entreno.</p>{/if}
  <button class="boton ancho" onclick={guardar}><Icono n="check" tam={18} grosor={2.4} /> Guardar test</button>
</div>

<style>
  .intro { margin: 0 0 12px; font-size: 0.88rem; color: var(--texto-2); line-height: 1.4; }
  .opciones-test { display: flex; flex-wrap: wrap; gap: 6px; }
  .opciones-test button { display: inline-flex; align-items: center; gap: 6px; min-height: 40px; padding: 0 12px; border: 0; border-radius: 999px; background: var(--superficie); box-shadow: var(--sombra); color: var(--texto-2); font: inherit; font-size: 0.82rem; font-weight: 600; cursor: pointer; }
  .opciones-test button.activo { background: var(--primario); color: var(--sobre-primario); }
  .campos { display: grid; gap: 8px; margin-top: 14px; }
  .ancho { width: 100%; margin-top: 14px; }
</style>
