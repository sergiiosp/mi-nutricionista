<script>
  import Icono from './Icono.svelte';
  import Emoji from './Emoji.svelte';
  import { estado } from '../stores/estado.js';
  import { abrirHoja, avisar } from '../stores/ui.js';
  import { planDe, proveedorDe } from '../lib/hyrox/index.js';
  import { calcularObjetivos, metaDia } from '../lib/nutricion.js';
  import { moverSesion, borrarRegistroSesion, alternarSinGym } from '../lib/acciones.js';
  import { TIPOS } from '../lib/hyrox/sesiones.js';
  import { hoyISO, sumarDias } from '../lib/planificador.js';
  import { mmss } from '../lib/hyrox/ritmos.js';
  import { EJERCICIOS } from '../data/hyrox.js';
  import { diaSemana, diaCorto, fechaLarga, capital, entero } from '../lib/formato.js';

  let { id } = $props();
  const hoy = hoyISO();
  const plan = $derived(planDe($estado));
  const s = $derived(plan?.sesiones.find((x) => x.id === id));
  const reg = $derived($estado.hyrox?.registros?.[id]);
  const meta = $derived(s ? metaDia(calcularObjetivos($estado.perfil), proveedorDe($estado)?.(s.fecha) || []) : null);
  const semana = $derived(s ? plan.semanas[s.semana] : null);
  const opcionesMover = $derived(semana ? Array.from({ length: 7 }, (_, i) => sumarDias(semana.lunes, i)).filter((f) => f >= hoy && (!plan.carrera || f < plan.carrera)) : []);
  let moviendo = $state(false);
  const ESTADO = { completa: 'Completada', parcial: 'A medias', no: 'No la hice' };
  const SENS = { bien: 'Bien', normal: 'Normal', mal: 'Mal' };

  // Las sesiones de fuerza y de estaciones se pueden hacer sin gimnasio
  const sinGymPosible = $derived(s && ['fuerza', 'hyrox'].includes(TIPOS[s.tipo]?.clase) && !['carrera', 'activacion'].includes(s.tipo));
  function sinGym() {
    const ahora = alternarSinGym(s.id);
    avisar(ahora ? 'Sesión cambiada: sin máquinas, con peso corporal y una cuesta' : 'Vuelve la sesión de gimnasio', ahora ? '🏃' : '🏋️');
  }

  function mover(f) {
    moverSesion(s.id, f, s.fechaOriginal);
    moviendo = false;
    avisar(`Movida al ${diaSemana(f)}`, '🔀');
  }
  // «Sentadilla con barra: 4 × 8» → nombre a la izquierda y series × reps a la derecha
  function partir(l) {
    const i = l.indexOf(': ');
    return i > 0 && i < 60 ? [l.slice(0, i), l.slice(i + 2)] : [l, ''];
  }
</script>

{#if s}
  <div class="cab c-{s.color}">
    <Emoji e={s.emoji} tam={64} />
    <div>
      <h2>{s.titulo}</h2>
      <p class="sobre">{capital(fechaLarga(s.fecha))} · {s.hora}</p>
      <div class="datos"><span><Icono e="⏱️" tam={18} /> {s.duracion} min</span>{#if s.distancia}<span><Icono e="📍" tam={18} /> {String(s.distancia).replace('.', ',')} km</span>{/if}<span><Icono e="💥" tam={18} /> Esfuerzo {s.rpe}/10</span></div>
    </div>
  </div>

  {#if reg}
    <div class="registro">
      <b>{ESTADO[reg.estado]}</b>{#if reg.rpe} · RPE {reg.rpe}{/if}{#if reg.sensacion} · {SENS[reg.sensacion]}{/if}
      {#if reg.tiempo}<br /><Icono e="⏱️" tam={18} /> Tiempo: {mmss(reg.tiempo)}{/if}{#if reg.ritmo} · Ritmo medio {mmss(reg.ritmo)}/km{/if}{#if reg.distancia} · {reg.distancia} km{/if}{#if reg.peso} · {reg.peso} kg{/if}
      {#if reg.series}
        <ul class="cargas">
          {#each Object.entries(reg.series) as [ej, l] (ej)}
            <li><span>{EJERCICIOS[ej]?.nombre || ej}</span><b>{l.map((x) => `${String(x.kg).replace('.', ',')}×${x.reps}`).join('  ')}</b></li>
          {/each}
        </ul>
      {/if}
      {#if reg.notas}<p>“{reg.notas}”</p>{/if}
      <div class="acciones-fila">
        <button class="boton boton-sec boton-peq" onclick={() => abrirHoja('registrarSesion', { id })}><Icono e="✏️" tam={18} /> Editar</button>
        <button class="boton boton-peligro boton-peq" onclick={() => borrarRegistroSesion(id)}>Borrar registro</button>
      </div>
    </div>
  {/if}

  {#if s.calentamiento.length}
    <h3><Icono e="🔥" tam={18} /> Calentamiento</h3>
    <ul class="lista">{#each s.calentamiento as l (l)}<li>{l}</li>{/each}</ul>
  {/if}
  {#each s.bloques as b (b.titulo)}
    <h3><Icono e="💪" tam={18} /> {b.titulo}</h3>
    <ul class="ejercicios">
      {#each b.lineas as l, i (i)}
        {@const [n, d] = partir(l)}
        <li><span>{n}</span>{#if d}<b class="cifra">{d}</b>{/if}</li>
      {/each}
    </ul>
  {/each}
  {#each s.notas as n (n)}<p class="nota"><Icono e="💡" tam={18} /> {n}</p>{/each}
  {#if s.vueltaCalma.length}
    <h3><Icono e="🧘" tam={18} /> Vuelta a la calma</h3>
    <ul class="lista">{#each s.vueltaCalma as l (l)}<li>{l}</li>{/each}</ul>
  {/if}

  {#if meta}
    <div class="comida">
      <Emoji e="🍝" tam={32} />
      <div><b>Tu comida este día</b><small>{entero(meta.kcal)} kcal · {meta.hidratos} g de hidratos · {meta.proteina} g de proteína. Tu menú ya lo tiene en cuenta, con comida pre y post-entreno.</small></div>
    </div>
  {/if}

  {#if s.tipo !== 'carrera'}
    <div class="botones">
      {#if s.fecha <= hoy}<button class="boton" onclick={() => abrirHoja('registrarSesion', { id })}><Icono e="📝" tam={18} /> {reg ? 'Editar registro' : 'Registrar sesión'}</button>{/if}
      <button class="boton boton-sec" onclick={() => (moviendo = !moviendo)}><Icono e="🔀" tam={18} /> Mover de día</button>
    </div>
    {#if sinGymPosible}
      <label class="interruptor sin-gym"><input type="checkbox" checked={!!s.sinGym} onchange={sinGym} />
        <span><b>Hoy no puedo ir al gimnasio</b><small>Te cambio la sesión por una de peso corporal, parque y cuestas</small></span></label>
    {/if}
    {#if moviendo}
      <div class="mover">
        <p class="pie-nota">Elige otro día de esta semana. Si juntas dos sesiones duras seguidas, mejor separa la más intensa.</p>
        <div class="dias">
          {#each opcionesMover as f (f)}
            <button class:activo={f === s.fecha} onclick={() => mover(f)}><span>{diaCorto(f)}</span><b>{Number(f.slice(8))}</b>{#if (plan.porFecha[f] || []).some((x) => x.id !== s.id)}<i><Icono e="⚠️" tam={18} /></i>{/if}</button>
          {/each}
        </div>
        {#if s.fecha !== s.fechaOriginal}<button class="enlace" onclick={() => mover(s.fechaOriginal)}>Volver a su día original</button>{/if}
      </div>
    {/if}
  {/if}
{/if}

<style>
  /* Cabecera en el color del tipo de sesión, como la portada de Entreno */
  .cab { --c: var(--lila); display: flex; gap: 14px; align-items: center; padding: 18px 56px 18px 16px; border-radius: 24px; color: #fff;
    background: radial-gradient(130% 90% at 100% 0%, color-mix(in srgb, var(--c) 50%, transparent), transparent 60%),
      linear-gradient(160deg, color-mix(in srgb, var(--c) 40%, #121218), color-mix(in srgb, var(--c) 14%, #0b0b0e)); }
  .c-azul { --c: var(--azul); } .c-coral { --c: var(--coral); } .c-lila { --c: var(--lila); }
  .c-amarillo { --c: var(--amarillo); } .c-primario { --c: var(--primario); } .c-gris { --c: var(--texto-3); }
  .cab .sobre { color: rgb(255 255 255 / 0.72); }
  .cab .datos span { background: rgb(255 255 255 / 0.14); color: #fff; }
  .sobre { margin: 0 0 8px; font-size: 0.82rem; font-weight: 600; color: var(--texto-2); }
  h2 { margin: 0 0 2px; font-size: 1.3rem; line-height: 1.2; }
  .datos { display: flex; flex-wrap: wrap; gap: 6px; }
  .datos span { padding: 3px 9px; border-radius: 999px; background: var(--superficie); font-weight: 800; font-size: 0.78rem; }
  .registro { margin-top: 12px; padding: 12px 14px; border-radius: 18px; background: var(--primario-claro); font-weight: 600; font-size: 0.9rem; }
  .registro p { margin: 6px 0 0; font-style: italic; }
  .cargas { list-style: none; margin: 8px 0 0; padding: 0; display: grid; gap: 4px; font-size: 0.82rem; }
  .cargas li { display: flex; justify-content: space-between; gap: 10px; }
  .cargas span { color: var(--texto-2); font-weight: 600; }
  .cargas b { font-variant-numeric: tabular-nums; white-space: nowrap; }
  .lista { margin: 0; padding: 12px 14px 12px 32px; border-radius: 16px; background: var(--superficie); box-shadow: var(--sombra); display: grid; gap: 6px; font-weight: 500; font-size: 0.92rem; color: var(--texto-2); }
  /* Ejercicios: filas con el nombre y las series × reps alineadas, en cifras */
  .ejercicios { list-style: none; margin: 0; padding: 2px 14px; border-radius: 16px; background: var(--superficie); box-shadow: var(--sombra); }
  .ejercicios li { display: flex; justify-content: space-between; align-items: baseline; gap: 14px; padding: 11px 0; font-size: 0.92rem; }
  .ejercicios li + li { border-top: 1px solid var(--linea); }
  .ejercicios span { font-weight: 600; color: var(--texto); }
  .ejercicios b { flex-shrink: 0; max-width: 48%; text-align: right; font-weight: 700; color: var(--texto); }
  .nota { padding: 10px 12px; border-radius: 14px; background: var(--amarillo-claro); font-size: 0.88rem; font-weight: 500; }
  .comida { display: flex; gap: 12px; align-items: center; margin-top: 14px; padding: 12px 14px; border-radius: 18px; background: linear-gradient(135deg, var(--primario-claro), var(--superficie)); }
  .comida small { display: block; color: var(--texto-2); font-weight: 600; }
  .botones { display: flex; gap: 8px; margin-top: 16px; }
  .botones .boton { flex: 1; }
  .mover { margin-top: 10px; }
  .dias { display: flex; gap: 6px; flex-wrap: wrap; }
  .dias button { display: grid; justify-items: center; width: 52px; padding: 8px 0; border-radius: 14px; border: 2px solid transparent; background: var(--superficie); box-shadow: var(--sombra); cursor: pointer; font-weight: 700; color: var(--texto); }
  .dias button.activo { border-color: var(--primario); background: var(--primario-claro); }
  .dias i { font-style: normal; font-size: 0.7rem; }
</style>
