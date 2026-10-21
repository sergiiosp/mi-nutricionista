<script>
  // Repaso de la semana: unas preguntas, los ajustes que propongo y un resumen para pedir cambios más grandes.
  import { slide } from 'svelte/transition';
  import Icono from './Icono.svelte';
  import { estado } from '../stores/estado.js';
  import { avisar } from '../stores/ui.js';
  import { calcularObjetivos } from '../lib/nutricion.js';
  import { hoyISO, sumarDias, recetaPorId } from '../lib/planificador.js';
  import { PREGUNTAS_SEMANA, lunesDe, guardarRepaso, propuestas, aplicarPropuestas, textoResumen } from '../lib/feedback.js';
  import { crearPlan, reajustarPlan } from '../lib/acciones.js';

  const hoy = hoyISO();
  const lunes = lunesDe(hoy);
  const esFinDeSemana = [0, 6].includes(new Date(`${hoy}T12:00:00`).getDay());
  const repaso = $derived($estado.feedback?.semanas?.[lunes] || {});
  const objetivos = $derived(calcularObjetivos($estado.perfil));
  const props = $derived(propuestas($estado, objetivos, hoy, repaso));
  let abierto = $state(esFinDeSemana);
  let elegidas = $state({});
  let entreno = $state('');
  let app = $state('');
  $effect(() => { entreno = repaso.entreno || ''; app = repaso.app || ''; });

  // Platos de esta semana para marcar los que no repetirías
  const platos = $derived.by(() => {
    const vistos = new Map();
    for (const d of $estado.plan?.dias || []) {
      if (d.fecha < sumarDias(hoy, -7) || d.fecha > hoy) continue;
      for (const c of d.comidas) if (!c.recetaId.startsWith('combo:') && !vistos.has(c.recetaId)) vistos.set(c.recetaId, recetaPorId[c.recetaId]?.nombre);
    }
    return [...vistos].filter(([, n]) => n);
  });

  const elegir = (k, v) => guardarRepaso(lunes, { [k]: repaso[k] === v ? null : v });
  function alternarPlato(id) {
    const l = repaso.recetasNo || [];
    guardarRepaso(lunes, { recetasNo: l.includes(id) ? l.filter((x) => x !== id) : [...l, id] });
  }
  function guardarTextos() {
    guardarRepaso(lunes, { entreno: entreno.trim(), app: app.trim() });
  }
  function aplicar() {
    const lista = props.filter((p) => elegidas[p.id] ?? true);
    if (!lista.length) return;
    const { nuevoMenu } = aplicarPropuestas(lista);
    if (nuevoMenu) crearPlan(); else reajustarPlan();
    guardarRepaso(lunes, { aplicadas: lista.map((p) => p.texto) });
    avisar(nuevoMenu ? 'Ajustes aplicados y menú nuevo listo' : 'Ajustes aplicados: tu menú ya está recalculado', '✅');
  }
  async function compartir() {
    guardarTextos();
    const texto = textoResumen($estado, objetivos, hoy, { ...repaso, entreno: entreno.trim(), app: app.trim() });
    try {
      if (navigator.share) await navigator.share({ text: texto });
      else { await navigator.clipboard.writeText(texto); avisar('Resumen copiado', '📋'); }
    } catch { /* cancelado */ }
  }
</script>

<div class="repaso">
  <button class="cab" onclick={() => (abierto = !abierto)} aria-expanded={abierto}>
    <Icono n="clipboard-list" tam={22} />
    <span><b>Repaso de la semana</b><small>{repaso.fecha ? 'Hecho. Puedes cambiarlo cuando quieras' : esFinDeSemana ? 'Toca hacerlo: 1 minuto' : 'Mejor el fin de semana, pero puedes hacerlo ya'}</small></span>
    <Icono n={abierto ? 'minus' : 'plus'} tam={16} />
  </button>
  {#if abierto}
    <div class="cuerpo" transition:slide={{ duration: 180 }}>
      {#each Object.entries(PREGUNTAS_SEMANA) as [k, p] (k)}
        <div class="preg">
          <span>{p.nombre}</span>
          <div class="ops">
            {#each p.opciones as [v, n] (v)}
              <button class:activo={repaso[k] === v} aria-pressed={repaso[k] === v} onclick={() => elegir(k, v)}>{n}</button>
            {/each}
          </div>
        </div>
      {/each}
      {#if platos.length}
        <div class="preg">
          <span>¿Algún plato que no repetirías?</span>
          <div class="chips">
            {#each platos as [id, nombre] (id)}
              <button class:activo={(repaso.recetasNo || []).includes(id)} aria-pressed={(repaso.recetasNo || []).includes(id)} onclick={() => alternarPlato(id)}>{nombre}</button>
            {/each}
          </div>
        </div>
      {/if}
      <label class="campo"><span>¿Algo del entreno? <small>(opcional)</small></span>
        <input bind:value={entreno} onchange={guardarTextos} maxlength="200" placeholder="Me molesta la rodilla, quiero más brazo…" /></label>
      <label class="campo"><span>¿Algo de la app que cambiarías? <small>(opcional)</small></span>
        <input bind:value={app} onchange={guardarTextos} maxlength="200" placeholder="Me cuesta encontrar…, echo en falta…" /></label>

      {#if props.length}
        <h3 class="sub">Lo que te propongo</h3>
        {#each props as p (p.id)}
          <label class="prop">
            <input type="checkbox" checked={elegidas[p.id] ?? true} onchange={(ev) => (elegidas = { ...elegidas, [p.id]: ev.currentTarget.checked })} />
            <span><b>{p.texto}</b><small>{p.porque}</small></span>
          </label>
        {/each}
        <button class="boton ancho" onclick={aplicar}>Aplicar lo marcado</button>
      {:else}
        <p class="pie-nota">Con lo que me cuentas, no hace falta cambiar nada esta semana. Sigue así.</p>
      {/if}
      {#if repaso.aplicadas?.length}<p class="pie-nota">Ya aplicado esta semana: {repaso.aplicadas.join('; ')}.</p>{/if}

      <button class="boton boton-sec ancho" onclick={compartir}><Icono n="share" tam={18} /> Copiar el resumen para Claude</button>
      <p class="pie-nota">La app no usa IA. Para cambios más grandes (rutinas, platos nuevos o cosas de la app), pega este resumen en tu conversación con Claude.</p>
    </div>
  {/if}
</div>

<style>
  .repaso { margin-bottom: 12px; border-radius: var(--r-l); background: radial-gradient(120% 100% at 0% 0%, rgb(255 91 31 / 0.16), transparent 65%), var(--superficie); box-shadow: var(--sombra); }
  .cab { width: 100%; display: flex; align-items: center; gap: 12px; min-height: 60px; padding: 12px 14px; border: 0; background: none; color: var(--texto); font: inherit; text-align: left; cursor: pointer; }
  .cab > :global(svg:first-child) { color: var(--primario); flex-shrink: 0; }
  .cab span { flex: 1; display: grid; }
  .cab small { color: var(--texto-2); font-weight: 600; font-size: 0.78rem; }
  .cuerpo { padding: 0 14px 16px; }
  .preg { display: grid; gap: 6px; margin-bottom: 12px; }
  .preg > span { font-weight: 700; font-size: 0.86rem; }
  .ops { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
  .ops button, .chips button { min-height: 44px; padding: 0 8px; border-radius: var(--r-s); border: 1px solid var(--borde); background: var(--superficie-2); color: var(--texto); font-weight: 700; font-size: 0.8rem; cursor: pointer; }
  .ops button.activo, .chips button.activo { border-color: var(--primario); background: var(--primario-claro); color: var(--primario-fuerte); }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .chips button { text-align: left; padding: 8px 10px; line-height: 1.25; }
  .sub { margin: 16px 0 8px; font-size: 0.95rem; }
  .prop { display: flex; gap: 10px; align-items: flex-start; padding: 10px 0; border-top: 1px solid var(--linea); cursor: pointer; }
  .prop input { width: 20px; height: 20px; margin-top: 2px; accent-color: var(--primario); flex-shrink: 0; }
  .prop span { display: grid; gap: 2px; }
  .prop small { color: var(--texto-2); font-weight: 600; font-size: 0.78rem; line-height: 1.35; }
  .ancho { width: 100%; margin-top: 10px; }
</style>
