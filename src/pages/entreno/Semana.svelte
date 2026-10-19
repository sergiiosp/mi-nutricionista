<script>
  import Icono from '../../components/Icono.svelte';
  import Emoji from '../../components/Emoji.svelte';
  import TarjetaSesion from '../../components/TarjetaSesion.svelte';
  import { estado } from '../../stores/estado.js';
  import { planDe } from '../../lib/hyrox/index.js';
  import { semanaDe, FASES } from '../../lib/hyrox/plan.js';
  import { hoyISO, sumarDias } from '../../lib/planificador.js';
  import { diaSemana, fechaCorta, capital } from '../../lib/formato.js';

  const hoy = hoyISO();
  const plan = $derived(planDe($estado));
  const actual = $derived(plan ? (semanaDe(plan, hoy)?.w ?? (hoy < plan.inicio ? 0 : plan.N - 1)) : 0);
  let sel = $state(null);
  const w = $derived(sel ?? actual);
  const semana = $derived(plan?.semanas[w]);
  const registros = $derived($estado.hyrox?.registros || {});
  const diasSemana = $derived(semana ? Array.from({ length: 7 }, (_, i) => sumarDias(semana.lunes, i)) : []);
  const hechas = $derived(semana ? semana.sesiones.filter((s) => registros[s.id]?.estado === 'completa').length : 0);
  // Lo ya pasado de la semana en curso se pliega en una línea: lo importante es hoy y lo que viene
  let verPasados = $state(false);
  const pasados = $derived(w === actual ? diasSemana.filter((f) => f < hoy) : []);
  const sesPasadas = $derived(semana ? semana.sesiones.filter((s) => pasados.includes(s.fecha) && s.tipo !== 'carrera') : []);
  const hechasPasadas = $derived(sesPasadas.filter((s) => ['completa', 'parcial'].includes(registros[s.id]?.estado)).length);
  const visibles = $derived(verPasados ? diasSemana : diasSemana.filter((f) => !pasados.includes(f)));
  // El consejo de descanso solo una vez (el primer día libre que queda), no en cada día
  const primerDescanso = $derived(visibles.find((f) => f >= hoy && semana && !semana.sesiones.some((s) => s.fecha === f)));
  const diasCarrera = $derived(plan?.carrera ? Math.round((new Date(`${plan.carrera}T12:00`) - new Date(`${hoy}T12:00`)) / 86400000) : null);
</script>

{#if plan && semana}
  {#if diasCarrera !== null && diasCarrera >= 0}
    <div class="cuenta"><Emoji e="🏁" tam={30} /><span>{diasCarrera === 0 ? '¡Hoy es tu HYROX!' : `Faltan ${diasCarrera} días para tu HYROX`}</span></div>
  {/if}

  <div class="nav-semana">
    <button aria-label="Semana anterior" disabled={w === 0} onclick={() => (sel = w - 1)}>‹</button>
    <div class="info">
      <b>Semana {w + 1} de {plan.N}</b>
      <small>{fechaCorta(semana.lunes)} – {fechaCorta(sumarDias(semana.lunes, 6))}</small>
    </div>
    <button aria-label="Semana siguiente" disabled={w === plan.N - 1} onclick={() => (sel = w + 1)}>›</button>
  </div>

  <div class="fase" style="--c:{FASES[semana.fase].color}">
    <span class="punto"></span>
    <div><b>Fase: {FASES[semana.fase].nombre}{semana.deload ? ' · semana de descarga' : ''}</b><small>{semana.deload ? 'Menos volumen para asimilar el trabajo y recuperar.' : FASES[semana.fase].desc}</small></div>
    <span class="progreso">{hechas}/{semana.sesiones.filter((s) => s.tipo !== 'carrera').length}</span>
  </div>

  {#if semana.ajuste?.motivo}
    <div class="ajuste"><Emoji e="🧠" tam={26} /><span><b>Tu entrenador ha ajustado esta semana</b>{semana.ajuste.motivo}</span></div>
  {/if}

  <div class="dias">
    {#if pasados.length}
      <button class="pasados" class:abierto={verPasados} onclick={() => (verPasados = !verPasados)} aria-expanded={verPasados}>
        <span class="p-txt"><b>{capital(diaSemana(pasados[0]))}{pasados.length > 1 ? ` a ${diaSemana(pasados.at(-1))}` : ''}</b><small>{sesPasadas.length ? `${hechasPasadas} de ${sesPasadas.length} sesiones hechas` : 'Descanso'}{sesPasadas.length - hechasPasadas > 0 ? ' · toca para registrarlas' : ''}</small></span>
        <Icono n={verPasados ? 'chevron-up' : 'chevron-down'} tam={18} />
      </button>
    {/if}
    {#each visibles as f (f)}
      {@const ses = semana.sesiones.filter((s) => s.fecha === f)}
      <div class="dia" class:hoy={f === hoy} class:libre={!ses.length}>
        <div class="dia-cab"><b>{capital(diaSemana(f))}</b><small>{fechaCorta(f)}{f === hoy ? ' · hoy' : ''}{plan.diasCarga.includes(f) ? ' · carga de hidratos' : ''}</small>
          {#if !ses.length}<span class="descanso"><Icono n="moon" tam={14} /> Descanso</span>{/if}</div>
        {#each ses as s (s.id)}
          <TarjetaSesion sesion={s} registro={registros[s.id]} />
        {/each}
        {#if !ses.length && f === primerDescanso}<p class="consejo-descanso">Camina, estira y duerme bien: hoy también cuenta.</p>{/if}
      </div>
    {/each}
  </div>
{/if}

<style>
  .cuenta { display: flex; align-items: center; gap: 10px; padding: 12px 16px; border-radius: 18px; background: var(--hero); color: #fff; font-weight: 800; margin-bottom: 12px; box-shadow: var(--sombra-fuerte); }
  .nav-semana { display: flex; align-items: center; gap: 10px; }
  .nav-semana button { width: 44px; height: 44px; border-radius: 50%; border: 0; background: var(--superficie); box-shadow: var(--sombra); font-size: 1.5rem; font-weight: 800; cursor: pointer; color: var(--texto); }
  .nav-semana button:disabled { opacity: 0.3; cursor: default; }
  .info { flex: 1; text-align: center; display: grid; }
  .info small { color: var(--texto-2); font-weight: 700; }
  .fase { display: flex; align-items: center; gap: 12px; margin: 12px 0; padding: 12px 14px; border-radius: 18px; background: var(--superficie); box-shadow: var(--sombra); }
  .fase .punto { width: 14px; height: 14px; border-radius: 50%; background: var(--c); flex-shrink: 0; }
  .fase div { flex: 1; display: grid; }
  .fase small { color: var(--texto-2); font-weight: 600; font-size: 0.82rem; }
  .progreso { font-weight: 800; font-size: 1.1rem; color: var(--primario-fuerte); }
  .ajuste { display: flex; gap: 10px; align-items: flex-start; padding: 12px 14px; border-radius: 18px; background: var(--lila-claro); margin-bottom: 12px; font-size: 0.9rem; font-weight: 600; }
  .ajuste b { display: block; }
  .dias { display: grid; gap: 14px; }
  .pasados { display: flex; align-items: center; gap: 12px; min-height: 56px; padding: 10px 14px; border: 0; border-radius: 16px; background: var(--superficie); box-shadow: var(--sombra); color: var(--texto); font: inherit; text-align: left; cursor: pointer; }
  .pasados > :global(svg) { color: var(--texto-3); flex-shrink: 0; }
  .p-txt { flex: 1; display: grid; }
  .p-txt small { color: var(--texto-2); font-weight: 600; font-size: 0.8rem; }
  .dia { display: grid; gap: 8px; }
  .dia.hoy { padding: 12px; margin: 0 -12px; border-radius: 22px; background: radial-gradient(120% 90% at 0% 0%, var(--tinte), transparent 70%), color-mix(in srgb, var(--primario-claro) 50%, transparent); }
  .dia-cab { display: flex; align-items: baseline; gap: 8px; }
  .dia-cab small { color: var(--texto-2); font-weight: 700; }
  /* Día libre: una línea tranquila en la cabecera del día, sin caja */
  .descanso { margin-left: auto; display: inline-flex; align-items: center; gap: 5px; color: var(--texto-3); font-weight: 600; font-size: 0.8rem; }
  .consejo-descanso { margin: -2px 0 0; color: var(--texto-3); font-size: 0.8rem; }
</style>
