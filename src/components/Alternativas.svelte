<script>
  // Elegir comida: opciones que ya cuadran tus macros (favoritas, recetario e ideas nuevas)
  // o montarla tú con los ingredientes que quieras; la app calcula las cantidades.
  import { get } from 'svelte/store';
  import Icono from './Icono.svelte';
  import FotoReceta from './FotoReceta.svelte';
  import Macros from './Macros.svelte';
  import Segmentos from './Segmentos.svelte';
  import { estado } from '../stores/estado.js';
  import { cerrarHoja, avisar } from '../stores/ui.js';
  import { alternativas, recetaPorId, objetivoComida } from '../lib/planificador.js';
  import { objetivosActuales, sustituirComida, alternarFavorita } from '../lib/acciones.js';
  import { proveedorDe } from '../lib/hyrox/index.js';
  import { proponerCombos, montarCombo, gruposPermitidos, familiaDe, esCombo, textoIngrediente } from '../lib/combos.js';
  import { macrosComida } from '../lib/nutricion.js';

  let { diaIdx, franja } = $props();
  const e = get(estado);
  const actual = e.plan.dias[diaIdx]?.comidas.find((c) => c.franja === franja);
  const info = objetivoComida(e.plan, diaIdx, franja, e.perfil, objetivosActuales(), proveedorDe(e));
  const obj = info?.obj;
  const fam = familiaDe(info?.franja.tipo);
  const favoritas = $derived($estado.favoritas || []);

  let pestaña = $state(actual && esCombo(actual.recetaId) ? 'montar' : 'opciones');

  // ── Opciones ───────────────────────────────────────────────────────────
  const recetas = alternativas(e.plan, diaIdx, franja, e.perfil, objetivosActuales(), proveedorDe(e), e.favoritas || []);
  const deFavoritas = $derived(recetas.filter((a) => favoritas.includes(a.comida.recetaId)));
  const delRecetario = $derived(recetas.filter((a) => !favoritas.includes(a.comida.recetaId) && !esCombo(a.comida.recetaId)).slice(0, 6));
  let semilla = $state(Math.floor(Math.random() * 1e6));
  const ideas = $derived(obj ? proponerCombos(e.perfil, fam, obj, { n: 4, semilla, excluir: [actual?.recetaId, ...favoritas] }) : []);

  function elegir(recetaId, ingredientes) {
    sustituirComida(diaIdx, franja, { franja, recetaId, ingredientes, hora: actual?.hora, etiqueta: actual?.etiqueta });
    cerrarHoja();
    avisar('Comida cambiada: cantidades ajustadas a tus macros', '✅');
  }
  function favorita(id) {
    const guardada = alternarFavorita(id);
    avisar(guardada ? 'Guardada en favoritas: saldrá en tus menús' : 'Quitada de favoritas', guardada ? '⭐' : '🗑️');
  }

  // ── Montar la mía ──────────────────────────────────────────────────────
  const grupos = gruposPermitidos(fam, e.perfil);
  let sel = $state(actual && esCombo(actual.recetaId) ? recetaPorId[actual.recetaId].ingredientes.map((i) => i.a) : []);
  const montado = $derived(sel.length && obj ? montarCombo(fam, sel, obj) : null);

  function alternar(g, id) {
    if (sel.includes(id)) { sel = sel.filter((x) => x !== id); return; }
    const delGrupo = sel.filter((x) => g.items.some(([i]) => i === x));
    // Si el grupo está lleno, el nuevo sustituye al primero que elegiste
    const fuera = delGrupo.length >= g.maximo ? delGrupo[0] : null;
    sel = [...sel.filter((x) => x !== fuera), id];
  }
  const pct = (v, o) => Math.min(100, (v / Math.max(o, 1)) * 100);
</script>

{#if obj}
  <p class="objetivo">Esta comida: <b>{Math.round(obj.kcal)} kcal</b> y <b>{Math.round(obj.p)} g de proteína</b>. Todo lo que elijas se ajusta a eso.</p>
{/if}

<Segmentos opciones={[{ id: 'opciones', nombre: 'Opciones', icono: 'list' }, { id: 'montar', nombre: 'Montar la mía', icono: 'chef-hat' }]} bind:valor={pestaña} />

{#snippet fila(recetaId, ingredientes, nota)}
  {@const r = recetaPorId[recetaId]}
  {@const m = macrosComida(ingredientes)}
  <div class="fila">
    <button class="elegir" onclick={() => elegir(recetaId, ingredientes)}>
      <FotoReceta receta={r} alto={56} redondeo={14} tamEmoji={34} />
      <span class="info">
        <b>{r.nombre}</b>
        {#if r.combo}<small>{ingredientes.map((i) => textoIngrediente(r.familia, i.a, i.g)).join(', ')}</small>{/if}
        <Macros {m} peque />
        {#if nota}<small class="nota">{nota}</small>{/if}
      </span>
    </button>
    <button class="estrella" class:activa={favoritas.includes(recetaId)} aria-pressed={favoritas.includes(recetaId)}
      aria-label={favoritas.includes(recetaId) ? 'Quitar de favoritas' : 'Guardar en favoritas'} onclick={() => favorita(recetaId)}>
      <Icono n="star" tam={18} grosor={2} />
    </button>
  </div>
{/snippet}

{#if pestaña === 'opciones'}
  {#if deFavoritas.length}
    <h3>Tus favoritas</h3>
    <div class="lista">{#each deFavoritas as a (a.comida.recetaId)}{@render fila(a.comida.recetaId, a.comida.ingredientes)}{/each}</div>
  {/if}

  <div class="cab-ideas">
    <h3>Ideas con productos de Mercadona</h3>
    <button class="boton-texto" onclick={() => (semilla += 1)}><Icono n="refresh-cw" tam={14} /> Otras</button>
  </div>
  <div class="lista">{#each ideas as x (x.receta.id)}{@render fila(x.receta.id, x.ingredientes)}{/each}</div>

  <h3>Del recetario</h3>
  <div class="lista">
    {#each delRecetario as a (a.comida.recetaId)}{@render fila(a.comida.recetaId, a.comida.ingredientes, a.usos ? `Ya sale ${a.usos} ${a.usos === 1 ? 'vez' : 'veces'} esta semana` : '')}{/each}
  </div>
  <p class="pie-nota">Toca la estrella para guardar una comida en favoritas: el menú la usará a menudo.</p>
{:else}
  {#each grupos as g (g.id)}
    {#if g.items.length}
      <div class="grupo">
        <div class="g-cab"><Icono n={g.icono} tam={16} /> <b>{g.nombre}</b><small>{g.maximo === 1 ? 'elige una' : `hasta ${g.maximo}`}</small></div>
        <div class="chips">
          {#each g.items as [id, corto] (id)}
            <button class="chip-montar" class:activo={sel.includes(id)} aria-pressed={sel.includes(id)} onclick={() => alternar(g, id)}>{corto}</button>
          {/each}
        </div>
      </div>
    {/if}
  {/each}

  {#if montado}
    <h3>Tu {fam === 'd' ? 'desayuno o tentempié' : 'plato'}</h3>
    <p class="r-nombre">{montado.receta.nombre}</p>
    <ul class="r-items">{#each montado.ingredientes as i (i.a)}<li>{textoIngrediente(fam, i.a, i.g)}</li>{/each}</ul>
    {#each montado.avisos as a (a.texto)}<p class="aviso-montar"><Icono n="info" tam={15} /> {a.texto}</p>{/each}
  {/if}

  <div class="resultado">
    {#if montado}
      <div class="r-macros">
        {#each [['Energía', 'kcal', ''], ['Proteína', 'p', ' g'], ['Hidratos', 'c', ' g'], ['Grasa', 'g', ' g']] as [n, k, u] (k)}
          <div class="rm rm-{k}">
            <span>{n}</span>
            <b>{Math.round(montado.macros[k])}<small>/{Math.round(obj[k])}{u}</small></b>
            <div class="pista"><div class="relleno" style="width:{pct(montado.macros[k], obj[k])}%"></div></div>
          </div>
        {/each}
      </div>
      <div class="r-acciones">
        <button class="boton" onclick={() => elegir(montado.receta.id, montado.ingredientes)}>Usar en esta comida</button>
        <button class="boton boton-sec estrella-btn" class:activa={favoritas.includes(montado.receta.id)} onclick={() => favorita(montado.receta.id)}
          aria-label={favoritas.includes(montado.receta.id) ? 'Quitar de favoritas' : 'Guardar en favoritas'}><Icono n="star" tam={18} /></button>
      </div>
    {:else}
      <p>Elige ingredientes de cada grupo y te digo cuánto poner de cada uno.</p>
    {/if}
  </div>
{/if}

<style>
  .objetivo { margin: 0 0 12px; font-size: 0.86rem; color: var(--texto-2); }
  .objetivo b { color: var(--texto); }
  h3 { margin: 18px 0 8px; font-size: 0.95rem; }
  .cab-ideas { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  .cab-ideas h3 { margin-bottom: 8px; }
  .lista { display: grid; }
  .fila { display: flex; align-items: center; gap: 6px; border-bottom: 1px solid var(--linea); }
  .elegir { flex: 1; min-width: 0; display: grid; grid-template-columns: 56px 1fr; gap: 12px; align-items: center; padding: 10px 0; border: 0; background: none; text-align: left; cursor: pointer; color: var(--texto); }
  .info { display: grid; gap: 2px; min-width: 0; }
  .info b { font-weight: 600; font-size: 0.92rem; line-height: 1.3; }
  .info small { color: var(--texto-2); font-size: 0.76rem; line-height: 1.35; }
  .info .nota { color: var(--texto-3); }
  .estrella { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 50%; border: 0; background: none; color: var(--texto-3); cursor: pointer; flex-shrink: 0; }
  .estrella.activa, .estrella-btn.activa { color: var(--amarillo); }
  .estrella.activa :global(.icono), .estrella-btn.activa :global(.icono) { fill: currentColor; }
  .grupo { margin: 4px 0 14px; }
  .g-cab { display: flex; align-items: center; gap: 6px; margin-bottom: 8px; color: var(--primario); }
  .g-cab b { color: var(--texto); font-size: 0.92rem; }
  .g-cab small { margin-left: auto; color: var(--texto-3); font-size: 0.76rem; }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .chip-montar { padding: 7px 12px; border-radius: 999px; border: 1px solid var(--borde); background: var(--superficie); color: var(--texto-2); font-weight: 600; font-size: 0.8rem; cursor: pointer; transition: background 0.15s, color 0.15s, border-color 0.15s; }
  .chip-montar.activo { background: var(--primario); border-color: var(--primario); color: var(--sobre-primario); }
  .resultado { position: sticky; bottom: 0; margin-top: 12px; padding: 12px 14px; border-radius: 20px; background: color-mix(in srgb, var(--superficie-2) 92%, transparent); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); box-shadow: 0 -10px 30px rgb(0 0 0 / 0.35); }
  .resultado p { margin: 0; color: var(--texto-2); font-size: 0.86rem; }
  .r-nombre { margin: 0 0 6px; font-weight: 600; font-size: 0.92rem; }
  .r-items { list-style: none; margin: 0 0 6px; padding: 0; display: grid; gap: 3px; font-size: 0.86rem; color: var(--texto-2); }
  .r-macros { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
  .rm { display: grid; gap: 1px; font-size: 0.72rem; color: var(--texto-2); }
  .rm b { font-size: 0.9rem; color: var(--texto); font-variant-numeric: tabular-nums; }
  .rm small { font-size: 0.68rem; color: var(--texto-3); font-weight: 600; }
  .pista { height: 4px; border-radius: 999px; background: var(--superficie-3); overflow: hidden; margin-top: 3px; }
  .relleno { height: 100%; border-radius: 999px; background: var(--primario); transition: width 0.3s; }
  .rm-p .relleno { background: var(--coral); } .rm-c .relleno { background: var(--amarillo); } .rm-g .relleno { background: var(--azul); }
  .aviso-montar { display: flex; gap: 6px; align-items: flex-start; margin: 10px 0 0; font-size: 0.8rem; color: var(--aviso-texto); }
  .r-acciones { display: flex; gap: 8px; margin-top: 10px; }
  .r-acciones .boton:first-child { flex: 1; }
  .estrella-btn { width: 50px; padding: 0; }
</style>
