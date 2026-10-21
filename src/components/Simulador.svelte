<script>
  // ¿Y si…? Mueve tus kcal, tus sesiones o lo extra del fin de semana y mira dónde llegas (peso y grasa),
  // frente a lo que pasaría siguiendo tu plan. Las kcal se pueden aplicar al plan desde mañana.
  import Icono from './Icono.svelte';
  import { estado, actualizar, anotarDiario } from '../stores/estado.js';
  import { avisar, cerrarHoja } from '../stores/ui.js';
  import { baseSimulador, simular, avisosSimulacion, semanasHasta, fechaTras } from '../lib/simulador.js';
  import { reajustarPlan } from '../lib/acciones.js';
  import { hoyISO, sumarDias } from '../lib/planificador.js';
  import { fechaCorta, num, entero } from '../lib/formato.js';

  const hoy = hoyISO();
  const base = baseSimulador($estado, hoy);
  const HORIZONTES = [
    ...(base.carrera ? [{ id: 'carrera', n: `Carrera · ${fechaCorta(base.carrera)}`, s: semanasHasta(hoy, base.carrera) }] : []),
    { id: '4', n: '4 semanas', s: 4 },
    { id: '12', n: '12 semanas', s: 12 },
  ];
  let horizonte = $state(HORIZONTES[0].id);
  let kcal = $state(base.kcal);
  let sesiones = $state(base.sesiones);
  let extraFinde = $state(0);
  const semanas = $derived(HORIZONTES.find((h) => h.id === horizonte).s);
  const fechaFin = $derived(horizonte === 'carrera' ? base.carrera : fechaTras(hoy, semanas));

  const plan = $derived(simular(base, { kcal: base.kcal, sesiones: base.sesiones, extraFinde: 0, semanas }));
  const sim = $derived(simular(base, { kcal, sesiones, extraFinde, semanas }));
  const avisos = $derived(avisosSimulacion(base, { kcal, sesiones, extraFinde }, sim));
  const cambiado = $derived(kcal !== base.kcal || sesiones !== base.sesiones || extraFinde !== 0);
  const dKcal = $derived(kcal - base.kcal);
  const firma = (x, dec = 1) => `${x > 0 ? '+' : x < 0 ? '−' : '±'}${num(Math.abs(x), dec)}`;

  // Gráfica: tu plan (discontinua) y la simulación
  const W = 320, H = 130, M = { t: 10, r: 8, b: 18, l: 8 };
  const graf = $derived.by(() => {
    const todos = [...plan.linea, ...sim.linea].map((p) => p.peso);
    const min = Math.min(...todos) - 0.3, max = Math.max(...todos) + 0.3;
    const x = (s) => M.l + (s / semanas) * (W - M.l - M.r);
    const y = (p) => M.t + (1 - (p - min) / (max - min)) * (H - M.t - M.b);
    const d = (l) => l.map((p, i) => `${i ? 'L' : 'M'}${x(p.s).toFixed(1)} ${y(p.peso).toFixed(1)}`).join(' ');
    return { plan: d(plan.linea), sim: d(sim.linea), fin: { x: x(semanas), y: y(sim.peso) }, finPlan: { y: y(plan.peso) }, hoyY: y(base.peso) };
  });

  function reiniciar() { kcal = base.kcal; sesiones = base.sesiones; extraFinde = 0; }
  function aplicar() {
    actualizar((e) => { e.perfil.ajusteKcal = (e.perfil.ajusteKcal || 0) + dKcal; });
    reajustarPlan(sumarDias(hoy, 1));
    anotarDiario('simulador', `${dKcal > 0 ? 'Subes' : 'Bajas'} ${Math.abs(dKcal)} kcal al día`, `Lo probaste en «¿Y si…?»: llegarías al ${fechaCorta(fechaFin)} con unos ${num(sim.peso, 1)} kg${sim.grasa ? ` y un ${num(sim.grasa, 1)} % de grasa` : ''}.`);
    avisar(`Tu plan pasa a ${entero(kcal)} kcal desde mañana`, '✅');
    cerrarHoja();
  }
</script>

<div class="sim">
  <header class="cab">
    <span class="cab-ic"><Icono n="shuffle" tam={22} /></span>
    <div><h2>¿Y si…?</h2><p>Mueve lo que quieras y mira dónde llegarías. Tu plan no cambia hasta que lo apliques.</p></div>
  </header>

  <div class="horizonte" role="radiogroup" aria-label="Hasta cuándo">
    {#each HORIZONTES as h (h.id)}
      <button role="radio" aria-checked={horizonte === h.id} class:activo={horizonte === h.id} onclick={() => (horizonte = h.id)}>{h.n}</button>
    {/each}
  </div>

  <!-- Resultado -->
  <section class="resultado" aria-live="polite">
    <small class="r-tit">{horizonte === 'carrera' ? 'El día de la carrera' : `El ${fechaCorta(fechaFin)}`} llegarías con</small>
    <div class="cifras">
      <div><b class="cifra">{num(sim.peso, 1)}<em>kg</em></b><span class:baja={sim.dPeso < -0.05} class:sube={sim.dPeso > 0.05}>{firma(sim.dPeso)} kg desde hoy</span></div>
      {#if sim.grasa}<div><b class="cifra">{num(sim.grasa, 1)}<em>%</em></b><span class:baja={sim.grasa < base.grasa - 0.05} class:sube={sim.grasa > base.grasa + 0.05}>{firma(sim.grasa - base.grasa)} puntos de grasa</span></div>{/if}
    </div>
    <svg viewBox="0 0 {W} {H}" class="graf" role="img" aria-label={`Peso de ${num(base.peso, 1)} a ${num(sim.peso, 1)} kg en ${semanas} semanas`}>
      <line x1={M.l} x2={W - M.r} y1={graf.hoyY} y2={graf.hoyY} class="g-hoy" />
      <path d={graf.plan} class="g-plan" />
      <path d={graf.sim} class="g-sim" />
      <circle cx={graf.fin.x} cy={graf.fin.y} r="4.5" class="g-punto" />
      <text x={M.l} y={H - 3} class="g-eje">hoy</text>
      <text x={W - M.r} y={H - 3} text-anchor="end" class="g-eje">{fechaCorta(fechaFin)}</text>
    </svg>
    <p class="leyenda"><i class="l-sim"></i>{cambiado ? 'Tu simulación' : 'Tu plan'} {#if cambiado}<i class="l-plan"></i>Con tu plan: <b class="cifra">{num(plan.peso, 1)} kg{plan.grasa ? ` · ${num(plan.grasa, 1)} %` : ''}</b>{/if}</p>
  </section>

  <!-- Mandos -->
  <section class="mandos">
    <div class="mando">
      <div class="m-cab"><span><b>Kcal al día</b><small>Tu plan: {entero(base.kcal)} de media</small></span><span class="m-val cifra">{entero(kcal)}{#if dKcal}<em class:menos={dKcal < 0}>{dKcal > 0 ? '+' : '−'}{Math.abs(dKcal)}</em>{/if}</span></div>
      <input type="range" min={Math.max(1200, base.kcal - 800)} max={base.kcal + 600} step="50" bind:value={kcal} aria-label="Kcal al día" />
    </div>
    <div class="mando fila">
      <span><b>Sesiones por semana</b><small>Cada una gasta unas {base.kcalSesion} kcal</small></span>
      <div class="paso">
        <button aria-label="Una sesión menos" disabled={sesiones <= 0} onclick={() => (sesiones -= 1)}><Icono n="minus" tam={16} grosor={2.6} /></button>
        <b class="cifra">{sesiones}</b>
        <button aria-label="Una sesión más" disabled={sesiones >= 7} onclick={() => (sesiones += 1)}><Icono n="plus" tam={16} grosor={2.6} /></button>
      </div>
    </div>
    <div class="mando">
      <div class="m-cab"><span><b>Extra el fin de semana</b><small>Cañas, picoteo, comida fuera… sábado y domingo</small></span><span class="m-val cifra">{extraFinde ? `+${extraFinde}` : '0'}<em class="neutro">kcal/día</em></span></div>
      <input type="range" min="0" max="1200" step="100" bind:value={extraFinde} aria-label="Kcal de más el sábado y el domingo" />
    </div>
    {#if cambiado}<button class="reiniciar" onclick={reiniciar}><Icono n="refresh-cw" tam={14} /> Volver a tu plan</button>{/if}
  </section>

  {#if avisos.length}
    <ul class="avisos">
      {#each avisos as a (a.texto)}<li class={a.tipo}><Icono n={a.tipo === 'bien' ? 'circle-check' : 'triangle-alert'} tam={16} /> {a.texto}</li>{/each}
    </ul>
  {/if}

  {#if dKcal}
    <button class="boton ancho" onclick={aplicar}><Icono n="check" tam={17} grosor={2.4} /> Aplicar {dKcal > 0 ? '+' : '−'}{Math.abs(dKcal)} kcal desde mañana</button>
  {/if}
  {#if sesiones !== base.sesiones}<p class="pie-nota">Los días de entreno se cambian en Entreno → Configurar.</p>{/if}
  <p class="pie-nota">Estimación con tu gasto real ({entero(base.gasto)} kcal) para comparar opciones: el peso del día a día baila 1-2 kg por agua y glucógeno. No cuenta las semanas de carga ni de descarga.</p>
</div>

<style>
  .cab { display: flex; gap: 12px; align-items: flex-start; }
  .cab-ic { display: grid; place-items: center; width: 46px; height: 46px; border-radius: var(--r-m); background: var(--primario); color: var(--sobre-primario); flex-shrink: 0; }
  .cab h2 { margin: 0; font-size: 1.5rem; letter-spacing: -0.02em; }
  .cab p { margin: 2px 0 0; font-size: 0.86rem; line-height: 1.4; color: var(--texto-2); }

  .horizonte { display: flex; gap: 6px; margin: 16px 0 12px; overflow-x: auto; scrollbar-width: none; }
  .horizonte button { flex-shrink: 0; min-height: 38px; padding: 0 14px; border: 0; border-radius: 999px; background: var(--superficie); box-shadow: var(--sombra); color: var(--texto-2); font: inherit; font-size: 0.82rem; font-weight: 700; cursor: pointer; }
  .horizonte button.activo { background: var(--texto); color: var(--fondo); box-shadow: none; }

  .resultado { padding: 16px; border-radius: var(--r-xl); background: radial-gradient(120% 120% at 0% 0%, var(--primario-claro), transparent 65%), var(--superficie); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--primario) 18%, transparent); }
  .r-tit { font-size: 0.78rem; font-weight: 700; color: var(--texto-2); }
  .cifras { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 4px; }
  .cifras div { display: grid; }
  .cifras b { font-size: 2.1rem; line-height: 1.05; letter-spacing: -0.03em; }
  .cifras b em { font-style: normal; font-size: 0.95rem; font-weight: 700; margin-left: 3px; color: var(--texto-3); }
  .cifras span { font-size: 0.78rem; font-weight: 700; color: var(--texto-3); }
  .cifras span.baja { color: var(--dato-kcal); }
  .cifras span.sube { color: var(--amarillo); }
  .graf { display: block; width: 100%; height: auto; margin-top: 10px; overflow: visible; }
  .g-hoy { stroke: var(--linea); stroke-width: 1; stroke-dasharray: 2 4; }
  .g-plan { fill: none; stroke: var(--texto-3); stroke-width: 2; stroke-dasharray: 5 5; opacity: 0.7; }
  .g-sim { fill: none; stroke: var(--primario); stroke-width: 3; stroke-linecap: round; stroke-linejoin: round; }
  .g-punto { fill: var(--primario); stroke: var(--superficie); stroke-width: 2.5; }
  .g-eje { font-size: 10px; font-weight: 700; fill: var(--texto-3); }
  .leyenda { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 6px; margin: 6px 0 0; font-size: 0.76rem; color: var(--texto-2); }
  .leyenda i { width: 14px; height: 3px; border-radius: 2px; }
  .l-sim { background: var(--primario); }
  .l-plan { margin-left: 8px; background: repeating-linear-gradient(90deg, var(--texto-3) 0 4px, transparent 4px 7px); }

  .mandos { margin-top: 12px; padding: 4px 16px; border-radius: var(--r-l); background: var(--superficie); box-shadow: var(--sombra); }
  .mando { padding: 14px 0; }
  .mando + .mando { border-top: 1px solid var(--linea); }
  .mando.fila { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  .mando span:first-child, .m-cab > span:first-child { display: grid; }
  .mando b { font-size: 0.92rem; }
  .mando small { font-size: 0.74rem; color: var(--texto-2); }
  .m-cab { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; }
  .m-val { display: grid; justify-items: end; font-size: 1.25rem; font-weight: 700; }
  .m-val em { font-style: normal; font-size: 0.74rem; font-weight: 800; color: var(--amarillo); }
  .m-val em.menos { color: var(--dato-kcal); }
  .m-val em.neutro { color: var(--texto-3); font-weight: 700; }
  input[type='range'] { width: 100%; margin-top: 10px; accent-color: var(--primario); height: 28px; }
  .paso { display: flex; align-items: center; gap: 4px; padding: 4px; border-radius: 999px; background: var(--superficie-2); }
  .paso button { display: grid; place-items: center; width: 38px; height: 38px; border: 0; border-radius: 50%; background: var(--superficie); box-shadow: var(--sombra); color: var(--texto); cursor: pointer; }
  .paso button:disabled { opacity: 0.4; }
  .paso b { min-width: 28px; text-align: center; font-size: 1.15rem; }
  .reiniciar { display: flex; align-items: center; gap: 6px; margin: 0 0 12px; padding: 0; min-height: 32px; border: 0; background: none; color: var(--primario-fuerte); font: inherit; font-size: 0.8rem; font-weight: 700; cursor: pointer; }

  .avisos { list-style: none; margin: 12px 0 0; padding: 0; display: grid; gap: 6px; }
  .avisos li { display: flex; gap: 8px; align-items: flex-start; padding: 10px 12px; border-radius: var(--r-m); font-size: 0.84rem; line-height: 1.35; }
  .avisos li :global(svg) { flex-shrink: 0; margin-top: 1px; }
  .avisos .mal { background: var(--coral-claro); color: var(--texto); }
  .avisos .mal :global(svg) { color: var(--coral); }
  .avisos .ojo { background: var(--amarillo-claro); color: var(--texto); }
  .avisos .ojo :global(svg) { color: var(--amarillo); }
  .avisos .bien { background: var(--exito-claro, #dcf6ea); color: var(--texto); }
  .avisos .bien :global(svg) { color: var(--exito, #12a46a); }
  .ancho { width: 100%; margin-top: 14px; }
</style>
