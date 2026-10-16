<script>
  // Registrar cómo fue una sesión: estado, duración, RPE, sensaciones y marcas según el tipo
  import { get } from 'svelte/store';
  import Emoji from './Emoji.svelte';
  import Icono from './Icono.svelte';
  import CampoTiempo from './CampoTiempo.svelte';
  import { ultimaVez } from '../lib/hyrox/fuerza.js';
  import { estado } from '../stores/estado.js';
  import { cerrarHoja, avisar, celebrar } from '../stores/ui.js';
  import { planDe } from '../lib/hyrox/index.js';
  import { registrarSesion } from '../lib/acciones.js';
  import { ESTACIONES } from '../data/hyrox.js';
  import { aSegundos, mmss } from '../lib/hyrox/ritmos.js';

  let { id } = $props();
  const e = get(estado);
  const s = planDe(e)?.sesiones.find((x) => x.id === id);
  const previo = e.hyrox?.registros?.[id] || {};

  let situacion = $state(previo.estado || 'completa');
  let duracion = $state(previo.duracion || s?.duracion || 60);
  let rpe = $state(previo.rpe || s?.rpe || 6);
  let sensacion = $state(previo.sensacion || 'normal');
  let ritmo = $state(previo.ritmo ? mmss(previo.ritmo) : '');
  let distancia = $state(previo.distancia || '');
  let tiempo = $state(previo.tiempo ? mmss(previo.tiempo) : '');
  let peso = $state(previo.peso || '');
  let notas = $state(previo.notas || '');
  const conEstaciones = ['simulacro', 'carrera'].includes(s?.tipo);
  const estacionesSesion = s?.tipo === 'carrera' || /completo/i.test(s?.titulo || '') ? ESTACIONES
    : s?.tipo === 'simulacro' ? (/5-8/.test(s.titulo) ? ESTACIONES.slice(4) : ESTACIONES.slice(0, 4)) : [];
  let tiemposEst = $state(Object.fromEntries(estacionesSesion.map((x) => [x.id, previo.estaciones?.[x.id] ? mmss(previo.estaciones[x.id]) : ''])));
  // Kilos y repeticiones por serie (opcional): solo se guardan los ejercicios que abras
  const ejercicios = s?.ejercicios || [];
  const ultimas = Object.fromEntries(ejercicios.map((ej) => [ej.id, ultimaVez(e.hyrox?.registros, ej.id, id, planDe(e))]));
  let cargas = $state(Object.fromEntries(Object.entries(previo.series || {}).map(([k, l]) => [k, l.map((x) => ({ kg: x.kg ?? '', reps: x.reps ?? '', hecha: true, phKg: '', phReps: '' }))])));
  const objetivoReps = (ej) => Number(/\d+/.exec(ej.reps)?.[0]) || '';
  function abrir(ej) {
    if (cargas[ej.id]) { delete cargas[ej.id]; return; }
    const antes = ultimas[ej.id]?.series || [];
    // Como en Hevy: lo de la última vez queda de sugerencia y cada serie se confirma con un toque
    cargas[ej.id] = Array.from({ length: Math.max(ej.series, antes.length) }, (_, i) => {
      const x = antes[i] || antes.at(-1);
      return { kg: '', reps: '', hecha: false, phKg: x?.kg ?? '', phReps: x?.reps ?? objetivoReps(ej) };
    });
  }
  function marcar(serie) {
    if (!serie.hecha) {
      if (serie.kg === '' || serie.kg == null) serie.kg = serie.phKg;
      if (serie.reps === '' || serie.reps == null) serie.reps = serie.phReps;
    }
    serie.hecha = !serie.hecha;
  }
  function igualQueUltima(ej) {
    if (!cargas[ej.id]) abrir(ej);
    for (const s of cargas[ej.id]) { s.kg = s.phKg; s.reps = s.phReps; s.hecha = true; }
  }
  const resumen = (u) => (u ? `${String(u.kg).replace('.', ',')} kg × ${u.reps}` : '');
  const numero = (v) => Number(String(v).replace(',', '.')) || 0;

  const CARAS = ['😴', '😌', '🙂', '😊', '😐', '😅', '😤', '😰', '🥵', '💀'];

  function guardar() {
    const datos = { estado: situacion, duracion: Number(duracion) || null, rpe: situacion === 'no' ? null : Number(rpe), sensacion, notas: notas.trim() };
    if (['series', 'umbral'].includes(s.tipo) && aSegundos(ritmo)) datos.ritmo = aSegundos(ritmo);
    if (['rodaje', 'largo'].includes(s.tipo) && Number(distancia) > 0) datos.distancia = Number(String(distancia).replace(',', '.'));
    if (['simulacro', 'compromised', 'estaciones', 'carrera'].includes(s.tipo) && aSegundos(tiempo)) datos.tiempo = aSegundos(tiempo);
    if (s.tipo === 'fuerza' && Number(peso) > 0) datos.peso = Number(peso);
    datos.fecha = s.fecha;
    const series = Object.fromEntries(Object.entries(cargas)
      .map(([k, l]) => [k, l.filter((x) => x.hecha || x.kg !== '' || x.reps !== '').map((x) => ({ kg: numero(x.kg), reps: Math.round(numero(x.reps)) })).filter((x) => x.kg > 0 || x.reps > 0)])
      .filter(([, l]) => l.length));
    if (situacion !== 'no' && Object.keys(series).length) {
      datos.series = series;
      if (series.sentadilla) datos.peso = Math.max(...series.sentadilla.map((x) => x.kg));
    }
    if (conEstaciones) {
      datos.estaciones = Object.fromEntries(Object.entries(tiemposEst).map(([k, v]) => [k, aSegundos(v)]).filter(([, v]) => v > 0));
    }
    registrarSesion(id, datos);
    cerrarHoja();
    if (situacion === 'completa') { celebrar(); avisar('¡Sesión completada!', '💪'); } else avisar('Sesión registrada', '📝');
  }
</script>

{#if s}
  <div class="cab"><Emoji e={s.emoji} tam={40} /><div><b>{s.titulo}</b><small>Objetivo: {s.duracion} min · RPE {s.rpe}</small></div></div>

  <div class="estado">
    {#each [['completa', '✅', 'La hice'], ['parcial', '◐', 'A medias'], ['no', '❌', 'No la hice']] as [v, em, n] (v)}
      <button class:activo={situacion === v} onclick={() => (situacion = v)}><Emoji e={em} tam={24} /><span>{n}</span></button>
    {/each}
  </div>

  {#if situacion !== 'no'}
    <label class="campo"><span>Duración real (min)</span><input type="number" min="5" max="300" bind:value={duracion} inputmode="numeric" /></label>

    <div class="rpe">
      <div class="rpe-cab"><span>Esfuerzo percibido (RPE)</span><b><Emoji e={CARAS[rpe - 1]} tam={22} /> {rpe}/10</b></div>
      <input type="range" min="1" max="10" step="1" bind:value={rpe} aria-label="RPE de 1 a 10" />
      <div class="rpe-ley"><small>Muy suave</small><small>Máximo</small></div>
    </div>

    <fieldset class="opciones tres"><legend>¿Cómo te encontraste?</legend>
      {#each [['bien', 'Bien'], ['normal', 'Normal'], ['mal', 'Mal']] as [v, n] (v)}
        <label class="opcion"><input type="radio" name="sens" value={v} bind:group={sensacion} /><span><b>{n}</b></span></label>
      {/each}
    </fieldset>

    {#if ['series', 'umbral'].includes(s.tipo)}
      <CampoTiempo etiqueta="Ritmo medio de las series (min/km)" bind:value={ritmo} ejemplo="4:55" />
    {:else if ['rodaje', 'largo'].includes(s.tipo)}
      <label class="campo"><span>Distancia (km)</span><input type="number" step="0.1" bind:value={distancia} inputmode="decimal" placeholder={String(s.distancia || '')} /></label>
    {:else if s.tipo === 'fuerza' && !ejercicios.length}
      <label class="campo"><span>Peso en la sentadilla (kg)</span><input type="number" step="2.5" bind:value={peso} inputmode="decimal" /></label>
    {/if}
    {#if ejercicios.length}
      <div class="pesos">
        <p class="pesos-cab"><b>Pesos</b> <small>opcional: abre un ejercicio y marca cada serie con ✓ (si no cambias nada, se guarda lo de la última vez)</small></p>
        {#each ejercicios as ej (ej.id)}
          {@const u = ultimas[ej.id]}
          <div class="ej" class:abierto={cargas[ej.id]}>
            <button class="ej-cab" onclick={() => abrir(ej)} aria-expanded={!!cargas[ej.id]}>
              <span><b>{ej.nombre}</b><small>{ej.series} × {ej.reps}{#if u} · última vez {resumen(u)}{/if}</small></span>
              <Icono n={cargas[ej.id] ? 'minus' : 'plus'} tam={18} />
            </button>
            {#if u && !(cargas[ej.id] || []).every((s) => s.hecha)}
              <button class="repetir" onclick={() => igualQueUltima(ej)}><Icono n="repeat" tam={14} grosor={2.2} /> Igual que la última vez</button>
            {/if}
            {#if cargas[ej.id]}
              {#each cargas[ej.id] as serie, i (i)}
                <div class="serie" class:hecha={serie.hecha}>
                  <span class="n">{i + 1}</span>
                  <input type="number" step="0.5" min="0" inputmode="decimal" bind:value={serie.kg} placeholder={serie.phKg !== '' ? String(serie.phKg) : 'kg'} aria-label="Kilos de la serie {i + 1}" />
                  <i>kg ×</i>
                  <input type="number" min="0" inputmode="numeric" bind:value={serie.reps} placeholder={serie.phReps !== '' ? String(serie.phReps) : 'reps'} aria-label="Repeticiones de la serie {i + 1}" />
                  <button class="hecha-btn" class:activo={serie.hecha} aria-pressed={serie.hecha} aria-label="Serie {i + 1} hecha" onclick={() => marcar(serie)}><Icono n="check" tam={18} grosor={2.8} /></button>
                </div>
              {/each}
              <div class="serie-acciones">
                <button class="enlace" onclick={() => { const u2 = cargas[ej.id].at(-1); cargas[ej.id].push({ kg: '', reps: '', hecha: false, phKg: u2?.kg || u2?.phKg || '', phReps: u2?.reps || u2?.phReps || '' }); }}>+ otra serie</button>
                {#if cargas[ej.id].length > 1}<button class="enlace quitar-ult" onclick={() => cargas[ej.id].pop()}>Quitar la última</button>{/if}
              </div>
            {/if}
          </div>
        {/each}
        <p class="pie-nota">Con esto veo en Progreso → Entreno si subes de fuerza y qué zona va más floja.</p>
      </div>
    {/if}
    {#if ['simulacro', 'compromised', 'estaciones', 'carrera'].includes(s.tipo)}
      <CampoTiempo etiqueta="Tiempo total" bind:value={tiempo} horas ejemplo={s.tipo === 'carrera' ? '1:25:00' : '0:45:00'} />
    {/if}
    {#if conEstaciones}
      <p class="pie-nota">Tiempo de cada estación (opcional): mejora tu estimación de carrera.</p>
      <div class="estaciones">
        {#each estacionesSesion as est (est.id)}
          <CampoTiempo etiqueta={est.nombre} bind:value={tiemposEst[est.id]} ejemplo="4:30" />
        {/each}
      </div>
    {/if}
  {/if}

  <label class="campo"><span>Notas <small>(opcional)</small></span><input bind:value={notas} maxlength="140" placeholder="Molestia en el gemelo, buen día…" /></label>
  <button class="boton ancho" onclick={guardar}>Guardar</button>
  <p class="pie-nota">Con tus registros ajusto automáticamente la carga de las semanas siguientes.</p>
{/if}

<style>
  .cab { display: flex; gap: 12px; align-items: center; margin-bottom: 12px; }
  .cab small { display: block; color: var(--texto-2); font-weight: 700; }
  .estado { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
  .estado button { display: grid; justify-items: center; gap: 4px; padding: 12px 6px; border-radius: 18px; border: 2px solid transparent; background: var(--superficie); box-shadow: var(--sombra); font-weight: 800; cursor: pointer; color: var(--texto); }
  .estado button.activo { border-color: var(--primario); background: var(--primario-claro); }
  .rpe { margin: 12px 0; padding: 12px 14px; border-radius: 18px; background: var(--superficie); box-shadow: var(--sombra); }
  .rpe-cab { display: flex; justify-content: space-between; align-items: center; font-weight: 700; font-size: 0.92rem; }
  .rpe-cab b { display: flex; gap: 6px; align-items: center; font-size: 1.1rem; }
  .rpe input { width: 100%; accent-color: var(--primario); margin: 10px 0 2px; }
  .rpe-ley { display: flex; justify-content: space-between; color: var(--texto-2); font-weight: 700; }
  .estaciones { display: grid; grid-template-columns: 1fr 1fr; gap: 0 10px; }
  .estaciones :global(.campo-tiempo) { margin: 6px 0; }
  .ancho { width: 100%; margin-top: 6px; }
  .pesos { margin: 14px 0 4px; }
  .pesos-cab { margin: 0 0 8px; display: grid; }
  .pesos-cab small { color: var(--texto-2); font-weight: 600; font-size: 0.8rem; }
  .ej { border-top: 1px solid var(--linea); }
  .ej-cab { width: 100%; display: flex; justify-content: space-between; align-items: center; gap: 10px; min-height: 52px; padding: 8px 0; border: 0; background: none; color: var(--texto); text-align: left; cursor: pointer; font: inherit; }
  .ej-cab span { display: grid; }
  .ej-cab small { color: var(--texto-2); font-size: 0.78rem; font-weight: 600; }
  .ej.abierto .ej-cab { color: var(--primario); }
  .serie { display: grid; grid-template-columns: 20px 1fr auto 1fr 44px; gap: 6px; align-items: center; margin: 4px 0; padding: 3px; border-radius: 14px; transition: background 0.15s; }
  .serie.hecha { background: var(--primario-claro); }
  .serie.hecha input { border-color: transparent; background: transparent; }
  .hecha-btn { width: 44px; height: 42px; border-radius: 12px; border: 0; background: var(--superficie-3); color: var(--texto-3); display: grid; place-items: center; cursor: pointer; transition: background 0.15s, color 0.15s; }
  .hecha-btn.activo { background: var(--primario); color: var(--sobre-primario); }
  .repetir { display: inline-flex; align-items: center; gap: 6px; min-height: 36px; margin: -4px 0 8px; padding: 0 12px; border: 0; border-radius: 10px; background: var(--primario-claro); color: var(--primario-fuerte); font: inherit; font-weight: 700; font-size: 0.78rem; cursor: pointer; }
  .serie-acciones { display: flex; justify-content: space-between; }
  .quitar-ult { color: var(--texto-3); }
  .serie .n { font-weight: 800; color: var(--texto-3); font-size: 0.8rem; }
  .serie input { width: 100%; min-height: 42px; padding: 6px; border-radius: 12px; border: 1px solid var(--borde); background: var(--superficie); color: var(--texto); font: inherit; font-weight: 700; text-align: center; font-variant-numeric: tabular-nums; }
  .serie i { font-style: normal; font-size: 0.78rem; color: var(--texto-2); font-weight: 600; }
  .ej .enlace { margin: 2px 0 10px; }
</style>
