<script>
  let { valor = 0, max = 1, tam = 130, grosor = 12, color = 'var(--primario)', pista = 'var(--superficie-2)', children } = $props();
  const r = $derived((tam - grosor) / 2);
  const c = $derived(2 * Math.PI * r);
  const pct = $derived(max > 0 ? Math.min(1, Math.max(0, valor / max)) : 0);
</script>

<div class="anillo" style="width:{tam}px;height:{tam}px">
  <svg width={tam} height={tam} viewBox="0 0 {tam} {tam}" aria-hidden="true">
    <circle cx={tam / 2} cy={tam / 2} {r} fill="none" stroke={pista} stroke-width={grosor} />
    <circle cx={tam / 2} cy={tam / 2} {r} fill="none" stroke={color} stroke-width={grosor} stroke-linecap="round"
      stroke-dasharray={c} stroke-dashoffset={c * (1 - pct)} transform="rotate(-90 {tam / 2} {tam / 2})" class="valor" />
  </svg>
  <div class="centro">{@render children?.()}</div>
</div>

<style>
  .anillo { position: relative; flex-shrink: 0; }
  .valor { transition: stroke-dashoffset 0.6s cubic-bezier(0.3, 0.9, 0.3, 1); }
  .centro { position: absolute; inset: 0; display: grid; place-content: center; text-align: center; }
</style>
