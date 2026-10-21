<script>
  // Entreno → Plan: portada con dónde estás del plan, volumen semana a semana, las fases como
  // línea de tiempo y tus ritmos de referencia.
  import Icono from '../../components/Icono.svelte';
  import Portada from '../../components/Portada.svelte';
  import Agenda from '../../components/Agenda.svelte';
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
    return sem.length ? { f, desde: sem[0].lunes, hasta: sumarDias(sem.at(-1).lunes, 6), n: sem.length, w0: sem[0].w, w1: sem.at(-1).w } : null;
  }).filter(Boolean) : []);
  const faseActual = $derived(fases.find((x) => actual >= x.w0 && actual <= x.w1));
  const r = $derived(plan?.ritmos);

  function borrar() {
    if (confirm('¿Borrar tu plan HYROX y sus registros? Tu menú volverá a tus días fijos de entreno.')) reiniciarHyrox();
  }
</script>

{#if plan}
  <Portada foto="img/sesiones/rodaje.webp" color={faseActual ? FASES[faseActual.f].color : 'var(--lila)'} alto={300} etiqueta="Tu plan">
    <span class="chip">Tu plan HYROX · {CATEGORIAS[config.categoria].nombre}</span>
    <div class="abajo">
      <h2>{plan.N} semanas{plan.carrera ? ` hasta el ${fechaCorta(plan.carrera)}` : ''}</h2>
      <p class="sub">{actual >= 0 ? `Vas por la semana ${actual + 1}${faseActual ? ` · ${FASES[faseActual.f].nombre}` : ''}` : hoy < plan.inicio ? 'Empieza pronto' : 'Plan terminado'}</p>
      <!-- Las fases a lo ancho, con una marca donde estás -->
      <div class="tira" aria-hidden="true">
        {#each fases as x (x.f)}<i style="flex:{x.n};background:{FASES[x.f].color}"></i>{/each}
        {#if actual >= 0}<b class="marca" style="left:{((actual + 0.5) / plan.N) * 100}%"></b>{/if}
      </div>
    </div>
  </Portada>

  <h3 class="cab" id="agenda">Carreras y viajes</h3>
  <Agenda />

  <h3 class="cab">Volumen semana a semana</h3>
  <div class="tarjeta grafico">
    <div class="barras" role="img" aria-label="Minutos de entreno por semana, por fases">
      {#each plan.semanas as s (s.w)}
        <div class="col" class:actual={s.w === actual} title="Semana {s.w + 1}: {s.volumen} min">
          <div class="barra" class:deload={s.deload} style="height:{(s.volumen / maxVol) * 100}%;background:{FASES[s.fase].color}"></div>
        </div>
      {/each}
    </div>
    <p class="pie-nota">Altura = minutos de entreno. Las más apagadas son semanas de descarga; la marcada, esta.</p>
  </div>

  <h3 class="cab">Las fases</h3>
  <ol class="fases">
    {#each fases as x (x.f)}
      <li style="--c:{FASES[x.f].color}" class:ahora={faseActual?.f === x.f} class:hecha={actual > x.w1}>
        <span class="nodo" aria-hidden="true"></span>
        <div>
          <b>{FASES[x.f].nombre}{#if faseActual?.f === x.f}<span class="ya">ahora</span>{/if}</b>
          <small class="cifra">{x.n} {x.n === 1 ? 'semana' : 'semanas'} · {fechaCorta(x.desde)} – {fechaCorta(x.hasta)}</small>
          <p>{FASES[x.f].desc}</p>
        </div>
      </li>
    {/each}
  </ol>

  <h3 class="cab">Tus ritmos</h3>
  <div class="ritmos">
    <div class="grupo"><span class="g-nom">Correr</span>
      <div class="r"><span>Rodaje suave</span><b class="cifra">{mmss(r.z2)}<small>/km</small></b></div>
      <div class="r"><span>Umbral</span><b class="cifra">{mmss(r.umbral)}<small>/km</small></b></div>
      <div class="r"><span>Series de 1 km</span><b class="cifra">{mmss(r.intervalo)}<small>/km</small></b></div>
      <div class="r destaca"><span>Ritmo HYROX</span><b class="cifra">{mmss(r.hyrox)}<small>/km</small></b></div>
    </div>
    <div class="grupo"><span class="g-nom">Ergómetros</span>
      <div class="r"><span>SkiErg</span><b class="cifra">{mmss(r.ski500)}<small>/500 m</small></b></div>
      <div class="r"><span>Remo</span><b class="cifra">{mmss(r.row500)}<small>/500 m</small></b></div>
    </div>
  </div>
  {#if r.estimado}<p class="alerta">Son ritmos estimados para tu nivel. Pon tu marca de 5 km en «Editar plan» para afinarlos.</p>{/if}

  <div class="tarjeta config">
    <dl class="datos-perfil">
      <dt>Carrera</dt><dd>{plan.carrera ? fechaCorta(plan.carrera) : 'Sin fecha (bloque de 12 semanas)'}</dd>
      <dt>Categoría</dt><dd>{CATEGORIAS[config.categoria].nombre} · {NIVELES[config.nivel].nombre}</dd>
      <dt>Días</dt><dd>{config.dias.length} por semana · {config.hora}</dd>
    </dl>
    <button class="boton ancho" onclick={oneditar}><Icono n="pencil" tam={18} /> Editar plan y marcas</button>
    <button class="enlace borrar" onclick={borrar}>Borrar el plan</button>
  </div>
{/if}

<style>
  .chip { align-self: flex-start; padding: 5px 10px; border-radius: 999px; background: rgb(255 255 255 / 0.14); font-size: 0.78rem; font-weight: 700; }
  .abajo { margin-top: auto; }
  .abajo h2 { margin: 0 0 4px; font-size: 1.75rem; line-height: 1.1; letter-spacing: -0.03em; font-weight: 700; text-wrap: balance; }
  .sub { margin: 0 0 14px; color: rgb(255 255 255 / 0.78); font-weight: 600; font-size: 0.9rem; }
  .tira { position: relative; display: flex; gap: 3px; height: 8px; }
  .tira i { border-radius: 999px; }
  .marca { position: absolute; top: -5px; width: 4px; height: 18px; margin-left: -2px; border-radius: 2px; background: #fff; box-shadow: 0 0 0 2px rgb(0 0 0 / 0.35); }

  .cab { margin: 26px 2px 10px; font-size: 1.05rem; font-weight: 700; }
  .grafico { margin: 0; }
  .barras { display: flex; align-items: flex-end; gap: 3px; height: 120px; }
  .col { flex: 1; height: 100%; display: flex; align-items: flex-end; border-radius: 6px; }
  .col.actual { outline: 2px solid var(--texto); outline-offset: 2px; }
  .barra { width: 100%; border-radius: 6px 6px 3px 3px; min-height: 4px; }
  .barra.deload { opacity: 0.45; }

  /* Fases como línea de tiempo vertical */
  .fases { list-style: none; margin: 0; padding: 0 0 0 4px; }
  .fases li { position: relative; display: grid; grid-template-columns: 20px minmax(0, 1fr); gap: 12px; padding-bottom: 18px; }
  .fases li:not(:last-child)::before { content: ""; position: absolute; left: 9px; top: 20px; bottom: 0; width: 2px; background: var(--superficie-3); }
  .nodo { width: 20px; height: 20px; border-radius: 50%; border: 3px solid var(--c); background: var(--fondo); margin-top: 1px; }
  .hecha .nodo, .ahora .nodo { background: var(--c); }
  .ahora .nodo { box-shadow: 0 0 0 5px color-mix(in srgb, var(--c) 25%, transparent); }
  .fases b { display: flex; align-items: center; gap: 8px; font-size: 1rem; }
  .ya { padding: 2px 8px; border-radius: 999px; background: color-mix(in srgb, var(--c) 22%, transparent); color: var(--c); font-size: 0.72rem; font-weight: 700; }
  .fases small { display: block; margin-top: 2px; color: var(--texto-2); font-weight: 600; font-size: 0.8rem; }
  .fases p { margin: 4px 0 0; color: var(--texto-2); font-size: 0.88rem; }
  .hecha b, .hecha p { color: var(--texto-3); }

  /* Ritmos en dos grupos, filas con la cifra a la derecha */
  .ritmos { display: grid; gap: 10px; }
  .grupo { padding: 6px 14px; border-radius: var(--r-l); background: var(--superficie); box-shadow: var(--sombra); }
  .g-nom { display: block; padding: 8px 0 4px; font-size: 0.78rem; font-weight: 700; color: var(--texto-3); }
  .r { display: flex; justify-content: space-between; align-items: baseline; padding: 10px 0; border-top: 1px solid var(--linea); }
  .r span { font-weight: 600; color: var(--texto-2); }
  .r b { font-size: 1.25rem; font-weight: 700; letter-spacing: -0.02em; }
  .r small { margin-left: 3px; font-size: 0.74rem; font-weight: 600; color: var(--texto-3); }
  .r.destaca span { color: var(--texto); }
  .r.destaca b { color: var(--lila); }

  .config { margin-top: 18px; }
  .ancho { width: 100%; margin-top: 6px; }
  .borrar { display: block; margin: 14px auto 2px; color: var(--texto-3); font-size: 0.84rem; }
</style>
