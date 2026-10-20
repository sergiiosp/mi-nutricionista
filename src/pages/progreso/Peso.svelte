<script>
  import Icono from '../../components/Icono.svelte';
  import Emoji from '../../components/Emoji.svelte';
  import { estado, actualizar } from '../../stores/estado.js';
  import { avisar } from '../../stores/ui.js';
  import { calcularObjetivos } from '../../lib/nutricion.js';
  import { hoyISO } from '../../lib/planificador.js';
  import { tendencia, recomendacion } from '../../lib/progreso.js';
  import { reajustarPlan, revisarGasto } from '../../lib/acciones.js';
  import { MINIMOS } from '../../lib/gasto.js';
  import { fechaCorta, num } from '../../lib/formato.js';
  import { grasaReferencia, ultimaComposicion, cambioCuerpo, veredicto, avisoAgua, RANGOS } from '../../lib/cuerpo.js';

  const hoy = hoyISO();
  let fecha = $state(hoy);
  let peso = $state('');
  // De la báscula (opcionales)
  let grasa = $state('');
  let musculo = $state('');
  let agua = $state('');
  let formAbierto = $state(false);
  const pesos = $derived([...$estado.pesos].sort((a, b) => a.fecha.localeCompare(b.fecha)));
  const o = $derived(calcularObjetivos($estado.perfil));
  const t = $derived(tendencia(pesos));
  const rec = $derived(recomendacion(pesos, $estado.perfil, o));
  const inicial = $derived(pesos[0]?.peso);
  const actual = $derived(pesos.at(-1)?.peso);

  const numero = (v) => (String(v).trim() === '' ? null : Number(String(v).replace(',', '.')));
  function guardar(ev) {
    ev.preventDefault();
    const p = numero(peso);
    if (!(p >= 35 && p <= 250)) return avisar('Revisa el peso', '⚠️');
    const extra = { grasa: numero(grasa), musculo: numero(musculo), agua: numero(agua) };
    for (const [k, v] of Object.entries(extra)) {
      if (v == null) delete extra[k];
      else if (!(v >= RANGOS[k][0] && v <= RANGOS[k][1])) return avisar(`Revisa ${k === 'grasa' ? 'la grasa' : k === 'musculo' ? 'el músculo' : 'el agua'}`, '⚠️');
    }
    const antes = $estado.perfil;
    const kcalAntes = calcularObjetivos(antes).kcal;
    actualizar((e) => {
      // Hoy se queda con el peso con el que se planificó: las cantidades nuevas, desde mañana
      const dHoy = e.plan?.dias.find((d) => d.fecha === hoy);
      if (dHoy && !('peso' in (dHoy.perfilFijo || {}))) dHoy.perfilFijo = { ...(dHoy.perfilFijo || {}), peso: antes.peso, grasa: antes.grasa ?? null };
      e.pesos = e.pesos.filter((x) => x.fecha !== fecha).concat([{ fecha, peso: p, ...extra }]);
      e.perfil.peso = [...e.pesos].sort((a, b) => a.fecha.localeCompare(b.fecha)).at(-1).peso;
      const g = grasaReferencia(e.pesos, hoy);
      if (g) e.perfil.grasa = g;
    });
    peso = grasa = musculo = agua = '';
    revisarGasto();
    formAbierto = false;
    const kcalAhora = calcularObjetivos($estado.perfil).kcal;
    const salto = Math.abs($estado.perfil.peso - antes.peso);
    if (Math.abs(kcalAhora - kcalAntes) >= 30 || salto >= 2) {
      reajustarPlan();
      avisar(salto >= 2 ? `Tu peso real difiere ${num(salto, 1)} kg del que tenía: cantidades nuevas desde mañana` : `Guardado: tu plan pasa a ${kcalAhora} kcal desde mañana`, '⚖️');
    } else avisar('Peso guardado', '⚖️');
  }

  const cuerpo = $derived(ultimaComposicion(pesos));
  const cambio = $derived(cambioCuerpo(pesos));
  const juicio = $derived(veredicto(cambio, $estado.perfil.objetivo));
  const agua_ = $derived(avisoAgua(pesos));
  const signo = (x) => `${x > 0 ? '+' : ''}${num(x, 1)}`;
  // Gasto real: se calcula una vez por semana (también al apuntar un peso, si toca)
  const gasto = $derived($estado.gasto);
  const progresoGasto = $derived(gasto && !gasto.listo ? Math.round(((Math.min(gasto.dias || 0, MINIMOS.dias) / MINIMOS.dias) * 0.6 + (Math.min(gasto.pesajes || 0, MINIMOS.pesajes) / MINIMOS.pesajes) * 0.4) * 100) : 0);

  function borrarPeso(p) {
    actualizar((e) => { e.pesos = e.pesos.filter((x) => x.fecha !== p.fecha); });
    avisar(`Peso del ${fechaCorta(p.fecha)} borrado`, '🗑️', () => {
      actualizar((e) => { if (!e.pesos.some((x) => x.fecha === p.fecha)) e.pesos = [...e.pesos, p]; });
    });
  }

  function aplicarAjuste(n) {
    actualizar((e) => { e.perfil.ajusteKcal = (e.perfil.ajusteKcal || 0) + n; });
    reajustarPlan();
    avisar(`Ajuste aplicado (${n > 0 ? '+' : ''}${n} kcal)`, '✅');
  }

  // Gráfica
  const W = 340; const H = 180; const M = { t: 14, r: 12, b: 24, l: 36 };
  const g = $derived.by(() => {
    if (pesos.length < 2) return null;
    const ms = (iso) => new Date(`${iso}T00:00:00`).getTime();
    const xs = pesos.map((p) => ms(p.fecha));
    const obj = $estado.perfil.pesoObjetivo || null;
    const vals = pesos.map((p) => p.peso).concat(obj ? [obj] : []);
    let min = Math.min(...vals); let max = Math.max(...vals);
    if (max - min < 2) { min -= 1; max += 1; }
    const x0 = Math.min(...xs); const x1 = Math.max(...xs);
    const X = (v) => M.l + ((v - x0) / Math.max(1, x1 - x0)) * (W - M.l - M.r);
    const Y = (v) => M.t + ((max - v) / (max - min)) * (H - M.t - M.b);
    let ema = pesos[0].peso;
    const suave = pesos.map((p) => (ema = ema + 0.3 * (p.peso - ema)));
    const linea = suave.map((v, i) => `${i ? 'L' : 'M'}${X(xs[i]).toFixed(1)},${Y(v).toFixed(1)}`).join(' ');
    return { X, Y, xs, linea, area: `${linea} L${X(xs.at(-1)).toFixed(1)},${H - M.b} L${X(xs[0]).toFixed(1)},${H - M.b} Z`, ticks: [min, (min + max) / 2, max], obj };
  });
</script>

{#if pesos.length}
  <div class="panel">
    <div class="bloque bajo"><span class="b-cab"><Icono n="scale" tam={15} grosor={2.2} /> Actual</span><b class="b-num cifra">{num(actual, 1)}</b><span class="b-sub">kg</span></div>
    <div class="bloque bajo"><span class="b-cab">Cambio</span><b class="b-num cifra">{actual - inicial > 0 ? '+' : ''}{num(actual - inicial, 1)}</b><span class="b-sub">kg desde {fechaCorta(pesos[0].fecha)}</span></div>
    <div class="bloque bajo"><span class="b-cab">Ritmo</span><b class="b-num cifra">{t ? `${t.kgSemana > 0 ? '+' : ''}${num(t.kgSemana, 2)}` : '—'}</b><span class="b-sub">kg/semana</span></div>
  </div>
{/if}

{#if !formAbierto && pesos.length}
  <button class="boton ancho-peso" onclick={() => (formAbierto = true)}><Icono n="plus" tam={18} grosor={2.4} /> Apuntar peso y báscula</button>
{:else}
<form class="tarjeta form" onsubmit={guardar}>
  <b class="tit"><Emoji e="⚖️" tam={24} /> Registrar peso</b>
  <label class="campo"><span>Fecha</span><input type="date" bind:value={fecha} max={hoy} required /></label>
  <label class="campo"><span>Peso</span><input enterkeyhint="next" type="number" step="0.1" min="35" max="250" inputmode="decimal" bind:value={peso} placeholder={actual ? num(actual, 1) : ''} required /><small>kg</small></label>
  <p class="bascula"><Icono n="activity" tam={15} grosor={2.2} /> De tu báscula <small>opcional</small></p>
  <div class="tres">
    <label class="campo"><span>Grasa</span><input enterkeyhint="next" type="number" step="0.1" min="3" max="60" inputmode="decimal" bind:value={grasa} placeholder={cuerpo?.grasa ? num(cuerpo.grasa, 1) : ''} /><small>%</small></label>
    <label class="campo"><span>Músculo</span><input enterkeyhint="next" type="number" step="0.1" min="15" max="120" inputmode="decimal" bind:value={musculo} placeholder={cuerpo?.musculo ? num(cuerpo.musculo, 1) : ''} /><small>kg</small></label>
    <label class="campo"><span>Agua</span><input enterkeyhint="done" type="number" step="0.1" min="30" max="75" inputmode="decimal" bind:value={agua} placeholder={cuerpo?.agua ? num(cuerpo.agua, 1) : ''} /><small>%</small></label>
  </div>
  <p class="pie-nota consejo-bascula">Mismo momento siempre: en ayunas, tras ir al baño y descalzo. La grasa cambia con lo que bebas, por eso uso la media de tus últimas mediciones.</p>
  <button class="boton" type="submit">Guardar</button>
</form>
{/if}

{#if cuerpo}
  <section class="tarjeta cuerpo" aria-label="Tu composición">
    <div class="cu-cab"><b>Tu cuerpo</b><small>{fechaCorta(cuerpo.fecha)}</small></div>
    <div class="cu-datos">
      {#if cuerpo.grasa}<div><small>Grasa</small><b class="cifra">{num(cuerpo.grasa, 1)}<span>%</span></b><small>{num(cuerpo.grasaKg, 1)} kg</small></div>{/if}
      {#if cuerpo.magraKg}<div><small>Masa magra</small><b class="cifra">{num(cuerpo.magraKg, 1)}<span>kg</span></b><small>todo menos grasa</small></div>{/if}
      {#if cuerpo.musculo}<div><small>Músculo</small><b class="cifra">{num(cuerpo.musculo, 1)}<span>kg</span></b><small>según la báscula</small></div>{/if}
      {#if cuerpo.agua}<div><small>Agua</small><b class="cifra">{num(cuerpo.agua, 1)}<span>%</span></b><small>&nbsp;</small></div>{/if}
    </div>
    {#if cambio && (cambio.grasaKg != null || cambio.musculo != null)}
      <div class="cu-cambio">
        <span class="cu-desde">Desde el {fechaCorta(cambio.desde)}</span>
        {#if cambio.grasaKg != null}<span class="chip-cambio" class:bien={cambio.grasaKg <= 0}>Grasa {signo(cambio.grasaKg)} kg</span>{/if}
        {#if cambio.musculo != null}<span class="chip-cambio" class:bien={cambio.musculo >= 0}>Músculo {signo(cambio.musculo)} kg</span>{/if}
      </div>
      {#if juicio}<p class="cu-juicio" class:bien={juicio.bien}>{juicio.texto}</p>{/if}
    {:else}
      <p class="pie-nota">Con unas cuantas mediciones en 2 semanas verás si baja la grasa y se mantiene el músculo.</p>
    {/if}
    {#if agua_}<p class="cu-agua"><Icono n="droplet" tam={16} /> <span>{agua_}</span></p>{/if}
    {#if o.metodoTmb === 'magra'}<p class="pie-nota">Tus calorías salen de tu masa magra ({num(o.magraKg, 1)} kg, con la media de tus últimas mediciones de grasa): metabolismo basal {o.tmb} kcal y {o.proteina} g de proteína.</p>{/if}
  </section>
{/if}

<section class="tarjeta gasto" aria-label="Tu gasto real">
  <div class="cu-cab"><b>Tu gasto real</b><small>se revisa cada semana</small></div>
  {#if gasto?.listo}
    <p class="g-cifra"><b class="cifra">{gasto.tdee.toLocaleString('es-ES')}</b> kcal al día</p>
    <p class="pie-nota">Comes {gasto.ingesta.toLocaleString('es-ES')} kcal de media y tu peso va {gasto.kgSemana > 0 ? '+' : ''}{num(gasto.kgSemana, 2)} kg/semana ({gasto.dias} días y {gasto.pesajes} pesajes). La fórmula decía {gasto.formula.toLocaleString('es-ES')} kcal: {gasto.ajuste ? `tu plan lleva un ajuste de ${gasto.ajuste > 0 ? '+' : ''}${gasto.ajuste} kcal por esto` : 'clavada, sin ajuste'}.</p>
  {:else}
    <p class="g-texto">Calibrando con tus datos: tu plan sale de fórmulas, que fallan ±10 %. Con 2 semanas de comidas apuntadas y pesajes, lo ajusto a lo que gastas de verdad.</p>
    <div class="g-pista" aria-hidden="true"><i style="width:{progresoGasto}%"></i></div>
    <p class="pie-nota">{#if gasto?.raro}Los datos de estas semanas no cuadran (¿días a medio apuntar?): sigo esperando.{:else if gasto}Faltan {[gasto.faltan.dias && `${gasto.faltan.dias} ${gasto.faltan.dias === 1 ? 'día bien apuntado' : 'días bien apuntados'}`, gasto.faltan.pesajes && `${gasto.faltan.pesajes} ${gasto.faltan.pesajes === 1 ? 'pesaje' : 'pesajes'}`, gasto.faltan.semanas && 'datos de al menos 2 semanas'].filter(Boolean).join(', ')}.{:else}Se calcula al abrir la app una vez por semana.{/if}</p>
  {/if}
</section>

{#if pesos.length}
  <div class="tarjeta">
    <b class="tit-graf">Evolución</b>
    {#if g}
      <svg class="grafico" viewBox="0 0 {W} {H}" role="img" aria-label="Evolución del peso">
        <defs><linearGradient id="area-peso" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="g-area-ini" /><stop offset="1" class="g-area-fin" /></linearGradient></defs>
        {#each g.ticks as v (v)}
          <line x1={M.l} x2={W - M.r} y1={g.Y(v)} y2={g.Y(v)} class="g-rejilla" /><text x={M.l - 6} y={g.Y(v) + 4} text-anchor="end" class="g-eje">{num(v, 1)}</text>
        {/each}
        {#if g.obj}<line x1={M.l} x2={W - M.r} y1={g.Y(g.obj)} y2={g.Y(g.obj)} class="g-objetivo" /><text x={W - M.r} y={g.Y(g.obj) - 4} text-anchor="end" class="g-eje">objetivo</text>{/if}
        <path d={g.area} fill="url(#area-peso)" />
        <path d={g.linea} class="g-tendencia" />
        {#each pesos as p, i (p.fecha)}<circle cx={g.X(g.xs[i])} cy={g.Y(p.peso)} r="3.5" class="g-punto"><title>{p.fecha}: {num(p.peso, 1)} kg</title></circle>{/each}
        <text x={M.l} y={H - 6} class="g-eje">{fechaCorta(pesos[0].fecha)}</text>
        <text x={W - M.r} y={H - 6} text-anchor="end" class="g-eje">{fechaCorta(pesos.at(-1).fecha)}</text>
      </svg>
    {:else}
      <p class="pie-nota">Con dos registros verás la gráfica.</p>
    {/if}
    <p class="pie-nota">Esperado con tu plan: {o.cambioSemanalKg > 0 ? '+' : ''}{num(o.cambioSemanalKg, 2)} kg/semana.</p>
  </div>
{/if}

<div class="tarjeta destacada rec rec-{rec.tipo}">
  <div class="cab"><span class="ic-cab"><Icono n="lightbulb" tam={18} /></span><b>Tu nutricionista dice</b></div>
  <p>{rec.texto}</p>
  {#if rec.tipo === 'ajuste' && !gasto?.listo}<button class="boton" onclick={() => aplicarAjuste(rec.ajuste)}>Aplicar ajuste ({rec.ajuste > 0 ? '+' : ''}{rec.ajuste} kcal)</button>{:else if rec.tipo === 'ajuste'}<p class="pie-nota">No hace falta tocar nada: el ajuste por tu gasto real ya se aplica solo cada semana.</p>{/if}
  {#if $estado.perfil.ajusteKcal}<p class="pie-nota">Ajuste acumulado: {$estado.perfil.ajusteKcal > 0 ? '+' : ''}{$estado.perfil.ajusteKcal} kcal. <button class="enlace" onclick={() => aplicarAjuste(-$estado.perfil.ajusteKcal)}>Quitar</button></p>{/if}
</div>

{#if pesos.length}
  <details class="tarjeta">
    <summary>Historial ({pesos.length})</summary>
    <ul class="historial">
      {#each [...pesos].reverse() as p (p.fecha)}
        <li><span>{fechaCorta(p.fecha)}</span><b>{num(p.peso, 1)} kg</b><span class="h-comp">{[p.grasa && `${num(p.grasa, 1)} % grasa`, p.musculo && `${num(p.musculo, 1)} kg músc.`, p.agua && `${num(p.agua, 1)} % agua`].filter(Boolean).join(' · ')}</span>
          <button class="boton-icono" aria-label="Borrar el peso del {fechaCorta(p.fecha)}" onclick={() => borrarPeso(p)}><Icono e="🗑️" tam={18} /></button></li>
      {/each}
    </ul>
  </details>
{/if}

<style>
  /* Historial de pesos (antes en app.css) */
  .historial { list-style: none; padding: 0; margin: 10px 0 0; }
  .historial li { display: grid; grid-template-columns: 1fr 1fr 1fr auto; align-items: center; padding: 6px 0; border-top: 1px solid var(--superficie-2); font-size: 0.92rem; }
  .form { display: grid; grid-template-columns: 1fr 1fr; gap: 0 10px; align-items: end; }
  .tit { grid-column: 1 / -1; display: flex; gap: 8px; align-items: center; }
  .form .campo { margin: 10px 0; }
  .form .boton { grid-column: 1 / -1; }
  .rec .cab { display: flex; gap: 10px; align-items: center; }
  .ic-cab { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 10px; background: var(--primario-claro); color: var(--primario); }
  .ancho-peso { width: 100%; margin-top: 12px; }
  .tit-graf { display: block; margin-bottom: 6px; }
  .rec p { font-weight: 600; }
  .bascula { grid-column: 1 / -1; display: flex; align-items: center; gap: 6px; margin: 12px 0 0; font-weight: 700; font-size: 0.86rem; color: var(--primario-fuerte); }
  .bascula small { color: var(--texto-3); font-weight: 600; }
  .tres { grid-column: 1 / -1; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0 8px; }
  .consejo-bascula { grid-column: 1 / -1; margin: 0 0 10px; }
  .g-cifra { margin: 8px 0 2px; font-size: 0.9rem; color: var(--texto-2); }
  .g-cifra b { font-size: 2rem; letter-spacing: -0.03em; color: var(--primario-fuerte); }
  .g-texto { margin: 8px 0 10px; font-size: 0.86rem; color: var(--texto-2); }
  .g-pista { height: 6px; border-radius: 999px; background: var(--superficie-3); overflow: hidden; }
  .g-pista i { display: block; height: 100%; border-radius: 999px; background: var(--primario); }
  .h-comp { font-size: 0.74rem; color: var(--texto-2); }
  .historial li { grid-template-columns: 64px 70px 1fr auto; gap: 8px; }
  /* Tu cuerpo */
  .cu-cab { display: flex; align-items: baseline; justify-content: space-between; }
  .cu-cab small { font-size: 0.76rem; color: var(--texto-3); font-weight: 600; }
  .cu-datos { display: grid; grid-template-columns: repeat(auto-fit, minmax(72px, 1fr)); gap: 10px; margin-top: 12px; }
  .cu-datos div { display: grid; }
  .cu-datos small { font-size: 0.7rem; font-weight: 600; color: var(--texto-3); }
  .cu-datos small:first-child { font-weight: 700; color: var(--texto-2); }
  .cu-datos b { font-size: 1.35rem; line-height: 1.15; }
  .cu-datos b span { font-size: 0.78rem; margin-left: 1px; color: var(--texto-3); }
  .cu-cambio { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--linea); }
  .cu-desde { font-size: 0.76rem; font-weight: 600; color: var(--texto-3); margin-right: 2px; }
  .chip-cambio { padding: 4px 10px; border-radius: 999px; background: var(--amarillo-claro); color: var(--texto); font-size: 0.8rem; font-weight: 700; font-variant-numeric: tabular-nums; }
  .chip-cambio.bien { background: var(--primario-claro); color: var(--primario-fuerte); }
  .cu-juicio { margin: 10px 0 0; font-weight: 700; font-size: 0.9rem; }
  .cu-juicio.bien { color: var(--primario-fuerte); }
  .cu-agua { display: flex; gap: 8px; align-items: flex-start; margin: 10px 0 0; padding: 10px 12px; border-radius: 12px; background: var(--superficie-2); font-size: 0.82rem; color: var(--texto-2); }
  .cu-agua :global(svg) { color: var(--azul); flex-shrink: 0; margin-top: 1px; }
</style>
