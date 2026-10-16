<script>
  import Icono from '../../components/Icono.svelte';
  import Emoji from '../../components/Emoji.svelte';
  import { estado } from '../../stores/estado.js';
  import { abrirHoja } from '../../stores/ui.js';
  import { planDe } from '../../lib/hyrox/index.js';
  import { estimarCarrera, estrategia, nutricionDiaCarrera, semanaCarrera } from '../../lib/hyrox/carrera.js';
  import { ESTACIONES, pesoEstacion, CATEGORIAS } from '../../data/hyrox.js';
  import { hms, mmss } from '../../lib/hyrox/ritmos.js';
  import { hoyISO } from '../../lib/planificador.js';
  import { fechaLarga, capital } from '../../lib/formato.js';

  const plan = $derived(planDe($estado));
  const config = $derived($estado.hyrox.config);
  const perfil = $derived($estado.perfil);
  const est = $derived(estimarCarrera(config, perfil, $estado.hyrox.registros));
  const estr = $derived(estrategia(config, est));
  const sinCafeina = $derived((perfil.condiciones || []).includes('hipertension') || perfil.estres === 'alto');
  const nutri = $derived(nutricionDiaCarrera(perfil, config.horaCarrera || '10:00', est.total / 60, { sinCafeina }));
  const semana = $derived(semanaCarrera(perfil));
  const dias = $derived(plan?.carrera ? Math.round((new Date(`${plan.carrera}T12:00`) - new Date(`${hoyISO()}T12:00`)) / 86400000) : null);
  let verTramos = $state(false);
</script>

<div class="hero-carrera">
  <p>{plan?.carrera ? `${capital(fechaLarga(plan.carrera))} · ${config.horaCarrera || ''}` : 'Sin fecha de carrera'}</p>
  <h2>{dias !== null ? (dias > 0 ? `Faltan ${dias} días` : dias === 0 ? '¡Hoy es el día!' : 'Carrera completada') : 'Tu HYROX'}</h2>
  <div class="estimado"><span>Tiempo estimado</span><b>{hms(est.total)}</b><small>HYROX {CATEGORIAS[config.categoria].nombre}{config.categoria === 'relay' ? ' (si hicieras tú todo el recorrido)' : ''}</small></div>
  <div class="partes">
    <div><b>{hms(est.carreras)}</b><small>8 km corriendo</small></div>
    <div><b>{hms(est.estaciones)}</b><small>estaciones</small></div>
    <div><b>{mmss(est.roxzone)}</b><small>roxzone</small></div>
  </div>
</div>
<p class="pie-nota">{est.basadoEnMarcas ? 'Calculado con tus marcas y tus mejores tiempos registrados.' : 'Estimación según tu nivel: registra tus simulacros con tiempos por estación para afinarla.'}</p>

<button class="tramos-btn" onclick={() => (verTramos = !verTramos)}>{verTramos ? 'Ocultar' : 'Ver'} tiempos objetivo por tramo</button>
{#if verTramos}
  <div class="tabla">
    {#each est.tramos as t, i (i)}
      <div class="fila" class:run={t.tipo === 'run'}>
        <span class="n"><Icono e={t.tipo === 'run' ? '🏃' : t.emoji} tam={18} /></span>
        <span class="nom">{t.nombre}{t.real ? '' : ''}</span>
        <span class="t">{mmss(t.seg)}</span>
        <span class="ac">{hms(t.acumulado)}</span>
      </div>
    {/each}
  </div>
{/if}

<h2 class="seccion"><Emoji e="🧠" tam={24} /> Estrategia</h2>
<div class="tarjeta"><ul class="lista">{#each estr.general as g (g)}<li>{g}</li>{/each}</ul></div>
<div class="estaciones">
  {#each ESTACIONES as e (e.id)}
    <button class="est" onclick={() => abrirHoja('estacion', { id: e.id })}>
      <Emoji e={e.emoji} tam={30} />
      <span><b>{e.n}. {e.nombre}</b><small>{estr.estaciones[e.id]}</small></span>
    </button>
  {/each}
</div>

<h2 class="seccion"><Emoji e="🍌" tam={24} /> Nutrición el día de carrera</h2>
<div class="timeline-n">
  {#each nutri as n (n.titulo)}
    <div class="tn"><span class="h">{n.hora}</span><Emoji e={n.emoji} tam={28} /><div><b>{n.titulo}</b><p>{n.texto}</p></div></div>
  {/each}
</div>
<p class="pie-nota">Ensaya este plan en tus simulacros: el día de la carrera, nada nuevo.</p>

<h2 class="seccion"><Emoji e="📅" tam={24} /> La semana de la carrera</h2>
{#each semana as d (d.dia)}
  <div class="tarjeta dia-s"><Emoji e={d.emoji} tam={30} /><div><b>{d.dia}</b><p>{d.texto}</p></div></div>
{/each}

<h2 class="seccion"><Emoji e="🏋️" tam={24} /> Tus pesos de carrera</h2>
<div class="tarjeta">
  {#each ESTACIONES.filter((e) => e.pesos) as e (e.id)}
    <div class="peso"><span>{e.emoji} {e.nombre}</span><b>{pesoEstacion(e, config.categoria, perfil.sexo)}</b></div>
  {/each}
  <p class="pie-nota">Referencia de las últimas temporadas ({CATEGORIAS[config.categoria].nombre}, {perfil.sexo === 'm' ? 'mujer' : 'hombre'}). Comprueba el reglamento oficial de tu carrera.</p>
</div>

<style>
  .hero-carrera { position: relative; overflow: hidden; padding: 18px; border-radius: 26px; background: radial-gradient(110% 90% at 100% 0%, rgb(255 91 31 / 0.28), transparent 60%), var(--superficie); box-shadow: var(--sombra); }
  .hero-carrera p { margin: 0; font-weight: 600; font-size: 0.78rem; color: var(--texto-2); }
  .hero-carrera h2 { margin: 2px 0 14px; font-size: 1.5rem; }
  .estimado { display: grid; }
  .estimado span { font-weight: 700; font-size: 0.74rem; color: var(--texto-2); }
  .estimado b { font-size: 3rem; font-weight: 800; line-height: 1.05; letter-spacing: -0.04em; font-variant-numeric: tabular-nums; background: var(--hero); -webkit-background-clip: text; background-clip: text; color: transparent; }
  .estimado small { font-weight: 600; color: var(--texto-2); }
  .partes { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-top: 14px; }
  .partes div { display: grid; padding: 10px 6px; border-radius: 14px; background: var(--superficie-2); text-align: center; font-weight: 800; font-variant-numeric: tabular-nums; }
  .partes small { font-weight: 600; font-size: 0.68rem; color: var(--texto-2); }
  .tramos-btn { width: 100%; margin: 10px 0; padding: 12px; border-radius: 14px; border: 0; background: var(--superficie); box-shadow: var(--sombra); font-weight: 700; font-size: 0.86rem; cursor: pointer; color: var(--texto); }
  .tabla { border-radius: 18px; overflow: hidden; background: var(--superficie); box-shadow: var(--sombra); }
  .fila { display: grid; grid-template-columns: 34px 1fr auto 70px; gap: 8px; align-items: center; padding: 7px 12px; font-size: 0.88rem; font-weight: 700; }
  .fila.run { background: var(--superficie-2); }
  .fila .t { font-weight: 800; }
  .fila .ac { text-align: right; color: var(--texto-2); font-variant-numeric: tabular-nums; }
  .lista { margin: 0; padding-left: 18px; display: grid; gap: 6px; font-weight: 600; font-size: 0.92rem; }
  .estaciones { display: grid; gap: 6px; }
  .est { display: flex; gap: 12px; align-items: center; padding: 10px 12px; border: 0; border-radius: 16px; background: var(--superficie); box-shadow: var(--sombra); text-align: left; cursor: pointer; color: var(--texto); }
  .est span { display: grid; }
  .est small { color: var(--texto-2); font-weight: 600; font-size: 0.8rem; }
  .timeline-n { display: grid; gap: 8px; }
  .tn { display: grid; grid-template-columns: 48px 32px 1fr; gap: 8px; align-items: start; padding: 10px 12px; border-radius: 16px; background: var(--superficie); box-shadow: var(--sombra); }
  .tn .h { font-weight: 800; font-size: 0.85rem; padding-top: 4px; }
  .tn p { margin: 2px 0 0; font-size: 0.86rem; font-weight: 600; color: var(--texto-2); }
  .dia-s { display: flex; gap: 12px; align-items: flex-start; margin: 8px 0; }
  .dia-s p { margin: 3px 0 0; font-size: 0.9rem; font-weight: 600; }
  .peso { display: flex; justify-content: space-between; padding: 7px 0; border-bottom: 1px solid var(--superficie-2); font-weight: 700; }
</style>
