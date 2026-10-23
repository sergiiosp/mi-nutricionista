<script>
  // Anillos concéntricos al estilo de Apple Fitness. Cada anillo se llena hacia su meta con un degradado a lo
  // largo del arco (de oscuro a claro) y punta redonda. Pasado el 100 % da otra vuelta en el color claro, con
  // sombra bajo la punta, y al cerrarse la punta brilla un instante. Se mueven con un muelle sin rebote que
  // sigue desde donde esté si cambia el objetivo (sin animación si se pide reducir movimiento).
  // anillos: [{ valor, meta, color }] de fuera a dentro.
  import { onMount } from 'svelte';
  import { Spring } from 'svelte/motion';

  let { anillos = [], tam = 148, grosor = 14 } = $props();
  const uid = $props.id();
  const HUECO = 4;
  const TRAMOS = 96; // trozos del degradado a lo largo de la vuelta (de 3,75°: sin escalones visibles)
  const RESPUESTA = 0.9; // s: lo que tarda el muelle en llegar (críticamente amortiguado: sin rebote)

  const centro = $derived(tam / 2);
  const radio = (i) => centro - grosor / 2 - i * (grosor + HUECO);
  // Un anillo puede dar como mucho dos vueltas
  const objetivos = $derived(anillos.map((a) => (a.meta > 0 ? Math.min(2, Math.max(0, a.valor / a.meta)) : 0)));

  // Degradado: del color del dato (arriba) a su tono vivo (`--dato-…-2` del tema) o, si no hay, a una mezcla con blanco
  const vivo = (color) => {
    const m = /^var\((--[\w-]+)\)$/.exec(String(color).trim());
    const mezcla = `color-mix(in oklab, ${color} 70%, #fff)`;
    return m ? `var(${m[1]}-2, ${mezcla})` : mezcla;
  };

  // Trozos del arco (fijos para un tamaño). Como en Apple, el degradado va a lo largo de lo que está dibujado:
  // del color del dato en la salida al tono vivo en la punta, esté el anillo como esté de lleno
  const punto = (r, ang) => [centro + r * Math.cos(ang), centro + r * Math.sin(ang)];
  const tramos = $derived(anillos.map((_, i) => {
    const r = radio(i);
    return Array.from({ length: TRAMOS }, (_, k) => {
      const a0 = (k / TRAMOS) * 2 * Math.PI - Math.PI / 2;
      const a1 = ((k + 1) / TRAMOS) * 2 * Math.PI - Math.PI / 2 + 0.012; // solapa un pelo para que no haya rayas
      const [x0, y0] = punto(r, a0), [x1, y1] = punto(r, a1);
      return { d: `M${x0.toFixed(2)} ${y0.toFixed(2)}A${r} ${r} 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`, desde: k / TRAMOS, medio: (k + 0.5) / TRAMOS };
    });
  }));

  // ── Un muelle por anillo (svelte/motion) ──
  // Críticamente amortiguado (sin rebote) y de ~0,9 s; si cambia el objetivo sigue desde donde esté. Al abrir,
  // los anillos arrancan uno detrás de otro.
  const MUELLE = { stiffness: 0.0135, damping: 0.22, precision: 0.002 };
  const reducido = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  let encendidos = $state(0);
  const muelles = [0, 1, 2, 3].map((i) => Spring.of(() => (i < encendidos ? (objetivos[i] ?? 0) : 0), MUELLE));
  onMount(() => {
    const ids = [0, 1, 2, 3].map((i) => setTimeout(() => (encendidos = i + 1), 120 + i * 120));
    return () => ids.forEach(clearTimeout);
  });
  const actual = $derived(reducido ? objetivos : objetivos.map((_, i) => muelles[i]?.current ?? 0));
</script>

<svg class="anillos" width={tam} height={tam} viewBox="0 0 {tam} {tam}" aria-hidden="true">
  <defs>
    {#each anillos as _, i (i)}
      {@const r = radio(i)}
      {@const c = 2 * Math.PI * r}
      <!-- Lo que se ve de la primera vuelta: un arco con puntas redondas -->
      <mask id="{uid}-v{i}" maskUnits="userSpaceOnUse" x="0" y="0" width={tam} height={tam}>
        <circle cx={centro} cy={centro} {r} fill="none" stroke="#fff" stroke-width={grosor} stroke-linecap="round"
          stroke-dasharray="{Math.min(1, actual[i] ?? 0) * c} {c}" transform="rotate(-90 {centro} {centro})" />
      </mask>
      <!-- La banda del anillo: la sombra de la punta solo cae sobre él -->
      <mask id="{uid}-b{i}" maskUnits="userSpaceOnUse" x="0" y="0" width={tam} height={tam}>
        <circle cx={centro} cy={centro} {r} fill="none" stroke="#fff" stroke-width={grosor} />
      </mask>
    {/each}
    <filter id="{uid}-difuso" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation={grosor * 0.2} /></filter>
  </defs>

  {#each anillos as a, i (i)}
    {@const r = radio(i)}
    {@const c = 2 * Math.PI * r}
    {@const p = actual[i] ?? 0}
    {@const extra = Math.max(0, p - 1)}
    {@const angPunta = Math.min(extra, 1) * 2 * Math.PI - Math.PI / 2}
    <g style="--c1: {a.color}; --c2: {vivo(a.color)}">
      <circle class="pista" cx={centro} cy={centro} {r} fill="none" style="stroke:{a.color}" stroke-width={grosor} />
      {#if p > 0.001}
        <g mask="url(#{uid}-v{i})">
          {#each tramos[i] as t (t.d)}
            {#if t.desde <= Math.min(p, 1) + 0.03}
              <path d={t.d} fill="none" stroke-width={grosor} style="stroke: color-mix(in oklab, var(--c2) {Math.round(Math.min(1, t.medio / Math.min(p, 1)) * 100)}%, var(--c1))" />
            {/if}
          {/each}
        </g>
        <!-- Punta de salida en el color de arranque (tapa el cierre del degradado) -->
        <circle cx={centro} cy={centro - r} r={grosor / 2} style="fill: var(--c1)" />
        {#if extra > 0.001}
          <!-- Segunda vuelta, con sombra bajo la punta -->
          {@const [sx, sy] = [centro + r * Math.cos(angPunta + 0.12), centro + r * Math.sin(angPunta + 0.12)]}
          <g mask="url(#{uid}-b{i})"><circle cx={sx} cy={sy} r={grosor * 0.5} fill="#000" opacity="0.38" filter="url(#{uid}-difuso)" /></g>
          <circle cx={centro} cy={centro} {r} fill="none" style="stroke: var(--c2)" stroke-width={grosor} stroke-linecap="round"
            stroke-dasharray="{extra * c} {c}" transform="rotate(-90 {centro} {centro})" />
        {/if}
        {#if !reducido && p >= 0.995}
          <!-- Al cerrarse (desde el 99,5 %, que en pantalla ya se lee completo): un destello blanco en la punta y una onda de su color que sale hacia fuera -->
          <circle class="destello-onda" cx={centro} cy={centro - r} r={grosor / 2} fill="none" style="stroke: var(--c2)" stroke-width="3.5" />
          <circle class="destello-luz" cx={centro} cy={centro - r} r={grosor / 2} fill="#fff" />
        {/if}
      {/if}
    </g>
  {/each}
</svg>

<style>
  .anillos { flex-shrink: 0; overflow: visible; }
  .pista { stroke-opacity: 0.16; }
  /* Al cerrar el anillo: la punta se ilumina y una onda de su color se expande y se apaga */
  .destello-luz, .destello-onda { transform-box: fill-box; transform-origin: center; opacity: 0; }
  .destello-luz { animation: destello-luz 0.6s cubic-bezier(0.23, 1, 0.32, 1); }
  .destello-onda { animation: destello-onda 0.85s cubic-bezier(0.23, 1, 0.32, 1); }
  @keyframes destello-luz {
    0% { transform: scale(0.8); opacity: 0.95; }
    100% { transform: scale(1.5); opacity: 0; }
  }
  @keyframes destello-onda {
    0% { transform: scale(1); opacity: 1; }
    100% { transform: scale(3.4); opacity: 0; }
  }
</style>
