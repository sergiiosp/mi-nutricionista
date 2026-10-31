<script>
  // Propuesta de un toque: empezar la rutina de suelo pélvico (5 minutos cada noche, por fases) con algo más de
  // fibra en el menú. Discreta a propósito: en Hoy no se habla de para qué es. Desaparece al empezar o descartarla.
  import Icono from './Icono.svelte';
  import { estado, actualizar } from '../stores/estado.js';
  import { avisar, abrirHoja } from '../stores/ui.js';
  import { activarSuelo } from '../lib/acciones.js';

  const CLAVE = 'suelo-pelvico';
  const visible = $derived(!!$estado.perfil && !$estado.perfil.sueloPelvico && !$estado.propuestasVistas?.[CLAVE]);
  function empezar() {
    activarSuelo();
    avisar('Rutina activada: la tienes cada noche en Tu día', '✅');
  }
  function descartar() {
    actualizar((x) => { x.propuestasVistas = { ...(x.propuestasVistas || {}), [CLAVE]: true }; });
  }
</script>

{#if visible}
  <section class="propuesta" aria-label="Rutina de suelo pélvico">
    <div class="cab"><span class="ic"><Icono n="activity" tam={20} /></span><span class="txt"><b>Rutina de suelo pélvico</b><small>5 minutos cada noche, antes de dormir. Avanza sola.</small></span></div>
    <div class="acciones">
      <button class="boton" onclick={empezar}>Empezar hoy</button>
      <button class="boton boton-sec" onclick={descartar}>Ahora no</button>
    </div>
    <button class="ver-rutina" onclick={() => abrirHoja('suelo')}>Ver cómo es <Icono n="chevron-right" tam={15} /></button>
  </section>
{/if}

<style>
  .propuesta { margin: 0; padding: 14px; border-radius: var(--r-l); background: var(--superficie); box-shadow: var(--sombra); }
  .txt { display: grid; gap: 2px; }
  .txt small { font-size: 0.82rem; color: var(--texto-2); }
  .cab { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
  .cab b { font-size: 1.02rem; line-height: 1.25; }
  .ic { width: 38px; height: 38px; border-radius: var(--r-s); display: grid; place-items: center; flex-shrink: 0; background: var(--primario-claro); color: var(--primario-fuerte); }
  .acciones { display: grid; grid-template-columns: 1fr auto; gap: 8px; }
  .acciones .boton-sec { padding-inline: 20px; }
  .ver-rutina { display: flex; align-items: center; justify-content: center; gap: 4px; width: 100%; min-height: 44px; margin-top: 4px; border: 0; background: none; color: var(--primario-fuerte); font: inherit; font-weight: 700; font-size: 0.86rem; cursor: pointer; }
</style>
