<script>
  import Emoji from './Emoji.svelte';
  import { estado } from '../stores/estado.js';
  import { abrirHoja, avisar } from '../stores/ui.js';
  import { planDe, proveedorDe } from '../lib/hyrox/index.js';
  import { calcularObjetivos, metaDia } from '../lib/nutricion.js';
  import { moverSesion, borrarRegistroSesion } from '../lib/acciones.js';
  import { hoyISO, sumarDias } from '../lib/planificador.js';
  import { mmss } from '../lib/hyrox/ritmos.js';
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
  const ESTADO = { completa: '✓ Completada', parcial: '◐ A medias', no: '✕ No la hice' };
  const SENS = { bien: '😀 Bien', normal: '😐 Normal', mal: '😫 Mal' };

  function mover(f) {
    moverSesion(s.id, f, s.fechaOriginal);
    moviendo = false;
    avisar(`Movida al ${diaSemana(f)}`, '🔀');
  }
</script>

{#if s}
  <div class="cab c-{s.color}">
    <Emoji e={s.emoji} tam={64} />
    <div>
      <p class="sobre">{capital(fechaLarga(s.fecha))} · {s.hora}</p>
      <h2>{s.titulo}</h2>
      <div class="datos"><span>⏱️ {s.duracion} min</span>{#if s.distancia}<span>📍 {String(s.distancia).replace('.', ',')} km</span>{/if}<span>💥 RPE {s.rpe}/10</span></div>
    </div>
  </div>

  {#if reg}
    <div class="registro">
      <b>{ESTADO[reg.estado]}</b>{#if reg.rpe} · RPE {reg.rpe}{/if}{#if reg.sensacion} · {SENS[reg.sensacion]}{/if}
      {#if reg.tiempo}<br />⏱️ Tiempo: {mmss(reg.tiempo)}{/if}{#if reg.ritmo} · Ritmo medio {mmss(reg.ritmo)}/km{/if}{#if reg.distancia} · {reg.distancia} km{/if}{#if reg.peso} · {reg.peso} kg{/if}
      {#if reg.notas}<p>“{reg.notas}”</p>{/if}
      <div class="acciones-fila">
        <button class="boton boton-sec boton-peq" onclick={() => abrirHoja('registrarSesion', { id })}>✏️ Editar</button>
        <button class="boton boton-peligro boton-peq" onclick={() => borrarRegistroSesion(id)}>Borrar registro</button>
      </div>
    </div>
  {/if}

  {#if s.calentamiento.length}
    <h3>🔥 Calentamiento</h3>
    <ul class="lista">{#each s.calentamiento as l (l)}<li>{l}</li>{/each}</ul>
  {/if}
  {#each s.bloques as b (b.titulo)}
    <h3>💪 {b.titulo}</h3>
    <ul class="lista principal">{#each b.lineas as l, i (i)}<li>{l}</li>{/each}</ul>
  {/each}
  {#each s.notas as n (n)}<p class="nota">💡 {n}</p>{/each}
  {#if s.vueltaCalma.length}
    <h3>🧘 Vuelta a la calma</h3>
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
      {#if s.fecha <= hoy}<button class="boton" onclick={() => abrirHoja('registrarSesion', { id })}>📝 {reg ? 'Editar registro' : 'Registrar sesión'}</button>{/if}
      <button class="boton boton-sec" onclick={() => (moviendo = !moviendo)}>🔀 Mover de día</button>
    </div>
    {#if moviendo}
      <div class="mover">
        <p class="pie-nota">Elige otro día de esta semana. Si juntas dos sesiones duras seguidas, mejor separa la más intensa.</p>
        <div class="dias">
          {#each opcionesMover as f (f)}
            <button class:activo={f === s.fecha} onclick={() => mover(f)}><span>{diaCorto(f)}</span><b>{Number(f.slice(8))}</b>{#if (plan.porFecha[f] || []).some((x) => x.id !== s.id)}<i>⚠️</i>{/if}</button>
          {/each}
        </div>
        {#if s.fecha !== s.fechaOriginal}<button class="enlace" onclick={() => mover(s.fechaOriginal)}>Volver a su día original</button>{/if}
      </div>
    {/if}
  {/if}
{/if}

<style>
  .cab { display: flex; gap: 14px; align-items: center; padding: 16px; border-radius: 24px; background: var(--superficie-2); }
  .c-azul { background: var(--azul-claro); } .c-coral { background: var(--coral-claro); } .c-lila { background: var(--lila-claro); }
  .c-amarillo { background: var(--amarillo-claro); } .c-primario { background: var(--primario-claro); }
  .sobre { margin: 0; font-size: 0.78rem; font-weight: 800; color: var(--texto-2); }
  h2 { margin: 2px 0 6px; font-size: 1.3rem; }
  .datos { display: flex; flex-wrap: wrap; gap: 6px; }
  .datos span { padding: 3px 9px; border-radius: 999px; background: var(--superficie); font-weight: 800; font-size: 0.78rem; }
  .registro { margin-top: 12px; padding: 12px 14px; border-radius: 18px; background: var(--primario-claro); font-weight: 600; font-size: 0.9rem; }
  .registro p { margin: 6px 0 0; font-style: italic; }
  .lista { margin: 0; padding: 12px 14px 12px 32px; border-radius: 16px; background: var(--superficie); box-shadow: var(--sombra); display: grid; gap: 6px; font-weight: 600; font-size: 0.92rem; }
  .lista.principal { font-weight: 800; }
  .nota { padding: 10px 12px; border-radius: 14px; background: var(--amarillo-claro); font-size: 0.88rem; font-weight: 600; }
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
