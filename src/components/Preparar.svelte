<script>
  // Preparar de una vez (batch cooking): qué cocinar hoy para los próximos días, en orden, con cómo hacerlo
  // y cómo conservarlo. Lo abre la tarjeta de Hoy el día que toca preparar (o Comida → Semana cuando quieras).
  import Icono from './Icono.svelte';
  import Emoji from './Emoji.svelte';
  import FotoReceta from './FotoReceta.svelte';
  import { estado } from '../stores/estado.js';
  import { abrirHoja } from '../stores/ui.js';
  import { hoyISO } from '../lib/planificador.js';
  import { planBatch, CONSERVAR } from '../lib/batch.js';
  import { marcarPreparado } from '../lib/acciones.js';
  import { APARATOS } from '../data/coccion.js';
  import { cantidadTexto, alimento } from '../lib/nutricion.js';
  import { fechaCorta } from '../lib/formato.js';

  let { desde = hoyISO(), dias: diasIniciales = 4 } = $props();
  let dias = $derived(diasIniciales); // se puede cambiar con los botones de 3, 4 o 7 días
  let abierta = $state(null);
  const plan = $derived($estado.plan);
  const batch = $derived(plan ? planBatch(plan, desde, dias, $estado.perfil?.aparatos) : null);
  // Lo que ya tienes hecho se guarda: si cierras la hoja a medias, sigue marcado
  const hechas = $derived($estado.preparar?.desde === desde ? $estado.preparar.hechas : {});
  const hechasN = $derived(batch ? batch.tareas.filter((t) => hechas[t.titulo]).length : 0);
</script>

{#if !batch?.dias.length}
  <div class="tarjeta vacia"><Emoji e="🥡" tam={56} /><p>{batch ? 'Esos días comes fuera: no hay nada que preparar.' : 'Crea un menú y te digo qué cocinar de una vez.'}</p></div>
{:else}
  <div class="tarjeta intro">
    <div class="intro-cab">
      <b>Cocina una vez, come {batch.dias.length} días</b>
      <small>{fechaCorta(batch.dias[0])} – {fechaCorta(batch.dias.at(-1))} · comidas y cenas</small>
    </div>
    <div class="cifras">
      <div><b>~{batch.minutos < 60 ? `${batch.minutos} min` : `${Math.floor(batch.minutos / 60)} h ${String(Math.round((batch.minutos % 60) / 5) * 5).padStart(2, '0')}`}</b><small>de cocina</small></div>
      <div><b>{batch.tapers.length}</b><small>tápers</small></div>
      <div><b>{hechasN}/{batch.tareas.length}</b><small>pasos hechos</small></div>
    </div>
    <div class="filtros">
      {#each [3, 4, 7] as n (n)}<button class="filtro" class:activo={dias === n} aria-pressed={dias === n} onclick={() => (dias = n)}>{n} días</button>{/each}
    </div>
  </div>

  <h2 class="seccion">En este orden <small class="sec-sub">primero lo que más tarda</small></h2>
  <ol class="b-pasos">
    {#each batch.tareas as t, i (t.titulo + i)}
      <li class="b-paso" class:hecha={hechas[t.titulo]}>
        <div class="paso-cab">
          <span class="num">{i + 1}</span>
          {#if t.tipo === 'receta'}
            <button class="foto" onclick={() => abrirHoja('receta', { recetaId: t.receta.id, ingredientes: t.ingredientes, titulo: `Para preparar · ${t.detalle}` })} aria-label="Ver receta">
              <FotoReceta receta={t.receta} alto={48} redondeo={12} tamEmoji={26} />
            </button>
          {:else}
            <span class="ic"><Emoji e={t.emoji} tam={26} /></span>
          {/if}
          <button class="titulo" onclick={() => (abierta = abierta === i ? null : i)} aria-expanded={abierta === i}>
            <b>{t.titulo}</b>
            <small>{t.tipo === 'receta' ? t.detalle : t.lineas.map((l) => l.texto).join(' · ')}</small>
            <span class="ver">{abierta === i ? 'Ocultar' : 'Cómo hacerlo'} <Icono n={abierta === i ? 'chevron-up' : 'chevron-down'} tam={14} /></span>
          </button>
          <button class="check" class:activo={hechas[t.titulo]} aria-label="Hecho: {t.titulo}" onclick={() => marcarPreparado(desde, t.titulo)}>
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
          </button>
        </div>
        {#if abierta === i}
          <div class="paso-cuerpo">
            {#if t.tipo === 'receta'}
              <p class="ings">{t.ingredientes.map((x) => `${cantidadTexto(x.a, x.g)} ${alimento(x.a).nombre.toLowerCase()}`).join(' · ')}</p>
            {:else}
              {#each t.lineas as l (l.texto)}
                <div class="linea">
                  <b>{l.texto}</b>{#if l.cuando}<small> para {l.cuando}</small>{/if}
                  {#if l.como}<p class="como"><Icono n={APARATOS[l.como.aparato].icono} tam={14} /> <span><b>{APARATOS[l.como.aparato].nombre}:</b> {l.como.texto}</span></p>{/if}
                </div>
              {/each}
            {/if}
            {#if t.aviso}<p class="dato aviso-p"><Icono n="triangle-alert" tam={15} /> <span>{t.aviso}</span></p>{/if}
            {#if t.conserva}<p class="dato"><Icono n="snowflake" tam={15} /> <span><b>Conservar:</b> {t.conserva}</span></p>{/if}
            {#if t.nutriente}<p class="dato"><Icono n="leaf" tam={15} /> <span><b>Que no pierda nutrientes:</b> {t.nutriente}</span></p>{/if}
          </div>
        {/if}
      </li>
    {:else}
      <p class="pie-nota">Para estos días no hay nada que merezca la pena dejar hecho.</p>
    {/each}
  </ol>
  {#each batch.notas as n (n.titulo)}
    <p class="nota"><Emoji e={n.emoji} tam={20} /> <span><b>{n.titulo}.</b> {n.texto}</span></p>
  {/each}

  {#if batch.tapers.length}
    <h2 class="seccion">Tus tápers</h2>
    <ul class="tapers">
      {#each batch.tapers as t, i (i)}
        <li><span class="cuando">{t.cuando}</span><span class="plato">{t.nombre}</span>{#if t.pescado && t.fecha > batch.dias[1]}<small>pescado: hazlo ese día</small>{/if}</li>
      {/each}
    </ul>
  {/if}

  <details class="tarjeta conservar">
    <summary><Icono n="snowflake" tam={18} /> Conservar y recalentar <Icono n="chevron-down" tam={18} /></summary>
    <ul class="reglas">
      {#each CONSERVAR as r (r.texto)}<li><Icono n={r.icono} tam={18} /> <span>{r.texto}</span></li>{/each}
    </ul>
  </details>
{/if}

<style>
  .intro { display: grid; gap: 12px; background: radial-gradient(120% 100% at 0% 0%, var(--halo), transparent 65%), var(--superficie); }
  .intro-cab { display: grid; gap: 2px; }
  .intro-cab b { font-size: 1.05rem; }
  .intro-cab small { color: var(--texto-2); font-weight: 600; }
  .cifras { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
  .cifras div { display: grid; padding: 10px; border-radius: var(--r-m); background: var(--superficie-2); }
  .cifras b { font-size: 1.1rem; font-weight: 700; font-variant-numeric: tabular-nums; }
  .cifras small { color: var(--texto-2); font-weight: 600; font-size: 0.74rem; }
  .filtros { margin: 0; }
  .b-pasos { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
  .b-paso { border-radius: var(--r-l); background: var(--superficie); box-shadow: var(--sombra); overflow: hidden; }
  .b-paso.hecha { opacity: 0.55; }
  .paso-cab { display: flex; align-items: center; gap: 10px; padding: 10px 12px; }
  .num { width: 24px; height: 24px; border-radius: 50%; display: grid; place-items: center; background: var(--primario-claro); color: var(--primario-fuerte); font-weight: 700; font-size: 0.8rem; flex-shrink: 0; }
  .foto { width: 48px; padding: 0; border: 0; background: none; cursor: pointer; flex-shrink: 0; }
  .ic { width: 48px; height: 48px; border-radius: var(--r-s); display: grid; place-items: center; background: var(--superficie-2); flex-shrink: 0; }
  .titulo { flex: 1; min-width: 0; display: grid; gap: 2px; padding: 4px 0; border: 0; background: none; color: var(--texto); text-align: left; font: inherit; cursor: pointer; }
  .titulo small { color: var(--texto-2); font-weight: 600; font-size: 0.78rem; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; }
  .paso-cuerpo { display: grid; gap: 8px; padding: 0 14px 14px 46px; font-size: 0.86rem; }
  .linea { display: grid; gap: 2px; }
  .linea small { color: var(--texto-2); font-weight: 600; }
  .como, .dato { display: flex; gap: 8px; align-items: flex-start; margin: 0; color: var(--texto-2); line-height: 1.45; }
  .como :global(svg), .dato :global(svg) { color: var(--primario); flex-shrink: 0; margin-top: 3px; }
  .como b, .dato b { color: var(--texto); }
  .aviso-p :global(svg) { color: var(--amarillo); }
  .ings { margin: 0; color: var(--texto-2); }
  .check { position: relative; width: 32px; height: 32px; border-radius: 50%; border: 2px solid var(--borde); background: var(--superficie); color: transparent; display: grid; place-items: center; cursor: pointer; flex-shrink: 0; }
  .check::after { content: ""; position: absolute; inset: -6px; }
  .check.activo { background: var(--primario); border-color: var(--primario); color: #fff; }
  .nota { display: flex; gap: 10px; align-items: flex-start; padding: 10px 12px; border-radius: var(--r-m); background: var(--superficie-2); font-size: 0.86rem; }
  .tapers, .reglas { list-style: none; margin: 0; padding: 6px 14px; border-radius: var(--r-l); background: var(--superficie); box-shadow: var(--sombra); }
  .tapers li { display: grid; grid-template-columns: 96px 1fr; gap: 2px 10px; padding: 8px 0; font-size: 0.86rem; }
  .tapers li + li, .reglas li + li { border-top: 1px solid var(--linea); }
  .cuando { font-weight: 700; color: var(--texto-2); }
  .tapers small { grid-column: 2; color: var(--amarillo); font-weight: 600; font-size: 0.74rem; }
  .reglas li { display: flex; gap: 10px; align-items: flex-start; padding: 10px 0; font-size: 0.86rem; line-height: 1.45; color: var(--texto-2); }
  .reglas :global(svg) { color: var(--primario); flex-shrink: 0; margin-top: 2px; }
  .vacia { text-align: center; }
  .sec-sub { margin-left: 6px; font-size: 0.78rem; font-weight: 600; color: var(--texto-3); }
  .ver { display: inline-flex; align-items: center; gap: 3px; margin-top: 3px; font-size: 0.74rem; font-weight: 700; color: var(--primario); }
  .conservar { margin-top: 18px; }
  .conservar summary { display: flex; align-items: center; gap: 10px; min-height: 28px; font-weight: 700; list-style: none; cursor: pointer; }
  .conservar summary::-webkit-details-marker { display: none; }
  .conservar summary :global(svg:first-child) { color: var(--primario); }
  .conservar summary :global(svg:last-child) { margin-left: auto; color: var(--texto-3); transition: transform 0.2s var(--ease-out); }
  .conservar[open] summary :global(svg:last-child) { transform: rotate(180deg); }
  .conservar .reglas { margin-top: 8px; padding: 0; background: none; box-shadow: none; border-radius: 0; }
</style>
