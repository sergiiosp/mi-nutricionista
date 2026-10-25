<script>
  // Propuesta de un toque tras la media maratón del 25 de octubre de 2026: semana de vuelta suave, bíceps y
  // tríceps en los días de torso, el plan HYROX + físico y el viaje a Jaén del 4 al 7 de noviembre con
  // entrenos sin máquinas. Desaparece al aceptarla, al descartarla o al empezar el viaje.
  import Icono from './Icono.svelte';
  import { estado, actualizar, anotarDiario } from '../stores/estado.js';
  import { avisar } from '../stores/ui.js';
  import { guardarEvento, guardarViaje, guardarHyrox } from '../lib/acciones.js';
  import { planDe } from '../lib/hyrox/index.js';
  import { semanaDe, FASES } from '../lib/hyrox/plan.js';
  import { hoyISO } from '../lib/planificador.js';
  import { diaSemana, fechaCorta } from '../lib/formato.js';

  const CLAVE = 'hyrox-tras-media-2026';
  const MEDIA = '2026-10-25';
  const VIAJE = { desde: '2026-11-04', hasta: '2026-11-07' };
  const COMIDA = [['fuera', 'Restaurantes'], ['super', 'Súper sin cocina'], ['cocina', 'Con cocina']];
  const hoy = hoyISO();
  let comida = $state(['fuera', 'super']);

  const config = $derived($estado.hyrox?.config || null);
  const agenda = $derived($estado.agenda || { eventos: [], viajes: [] });
  const yaEsta = $derived(agenda.viajes.some((v) => v.desde <= VIAJE.hasta && v.hasta >= VIAJE.desde));
  const visible = $derived(!!config && hoy < VIAJE.desde && !yaEsta && !$estado.propuestasVistas?.[CLAVE]);
  const plan = $derived(visible ? planDe($estado) : null);
  const semanas = $derived(plan?.carrera ? Math.ceil((new Date(`${plan.carrera}T12:00`) - new Date(`${hoy}T12:00`)) / 604800000) : null);
  const fase = $derived(plan ? FASES[semanaDe(plan, hoy)?.fase]?.nombre || null : null);

  function aceptar() {
    if (!agenda.eventos.some((e) => e.fecha === MEDIA)) guardarEvento({ id: 'media-2026-10-25', fecha: MEDIA, hora: '09:00', km: 21.1, nombre: 'Media maratón' });
    if (config.enfoque !== 'equilibrado' || !config.exigencia) guardarHyrox({ ...config, enfoque: 'equilibrado', exigencia: config.exigencia || 'muy' });
    guardarViaje({ id: 'viaje-2026-11-04', nombre: 'Jaén', desde: VIAJE.desde, hasta: VIAJE.hasta, comida: comida.length ? [...comida] : ['fuera', 'super'], entreno: 'sinGym' });
    actualizar((x) => { x.propuestasVistas = { ...(x.propuestasVistas || {}), [CLAVE]: true }; });
    anotarDiario('hyrox-tras-media', 'Plan HYROX tras la media', 'Semana de vuelta suave, bíceps y tríceps en los días de torso y Jaén con entrenos sin máquinas.');
    avisar('Plan HYROX listo: vuelta suave, más brazos y Jaén sin máquinas', '🏆');
  }
  function descartar() {
    actualizar((x) => { x.propuestasVistas = { ...(x.propuestasVistas || {}), [CLAVE]: true }; });
  }
</script>

{#if visible}
  <section class="propuesta" aria-label="Preparar el plan HYROX">
    <div class="cab"><span class="ic"><Icono n="trophy" tam={20} /></span><b>¿Preparo tu plan HYROX tras la media?</b></div>
    <ul>
      {#if hoy <= '2026-10-29'}<li><b>Esta semana, vuelta suave:</b> lunes recuperación y hasta el jueves solo rodajes suaves, sin series ni pierna pesada. El torso, normal</li>{/if}
      <li><b>Brazos:</b> curl martillo y curl inclinado, y tríceps con press francés y extensión en polea en tus días de torso</li>
      {#if config.enfoque === 'hyrox'}<li><b>HYROX + físico:</b> tu plan suma los días de torso y brazos</li>{/if}
      <li><b>Jaén, del 4 al 7 de noviembre:</b> entrenos sin máquinas (peso corporal, parque y cuestas) y caminar</li>
      {#if plan?.carrera}
        <li><b>Tu HYROX:</b> {diaSemana(plan.carrera).slice(0, 3)} {fechaCorta(plan.carrera)} · {semanas === 1 ? 'falta 1 semana' : `faltan ${semanas} semanas`}{fase ? `. Ahora, fase ${fase.toLowerCase()}` : ''}</li>
      {:else}
        <li><b>Sin fecha de HYROX:</b> cuando la tengas, ponla en «Editar plan» y ajusto las fases</li>
      {/if}
    </ul>
    <fieldset class="chips" aria-label="Cómo vas a comer en Jaén"><legend>En Jaén comerás…</legend>
      {#each COMIDA as [v, n] (v)}
        <label class:activo={comida.includes(v)}><input type="checkbox" value={v} bind:group={comida} /> {n}</label>
      {/each}
    </fieldset>
    <div class="acciones">
      <button class="boton" onclick={aceptar}>Sí, prepáralo</button>
      <button class="boton boton-sec" onclick={descartar}>No</button>
    </div>
  </section>
{/if}

<style>
  .propuesta { margin: 0 0 16px; padding: 16px; border-radius: var(--r-xl); background: linear-gradient(160deg, color-mix(in srgb, var(--primario) 18%, var(--superficie)), var(--superficie)); box-shadow: 0 0 0 1px color-mix(in srgb, var(--primario) 30%, transparent); }
  .cab { display: flex; align-items: center; gap: 10px; }
  .cab b { font-size: 1.02rem; line-height: 1.25; }
  .ic { width: 38px; height: 38px; border-radius: var(--r-s); display: grid; place-items: center; flex-shrink: 0; background: var(--primario-claro); color: var(--primario-fuerte); }
  ul { margin: 12px 0; padding-left: 18px; display: grid; gap: 4px; color: var(--texto-2); font-size: 0.88rem; }
  ul b { color: var(--texto); }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; border: 0; margin: 0 0 12px; padding: 0; }
  .chips legend { width: 100%; margin-bottom: 6px; font-weight: 600; font-size: 0.88rem; }
  .chips label { display: inline-flex; align-items: center; min-height: 38px; padding: 0 13px; border-radius: 999px; border: 1px solid var(--borde); background: var(--superficie-2); color: var(--texto); font-weight: 700; font-size: 0.82rem; cursor: pointer; }
  .chips .activo { border-color: var(--primario); background: var(--primario-claro); color: var(--primario-fuerte); }
  .chips input { position: absolute; opacity: 0; pointer-events: none; }
  .acciones { display: grid; grid-template-columns: 2fr 1fr; gap: 8px; }
</style>
