<script>
  // Hoja inferior (bottom sheet): se cierra con la X (siempre visible), con Escape,
  // tocando fuera o deslizándola hacia abajo
  import { fly, fade } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';

  let { titulo = '', onclose, children, ancho = false, seccion = 'hoy' } = $props();
  let cuerpo = $state();
  let arrastre = $state(0);
  let inicio = null;

  function tecla(ev) {
    if (ev.key === 'Escape') onclose?.();
  }
  $effect(() => {
    document.body.classList.add('sin-scroll');
    return () => document.body.classList.remove('sin-scroll');
  });

  // Deslizar hacia abajo: desde la cabecera, o desde el contenido si ya está arriba del todo
  function empezar(ev) {
    if (ev.target.closest('input, textarea, select')) return;
    if (ev.currentTarget === cuerpo && cuerpo.scrollTop > 0) return;
    inicio = ev.touches[0].clientY;
  }
  function mover(ev) {
    if (inicio === null) return;
    const dy = ev.touches[0].clientY - inicio;
    if (dy <= 0) { arrastre = 0; return; }
    arrastre = dy;
    if (ev.cancelable && dy > 8) ev.preventDefault();
  }
  function soltar() {
    if (inicio === null) return;
    inicio = null;
    if (arrastre > 110) onclose?.();
    arrastre = 0;
  }
</script>

<svelte:window onkeydown={tecla} />

<div class="hoja-capa s-{seccion}">
  <button class="hoja-fondo" aria-label="Cerrar" onclick={() => onclose?.()} transition:fade={{ duration: 180 }}></button>
  <div class="hoja-caja" class:ancho class:arrastrando={arrastre > 0} role="dialog" aria-modal="true" aria-label={titulo || 'Detalle'}
    style:transform={arrastre ? `translateY(${arrastre}px)` : null} transition:fly={{ y: 420, duration: 260, easing: cubicOut }}>
    <header class="hoja-cab" class:sin-titulo={!titulo} ontouchstart={empezar} ontouchmove={mover} ontouchend={soltar}>
      <div class="hoja-asa" aria-hidden="true"></div>
      {#if titulo}<h2>{titulo}</h2>{/if}
      <button class="hoja-cerrar" aria-label="Cerrar" onclick={() => onclose?.()}>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
      </button>
    </header>
    <div class="hoja-cuerpo" bind:this={cuerpo} ontouchstart={empezar} ontouchmove={mover} ontouchend={soltar}>
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
    transition: transform 0.25s cubic-bezier(0.25, 0.9, 0.3, 1);
  }
  .hoja-caja.arrastrando { transition: none; }
  .hoja-cab { position: relative; display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 18px 16px 6px; flex-shrink: 0; touch-action: none; }
  .hoja-cab.sin-titulo { justify-content: flex-end; padding-bottom: 0; }
  .hoja-asa { position: absolute; top: 8px; left: 50%; transform: translateX(-50%); width: 38px; height: 4px; border-radius: 999px; background: var(--superficie-3); }
  .hoja-cab h2 { margin: 0; font-size: 1.15rem; }
  .hoja-cerrar { width: 44px; height: 44px; border-radius: 50%; border: 0; background: var(--superficie-2); display: grid; place-items: center; cursor: pointer; color: var(--texto); flex-shrink: 0; }
  .hoja-cab.sin-titulo .hoja-cerrar { position: absolute; top: 12px; right: 14px; z-index: 2; background: color-mix(in srgb, var(--superficie-2) 85%, transparent); backdrop-filter: blur(8px); }
  .hoja-cuerpo { overflow-y: auto; padding: 8px 16px calc(24px + env(safe-area-inset-bottom)); overscroll-behavior: contain; }
  @media (min-width: 760px) {
    .hoja-capa { align-items: center; }
    .hoja-caja { border-radius: 28px; max-height: 86vh; }
    .hoja-asa { display: none; }
  }
</style>
