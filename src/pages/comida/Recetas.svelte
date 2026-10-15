<script>
  import FotoReceta from '../../components/FotoReceta.svelte';
  import { RECETAS } from '../../data/recetas.js';
  import { ALIMENTOS } from '../../data/alimentos.js';
  import { estado } from '../../stores/estado.js';
  import { abrirHoja } from '../../stores/ui.js';
  import { calcularObjetivos, recetaPermitida, macrosComida } from '../../lib/nutricion.js';
  import { racionReceta } from '../../lib/registro.js';

  let texto = $state('');
  let tipo = $state('todas');
  let todas = $state(false);
  const objetivos = $derived(calcularObjetivos($estado.perfil));
  const FRANJA = { desayuno: 'desayuno', snack: 'merienda', comida: 'comida', cena: 'cena' };
  const normal = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

  const lista = $derived(RECETAS.filter((r) => (todas || recetaPermitida(r, $estado.perfil))
    && (tipo === 'todas' || (tipo === 'rapidas' ? r.tiempo <= 15 : tipo === 'taper' ? r.batch : r.tipos.includes(tipo)))
    && (!texto.trim() || normal(r.nombre).includes(normal(texto.trim())) || r.ingredientes.some((i) => normal(ALIMENTOS[i.a].nombre).includes(normal(texto.trim())))))
    .map((r) => {
      const franja = FRANJA[r.prefiere || r.tipos[0]];
      const ing = racionReceta(r, $estado.perfil, objetivos, franja);
      return { r, ing, m: macrosComida(ing), franja };
    }));
  const FILTROS = [['todas', 'Todas'], ['desayuno', '🍳 Desayunos'], ['comida', '🍲 Comidas'], ['cena', '🌙 Cenas'], ['snack', '🍎 Snacks'], ['rapidas', '⚡ ≤ 15 min'], ['taper', '🥡 Táper']];
</script>

<div class="buscador-caja">
  <svg class="lupa" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
  <input class="buscador" type="search" placeholder="Busca receta o ingrediente…" bind:value={texto} aria-label="Buscar recetas" />
</div>
<div class="filtros">
  {#each FILTROS as [id, n] (id)}<button class="filtro" class:activo={tipo === id} onclick={() => (tipo = id)}>{n}</button>{/each}
</div>
<label class="interruptor mini"><input type="checkbox" bind:checked={todas} /><span>Incluir recetas que no encajan con tu perfil</span></label>
<p class="pie-nota">{lista.length} recetas · cantidades para tu ración</p>

<div class="rejilla">
  {#each lista as { r, ing, m, franja } (r.id)}
    <button class="card" onclick={() => abrirHoja('receta', { recetaId: r.id, ingredientes: ing, titulo: `Ración para tu ${franja}` })}>
      <FotoReceta receta={r} alto={130} redondeo={0} tamEmoji={70} />
      <span class="cuerpo">
        <span class="meta">{r.tiempo} min{r.batch ? ' · 🥡 táper' : ''}</span>
        <b>{r.nombre}</b>
        <span class="mac"><span>{Math.round(m.kcal)} kcal</span><span class="t-p">P {Math.round(m.p)}</span><span class="t-c">H {Math.round(m.c)}</span><span class="t-g">G {Math.round(m.g)}</span></span>
      </span>
    </button>
  {:else}
    <p>No hay recetas con esos filtros.</p>
  {/each}
</div>

<style>
  .buscador-caja { position: relative; margin-bottom: 10px; }
  .lupa { position: absolute; left: 15px; top: 15px; color: var(--texto-2); }
  .buscador { width: 100%; padding-left: 44px; border-color: transparent; box-shadow: var(--sombra); }
  .rejilla { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 10px; margin-top: 8px; }
  .card { display: flex; flex-direction: column; padding: 0; border: 0; border-radius: 22px; overflow: hidden; background: var(--superficie); box-shadow: var(--sombra); cursor: pointer; text-align: left; color: var(--texto); transition: transform 0.12s; }
  .card:hover { transform: translateY(-2px); }
  .cuerpo { display: grid; gap: 3px; padding: 10px 12px 12px; }
  .cuerpo b { font-size: 0.92rem; line-height: 1.25; }
  .meta { font-size: 0.7rem; color: var(--texto-2); font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em; }
  .mac { display: flex; flex-wrap: wrap; gap: 6px; font-size: 0.72rem; font-weight: 800; color: var(--texto-2); }
</style>
