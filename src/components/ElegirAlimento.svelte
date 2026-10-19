<script>
  // Elegir un alimento de la app: se ve la lista desde el principio, por grupos, y se filtra al escribir.
  import { get } from 'svelte/store';
  import Emoji from './Emoji.svelte';
  import { ALIMENTOS } from '../data/alimentos.js';
  import { estado } from '../stores/estado.js';
  import { alimentoPermitido } from '../lib/nutricion.js';
  import { emojiAlimento } from '../lib/registro.js';
  import { coincide, normal, textoAlimento } from '../lib/buscar.js';

  let { onelegir, excluir = [], texto = $bindable(''), conBuscador = true, max = 60 } = $props();
  const perfil = get(estado).perfil || {};
  const GRUPOS = [['todo', 'Todo'], ['proteina', 'Proteína'], ['hidrato', 'Hidratos'], ['lacteo', 'Lácteos y bebidas'], ['fruta', 'Fruta'], ['verdura', 'Verdura'], ['grasa', 'Grasas y frutos secos'], ['otros', 'Otros']];
  let grupo = $state('todo');

  const todos = Object.entries(ALIMENTOS)
    .filter(([id]) => alimentoPermitido(id, perfil))
    .map(([id, a]) => ({ id, a, n: normal(a.nombre), t: textoAlimento(a) }))
    .sort((x, y) => x.a.nombre.localeCompare(y.a.nombre));

  // Primero lo que empieza por lo que escribes, luego lo que lo contiene; los básicos antes que el catálogo
  const orden = (x, q) => (x.n.startsWith(q) ? 0 : x.n.includes(q) ? 1 : 2) + (x.a.catalogo ? 0.5 : 0);
  const lista = $derived.by(() => {
    const q = normal(texto.trim());
    const base = todos.filter((x) => !excluir.includes(x.id));
    if (!q) return base.filter((x) => grupo === 'todo' || x.a.grupo === grupo).slice(0, max);
    return base.filter((x) => coincide(x.t, q)).sort((x, y) => orden(x, q) - orden(y, q)).slice(0, max);
  });
  const unidad = (a) => a.medida || 'g';
</script>

{#if conBuscador}
  <div class="buscador-caja">
    <svg class="lupa" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
    <input bind:value={texto} type="search" enterkeyhint="search" placeholder="Pollo, avena, lomo, tortitas…" aria-label="Buscar alimento" />
  </div>
{/if}
{#if !texto.trim()}
  <div class="grupos" role="tablist" aria-label="Grupos de alimentos">
    {#each GRUPOS as [g, n] (g)}
      <button role="tab" aria-selected={grupo === g} class:activo={grupo === g} onclick={() => (grupo = g)}>{n}</button>
    {/each}
  </div>
{/if}
<ul class="resultados">
  {#each lista as x (x.id)}
    <li><button onclick={() => onelegir?.(x.id)}>
      <span class="ic"><Emoji e={emojiAlimento(x.id)} tam={24} /></span>
      <span class="txt"><b>{x.a.nombre}</b><small>{x.a.kcal} kcal · P {x.a.p} g · H {x.a.c} g · G {x.a.g} g por 100 {unidad(x.a)}</small></span>
      <span class="mas">+</span>
    </button></li>
  {:else}
    <p class="pie-nota">No hay ningún alimento de la app con ese nombre.</p>
  {/each}
</ul>

<style>
  .buscador-caja { position: sticky; top: 0; z-index: 2; padding-bottom: 8px; background: var(--fondo); }
  .lupa { position: absolute; left: 15px; top: 15px; color: var(--texto-2); }
  input { width: 100%; min-height: 50px; padding: 11px 14px 11px 44px; border-radius: 16px; border: 0; background: var(--superficie); box-shadow: var(--sombra); font-weight: 700; color: var(--texto); }
  input:focus { outline: 2px solid var(--primario); }
  .grupos { display: flex; gap: 6px; overflow-x: auto; scrollbar-width: none; padding: 2px 0 10px; }
  .grupos::-webkit-scrollbar { display: none; }
  .grupos button { flex-shrink: 0; min-height: 40px; padding: 0 14px; border-radius: 999px; border: 1px solid var(--borde); background: var(--superficie); color: var(--texto-2); font-weight: 700; font-size: 0.82rem; cursor: pointer; }
  .grupos button.activo { border-color: var(--primario); background: var(--primario-claro); color: var(--primario-fuerte); }
  .resultados { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
  .resultados button { width: 100%; display: flex; align-items: center; gap: 12px; padding: 8px 12px 8px 8px; border: 0; border-radius: 16px; background: var(--superficie); box-shadow: var(--sombra); text-align: left; cursor: pointer; color: var(--texto); }
  .ic { width: 42px; height: 42px; border-radius: 12px; background: var(--superficie-2); flex-shrink: 0; display: grid; place-items: center; }
  .txt { flex: 1; min-width: 0; display: grid; }
  .txt b { font-size: 0.92rem; line-height: 1.25; }
  .txt small { color: var(--texto-2); font-weight: 600; font-size: 0.74rem; }
  .mas { width: 30px; height: 30px; border-radius: 50%; display: grid; place-items: center; background: var(--primario-claro); color: var(--primario-fuerte); font-weight: 800; font-size: 1.2rem; flex-shrink: 0; }
</style>
