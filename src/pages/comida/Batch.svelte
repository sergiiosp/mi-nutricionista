<script>
  import Icono from '../../components/Icono.svelte';
  import Emoji from '../../components/Emoji.svelte';
  import FotoReceta from '../../components/FotoReceta.svelte';
  import { estado } from '../../stores/estado.js';
  import { abrirHoja } from '../../stores/ui.js';
  import { hoyISO } from '../../lib/planificador.js';
  import { planBatch } from '../../lib/batch.js';
  import { cantidadTexto, alimento } from '../../lib/nutricion.js';
  import { fechaCorta } from '../../lib/formato.js';

  let dias = $state(4);
  let hechas = $state({});
  const plan = $derived($estado.plan);
  const batch = $derived(plan ? planBatch(plan, hoyISO(), dias) : null);
</script>

{#if !batch}
  <div class="tarjeta vacia"><Emoji e="🥡" tam={56} /><p>Crea un menú y te digo qué cocinar de una vez.</p></div>
{:else}
  <div class="tarjeta intro">
    <Emoji e="👨‍🍳" tam={44} />
    <div><b>Cocina una vez, come varios días</b><small>Lo que puedes dejar hecho hoy para {batch.dias.length} días ({fechaCorta(batch.dias[0])} – {fechaCorta(batch.dias.at(-1))}). Solo comidas y cenas: el resto se prepara en un momento.</small></div>
  </div>
  <div class="filtros">
    {#each [3, 4, 7] as n (n)}<button class="filtro" class:activo={dias === n} onclick={() => (dias = n)}>{n} días</button>{/each}
  </div>

  {#each batch.tareas as t, i (t.titulo + i)}
    <div class="tarea" class:hecha={hechas[t.titulo]}>
      {#if t.tipo === 'receta'}
        <button class="foto" onclick={() => abrirHoja('receta', { recetaId: t.receta.id, ingredientes: t.ingredientes, titulo: `Batch · ${t.detalle}` })}>
          <FotoReceta receta={t.receta} alto={64} redondeo={16} tamEmoji={36} />
        </button>
      {:else}
        <span class="ic"><Emoji e={t.emoji} tam={34} /></span>
      {/if}
      <div class="cuerpo">
        <b>{t.titulo}</b>
        {#if t.detalle}<small>{t.detalle}</small>{/if}
        {#if t.tipo === 'receta'}
          <small class="ings">{t.ingredientes.map((x) => `${cantidadTexto(x.a, x.g)} ${alimento(x.a).nombre.toLowerCase()}`).join(' · ')}</small>
        {/if}
        {#each t.lineas || [] as l (l.texto)}
          <div class="linea">• {l.texto}{#if l.cuando}<small> — {l.cuando}</small>{/if}</div>
        {/each}
        {#if t.consejo}<p class="consejo-mini"><Icono e="💡" tam={18} /> {t.consejo}</p>{/if}
      </div>
      {#if t.tipo !== 'nota'}
        <button class="check" class:activo={hechas[t.titulo]} aria-label="Hecho" onclick={() => (hechas = { ...hechas, [t.titulo]: !hechas[t.titulo] })}>
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
        </button>
      {/if}
    </div>
  {:else}
    <p class="pie-nota">Para estos días no hay nada que merezca la pena dejar hecho.</p>
  {/each}
  <p class="pie-nota">Conserva los tápers en la nevera un máximo de 3-4 días. Lo de más días, mejor al congelador.</p>
{/if}

<style>
  .intro { display: flex; gap: 12px; align-items: center; background: linear-gradient(135deg, var(--primario-claro), var(--superficie) 70%); }
  .intro small { display: block; color: var(--texto-2); font-weight: 600; }
  .tarea { display: flex; gap: 12px; align-items: flex-start; padding: 12px; margin-top: 10px; border-radius: 20px; background: var(--superficie); box-shadow: var(--sombra); }
  .tarea.hecha { opacity: 0.55; }
  .foto { width: 64px; padding: 0; border: 0; background: none; cursor: pointer; flex-shrink: 0; }
  .ic { width: 64px; height: 64px; border-radius: 16px; display: grid; place-items: center; background: var(--superficie-2); flex-shrink: 0; }
  .cuerpo { flex: 1; min-width: 0; display: grid; gap: 3px; }
  .cuerpo small { color: var(--texto-2); font-weight: 600; font-size: 0.8rem; }
  .ings { font-size: 0.76rem !important; }
  .linea { font-weight: 700; font-size: 0.88rem; }
  .linea small { font-weight: 600; }
  .consejo-mini { margin: 4px 0 0; font-size: 0.8rem; color: var(--texto-2); font-weight: 600; }
  .check { width: 32px; height: 32px; border-radius: 50%; border: 2px solid var(--borde); background: var(--superficie); color: transparent; display: grid; place-items: center; cursor: pointer; flex-shrink: 0; }
  .check.activo { background: var(--primario); border-color: var(--primario); color: #fff; }
  .vacia { text-align: center; }
</style>
