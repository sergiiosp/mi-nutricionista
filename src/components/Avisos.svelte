<script>
  // Hoja de la campana: propuestas y avisos pendientes, fuera de Hoy para que Hoy quede limpio (como en Cal AI).
  // Cada tarjeta decide si se muestra; abajo, siempre, la explicación de tu semana.
  import PropuestaSemana from './PropuestaSemana.svelte';
  import PropuestaHyrox from './PropuestaHyrox.svelte';
  import PropuestaSuelo from './PropuestaSuelo.svelte';
  import AvisoCopia from './AvisoCopia.svelte';
  import AvisoRevision from './AvisoRevision.svelte';
  import TarjetaPreparar from './TarjetaPreparar.svelte';
  import Icono from './Icono.svelte';
  import { estado } from '../stores/estado.js';
  import { abrirHoja } from '../stores/ui.js';
  import { nube } from '../lib/nube/sincro.js';
  import { hoyISO } from '../lib/planificador.js';
  import { avisosPendientes } from '../lib/avisos.js';
  import { explicarPlan } from '../lib/coach.js';
  import { calcularObjetivos } from '../lib/nutricion.js';

  const hoy = hoyISO();
  const pendientes = $derived(avisosPendientes($estado, hoy, $nube.activa).filter((a) => a.id !== 'semana-explicada'));
  const coach = $derived(explicarPlan($estado, calcularObjetivos($estado.perfil), hoy));
  const coachNuevo = $derived($estado.coachVisto !== coach.lunes);
</script>

<div class="avisos">
  {#if !pendientes.length}
    <p class="al-dia"><Icono n="check" tam={18} grosor={2.4} /> Todo al día: no tienes nada pendiente.</p>
  {/if}
  <PropuestaSemana />
  <PropuestaHyrox />
  <PropuestaSuelo />
  <AvisoCopia />
  <AvisoRevision />
  <TarjetaPreparar />
  <button class="coach" class:nuevo={coachNuevo} onclick={() => abrirHoja('tuPlan')}>
    <span class="co-ic"><Icono n="sparkles" tam={18} /></span>
    <span class="co-txt"><small>{coach.etiqueta}{#if coachNuevo}<i>nuevo</i>{/if}</small><b>{coach.resumen}</b></span>
    <Icono n="chevron-right" tam={18} />
  </button>
</div>

<style>
  .avisos { display: grid; gap: 10px; }
  .avisos > :global(*) { margin: 0 !important; }
  .al-dia { display: flex; align-items: center; gap: 8px; padding: 14px 16px; border-radius: var(--r-l); background: var(--superficie); box-shadow: var(--sombra); color: var(--texto-2); font-size: 0.9rem; }
  .al-dia :global(svg) { color: var(--texto); }
  .coach { display: flex; align-items: center; gap: 12px; width: 100%; min-height: 60px; padding: 10px 14px 10px 10px; border: 0; border-radius: var(--r-l); background: var(--superficie); box-shadow: var(--sombra); color: var(--texto); font: inherit; text-align: left; cursor: pointer; }
  .coach.nuevo { box-shadow: inset 0 0 0 1.5px var(--texto), var(--sombra); }
  .co-ic { display: grid; place-items: center; width: 40px; height: 40px; border-radius: var(--r-s); background: var(--superficie-2); color: var(--texto); flex-shrink: 0; }
  .co-txt { flex: 1; min-width: 0; display: grid; }
  .co-txt small { display: flex; align-items: center; gap: 6px; font-size: 0.78rem; color: var(--texto-2); }
  .co-txt small i { font-style: normal; padding: 1px 7px; border-radius: 999px; background: var(--texto); color: var(--superficie); font-size: 0.66rem; }
  .co-txt b { font-size: 0.9rem; font-weight: 500; line-height: 1.3; }
  .coach > :global(svg:last-child) { color: var(--texto-3); flex-shrink: 0; }
</style>
