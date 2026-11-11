<script>
  import Icono from '../../components/Icono.svelte';
  import FormPeso from '../../components/FormPeso.svelte';
  import { estado, actualizar, anotarDiario } from '../../stores/estado.js';
  import { avisar, abrirHoja } from '../../stores/ui.js';
  import { calcularObjetivos } from '../../lib/nutricion.js';
  import { hoyISO } from '../../lib/planificador.js';
  import { tendencia, recomendacion, mediaSemana } from '../../lib/progreso.js';
  import { reajustarPlan } from '../../lib/acciones.js';
  import { MINIMOS } from '../../lib/gasto.js';
  import { fechaCorta, num } from '../../lib/formato.js';
  import { ultimaComposicion, cambioCuerpo, veredicto, avisoAgua, avisoVisceral } from '../../lib/cuerpo.js';

  const hoy = hoyISO();
  let formAbierto = $state(false);
  const pesos = $derived([...$estado.pesos].sort((a, b) => a.fecha.localeCompare(b.fecha)));
  const o = $derived(calcularObjetivos($estado.perfil));
  const t = $derived(tendencia(pesos));
  const rec = $derived(recomendacion(pesos, $estado.perfil, o));
  const actual = $derived(pesos.at(-1)?.peso);
  // El número de referencia: la media de tus pesajes de los últimos 7 días (el agua de un día no engaña)
  const media = $derived(mediaSemana(pesos));

  // Cabecera al estilo de Cal AI: dónde estás, cuánto llevas del camino y cuándo llegarías a tu objetivo
  const meta = $derived.by(() => {
    if (!pesos.length) return null;
    const inicio = pesos[0].peso;
    const obj = Number($estado.perfil.pesoObjetivo) || null;
    const falta = obj ? obj - actual : null;
    const hecho = obj && inicio !== obj ? Math.min(1, Math.max(0, (inicio - actual) / (inicio - obj))) : null;
    // Ritmo: el real de tus pesajes si va hacia el objetivo; si no, el que marca tu plan
    const ritmo = t && falta && Math.sign(t.kgSemana) === Math.sign(falta) && Math.abs(t.kgSemana) >= 0.05 ? t.kgSemana
      : falta && Math.sign(o.cambioSemanalKg) === Math.sign(falta) ? o.cambioSemanalKg : null;
    const semanas = ritmo ? Math.ceil(Math.abs(falta / ritmo)) : null;
    const llegada = semanas && semanas <= 104 ? new Date(Date.now() + semanas * 7 * 864e5).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: semanas > 40 ? 'numeric' : undefined }) : null;
    return { inicio, obj, falta, hecho, ritmo, semanas, llegada, real: ritmo === t?.kgSemana, pesadoHoy: pesos.at(-1).fecha === hoy };
  });

  const cuerpo = $derived(ultimaComposicion(pesos, $estado.perfil.altura));
  const visceral = $derived(avisoVisceral(cuerpo?.visceral));
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
    anotarDiario('manual', `${n > 0 ? 'Subes' : 'Bajas'} ${Math.abs(n)} kcal a mano`, rec.texto);
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


{#if meta}
  <section class="tarjeta peso-meta" aria-label="Tu peso y tu objetivo">
    <div class="m-cab">
      <span><small>Media de 7 días</small><b class="cifra">{num(media?.peso ?? actual, 1)}<span>kg</span></b><small class="m-ultimo">Último pesaje: {num(actual, 1)} kg, {fechaCorta(pesos.at(-1).fecha)}{media && media.n > 1 ? ` · ${media.n} pesajes en la semana` : ''}</small></span>
      {#if meta.obj}<span class="m-obj"><small>Objetivo</small><b class="cifra">{num(meta.obj, 1)} kg</b></span>{/if}
    </div>
    {#if meta.hecho != null}
      <div class="m-barra" role="img" aria-label="Llevas el {Math.round(meta.hecho * 100)} % del camino"><i style="width:{Math.max(3, meta.hecho * 100)}%"></i></div>
      <div class="m-ext"><small>Empezaste en {num(meta.inicio, 1)} kg</small><small>{Math.abs(meta.falta) < 0.1 ? '¡En tu objetivo!' : `Te faltan ${num(Math.abs(meta.falta), 1)} kg`}</small></div>
    {:else if pesos.length > 1}
      <p class="m-ext"><small>Desde que empezaste: {signo(actual - meta.inicio)} kg</small></p>
    {/if}
    <div class="m-filas">
      <div><Icono n="calendar" tam={16} /><span>Próximo pesaje</span><b>{meta.pesadoHoy ? 'mañana' : 'hoy'}, en ayunas</b></div>
      {#if meta.llegada}<div><Icono n="flag" tam={16} /><span>Llegarías</span><b>hacia el {meta.llegada}</b></div>
        <p class="pie-nota">A {num(Math.abs(meta.ritmo), 2)} kg por semana, {meta.real ? 'tu ritmo de las últimas semanas' : 'el ritmo que marca tu plan'}.</p>{/if}
    </div>
  </section>
{/if}

{#if !formAbierto && pesos.length}
  <button class="boton ancho-peso" onclick={() => (formAbierto = true)}><Icono n="plus" tam={18} grosor={2.4} /> Apuntar peso y báscula</button>
{:else}
  <FormPeso onguardado={() => (formAbierto = false)} />
{/if}

{#if cuerpo}
  <section class="tarjeta cuerpo" aria-label="Tu composición">
    <div class="cu-cab"><b>Tu cuerpo</b><small>{fechaCorta(cuerpo.fecha)}</small></div>
    <div class="cu-datos">
      {#if cuerpo.grasa}<div><small>Grasa</small><b class="cifra">{num(cuerpo.grasa, 1)}<span>%</span></b><small>{num(cuerpo.grasaKg, 1)} kg</small></div>{/if}
      {#if cuerpo.magraKg}<div><small>Masa magra</small><b class="cifra">{num(cuerpo.magraKg, 1)}<span>kg</span></b><small>todo menos grasa</small></div>{/if}
      {#if cuerpo.musculo}<div><small>Músculo</small><b class="cifra">{num(cuerpo.musculo, 1)}<span>kg</span></b><small>según la báscula</small></div>{/if}
      {#if cuerpo.esqueletico}<div><small>M. esquelético</small><b class="cifra">{num(cuerpo.esqueletico, 1)}<span>%</span></b><small>{num((cuerpo.peso * cuerpo.esqueletico) / 100, 1)} kg</small></div>{/if}
      {#if cuerpo.agua}<div><small>Agua</small><b class="cifra">{num(cuerpo.agua, 1)}<span>%</span></b><small>{num(cuerpo.aguaKg, 1)} kg</small></div>{/if}
      {#if cuerpo.visceral}<div><small>G. visceral</small><b class="cifra" class:alerta-v={cuerpo.visceral >= 10}>{cuerpo.visceral}</b><small>{cuerpo.visceral < 10 ? 'sana (<10)' : 'alta'}</small></div>{/if}
    </div>
    <dl class="cu-mas">
      {#if cuerpo.imc}<div><dt>IMC</dt><dd class="cifra">{num(cuerpo.imc, 1)}</dd></div>{/if}
      {#if cuerpo.tasaMuscular}<div><dt>% músculo</dt><dd class="cifra">{num(cuerpo.tasaMuscular, 1)} %</dd></div>{/if}
      {#if cuerpo.proteinaKg}<div><dt>Proteína</dt><dd class="cifra">{num(cuerpo.proteinaKg, 1)} kg · {num(cuerpo.proteina, 1)} %</dd></div>{/if}
      {#if cuerpo.hueso}<div><dt>Masa esquelética</dt><dd class="cifra">{num(cuerpo.hueso, 1)} kg</dd></div>{/if}
      {#if cuerpo.subcutanea}<div><dt>G. subcutánea</dt><dd class="cifra">{num(cuerpo.subcutanea, 1)} %</dd></div>{/if}
      {#if cuerpo.edad}<div><dt>Edad corporal</dt><dd class="cifra">{cuerpo.edad} años{#if $estado.perfil.edad} <small>({cuerpo.edad <= $estado.perfil.edad ? `${$estado.perfil.edad - cuerpo.edad} menos que la tuya` : `${cuerpo.edad - $estado.perfil.edad} más que la tuya`})</small>{/if}</dd></div>{/if}
      {#if cuerpo.bmr}<div><dt>BMR báscula</dt><dd class="cifra">{cuerpo.bmr} kcal <small>(la app calcula {o.tmb})</small></dd></div>{/if}
      {#if cuerpo.perdidaGrasa != null}<div><dt>Pérdida de grasa</dt><dd class="cifra">{num(cuerpo.perdidaGrasa, 1)} kg</dd></div>{/if}
    </dl>
    {#if cambio && (cambio.grasaKg != null || cambio.musculo != null)}
      <div class="cu-cambio">
        <span class="cu-desde">Desde el {fechaCorta(cambio.desde)}</span>
        {#if cambio.grasaKg != null}<span class="chip-cambio" class:bien={cambio.grasaKg <= 0}>Grasa {signo(cambio.grasaKg)} kg</span>{/if}
        {#if cambio.musculo != null}<span class="chip-cambio" class:bien={cambio.musculo >= 0}>Músculo {signo(cambio.musculo)} kg</span>{/if}
        {#if cambio.esqueletico != null}<span class="chip-cambio" class:bien={cambio.esqueletico >= 0}>M. esquelético {signo(cambio.esqueletico)} %</span>{/if}
        {#if cambio.visceral}<span class="chip-cambio" class:bien={cambio.visceral <= 0}>Visceral {cambio.visceral > 0 ? '+' : ''}{Math.round(cambio.visceral)}</span>{/if}
      </div>
      {#if juicio}<p class="cu-juicio" class:bien={juicio.bien}>{juicio.texto}</p>{/if}
    {:else}
      <p class="pie-nota">Con unas cuantas mediciones en 2 semanas verás si baja la grasa y se mantiene el músculo.</p>
    {/if}
    {#if visceral}<p class="cu-agua visceral" class:alto={visceral.alto}><Icono n="triangle-alert" tam={16} /> <span>{visceral.texto}</span></p>{/if}
    {#if agua_}<p class="cu-agua"><Icono n="droplet" tam={16} /> <span>{agua_}</span></p>{/if}
    {#if o.metodoTmb === 'magra'}<p class="pie-nota">Tus calorías salen de tu masa magra ({num(o.magraKg, 1)} kg, con la media de tus últimas mediciones de grasa): metabolismo basal {o.tmb} kcal y {o.proteina} g de proteína.</p>{/if}
  </section>
{/if}

<section class="tarjeta gasto" aria-label="Tu gasto real">
  <div class="cu-cab"><b>Tu gasto real</b><small>se revisa cada semana</small></div>
  {#if gasto?.listo}
    <p class="g-cifra"><b class="cifra cifra-xl">{gasto.tdee.toLocaleString('es-ES')}</b> kcal al día</p>
    <p class="pie-nota">Comes {gasto.ingesta.toLocaleString('es-ES')} kcal de media y tu peso va {gasto.kgSemana > 0 ? '+' : ''}{num(gasto.kgSemana, 2)} kg/semana ({gasto.dias} días y {gasto.pesajes} pesajes). La fórmula decía {gasto.formula.toLocaleString('es-ES')} kcal: {gasto.ajuste ? `tu plan lleva un ajuste de ${gasto.ajuste > 0 ? '+' : ''}${gasto.ajuste} kcal por esto` : 'clavada, sin ajuste'}. Si hay que cambiar algo, te lo propongo en el repaso del domingo.</p>
  {:else}
    <p class="g-texto">Calibrando con tus datos: tu plan sale de fórmulas, que fallan ±10 %. Con 2 semanas de comidas apuntadas y pesajes, calculo lo que gastas de verdad. El ajuste de tus kcal lo decides tú en el repaso del domingo.</p>
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
  <p>{rec.tipo === 'ajuste' ? rec.texto.replace(/ Te propongo[^.]*\./, '') : rec.texto}</p>
  <!-- Un solo ajuste por semana, y lo decides tú: en el repaso del domingo -->
  {#if rec.tipo === 'ajuste'}<button class="boton boton-sec" onclick={() => abrirHoja('repaso')}>Decídelo en tu repaso del domingo</button>{/if}
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
  /* Peso y objetivo */
  .m-cab { display: flex; justify-content: space-between; align-items: flex-end; gap: 12px; }
  .m-cab > span { display: grid; }
  .m-cab small, .m-ext small { font-size: 0.74rem; font-weight: 600; color: var(--texto-2); }
  .m-cab > span:first-child b { font-size: 2.4rem; line-height: 1; letter-spacing: -0.03em; }
  .m-cab b span { font-size: 0.95rem; margin-left: 3px; color: var(--texto-2); }
  .m-cab .m-ultimo { margin-top: 4px; font-weight: 500; color: var(--texto-3); }
  .m-obj { text-align: right; }
  .m-obj b { font-size: 1.1rem; }
  .m-barra { height: 10px; margin-top: 14px; border-radius: 999px; background: var(--superficie-3); overflow: hidden; }
  .m-barra i { display: block; height: 100%; border-radius: 999px; background: var(--primario); }
  .m-ext { display: flex; justify-content: space-between; gap: 8px; margin: 6px 0 0; }
  .m-filas { display: grid; gap: 8px; margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--linea); }
  .m-filas div { display: flex; align-items: center; gap: 8px; font-size: 0.88rem; color: var(--texto-2); }
  .m-filas div :global(svg) { color: var(--primario); flex-shrink: 0; }
  .m-filas b { margin-left: auto; color: var(--texto); }
  .m-filas .pie-nota { margin: 0; }
  /* Historial de pesos (antes en app.css) */
  .historial { list-style: none; padding: 0; margin: 10px 0 0; }
  .historial li { display: grid; grid-template-columns: 1fr 1fr 1fr auto; align-items: center; padding: 6px 0; border-top: 1px solid var(--superficie-2); font-size: 0.92rem; }
  .rec .cab { display: flex; gap: 10px; align-items: center; }
  .ic-cab { display: grid; place-items: center; width: 34px; height: 34px; border-radius: var(--r-s); background: var(--primario-claro); color: var(--primario); }
  .ancho-peso { width: 100%; margin-top: 12px; }
  .tit-graf { display: block; margin-bottom: 6px; }
  .rec p { font-weight: 500; }
  .cu-mas { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 14px; margin: 12px 0 0; padding-top: 10px; border-top: 1px solid var(--linea); }
  .cu-mas div { display: grid; }
  .cu-mas dt { font-size: 0.7rem; font-weight: 500; color: var(--texto-3); }
  .cu-mas dd { margin: 0; font-size: 0.9rem; font-weight: 500; }
  .cu-mas small { display: block; font-size: 0.72rem; color: var(--texto-2); font-weight: 500; }
  .alerta-v { color: var(--amarillo); }
  .cu-agua.visceral :global(svg) { color: var(--amarillo); }
  .cu-agua.visceral.alto { background: var(--coral-claro); }
  .cu-agua.visceral.alto :global(svg) { color: var(--coral); }
  .g-cifra { margin: 8px 0 2px; font-size: 0.9rem; color: var(--texto-2); }
  .g-cifra b { font-size: 2rem; letter-spacing: -0.03em; color: var(--primario-fuerte); }
  .g-texto { margin: 8px 0 10px; font-size: 0.86rem; color: var(--texto-2); }
  .g-pista { height: 6px; border-radius: 999px; background: var(--superficie-3); overflow: hidden; }
  .g-pista i { display: block; height: 100%; border-radius: 999px; background: var(--primario); }
  .h-comp { font-size: 0.74rem; color: var(--texto-2); }
  .historial li { grid-template-columns: 64px 70px 1fr auto; gap: 8px; }
  /* Tu cuerpo */
  .cu-cab { display: flex; align-items: baseline; justify-content: space-between; }
  .cu-cab small { font-size: 0.76rem; color: var(--texto-3); font-weight: 500; }
  .cu-datos { display: grid; grid-template-columns: repeat(auto-fit, minmax(72px, 1fr)); gap: 10px; margin-top: 12px; }
  .cu-datos div { display: grid; }
  .cu-datos small { font-size: 0.7rem; font-weight: 500; color: var(--texto-3); }
  .cu-datos small:first-child { font-weight: 600; color: var(--texto-2); }
  .cu-datos b { font-size: 1.35rem; line-height: 1.15; }
  .cu-datos b span { font-size: 0.78rem; margin-left: 1px; color: var(--texto-3); }
  .cu-cambio { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--linea); }
  .cu-desde { font-size: 0.76rem; font-weight: 500; color: var(--texto-3); margin-right: 2px; }
  .chip-cambio { padding: 4px 10px; border-radius: 999px; background: var(--amarillo-claro); color: var(--texto); font-size: 0.8rem; font-weight: 600; font-variant-numeric: tabular-nums; }
  .chip-cambio.bien { background: var(--primario-claro); color: var(--primario-fuerte); }
  .cu-juicio { margin: 10px 0 0; font-weight: 600; font-size: 0.9rem; }
  .cu-juicio.bien { color: var(--primario-fuerte); }
  .cu-agua { display: flex; gap: 8px; align-items: flex-start; margin: 10px 0 0; padding: 10px 12px; border-radius: var(--r-s); background: var(--superficie-2); font-size: 0.82rem; color: var(--texto-2); }
  .cu-agua :global(svg) { color: var(--azul); flex-shrink: 0; margin-top: 1px; }
</style>
