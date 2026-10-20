<script>
  import Icono from './Icono.svelte';
  import FotoReceta from './FotoReceta.svelte';
  import ListaIngredientes from './ListaIngredientes.svelte';
  import { recetaPorId } from '../lib/planificador.js';
  import { macrosComida, costeComida, cantidadTexto, alimento, producto } from '../lib/nutricion.js';
  import { euros } from '../lib/formato.js';
  import { abrirHoja } from '../stores/ui.js';
  import { FOTOS_RECETAS } from '../data/fotos.js';

  let { recetaId, ingredientes, titulo = '', diaIdx, franja } = $props();
  const receta = $derived(recetaPorId[recetaId]);
  const tieneFotoReceta = $derived(!!FOTOS_RECETAS[recetaId] && !receta?.sinFoto);
  const m = $derived(macrosComida(ingredientes));
  const ESPECIAS = { sal: 'sal', pimienta: 'pimienta', pimenton: 'pimentón', comino: 'comino', curry: 'curry', oregano: 'orégano', canela: 'canela', perejil: 'perejil', limon: 'limón', ajo_polvo: 'ajo en polvo' };
</script>

<div class="detalle">
  <FotoReceta receta={{ ...receta, ingredientes: ingredientes || receta.ingredientes }} alto={tieneFotoReceta ? 210 : 150} redondeo={24} tamEmoji={110} />
  <h2>{receta.nombre}</h2>
  <p class="sobre">{titulo || receta.tipos.join(' · ')}</p>
  <div class="meta"><span><Icono n="clock" tam={16} /> {receta.tiempo} min</span><span><Icono n="euro" tam={16} /> {euros(costeComida(ingredientes))} por ración</span>{#if receta.batch}<span><Icono n="package" tam={16} /> Aguanta en táper</span>{/if}</div>

  <div class="grandes">
    <div><b>{Math.round(m.kcal)}</b><span>kcal</span></div>
    <div class="p"><b>{Math.round(m.p)} g</b><span>proteína</span></div>
    <div class="c"><b>{Math.round(m.c)} g</b><span>hidratos</span></div>
    <div class="g"><b>{Math.round(m.g)} g</b><span>grasa</span></div>
  </div>

  {#if receta.adaptada}<p class="adaptada"><Icono n="refresh-cw" tam={16} /> Adaptada a ti: {receta.adaptada.join(', ')}.</p>{/if}
  <h3><Icono e="🛒" tam={18} /> Ingredientes <small>(tu ración)</small></h3>
  <ListaIngredientes {ingredientes} enlaces caja />
  {#if receta.especias?.length}<p class="especias"><Icono e="🧂" tam={18} /> <b>Para condimentar:</b> {receta.especias.map((e) => ESPECIAS[e] || e).join(', ')}</p>{/if}

  <h3 class="prep"><Icono e="👨‍🍳" tam={18} /> Preparación {#if receta.pasos?.length && !receta.fuera}<button class="boton boton-peq cocinar" onclick={() => abrirHoja('cocina', { recetaId, ingredientes })}><Icono n="chef-hat" tam={16} /> Modo cocina</button>{/if}</h3>
  <ol class="pasos">
    {#each receta.pasos as p, i (i)}<li>{p}</li>{/each}
  </ol>
  {#if receta.consejo}<p class="consejo"><Icono e="💡" tam={18} /> {receta.consejo}</p>{/if}
  <p class="pie-nota">Fibra: {Math.round(m.f)} g.</p>
  {#if diaIdx !== undefined && franja}
    <button class="boton boton-sec ancho" onclick={() => abrirHoja('alternativas', { diaIdx, franja })}><Icono e="🔄" tam={18} /> Cambiar este plato</button>
  {/if}
</div>

<style>
  .meta { display: flex; flex-wrap: wrap; gap: 4px 16px; }
  .meta span { display: inline-flex; align-items: center; gap: 5px; }
  .sobre { margin: 0 0 6px; font-size: 0.84rem; font-weight: 700; color: var(--primario-fuerte); }
  h2 { margin: 16px 0 2px; font-size: 1.4rem; line-height: 1.2; }
  .meta { color: var(--texto-2); font-weight: 600; font-size: 0.88rem; }
  .grandes { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 16px 0 4px; }
  .grandes div { display: grid; text-align: center; padding: 10px 4px; border-radius: 16px; background: var(--superficie); box-shadow: var(--sombra); }
  .grandes b { font-size: 1.1rem; font-weight: 700; }
  .grandes span { font-size: 0.72rem; font-weight: 700; color: var(--texto-2); }
  .grandes .p { background: var(--coral-claro); } .grandes .c { background: var(--amarillo-claro); } .grandes .g { background: var(--azul-claro); }
  .ancho { width: 100%; margin-top: 12px; }
  .prep { display: flex; align-items: center; gap: 8px; }
  .cocinar { margin-left: auto; }
  .adaptada { display: flex; gap: 8px; align-items: flex-start; padding: 10px 12px; border-radius: 14px; background: var(--superficie-2); font-size: 0.84rem; color: var(--texto-2); }
  .adaptada :global(svg) { color: var(--primario); flex-shrink: 0; margin-top: 2px; }
</style>
