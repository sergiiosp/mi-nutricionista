<script>
  // Buzón: apuntas un fallo, una idea o algo que no te cuadra (de la app, la dieta o los entrenos) y lo
  // revisamos juntos en la próxima sesión. Debajo, tus notas con su estado y la respuesta.
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import Icono from './Icono.svelte';
  import { estado } from '../stores/estado.js';
  import { ruta } from '../stores/ruta.js';
  import { avisar } from '../stores/ui.js';
  import { comprimir } from '../lib/fotos.js';
  import { contextoNota, enviarNota, vaciarCola, actualizarBuzon, borrarNota, marcarLeidas, temaDe, sobreTexto } from '../lib/buzon.js';
  import { fechaCorta } from '../lib/formato.js';

  // objeto: la sesión o la comida desde la que comentas (la pantalla es la que está debajo de la hoja)
  let { objeto = null } = $props();
  const pagina = $derived($ruta.pagina);
  const sub = $derived($ruta.sub);
  const TIPOS = [['fallo', 'Fallo'], ['idea', 'Idea'], ['nocuadra', 'No me cuadra'], ['pregunta', 'Pregunta']];
  const TEMAS = [['app', 'App'], ['dieta', 'Dieta'], ['entreno', 'Entreno']];
  const NOMBRE_TIPO = { ...Object.fromEntries(TIPOS), nota: 'Nota' };
  const NOMBRE_TEMA = Object.fromEntries(TEMAS);
  const ESTADO = { pendiente: 'Sin enviar', error: 'No se pudo enviar', enviada: 'Enviada', vista: 'Vista', enmarcha: 'En marcha', hecha: 'Hecha', descartada: 'Descartada' };

  // Elegible, pero parte de dónde escribes (sesión → entreno, comida → dieta)
  let tema = $derived(temaDe(pagina, objeto));
  let tipo = $state(null);
  let texto = $state('');
  let foto = $state(null); // captura como data URL (JPEG)
  let enviando = $state(false);
  const sobre = $derived(sobreTexto($estado, { pagina, sub, objeto }));
  const notas = $derived($estado.buzon?.notas || []);

  onMount(() => {
    vaciarCola().then(actualizarBuzon);
    return marcarLeidas; // lo nuevo se ve resaltado mientras la hoja está abierta
  });

  const leer = (blob) => new Promise((ok, mal) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = mal; r.readAsDataURL(blob); });
  async function añadirFoto(ev) {
    const archivo = ev.currentTarget.files?.[0];
    ev.currentTarget.value = '';
    if (!archivo) return;
    try {
      let datos = await leer(await comprimir(archivo, 1400, 0.72));
      if (datos.length > 1_300_000) datos = await leer(await comprimir(archivo, 1000, 0.6));
      foto = datos;
    } catch { avisar('No he podido abrir esa imagen', '⚠️'); }
  }

  async function enviar() {
    if (!texto.trim() || enviando) return;
    enviando = true;
    try {
      const llego = await enviarNota({ tipo, tema, texto, foto, contexto: contextoNota(get(estado), { pagina, sub, objeto }) });
      avisar(llego ? 'Nota enviada: la vemos en la próxima sesión' : 'Sin conexión: la envío en cuanto puedas', '📬');
      texto = ''; foto = null; tipo = null;
    } finally { enviando = false; }
  }

  async function borrar(n) {
    if (!confirm('¿Borrar esta nota?')) return;
    if (!(await borrarNota(n))) avisar('Ya la he visto: no se puede borrar. Dímelo en la próxima sesión', '⚠️');
  }
  const cuando = (ms) => `${fechaCorta(new Date(ms).toISOString().slice(0, 10))} · ${new Date(ms).toTimeString().slice(0, 5)}`;
</script>

<div class="buzon">
  <p class="intro">Cuéntame qué falla, qué cambiarías o qué no te cuadra de la app, la dieta o los entrenos. Lo vemos juntos en la próxima sesión: nada cambia sin tu visto bueno.</p>

  <div class="tarjeta redactar">
    <p class="sobre"><Icono n="map-pin" tam={15} /> <span>Sobre: <b>{sobre}</b></span></p>
    <fieldset class="chips" aria-label="De qué es"><legend>Es de…</legend>
      {#each TEMAS as [v, n] (v)}
        <label class:activo={tema === v}><input type="radio" name="buzon-tema" value={v} bind:group={tema} /> {n}</label>
      {/each}
    </fieldset>
    <fieldset class="chips" aria-label="Qué es"><legend>Es…</legend>
      {#each TIPOS as [v, n] (v)}
        <button type="button" class:activo={tipo === v} aria-pressed={tipo === v} onclick={() => (tipo = tipo === v ? null : v)}>{n}</button>
      {/each}
    </fieldset>
    <label class="campo-texto"><span class="oculto">Tu nota</span>
      <textarea bind:value={texto} rows="4" maxlength="3000" placeholder="Por ejemplo: las cenas me resultan muy grandes"></textarea>
    </label>
    {#if foto}
      <div class="captura">
        <img src={foto} alt="Tu captura" />
        <button class="boton boton-sec boton-peq" onclick={() => (foto = null)}><Icono n="x" tam={16} /> Quitar</button>
      </div>
    {:else}
      <label class="boton boton-sec boton-peq adjuntar"><Icono n="camera" tam={16} /> Añadir captura<input type="file" accept="image/*" hidden onchange={añadirFoto} /></label>
    {/if}
    <button class="boton ancho" disabled={!texto.trim() || enviando} onclick={enviar}><Icono n="send" tam={18} /> {enviando ? 'Enviando…' : 'Enviar'}</button>
  </div>

  {#if notas.length}
    <h3>Tus notas</h3>
    <ul class="notas">
      {#each notas as n (n.id)}
        <li class:nueva={n.leida === false}>
          <div class="n-cab">
            <span class="n-tipo">{NOMBRE_TIPO[n.tipo] || 'Nota'} · {NOMBRE_TEMA[n.tema] || 'App'}</span>
            <span class="n-estado e-{n.estado}">{ESTADO[n.estado] || n.estado}</span>
          </div>
          <p class="n-texto">{n.texto}</p>
          <small class="n-fecha">{cuando(n.creada)}{n.conFoto ? ' · con captura' : ''}</small>
          {#if n.respuesta}<p class="n-resp"><b>Respuesta</b>{n.respuesta}</p>{/if}
          {#if n.estado === 'error' && n.error}<p class="n-error">{n.error}. Se reintentará sola; si sigue igual, dímelo en la próxima sesión.</p>{/if}
          {#if ['pendiente', 'error', 'enviada'].includes(n.estado)}<button class="enlace n-borrar" onclick={() => borrar(n)}><Icono n="trash" tam={15} /> Borrar</button>{/if}
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .intro { margin: 0 0 14px; color: var(--texto-2); font-size: 0.9rem; }
  .redactar { display: grid; gap: 12px; }
  .sobre { display: flex; align-items: center; gap: 6px; margin: 0; font-size: 0.86rem; color: var(--texto-2); }
  .sobre :global(svg) { flex-shrink: 0; color: var(--primario); }
  .sobre b { color: var(--texto); }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; border: 0; margin: 0; padding: 0; }
  .chips legend { width: 100%; margin-bottom: 6px; font-weight: 700; font-size: 0.84rem; }
  .chips label, .chips button { display: inline-flex; align-items: center; min-height: 38px; padding: 0 13px; border-radius: 999px; border: 1px solid var(--borde); background: var(--superficie-2); color: var(--texto); font: inherit; font-weight: 700; font-size: 0.82rem; cursor: pointer; }
  .chips .activo { border-color: var(--primario); background: var(--primario-claro); color: var(--primario-fuerte); }
  .chips input { position: absolute; opacity: 0; pointer-events: none; }
  .campo-texto textarea { width: 100%; min-height: 110px; padding: 12px; border-radius: var(--r-m); border: 1px solid var(--borde); background: var(--superficie-2); color: var(--texto); font: inherit; font-size: max(1rem, 16px); line-height: 1.4; resize: vertical; box-sizing: border-box; }
  .oculto { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
  .adjuntar { justify-self: start; display: inline-flex; align-items: center; gap: 6px; }
  .captura { display: flex; align-items: flex-end; gap: 10px; }
  .captura img { width: 84px; max-height: 150px; object-fit: cover; object-position: top; border-radius: var(--r-s); box-shadow: var(--sombra); }
  .ancho { width: 100%; display: inline-flex; align-items: center; justify-content: center; gap: 8px; }
  h3 { margin: 22px 0 8px; }
  .notas { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
  .notas li { padding: 12px 14px; border-radius: var(--r-l); background: var(--superficie); box-shadow: var(--sombra); }
  .notas li.nueva { box-shadow: 0 0 0 2px var(--primario), var(--sombra); }
  .n-cab { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
  .n-tipo { font-size: 0.78rem; font-weight: 700; color: var(--texto-2); }
  .n-estado { flex-shrink: 0; padding: 3px 9px; border-radius: 999px; font-size: 0.72rem; font-weight: 700; background: var(--superficie-2); color: var(--texto-2); }
  .e-enmarcha { background: var(--amarillo-claro); color: color-mix(in srgb, var(--amarillo) 70%, var(--texto)); }
  .e-hecha { background: var(--primario-claro); color: var(--primario-fuerte); }
  .e-error { background: color-mix(in srgb, var(--peligro) 14%, transparent); color: var(--peligro); }
  .n-texto { margin: 6px 0 2px; white-space: pre-line; }
  .n-fecha { color: var(--texto-3); font-weight: 600; font-size: 0.76rem; }
  .n-resp { display: grid; gap: 2px; margin: 10px 0 0; padding: 10px 12px; border-radius: var(--r-m); background: var(--superficie-2); font-size: 0.9rem; }
  .n-resp b { font-size: 0.76rem; color: var(--primario-fuerte); }
  .n-error { margin: 8px 0 0; color: var(--peligro); font-size: 0.82rem; font-weight: 600; }
  .n-borrar { display: inline-flex; align-items: center; gap: 4px; margin-top: 8px; font-size: 0.82rem; color: var(--texto-3); }
</style>
