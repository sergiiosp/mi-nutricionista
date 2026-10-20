<script>
  import Icono from '../../components/Icono.svelte';
  import Emoji from '../../components/Emoji.svelte';
  import Portada from '../../components/Portada.svelte';
  import FotoReceta from '../../components/FotoReceta.svelte';
  import { FOTOS_RECETAS } from '../../data/fotos.js';
  import { estado } from '../../stores/estado.js';
  import { avisar, abrirHoja } from '../../stores/ui.js';
  import { recetaPorId } from '../../lib/planificador.js';
  import { calcularObjetivos, objetivosDia, macrosComida, costeComida } from '../../lib/nutricion.js';
  import { hoyISO } from '../../lib/planificador.js';
  import { crearPlan } from '../../lib/acciones.js';
  import { diaCorto, diaSemana, fechaCorta, capital, euros, entero } from '../../lib/formato.js';

  const hoy = hoyISO();
  const plan = $derived($estado.plan);
  const objetivos = $derived(calcularObjetivos($estado.perfil));
  let sel = $state(Math.max(0, $estado.plan?.dias.findIndex((d) => d.fecha === hoy) ?? 0));
  const dia = $derived(plan?.dias[sel]);
  const NOMBRES = { desayuno: 'Desayuno', media: 'Media mañana', comida: 'Comida', merienda: 'Merienda', cena: 'Cena', recena: 'Antes de dormir' };
  const nombreFranja = (c) => (['media', 'merienda'].includes(c.franja) && c.hora ? (c.hora < '14:00' ? 'Media mañana' : 'Merienda') : NOMBRES[c.franja]);
  const nota = (d, c) => {
    if (c.franja !== 'comida' || !$estado.perfil.sobras) return '';
    if (plan.dias[d - 1]?.comidas.find((x) => x.franja === 'comida')?.recetaId === c.recetaId) return 'táper de ayer';
    if (plan.dias[d + 1]?.comidas.find((x) => x.franja === 'comida')?.recetaId === c.recetaId) return 'haz ración doble';
    return '';
  };

  // Vista: un día con todo el detalle, o la semana entera en cuadrícula (días × comidas)
  let vista = $state('dia');
  const franjas = $derived.by(() => {
    const vistas = new Map();
    for (const d of plan?.dias || []) for (const c of d.comidas) if (!vistas.has(c.franja)) vistas.set(c.franja, c);
    const orden = ['desayuno', 'media', 'comida', 'merienda', 'cena', 'recena'];
    return [...vistas.values()].sort((a, b) => orden.indexOf(a.franja) - orden.indexOf(b.franja));
  });
  const CORTO = { desayuno: 'Desayuno', media: 'Media', comida: 'Comida', merienda: 'Merienda', cena: 'Cena', recena: 'Noche' };
  function abrirCelda(i, c) {
    abrirHoja('receta', { recetaId: c.recetaId, ingredientes: c.ingredientes, titulo: `${capital(diaSemana(plan.dias[i].fecha))} · ${nombreFranja(c)}`, diaIdx: i, franja: c.franja });
  }

  // Portada del día: de fondo, la foto del plato fuerte (comida, si no la cena)
  const fotoDia = $derived.by(() => {
    const c = ['comida', 'cena', 'desayuno'].map((f) => dia?.comidas.find((x) => x.franja === f)).find((x) => x && FOTOS_RECETAS[x.recetaId] && !recetaPorId[x.recetaId]?.sinFoto);
    return c ? `img/recetas/${c.recetaId}.webp` : '';
  });
  const ETQ = { pre: 'pre-entreno', post: 'post-entreno' };
  const abrir = (c) => abrirCelda(sel, c);

  function nuevo(desdeInicio) {
    if (!confirm(`${desdeInicio ? '¿Generar otro menú para las mismas fechas?' : '¿Crear una semana nueva empezando hoy?'} El menú de hoy se queda como está.`)) return;
    crearPlan(desdeInicio ? plan.inicio : hoy);
    sel = 0;
    avisar('Menú nuevo listo', '🥗');
  }
</script>

{#if !plan}
  <div class="tarjeta vacia"><Emoji e="🥗" tam={56} /><p>Todavía no tienes menú.</p><button class="boton" onclick={() => crearPlan()}><Icono e="✨" tam={18} /> Crear menú de 7 días</button></div>
{:else}
  <div class="cab-semana">
    <p class="sobretitulo">{fechaCorta(plan.dias[0].fecha)} – {fechaCorta(plan.dias.at(-1).fecha)}</p>
    <div class="vista" role="group" aria-label="Vista">
      <button class:activo={vista === 'dia'} aria-pressed={vista === 'dia'} onclick={() => (vista = 'dia')}>Día</button>
      <button class:activo={vista === 'semana'} aria-pressed={vista === 'semana'} onclick={() => (vista = 'semana')}>Semana</button>
    </div>
  </div>

  {#if vista === 'semana'}
    <div class="cuadricula" style="--cols:{franjas.length}" role="table" aria-label="Menú de la semana">
      <div class="fila-cq cab" role="row">
        <span role="columnheader"></span>
        {#each franjas as f (f.franja)}<span role="columnheader">{CORTO[f.franja]}</span>{/each}
      </div>
      {#each plan.dias as d, i (d.fecha)}
        <div class="fila-cq" class:hoy={d.fecha === hoy} role="row">
          <span class="cq-dia" role="rowheader"><small>{diaCorto(d.fecha)}</small><b>{Number(d.fecha.slice(8))}</b>{#if d.entreno}<Icono n="dumbbell" tam={11} grosor={2.4} />{/if}</span>
          {#each franjas as f (f.franja)}
            {@const c = d.comidas.find((x) => x.franja === f.franja)}
            {#if c}
              <button class="celda" role="cell" onclick={() => abrirCelda(i, c)}>
                <span class="c-nombre">{recetaPorId[c.recetaId]?.nombre}</span>
                <span class="c-kcal cifra">{Math.round(macrosComida(c.ingredientes).kcal)}</span>
              </button>
            {:else}<span class="celda vacia-c" role="cell"></span>{/if}
          {/each}
        </div>
      {/each}
    </div>
    <p class="pie-nota">Toca un plato para ver la receta o cambiarlo.</p>
  {:else}
  <div class="dias" role="tablist">
    {#each plan.dias as d, i (d.fecha)}
      <button role="tab" aria-selected={i === sel} class:activo={i === sel} class:hoy={d.fecha === hoy} onclick={() => (sel = i)}>
        <span>{diaCorto(d.fecha)}</span><b>{Number(d.fecha.slice(8))}</b><i>{#if d.entreno}<Icono n="dumbbell" tam={12} grosor={2.2} />{/if}</i>
      </button>
    {/each}
  </div>

  {#if dia}
    {@const od = dia.objetivo || objetivosDia(objetivos, dia.entreno)}
    {@const t = macrosComida(dia.comidas.flatMap((c) => c.ingredientes))}
    <Portada foto={fotoDia} color="var(--primario)" alto={fotoDia ? 330 : 280} duotono={false} etiqueta="Menú del {diaSemana(dia.fecha)}">
      <div class="p-sup">
        <span class="p-chip"><Icono n={dia.entreno ? 'dumbbell' : 'moon'} tam={14} grosor={2.2} /> {capital(diaSemana(dia.fecha))} · {dia.entreno ? 'entreno' : 'descanso'}</span>
        {#if dia.viaje}<span class="p-chip"><Icono n="map-pin" tam={14} grosor={2.2} /> de viaje</span>{/if}
        {#if dia.libre}<span class="p-chip"><Icono n="party-popper" tam={14} grosor={2.2} /> día libre</span>{:else if dia.ahorro}<span class="p-chip">ahorro −{dia.ahorro} kcal</span>{/if}
        <span class="p-coste cifra">{euros(dia.comidas.reduce((x, c) => x + costeComida(c.ingredientes), 0))}</span>
      </div>
      <div class="p-cifras">
        <div class="p-kcal"><b class="cifra cifra-xl">{entero(t.kcal)}</b><small>{Math.abs(t.kcal - od.kcal) / od.kcal < 0.03 ? 'kcal · cuadra con tu objetivo' : `de ${entero(od.kcal)} kcal`}</small></div>
        <div><b class="cifra">{Math.round(t.p)}<span>g</span></b><small>proteína</small></div>
        <div><b class="cifra">{Math.round(t.c)}<span>g</span></b><small>hidratos</small></div>
        <div><b class="cifra">{Math.round(t.g)}<span>g</span></b><small>grasa</small></div>
      </div>
      <div class="tira" aria-label="Platos del día">
        {#each dia.comidas as c (c.franja)}
          <button class="t-plato" onclick={() => abrir(c)} aria-label="{nombreFranja(c)}: {recetaPorId[c.recetaId]?.nombre}">
            <FotoReceta receta={recetaPorId[c.recetaId]} alto={74} redondeo={14} />
            <small>{c.hora}</small>
          </button>
        {/each}
      </div>
    </Portada>
    {#if dia.fecha === hoy}<a class="ver-hoy" href="#hoy"><Icono n="house" tam={16} /> Ver hoy con lo que llevas comido <Icono n="chevron-right" tam={16} /></a>{/if}
    {#if dia.viaje}<p class="pie-nota">De viaje: comidas para pedir fuera o comprar hechas. Estos días no entran en la lista de la compra.</p>{/if}

    <ol class="menu-dia">
      {#each dia.comidas as c (c.franja)}
        {@const r = recetaPorId[c.recetaId]}
        {@const n = nota(sel, c)}
        <li>
          <button class="m-fila" onclick={() => abrir(c)}>
            <span class="m-hora cifra">{c.hora}</span>
            <span class="m-foto"><FotoReceta receta={r} alto={56} redondeo={14} /></span>
            <span class="m-txt">
              <small>{nombreFranja(c)}{#if c.libre}<i class="m-etq">libre · come lo que quieras</i>{/if}{#if c.etiqueta}<i class="m-etq">{ETQ[c.etiqueta]}</i>{/if}{#if n}<i class="m-etq gris">{n}</i>{/if}</small>
              <b>{c.libre ? `${nombreFranja(c)} libre` : r?.nombre}</b>
            </span>
            <span class="m-kcal cifra">{Math.round(macrosComida(c.ingredientes).kcal)}<small>kcal</small></span>
          </button>
          <button class="m-cambiar" aria-label="Cambiar {nombreFranja(c).toLowerCase()}" onclick={() => abrirHoja('alternativas', { diaIdx: sel, franja: c.franja })}><Icono n="shuffle" tam={17} /></button>
        </li>
      {/each}
    </ol>
  {/if}
  {/if}

  <div class="acciones-plan">
    <button class="boton boton-sec" onclick={() => abrirHoja('diaLibre')}><Icono n="party-popper" tam={18} /> {$estado.perfil.diaLibre?.fecha >= hoy ? 'Tu día libre' : 'Reservar kcal para un día libre'}</button>
    <button class="boton boton-sec" onclick={() => nuevo(true)}><Icono e="🎲" tam={18} /> Otro menú con las mismas fechas</button>
    <button class="boton boton-sec" onclick={() => nuevo(false)}><Icono e="📅" tam={18} /> Nueva semana desde hoy</button>
  </div>
{/if}

<style>
  .dias { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; margin: 8px 0 4px; }
  .dias button { display: grid; justify-items: center; padding: 8px 0 4px; border: 0; border-radius: 16px; background: var(--superficie); box-shadow: var(--sombra); cursor: pointer; font-weight: 700; font-size: 0.75rem; color: var(--texto-2); }
  .dias b { font-size: 1.1rem; font-weight: 700; color: var(--texto); }
  .dias i { font-style: normal; font-size: 0.7rem; height: 1em; line-height: 1; }
  .dias button.hoy { outline: 2px solid var(--primario); outline-offset: -2px; }
  .dias button.activo { background: var(--hero); color: var(--sobre-primario); }
  .dias button.activo b { color: var(--sobre-primario); }
  .cab-semana { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
  .cab-semana .sobretitulo { margin: 0; }
  .vista { display: inline-flex; padding: 3px; border-radius: 12px; background: var(--superficie); box-shadow: var(--sombra); }
  .vista button { min-height: 36px; padding: 0 14px; border: 0; border-radius: 9px; background: none; color: var(--texto-2); font: inherit; font-weight: 700; font-size: 0.8rem; cursor: pointer; }
  .vista button.activo { background: var(--primario-claro); color: var(--primario-fuerte); }
  .cuadricula { display: grid; gap: 4px; margin-top: 12px; }
  .fila-cq { display: grid; grid-template-columns: 38px repeat(var(--cols), minmax(0, 1fr)); gap: 4px; }
  .fila-cq.cab span { font-size: 0.68rem; font-weight: 700; color: var(--primario-fuerte); text-align: center; padding-bottom: 2px; }
  .cq-dia { display: grid; justify-items: center; align-content: center; gap: 1px; border-radius: 12px; color: var(--texto-2); }
  .cq-dia small { font-size: 0.66rem; font-weight: 700; }
  .cq-dia b { font-size: 1rem; color: var(--texto); line-height: 1; }
  .cq-dia :global(svg) { color: var(--primario); }
  .fila-cq.hoy .cq-dia { background: var(--primario); color: var(--sobre-primario); }
  .fila-cq.hoy .cq-dia b, .fila-cq.hoy .cq-dia :global(svg) { color: var(--sobre-primario); }
  .celda { display: flex; flex-direction: column; justify-content: space-between; gap: 4px; min-height: 76px; min-width: 0; padding: 7px; border: 0; border-radius: 12px; text-align: left; font: inherit; color: var(--texto); cursor: pointer;
    background: radial-gradient(120% 100% at 0% 0%, color-mix(in srgb, var(--tinte) 80%, transparent), transparent 70%), var(--superficie); box-shadow: var(--sombra); }
  .fila-cq.hoy .celda { box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--primario) 45%, transparent); }
  .c-nombre { font-size: 0.68rem; font-weight: 600; line-height: 1.25; display: -webkit-box; -webkit-line-clamp: 3; line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
  .c-kcal { font-size: 0.66rem; font-weight: 700; color: var(--primario-fuerte); }
  .vacia-c { background: none; box-shadow: none; }
  /* Portada del día */
  .dias { margin-bottom: 12px; }
  .p-sup { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
  .p-chip { display: inline-flex; align-items: center; gap: 6px; padding: 6px 11px; border-radius: 999px; background: rgb(0 0 0 / 0.42); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); font-size: 0.78rem; font-weight: 700; }
  .p-coste { margin-left: auto; padding: 6px 11px; border-radius: 999px; background: rgb(0 0 0 / 0.42); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); font-size: 0.82rem; font-weight: 700; }
  .p-cifras { display: flex; align-items: flex-end; gap: 14px; margin-top: auto; padding-top: 24px; }
  .p-cifras div { display: grid; }
  .p-cifras b { font-size: 1.15rem; line-height: 1.1; color: #fff; }
  .p-cifras b span { font-size: 0.78rem; margin-left: 1px; color: rgb(255 255 255 / 0.7); }
  .p-cifras small { font-size: 0.7rem; font-weight: 600; color: rgb(255 255 255 / 0.65); }
  .p-kcal { margin-right: auto; }
  .p-kcal b { font-size: 2.6rem; letter-spacing: -0.04em; line-height: 1; }
  .tira { display: flex; gap: 8px; margin: 14px -18px -4px; padding: 0 18px 2px; overflow-x: auto; scrollbar-width: none; }
  .tira::-webkit-scrollbar { display: none; }
  .t-plato { flex: 0 0 74px; display: grid; gap: 4px; padding: 0; border: 0; background: none; color: #fff; font: inherit; cursor: pointer; }
  .t-plato :global(.foto) { width: 100%; box-shadow: 0 0 0 1.5px rgb(255 255 255 / 0.18); }
  .t-plato small { font-size: 0.7rem; font-weight: 700; color: rgb(255 255 255 / 0.75); text-align: center; }
  .ver-hoy { display: flex; align-items: center; gap: 8px; min-height: 44px; margin: 6px 2px 0; color: var(--primario); font-weight: 700; font-size: 0.86rem; text-decoration: none; }
  .ver-hoy :global(svg:last-child) { margin-left: auto; color: var(--texto-3); }

  /* El menú del día en filas */
  .menu-dia { list-style: none; margin: 12px 0 0; padding: 0; border-radius: 22px; background: var(--superficie); box-shadow: var(--sombra); overflow: hidden; }
  .menu-dia li { display: flex; align-items: center; }
  .menu-dia li + li { border-top: 1px solid var(--linea); }
  .m-fila { flex: 1; min-width: 0; display: flex; align-items: center; gap: 12px; min-height: 76px; padding: 10px 4px 10px 12px; border: 0; background: none; color: var(--texto); font: inherit; text-align: left; cursor: pointer; }
  .m-hora { width: 38px; flex-shrink: 0; font-size: 0.78rem; font-weight: 700; color: var(--texto-2); }
  .m-foto { width: 56px; flex-shrink: 0; }
  .m-foto :global(.foto) { width: 100%; }
  .m-txt { flex: 1; min-width: 0; display: grid; gap: 1px; }
  .m-txt small { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; font-size: 0.74rem; font-weight: 700; color: var(--primario-fuerte); }
  .m-etq { font-style: normal; padding: 1px 7px; border-radius: 999px; background: var(--primario-claro); font-size: 0.66rem; }
  .m-etq.gris { background: var(--superficie-2); color: var(--texto-2); }
  .m-txt b { font-weight: 600; font-size: 0.9rem; line-height: 1.25; display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .m-kcal { display: grid; justify-items: end; flex-shrink: 0; font-size: 0.95rem; font-weight: 700; }
  .m-kcal small { font-size: 0.66rem; font-weight: 600; color: var(--texto-3); }
  .m-cambiar { display: grid; place-items: center; width: 44px; height: 44px; margin-right: 6px; border: 0; border-radius: 12px; background: none; color: var(--texto-3); cursor: pointer; flex-shrink: 0; }
  .m-cambiar:active { background: var(--superficie-2); color: var(--primario); }
  @media (hover: hover) and (pointer: fine) { .m-cambiar:hover { background: var(--superficie-2); color: var(--primario); } }
  .vacia { text-align: center; }
</style>
