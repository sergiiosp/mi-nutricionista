<script>
  // Envoltorio Svelte del cuestionario (lib/cuestionario.js genera cada paso)
  import { tick } from 'svelte';
  import { iniciarCuestionario, vistaCuestionario, enviarPaso, pasoAtras, actualizarVisibles } from '../lib/cuestionario.js';

  let { perfil = null, onterminar, oncancelar } = $props();
  iniciarCuestionario(perfil);
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

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<div class="contenido" bind:this={raiz} onsubmit={alEnviar} onclick={alClic} onchange={alCambiar}>
  {@html html}
</div>
