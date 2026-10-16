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
    {#each diasSemana as f (f)}
      {@const ses = semana.sesiones.filter((s) => s.fecha === f)}
      <div class="dia" class:hoy={f === hoy}>
        <div class="dia-cab"><b>{capital(diaSemana(f))}</b><small>{fechaCorta(f)}{f === hoy ? ' · hoy' : ''}{plan.diasCarga.includes(f) ? ' · carga de hidratos' : ''}</small></div>
        {#each ses as s (s.id)}
          <TarjetaSesion sesion={s} registro={registros[s.id]} />
        {:else}
          <div class="descanso"><Icono e="😌" tam={18} /> Descanso{f < hoy ? '' : ': camina, estira y duerme bien'}</div>
        {/each}
      </div>
    {/each}
  </div>
{/if}

<style>
  .cuenta { display: flex; align-items: center; gap: 10px; padding: 12px 16px; border-radius: 18px; background: var(--hero); color: #fff; font-weight: 800; margin-bottom: 12px; box-shadow: var(--sombra-fuerte); }
  .nav-semana { display: flex; align-items: center; gap: 10px; }
  .nav-semana button { width: 42px; height: 42px; border-radius: 50%; border: 0; background: var(--superficie); box-shadow: var(--sombra); font-size: 1.5rem; font-weight: 800; cursor: pointer; color: var(--texto); }
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
  .dia { display: grid; gap: 8px; }
  .dia.hoy { padding: 10px; margin: 0 -10px; border-radius: 22px; background: color-mix(in srgb, var(--primario-claro) 55%, transparent); }
  .dia-cab { display: flex; align-items: baseline; gap: 8px; }
  .dia-cab small { color: var(--texto-2); font-weight: 700; }
  .descanso { padding: 12px 14px; border-radius: 16px; border: 2px dashed var(--borde); color: var(--texto-2); font-weight: 700; font-size: 0.88rem; }
</style>
