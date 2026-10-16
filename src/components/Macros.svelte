<script>
  // Macros en una línea: kcal · P · H · G (con punto de color por macro)
  let { m, kcal = true, peque = false } = $props();
</script>

<div class="macros" class:peque>
  {#if kcal}<span class="kcal cifra">{Math.round(m.kcal)}<small>kcal</small></span>{/if}
  <span class="mk p" title="Proteína"><i></i>P {Math.round(m.p)}</span>
  <span class="mk c" title="Hidratos"><i></i>H {Math.round(m.c)}</span>
  <span class="mk g" title="Grasa"><i></i>G {Math.round(m.g)}</span>
</div>

<style>
  .macros { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 12px; margin: 6px 0 0; font-size: 0.8rem; font-weight: 600; color: var(--texto-2); }
  .kcal { font-size: 0.92rem; color: var(--texto); }
  .kcal small { font-size: 0.7rem; font-weight: 600; color: var(--texto-2); margin-left: 2px; }
  .mk { display: inline-flex; align-items: center; gap: 5px; font-variant-numeric: tabular-nums; }
  .mk i { width: 6px; height: 6px; border-radius: 50%; }
  .p i { background: var(--coral); } .c i { background: var(--amarillo); } .g i { background: var(--azul); }
  .peque { font-size: 0.74rem; }
  .peque .kcal { font-size: 0.88rem; }
</style>
