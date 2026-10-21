<script>
  // Nota rápida del día (opcional): tres toques y, si quieres, una frase. Alimenta el repaso semanal.
  import { slide } from 'svelte/transition';
  import Icono from './Icono.svelte';
  import { estado } from '../stores/estado.js';
  import { avisar } from '../stores/ui.js';
  import { PREGUNTAS_DIA, guardarNotaDia } from '../lib/feedback.js';

  let { fecha } = $props();
  const nota = $derived($estado.feedback?.dias?.[fecha] || {});
  const completa = $derived(Object.keys(PREGUNTAS_DIA).every((k) => nota[k]));
  let abierta = $state(false);
  let texto = $state('');
  $effect(() => { texto = nota.nota || ''; });

  function elegir(k, v) {
    guardarNotaDia(fecha, { [k]: nota[k] === v ? null : v });
  }
  function guardarTexto() {
    guardarNotaDia(fecha, { nota: texto.trim() });
    abierta = false;
    avisar('Gracias: lo tendré en cuenta en el repaso de la semana', '📝');
  }
</script>

<div class="nota-dia">
  <button class="cab" onclick={() => (abierta = !abierta)} aria-expanded={abierta}>
    <Icono n="notebook-pen" tam={18} />
    <span><b>{completa ? 'Tu nota de hoy' : '¿Cómo ha ido hoy?'}</b><small>{completa ? Object.keys(PREGUNTAS_DIA).map((k) => `${PREGUNTAS_DIA[k].nombre.toLowerCase()} ${PREGUNTAS_DIA[k].opciones.find(([v]) => v === nota[k])?.[1].toLowerCase()}`).join(' · ') : 'Opcional: 3 toques para ir ajustando tu dieta y tu entreno'}</small></span>
    <Icono n={abierta ? 'minus' : 'plus'} tam={16} />
  </button>
  {#if abierta}
    <div class="cuerpo" transition:slide={{ duration: 160 }}>
      {#each Object.entries(PREGUNTAS_DIA) as [k, p] (k)}
        <div class="preg">
          <span>{p.nombre}</span>
          <div class="ops">
            {#each p.opciones as [v, n] (v)}
              <button class:activo={nota[k] === v} aria-pressed={nota[k] === v} onclick={() => elegir(k, v)}>{n}</button>
            {/each}
          </div>
        </div>
      {/each}
      <label class="campo"><span>Algo más <small>(opcional)</small></span>
        <input bind:value={texto} maxlength="160" placeholder="Me costó la cena, me sentó mal el pre-entreno…" /></label>
      <button class="boton boton-peq" onclick={guardarTexto}>Guardar</button>
    </div>
  {/if}
</div>

<style>
  .nota-dia { margin-top: 10px; border-radius: var(--r-l); background: var(--superficie); box-shadow: var(--sombra); }
  .cab { width: 100%; display: flex; align-items: center; gap: 10px; min-height: 56px; padding: 10px 14px; border: 0; background: none; color: var(--texto); font: inherit; text-align: left; cursor: pointer; }
  .cab > :global(svg:first-child) { color: var(--primario); flex-shrink: 0; }
  .cab span { flex: 1; display: grid; }
  .cab small { color: var(--texto-2); font-weight: 600; font-size: 0.76rem; }
  .cuerpo { padding: 0 14px 14px; }
  .preg { display: grid; gap: 6px; margin-bottom: 10px; }
  .preg > span { font-weight: 700; font-size: 0.84rem; color: var(--texto-2); }
  .ops { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
  .ops button { min-height: 44px; border-radius: var(--r-s); border: 1px solid var(--borde); background: var(--superficie-2); color: var(--texto); font-weight: 700; font-size: 0.84rem; cursor: pointer; }
  .ops button.activo { border-color: var(--primario); background: var(--primario-claro); color: var(--primario-fuerte); }
</style>
