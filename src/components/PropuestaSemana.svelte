<script>
  // Propuesta de un toque: la media maratón del domingo 25 de octubre de 2026 y el viaje de jueves a
  // sábado. Al aceptar se añaden a la agenda y se ajustan entreno y menú. Desaparece al aceptarla,
  // al descartarla o pasada la fecha.
  import Icono from './Icono.svelte';
  import { estado, actualizar } from '../stores/estado.js';
  import { avisar } from '../stores/ui.js';
  import { guardarEvento, guardarViaje } from '../lib/acciones.js';
  import { hoyISO } from '../lib/planificador.js';

  const CLAVE = 'media-2026-10-25';
  const CARRERA = '2026-10-25';
  const VIAJE = { desde: '2026-10-22', hasta: '2026-10-24' };
  let hora = $state('09:00');

  const agenda = $derived($estado.agenda || { eventos: [], viajes: [] });
  const yaEsta = $derived(agenda.eventos.some((e) => e.fecha === CARRERA) || agenda.viajes.some((v) => v.desde <= VIAJE.hasta && v.hasta >= VIAJE.desde));
  const visible = $derived(hoyISO() <= CARRERA && !yaEsta && !$estado.propuestasVistas?.[CLAVE]);

  function aceptar() {
    guardarViaje({ id: 'viaje-2026-10-22', nombre: 'Viaje', desde: VIAJE.desde, hasta: VIAJE.hasta, comida: ['fuera', 'super'] });
    guardarEvento({ id: 'media-2026-10-25', fecha: CARRERA, hora: hora || '09:00', km: 21.1, nombre: 'Media maratón' });
    avisar('Semana ajustada: entreno suave, caminar de viaje y carga de hidratos el sábado', '🏁');
  }
  function descartar() {
    actualizar((x) => { x.propuestasVistas = { ...(x.propuestasVistas || {}), [CLAVE]: true }; });
  }
</script>

{#if visible}
  <section class="propuesta" aria-label="Ajustar la semana">
    <div class="cab"><span class="ic"><Icono n="flag" tam={20} /></span><b>¿Ajusto tu semana para la media maratón?</b></div>
    <ul>
      <li><b>Hasta el miércoles:</b> lo que queda de entreno, más corto y suave</li>
      <li><b>Jue a sáb (viaje):</b> caminar y menú de restaurante o súper sin cocina</li>
      <li><b>Sábado:</b> carga de hidratos · <b>domingo 25:</b> la media con tu ritmo objetivo</li>
      <li><b>Lunes:</b> recuperación</li>
    </ul>
    <label class="hora"><span>Hora de salida</span><input type="time" bind:value={hora} /></label>
    <div class="acciones">
      <button class="boton" onclick={aceptar}>Sí, ajústalo todo</button>
      <button class="boton boton-sec" onclick={descartar}>No</button>
    </div>
  </section>
{/if}

<style>
  .propuesta { margin: 0 0 16px; padding: 16px; border-radius: 22px; background: linear-gradient(160deg, color-mix(in srgb, var(--primario) 18%, var(--superficie)), var(--superficie)); box-shadow: 0 0 0 1px color-mix(in srgb, var(--primario) 30%, transparent); }
  .cab { display: flex; align-items: center; gap: 10px; }
  .cab b { font-size: 1.02rem; line-height: 1.25; }
  .ic { width: 38px; height: 38px; border-radius: 12px; display: grid; place-items: center; flex-shrink: 0; background: var(--primario-claro); color: var(--primario-fuerte); }
  ul { margin: 12px 0; padding-left: 18px; display: grid; gap: 4px; color: var(--texto-2); font-size: 0.88rem; }
  ul b { color: var(--texto); }
  .hora { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 12px; font-weight: 600; font-size: 0.88rem; }
  .hora input { width: 120px; min-height: 42px; padding: 0 10px; border-radius: 12px; border: 1px solid var(--borde); background: var(--superficie-2); color: var(--texto); font: inherit; }
  .acciones { display: grid; grid-template-columns: 2fr 1fr; gap: 8px; }
</style>
