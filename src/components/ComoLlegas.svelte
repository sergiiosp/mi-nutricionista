<script>
  // ¿Cómo llegas hoy? Tres toques (sueño, agujetas, energía) antes de la sesión; si vienes tocado,
  // la sesión de hoy se suaviza sola (plan.js → suavizar). Se puede deshacer.
  import Icono from './Icono.svelte';
  import { estado } from '../stores/estado.js';
  import { avisar } from '../stores/ui.js';
  import { guardarForma, borrarForma } from '../lib/acciones.js';

  let { fecha, sesion } = $props();
  const PREGUNTAS = [
    { id: 'sueno', n: 'Sueño', op: ['Mal', 'Normal', 'Bien'] },
    { id: 'agujetas', n: 'Agujetas', op: ['Muchas', 'Algunas', 'Nada'] },
    { id: 'energia', n: 'Energía', op: ['Baja', 'Normal', 'Alta'] },
  ];
  let r = $state({});
  let abierta = $state(false);
  const forma = $derived($estado.hyrox?.forma?.[fecha] || null);
  const completo = $derived(PREGUNTAS.every((p) => r[p.id] != null));

  function listo() {
    const nivel = guardarForma(fecha, r);
    avisar(nivel === 'bien' ? 'Llegas bien: sesión tal cual' : nivel === 'suave' ? 'Sesión de hoy más suave: menos volumen' : 'Hoy, sesión de mantenimiento', nivel === 'bien' ? '💪' : '🧘');
  }
</script>

{#if !forma && !abierta}
  <button class="como-fila" onclick={() => (abierta = true)}>
    <Icono n="heart-pulse" tam={18} grosor={2.2} />
    <span><b>¿Cómo llegas a la sesión?</b><small>3 toques y la ajusto si vienes tocado</small></span>
    <Icono n="chevron-down" tam={18} />
  </button>
{:else if !forma}
  <section class="como" aria-label="¿Cómo llegas hoy?">
    <div class="c-cab"><Icono n="heart-pulse" tam={18} grosor={2.2} /> <b>¿Cómo llegas a la sesión?</b></div>
    {#each PREGUNTAS as p (p.id)}
      <div class="c-fila" role="radiogroup" aria-label={p.n}>
        <span>{p.n}</span>
        <div class="c-op">
          {#each p.op as o, i (o)}
            <button role="radio" aria-checked={r[p.id] === i} class:activo={r[p.id] === i} onclick={() => (r = { ...r, [p.id]: i })}>{o}</button>
          {/each}
        </div>
      </div>
    {/each}
    <button class="boton ancho" disabled={!completo} onclick={listo}>Ajustar mi sesión</button>
  </section>
{:else if forma.nivel !== 'bien'}
  <div class="ajustada">
    <Icono n="heart-pulse" tam={18} />
    <span><b>{forma.nivel === 'suave' ? 'Llegas algo tocado:' : 'Llegas fundido:'}</b> {sesion?.titulo || 'tu sesión'} {forma.nivel === 'suave' ? 'con menos volumen' : 'de mantenimiento'}.</span>
    <button onclick={() => borrarForma(fecha)}>Deshacer</button>
  </div>
{/if}

<style>
  .como-fila { display: flex; align-items: center; gap: 10px; width: 100%; min-height: 56px; margin-top: 12px; padding: 8px 14px; border: 0; border-radius: 18px; background: var(--lila-claro); color: var(--texto); font: inherit; text-align: left; cursor: pointer; }
  .como-fila > :global(svg:first-child) { color: var(--lila); flex-shrink: 0; }
  .como-fila > :global(svg:last-child) { color: var(--texto-3); flex-shrink: 0; }
  .como-fila span { flex: 1; display: grid; }
  .como-fila b { font-size: 0.9rem; }
  .como-fila small { font-size: 0.76rem; color: var(--texto-2); }
  .como { margin-top: 12px; padding: 14px; border-radius: 22px; background: radial-gradient(120% 100% at 0% 0%, color-mix(in srgb, var(--lila) 20%, transparent), transparent 60%), var(--superficie); box-shadow: var(--sombra); }
  .c-cab { display: flex; align-items: center; gap: 8px; color: var(--lila); margin-bottom: 6px; }
  .c-cab b { color: var(--texto); }
  .c-fila { display: grid; grid-template-columns: 74px 1fr; align-items: center; gap: 8px; padding: 6px 0; }
  .c-fila > span { font-size: 0.82rem; font-weight: 700; color: var(--texto-2); }
  .c-op { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; padding: 3px; border-radius: 12px; background: var(--superficie-2); }
  .c-op button { min-height: 38px; border: 0; border-radius: 9px; background: none; color: var(--texto-2); font: inherit; font-size: 0.8rem; font-weight: 700; cursor: pointer; transition: background 0.15s var(--ease-out), color 0.15s var(--ease-out); }
  .c-op button.activo { background: var(--lila); color: #14121f; }
  .ancho { width: 100%; margin-top: 10px; }
  .ajustada { display: flex; align-items: center; gap: 10px; margin-top: 12px; padding: 10px 6px 10px 14px; border-radius: 16px; background: var(--lila-claro); font-size: 0.84rem; color: var(--texto-2); }
  .ajustada :global(svg) { color: var(--lila); flex-shrink: 0; }
  .ajustada b { color: var(--texto); }
  .ajustada span { flex: 1; }
  .ajustada button { min-height: 40px; padding: 0 12px; border: 0; border-radius: 10px; background: none; color: var(--lila); font: inherit; font-weight: 700; font-size: 0.8rem; cursor: pointer; }
</style>
