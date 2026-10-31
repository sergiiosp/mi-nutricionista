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
    <div class="cab"><span class="ic"><Icono n="activity" tam={20} /></span><b>¿Empezamos tu rutina de suelo pélvico?</b></div>
    <ul>
      <li><b>5 minutos cada noche:</b> te sale en Tu día, antes de dormir</li>
      <li><b>Avanza sola:</b> 2 semanas tumbado, luego sentado y de pie, y desde la semana 7 en movimiento</li>
      <li><b>Fortalece y enseña a soltar.</b> Y en tu menú, algo más de fibra</li>
    </ul>
    <div class="acciones">
      <button class="boton" onclick={empezar}>Empezar hoy</button>
      <button class="boton boton-sec" onclick={descartar}>Ahora no</button>
    </div>
    <button class="ver-rutina" onclick={() => abrirHoja('suelo')}>Ver cómo es <Icono n="chevron-right" tam={15} /></button>
  </section>
{/if}

<style>
  .propuesta { margin: 0 0 16px; padding: 16px; border-radius: var(--r-xl); background: linear-gradient(160deg, color-mix(in srgb, var(--primario) 18%, var(--superficie)), var(--superficie)); box-shadow: 0 0 0 1px color-mix(in srgb, var(--primario) 30%, transparent); }
  .cab { display: flex; align-items: center; gap: 10px; }
  .cab b { font-size: 1.02rem; line-height: 1.25; }
  .ic { width: 38px; height: 38px; border-radius: var(--r-s); display: grid; place-items: center; flex-shrink: 0; background: var(--primario-claro); color: var(--primario-fuerte); }
  ul { margin: 12px 0; padding-left: 18px; display: grid; gap: 4px; color: var(--texto-2); font-size: 0.88rem; }
  ul b { color: var(--texto); }
  .acciones { display: grid; grid-template-columns: 1fr auto; gap: 8px; }
  .acciones .boton-sec { padding-inline: 20px; }
  .ver-rutina { display: flex; align-items: center; justify-content: center; gap: 4px; width: 100%; min-height: 44px; margin-top: 4px; border: 0; background: none; color: var(--primario-fuerte); font: inherit; font-weight: 700; font-size: 0.86rem; cursor: pointer; }
</style>
