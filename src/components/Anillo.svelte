<script>
  // Anillo de progreso: se dibuja animado al aparecer, con degradado y brillo opcionales
  import { onMount } from 'svelte';

  let { valor = 0, max = 1, tam = 130, grosor = 12, color = 'var(--primario)', pista = 'var(--superficie-3)', degradado = null, brillo = false, children } = $props();
  const id = `anillo-${Math.random().toString(36).slice(2, 8)}`;
  const r = $derived((tam - grosor) / 2);
  const c = $derived(2 * Math.PI * r);
  const pct = $derived(max > 0 ? Math.min(1, Math.max(0, valor / max)) : 0);
  let listo = $state(false);
  onMount(() => requestAnimationFrame(() => (listo = true)));
</script>

<div class="anillo" style="width:{tam}px;height:{tam}px">
  <svg width={tam} height={tam} viewBox="0 0 {tam} {tam}" aria-hidden="true">
    {#if degradado}
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color={degradado[0]} /><stop offset="1" stop-color={degradado[1]} /></linearGradient>
      </defs>
    {/if}
    <circle cx={tam / 2} cy={tam / 2} {r} fill="none" stroke={pista} stroke-width={grosor} />
    <circle cx={tam / 2} cy={tam / 2} {r} fill="none" stroke={degradado ? `url(#${id})` : color} stroke-width={grosor} stroke-linecap="round"
      stroke-dasharray={c} stroke-dashoffset={listo ? c * (1 - pct) : c} transform="rotate(-90 {tam / 2} {tam / 2})"
      class="valor" class:brillo style:opacity={pct > 0 ? 1 : 0} />
  </svg>
  <div class="centro">{@render children?.()}</div>
</div>

<style>
  .anillo { position: relative; flex-shrink: 0; }
  svg { overflow: visible; }
  .valor { transition: stroke-dashoffset 1.1s cubic-bezier(0.25, 0.9, 0.3, 1); }
  .brillo { filter: drop-shadow(0 0 8px rgb(255 91 31 / 0.55)); }
  .centro { position: absolute; inset: 0; display: grid; place-content: center; text-align: center; }
</style>
