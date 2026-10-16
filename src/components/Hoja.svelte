<script>
  // Hoja inferior (bottom sheet) con fondo, asa y cierre con Escape o tocando fuera
  import { fly, fade } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';

  let { titulo = '', onclose, children, ancho = false } = $props();

  function tecla(ev) {
    if (ev.key === 'Escape') onclose?.();
  }
  $effect(() => {
    document.body.classList.add('sin-scroll');
    return () => document.body.classList.remove('sin-scroll');
  });
</script>

<svelte:window onkeydown={tecla} />

<div class="hoja-capa">
  <button class="hoja-fondo" aria-label="Cerrar" onclick={() => onclose?.()} transition:fade={{ duration: 180 }}></button>
  <div class="hoja-caja" class:ancho role="dialog" aria-modal="true" aria-label={titulo} transition:fly={{ y: 420, duration: 260, easing: cubicOut }}>
    <div class="hoja-asa" aria-hidden="true"></div>
    {#if titulo}
      <header class="hoja-cab">
        <h2>{titulo}</h2>
        <button class="hoja-cerrar" aria-label="Cerrar" onclick={() => onclose?.()}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
        </button>
      </header>
    {/if}
    <div class="hoja-cuerpo">
      {@render children?.()}
    </div>
  </div>
</div>

<style>
  .hoja-capa { position: fixed; inset: 0; z-index: 50; display: grid; grid-template-columns: minmax(0, 1fr); align-items: end; justify-items: center; }
  .hoja-fondo { position: absolute; inset: 0; border: 0; background: rgb(0 0 0 / 0.6); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); cursor: default; }
  .hoja-caja {
    position: relative; width: 100%; max-width: var(--ancho); max-height: 92vh; display: flex; flex-direction: column;
    background: var(--fondo); border-radius: 26px 26px 0 0; box-shadow: 0 -1px 0 var(--linea), 0 -20px 50px rgb(0 0 0 / 0.5);
  }
  .hoja-asa { width: 38px; height: 4px; border-radius: 999px; background: var(--superficie-3); margin: 10px auto 2px; flex-shrink: 0; }
  .hoja-cab { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 6px 16px 4px; flex-shrink: 0; }
  .hoja-cab h2 { margin: 0; font-size: 1.15rem; }
  .hoja-cerrar { width: 36px; height: 36px; border-radius: 50%; border: 0; background: var(--superficie-2); display: grid; place-items: center; cursor: pointer; color: var(--texto); }
  .hoja-cuerpo { overflow-y: auto; padding: 8px 16px calc(24px + env(safe-area-inset-bottom)); overscroll-behavior: contain; }
  @media (min-width: 760px) {
    .hoja-capa { align-items: center; }
    .hoja-caja { border-radius: 28px; max-height: 86vh; }
    .hoja-asa { display: none; }
  }
</style>
