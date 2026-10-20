<script>
  import Icono from '../../components/Icono.svelte';
  import Emoji from '../../components/Emoji.svelte';
  import Portada from '../../components/Portada.svelte';
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
</script>

<Portada foto="img/sesiones/carrera.webp" color="var(--primario)" alto={340} etiqueta="Tu carrera">
  <div class="sup">
    <span class="chip">{plan?.carrera ? `${capital(fechaLarga(plan.carrera))}${config.horaCarrera ? ` · ${config.horaCarrera}` : ''}` : 'Sin fecha de carrera'}</span>
    {#if dias !== null && dias >= 0}<span class="chip fuerte cifra">{dias > 0 ? `${dias} días` : '¡Hoy!'}</span>{/if}
  </div>
  <div class="abajo">
    <span class="et">Tiempo estimado · HYROX {CATEGORIAS[config.categoria].nombre}</span>
    <b class="tiempo cifra">{hms(est.total)}</b>
    <div class="partes">
      <div><b class="cifra">{hms(est.carreras)}</b><small>8 km corriendo</small></div>
      <div><b class="cifra">{hms(est.estaciones)}</b><small>estaciones</small></div>
      <div><b class="cifra">{mmss(est.roxzone)}</b><small>roxzone</small></div>
    </div>
  </div>
</Portada>
<p class="pie-nota">{est.basadoEnMarcas ? 'Calculado con tus marcas y tus mejores tiempos registrados.' : 'Estimación según tu nivel: registra tus simulacros con tiempos por estación para afinarla.'}{config.categoria === 'relay' ? ' (Como si hicieras tú todo el recorrido.)' : ''}</p>

<h3 class="cab">Estrategia</h3>
<ul class="estrategia">{#each estr.general as g (g)}<li>{g}</li>{/each}</ul>

<!-- El recorrido: 1 km corriendo y una estación, ocho veces, con tiempo objetivo y acumulado -->
<h3 class="cab">El recorrido<small>Toca una estación para ver técnica y errores</small></h3>
<ol class="ruta">
  {#each est.tramos as t, i (i)}
    {#if t.tipo === 'run'}
      <li class="km"><span class="linea" aria-hidden="true"></span><span class="km-txt cifra"><Icono n="footprints" tam={14} /> 1 km · {mmss(t.seg)}</span></li>
    {:else}
      <li class="est">
        <button onclick={() => abrirHoja('estacion', { id: t.id })}>
          <span class="num cifra">{t.n}</span>
          <span class="est-txt"><b>{t.nombre}</b><small>{estr.estaciones[t.id]}</small></span>
          <span class="tiempos cifra"><b>{mmss(t.seg)}</b><small>{hms(t.acumulado)}</small></span>
        </button>
      </li>
    {/if}
  {/each}
  <li class="meta"><span class="num"><Icono n="flag" tam={14} grosor={2.4} /></span><b>Meta</b><span class="cifra">{hms(est.total)}</span></li>
</ol>

<h3 class="cab">Qué comer el día de la carrera</h3>
<div class="timeline-n">
  {#each nutri as n (n.titulo)}
    <div class="tn"><span class="h">{n.hora}</span><Emoji e={n.emoji} tam={28} /><div><b>{n.titulo}</b><p>{n.texto}</p></div></div>
  {/each}
</div>
<p class="pie-nota">Ensaya este plan en tus simulacros: el día de la carrera, nada nuevo.</p>

<h3 class="cab">La semana de la carrera</h3>
{#each semana as d (d.dia)}
  <div class="tarjeta dia-s"><Emoji e={d.emoji} tam={30} /><div><b>{d.dia}</b><p>{d.texto}</p></div></div>
{/each}

<h3 class="cab">Tus pesos de carrera</h3>
<div class="tarjeta">
  {#each ESTACIONES.filter((e) => e.pesos) as e (e.id)}
    <div class="peso"><span>{e.nombre}</span><b class="cifra">{pesoEstacion(e, config.categoria, perfil.sexo)}</b></div>
  {/each}
  <p class="pie-nota">Referencia de las últimas temporadas ({CATEGORIAS[config.categoria].nombre}, {perfil.sexo === 'm' ? 'mujer' : 'hombre'}). Comprueba el reglamento oficial de tu carrera.</p>
</div>

<style>
  .sup { display: flex; justify-content: space-between; gap: 8px; }
  .chip { padding: 5px 10px; border-radius: 999px; background: rgb(255 255 255 / 0.14); font-size: 0.78rem; font-weight: 700; }
  .chip.fuerte { background: #fff; color: #0b0b0e; font-weight: 800; }
  .abajo { margin-top: auto; display: grid; }
  .et { font-size: 0.8rem; font-weight: 600; color: rgb(255 255 255 / 0.75); }
  .tiempo { font-size: 3.4rem; line-height: 1; font-weight: 800; letter-spacing: -0.04em; margin: 4px 0 14px; }
  .partes { display: flex; gap: 20px; }
  .partes div { display: grid; }
  .partes b { font-size: 1.15rem; font-weight: 800; letter-spacing: -0.02em; }
  .partes small { font-size: 0.72rem; font-weight: 600; color: rgb(255 255 255 / 0.7); }
  .cab { margin: 26px 2px 10px; font-size: 1.05rem; font-weight: 800; }
  .cab small { display: block; margin-top: 2px; font-size: 0.78rem; font-weight: 600; color: var(--texto-2); }
  .estrategia { margin: 0; padding: 14px 16px 14px 32px; border-radius: 18px; background: var(--superficie); box-shadow: var(--sombra); display: grid; gap: 8px; font-size: 0.92rem; color: var(--texto-2); }

  /* El recorrido: estaciones como paradas y el km de carrera como tramo de la línea */
  .ruta { list-style: none; margin: 0; padding: 0; }
  .km { position: relative; display: flex; align-items: center; min-height: 34px; padding-left: 44px; }
  .linea { position: absolute; left: 17px; top: 0; bottom: 0; border-left: 2px dashed color-mix(in srgb, var(--primario) 55%, transparent); }
  .km-txt { display: inline-flex; align-items: center; gap: 6px; color: var(--texto-3); font-size: 0.78rem; font-weight: 700; }
  .est button { width: 100%; display: flex; align-items: center; gap: 12px; padding: 10px 12px 10px 0; border: 0; background: none; color: var(--texto); font: inherit; text-align: left; cursor: pointer; }
  .num { flex-shrink: 0; width: 36px; height: 36px; border-radius: 50%; display: grid; place-items: center; background: var(--primario); color: #0b0b0e; font-weight: 800; }
  .est-txt { flex: 1; min-width: 0; display: grid; }
  .est-txt b { font-size: 0.98rem; }
  .est-txt small { color: var(--texto-2); font-size: 0.8rem; line-height: 1.35; }
  .tiempos { flex-shrink: 0; display: grid; justify-items: end; }
  .tiempos b { font-size: 1.05rem; font-weight: 800; }
  .tiempos small { color: var(--texto-3); font-size: 0.74rem; font-weight: 600; }
  .meta { display: flex; align-items: center; gap: 12px; padding: 10px 0; border-top: 1px solid var(--linea); margin-top: 6px; }
  .meta .num { background: #fff; }
  .meta b { flex: 1; }
  .meta span:last-child { font-weight: 800; font-size: 1.15rem; }

  .timeline-n { display: grid; gap: 8px; }
  .tn { display: grid; grid-template-columns: 48px 32px 1fr; gap: 8px; align-items: start; padding: 10px 12px; border-radius: 16px; background: var(--superficie); box-shadow: var(--sombra); }
  .tn .h { font-weight: 800; font-size: 0.85rem; padding-top: 4px; font-variant-numeric: tabular-nums; }
  .tn p { margin: 2px 0 0; font-size: 0.86rem; color: var(--texto-2); }
  .dia-s { display: flex; gap: 12px; align-items: flex-start; margin: 8px 0; }
  .dia-s p { margin: 3px 0 0; font-size: 0.9rem; color: var(--texto-2); }
  .peso { display: flex; justify-content: space-between; padding: 9px 0; border-bottom: 1px solid var(--linea); }
  .peso span { color: var(--texto-2); font-weight: 600; }
  .peso b { font-weight: 800; }
</style>
