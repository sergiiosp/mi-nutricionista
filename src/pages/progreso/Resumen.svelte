<script>
  // Progreso → Semana: tres anillos (días en tus kcal, días llegando a la proteína, entrenos hechos),
  // el titular de cómo vas, las kcal de cada día y lo que dice tu nutricionista.
  import Icono from '../../components/Icono.svelte';
  import Anillos from '../../components/Anillos.svelte';
  import RepasoSemanal from '../../components/RepasoSemanal.svelte';
  import { estado } from '../../stores/estado.js';
  import { calcularObjetivos } from '../../lib/nutricion.js';
  import { hoyISO } from '../../lib/planificador.js';
  import { resumenSemanal, rachas } from '../../lib/logros.js';
  import { planDe } from '../../lib/hyrox/index.js';
  import { semanaDe } from '../../lib/hyrox/plan.js';
  import { diaCorto, entero, num } from '../../lib/formato.js';

  const hoy = hoyISO();
  const objetivos = $derived(calcularObjetivos($estado.perfil));
  const s = $derived(resumenSemanal($estado, objetivos, hoy));
  const r = $derived(rachas($estado, objetivos, hoy));
  const META = 6; // días de 7: uno de margen
  const entrenos = $derived.by(() => {
    const plan = planDe($estado);
    const sem = plan ? semanaDe(plan, hoy) : null;
    if (!sem) return null;
    const ses = sem.sesiones.filter((x) => x.tipo !== 'carrera');
    return { hechas: ses.filter((x) => ['completa', 'parcial'].includes($estado.hyrox?.registros?.[x.id]?.estado)).length, total: ses.length };
  });
  const COLORES = { kcal: '#b4e35a', p: 'var(--coral)', e: '#a08cff' };
  const anillos = $derived([
    { valor: s.diasKcal, meta: META, color: COLORES.kcal },
    { valor: s.diasProteina, meta: META, color: COLORES.p },
    ...(entrenos ? [{ valor: entrenos.hechas, meta: entrenos.total, color: COLORES.e }] : []),
  ]);

  // Titular: cómo va el peso según tu objetivo
  const titular = $derived.by(() => {
    const t = s.tendencia;
    if (!t) return { cifra: null, texto: 'Pésate una vez por semana y aquí verás si vas bien' };
    const k = t.kgSemana;
    const obj = $estado.perfil?.objetivo;
    const bien = obj === 'perder' ? k <= -0.15 && k >= -1 : obj === 'ganar' ? k >= 0.05 && k <= 0.45 : Math.abs(k) <= 0.4;
    const texto = bien ? (obj === 'recomposicion' || !obj ? 'peso estable: lo que buscas en recomposición' : 'al ritmo que toca') : obj === 'perder' && k > -0.15 ? 'casi no baja: revisa el picoteo' : 'se mueve más de lo previsto';
    return { cifra: `${k > 0 ? '+' : ''}${num(k, 2)} kg/sem`, texto, bien };
  });

  const maxKcal = $derived(Math.max(...s.porDia.map((d) => Math.max(d.r?.m.kcal || 0, d.r?.od.kcal || objetivos.kcal))) * 1.05);
</script>

<!-- Anillos de la semana -->
<section class="semana" aria-label="Tu semana">
  <div class="anillos-fila">
    <Anillos {anillos} />
    <ul class="leyenda">
      <li style="--c:{COLORES.kcal}"><small>Kcal en objetivo</small><b class="cifra">{s.diasKcal}<span>/{META} días</span></b></li>
      <li style="--c:{COLORES.p}"><small>Proteína</small><b class="cifra">{s.diasProteina}<span>/{META} días</span></b></li>
      {#if entrenos}<li style="--c:{COLORES.e}"><small>Entrenos</small><b class="cifra">{entrenos.hechas}<span>/{entrenos.total}</span></b></li>{/if}
    </ul>
  </div>
  <div class="titular" class:bien={titular.bien}>
    {#if titular.cifra}<b class="cifra">{titular.cifra}</b>{/if}
    <span>{titular.texto}</span>
  </div>
  {#if r.registro > 1}<p class="racha"><Icono n="flame" tam={15} grosor={2.2} /> {r.registro} días seguidos apuntando</p>{/if}
</section>

<RepasoSemanal />

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
  </section>

  {#if s.diasRegistrados}
    <ul class="tarjeta medias">
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
{:else}
  <div class="tarjeta vacia-semana"><Icono n="chart-column" tam={26} /><p>Cuando registres tus comidas verás aquí tus calorías y tu proteína de cada día.</p></div>
{/if}

<div class="tarjeta consejos">
  <div class="cab"><span class="ic-cab"><Icono n="lightbulb" tam={18} /></span><b>Tu nutricionista dice</b></div>
  {#each s.consejos as c (c)}<p>{c}</p>{/each}
</div>

<style>
  /* Anillos */
  .semana { margin-bottom: 12px; padding: 18px; border-radius: 26px; background: radial-gradient(120% 100% at 0% 0%, var(--halo), transparent 60%), var(--superficie); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--primario) 18%, transparent); }
  .anillos-fila { display: flex; align-items: center; gap: 18px; }
  .leyenda { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; min-width: 0; }
  .leyenda li { display: grid; }
  .leyenda small { display: inline-flex; align-items: center; gap: 6px; font-size: 0.74rem; font-weight: 700; color: var(--texto-2); }
  .leyenda small::before { content: ""; width: 8px; height: 8px; border-radius: 50%; background: var(--c); }
  .leyenda b { font-size: 1.45rem; line-height: 1.05; color: var(--c); }
  .leyenda b span { font-size: 0.8rem; font-weight: 700; color: var(--texto-3); margin-left: 2px; }
  .titular { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 10px; margin-top: 16px; padding-top: 14px; border-top: 1px solid var(--linea); }
  .titular b { font-size: 1.35rem; letter-spacing: -0.02em; }
  .titular.bien b { color: var(--primario-fuerte); }
  .titular span { font-size: 0.86rem; color: var(--texto-2); }
  .racha { display: flex; align-items: center; gap: 6px; margin: 10px 0 0; font-size: 0.8rem; font-weight: 700; color: var(--amarillo); }

  /* Cada día */
  .d-cab { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
  .d-ley { display: inline-flex; align-items: center; gap: 6px; font-size: 0.72rem; font-weight: 600; color: var(--texto-3); }
  .d-ley i { width: 8px; height: 8px; border-radius: 50%; margin-left: 6px; }
  .d-ley i.ok { background: #b4e35a; }
  .d-ley i.pr { background: var(--coral); }
  .barras { display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px; height: 150px; margin-top: 14px; }
  .col { display: grid; grid-template-rows: 1fr auto auto; justify-items: center; gap: 5px; }
  .zona { position: relative; width: 100%; height: 100%; }
  .meta, .barra { position: absolute; bottom: 0; left: 18%; right: 18%; border-radius: 8px; }
  .meta { background: var(--superficie-2); }
  .barra { background: color-mix(in srgb, #b4e35a 45%, var(--superficie-3)); min-height: 4px; transition: height 0.5s var(--ease-out); }
  .barra.ok { background: #b4e35a; }
  .barra.sin { background: none; }
  .col.hoy .meta { box-shadow: inset 0 0 0 1.5px color-mix(in srgb, var(--primario) 60%, transparent); }
  .punto { width: 7px; height: 7px; border-radius: 50%; background: var(--superficie-3); }
  .punto.pr { background: var(--coral); }
  .col small { font-weight: 700; color: var(--texto-3); font-size: 0.7rem; }
  .col.hoy small { color: var(--primario-fuerte); }

  /* Medias */
  .medias { list-style: none; display: grid; gap: 14px; }
  .medias li { display: grid; grid-template-columns: 1fr auto; align-items: end; gap: 6px 10px; }
  .medias span { display: grid; }
  .medias span small, .m-obj { font-size: 0.74rem; font-weight: 600; color: var(--texto-2); }
  .medias b { font-size: 1.3rem; }
  .m-pista { grid-column: 1 / -1; grid-row: 2; height: 6px; border-radius: 999px; background: var(--superficie-3); overflow: hidden; }
  .m-pista i { display: block; height: 100%; border-radius: 999px; }
  .m-obj { padding-bottom: 3px; }
  .sin-medias { display: flex; align-items: center; gap: 8px; }

  .consejos .cab { display: flex; align-items: center; gap: 10px; color: var(--primario); }
  .vacia-semana { display: flex; gap: 12px; align-items: center; color: var(--primario); }
  .vacia-semana p { margin: 0; color: var(--texto-2); font-size: 0.88rem; }
  .ic-cab { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 10px; background: var(--primario-claro); }
  .consejos .cab b { color: var(--texto); }
  .consejos p { margin: 8px 0 0; font-weight: 500; font-size: 0.88rem; color: var(--texto-2); }
</style>
