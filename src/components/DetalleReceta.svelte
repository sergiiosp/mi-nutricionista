<script>
  import Icono from './Icono.svelte';
  import FotoReceta from './FotoReceta.svelte';
  import { recetaPorId } from '../lib/planificador.js';
  import { macrosComida, costeComida, cantidadTexto, alimento, producto } from '../lib/nutricion.js';
  import { euros } from '../lib/formato.js';
  import { abrirHoja } from '../stores/ui.js';

  let { recetaId, ingredientes, titulo = '', diaIdx, franja } = $props();
  const receta = $derived(recetaPorId[recetaId]);
  const m = $derived(macrosComida(ingredientes));
  const ESPECIAS = { sal: 'sal', pimienta: 'pimienta', pimenton: 'pimentón', comino: 'comino', curry: 'curry', oregano: 'orégano', canela: 'canela', perejil: 'perejil', limon: 'limón', ajo_polvo: 'ajo en polvo' };
</script>

<div class="detalle">
  <FotoReceta {receta} alto={210} redondeo={24} tamEmoji={110} />
  <p class="sobre">{titulo || receta.tipos.join(' · ')}</p>
  <h2>{receta.nombre}</h2>
  <div class="meta"><Icono e="⏱️" tam={18} /> {receta.tiempo} min · {euros(costeComida(ingredientes))} por ración{#if receta.batch} · 🥡 aguanta en táper{/if}</div>

  <div class="grandes">
    <div><b>{Math.round(m.kcal)}</b><span>kcal</span></div>
    <div class="p"><b>{Math.round(m.p)} g</b><span>proteína</span></div>
    <div class="c"><b>{Math.round(m.c)} g</b><span>hidratos</span></div>
    <div class="g"><b>{Math.round(m.g)} g</b><span>grasa</span></div>
  </div>

  <h3><Icono e="🛒" tam={18} /> Ingredientes <small>(tu ración)</small></h3>
  <ul class="ingredientes caja">
    {#each ingredientes as i (i.a)}
      {@const p = producto(i.a)}
      <li>
        <span class="ing-cant">{cantidadTexto(i.a, i.g)}</span>
        <span>{#if p}<a href={p.url} target="_blank" rel="noopener">{alimento(i.a).nombre}</a>{:else}{alimento(i.a).nombre}{/if}</span>
      </li>
    {/each}
  </ul>
  {#if receta.especias?.length}<p class="especias"><Icono e="🧂" tam={18} /> <b>Para condimentar:</b> {receta.especias.map((e) => ESPECIAS[e] || e).join(', ')}</p>{/if}

  <h3><Icono e="👨‍🍳" tam={18} /> Preparación</h3>
  <ol class="pasos">
    {#each receta.pasos as p, i (i)}<li>{p}</li>{/each}
  </ol>
  {#if receta.consejo}<p class="consejo"><Icono e="💡" tam={18} /> {receta.consejo}</p>{/if}
  <p class="pie-nota">Fibra: {Math.round(m.f)} g. Pesos en crudo; legumbres y conservas, escurridas.</p>
  {#if diaIdx !== undefined && franja}
    <button class="boton boton-sec ancho" onclick={() => abrirHoja('alternativas', { diaIdx, franja })}><Icono e="🔄" tam={18} /> Cambiar este plato</button>
  {/if}
</div>

<style>
  .sobre { margin: 14px 0 0; font-size: 0.74rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; color: var(--primario-fuerte); }
  h2 { margin: 2px 0 4px; font-size: 1.4rem; }
  .meta { color: var(--texto-2); font-weight: 600; font-size: 0.88rem; }
  .grandes { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 16px 0 4px; }
  .grandes div { display: grid; text-align: center; padding: 10px 4px; border-radius: 16px; background: var(--superficie); box-shadow: var(--sombra); }
  .grandes b { font-size: 1.1rem; font-weight: 800; }
  .grandes span { font-size: 0.72rem; font-weight: 700; color: var(--texto-2); }
  .grandes .p { background: var(--coral-claro); } .grandes .c { background: var(--amarillo-claro); } .grandes .g { background: var(--azul-claro); }
  .caja { background: var(--superficie); padding: 14px; border-radius: var(--radio-s); box-shadow: var(--sombra); }
  .ancho { width: 100%; margin-top: 12px; }
</style>
