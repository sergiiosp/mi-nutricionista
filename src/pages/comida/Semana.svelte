<script>
  import Icono from '../../components/Icono.svelte';
  import Emoji from '../../components/Emoji.svelte';
  import Macros from '../../components/Macros.svelte';
  import TarjetaComida from '../../components/TarjetaComida.svelte';
  import { estado } from '../../stores/estado.js';
  import { avisar, abrirHoja } from '../../stores/ui.js';
  import { recetaPorId } from '../../lib/planificador.js';
  import { calcularObjetivos, objetivosDia, macrosComida, costeComida } from '../../lib/nutricion.js';
  import { hoyISO } from '../../lib/planificador.js';
  import { crearPlan } from '../../lib/acciones.js';
  import { diaCorto, diaSemana, fechaCorta, capital, euros } from '../../lib/formato.js';

  const hoy = hoyISO();
  const plan = $derived($estado.plan);
  const objetivos = $derived(calcularObjetivos($estado.perfil));
  let sel = $state(Math.max(0, $estado.plan?.dias.findIndex((d) => d.fecha === hoy) ?? 0));
  const dia = $derived(plan?.dias[sel]);
  const NOMBRES = { desayuno: 'Desayuno', media: 'Media mañana', comida: 'Comida', merienda: 'Merienda', cena: 'Cena' };
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
    const orden = ['desayuno', 'media', 'comida', 'merienda', 'cena'];
    return [...vistas.values()].sort((a, b) => orden.indexOf(a.franja) - orden.indexOf(b.franja));
  });
  const CORTO = { desayuno: 'Desayuno', media: 'Media', comida: 'Comida', merienda: 'Merienda', cena: 'Cena' };
  function abrirCelda(i, c) {
    abrirHoja('receta', { recetaId: c.recetaId, ingredientes: c.ingredientes, titulo: `${capital(diaSemana(plan.dias[i].fecha))} · ${nombreFranja(c)}`, diaIdx: i, franja: c.franja });
  }

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
    {@const od = objetivosDia(objetivos, dia.entreno)}
    {@const t = macrosComida(dia.comidas.flatMap((c) => c.ingredientes))}
    <div class="tarjeta total">
      <div class="t-cab"><b>{capital(diaSemana(dia.fecha))}</b><span class="etq {dia.entreno ? 'etq-pre' : 'etq-nota'}">{dia.entreno ? 'Entreno' : 'Descanso'}</span><span class="coste">{euros(dia.comidas.reduce((s, c) => s + costeComida(c.ingredientes), 0))}</span></div>
      <Macros m={t} />
      <p class="pie-nota">Objetivo: {od.kcal} kcal · P {od.proteina} · H {od.hidratos} · G {od.grasa}</p>
      {#if dia.fecha === hoy}<a class="enlace enlace-hoy" href="#hoy">Ver hoy con lo que llevas comido</a>{/if}
    </div>
    <div class="lista">
      {#each dia.comidas as c (c.franja)}
        <div class="con-hora">
          <span class="hora">{c.hora}</span>
          <TarjetaComida comida={c} diaIdx={sel} franjaNombre={nombreFranja(c)} nota={nota(sel, c)} editable={false} />
        </div>
      {/each}
    </div>
  {/if}
  {/if}

  <div class="acciones-plan">
    <button class="boton boton-sec" onclick={() => nuevo(true)}><Icono e="🎲" tam={18} /> Otro menú con las mismas fechas</button>
    <button class="boton boton-sec" onclick={() => nuevo(false)}><Icono e="📅" tam={18} /> Nueva semana desde hoy</button>
  </div>
{/if}

<style>
  .enlace-hoy { display: inline-block; padding: 12px 0; margin: -12px 0; }
  .dias { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; margin: 8px 0 4px; }
  .dias button { display: grid; justify-items: center; padding: 8px 0 4px; border: 0; border-radius: 16px; background: var(--superficie); box-shadow: var(--sombra); cursor: pointer; font-weight: 700; font-size: 0.75rem; color: var(--texto-2); }
  .dias b { font-size: 1.1rem; font-weight: 800; color: var(--texto); }
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
  .t-cab { display: flex; align-items: center; gap: 8px; }
  .coste { margin-left: auto; font-weight: 800; color: var(--texto-2); font-size: 0.9rem; }
  .lista { display: grid; gap: 10px; }
  .hora { display: block; font-size: 0.78rem; font-weight: 800; color: var(--texto-2); margin: 0 0 4px 6px; }
  .vacia { text-align: center; }
</style>
