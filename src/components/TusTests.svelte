<script>
  // Tus tests: el último tiempo de cada uno, si mejoras y su evolución; aviso cuando toca repetirlos.
  import Icono from './Icono.svelte';
  import Emoji from './Emoji.svelte';
  import { estado } from '../stores/estado.js';
  import { abrirHoja } from '../stores/ui.js';
  import { TESTS, historialTests, estadoTests } from '../lib/hyrox/tests.js';
  import { mmss } from '../lib/hyrox/ritmos.js';
  import { hoyISO } from '../lib/planificador.js';
  import { fechaCorta } from '../lib/formato.js';

  const hoy = hoyISO();
  const hist = $derived(historialTests($estado.tests || []));
  const est = $derived(estadoTests($estado.tests || [], hoy));
  const hechos = $derived(TESTS.filter((t) => hist[t.id]?.length));
  // Mini gráfica: tiempos de cada test (más abajo = más rápido = mejor)
  function linea(l) {
    if (l.length < 2) return null;
    const min = Math.min(...l.map((x) => x.seg)), max = Math.max(...l.map((x) => x.seg));
    const W = 64, H = 24;
    return l.map((x, i) => `${i ? 'L' : 'M'}${((i / (l.length - 1)) * (W - 4) + 2).toFixed(1)} ${(2 + ((x.seg - min) / Math.max(1, max - min)) * (H - 4)).toFixed(1)}`).join(' ');
  }
</script>

<section class="tarjeta tests" aria-label="Tus tests">
  <div class="ts-cab">
    <b>Tus tests</b>
    {#if est.toca}<span class="toca">{est.dias == null ? 'Haz el primero' : 'Toca repetirlos'}</span>{:else}<small>próximos a partir del {fechaCorta(est.proximo)}</small>{/if}
  </div>
  {#if hechos.length}
    <ul>
      {#each hechos as t (t.id)}
        {@const l = hist[t.id]}
        {@const dif = l.length > 1 ? l.at(-1).seg - l.at(-2).seg : null}
        {@const d = linea(l)}
        <li>
          <span class="ts-ic">{#if t.emoji}<Emoji e={t.emoji} tam={16} />{:else}<Icono n={t.icono} tam={16} />{/if}</span>
          <span class="ts-txt"><b>{t.corto}</b><small>{fechaCorta(l.at(-1).fecha)}{l.length > 1 ? ` · ${l.length} tests` : ''}</small></span>
          {#if d}<svg viewBox="0 0 64 24" width="64" height="24" aria-hidden="true"><path d={d} fill="none" stroke="var(--primario)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></svg>{/if}
          <span class="ts-t"><b class="cifra">{mmss(l.at(-1).seg)}</b>{#if dif != null}<small class:mejor={dif < 0}>{dif < 0 ? '−' : '+'}{mmss(Math.abs(dif))}</small>{/if}</span>
        </li>
      {/each}
    </ul>
  {:else}
    <p class="pie-nota">Cada 4-6 semanas, haz un 5 km a tope y, si puedes, un SkiErg o remo de 1.000 m. Verás si mejoras y tus ritmos se ajustarán a tu nivel real.</p>
  {/if}
  <button class="boton {est.toca ? '' : 'boton-sec'} ancho" onclick={() => abrirHoja('test', {})}><Icono n="timer" tam={18} /> Apuntar un test</button>
</section>

<style>
  .ts-cab { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  .ts-cab small { font-size: 0.76rem; color: var(--texto-3); }
  .toca { padding: 3px 10px; border-radius: 999px; background: var(--primario); color: var(--sobre-primario); font-size: 0.74rem; font-weight: 700; }
  ul { list-style: none; margin: 10px 0 0; padding: 0; }
  li { display: flex; align-items: center; gap: 10px; padding: 8px 0; }
  li + li { border-top: 1px solid var(--linea); }
  .ts-ic { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 10px; background: var(--primario-claro); color: var(--primario); flex-shrink: 0; }
  .ts-txt { flex: 1; min-width: 0; display: grid; }
  .ts-txt b { font-size: 0.9rem; }
  .ts-txt small { font-size: 0.74rem; color: var(--texto-3); }
  .ts-t { display: grid; justify-items: end; min-width: 58px; }
  .ts-t b { font-size: 1rem; }
  .ts-t small { font-size: 0.72rem; font-weight: 700; color: var(--amarillo); }
  .ts-t small.mejor { color: var(--dato-kcal); }
  .ancho { width: 100%; margin-top: 12px; }
</style>
