<script>
  // Cada 4 semanas, Hoy te recuerda la revisión del mes (o que la tienes a medias).
  import Icono from './Icono.svelte';
  import { estado } from '../stores/estado.js';
  import { abrirHoja } from '../stores/ui.js';
  import { estadoRevision, pasosRevision } from '../lib/revision.js';
  import { posponerRevision } from '../lib/acciones.js';
  import { hoyISO } from '../lib/planificador.js';

  const hoy = hoyISO();
  const est = $derived(estadoRevision($estado, hoy));
  const hechos = $derived(est.enCurso ? pasosRevision($estado, est.enCurso).filter((p) => p.hecho).length : 0);
  const manana = new Date().getHours() < 12;
</script>

{#if est.aviso}
  <section class="revision s-progreso" aria-label="Revisión del mes">
    <button class="rv-abrir" onclick={() => abrirHoja('revision')}>
      <span class="rv-ic"><Icono n="clipboard-list" tam={19} /></span>
      <span class="rv-txt">
        <b>Revisión del mes</b>
        <small>{est.enCurso ? `${hechos} de 4 hechos · sigue` : manana ? 'Toca ya · 10 min en ayunas' : 'Toca · mañana en ayunas'}</small>
      </span>
      <span class="rv-ir">{est.enCurso ? 'Seguir' : 'Empezar'}</span>
    </button>
    <button class="rv-luego" aria-label="Más tarde" title="Más tarde" onclick={posponerRevision}><Icono n="circle-x" tam={18} /></button>
  </section>
{/if}

<style>
  .revision { position: relative; display: flex; align-items: center; margin-top: 12px; border-radius: 18px; background: radial-gradient(120% 140% at 0% 0%, var(--primario-claro), transparent 70%), var(--superficie); box-shadow: inset 0 0 0 1.5px color-mix(in srgb, var(--primario) 30%, transparent); }
  .rv-abrir { flex: 1; min-width: 0; display: flex; align-items: center; gap: 12px; min-height: 64px; padding: 10px 6px 10px 14px; border: 0; background: none; color: var(--texto); font: inherit; text-align: left; cursor: pointer; }
  .rv-ic { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 12px; background: var(--primario-claro); color: var(--primario); flex-shrink: 0; }
  .rv-txt { flex: 1; min-width: 0; display: grid; }
  .rv-txt b { font-size: 0.93rem; }
  .rv-txt small { font-size: 0.78rem; color: var(--texto-2); }
  .rv-ir { padding: 8px 14px; border-radius: 999px; background: var(--primario); color: var(--sobre-primario); font-size: 0.82rem; font-weight: 700; flex-shrink: 0; }
  .rv-luego { display: grid; place-items: center; width: 40px; height: 64px; margin-right: 2px; border: 0; background: none; color: var(--texto-3); cursor: pointer; }
</style>
