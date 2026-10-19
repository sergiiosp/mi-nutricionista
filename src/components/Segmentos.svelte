<script>
  // Selector de pestañas tipo "segmented control"
  import Icono from './Icono.svelte';

  let { opciones = [], valor = $bindable(), onchange } = $props();
  let caja = $state();
  let masDerecha = $state(false);
  let masIzquierda = $state(false);
  // Si no caben todas, se desliza: un degradado avisa de que hay más y la activa se pone a la vista
  function medir() {
    if (!caja) return;
    masIzquierda = caja.scrollLeft > 4;
    masDerecha = caja.scrollLeft + caja.clientWidth < caja.scrollWidth - 4;
  }
  $effect(() => {
    valor;
    const b = caja?.querySelector('[aria-selected="true"]');
    b?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
    setTimeout(medir, 350);
  });
</script>

<svelte:window onresize={medir} />
<div class="segmentos" class:mas-derecha={masDerecha} class:mas-izquierda={masIzquierda} role="tablist" bind:this={caja} onscroll={medir}>
  {#each opciones as o (o.id)}
    <button role="tab" aria-selected={valor === o.id} class:activo={valor === o.id}
      onclick={() => { valor = o.id; onchange?.(o.id); }}>
      {#if o.icono || o.emoji}<Icono n={o.icono} e={o.emoji} tam={15} grosor={2.1} />{/if}{o.nombre}
    </button>
  {/each}
</div>

<style>
  .segmentos { display: flex; gap: 2px; padding: 4px; border-radius: 14px; background: var(--superficie); box-shadow: var(--sombra); overflow-x: auto; scrollbar-width: none; margin: 4px 0 16px; }
  .segmentos::-webkit-scrollbar { display: none; }
  .segmentos { scroll-padding: 0 24px; }
  .mas-derecha { -webkit-mask-image: linear-gradient(90deg, #000 calc(100% - 36px), transparent); mask-image: linear-gradient(90deg, #000 calc(100% - 36px), transparent); }
  .mas-izquierda { -webkit-mask-image: linear-gradient(90deg, transparent, #000 36px); mask-image: linear-gradient(90deg, transparent, #000 36px); }
  .mas-izquierda.mas-derecha { -webkit-mask-image: linear-gradient(90deg, transparent, #000 36px, #000 calc(100% - 36px), transparent); mask-image: linear-gradient(90deg, transparent, #000 36px, #000 calc(100% - 36px), transparent); }
  /* En móvil, solo texto: los iconos hacen que las pestañas no quepan */
  @media (max-width: 480px) {
    button :global(.icono) { display: none; }
    button { padding: 9px 10px; font-size: 0.8rem; }
  }
  button { flex: 1 0 auto; display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 9px 12px; border: 0; border-radius: 10px; background: transparent; font-weight: 700; font-size: 0.82rem; color: var(--texto-3); cursor: pointer; white-space: nowrap; transition: background 0.2s var(--ease-out), color 0.2s var(--ease-out); }
  button { position: relative; }
  button::after { content: ""; position: absolute; inset: -4px 0; }
  @media (hover: hover) and (pointer: fine) { button:hover { color: var(--texto-2); } }
  button.activo { background: var(--primario-claro); color: var(--primario-fuerte); }
  button.activo :global(.icono) { color: var(--primario); }
</style>
