<script>
  // Repaso del domingo: báscula, cinco preguntas y el ajuste de la semana que viene. Un solo ajuste por semana,
  // como mucho ±150 kcal y en hidratos, y solo si lo aplicas tú. Se puede mandar al buzón para revisarlo juntos.
  import Icono from './Icono.svelte';
  import FormPeso from './FormPeso.svelte';
  import { estado } from '../stores/estado.js';
  import { avisar } from '../stores/ui.js';
  import { calcularObjetivos } from '../lib/nutricion.js';
  import { hoyISO, sumarDias, recetaPorId } from '../lib/planificador.js';
  import { PREGUNTAS_SEMANA, claveRepaso, repasoHecho, guardarRepaso, propuestas, aplicarPropuestas, textoResumen } from '../lib/feedback.js';
  import { tendencia, mediaSemana } from '../lib/progreso.js';
  import { crearPlan, reajustarPlan } from '../lib/acciones.js';
  import { enviarNota } from '../lib/buzon.js';
  import { fechaCorta, num } from '../lib/formato.js';

  const hoy = hoyISO();
  const clave = claveRepaso(hoy);
  const repaso = $derived($estado.feedback?.semanas?.[clave] || {});
  const hecho = $derived(repasoHecho(repaso));
  const objetivos = $derived(calcularObjetivos($estado.perfil));
  const props = $derived(propuestas($estado, objetivos, hoy, repaso));
  const pesos = $derived([...($estado.pesos || [])].sort((a, b) => a.fecha.localeCompare(b.fecha)));
  const media = $derived(mediaSemana(pesos));
  const t = $derived(tendencia(pesos));
  // Pesado este fin de semana (o hoy, si es lunes): si no, el formulario sale abierto
  const ultimo = $derived(pesos.at(-1));
  const pesadoReciente = $derived(!!ultimo && ultimo.fecha >= sumarDias(hoy, -1));
  let formAbierto = $state(false);
  let elegidas = $state({});
  let enviando = $state(false);

  // Platos de esta semana, para marcar los que no repetirías
  const platos = $derived.by(() => {
    const vistos = {};
    for (const d of $estado.plan?.dias || []) {
      if (d.fecha < sumarDias(hoy, -7) || d.fecha > hoy) continue;
      for (const c of d.comidas) if (!c.recetaId.startsWith('combo:') && !(c.recetaId in vistos)) vistos[c.recetaId] = recetaPorId[c.recetaId]?.nombre;
    }
    return Object.entries(vistos).filter(([, n]) => n);
  });

  const elegir = (k, v) => guardarRepaso(clave, { [k]: repaso[k] === v ? null : v });
  function alternarPlato(id) {
    const l = repaso.recetasNo || [];
    guardarRepaso(clave, { recetasNo: l.includes(id) ? l.filter((x) => x !== id) : [...l, id] });
  }
  function aplicar() {
    const lista = props.filter((p) => elegidas[p.id] ?? true);
    if (!lista.length) return;
    const { nuevoMenu } = aplicarPropuestas(lista);
    if (nuevoMenu) crearPlan(); else reajustarPlan();
    guardarRepaso(clave, { aplicadas: lista.map((p) => p.texto) });
    avisar(nuevoMenu ? 'Hecho: menú nuevo para la semana' : 'Hecho: tu menú ya está recalculado', '✅');
  }
  async function enviar() {
    enviando = true;
    const texto = textoResumen($estado, objetivos, hoy, repaso);
    const ok = await enviarNota({ tipo: 'nota', tema: 'repaso', texto });
    enviando = false;
    avisar(ok ? 'Repaso enviado al buzón' : 'Sin conexión: lo envío en cuanto puedas', ok ? '📬' : '⏳');
  }
  const ritmo = (x) => `${x > 0 ? '+' : x < 0 ? '−' : ''}${num(Math.abs(x), 2)} kg/semana`;
</script>

<div class="repaso">
  <p class="intro">Dos minutos para cerrar la semana: con esto ajusto la siguiente.</p>

  <section class="paso" aria-labelledby="paso-1">
    <h3 id="paso-1"><span class="n">1</span> Báscula</h3>
    {#if pesadoReciente && !formAbierto}
      <div class="dato">
        <span><small>Media de 7 días</small><b class="cifra">{num(media.peso, 1)} <em>kg</em></b></span>
        {#if t}<span><small>Ritmo</small><b class="cifra">{ritmo(t.kgSemana)}</b></span>{/if}
      </div>
      <p class="pie-nota">Último pesaje: {num(ultimo.peso, 1)} kg, {fechaCorta(ultimo.fecha)}. <button class="enlace" onclick={() => (formAbierto = true)}>Apuntar otro</button></p>
    {:else}
      <FormPeso titulo="Tu pesaje de esta semana" onguardado={() => (formAbierto = false)} />
    {/if}
  </section>

  <section class="paso" aria-labelledby="paso-2">
    <h3 id="paso-2"><span class="n">2</span> Cinco preguntas</h3>
    {#each Object.entries(PREGUNTAS_SEMANA) as [k, p] (k)}
      <div class="preg">
        <span>{p.nombre}</span>
        <div class="ops">
          {#each p.opciones as [v, nombre] (v)}
            <button class:activo={repaso[k] === v} aria-pressed={repaso[k] === v} onclick={() => elegir(k, v)}>{nombre}</button>
          {/each}
        </div>
      </div>
    {/each}
    {#if platos.length}
      <details class="platos">
        <summary>¿Algún plato que no repetirías?</summary>
        <div class="chips">
          {#each platos as [id, nombre] (id)}
            <button class:activo={(repaso.recetasNo || []).includes(id)} aria-pressed={(repaso.recetasNo || []).includes(id)} onclick={() => alternarPlato(id)}>{nombre}</button>
          {/each}
        </div>
      </details>
    {/if}
  </section>

  <section class="paso" aria-labelledby="paso-3">
    <h3 id="paso-3"><span class="n">3</span> Tu semana que viene</h3>
    {#if repaso.aplicadas?.length}
      <p class="aplicado"><Icono n="check" tam={16} grosor={2.6} /> Aplicado esta semana: {repaso.aplicadas.join('; ')}.</p>
    {:else if !hecho}
      <p class="pie-nota">Contesta las cinco preguntas y te digo qué ajusto.</p>
    {:else if props.length}
      {#each props as p (p.id)}
        <label class="prop">
          <input type="checkbox" checked={elegidas[p.id] ?? true} onchange={(ev) => (elegidas = { ...elegidas, [p.id]: ev.currentTarget.checked })} />
          <span><b>{p.texto}</b><small>{p.porque}</small></span>
        </label>
      {/each}
      <button class="boton ancho" onclick={aplicar}>Aplicar</button>
      <p class="pie-nota">Un solo ajuste por semana, como mucho 150 kcal y siempre en hidratos: la proteína y la grasa no se tocan.</p>
    {:else}
      <p class="sigue"><Icono n="check" tam={16} grosor={2.6} /> Con lo que me cuentas y tu peso, no hace falta tocar nada. Sigue así.</p>
    {/if}
  </section>

  <button class="boton boton-sec ancho" disabled={enviando} onclick={enviar}><Icono n="message-square-text" tam={18} /> Enviar el repaso al buzón</button>
  <p class="pie-nota">Para cambios más grandes (la rutina, platos nuevos o algo de la app), lo vemos juntos cuando mire el buzón.</p>
</div>

<style>
  .repaso { display: grid; gap: 12px; }
  .intro { margin: 0; color: var(--texto-2); font-size: 0.9rem; }
  .paso { padding: 14px; border-radius: var(--r-l); background: var(--superficie); box-shadow: var(--sombra); }
  .paso > :global(.form) { margin: 0; box-shadow: none; padding: 0; background: none; }
  h3 { display: flex; align-items: center; gap: 10px; margin: 0 0 12px; font-size: 1rem; font-weight: 600; }
  .n { display: grid; place-items: center; width: 24px; height: 24px; border-radius: 50%; background: var(--texto); color: var(--superficie); font-size: 0.78rem; font-weight: 600; }
  .dato { display: flex; gap: 24px; }
  .dato span { display: grid; }
  .dato small { font-size: 0.74rem; font-weight: 600; color: var(--texto-2); }
  .dato b { font-size: 1.6rem; line-height: 1.1; letter-spacing: -0.02em; }
  .dato em { font-style: normal; font-size: 0.85rem; color: var(--texto-2); }
  .preg { display: grid; gap: 6px; margin-bottom: 12px; }
  .preg > span { font-weight: 600; font-size: 0.86rem; }
  .ops { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
  .ops button, .chips button { min-height: 44px; padding: 0 8px; border-radius: var(--r-s); border: 1px solid transparent; background: var(--superficie-2); color: var(--texto); font: inherit; font-weight: 500; font-size: 0.8rem; cursor: pointer; }
  .ops button.activo, .chips button.activo { background: var(--texto); color: var(--superficie); }
  .platos summary { font-weight: 600; font-size: 0.86rem; cursor: pointer; padding: 6px 0; }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
  .chips button { text-align: left; padding: 8px 10px; line-height: 1.25; }
  .prop { display: flex; gap: 10px; align-items: flex-start; padding: 10px 0; border-top: 1px solid var(--linea); cursor: pointer; }
  .prop input { width: 20px; height: 20px; margin-top: 2px; accent-color: var(--texto); flex-shrink: 0; }
  .prop span { display: grid; gap: 2px; }
  .prop small { color: var(--texto-2); font-weight: 500; font-size: 0.8rem; line-height: 1.35; }
  .aplicado, .sigue { display: flex; gap: 8px; align-items: flex-start; margin: 0; font-size: 0.9rem; }
  .aplicado :global(svg), .sigue :global(svg) { flex-shrink: 0; margin-top: 2px; color: var(--dia-ok, var(--exito)); }
  .ancho { width: 100%; margin-top: 10px; }
</style>
