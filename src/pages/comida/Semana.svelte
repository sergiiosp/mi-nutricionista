<script>
  import Emoji from '../../components/Emoji.svelte';
  import Macros from '../../components/Macros.svelte';
  import TarjetaComida from '../../components/TarjetaComida.svelte';
  import { estado } from '../../stores/estado.js';
  import { avisar } from '../../stores/ui.js';
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

  function nuevo(desdeInicio) {
    if (!confirm(desdeInicio ? '¿Generar otro menú para las mismas fechas?' : '¿Crear una semana nueva empezando hoy?')) return;
    crearPlan(desdeInicio ? plan.inicio : hoy);
    sel = 0;
    avisar('Menú nuevo listo', '🥗');
  }
</script>

{#if !plan}
  <div class="tarjeta vacia"><Emoji e="🥗" tam={56} /><p>Todavía no tienes menú.</p><button class="boton" onclick={() => crearPlan()}>✨ Crear menú de 7 días</button></div>
{:else}
  <p class="sobretitulo">{fechaCorta(plan.dias[0].fecha)} – {fechaCorta(plan.dias.at(-1).fecha)}</p>
  <div class="dias" role="tablist">
    {#each plan.dias as d, i (d.fecha)}
      <button role="tab" aria-selected={i === sel} class:activo={i === sel} class:hoy={d.fecha === hoy} onclick={() => (sel = i)}>
        <span>{diaCorto(d.fecha)}</span><b>{Number(d.fecha.slice(8))}</b><i>{d.entreno ? '💪' : ''}</i>
      </button>
    {/each}
  </div>

  {#if dia}
    {@const od = objetivosDia(objetivos, dia.entreno)}
    {@const t = macrosComida(dia.comidas.flatMap((c) => c.ingredientes))}
    <div class="tarjeta total">
      <div class="t-cab"><b>{capital(diaSemana(dia.fecha))}</b><span class="etq {dia.entreno ? 'etq-pre' : 'etq-nota'}">{dia.entreno ? '💪 Entreno' : '😌 Descanso'}</span><span class="coste">{euros(dia.comidas.reduce((s, c) => s + costeComida(c.ingredientes), 0))}</span></div>
      <Macros m={t} />
      <p class="pie-nota">Objetivo: {od.kcal} kcal · P {od.proteina} · H {od.hidratos} · G {od.grasa}</p>
      {#if dia.fecha === hoy}<a class="enlace" href="#hoy">Ver hoy con lo que llevas comido →</a>{/if}
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

  <div class="acciones-plan">
    <button class="boton boton-sec" onclick={() => nuevo(true)}>🎲 Otro menú con las mismas fechas</button>
    <button class="boton boton-sec" onclick={() => nuevo(false)}>📅 Nueva semana desde hoy</button>
  </div>
{/if}

<style>
  .dias { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; margin: 8px 0 4px; }
  .dias button { display: grid; justify-items: center; padding: 8px 0 4px; border: 0; border-radius: 16px; background: var(--superficie); box-shadow: var(--sombra); cursor: pointer; font-weight: 700; font-size: 0.75rem; color: var(--texto-2); }
  .dias b { font-size: 1.1rem; font-weight: 900; color: var(--texto); }
  .dias i { font-style: normal; font-size: 0.7rem; height: 1em; line-height: 1; }
  .dias button.hoy { outline: 2px solid var(--primario); outline-offset: -2px; }
  .dias button.activo { background: var(--hero); color: rgb(255 255 255 / 0.85); }
  .dias button.activo b { color: #fff; }
  .t-cab { display: flex; align-items: center; gap: 8px; }
  .coste { margin-left: auto; font-weight: 800; color: var(--texto-2); font-size: 0.9rem; }
  .lista { display: grid; gap: 10px; }
  .hora { display: block; font-size: 0.78rem; font-weight: 900; color: var(--texto-2); margin: 0 0 4px 6px; }
  .vacia { text-align: center; }
</style>
