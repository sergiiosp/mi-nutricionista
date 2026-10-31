<script>
  // La semana de un vistazo (lunes a domingo), al estilo de Cal AI: cada día con su anillo de kcal. Verde si
  // cumpliste kcal y proteína, coral si no, vacío si no apuntaste. Al tocar un día pasado, su resumen debajo.
  import Anillos from './Anillos.svelte';
  import { estado } from '../stores/estado.js';
  import { calcularObjetivos } from '../lib/nutricion.js';
  import { hoyISO, sumarDias } from '../lib/planificador.js';
  import { resumenDia } from '../lib/logros.js';
  import { sesionesDia } from '../lib/hyrox/index.js';
  import { diaCorto, diaSemana, entero, capital } from '../lib/formato.js';

  let { consumidoHoy = 0, objetivoHoy = 1 } = $props();
  const hoy = hoyISO();
  const lunes = sumarDias(hoy, -((new Date(`${hoy}T12:00`).getDay() + 6) % 7));
  const objetivos = $derived(calcularObjetivos($estado.perfil));
  const dias = $derived(Array.from({ length: 7 }, (_, i) => {
    const fecha = sumarDias(lunes, i);
    const r = fecha < hoy ? resumenDia($estado, objetivos, fecha) : null;
    const entreno = sesionesDia($estado, fecha).filter((s) => s.tipo !== 'carrera');
    const hecho = entreno.some((s) => ['completa', 'parcial'].includes($estado.hyrox?.registros?.[s.id]?.estado));
    return { fecha, r, futuro: fecha > hoy, hoy: fecha === hoy, entreno: entreno.length > 0, hecho, bien: r ? r.kcalOk && r.proteinaOk : false };
  }));
  let elegido = $state(null);
  const sel = $derived(dias.find((d) => d.fecha === elegido) || null);
</script>

<div class="tira" role="group" aria-label="Tu semana">
  {#each dias as d (d.fecha)}
    <button class="dia" class:hoy={d.hoy} class:elegido={elegido === d.fecha} disabled={d.futuro || d.hoy}
      aria-label="{capital(diaSemana(d.fecha))} {Number(d.fecha.slice(8))}{d.r ? (d.bien ? ': en objetivo' : ': fuera de objetivo') : d.futuro || d.hoy ? '' : ': sin apuntar'}"
      onclick={() => (elegido = elegido === d.fecha ? null : d.fecha)}>
      <small>{diaCorto(d.fecha)}</small>
      <span class="aro" class:vacio={!d.r && !d.hoy}>
        {#if d.hoy}<Anillos anillos={[{ valor: consumidoHoy, meta: objetivoHoy, color: 'var(--primario)' }]} tam={34} grosor={4} />
        {:else if d.r}<Anillos anillos={[{ valor: d.r.m.kcal, meta: d.r.od.kcal, color: d.bien ? 'var(--dato-kcal)' : 'var(--coral)' }]} tam={34} grosor={4} />{/if}
        <b class="cifra">{Number(d.fecha.slice(8))}</b>
      </span>
      <i class="punto" class:si={d.entreno} class:hecho={d.hecho} aria-hidden="true"></i>
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
  .tira { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; margin: 0 -4px 12px; }
  .dia { display: grid; justify-items: center; gap: 3px; padding: 6px 0 4px; border: 0; border-radius: var(--r-m); background: none; color: var(--texto-2); font: inherit; cursor: pointer; }
  .dia:disabled { cursor: default; }
  .dia.hoy { background: var(--superficie); box-shadow: var(--sombra); color: var(--texto); }
  .dia.elegido { background: var(--superficie-2); }
  .dia small { font-size: 0.7rem; font-weight: 700; }
  .aro { position: relative; display: grid; place-items: center; width: 34px; height: 34px; }
  .aro :global(svg) { position: absolute; inset: 0; }
  .aro.vacio { border-radius: 50%; box-shadow: inset 0 0 0 2px var(--superficie-3); }
  .dia:disabled .aro.vacio { box-shadow: inset 0 0 0 2px var(--superficie-2); }
  .aro b { position: relative; font-size: 0.78rem; font-weight: 700; color: var(--texto); }
  .punto { width: 5px; height: 5px; border-radius: 50%; background: transparent; }
  .punto.si { background: var(--superficie-3); }
  .punto.hecho { background: var(--dato-e); }
  .detalle-dia { margin: -6px 0 12px; padding: 8px 12px; border-radius: var(--r-m); background: var(--superficie); box-shadow: var(--sombra); font-size: 0.84rem; color: var(--texto-2); }
  .detalle-dia b { color: var(--texto); }
</style>
