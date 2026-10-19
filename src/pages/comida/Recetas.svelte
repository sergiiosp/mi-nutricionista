<script>
  import FotoReceta from '../../components/FotoReceta.svelte';
  import Icono from '../../components/Icono.svelte';
  import { RECETAS } from '../../data/recetas.js';
  import { adaptarReceta } from '../../lib/sustituciones.js';
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

  const lista = $derived(RECETAS.map((r) => adaptarReceta(r, $estado.perfil)).filter((r) => (todas || recetaPermitida(r, $estado.perfil))
    && (tipo === 'todas' || (tipo === 'rapidas' ? r.tiempo <= 15 : tipo === 'taper' ? r.batch : r.tipos.includes(tipo)))
    && (!texto.trim() || normal(r.nombre).includes(normal(texto.trim())) || r.ingredientes.some((i) => normal(ALIMENTOS[i.a].nombre).includes(normal(texto.trim())))))
    .map((r) => {
      const franja = FRANJA[r.prefiere || r.tipos[0]];
      const ing = racionReceta(r, $estado.perfil, objetivos, franja);
      return { r, ing, m: macrosComida(ing), franja };
    }));
  const FILTROS = [['todas', 'Todas'], ['desayuno', 'Desayunos'], ['comida', 'Comidas'], ['cena', 'Cenas'], ['snack', 'Snacks'], ['rapidas', '≤ 15 min'], ['taper', 'Táper']];
</script>

<div class="buscador-caja">
  <svg class="lupa" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
  <input class="buscador" type="search" enterkeyhint="search" placeholder="Busca receta o ingrediente…" bind:value={texto} aria-label="Buscar recetas" />
</div>
<div class="filtros">
  {#each FILTROS as [id, n] (id)}<button class="filtro" class:activo={tipo === id} onclick={() => (tipo = id)}>{n}</button>{/each}
</div>
<label class="interruptor mini"><input type="checkbox" bind:checked={todas} /><span>Incluir recetas que no encajan con tu perfil</span></label>
<p class="pie-nota">{lista.length} recetas · cantidades para tu ración</p>

<div class="rejilla">
  {#each lista as { r, ing, m, franja } (r.id)}
    <button class="card" onclick={() => abrirHoja('receta', { recetaId: r.id, ingredientes: ing, titulo: `Ración para tu ${franja}` })}>
      <span class="imagen">
        <FotoReceta receta={r} alto={124} redondeo={0} tamEmoji={70} />
        <span class="chips-img"><span class="chip-img"><Icono n="clock" tam={12} grosor={2.4} /> {r.tiempo} min</span>{#if r.batch}<span class="chip-img"><Icono n="package" tam={12} grosor={2.4} /> táper</span>{/if}</span>
      </span>
      <span class="cuerpo">
        <b>{r.nombre}</b>
        <span class="mac"><span class="kcal cifra">{Math.round(m.kcal)} kcal</span><span class="cifra">{Math.round(m.p)} g proteína</span></span>
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
  .card { display: flex; flex-direction: column; padding: 0; border: 0; border-radius: 22px; overflow: hidden; background: var(--superficie); box-shadow: var(--sombra); cursor: pointer; text-align: left; color: var(--texto); transition: transform 0.12s var(--ease-out); }
  @media (hover: hover) and (pointer: fine) { .card:hover { transform: translateY(-2px); } }
  .imagen { position: relative; display: block; }
  .chips-img { position: absolute; left: 8px; top: 8px; display: flex; gap: 4px; }
  .chip-img { display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 999px; background: rgb(10 10 12 / 0.62); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); color: #fff; font-size: 0.68rem; font-weight: 700; }
  .cuerpo { display: grid; gap: 6px; padding: 10px 12px 12px; flex: 1; align-content: space-between; }
  .cuerpo b { font-size: 0.9rem; font-weight: 600; line-height: 1.28; display: -webkit-box; -webkit-line-clamp: 3; line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
  .mac { display: flex; flex-wrap: wrap; gap: 4px 10px; font-size: 0.74rem; font-weight: 600; color: var(--texto-2); }
  .mac .kcal { color: var(--primario-fuerte); font-weight: 800; }
</style>
