<script>
  // La semana de un vistazo (lunes a domingo), al estilo de Cal AI: cada día con un aro fino. Verde si
  // cumpliste kcal y proteína, rojo si no, discontinuo si no apuntaste; hoy, lo que llevas en negro, y los
  // que vienen, en gris. Al tocar un día pasado, su resumen debajo.
  import { estado } from '../stores/estado.js';
  import { calcularObjetivos } from '../lib/nutricion.js';
  import { hoyISO, sumarDias } from '../lib/planificador.js';
  import { resumenDia } from '../lib/logros.js';
  import { sesionesDia } from '../lib/hyrox/index.js';
  import { diaSemana, entero, capital } from '../lib/formato.js';

  let { consumidoHoy = 0, objetivoHoy = 1 } = $props();
  const NOMBRES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  const R = 18; const C = 2 * Math.PI * R;
  const hoy = hoyISO();
  const lunes = sumarDias(hoy, -((new Date(`${hoy}T12:00`).getDay() + 6) % 7));
  const objetivos = $derived(calcularObjetivos($estado.perfil));
  const dias = $derived(Array.from({ length: 7 }, (_, i) => {
    const fecha = sumarDias(lunes, i);
    const r = fecha < hoy ? resumenDia($estado, objetivos, fecha) : null;
    const entreno = sesionesDia($estado, fecha).filter((s) => s.tipo !== 'carrera');
    const hecho = entreno.some((s) => ['completa', 'parcial'].includes($estado.hyrox?.registros?.[s.id]?.estado));
    const estadoDia = fecha === hoy ? 'hoy' : fecha > hoy ? 'futuro' : !r ? 'vacio' : r.kcalOk && r.proteinaOk ? 'bien' : 'mal';
    return { fecha, n: NOMBRES[i], r, estado: estadoDia, entreno: entreno.length > 0, hecho };
  }));
  const progresoHoy = $derived(Math.min(1, consumidoHoy / Math.max(1, objetivoHoy)));
  let elegido = $state(null);
  const sel = $derived(dias.find((d) => d.fecha === elegido) || null);
</script>

<div class="tira" role="group" aria-label="Tu semana">
  {#each dias as d (d.fecha)}
    <button class="dia {d.estado}" class:marcado={elegido ? elegido === d.fecha : d.estado === 'hoy'} disabled={d.estado === 'futuro' || d.estado === 'hoy'}
      aria-label="{capital(diaSemana(d.fecha))} {Number(d.fecha.slice(8))}{d.estado === 'bien' ? ': en objetivo' : d.estado === 'mal' ? ': fuera de objetivo' : d.estado === 'vacio' ? ': sin apuntar' : ''}"
      onclick={() => (elegido = elegido === d.fecha ? null : d.fecha)}>
      <small>{d.n}</small>
      <span class="aro">
        <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true">
          <circle class="pista" cx="20" cy="20" r={R} />
          {#if d.estado === 'hoy' && progresoHoy > 0}<circle class="avance" cx="20" cy="20" r={R} stroke-dasharray="{C * progresoHoy} {C}" transform="rotate(-90 20 20)" />{/if}
        </svg>
        <b class="cifra">{Number(d.fecha.slice(8))}</b>
      </span>
    </button>
  {/each}
</div>
{#if sel}
  <p class="detalle-dia">
    <b>{capital(diaSemana(sel.fecha))}:</b>
    {#if sel.r}{entero(sel.r.m.kcal)} de {entero(sel.r.od.kcal)} kcal · {Math.round(sel.r.m.p)} g de proteína{:else}no apuntaste comidas{/if}{#if sel.entreno} · entreno {sel.hecho ? 'hecho' : 'sin registrar'}{/if}
  </p>
{/if}

<style>
  .tira { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; margin: 0 -6px 14px; }
  .dia { display: grid; justify-items: center; gap: 6px; padding: 8px 0 10px; border: 0; border-radius: var(--r-m); background: none; color: var(--texto-2); font: inherit; cursor: pointer; }
  .dia:disabled { cursor: default; }
  .dia.marcado { background: var(--superficie); box-shadow: var(--sombra); color: var(--texto); }
  .dia small { font-size: 0.76rem; }
  .dia.marcado small { font-weight: 500; }
  .aro { position: relative; display: grid; place-items: center; width: 40px; height: 40px; }
  .aro svg { position: absolute; inset: 0; }
  .aro b { position: relative; font-size: 0.92rem; font-weight: 400; color: var(--texto); }
  circle { fill: none; stroke-width: 2; }
  .pista { stroke: var(--superficie-3); }
  .avance { stroke: var(--texto); stroke-linecap: round; }
  .bien .pista { stroke: var(--dia-ok, var(--dato-kcal)); }
  .mal .pista { stroke: var(--dia-mal, var(--coral)); }
  .vacio .pista { stroke: var(--texto-3); stroke-width: 1.5; stroke-dasharray: 3 3; }
  .futuro { opacity: 0.45; }
  .detalle-dia { margin: -6px 0 12px; padding: 8px 12px; border-radius: var(--r-m); background: var(--superficie); box-shadow: var(--sombra); font-size: 0.84rem; color: var(--texto-2); }
  .detalle-dia b { color: var(--texto); }
</style>
