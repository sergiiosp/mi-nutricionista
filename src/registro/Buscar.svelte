<script>
  // Buscador único: alimentos, recetas, comidas propias, productos escaneados y Open Food Facts
  import { get } from 'svelte/store';
  import Emoji from '../components/Emoji.svelte';
  import ElegirAlimento from '../components/ElegirAlimento.svelte';
  import { adaptarReceta } from '../lib/sustituciones.js';
  import { ALIMENTOS } from '../data/alimentos.js';
  import { RECETAS } from '../data/recetas.js';
  import { estado } from '../stores/estado.js';
  import { emojiAlimento } from '../lib/registro.js';
  import { alimentoPermitido } from '../lib/nutricion.js';
  import { buscar as buscarOFF } from '../lib/off.js';
  import { coincide, normal, textoAlimento } from '../lib/buscar.js';

  let { onelegir } = $props();
  const e = get(estado);
  let texto = $state('');
  let online = $state([]);
  let cargando = $state(false);
  let errorOnline = $state('');
  let entrada;


  const locales = $derived.by(() => {
    const q = normal(texto.trim());
    if (q.length < 1) return [];
    const orden = (a) => (normal(a.nombre).startsWith(q) ? 0 : normal(a.nombre).includes(q) ? 1 : 2) + (a.catalogo ? 0.5 : 0);
    const alimentos = Object.entries(ALIMENTOS)
      .filter(([id, a]) => coincide(textoAlimento(a), q) && alimentoPermitido(id, e.perfil))
      .sort(([, a], [, b]) => orden(a) - orden(b))
      .slice(0, 20)
      .map(([id, a]) => ({ clave: `a:${id}`, item: { tipo: 'alimento', id }, nombre: a.nombre, sub: `${a.kcal} kcal · P ${a.p} g por 100 ${a.medida || 'g'}`, emoji: emojiAlimento(id) }));
    const recetas = RECETAS.map((r) => adaptarReceta(r, e.perfil)).filter((r) => coincide(r.nombre, q)).slice(0, 5)
      .map((r) => ({ clave: `r:${r.id}`, item: { tipo: 'receta', receta: r }, nombre: r.nombre, sub: 'Receta · ración ajustada a ti', emoji: r.emoji }));
    const propias = e.propias.filter((p) => coincide(p.nombre, q))
      .map((p) => ({ clave: `p:${p.id}`, item: { tipo: 'propia', propia: p }, nombre: p.nombre, sub: `Mi comida · ${Math.round(p.macros.kcal)} kcal la ración`, emoji: p.emoji || '🍱' }));
    const productos = Object.values(e.productos).filter((p) => coincide(`${p.nombre} ${p.marca}`, q)).slice(0, 5)
      .map((p) => ({ clave: `o:${p.id}`, item: { tipo: 'producto', producto: p }, nombre: p.nombre, sub: `${p.marca || 'Producto'} · ${Math.round(p.por100.kcal)} kcal/100 g`, imagen: p.imagen }));
    return [...propias, ...alimentos, ...recetas, ...productos];
  });

  // Productos envasados de internet (Open Food Facts): solo si los pides, porque a veces tarda
  let buscado = $state('');
  function alEscribir() {
    online = [];
    errorOnline = '';
    buscado = '';
  }
  async function buscarFuera() {
    const q = texto.trim();
    buscado = q;
    cargando = true;
    errorOnline = '';
    try {
      const res = await buscarOFF(q);
      if (texto.trim() === q) online = res.slice(0, 12);
    } catch {
      errorOnline = 'El buscador de productos de internet no responde ahora mismo. Prueba en un rato o escanea el código de barras.';
    } finally {
      cargando = false;
    }
  }

</script>

<div class="buscador-caja">
  <svg class="lupa" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
  <input bind:this={entrada} bind:value={texto} oninput={alEscribir} type="search" enterkeyhint="search" placeholder="Pollo, yogur, macarrones, Hacendado…" aria-label="Buscar alimento" />
</div>

{#if !texto.trim()}
  <ElegirAlimento conBuscador={false} onelegir={(id) => onelegir?.({ tipo: 'alimento', id })} />
{/if}

{#if locales.length}
  <h3 class="grupo">En la app</h3>
  <ul class="resultados">
    {#each locales as r (r.clave)}
      <li><button onclick={() => onelegir?.(r.item)}>
        {#if r.imagen}<img src={r.imagen} alt="" />{:else}<span class="ic"><Emoji e={r.emoji} tam={30} /></span>{/if}
        <span class="txt"><b>{r.nombre}</b><small>{r.sub}</small></span>
        <span class="mas">+</span>
      </button></li>
    {/each}
  </ul>
{/if}

{#if texto.trim() && !locales.length}
  <p class="pie-nota centro">Nada con ese nombre en la app.</p>
{/if}
{#if texto.trim().length >= 3 && buscado !== texto.trim()}
  <button class="boton boton-sec ancho" onclick={buscarFuera}>Buscar «{texto.trim()}» en productos envasados</button>
  <p class="pie-nota centro">Miles de productos de supermercado (Open Food Facts). Tarda unos segundos.</p>
{:else if buscado}
  <h3 class="grupo">Productos envasados {#if cargando}<small>· buscando, puede tardar unos segundos…</small>{/if}</h3>
  {#if errorOnline}<p class="pie-nota">{errorOnline}</p>{/if}
  <ul class="resultados">
    {#each online as p (p.id)}
      <li><button onclick={() => onelegir?.({ tipo: 'producto', producto: p })}>
        {#if p.imagen}<img src={p.imagen} alt="" loading="lazy" />{:else}<span class="ic"><Emoji e="🛒" tam={28} /></span>{/if}
        <span class="txt"><b>{p.nombre}</b><small>{p.marca ? `${p.marca} · ` : ''}{Math.round(p.por100.kcal)} kcal · P {Math.round(p.por100.p)} g /100 g</small></span>
        <span class="mas">+</span>
      </button></li>
    {:else}
      {#if !cargando && !errorOnline}<p class="pie-nota">Sin resultados de productos.</p>{/if}
    {/each}
  </ul>
{/if}

<style>
  .buscador-caja { position: sticky; top: 0; z-index: 2; padding-bottom: 8px; background: var(--fondo); }
  .lupa { position: absolute; left: 15px; top: 15px; color: var(--texto-2); }
  input { width: 100%; min-height: 50px; padding: 11px 14px 11px 44px; border-radius: var(--r-m); border: 0; background: var(--superficie); box-shadow: var(--sombra); font-weight: 700; color: var(--texto); }
  input:focus { outline: 2px solid var(--primario); }
  .centro { text-align: center; }
  .ancho { width: 100%; margin-top: 14px; }
  .grupo { font-size: 0.78rem; color: var(--texto-2); margin: 14px 4px 6px; }
  .grupo small { text-transform: none; letter-spacing: 0; font-weight: 600; }
  .resultados { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
  .resultados button { width: 100%; display: flex; align-items: center; gap: 12px; padding: 8px 12px 8px 8px; border: 0; border-radius: var(--r-m); background: var(--superficie); box-shadow: var(--sombra); text-align: left; cursor: pointer; color: var(--texto); }
  @media (hover: hover) and (pointer: fine) { .resultados button:hover { box-shadow: var(--sombra), inset 0 0 0 2px var(--primario); } }
  .resultados img, .ic { width: 46px; height: 46px; border-radius: var(--r-s); object-fit: contain; background: #fff; flex-shrink: 0; display: grid; place-items: center; }
  .ic { background: var(--superficie-2); }
  .txt { flex: 1; min-width: 0; display: grid; }
  .txt b { font-size: 0.94rem; line-height: 1.25; }
  .txt small { color: var(--texto-2); font-weight: 600; font-size: 0.78rem; }
  .mas { width: 30px; height: 30px; border-radius: 50%; display: grid; place-items: center; background: var(--primario-claro); color: var(--primario-fuerte); font-weight: 700; font-size: 1.2rem; flex-shrink: 0; }
</style>
