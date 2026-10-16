<script>
  // Selector de pestañas tipo "segmented control"
  import Icono from './Icono.svelte';

  let { opciones = [], valor = $bindable(), onchange } = $props();
</script>

<div class="segmentos" role="tablist">
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
  button { flex: 1 0 auto; display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 9px 12px; border: 0; border-radius: 10px; background: transparent; font-weight: 700; font-size: 0.82rem; color: var(--texto-3); cursor: pointer; white-space: nowrap; transition: background 0.2s, color 0.2s; }
  button { position: relative; }
  button::after { content: ""; position: absolute; inset: -4px 0; }
  button:hover { color: var(--texto-2); }
  button.activo { background: var(--superficie-3); color: var(--texto); }
  button.activo :global(.icono) { color: var(--primario); }
</style>
