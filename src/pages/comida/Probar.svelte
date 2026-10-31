<script>
  // Comida → Para probar: cada semana, platos nuevos para ti con un botón para ponerlos en tu menú (eliges en qué
  // comida). Debajo, todo el recetario con su buscador.
  import Icono from '../../components/Icono.svelte';
  import FotoReceta from '../../components/FotoReceta.svelte';
  import Recetas from './Recetas.svelte';
  import { estado } from '../../stores/estado.js';
  import { abrirHoja, avisar } from '../../stores/ui.js';
  import { hoyISO, recetaPorId, estiloDe } from '../../lib/planificador.js';
  import { paraProbar, huecosPara } from '../../lib/probar.js';
  import { probarEnMenu } from '../../lib/acciones.js';
  import { calcularObjetivos, macrosComida } from '../../lib/nutricion.js';
  import { racionReceta } from '../../lib/registro.js';
  import { diaSemana, capital } from '../../lib/formato.js';

  const hoy = hoyISO();
  const objetivos = $derived(calcularObjetivos($estado.perfil));
  const lista = $derived(paraProbar($estado, hoy).map((x) => {
    const franja = { desayuno: 'desayuno', snack: 'merienda', comida: 'comida', cena: 'cena', recena: 'recena' }[x.receta.prefiere || x.receta.tipos[0]];
    const ing = racionReceta(x.receta, $estado.perfil, objetivos, franja);
    return { ...x, franja, ing, m: macrosComida(ing) };
  }));
  const ESTILO = { casero: 'Casero', italiano: 'Italiano', asiatico: 'Asiático', indio: 'Indio', mexicano: 'Mexicano', mediterraneo: 'Mediterráneo', cuchara: 'De cuchara' };
  const FRANJA = { desayuno: 'desayuno', media: 'media mañana', comida: 'comida', merienda: 'merienda', cena: 'cena', recena: 'antes de dormir' };
  const corto = (id) => (recetaPorId[id]?.nombre || '').split(' con ')[0];

  // El plato que estás colocando en el menú (se abren sus huecos debajo)
  let eligiendo = $state(null);
  const huecos = $derived(eligiendo ? huecosPara($estado.plan, recetaPorId[eligiendo], hoy) : []);
  function poner(recetaId, h) {
    if (!probarEnMenu(h.diaIdx, h.franja, recetaId, hoy)) return avisar('No he podido ponerlo en esa comida', '⚠️');
    eligiendo = null;
    avisar(`Puesto el ${diaSemana(h.fecha)} en la ${FRANJA[h.franja]}: cantidades a tu medida`, '✅');
  }
</script>

<section class="probar" aria-label="Para probar esta semana">
  <header class="pp-cab">
    <h2>Para probar esta semana</h2>
    <p>Platos que aún no has comido, con tus alergias y gustos. Cambian cada lunes.</p>
  </header>
  <ul class="pp-lista">
    {#each lista as x (x.receta.id)}
      <li class="pp" class:abierto={eligiendo === x.receta.id}>
        <div class="pp-fila">
          <button class="pp-foto" aria-label="Ver receta de {x.receta.nombre}" onclick={() => abrirHoja('receta', { recetaId: x.receta.id, ingredientes: x.ing, titulo: `Ración para tu ${x.franja}` })}>
            <FotoReceta receta={x.receta} alto={68} redondeo={14} tamEmoji={38} />
          </button>
          <button class="pp-txt" onclick={() => abrirHoja('receta', { recetaId: x.receta.id, ingredientes: x.ing, titulo: `Ración para tu ${x.franja}` })}>
            <span class="pp-etq">{ESTILO[estiloDe(x.receta)] || capital(estiloDe(x.receta))} · {x.receta.tiempo} min{#if x.nueva}<i>nuevo para ti</i>{/if}</span>
            <b>{x.receta.nombre}</b>
            <small class="cifra">{Math.round(x.m.kcal)} kcal · {Math.round(x.m.p)} g de proteína</small>
          </button>
        </div>
        {#if x.puesta}
          <p class="pp-puesta"><Icono n="circle-check" tam={16} /> En tu menú: {diaSemana(x.puesta.fecha)}, {FRANJA[x.puesta.franja]}</p>
        {:else if eligiendo === x.receta.id}
          <div class="pp-huecos">
            <p>¿En qué comida lo pongo?</p>
            {#each huecos as h (h.diaIdx + h.franja)}
              <button onclick={() => poner(x.receta.id, h)}>
                <b>{capital(diaSemana(h.fecha).slice(0, 3))} {Number(h.fecha.slice(8))} · {FRANJA[h.franja]}</b>
                <small>en vez de {corto(h.actual)}</small>
              </button>
            {:else}
              <small class="pp-sin">Tu menú no tiene más días: cuando crees la semana nueva, vuelve y lo pones.</small>
            {/each}
            <button class="pp-cancelar" onclick={() => (eligiendo = null)}>Cancelar</button>
          </div>
        {:else}
          <button class="boton boton-sec boton-peq pp-poner" onclick={() => (eligiendo = x.receta.id)}><Icono n="plus" tam={16} grosor={2.4} /> Ponlo en mi menú</button>
        {/if}
      </li>
    {:else}
      <li class="pp-vacio">Ya tienes en tu menú todo lo que encaja contigo. El lunes te propongo más.</li>
    {/each}
  </ul>
</section>

<h2 class="seccion">Todo el recetario</h2>
<Recetas />

<style>
  .probar { margin-bottom: 8px; }
  .pp-cab h2 { margin: 4px 0 2px; font-size: 1.15rem; letter-spacing: -0.01em; }
  .pp-cab p { margin: 0 0 10px; font-size: 0.86rem; color: var(--texto-2); }
  .pp-lista { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
  .pp { padding: 10px; border-radius: var(--r-l); background: var(--superficie); box-shadow: var(--sombra); }
  .pp.abierto { box-shadow: inset 0 0 0 1.5px var(--primario), var(--sombra); }
  .pp-fila { display: flex; gap: 12px; align-items: center; }
  .pp-foto { width: 68px; flex-shrink: 0; padding: 0; border: 0; background: none; cursor: pointer; }
  .pp-txt { flex: 1; min-width: 0; display: grid; gap: 3px; padding: 0; border: 0; background: none; color: var(--texto); font: inherit; text-align: left; cursor: pointer; }
  .pp-etq { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; font-size: 0.72rem; font-weight: 700; color: var(--texto-2); }
  .pp-etq i { font-style: normal; padding: 1px 7px; border-radius: 999px; background: var(--primario-claro); color: var(--primario-fuerte); }
  .pp-txt b { font-size: 0.92rem; font-weight: 600; line-height: 1.28; display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .pp-txt small { font-size: 0.76rem; font-weight: 600; color: var(--texto-2); }
  .pp-poner { width: 100%; margin-top: 10px; }
  .pp-puesta { display: flex; align-items: center; gap: 6px; margin: 10px 2px 0; font-size: 0.82rem; font-weight: 700; color: var(--primario-fuerte); }
  .pp-huecos { display: grid; gap: 6px; margin-top: 10px; }
  .pp-huecos p { margin: 0 2px 2px; font-size: 0.8rem; font-weight: 700; color: var(--texto-2); }
  .pp-huecos button:not(.pp-cancelar) { display: grid; gap: 1px; min-height: 48px; padding: 8px 12px; border: 0; border-radius: var(--r-m); background: var(--superficie-2); color: var(--texto); font: inherit; text-align: left; cursor: pointer; }
  .pp-huecos button b { font-size: 0.88rem; }
  .pp-huecos button small { font-size: 0.74rem; color: var(--texto-2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .pp-cancelar { min-height: 44px; border: 0; background: none; color: var(--texto-2); font: inherit; font-weight: 700; font-size: 0.84rem; cursor: pointer; }
  .pp-sin { padding: 0 2px; color: var(--texto-2); }
  .pp-vacio { padding: 14px; border-radius: var(--r-l); background: var(--superficie); box-shadow: var(--sombra); font-size: 0.88rem; color: var(--texto-2); }
</style>
