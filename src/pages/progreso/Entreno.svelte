<script>
  import Emoji from '../../components/Emoji.svelte';
  import { estado } from '../../stores/estado.js';
  import { planDe } from '../../lib/hyrox/index.js';
  import { estadisticas } from '../../lib/hyrox/stats.js';
  import { FASES } from '../../lib/hyrox/plan.js';
  import { ESTACIONES, TIEMPOS_BASE, NIVELES } from '../../data/hyrox.js';
  import { hoyISO } from '../../lib/planificador.js';
  import { mmss, hms } from '../../lib/hyrox/ritmos.js';
  import { fechaCorta, num } from '../../lib/formato.js';
  import Icono from '../../components/Icono.svelte';

  const signo = (x) => (x === null ? '—' : `${x > 0 ? '+' : ''}${num(x, 1)} %`);
  let grupoAbierto = $state(null);

  const plan = $derived(planDe($estado));
  const st = $derived(plan ? estadisticas(plan, $estado.hyrox.registros, hoyISO()) : null);
  const ult = $derived(st ? st.semanas.slice(-8) : []);
  const maxCarga = $derived(Math.max(1, ...ult.map((s) => s.carga)));
  const nivel = $derived(NIVELES[$estado.hyrox?.config.nivel] || NIVELES.intermedio);

  // Gráfica de ritmo de series (más abajo = más rápido)
  const W = 320; const H = 120;
  const graf = $derived.by(() => {
    if (!st || st.series.length < 2) return null;
    const v = st.series.map((x) => x.ritmo);
    const min = Math.min(...v) - 5; const max = Math.max(...v) + 5;
    const X = (i) => 20 + (i / (v.length - 1)) * (W - 40);
    const Y = (r) => 10 + ((r - min) / (max - min)) * (H - 30);
    return { d: v.map((r, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(r).toFixed(1)}`).join(' '), puntos: v.map((r, i) => ({ x: X(i), y: Y(r), r })) };
  });
</script>

{#if !st}
  <div class="tarjeta vacia"><Emoji e="🏋️" tam={56} /><p>Crea tu plan HYROX en Entreno para ver aquí tu evolución.</p><a class="boton" href="#entreno">Ir a Entreno</a></div>
{:else}
  <div class="totales">
    <div><Emoji e="✅" tam={28} /><b>{st.totalSesiones}</b><small>sesiones</small></div>
    <div><Emoji e="🏃" tam={28} /><b>{st.totalKm}</b><small>km</small></div>
    <div><Emoji e="⏱️" tam={28} /><b>{num(st.totalHoras, 1)}</b><small>horas</small></div>
    <div><Emoji e="🎯" tam={28} /><b>{st.cumplimiento ?? '—'}{st.cumplimiento !== null ? '%' : ''}</b><small>cumplido</small></div>
  </div>

  <div class="tarjeta">
    <b>Carga semanal</b>
    <div class="barras">
      {#each ult as s (s.w)}
        <div class="col">
          <div class="zona"><div class="barra" style="height:{(s.carga / maxCarga) * 100}%;background:{FASES[s.fase].color}"></div></div>
          <small>S{s.w + 1}</small>
          <small class="h">{s.hechas}/{s.previstas}</small>
        </div>
      {/each}
    </div>
    <p class="pie-nota">Carga = minutos × esfuerzo percibido (RPE). Debajo, sesiones hechas sobre previstas.</p>
  </div>

  <h2 class="seccion"><Emoji e="🏅" tam={24} /> Récords</h2>
  <div class="records">
    <div><small>Mejor simulacro completo</small><b>{st.records.mejorSimulacro ? hms(st.records.mejorSimulacro.tiempo) : '—'}</b></div>
    <div><small>Series más rápidas</small><b>{st.records.mejorSerie ? `${mmss(st.records.mejorSerie)}/km` : '—'}</b></div>
    <div><small>Sentadilla máxima</small><b>{st.records.maxSentadilla ? `${st.records.maxSentadilla} kg` : '—'}</b></div>
  </div>

  <div class="tarjeta">
    <b>Tus estaciones</b>
    {#each ESTACIONES as e (e.id)}
      {@const t = st.records.estaciones[e.id]}
      {@const ref = TIEMPOS_BASE[e.id] * nivel.k}
      <div class="est">
        <span class="n"><Emoji e={e.emoji} tam={22} /> {e.nombre}</span>
        <div class="pista"><div class="relleno" class:vacio={!t} style="width:{t ? Math.min(100, (ref / t) * 70) : 0}%"></div></div>
        <span class="t">{t ? mmss(t) : '—'}</span>
      </div>
    {/each}
    <p class="pie-nota">Mejor tiempo registrado en simulacros. La barra crece cuanto más rápido vas respecto a la referencia de tu nivel ({mmss(TIEMPOS_BASE.ski * nivel.k)} en SkiErg, por ejemplo).</p>
  </div>

  <h2 class="seccion"><Icono n="dumbbell" tam={22} /> Fuerza por zonas</h2>
  {#if !st.fuerza.grupos.length}
    <div class="tarjeta"><p class="pie-nota sin-margen">Apunta los kilos y repeticiones al registrar tus sesiones de fuerza y torso: aquí verás qué zonas suben y cuál se queda atrás.</p></div>
  {:else}
    {#if st.fuerza.flojo}
      <div class="aviso-flojo"><Icono n="triangle-alert" tam={20} /><span><b>{st.fuerza.flojo.nombre}</b> es lo que menos sube ({signo(st.fuerza.flojo.cambio)} en 8 semanas). Dale más caña: una serie más en sus ejercicios o sube 2,5 kg cuando completes todas las repeticiones.</span></div>
    {/if}
    <div class="tarjeta grupos">
      {#each st.fuerza.grupos as g (g.grupo)}
        <button class="grupo" onclick={() => (grupoAbierto = grupoAbierto === g.grupo ? null : g.grupo)} aria-expanded={grupoAbierto === g.grupo}>
          <span class="g-n">{g.nombre}<small>{g.series} series/semana</small></span>
          <span class="g-v" class:sube={g.cambio > 0} class:baja={g.cambio < 0}>{#if g.cambio !== null}<Icono n={g.cambio >= 0 ? 'trending-up' : 'trending-down'} tam={16} />{/if} {signo(g.cambio)}</span>
        </button>
        {#if grupoAbierto === g.grupo}
          <ul class="g-ej">
            {#each g.ejercicios as x (x.id)}
              <li><span>{x.nombre}<small>{x.veces} {x.veces === 1 ? 'sesión' : 'sesiones'} · mejor {String(x.ultimo.kg).replace('.', ',')} kg × {x.ultimo.reps}</small></span><b>{signo(x.cambio)}</b></li>
            {/each}
          </ul>
        {/if}
      {/each}
      <p class="pie-nota">Cambio de tu fuerza estimada (1RM) en las últimas 8 semanas. Toca una zona para ver sus ejercicios. Para crecer, cada grupo necesita unas 10-20 series a la semana.</p>
    </div>
  {/if}

  {#if graf}
    <div class="tarjeta">
      <b>Ritmo de tus series</b>
      <svg viewBox="0 0 {W} {H}" class="graf" role="img" aria-label="Evolución del ritmo de series">
        <path d={graf.d} fill="none" stroke="var(--coral)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
        {#each graf.puntos as p, i (i)}<circle cx={p.x} cy={p.y} r="4" fill="var(--superficie)" stroke="var(--coral)" stroke-width="2"><title>{mmss(p.r)}/km</title></circle>{/each}
      </svg>
      <p class="pie-nota">Más abajo = más rápido. De {mmss(st.series[0].ritmo)} a {mmss(st.series.at(-1).ritmo)}/km.</p>
    </div>
  {/if}

  {#if st.simulacros.length}
    <div class="tarjeta">
      <b>Simulacros</b>
      {#each st.simulacros as x (x.fecha)}
        <div class="sim"><span>{fechaCorta(x.fecha)} · {x.titulo}</span><b>{hms(x.tiempo)}</b></div>
      {/each}
    </div>
  {/if}
{/if}

<style>
  .totales { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
  .totales div { display: grid; justify-items: center; padding: 12px 4px; border-radius: 18px; background: var(--superficie); box-shadow: var(--sombra); color: var(--primario); }
  .totales b { font-size: 1.3rem; font-weight: 800; color: var(--texto); letter-spacing: -0.03em; }
  .totales small { font-size: 0.7rem; font-weight: 800; color: var(--texto-2); }
  .barras { display: grid; grid-template-columns: repeat(8, 1fr); gap: 6px; height: 150px; margin-top: 10px; }
  .col { display: grid; grid-template-rows: 1fr auto auto; justify-items: center; }
  .zona { width: 100%; display: flex; align-items: flex-end; }
  .barra { width: 100%; border-radius: 8px 8px 3px 3px; min-height: 3px; }
  .col small { font-size: 0.68rem; font-weight: 800; color: var(--texto-2); }
  .col .h { color: var(--primario-fuerte); }
  .records { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
  .records div { display: grid; padding: 12px 10px; border-radius: 18px; background: radial-gradient(120% 100% at 0% 0%, rgb(255 91 31 / 0.16), transparent 70%), var(--superficie); box-shadow: var(--sombra); }
  .records small { font-size: 0.7rem; font-weight: 800; color: var(--texto-2); }
  .records b { font-size: 1.05rem; font-weight: 800; }
  .est { display: grid; grid-template-columns: 1.4fr 1fr auto; gap: 8px; align-items: center; padding: 6px 0; font-weight: 700; font-size: 0.85rem; }
  .est .n { display: flex; gap: 6px; align-items: center; }
  .pista { height: 8px; border-radius: 999px; background: var(--superficie-2); overflow: hidden; }
  .relleno { height: 100%; border-radius: 999px; background: var(--primario); }
  .est .t { font-weight: 800; min-width: 42px; text-align: right; }
  .graf { width: 100%; height: auto; margin-top: 8px; }
  .sim { display: flex; justify-content: space-between; padding: 7px 0; border-top: 1px solid var(--superficie-2); font-weight: 700; font-size: 0.9rem; }
  .vacia { text-align: center; }
  .sin-margen { margin: 0; }
  .aviso-flojo { display: flex; gap: 10px; align-items: flex-start; padding: 12px 14px; margin-bottom: 10px; border-radius: 18px; background: color-mix(in srgb, var(--primario) 14%, var(--superficie)); color: var(--texto); font-size: 0.88rem; line-height: 1.4; }
  .aviso-flojo :global(svg) { color: var(--primario); flex-shrink: 0; margin-top: 2px; }
  .grupo { width: 100%; display: flex; justify-content: space-between; align-items: center; gap: 10px; min-height: 52px; padding: 8px 0; border: 0; border-top: 1px solid var(--linea); background: none; color: var(--texto); font: inherit; text-align: left; cursor: pointer; }
  .grupo:first-child { border-top: 0; }
  .g-n { display: grid; font-weight: 700; }
  .g-n small { font-weight: 600; font-size: 0.75rem; color: var(--texto-2); }
  .g-v { display: flex; align-items: center; gap: 4px; font-weight: 800; font-variant-numeric: tabular-nums; color: var(--texto-2); }
  .g-v.sube { color: var(--exito); }
  .g-v.baja { color: var(--coral); }
  .g-ej { list-style: none; margin: 0 0 8px; padding: 0 0 0 10px; display: grid; gap: 6px; font-size: 0.84rem; }
  .g-ej li { display: flex; justify-content: space-between; gap: 10px; }
  .g-ej span { display: grid; font-weight: 600; }
  .g-ej small { color: var(--texto-2); font-size: 0.74rem; }
</style>
