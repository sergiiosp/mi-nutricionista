<script>
  // Si tus datos solo están en este móvil y hace más de 7 días de la última copia, Hoy te lo recuerda:
  // guardar la copia (con fotos) en iCloud Drive en un toque, o activar la nube gratuita.
  import Icono from './Icono.svelte';
  import { estado, actualizar } from '../stores/estado.js';
  import { avisar } from '../stores/ui.js';
  import { ir } from '../stores/ruta.js';
  import { nube } from '../lib/nube/sincro.js';
  import { guardarCopiaFuera } from '../lib/copias.js';
  import { hoyISO, sumarDias } from '../lib/planificador.js';

  const hoy = hoyISO();
  const dias = $derived($estado.ultimaCopia ? Math.round((new Date(`${hoy}T12:00`) - new Date(`${$estado.ultimaCopia}T12:00`)) / 86400000) : null);
  const conDatos = $derived(Object.values($estado.registros || {}).reduce((s, l) => s + l.length, 0) >= 3);
  const pospuesto = $derived($estado.copiaPospuesta && sumarDias($estado.copiaPospuesta, 3) > hoy);
  const visible = $derived(!$nube.activa && conDatos && !pospuesto && (dias == null || dias >= 7));
  let guardando = $state(false);

  async function guardar() {
    guardando = true;
    try { if (await guardarCopiaFuera()) avisar('Copia guardada, con tus fotos', '💾'); } catch (e) { avisar(`No se pudo guardar: ${e.message}`, '⚠️'); }
    guardando = false;
  }
</script>

{#if visible}
  <section class="copia" aria-label="Copia de seguridad">
    <div class="cp-cab">
      <span class="cp-ic"><Icono n="cloud" tam={20} /></span>
      <div><b>Tus datos solo están en este iPhone</b><small>{dias == null ? 'Aún no has guardado ninguna copia fuera del móvil.' : `Tu última copia es de hace ${dias} días.`} Si lo pierdes, lo pierdes todo.</small></div>
    </div>
    <div class="cp-acciones">
      <button class="boton" disabled={guardando} onclick={guardar}><Icono n="save" tam={17} /> {guardando ? 'Preparando…' : 'Guardar copia'}</button>
      <button class="boton boton-sec" onclick={() => ir('ajustes', 'conectar')}>Activar la nube</button>
    </div>
    <button class="luego" onclick={() => actualizar((e) => { e.copiaPospuesta = hoy; })}>Más tarde</button>
  </section>
{/if}

<style>
  .copia { margin-top: 12px; padding: 14px; border-radius: var(--r-l); background: radial-gradient(120% 120% at 0% 0%, var(--azul-claro), transparent 70%), var(--superficie); box-shadow: inset 0 0 0 1.5px color-mix(in srgb, var(--azul) 35%, transparent); }
  .cp-cab { display: flex; gap: 12px; align-items: flex-start; }
  .cp-ic { display: grid; place-items: center; width: 40px; height: 40px; border-radius: var(--r-s); background: var(--azul-claro); color: var(--azul); flex-shrink: 0; }
  .cp-cab div { display: grid; gap: 2px; }
  .cp-cab b { font-size: 0.95rem; }
  .cp-cab small { font-size: 0.82rem; color: var(--texto-2); line-height: 1.35; }
  .cp-acciones { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 12px; }
  .cp-acciones .boton { min-height: 46px; padding: 0 10px; font-size: 0.9rem; white-space: nowrap; }
  .luego { display: block; margin: 6px auto 0; min-height: 36px; padding: 0 12px; border: 0; background: none; color: var(--texto-3); font: inherit; font-size: 0.8rem; font-weight: 600; cursor: pointer; }
</style>
