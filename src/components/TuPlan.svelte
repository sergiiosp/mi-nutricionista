<script>
  // «Tu plan»: lo que te diría tu nutricionista y tu entrenador, contado con gráficos: portada con las fases,
  // la semana día a día, la cuenta de tus kcal, lo que esperar este mes y cómo vas. El detalle técnico de
  // cada bloque, en «Ver el detalle». Todo sale de tus datos (lib/coach.js).
  import { onMount } from 'svelte';
  import { slide } from 'svelte/transition';
  import Icono from './Icono.svelte';
  import Portada from './Portada.svelte';
  import Anillos from './Anillos.svelte';
  import { estado, actualizar } from '../stores/estado.js';
  import { calcularObjetivos } from '../lib/nutricion.js';
  import { hoyISO } from '../lib/planificador.js';
  import { explicarPlan } from '../lib/coach.js';
  import { abrirHoja } from '../stores/ui.js';
  import { FASES } from '../lib/hyrox/plan.js';
  import { entero, fechaCorta, num, diaSemana } from '../lib/formato.js';

  const hoy = hoyISO();
  const x = $derived(explicarPlan($estado, calcularObjetivos($estado.perfil), hoy));
  const v = $derived(x.visual);
  const sec = $derived(Object.fromEntries(x.secciones.map((s) => [s.id, s])));
  let abiertos = $state({});
  const alternar = (k) => (abiertos = { ...abiertos, [k]: !abiertos[k] });
  // Un único momento animado: al abrir, las barras crecen y los anillos se llenan
  let listo = $state(false);
  onMount(() => { actualizar((e) => { e.coachVisto = x.lunes; }); requestAnimationFrame(() => (listo = true)); });
  const CORTO = { base: 'Base', construccion: 'Construcción', especifico: 'Específico', taper: 'Puesta a punto' };
  const maxVol = $derived(Math.max(1, ...(v.portada?.semanas || []).map((w) => w.vol)));
  // Tendencia del peso: línea de tus pesajes de las últimas 6 semanas
  const linea = $derived.by(() => {
    const ps = v.pesos;
    if (ps.length < 2) return null;
    const W = 300, H = 70;
    const t0 = new Date(`${ps[0].fecha}T12:00`).getTime(), t1 = new Date(`${ps.at(-1).fecha}T12:00`).getTime();
    const min = Math.min(...ps.map((p) => p.peso)) - 0.3, max = Math.max(...ps.map((p) => p.peso)) + 0.3;
    const X = (f) => ((new Date(`${f}T12:00`).getTime() - t0) / Math.max(1, t1 - t0)) * (W - 8) + 4;
    const Y = (k) => H - 6 - ((k - min) / (max - min)) * (H - 12);
    const pts = ps.map((p) => [X(p.fecha), Y(p.peso)]);
    return { W, H, d: pts.map((q, i) => `${i ? 'L' : 'M'}${q[0].toFixed(1)} ${q[1].toFixed(1)}`).join(' '), ultimo: pts.at(-1), area: `M${pts[0][0]} ${H} ${pts.map((q) => `L${q[0].toFixed(1)} ${q[1].toFixed(1)}`).join(' ')} L${pts.at(-1)[0]} ${H} Z` };
  });
  const ESTADO = { bien: ['check', 'en camino'], mejor: ['star', 'mejor de lo esperado'], ojo: ['triangle-alert', 'revísalo'] };

  // Semana: altura de cada barra según las kcal del día
  const maxKcal = $derived(Math.max(1, ...v.semana.map((d) => d.kcal)));
  const minKcal = $derived(Math.min(...v.semana.filter((d) => d.kcal).map((d) => d.kcal), maxKcal));
  const claveDia = $derived(v.semana.find((d) => d.clave));
  // Cuenta de kcal: cada tramo empieza donde acaba el anterior (cascada)
  const cascada = $derived.by(() => {
    let acc = 0;
    const tope = Math.max(...v.cuenta.map((_, i) => v.cuenta.slice(0, i + 1).reduce((t, c) => t + c.v, 0)));
    return v.cuenta.map((c) => {
      const ini = c.v >= 0 ? acc : acc + c.v;
      acc += c.v;
      return { ...c, izq: (ini / tope) * 100, ancho: (Math.abs(c.v) / tope) * 100 };
    });
  });
  const FLECHA = { baja: 'trending-down', sube: 'trending-up', igual: 'move-horizontal' };
</script>

{#snippet detalle(k, ids)}
  {@const items = ids.flatMap((id) => sec[id]?.items || [])}
  {#if items.length}
    <button class="ver" aria-expanded={!!abiertos[k]} onclick={() => alternar(k)}>{abiertos[k] ? 'Ocultar el detalle' : 'Ver el detalle'} <Icono n={abiertos[k] ? 'chevron-up' : 'chevron-down'} tam={15} /></button>
    {#if abiertos[k]}
      <div class="detalle" transition:slide={{ duration: 180 }}>
        {#each items as it (it.titulo)}
          <p><b>{it.titulo}.</b> {it.texto}</p>
          {#if it.detalle?.length}<ul>{#each it.detalle as d (d)}<li>{d}</li>{/each}</ul>{/if}
        {/each}
      </div>
    {/if}
  {/if}
{/snippet}

<div class="plan">
  <!-- Portada: dónde estás en el plan -->
  {#if v.portada}
    {@const p = v.portada}
    <Portada foto={p.foto} color="var(--primario)" alto={330} etiqueta="Tu plan">
      <div class="po-sup">
        <span class="po-chip"><Icono n="sparkles" tam={14} grosor={2.2} /> Tu plan, explicado</span>
        {#if p.dias != null && p.dias >= 0}<span class="po-chip fuerte cifra">{p.dias} días</span>{/if}
      </div>
      <div class="po-abajo">
        <small>Semana {p.semana} de {p.total}{p.deload ? ' · descarga' : ''}</small>
        <h2>Fase {p.fase.toLowerCase()}</h2>
        <p>{p.desc}</p>
        <div class="volumen" role="img" aria-label="Volumen de cada semana del plan; estás en la semana {p.semana}">
          {#each p.semanas as w, i (w.n)}
            <i class:actual={w.n === p.semana} class:pasada={w.n < p.semana} class:descarga={w.deload}
              style="--c:{FASES[w.fase].color};height:{listo ? 18 + (w.vol / maxVol) * 82 : 4}%;transition-delay:{i * 18}ms"></i>
          {/each}
        </div>
        <div class="fases-ley">
          {#each p.tramos as t (t.desde)}
            <span class:actual={p.semana >= t.desde && p.semana <= t.hasta} style="flex:{t.hasta - t.desde + 1};--c:{FASES[t.fase].color}"><i></i>{CORTO[t.fase]}</span>
          {/each}
        </div>
        {#if p.carrera}<small class="po-meta">HYROX el {fechaCorta(p.carrera)}</small>{/if}
      </div>
    </Portada>
  {:else}
    <header class="sin-hyrox"><span class="p-ic"><Icono n="sparkles" tam={20} /></span><h2>Tu plan, explicado</h2></header>
  {/if}
  <div class="coach-dice">
    <span class="cd-ic"><Icono n="sparkles" tam={18} /></span>
    <p><small>Tu coach dice</small>{v.coach}</p>
  </div>
  {#if v.carrera}
    <button class="carrera" onclick={() => abrirHoja('diaCarrera', { fecha: v.carrera.fecha })}>
      <span class="ca-ic"><Icono n="flag" tam={20} /></span>
      <span class="ca-txt"><b>{v.carrera.nombre}</b><small>{diaSemana(v.carrera.fecha)} {Number(v.carrera.fecha.slice(8))} · {v.carrera.dias === 0 ? 'hoy' : v.carrera.dias === 1 ? 'mañana' : `en ${v.carrera.dias} días`}</small></span>
      {#if v.carrera.objetivo}<span class="ca-obj"><b class="cifra">{v.carrera.objetivo}</b><small>{v.carrera.ritmo || 'objetivo'}</small></span>{/if}
    </button>
  {/if}

  <!-- Esta semana, día a día -->
  <section class="bloque-plan">
    <h3><Icono n="calendar-days" tam={18} /> Esta semana</h3>
    <div class="totales">
      <span><b class="cifra">{v.totalSemana.hechas}/{v.totalSemana.sesiones}</b> sesiones</span>
      <span><b class="cifra">{num(v.totalSemana.horas, 1)} h</b> de entreno</span>
      <span><b class="cifra">{entero(v.totalSemana.kcal)}</b> kcal/día</span>
    </div>
    <div class="dias">
      {#each v.semana as d (d.fecha)}
        <div class="dia" class:hoy={d.hoy} class:clave={d.clave} class:pasado={d.fecha < hoy}>
          <small>{d.dia}</small>
          <b class="cifra">{d.num}</b>
          <span class="d-ic" class:hecha={d.ses?.hecha} class:descanso={!d.ses}>
            {#if d.ses?.hecha}<Icono n="check" tam={14} grosor={2.8} />{:else if d.ses}<Icono e={d.ses.emoji} tam={14} grosor={2.2} />{:else if d.libre}<Icono n="party-popper" tam={14} />{:else}<Icono n="moon" tam={13} />{/if}
          </span>
          <span class="d-barra" aria-hidden="true"><i class:entreno={d.ses && !['caminar', 'recuperacion'].includes(d.ses.tipo)} style="height:{listo && d.kcal ? 25 + ((d.kcal - minKcal) / Math.max(1, maxKcal - minKcal)) * 75 : 0}%;transition-delay:{120 + v.semana.indexOf(d) * 40}ms"></i></span>
          <small class="cifra d-kcal">{d.kcal ? (d.kcal / 1000).toFixed(1).replace('.', ',') : ''}</small>
        </div>
      {/each}
    </div>
    <p class="nota-sem">{#if claveDia}<b>Sesión clave:</b> {claveDia.ses.titulo} ({claveDia.ses.duracion} min).{' '}{/if}{sec.semana?.items[1]?.texto || ''}</p>
    <p class="leyenda"><i class="l-ent"></i> días de entreno <i class="l-desc"></i> descanso · miles de kcal de tu menú</p>
    {@render detalle('semana', ['semana'])}
  </section>

  <!-- Por qué tus números: la cuenta -->
  <section class="bloque-plan">
    <h3><Icono n="target" tam={18} /> Por qué comes {entero(v.total)} kcal</h3>
    <div class="cuenta">
      {#each cascada as c (c.n)}
        <div class="c-fila">
          <span class="c-txt"><b>{c.n}</b><small>{c.sub}</small></span>
          <span class="c-pista"><i class:neg={c.v < 0} style="left:{c.izq}%;width:{listo ? Math.max(1.5, c.ancho) : 0}%;transition-delay:{250 + cascada.indexOf(c) * 120}ms"></i></span>
          <b class="cifra c-v" class:neg={c.v < 0}>{cascada.indexOf(c) === 0 ? '' : c.v > 0 ? '+' : c.v < 0 ? '−' : ''}{entero(Math.abs(c.v))}</b>
        </div>
      {/each}
      <div class="c-total"><span>Lo que comes de media</span><b class="cifra">{entero(v.total)} <small>kcal/día</small></b></div>
    </div>
    <div class="macros-barra" aria-hidden="true">{#each v.macros as m (m.n)}<i style="flex:{m.pct};background:{m.color}"></i>{/each}</div>
    <div class="macros-ley">
      {#each v.macros as m (m.n)}
        <div><small><i style="background:{m.color}"></i>{m.n}</small><b class="cifra">{m.g} g</b><span>{m.sub}</span></div>
      {/each}
    </div>
    {@render detalle('numeros', ['numeros'])}
  </section>

  <!-- Qué esperar este mes -->
  <section class="bloque-plan">
    <h3><Icono n="trending-up" tam={18} /> Qué esperar este mes</h3>
    <div class="esperado">
      {#each v.esperado as e (e.n)}
        <div class="esp {e.dir}">
          <span class="esp-ic"><Icono n={FLECHA[e.dir]} tam={26} grosor={2.4} /></span>
          <small>{e.n}</small>
          <b>{e.dir === 'baja' ? '−' : e.dir === 'sube' ? '+' : ''}{e.rango.replace(/^[+−-]/, '')}</b>
          {#if e.estado}
            <span class="esp-estado {e.estado}"><Icono n={ESTADO[e.estado][0]} tam={12} grosor={2.6} /> {e.real}</span>
            <span class="esp-real">al mes · {ESTADO[e.estado][1]}</span>
          {:else}<span class="esp-real">sin datos aún</span>{/if}
        </div>
      {/each}
    </div>
    {#each (sec.mes?.items || []).filter((i) => ['En tu agenda', 'Prioridad de salud'].includes(i.titulo)) as it (it.titulo)}
      <p class="nota" class:alerta={it.titulo === 'Prioridad de salud'}><Icono n={it.titulo === 'En tu agenda' ? 'calendar-days' : 'triangle-alert'} tam={16} /> <span>{it.texto}</span></p>
    {/each}
    {@render detalle('mes', ['mes', 'donde'])}
  </section>

  <!-- Cómo vas -->
  <section class="bloque-plan">
    <h3><Icono n="activity" tam={18} /> Cómo vas · últimos 7 días</h3>
    <div class="anillos-fila">
      {#each v.anillos as a (a.n)}
        <div class="mini">
          <div class="mini-anillo"><Anillos anillos={[a]} tam={68} grosor={8} /><b class="cifra">{a.valor}<small>/{a.meta}</small></b></div>
          <small>{a.n}</small>
        </div>
      {/each}
    </div>
    {#if linea}
      <div class="tend">
        <div class="t-cab"><small>Tu peso, 6 semanas</small><b class="cifra">{v.tendencia != null ? `${v.tendencia > 0 ? '+' : ''}${num(v.tendencia, 2)} kg/sem` : ''}</b><small class="t-esp">esperado {v.esperadoSemana > 0 ? '+' : ''}{num(v.esperadoSemana, 2)}</small></div>
        <svg viewBox="0 0 {linea.W} {linea.H}" preserveAspectRatio="none" aria-hidden="true">
          <defs><linearGradient id="t-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--primario)" stop-opacity="0.22" /><stop offset="1" stop-color="var(--primario)" stop-opacity="0" /></linearGradient></defs>
          <path d={linea.area} fill="url(#t-area)" />
          <path class="t-linea" class:listo d={linea.d} fill="none" stroke="var(--primario)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" pathLength="100" />
          <circle cx={linea.ultimo[0]} cy={linea.ultimo[1]} r="4" fill="var(--primario)" stroke="var(--superficie)" stroke-width="2" />
        </svg>
      </div>
    {/if}
    <p class="frase"><Icono n="sparkles" tam={16} /> <span>{v.frase}</span></p>
    {@render detalle('vas', ['vas'])}
  </section>

  <!-- Diario del coach -->
  <section class="bloque-plan">
    <h3><Icono n="notebook-pen" tam={18} /> Lo que he cambiado y por qué</h3>
    {#if v.diario.length}
      <ol class="diario">
        {#each v.diario.slice(0, abiertos.diario ? 40 : 5) as d, i (d.fecha + d.tipo + i)}
          <li>
            <span class="di-ic"><Icono n={d.icono} tam={15} grosor={2.2} /></span>
            <div><small>{fechaCorta(d.fecha)}</small><b>{d.titulo}</b>{#if d.motivo}<p>{d.motivo}</p>{/if}</div>
          </li>
        {/each}
      </ol>
      {#if v.diario.length > 5}<button class="ver" onclick={() => alternar('diario')}>{abiertos.diario ? 'Ver menos' : `Ver los ${v.diario.length}`} <Icono n={abiertos.diario ? 'chevron-up' : 'chevron-down'} tam={15} /></button>{/if}
    {:else}
      <p class="nota-sem">Aún no he cambiado nada. Cuando ajuste tus kcal, tu entreno o tu menú, lo verás aquí con el motivo.</p>
    {/if}
  </section>

  <p class="pie-nota">Se actualiza solo con lo que apuntas (comidas, entrenos y báscula). Es orientativo: no sustituye a un profesional.</p>
</div>

<style>
  /* Portada */
  .po-sup { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  .po-chip { display: inline-flex; align-items: center; gap: 6px; padding: 6px 11px; border-radius: 999px; background: rgb(0 0 0 / 0.42); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); font-size: 0.78rem; font-weight: 600; }
  .po-chip.fuerte { background: #fff; color: #111; }
  .po-abajo { margin-top: auto; }
  .po-abajo > small { font-size: 0.82rem; font-weight: 600; color: rgb(255 255 255 / 0.8); }
  .po-abajo h2 { margin: 2px 0 0; font-size: 2rem; line-height: 1.05; color: #fff; letter-spacing: -0.03em; }
  .po-abajo p { margin: 6px 0 0; font-size: 0.88rem; color: rgb(255 255 255 / 0.85); }
  .po-meta { display: block; margin-top: 8px; font-size: 0.74rem; color: rgb(255 255 255 / 0.7); }
  .sin-hyrox { display: flex; align-items: center; gap: 12px; }
  .sin-hyrox h2 { margin: 0; }
  .p-ic { display: grid; place-items: center; width: 44px; height: 44px; border-radius: 14px; background: var(--primario-claro); color: var(--primario); }

  .bloque-plan { margin-top: 14px; padding: 16px; border-radius: 22px; background: var(--superficie); box-shadow: var(--sombra); }
  h3 { display: flex; align-items: center; gap: 8px; margin: 0 0 12px; font-size: 1.02rem; }
  h3 :global(svg) { color: var(--primario); }
  .nota { display: flex; gap: 8px; align-items: flex-start; margin: 12px 0 0; font-size: 0.86rem; line-height: 1.4; color: var(--texto-2); }
  .nota b { color: var(--texto); }
  .nota :global(svg) { color: var(--primario); flex-shrink: 0; margin-top: 1px; }
  .nota.alerta :global(svg) { color: var(--amarillo); }
  .nota-sem { margin: 12px 0 0; font-size: 0.86rem; line-height: 1.45; color: var(--texto-2); }
  .nota-sem b { color: var(--texto); }
  .leyenda { margin: 6px 0 0; font-size: 0.72rem; color: var(--texto-3); }

  /* Semana */
  .dias { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 4px; }
  .dia { display: grid; justify-items: center; gap: 3px; padding: 8px 0 6px; border-radius: 14px; }
  .dia > small:first-child { font-size: 0.7rem; font-weight: 600; color: var(--texto-3); }
  .dia > b { font-size: 1rem; }
  .dia.hoy { background: var(--primario-claro); }
  .dia.hoy > small:first-child, .dia.hoy > b { color: var(--primario-fuerte); }
  .dia.pasado { opacity: 0.55; }
  .d-ic { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 10px; background: var(--lila-claro); color: var(--lila); }
  .d-ic.descanso { background: var(--superficie-2); color: var(--texto-3); }
  .d-ic.hecha { background: var(--lila); color: #fff; }
  .dia.clave .d-ic { box-shadow: 0 0 0 2px var(--primario); }
  .d-barra { position: relative; width: 10px; height: 44px; margin-top: 4px; border-radius: 5px; background: var(--superficie-2); overflow: hidden; }
  .d-barra i { position: absolute; left: 0; right: 0; bottom: 0; border-radius: 5px; background: var(--dato-kcal); }
  .d-kcal { font-size: 0.66rem; color: var(--texto-3); font-weight: 600; }

  /* Cuenta de kcal */
  .cuenta { display: grid; gap: 10px; }
  .c-fila { display: grid; grid-template-columns: 96px minmax(0, 1fr) 54px; align-items: center; gap: 10px; }
  .c-txt { display: grid; }
  .c-txt b { font-size: 0.86rem; }
  .c-txt small { font-size: 0.7rem; color: var(--texto-3); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .c-pista { position: relative; height: 12px; border-radius: 6px; background: var(--superficie-2); }
  .c-pista i { position: absolute; top: 0; bottom: 0; border-radius: 6px; background: var(--primario); }
  .c-pista i.neg { background: var(--coral); }
  .c-v { text-align: right; font-size: 0.92rem; }
  .c-v.neg { color: var(--coral); }
  .c-total { display: flex; align-items: baseline; justify-content: space-between; margin-top: 2px; padding-top: 10px; border-top: 1px solid var(--linea); }
  .c-total span { font-size: 0.84rem; font-weight: 600; color: var(--texto-2); }
  .c-total b { font-size: 1.6rem; color: var(--primario-fuerte); }
  .c-total b small { font-size: 0.78rem; color: var(--texto-3); }
  .macros-barra { display: flex; gap: 3px; height: 10px; margin-top: 16px; }
  .macros-barra i { border-radius: 5px; }
  .macros-ley { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 10px; }
  .macros-ley div { display: grid; }
  .macros-ley small { display: inline-flex; align-items: center; gap: 5px; font-size: 0.72rem; font-weight: 600; color: var(--texto-2); }
  .macros-ley small i { width: 8px; height: 8px; border-radius: 50%; }
  .macros-ley b { font-size: 1.15rem; }
  .macros-ley span { font-size: 0.7rem; color: var(--texto-3); }

  /* Qué esperar */
  .esperado { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
  .esp { display: grid; justify-items: start; gap: 2px; padding: 12px; border-radius: 16px; background: var(--superficie-2); }
  .esp-ic { display: grid; place-items: center; width: 40px; height: 40px; margin-bottom: 6px; border-radius: 12px; }
  .esp.baja .esp-ic { background: color-mix(in srgb, var(--dato-kcal) 18%, transparent); color: var(--dato-kcal); }
  .esp.sube .esp-ic { background: color-mix(in srgb, var(--dato-e) 18%, transparent); color: var(--dato-e); }
  .esp.igual .esp-ic { background: var(--superficie-3); color: var(--texto-2); }
  .esp small { font-size: 0.74rem; font-weight: 600; color: var(--texto-2); }
  .esp b { font-size: 0.98rem; line-height: 1.2; }
  .esp-real { font-size: 0.7rem; color: var(--texto-3); }

  /* Cómo vas */
  .anillos-fila { display: flex; justify-content: space-around; }
  .mini { display: grid; justify-items: center; gap: 6px; }
  .mini-anillo { position: relative; display: grid; place-items: center; }
  .mini-anillo b { position: absolute; font-size: 1.05rem; }
  .mini-anillo b small { font-size: 0.66rem; color: var(--texto-3); }
  .mini > small { font-size: 0.76rem; font-weight: 600; color: var(--texto-2); }
  .frase { display: flex; gap: 8px; align-items: flex-start; margin: 14px 0 0; padding: 12px; border-radius: 14px; background: var(--primario-claro); font-size: 0.88rem; font-weight: 600; line-height: 1.4; }
  .frase :global(svg) { color: var(--primario); flex-shrink: 0; margin-top: 2px; }

  /* Detalle */
  .ver { display: inline-flex; align-items: center; gap: 4px; min-height: 40px; margin: 6px 0 -8px; padding: 0; border: 0; background: none; color: var(--primario); font: inherit; font-size: 0.82rem; font-weight: 600; cursor: pointer; }
  .detalle { margin-top: 8px; padding: 12px; border-radius: 14px; background: var(--superficie-2); font-size: 0.84rem; line-height: 1.45; color: var(--texto-2); }
  .detalle p { margin: 8px 0 4px; }
  .detalle p:first-child { margin-top: 0; }
  .detalle p b { color: var(--texto); }
  .detalle ul { margin: 0; padding-left: 18px; display: grid; gap: 4px; }
  /* Portada: volumen de cada semana */
  .volumen { display: flex; align-items: flex-end; gap: 2px; height: 46px; margin-top: 14px; }
  .volumen i { flex: 1; min-width: 0; border-radius: 3px 3px 1px 1px; background: color-mix(in srgb, var(--c) 55%, rgb(255 255 255 / 0.35)); transition: height 0.6s var(--ease-out); }
  .volumen i.pasada { background: color-mix(in srgb, var(--c) 70%, rgb(255 255 255 / 0.15)); opacity: 0.55; }
  .volumen i.descarga { opacity: 0.45; }
  .volumen i.actual { background: #fff; box-shadow: 0 0 12px rgb(255 255 255 / 0.6); opacity: 1; }
  .fases-ley { display: flex; gap: 2px; margin-top: 6px; }
  .fases-ley span { display: flex; align-items: center; gap: 4px; min-width: 0; font-size: 0.62rem; font-weight: 600; color: rgb(255 255 255 / 0.65); white-space: nowrap; overflow: hidden; }
  .fases-ley span.actual { color: #fff; }
  .fases-ley span:last-child { flex-shrink: 0; min-width: max-content; }
  .fases-ley i { width: 6px; height: 6px; border-radius: 50%; background: var(--c); flex-shrink: 0; }
  /* Tu coach dice */
  .coach-dice { display: flex; gap: 12px; align-items: flex-start; margin-top: 14px; padding: 14px; border-radius: 20px; background: radial-gradient(120% 120% at 0% 0%, var(--primario-claro), transparent 70%), var(--superficie); box-shadow: var(--sombra); }
  .cd-ic { display: grid; place-items: center; width: 36px; height: 36px; border-radius: 50%; background: var(--hero); color: #fff; flex-shrink: 0; }
  .coach-dice p { margin: 0; font-size: 0.95rem; font-weight: 600; line-height: 1.4; }
  .coach-dice small { display: block; margin-bottom: 2px; font-size: 0.72rem; font-weight: 600; color: var(--primario-fuerte); }
  /* Próxima carrera */
  .carrera { width: 100%; border: 0; font: inherit; text-align: left; color: var(--texto); cursor: pointer; }
  .carrera { display: flex; align-items: center; gap: 12px; margin-top: 10px; padding: 12px 14px; border-radius: 18px; background: var(--superficie); box-shadow: var(--sombra); }
  .ca-ic { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 12px; background: var(--primario-claro); color: var(--primario); flex-shrink: 0; }
  .ca-txt { flex: 1; min-width: 0; display: grid; }
  .ca-txt b { font-size: 0.95rem; }
  .ca-txt small { font-size: 0.76rem; color: var(--texto-2); }
  .ca-obj { display: grid; justify-items: end; }
  .ca-obj b { font-size: 1.35rem; letter-spacing: -0.02em; }
  .ca-obj small { font-size: 0.7rem; color: var(--texto-3); }
  /* Semana */
  .totales { display: flex; flex-wrap: wrap; gap: 6px; margin: -4px 0 12px; }
  .totales span { padding: 5px 10px; border-radius: 999px; background: var(--superficie-2); font-size: 0.76rem; color: var(--texto-2); }
  .totales b { color: var(--texto); }
  .d-barra i { background: color-mix(in srgb, var(--dato-kcal) 40%, var(--superficie-3)); transition: height 0.5s var(--ease-out); }
  .d-barra i.entreno { background: var(--dato-kcal); }
  .leyenda { display: flex; align-items: center; gap: 5px; flex-wrap: wrap; }
  .leyenda i { width: 8px; height: 8px; border-radius: 2px; }
  .l-ent { background: var(--dato-kcal); }
  .l-desc { margin-left: 6px; background: color-mix(in srgb, var(--dato-kcal) 40%, var(--superficie-3)); }
  .c-pista i { transition: width 0.55s var(--ease-out); }
  /* Esperado */
  .esp b { font-size: 0.9rem; }
  .esp-estado { display: inline-flex; align-items: center; gap: 4px; margin-top: 4px; padding: 2px 8px; border-radius: 999px; font-size: 0.72rem; font-weight: 700; }
  .esp-estado.bien { background: color-mix(in srgb, var(--dato-kcal) 18%, transparent); color: var(--dato-kcal); }
  .esp-estado.mejor { background: color-mix(in srgb, var(--dato-e) 18%, transparent); color: var(--dato-e); }
  .esp-estado.ojo { background: var(--amarillo-claro); color: var(--amarillo); }
  /* Tendencia */
  .tend { margin-top: 14px; padding: 12px; border-radius: 16px; background: var(--superficie-2); }
  .t-cab { display: flex; align-items: baseline; gap: 8px; }
  .t-cab small { font-size: 0.74rem; font-weight: 600; color: var(--texto-2); }
  .t-cab b { margin-left: auto; font-size: 0.95rem; }
  .t-cab .t-esp { font-weight: 500; color: var(--texto-3); }
  .tend svg { display: block; width: 100%; height: 70px; margin-top: 6px; overflow: visible; }
  .t-linea { stroke-dasharray: 100; stroke-dashoffset: 100; transition: stroke-dashoffset 0.9s var(--ease-out) 0.3s; }
  .t-linea.listo { stroke-dashoffset: 0; }
  @media (prefers-reduced-motion: reduce) {
    .volumen i, .d-barra i, .c-pista i, .t-linea { transition: none; }
  }
  /* Diario del coach */
  .diario { list-style: none; margin: 0; padding: 0; position: relative; }
  .diario::before { content: ""; position: absolute; left: 15px; top: 8px; bottom: 8px; width: 2px; background: var(--linea); }
  .diario li { position: relative; display: flex; gap: 12px; padding: 6px 0; }
  .di-ic { position: relative; display: grid; place-items: center; width: 32px; height: 32px; border-radius: 50%; background: var(--primario-claro); color: var(--primario); flex-shrink: 0; box-shadow: 0 0 0 3px var(--superficie); }
  .diario div { display: grid; min-width: 0; }
  .diario small { font-size: 0.72rem; font-weight: 600; color: var(--texto-3); }
  .diario b { font-size: 0.9rem; }
  .diario p { margin: 2px 0 0; font-size: 0.8rem; line-height: 1.4; color: var(--texto-2); }
</style>
