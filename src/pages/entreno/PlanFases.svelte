<script>
  import Icono from '../../components/Icono.svelte';
  import Emoji from '../../components/Emoji.svelte';
  import { estado } from '../../stores/estado.js';
  import { planDe } from '../../lib/hyrox/index.js';
  import { FASES, semanaDe } from '../../lib/hyrox/plan.js';
  import { reiniciarHyrox } from '../../lib/acciones.js';
  import { CATEGORIAS, NIVELES } from '../../data/hyrox.js';
  import { hoyISO, sumarDias } from '../../lib/planificador.js';
  import { mmss } from '../../lib/hyrox/ritmos.js';
  import { fechaCorta } from '../../lib/formato.js';

  let { oneditar } = $props();
  const hoy = hoyISO();
  const plan = $derived(planDe($estado));
  const config = $derived($estado.hyrox.config);
  const actual = $derived(plan ? semanaDe(plan, hoy)?.w ?? -1 : -1);
  const maxVol = $derived(plan ? Math.max(...plan.semanas.map((s) => s.volumen)) : 1);
  const fases = $derived(plan ? Object.keys(FASES).map((f) => {
    const sem = plan.semanas.filter((s) => s.fase === f);
    return sem.length ? { f, desde: sem[0].lunes, hasta: sumarDias(sem.at(-1).lunes, 6), n: sem.length } : null;
  }).filter(Boolean) : []);
  const r = $derived(plan?.ritmos);

  function borrar() {
    if (confirm('¿Borrar tu plan HYROX y sus registros? Tu menú volverá a tus días fijos de entreno.')) reiniciarHyrox();
  }
</script>

{#if plan}
  <div class="tarjeta">
    <b>Tu plan de {plan.N} semanas</b>
    <div class="barras" role="img" aria-label="Volumen semanal por fases">
      {#each plan.semanas as s (s.w)}
        <div class="col" class:actual={s.w === actual} title="Semana {s.w + 1}: {s.volumen} min">
          <div class="barra" class:deload={s.deload} style="height:{(s.volumen / maxVol) * 100}%;background:{FASES[s.fase].color}"></div>
        </div>
      {/each}
    </div>
    <div class="leyenda">{#each Object.entries(FASES) as [id, f] (id)}{#if fases.some((x) => x.f === id)}<span><i style="background:{f.color}"></i>{f.nombre}</span>{/if}{/each}</div>
    <p class="pie-nota">Altura = minutos de entreno de cada semana. Las barras más apagadas son semanas de descarga.</p>
  </div>

  {#each fases as x (x.f)}
    <div class="fase" style="--c:{FASES[x.f].color}">
      <b>{FASES[x.f].nombre} <small>· {x.n} {x.n === 1 ? 'semana' : 'semanas'} · {fechaCorta(x.desde)} – {fechaCorta(x.hasta)}</small></b>
      <p>{FASES[x.f].desc}</p>
    </div>
  {/each}

  <h2 class="seccion"><Emoji e="⏱️" tam={24} /> Tus ritmos</h2>
  <div class="ritmos">
    <div><span>Rodaje (Z2)</span><b>{mmss(r.z2)}</b><small>/km</small></div>
    <div><span>Umbral</span><b>{mmss(r.umbral)}</b><small>/km</small></div>
    <div><span>Series 1 km</span><b>{mmss(r.intervalo)}</b><small>/km</small></div>
    <div><span>Ritmo HYROX</span><b>{mmss(r.hyrox)}</b><small>/km</small></div>
    <div><span>SkiErg</span><b>{mmss(r.ski500)}</b><small>/500 m</small></div>
    <div><span>Remo</span><b>{mmss(r.row500)}</b><small>/500 m</small></div>
  </div>
  {#if r.estimado}<p class="alerta">Son ritmos estimados para tu nivel. Pon tu marca de 5 km en «Editar plan» para afinarlos.</p>{/if}

  <div class="tarjeta config">
    <dl class="datos-perfil">
      <dt>Carrera</dt><dd>{plan.carrera ? fechaCorta(plan.carrera) : 'Sin fecha (bloque de 12 semanas)'}</dd>
      <dt>Categoría</dt><dd>{CATEGORIAS[config.categoria].nombre} · {NIVELES[config.nivel].nombre}</dd>
      <dt>Días</dt><dd>{config.dias.length} por semana · {config.hora}</dd>
    </dl>
    <div class="acciones-fila">
      <button class="boton boton-peq" onclick={oneditar}><Icono e="✏️" tam={18} /> Editar plan y marcas</button>
      <button class="boton boton-peligro boton-peq" onclick={borrar}>Borrar plan</button>
    </div>
  </div>
{/if}

<style>
  .barras { display: flex; align-items: flex-end; gap: 3px; height: 120px; margin-top: 12px; }
  .col { flex: 1; height: 100%; display: flex; align-items: flex-end; border-radius: 6px; }
  .col.actual { outline: 2px solid var(--texto); outline-offset: 2px; }
  .barra { width: 100%; border-radius: 6px 6px 3px 3px; min-height: 4px; }
  .barra.deload { opacity: 0.45; }
  .leyenda { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 10px; font-size: 0.78rem; font-weight: 800; color: var(--texto-2); }
  .leyenda i { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 4px; vertical-align: -1px; }
  .fase { margin: 8px 0; padding: 12px 14px; border-radius: 18px; box-shadow: var(--sombra);
    background: linear-gradient(100deg, color-mix(in srgb, var(--c) 12%, var(--superficie)) 0%, var(--superficie) 70%); }
  .fase > b::before { content: ""; display: inline-block; width: 9px; height: 9px; margin-right: 8px; border-radius: 50%; background: var(--c); vertical-align: 1px; }
  .fase small { color: var(--texto-2); font-weight: 700; }
  .fase p { margin: 4px 0 0; font-size: 0.88rem; font-weight: 600; color: var(--texto-2); }
  .ritmos { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
  .ritmos div { display: grid; justify-items: center; padding: 12px 4px; border-radius: 18px; background: var(--superficie); box-shadow: var(--sombra); text-align: center; }
  .ritmos span { font-size: 0.72rem; font-weight: 800; color: var(--texto-2); }
  .ritmos b { font-size: 1.3rem; font-weight: 800; }
  .ritmos small { font-size: 0.7rem; color: var(--texto-2); font-weight: 700; }
</style>
