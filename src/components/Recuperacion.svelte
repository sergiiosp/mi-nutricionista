<script>
  // Hoja «Recuperación y esfuerzo», al estilo de WHOOP: tu recuperación de hoy en un anillo grande, cada factor
  // frente a tu media y qué hace el plan con ello; debajo, el esfuerzo de hoy y tu carga de la semana.
  import Anillos from './Anillos.svelte';
  import ComoLlegas from './ComoLlegas.svelte';
  import Icono from './Icono.svelte';
  import { estado } from '../stores/estado.js';
  import { hoyISO } from '../lib/planificador.js';
  import { sesionesDia } from '../lib/hyrox/index.js';
  import { recuperacion, esfuerzo } from '../lib/recuperacion.js';
  import { diaCorto, num } from '../lib/formato.js';

  const hoy = hoyISO();
  const rec = $derived(recuperacion($estado, hoy));
  const esf = $derived(esfuerzo($estado, hoy));
  const sesion = $derived(sesionesDia($estado, hoy).find((s) => s.tipo !== 'carrera') || null);
  const color = (v) => (v >= 67 ? 'var(--dato-kcal)' : v >= 34 ? 'var(--amarillo)' : 'var(--coral)');
  const maxCarga = $derived(Math.max(1, ...esf.dias.map((d) => d.carga)));
  const lectura = $derived(esf.ratio == null ? null
    : esf.ratio > 1.3 ? 'Llevas bastante más carga que en una semana normal: cuida el sueño y no añadas extras.'
      : esf.ratio < 0.7 ? 'Semana más suave de lo habitual: buen momento para recuperar.'
        : 'Carga en tu línea de siempre.');
</script>

<div class="rec">
  <section class="cab" aria-label="Recuperación de hoy">
    {#if rec.contestada}
      <div class="anillo">
        <Anillos anillos={[{ valor: rec.valor, meta: 100, color: color(rec.valor) }]} tam={156} grosor={14} />
        <span class="centro"><b class="cifra">{rec.valor}<small>%</small></b><small>recuperación</small></span>
      </div>
      <p class="frase">{rec.frase}</p>
      {#if rec.media != null}<p class="media">Tu media de las 2 últimas semanas: {rec.media} %</p>{/if}
    {:else}
      <h2>¿Cómo llegas hoy?</h2>
      <p class="frase">Con 3 toques calculo tu recuperación y, si vienes tocado, suavizo la sesión de hoy.</p>
      <ComoLlegas fecha={hoy} {sesion} />
    {/if}
  </section>

  {#if rec.contestada}
    <ul class="factores">
      {#each rec.factores as f (f.id)}
        <li>
          <span class="f-n"><b>{f.n}</b><small>{f.texto}{f.comparado === 'mejor' ? ' · mejor que tu media' : f.comparado === 'peor' ? ' · peor que tu media' : f.comparado === 'igual' ? ' · como siempre' : ''}</small></span>
          <span class="barra" aria-hidden="true"><i style="width:{(f.valor / 2) * 100}%;background:{color((f.valor / 2) * 100)}"></i>{#if f.media != null}<em style="left:{(f.media / 2) * 100}%"></em>{/if}</span>
        </li>
      {/each}
    </ul>
    {#if rec.consejo}<p class="consejo"><Icono n="lightbulb" tam={16} /> <span>{rec.consejo}</span></p>{/if}
  {/if}

  <section class="esfuerzo" aria-label="Esfuerzo">
    <h3><Icono n="flame" tam={18} /> Esfuerzo</h3>
    {#if esf.hoy}
      <p class="hoy-e"><b>{esf.hoy.titulo}</b><span class="cifra">{esf.hoy.rpe}/10 · {esf.hoy.duracion} min{esf.hoy.hecha ? '' : ' · previsto'}</span></p>
    {:else}
      <p class="hoy-e"><b>Hoy descansas</b><span>El esfuerzo de hoy es recuperar</span></p>
    {/if}
    <div class="barras" role="img" aria-label="Carga de entreno de los últimos 7 días">
      {#each esf.dias as d (d.fecha)}
        <div class="col" class:hoy={d.fecha === hoy}>
          <span class="zona"><i class:prevista={d.prevista} style="height:{(d.carga / maxCarga) * 100}%"></i></span>
          <small>{diaCorto(d.fecha)}</small>
        </div>
      {/each}
    </div>
    {#if esf.ratio != null}<p class="media">Esta semana llevas el {num(esf.ratio * 100, 0)} % de tu carga habitual. {lectura}</p>{/if}
    <p class="nota">La carga es minutos × lo dura que fue cada sesión (del 1 al 10).</p>
  </section>
</div>

<style>
  .rec { display: grid; gap: 14px; }
  .cab { display: grid; justify-items: center; text-align: center; gap: 6px; }
  .cab h2 { margin: 4px 0 0; font-size: 1.4rem; }
  .anillo { position: relative; display: grid; place-items: center; width: 156px; height: 156px; }
  .anillo :global(svg) { position: absolute; inset: 0; }
  .centro { position: relative; display: grid; justify-items: center; }
  .centro b { font-size: 2.6rem; line-height: 1; letter-spacing: -0.03em; }
  .centro b small { font-size: 1.1rem; margin-left: 2px; }
  .centro > small { font-size: 0.74rem; font-weight: 700; color: var(--texto-2); }
  .frase { margin: 4px 0 0; font-size: 0.95rem; line-height: 1.4; }
  .media { margin: 0; font-size: 0.8rem; color: var(--texto-2); }
  .cab :global(.como), .cab :global(.como-fila) { width: 100%; text-align: left; }
  .factores { list-style: none; margin: 0; padding: 4px 14px; border-radius: var(--r-l); background: var(--superficie); box-shadow: var(--sombra); }
  .factores li { display: grid; gap: 6px; padding: 10px 0; }
  .factores li + li { border-top: 1px solid var(--linea); }
  .f-n { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; }
  .f-n small { font-size: 0.78rem; color: var(--texto-2); }
  .barra { position: relative; height: 8px; border-radius: 999px; background: var(--superficie-3); }
  .barra i { display: block; height: 100%; border-radius: 999px; }
  .barra em { position: absolute; top: -3px; width: 2px; height: 14px; border-radius: 2px; background: var(--texto); transform: translateX(-1px); }
  .consejo { display: flex; gap: 8px; align-items: flex-start; margin: 0; padding: 10px 12px; border-radius: var(--r-m); background: var(--amarillo-claro); font-size: 0.86rem; }
  .consejo :global(svg) { flex-shrink: 0; margin-top: 2px; }
  .esfuerzo { display: grid; gap: 8px; padding: 14px; border-radius: var(--r-l); background: var(--superficie); box-shadow: var(--sombra); }
  .esfuerzo h3 { display: flex; align-items: center; gap: 8px; margin: 0; font-size: 1rem; }
  .hoy-e { display: flex; justify-content: space-between; gap: 10px; margin: 0; font-size: 0.9rem; }
  .hoy-e span { color: var(--texto-2); font-weight: 600; }
  .barras { display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px; height: 90px; }
  .col { display: grid; grid-template-rows: 1fr auto; justify-items: center; gap: 4px; }
  .zona { position: relative; width: 60%; height: 100%; border-radius: var(--r-xs); background: var(--superficie-2); overflow: hidden; }
  .zona i { position: absolute; bottom: 0; left: 0; right: 0; border-radius: var(--r-xs); background: var(--dato-e); }
  .zona i.prevista { background: color-mix(in srgb, var(--dato-e) 35%, transparent); }
  .col small { font-size: 0.7rem; font-weight: 700; color: var(--texto-3); }
  .col.hoy small { color: var(--texto); }
  .nota { margin: 0; font-size: 0.74rem; color: var(--texto-3); }
</style>
