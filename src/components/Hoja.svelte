<script>
  // Hoja inferior (bottom sheet): se cierra con la X (siempre visible), con Escape,
  // tocando fuera o deslizándola hacia abajo
  import { fly, fade } from 'svelte/transition';
  import { cajon } from '../lib/curvas.js';

  let { titulo = '', onclose, children, ancho = false, seccion = 'hoy' } = $props();
  let cuerpo = $state();
  let arrastre = $state(0);
  let inicio = $state(null);

  function tecla(ev) {
    if (ev.key === 'Escape') onclose?.();
  }
  $effect(() => {
    document.body.classList.add('sin-scroll');
    return () => document.body.classList.remove('sin-scroll');
  });

  // Deslizar hacia abajo: desde la cabecera, o desde el contenido si ya está arriba del todo.
  // Sigue al dedo 1:1, se cierra con un gesto rápido aunque sea corto, y si tiras hacia arriba
  // se resiste cada vez más (como en iOS) en vez de pararse en seco.
  let desdeCabecera = false;
  let historial = []; // últimas posiciones { y, t } para saber la velocidad al soltar
  let cerrando = false;
  const RESISTENCIA = 0.55;
  const goma = (exceso, alto) => (exceso * alto * RESISTENCIA) / (alto + RESISTENCIA * Math.abs(exceso));

  function empezar(ev) {
    if (inicio !== null || ev.touches.length > 1) return; // un solo dedo: el segundo no hace saltar la hoja
    if (ev.target.closest('input, textarea, select')) return;
    desdeCabecera = ev.currentTarget !== cuerpo;
    if (!desdeCabecera && cuerpo.scrollTop > 0) return;
    inicio = ev.touches[0].clientY;
    historial = [{ y: inicio, t: ev.timeStamp }];
  }
  function mover(ev) {
    if (inicio === null) return;
    const y = ev.touches[0].clientY;
    const dy = y - inicio;
    historial = [...historial.slice(-4), { y, t: ev.timeStamp }];
    if (dy <= 0) {
      // Hacia arriba solo desde la cabecera (en el contenido eso es hacer scroll), y con resistencia
      arrastre = desdeCabecera ? -goma(-dy, 600) * 0.12 : 0;
      return;
    }
    arrastre = dy;
    if (ev.cancelable && dy > 8) ev.preventDefault();
  }
  // touchmove sin «passive» para poder frenar el scroll del contenido mientras arrastras la hoja
  // (Svelte registra ontouchmove como pasivo y entonces preventDefault no hace nada)
  let cab = $state();
  $effect(() => {
    const zonas = [cab, cuerpo].filter(Boolean);
    for (const z of zonas) z.addEventListener('touchmove', mover, { passive: false });
    return () => { for (const z of zonas) z.removeEventListener('touchmove', mover); };
  });
  function soltar(ev) {
    if (inicio === null) return;
    inicio = null;
    // Velocidad de los últimos ~100 ms (px/ms): un gesto rápido hacia abajo cierra aunque sea corto
    const a = historial[0];
    const b = historial.at(-1);
    const v = b && a && b.t > a.t ? (b.y - a.y) / (b.t - a.t) : 0;
    if (arrastre > 110 || (arrastre > 24 && v > 0.45)) {
      cerrando = true; // la hoja sale desde donde la dejaste, sin volver arriba
      onclose?.();
      return;
    }
    arrastre = 0; // vuelve a su sitio con la curva de iOS (ver .hoja-caja)
  }
</script>

<svelte:window onkeydown={tecla} />

<div class="hoja-capa s-{seccion}">
  <button class="hoja-fondo" aria-label="Cerrar" onclick={() => onclose?.()} in:fade={{ duration: 200 }} out:fade={{ duration: 180 }}
    style:opacity={arrastre > 0 ? Math.max(0.35, 1 - arrastre / 500) : null}></button>
  <div class="hoja-caja" class:ancho class:arrastrando={inicio !== null || cerrando} role="dialog" aria-modal="true" aria-label={titulo || 'Detalle'}
    style:transform={arrastre ? `translateY(${arrastre}px)` : null}
    in:fly={{ y: 480, duration: 420, easing: cajon }} out:fly={{ y: 480, duration: cerrando ? 220 : 260, easing: cajon }}>
    <header class="hoja-cab" class:sin-titulo={!titulo} bind:this={cab} ontouchstart={empezar} ontouchend={soltar} ontouchcancel={soltar}>
      <div class="hoja-asa" aria-hidden="true"></div>
      {#if titulo}<h2>{titulo}</h2>{/if}
      <button class="hoja-cerrar" aria-label="Cerrar" onclick={() => onclose?.()}>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
      </button>
    </header>
    <div class="hoja-cuerpo" bind:this={cuerpo} ontouchstart={empezar} ontouchend={soltar} ontouchcancel={soltar}>
      {@render children?.()}
    </div>
  </div>
</div>

<style>
  .hoja-capa { position: fixed; inset: 0; z-index: 50; display: grid; grid-template-columns: minmax(0, 1fr); align-items: end; justify-items: center; }
  .hoja-fondo { position: absolute; inset: 0; border: 0; background: rgb(0 0 0 / 0.6); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); cursor: default; }
  .hoja-caja {
    position: relative; width: 100%; max-width: var(--ancho); max-height: 92vh; max-height: 92dvh; display: flex; flex-direction: column;
    background: var(--fondo); border-radius: 26px 26px 0 0; box-shadow: 0 -1px 0 var(--linea), 0 -20px 50px rgb(0 0 0 / 0.5);
    transition: transform 0.4s var(--ease-drawer);
    will-change: transform;
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
    .hoja-caja { border-radius: var(--r-xl); max-height: 86vh; max-height: 86dvh; }
    .hoja-asa { display: none; }
  }
</style>
