<script>
  import { slide } from 'svelte/transition';
  import FotoReceta from './FotoReceta.svelte';
  import Macros from './Macros.svelte';
  import Emoji from './Emoji.svelte';
  import { recetaPorId } from '../lib/planificador.js';
  import { macrosComida, costeComida, cantidadTexto, alimento } from '../lib/nutricion.js';
  import { marcarHecha, alternarSaltada } from '../lib/acciones.js';
  import { abrirHoja } from '../stores/ui.js';
  import { borrarRegistro } from '../stores/estado.js';
  import { euros } from '../lib/formato.js';

  /** comida: elemento de estadoDia().comidas (o del plan si editable=false) */
  let { comida, fecha, diaIdx, franjaNombre, nota = '', editable = true } = $props();

  const receta = $derived(recetaPorId[comida.recetaId]);
  const m = $derived(macrosComida(comida.ingredientes));
  const situacion = $derived(comida.situacion || 'pendiente');
  let abierta = $state(false);
  const ETQ = { pre: '⚡ Pre-entreno', post: '💪 Post-entreno' };

  function verReceta() {
    abrirHoja('receta', { recetaId: comida.recetaId, ingredientes: comida.ingredientes, titulo: [comida.hora, franjaNombre].filter(Boolean).join(' · '), diaIdx, franja: comida.franja });
  }
</script>

<article class="comida-card s-{situacion}" class:ajustada={comida.ajustada}>
  <div class="fila">
    <button class="miniatura" onclick={verReceta} aria-label="Ver receta">
      <FotoReceta {receta} alto={78} redondeo={18} tamEmoji={44} />
    </button>
    <div class="cuerpo">
      <div class="franja">
        <span>{franjaNombre}</span>
        {#if comida.etiqueta}<span class="etq etq-{comida.etiqueta}">{ETQ[comida.etiqueta]}</span>{/if}
        {#if comida.ajustada && situacion === 'pendiente'}<span class="etq etq-ajuste">🔄 Ajustada</span>{/if}
        {#if nota}<span class="etq etq-nota">🥡 {nota}</span>{/if}
      </div>
      <button class="titulo" onclick={verReceta}>{receta?.nombre}</button>
      <div class="meta">{receta?.tiempo} min · {euros(costeComida(comida.ingredientes))}</div>
      <Macros {m} peque />
    </div>
    {#if editable && fecha && situacion !== 'saltada' && situacion !== 'sustituida'}
      <button class="check" class:activo={situacion === 'hecha'} aria-pressed={situacion === 'hecha'}
        aria-label={situacion === 'hecha' ? 'Desmarcar' : 'Marcar como comida'} onclick={() => marcarHecha(fecha, comida)}>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
      </button>
    {/if}
  </div>

  {#if comida.pasada && editable && fecha}
    <div class="pasada">🕐 ¿Ya la has comido? <button class="enlace" onclick={() => marcarHecha(fecha, comida)}>Sí, márcala</button> · <button class="enlace" onclick={() => alternarSaltada(fecha, comida.franja)}>No, me la salté</button></div>
  {/if}
  {#if situacion === 'saltada'}
    <div class="estado-linea">⏭️ Te la has saltado. <button class="enlace" onclick={() => alternarSaltada(fecha, comida.franja)}>Deshacer</button></div>
  {:else if situacion === 'sustituida'}
    <div class="estado-linea">🔁 Comiste otra cosa:</div>
    {#each comida.otros as r (r.id)}
      <div class="otro">
        <Emoji e={r.emoji || '🍽️'} tam={22} />
        <span class="otro-nombre">{r.nombre}{#if r.cantidad?.texto}<small>{' · '}{r.cantidad.texto}</small>{/if}</span>
        <span class="otro-kcal">{Math.round(r.macros.kcal)} kcal</span>
        <button class="borrar" aria-label="Borrar" onclick={() => borrarRegistro(fecha, r.id)}>✕</button>
      </div>
    {/each}
  {/if}

  {#if abierta}
    <ul class="ingredientes" transition:slide={{ duration: 180 }}>
      {#each comida.ingredientes as i (i.a)}
        <li>
          <span class="ing-cant">{cantidadTexto(i.a, i.g)}</span>
          <span>{alimento(i.a).nombre}
            {#if comida.ajustada && comida.ingredientesOriginales}
              {@const antes = comida.ingredientesOriginales.find((x) => x.a === i.a)?.g}
              {#if antes && Math.abs(antes - i.g) >= 5}<small class="antes">antes {cantidadTexto(i.a, antes)}</small>{/if}
            {/if}
          </span>
        </li>
      {/each}
    </ul>
  {/if}

  {#if editable && fecha && situacion === 'pendiente'}
    <footer class="acciones">
      <button onclick={() => (abierta = !abierta)}>🧾 {abierta ? 'Ocultar' : 'Cantidades'}</button>
      <button onclick={() => abrirHoja('alternativas', { diaIdx, franja: comida.franja })}>🔄 Cambiar</button>
      <button onclick={() => abrirHoja('registrar', { fecha, franja: comida.franja })}>🍽️ Comí otra cosa</button>
      <button onclick={() => alternarSaltada(fecha, comida.franja)}>⏭️ Saltar</button>
    </footer>
  {:else if !editable || !fecha}
    <footer class="acciones">
      <button onclick={() => (abierta = !abierta)}>🧾 {abierta ? 'Ocultar' : 'Cantidades'}</button>
      {#if diaIdx !== undefined}<button onclick={() => abrirHoja('alternativas', { diaIdx, franja: comida.franja })}>🔄 Cambiar</button>{/if}
    </footer>
  {/if}
</article>

<style>
  .comida-card { background: var(--superficie); border-radius: var(--radio); padding: 12px; box-shadow: var(--sombra); transition: opacity 0.2s, background 0.2s; }
  .comida-card.ajustada.s-pendiente { box-shadow: var(--sombra), inset 0 0 0 2px var(--lila-claro); }
  .fila { position: relative; display: flex; gap: 12px; align-items: flex-start; }
  .miniatura { padding: 0; border: 0; background: none; cursor: pointer; width: 78px; flex-shrink: 0; }
  .cuerpo { flex: 1; min-width: 0; padding-right: 40px; display: grid; gap: 2px; }
  .franja { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; font-size: 0.72rem; font-weight: 900; text-transform: uppercase; letter-spacing: 0.06em; color: var(--texto-2); }
  .franja .etq { text-transform: none; letter-spacing: 0; }
  .etq-ajuste { background: var(--lila-claro); color: var(--lila); }
  .titulo { padding: 0; border: 0; background: none; text-align: left; font-weight: 800; font-size: 1rem; line-height: 1.25; cursor: pointer; color: var(--texto); }
  .meta { font-size: 0.8rem; color: var(--texto-2); font-weight: 600; }
  .check { position: absolute; right: 0; top: 0; width: 38px; height: 38px; border-radius: 50%; border: 2px solid var(--borde); background: var(--superficie); color: transparent; display: grid; place-items: center; cursor: pointer; transition: all 0.2s; }
  .check:hover { border-color: var(--primario); color: var(--primario); }
  .check.activo { background: var(--primario); border-color: var(--primario); color: #fff; transform: scale(1.05); }
  .s-hecha { background: color-mix(in srgb, var(--superficie) 75%, var(--primario-claro)); }
  .s-hecha .titulo { text-decoration: line-through; text-decoration-color: var(--primario); text-decoration-thickness: 2px; opacity: 0.7; }
  .s-saltada, .s-sustituida { background: color-mix(in srgb, var(--superficie) 70%, var(--fondo)); }
  .s-saltada .fila, .s-sustituida .fila { opacity: 0.55; }
  .pasada { margin-top: 10px; padding: 8px 12px; border-radius: 12px; background: var(--amarillo-claro); font-size: 0.84rem; font-weight: 700; }
  .estado-linea { margin-top: 10px; font-size: 0.88rem; font-weight: 700; color: var(--texto-2); }
  .otro { display: flex; align-items: center; gap: 8px; margin-top: 6px; padding: 8px 10px; border-radius: 12px; background: var(--superficie-2); font-size: 0.88rem; font-weight: 700; }
  .otro-nombre { flex: 1; min-width: 0; }
  .otro-nombre small { color: var(--texto-2); font-weight: 600; }
  .otro-kcal { color: var(--texto-2); white-space: nowrap; }
  .borrar { border: 0; background: none; color: var(--texto-2); cursor: pointer; font-size: 0.9rem; padding: 4px; }
  .ingredientes { margin-top: 10px; }
  .antes { display: block; color: var(--lila); font-weight: 700; }
  .acciones { display: flex; gap: 6px; margin-top: 10px; overflow-x: auto; scrollbar-width: none; }
  .acciones::-webkit-scrollbar { display: none; }
  .acciones button { flex-shrink: 0; padding: 7px 11px; border-radius: 12px; border: 0; background: var(--superficie-2); font-weight: 800; font-size: 0.8rem; cursor: pointer; color: var(--texto); }
  .acciones button:hover { background: var(--primario-claro); color: var(--primario-fuerte); }
</style>
