<script>
  // Progreso → Cómo vas: tres anillos (días en tus kcal, días llegando a la proteína, entrenos hechos),
  // las kcal de cada día, lo que dice tu nutricionista y tu repaso de la semana.
  import Icono from '../../components/Icono.svelte';
  import Anillos from '../../components/Anillos.svelte';
  import Numero from '../../components/Numero.svelte';
  import RepasoSemanal from '../../components/RepasoSemanal.svelte';
  import { abrirHoja } from '../../stores/ui.js';
  import { estado } from '../../stores/estado.js';
  import { calcularObjetivos } from '../../lib/nutricion.js';
  import { hoyISO } from '../../lib/planificador.js';
  import { resumenSemanal } from '../../lib/logros.js';
  import { planDe } from '../../lib/hyrox/index.js';
  import { semanaDe } from '../../lib/hyrox/plan.js';
  import { estadoRevision } from '../../lib/revision.js';
  import { diaCorto, entero, fechaCorta } from '../../lib/formato.js';

  const hoy = hoyISO();
  const objetivos = $derived(calcularObjetivos($estado.perfil));
  const s = $derived(resumenSemanal($estado, objetivos, hoy));
  const META = 6; // días de 7: uno de margen
  const entrenos = $derived.by(() => {
    const plan = planDe($estado);
    const sem = plan ? semanaDe(plan, hoy) : null;
    if (!sem) return null;
    const ses = sem.sesiones.filter((x) => x.tipo !== 'carrera');
    return { hechas: ses.filter((x) => ['completa', 'parcial'].includes($estado.hyrox?.registros?.[x.id]?.estado)).length, total: ses.length };
  });
  const COLORES = { kcal: 'var(--dato-kcal)', p: 'var(--dato-p)', e: 'var(--dato-e)' };
  const anillos = $derived([
    { valor: s.diasKcal, meta: META, color: COLORES.kcal },
    { valor: s.diasProteina, meta: META, color: COLORES.p },
    ...(entrenos ? [{ valor: entrenos.hechas, meta: entrenos.total, color: COLORES.e }] : []),
  ]);

  const rev = $derived(estadoRevision($estado, hoy));
  const maxKcal = $derived(Math.max(...s.porDia.map((d) => Math.max(d.r?.m.kcal || 0, d.r?.od.kcal || objetivos.kcal))) * 1.05);
</script>

<!-- Anillos de la semana -->
<section class="semana" aria-label="Tu semana">
  <div class="anillos-fila">
    <Anillos {anillos} />
    <ul class="leyenda">
      <li style="--c:{COLORES.kcal}"><small>Kcal en objetivo</small><b class="cifra"><Numero valor={s.diasKcal} desde={0} /><span>/{META} días</span></b></li>
      <li style="--c:{COLORES.p}"><small>Proteína</small><b class="cifra"><Numero valor={s.diasProteina} desde={0} /><span>/{META} días</span></b></li>
      {#if entrenos}<li style="--c:{COLORES.e}"><small>Entrenos</small><b class="cifra"><Numero valor={entrenos.hechas} desde={0} /><span>/{entrenos.total}</span></b></li>{/if}
    </ul>
  </div>
</section>

{#if s.porDia.some((d) => d.r)}
  <section class="tarjeta dias" aria-label="Calorías por día">
    <div class="d-cab"><b>Cada día</b><span class="d-ley"><i class="ok"></i>en objetivo <i class="pr"></i>proteína</span></div>
    <div class="barras" role="img" aria-label="Calorías de cada día frente a tu objetivo">
      {#each s.porDia as d (d.fecha)}
        {@const v = d.r?.m.kcal || 0}
        {@const obj = d.r?.od.kcal || objetivos.kcal}
        <div class="col" class:hoy={d.fecha === hoy}>
          <div class="zona">
            <div class="meta" style="height:{(obj / maxKcal) * 100}%"></div>
            <div class="barra" class:ok={d.r?.kcalOk} class:sin={!d.r} style="height:{(v / maxKcal) * 100}%"></div>
          </div>
          <span class="punto" class:pr={d.r?.proteinaOk}></span>
          <small>{d.fecha === hoy ? 'hoy' : diaCorto(d.fecha)}</small>
        </div>
      {/each}
    </div>
  {#if s.diasRegistrados}
    <ul class="medias">
      <li>
        <span><small>Kcal de media</small><b class="cifra">{entero(s.kcal)}</b></span>
        <div class="m-pista"><i style="width:{Math.min(100, (s.kcal / s.objetivoKcal) * 100)}%;background:{COLORES.kcal}"></i></div>
        <small class="m-obj">de {entero(s.objetivoKcal)}</small>
      </li>
      <li>
        <span><small>Proteína de media</small><b class="cifra">{Math.round(s.p)} g</b></span>
        <div class="m-pista"><i style="width:{Math.min(100, (s.p / s.objetivoP) * 100)}%;background:{COLORES.p}"></i></div>
        <small class="m-obj">de {Math.round(s.objetivoP)} g</small>
      </li>
    </ul>
  {:else}
    <p class="pie-nota sin-medias"><Icono n="calendar-days" tam={15} /> Las medias salen con los días ya terminados: mañana verás la de hoy.</p>
  {/if}
  </section>
{:else}
  <div class="tarjeta vacia-semana"><Icono n="chart-column" tam={26} /><p>Cuando registres tus comidas verás aquí tus calorías y tu proteína de cada día.</p></div>
{/if}

<div class="tarjeta consejos">
  <div class="cab"><span class="ic-cab"><Icono n="lightbulb" tam={18} /></span><b>Tu nutricionista dice</b></div>
  {#each s.consejos as c (c)}<p>{c}</p>{/each}
</div>

<RepasoSemanal />

<section class="herramientas" aria-label="Herramientas">
  <button class:toca={rev.toca} onclick={() => abrirHoja('revision')}><Icono n="clipboard-list" tam={20} /><b>Revisión del mes</b><small>{rev.enCurso ? 'A medias' : rev.toca ? 'Toca ya' : `Próxima: ${fechaCorta(rev.proxima)}`}</small></button>
  <button onclick={() => abrirHoja('tuPlan')}><Icono n="sparkles" tam={20} /><b>Tu semana, explicada</b><small>Por qué tus números</small></button>
  <button onclick={() => abrirHoja('informe')}><Icono n="scroll-text" tam={20} /><b>Informe del mes</b><small>En PDF, con fotos</small></button>
</section>

<style>
  /* Anillos */
  .semana { margin-bottom: 12px; padding: 18px; border-radius: var(--r-xl); background: radial-gradient(120% 100% at 0% 0%, var(--halo), transparent 60%), var(--superficie); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--primario) 18%, transparent); }
  .anillos-fila { display: flex; align-items: center; gap: 18px; }
  .leyenda { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; min-width: 0; }
  .leyenda li { display: grid; }
  .leyenda small { display: inline-flex; align-items: center; gap: 6px; font-size: 0.74rem; font-weight: 700; color: var(--texto-2); }
  .leyenda small::before { content: ""; width: 8px; height: 8px; border-radius: 50%; background: var(--c); }
  .leyenda b { font-size: 1.45rem; line-height: 1.05; color: var(--c); }
  .leyenda b span { font-size: 0.8rem; font-weight: 700; color: var(--texto-3); margin-left: 2px; }

  .herramientas { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 12px; }
  .herramientas button { display: grid; justify-items: start; align-content: start; gap: 2px; min-height: 96px; padding: 12px 13px; border: 0; border-radius: var(--r-l); background: var(--superficie); box-shadow: var(--sombra); color: var(--texto); font: inherit; text-align: left; cursor: pointer; }
  .herramientas button > :global(svg) { margin-bottom: 6px; color: var(--primario); }
  .herramientas b { font-size: 0.88rem; line-height: 1.2; }
  .herramientas small { font-size: 0.74rem; color: var(--texto-2); }
  .herramientas .toca { box-shadow: inset 0 0 0 1.5px var(--primario); background: var(--primario-claro); }
  .herramientas .toca small { color: var(--primario-fuerte); font-weight: 700; }
  /* Cada día */
  .d-cab { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
  .d-ley { display: inline-flex; align-items: center; gap: 6px; font-size: 0.72rem; font-weight: 600; color: var(--texto-3); }
  .d-ley i { width: 8px; height: 8px; border-radius: 50%; margin-left: 6px; }
  .d-ley i.ok { background: var(--dato-kcal); }
  .d-ley i.pr { background: var(--coral); }
  .barras { display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px; height: 150px; margin-top: 14px; }
  .col { display: grid; grid-template-rows: 1fr auto auto; justify-items: center; gap: 5px; }
  .zona { position: relative; width: 100%; height: 100%; }
  .meta, .barra { position: absolute; bottom: 0; left: 18%; right: 18%; border-radius: var(--r-xs); }
  .meta { background: var(--superficie-2); }
  .barra { background: color-mix(in srgb, var(--dato-kcal) 45%, var(--superficie-3)); min-height: 4px; transition: height 0.5s var(--ease-out); }
  .barra.ok { background: var(--dato-kcal); }
  .barra.sin { background: none; }
  .col.hoy .meta { box-shadow: inset 0 0 0 1.5px color-mix(in srgb, var(--primario) 60%, transparent); }
  .punto { width: 7px; height: 7px; border-radius: 50%; background: var(--superficie-3); }
  .punto.pr { background: var(--coral); }
  .col small { font-weight: 700; color: var(--texto-3); font-size: 0.7rem; }
  .col.hoy small { color: var(--primario-fuerte); }

  /* Medias */
  .medias { list-style: none; display: grid; gap: 14px; margin: 16px 0 0; padding: 14px 0 0; border-top: 1px solid var(--linea); }
  .medias li { display: grid; grid-template-columns: 1fr auto; align-items: end; gap: 6px 10px; }
  .medias span { display: grid; }
  .medias span small, .m-obj { font-size: 0.74rem; font-weight: 600; color: var(--texto-2); }
  .medias b { font-size: 1.3rem; }
  .m-pista { grid-column: 1 / -1; grid-row: 2; height: 6px; border-radius: 999px; background: var(--superficie-3); overflow: hidden; }
  .m-pista i { display: block; height: 100%; border-radius: 999px; }
  .m-obj { padding-bottom: 3px; }
  .sin-medias { display: flex; align-items: center; gap: 8px; margin: 12px 0 0; }

  .consejos .cab { display: flex; align-items: center; gap: 10px; color: var(--primario); }
  .vacia-semana { display: flex; gap: 12px; align-items: center; color: var(--primario); }
  .vacia-semana p { margin: 0; color: var(--texto-2); font-size: 0.88rem; }
  .ic-cab { display: grid; place-items: center; width: 34px; height: 34px; border-radius: var(--r-s); background: var(--primario-claro); }
  .consejos .cab b { color: var(--texto); }
  .consejos p { margin: 8px 0 0; font-weight: 500; font-size: 0.88rem; color: var(--texto-2); }
</style>
