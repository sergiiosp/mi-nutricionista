<script>
  // Registrar cómo fue una sesión: estado, duración, RPE, sensaciones y marcas según el tipo
  import { get } from 'svelte/store';
  import Emoji from './Emoji.svelte';
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
  const CARAS = ['😴', '😌', '🙂', '😊', '😐', '😅', '😤', '😰', '🥵', '💀'];

  function guardar() {
    const datos = { estado: situacion, duracion: Number(duracion) || null, rpe: situacion === 'no' ? null : Number(rpe), sensacion, notas: notas.trim() };
    if (['series', 'umbral'].includes(s.tipo) && aSegundos(ritmo)) datos.ritmo = aSegundos(ritmo);
    if (['rodaje', 'largo'].includes(s.tipo) && Number(distancia) > 0) datos.distancia = Number(String(distancia).replace(',', '.'));
    if (['simulacro', 'compromised', 'estaciones', 'carrera'].includes(s.tipo) && aSegundos(tiempo)) datos.tiempo = aSegundos(tiempo);
    if (s.tipo === 'fuerza' && Number(peso) > 0) datos.peso = Number(peso);
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
      <label class="campo"><span>Ritmo medio de las series (min/km)</span><input bind:value={ritmo} placeholder="4:55" inputmode="numeric" /></label>
    {:else if ['rodaje', 'largo'].includes(s.tipo)}
      <label class="campo"><span>Distancia (km)</span><input type="number" step="0.1" bind:value={distancia} inputmode="decimal" placeholder={String(s.distancia || '')} /></label>
    {:else if s.tipo === 'fuerza'}
      <label class="campo"><span>Peso en la sentadilla (kg)</span><input type="number" step="2.5" bind:value={peso} inputmode="decimal" /></label>
    {/if}
    {#if ['simulacro', 'compromised', 'estaciones', 'carrera'].includes(s.tipo)}
      <label class="campo"><span>Tiempo total (mm:ss o h:mm:ss)</span><input bind:value={tiempo} placeholder={s.tipo === 'carrera' ? '1:25:00' : '45:00'} inputmode="numeric" /></label>
    {/if}
    {#if conEstaciones}
      <p class="pie-nota">Tiempo de cada estación (opcional): mejora tu estimación de carrera.</p>
      <div class="estaciones">
        {#each estacionesSesion as est (est.id)}
          <label class="campo"><span>{est.emoji} {est.nombre}</span><input bind:value={tiemposEst[est.id]} placeholder="4:30" inputmode="numeric" /></label>
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
  .estaciones .campo { margin: 6px 0; }
  .estaciones .campo span { font-size: 0.8rem; }
  .ancho { width: 100%; margin-top: 6px; }
</style>
