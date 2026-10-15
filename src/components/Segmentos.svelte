<script>
  // Selector de pestañas tipo "segmented control"
  let { opciones = [], valor = $bindable(), onchange } = $props();
</script>

<div class="segmentos" role="tablist">
  {#each opciones as o (o.id)}
    <button role="tab" aria-selected={valor === o.id} class:activo={valor === o.id}
      onclick={() => { valor = o.id; onchange?.(o.id); }}>
      {#if o.emoji}<span aria-hidden="true">{o.emoji}</span>{/if}{o.nombre}
    </button>
  {/each}
</div>

<style>
  .segmentos { display: flex; gap: 4px; padding: 4px; border-radius: 16px; background: var(--superficie-2); overflow-x: auto; scrollbar-width: none; margin: 4px 0 14px; }
  .segmentos::-webkit-scrollbar { display: none; }
  button { flex: 1 0 auto; display: inline-flex; align-items: center; justify-content: center; gap: 5px; padding: 9px 12px; border: 0; border-radius: 12px; background: transparent; font-weight: 800; font-size: 0.86rem; color: var(--texto-2); cursor: pointer; white-space: nowrap; }
  button.activo { background: var(--superficie); color: var(--texto); box-shadow: var(--sombra); }
</style>
