<script>
  import Icono from '../components/Icono.svelte';
  // Comidas propias: lista y creación (por ingredientes o con los macros a mano)
  import { get } from 'svelte/store';
  import Emoji from '../components/Emoji.svelte';
  import Macros from '../components/Macros.svelte';
  import { ALIMENTOS } from '../data/alimentos.js';
  import { estado, actualizar, nuevoId } from '../stores/estado.js';
  import { macrosComida, cantidadTexto } from '../lib/nutricion.js';
  import { emojiAlimento } from '../lib/registro.js';
  import { avisar } from '../stores/ui.js';

  let { onelegir } = $props();
  let propias = $state(get(estado).propias);
  let creando = $state(false);

  const EMOJIS = ['🥪', '🥗', '🍲', '🍝', '🍛', '🌯', '🍳', '🥣', '🍱', '🥙', '🍔', '🍕', '🥘', '🍜', '🥤', '🍰'];
  let nombre = $state('');
  let emoji = $state('🥪');
  let modo = $state('ingredientes');
  let ingredientes = $state([]);
  let busca = $state('');
  let manual = $state({ kcal: '', p: '', c: '', g: '' });

  const sugeridos = $derived(busca.trim().length < 2 ? [] : Object.entries(ALIMENTOS)
    .filter(([, a]) => a.nombre.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').includes(busca.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')))
    .slice(0, 6));
  const macros = $derived(modo === 'ingredientes'
    ? macrosComida(ingredientes.filter((i) => i.g > 0))
    : { kcal: +manual.kcal || 0, p: +manual.p || 0, c: +manual.c || 0, g: +manual.g || 0, f: 0 });

  function añadirIngrediente(id) {
    const a = ALIMENTOS[id];
    ingredientes = [...ingredientes, { a: id, g: a.unidad?.g || 100 }];
    busca = '';
  }

  function guardar() {
    if (!nombre.trim()) return avisar('Ponle un nombre', '✏️');
    if (!(macros.kcal > 0)) return avisar('Añade ingredientes o calorías', '⚠️');
    const nueva = { id: nuevoId(), nombre: nombre.trim(), emoji, macros, ingredientes: modo === 'ingredientes' ? ingredientes : null };
    actualizar((e) => { e.propias.unshift(nueva); });
    propias = get(estado).propias;
    creando = false;
    nombre = ''; ingredientes = []; manual = { kcal: '', p: '', c: '', g: '' };
    avisar('Comida guardada', '👨‍🍳');
  }

  function borrar(id) {
    const pos = propias.findIndex((p) => p.id === id);
    const quitada = propias[pos];
    actualizar((e) => { e.propias = e.propias.filter((p) => p.id !== id); });
    propias = get(estado).propias;
    avisar(`Borrada: ${quitada.nombre}`, '🗑️', () => {
      actualizar((e) => { if (!e.propias.some((p) => p.id === id)) e.propias.splice(pos, 0, quitada); });
      propias = get(estado).propias;
    });
  }
</script>

{#if !creando}
  <button class="boton ancho" onclick={() => (creando = true)}><Icono e="➕" tam={18} /> Crear una comida mía</button>
  {#if propias.length}
    <ul class="lista">
      {#each propias as p (p.id)}
        <li>
          <button class="fila" onclick={() => onelegir?.({ tipo: 'propia', propia: p })}>
            <span class="ic"><Emoji e={p.emoji} tam={30} /></span>
            <span class="txt"><b>{p.nombre}</b><small>{Math.round(p.macros.kcal)} kcal · P {Math.round(p.macros.p)} g por ración</small></span>
            <span class="mas">+</span>
          </button>
          <button class="borrar" aria-label="Borrar {p.nombre}" onclick={() => borrar(p.id)}><Icono e="🗑️" tam={18} /></button>
        </li>
      {/each}
    </ul>
  {:else}
    <p class="pie-nota centro">Guarda aquí lo que comes a menudo y no está en el menú (tu bocadillo del trabajo, el táper de tu madre…). Luego lo añades con un toque.</p>
  {/if}
{:else}
  <label class="campo"><span>Nombre</span><input bind:value={nombre} placeholder="Mi bocadillo del trabajo" maxlength="40" /></label>
  <div class="emojis">
    {#each EMOJIS as em (em)}
      <button class:activo={emoji === em} onclick={() => (emoji = em)} aria-label="Icono {em}"><Emoji e={em} tam={28} /></button>
    {/each}
  </div>
  <div class="filtros">
    <button class="filtro" class:activo={modo === 'ingredientes'} onclick={() => (modo = 'ingredientes')}>Con ingredientes</button>
    <button class="filtro" class:activo={modo === 'manual'} onclick={() => (modo = 'manual')}>Macros a mano</button>
  </div>
  {#if modo === 'ingredientes'}
    {#each ingredientes as ing, i (i)}
      <div class="ing">
        <Emoji e={emojiAlimento(ing.a)} tam={24} />
        <span class="ing-n">{ALIMENTOS[ing.a].nombre}</span>
        <input type="number" min="0" bind:value={ing.g} aria-label="Gramos" /><small>{ALIMENTOS[ing.a].medida || 'g'}</small>
        <button class="borrar" aria-label="Quitar" onclick={() => (ingredientes = ingredientes.filter((_, j) => j !== i))}><Icono e="✕" tam={18} /></button>
      </div>
    {/each}
    <input class="busca" bind:value={busca} placeholder="Añadir ingrediente: pan, jamón, aceite…" aria-label="Buscar ingrediente" />
    {#each sugeridos as [id, a] (id)}
      <button class="sug" onclick={() => añadirIngrediente(id)}><Emoji e={emojiAlimento(id)} tam={22} /> {a.nombre}</button>
    {/each}
  {:else}
    <div class="manual">
      <label class="campo"><span>kcal</span><input type="number" bind:value={manual.kcal} /></label>
      <label class="campo"><span>Proteína (g)</span><input type="number" bind:value={manual.p} /></label>
      <label class="campo"><span>Hidratos (g)</span><input type="number" bind:value={manual.c} /></label>
      <label class="campo"><span>Grasa (g)</span><input type="number" bind:value={manual.g} /></label>
    </div>
  {/if}
  <div class="total"><b>Una ración:</b> <Macros m={macros} /></div>
  <div class="botones">
    <button class="boton boton-sec" onclick={() => (creando = false)}>Cancelar</button>
    <button class="boton" onclick={guardar}>Guardar</button>
  </div>
{/if}

<style>
  .ancho { width: 100%; }
  .centro { text-align: center; }
  .lista { list-style: none; margin: 12px 0 0; padding: 0; display: grid; gap: 6px; }
  .lista li { display: flex; gap: 6px; align-items: center; }
  .fila { flex: 1; display: flex; align-items: center; gap: 12px; padding: 8px 12px 8px 8px; border: 0; border-radius: 16px; background: var(--superficie); box-shadow: var(--sombra); text-align: left; cursor: pointer; color: var(--texto); }
  .ic { width: 46px; height: 46px; border-radius: 12px; display: grid; place-items: center; background: var(--superficie-2); }
  .txt { flex: 1; display: grid; }
  .txt small { color: var(--texto-2); font-weight: 600; }
  .mas { width: 30px; height: 30px; border-radius: 50%; display: grid; place-items: center; background: var(--primario-claro); color: var(--primario-fuerte); font-weight: 800; }
  .borrar { display: grid; place-items: center; flex-shrink: 0; min-width: 44px; min-height: 44px; border: 0; border-radius: 12px; background: none; cursor: pointer; padding: 0; color: var(--texto-2); }
  .emojis { display: grid; grid-template-columns: repeat(8, 1fr); gap: 6px; margin: 6px 0 12px; }
  .emojis button { aspect-ratio: 1; border-radius: 12px; border: 2px solid transparent; background: var(--superficie); box-shadow: var(--sombra); cursor: pointer; display: grid; place-items: center; }
  .emojis button.activo { border-color: var(--primario); background: var(--primario-claro); }
  .ing { display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-radius: 14px; background: var(--superficie); box-shadow: var(--sombra); margin-bottom: 6px; }
  .ing-n { flex: 1; font-weight: 700; font-size: 0.9rem; }
  .ing input { width: 70px; padding: 6px; border-radius: 10px; border: 1.5px solid var(--borde); text-align: right; font-weight: 800; background: var(--superficie); color: var(--texto); }
  .busca { width: 100%; min-height: 46px; padding: 10px 14px; border-radius: 14px; border: 1.5px dashed var(--borde); background: transparent; font-weight: 700; margin-top: 4px; color: var(--texto); }
  .sug { display: flex; align-items: center; gap: 8px; width: 100%; margin-top: 4px; padding: 8px 12px; border: 0; border-radius: 12px; background: var(--superficie-2); cursor: pointer; font-weight: 700; text-align: left; color: var(--texto); }
  .manual { display: grid; grid-template-columns: 1fr 1fr; gap: 0 10px; }
  .total { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin: 14px 0; }
  .botones { display: flex; gap: 10px; }
  .botones .boton { flex: 1; }
</style>
