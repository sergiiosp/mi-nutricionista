<script>
  // Chips de macros: kcal · P · H · G
  let { m, kcal = true, peque = false } = $props();
</script>

<div class="macros" class:peque>
  {#if kcal}<span class="chip chip-kcal">{Math.round(m.kcal)} kcal</span>{/if}
  <span class="chip chip-p" title="Proteína">P {Math.round(m.p)}</span>
  <span class="chip chip-c" title="Hidratos">H {Math.round(m.c)}</span>
  <span class="chip chip-g" title="Grasa">G {Math.round(m.g)}</span>
</div>

<style>
  .peque .chip { font-size: 0.7rem; padding: 2px 7px; }
</style>
