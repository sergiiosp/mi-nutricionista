<script>
  import Icono from '../components/Icono.svelte';
  // Envoltorio Svelte del cuestionario (lib/cuestionario.js genera cada paso)
  import { tick } from 'svelte';
  import { iniciarCuestionario, vistaCuestionario, enviarPaso, pasoAtras, actualizarVisibles } from '../lib/cuestionario.js';
  import Hoja from '../components/Hoja.svelte';
  import Vincular from '../components/nube/Vincular.svelte';

  let { perfil = null, onterminar, oncancelar } = $props();
  iniciarCuestionario(perfil);
  // ¿Ya usas la app en otro dispositivo? (también al llegar desde el enlace del QR)
  const claveEnlace = !perfil ? sessionStorage.getItem('vincular') : null;
  if (claveEnlace) sessionStorage.removeItem('vincular');
  let vinculando = $state(!!claveEnlace);
  let version = $state(0);
  let raiz;
  const html = $derived((version, vistaCuestionario()));

  async function refrescar() {
    version++;
    await tick();
    actualizarVisibles(raiz?.querySelector('#form-paso'));
    window.scrollTo(0, 0);
  }

  function alEnviar(ev) {
    ev.preventDefault();
    const r = enviarPaso(ev.target);
    if (r.error) return;
    if (r.avanzar) return refrescar();
    onterminar?.(r.perfil, r.editando);
  }

  function alClic(ev) {
    const el = ev.target.closest('[data-accion]');
    if (!el) return;
    if (el.dataset.accion === 'paso-atras') { pasoAtras(); refrescar(); }
    if (el.dataset.accion === 'cancelar-edicion') oncancelar?.();
  }

  function alCambiar(ev) {
    if (ev.target.form?.id === 'form-paso') actualizarVisibles(ev.target.form);
  }

  $effect(() => { tick().then(() => actualizarVisibles(raiz?.querySelector('#form-paso'))); });
</script>

{#if !perfil}
  <div class="contenido ya-uso">
    <button class="boton-texto" onclick={() => (vinculando = true)}><Icono e="🔗" tam={18} /> ¿Ya usabas Pulso? <b>Recupera tus datos</b></button>
  </div>
{/if}
{#if vinculando}
  <Hoja titulo="Vincular este dispositivo" onclose={() => (vinculando = false)}>
    <Vincular clave={claveEnlace} onhecho={() => (vinculando = false)} />
  </Hoja>
{/if}
<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<div class="contenido" bind:this={raiz} onsubmit={alEnviar} onclick={alClic} onchange={alCambiar}>
  {@html html}
</div>

<style>
  .ya-uso { padding-top: 12px; padding-bottom: 0; text-align: center; }
  .ya-uso button { font-size: 0.9rem; }
</style>
