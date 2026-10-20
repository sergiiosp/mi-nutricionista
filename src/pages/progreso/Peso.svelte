<script>
  import Icono from '../../components/Icono.svelte';
  import Emoji from '../../components/Emoji.svelte';
  import { estado, actualizar } from '../../stores/estado.js';
  import { avisar } from '../../stores/ui.js';
  import { calcularObjetivos } from '../../lib/nutricion.js';
  import { hoyISO } from '../../lib/planificador.js';
  import { tendencia, recomendacion } from '../../lib/progreso.js';
  import { reajustarPlan } from '../../lib/acciones.js';
  import { fechaCorta, num } from '../../lib/formato.js';

  const hoy = hoyISO();
  let fecha = $state(hoy);
  let peso = $state('');
  let formAbierto = $state(false);
  const pesos = $derived([...$estado.pesos].sort((a, b) => a.fecha.localeCompare(b.fecha)));
  const o = $derived(calcularObjetivos($estado.perfil));
  const t = $derived(tendencia(pesos));
  const rec = $derived(recomendacion(pesos, $estado.perfil, o));
  const inicial = $derived(pesos[0]?.peso);
  const actual = $derived(pesos.at(-1)?.peso);

  function guardar(ev) {
    ev.preventDefault();
    const p = Number(String(peso).replace(',', '.'));
    if (!(p >= 35 && p <= 250)) return avisar('Revisa el peso', '⚠️');
    const antes = calcularObjetivos($estado.perfil).kcal;
    actualizar((e) => {
      e.pesos = e.pesos.filter((x) => x.fecha !== fecha).concat([{ fecha, peso: p }]);
      e.perfil.peso = [...e.pesos].sort((a, b) => a.fecha.localeCompare(b.fecha)).at(-1).peso;
    });
    peso = '';
    formAbierto = false;
    if (Math.abs(calcularObjetivos($estado.perfil).kcal - antes) >= 30) {
      reajustarPlan();
      avisar('Peso guardado y raciones actualizadas', '⚖️');
    } else avisar('Peso guardado', '⚖️');
  }

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
  <button class="boton ancho-peso" onclick={() => (formAbierto = true)}><Icono n="plus" tam={18} grosor={2.4} /> Apuntar peso de hoy</button>
{:else}
<form class="tarjeta form" onsubmit={guardar}>
  <b class="tit"><Emoji e="⚖️" tam={24} /> Registrar peso</b>
  <label class="campo"><span>Fecha</span><input type="date" bind:value={fecha} max={hoy} required /></label>
  <label class="campo"><span>Peso</span><input enterkeyhint="done" type="number" step="0.1" min="35" max="250" inputmode="decimal" bind:value={peso} placeholder={actual ? num(actual, 1) : ''} required /><small>kg</small></label>
  <button class="boton" type="submit">Guardar</button>
</form>
{/if}

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
  {#if rec.tipo === 'ajuste'}<button class="boton" onclick={() => aplicarAjuste(rec.ajuste)}>Aplicar ajuste ({rec.ajuste > 0 ? '+' : ''}{rec.ajuste} kcal)</button>{/if}
  {#if $estado.perfil.ajusteKcal}<p class="pie-nota">Ajuste acumulado: {$estado.perfil.ajusteKcal > 0 ? '+' : ''}{$estado.perfil.ajusteKcal} kcal. <button class="enlace" onclick={() => aplicarAjuste(-$estado.perfil.ajusteKcal)}>Quitar</button></p>{/if}
</div>

{#if pesos.length}
  <details class="tarjeta">
    <summary>Historial ({pesos.length})</summary>
    <ul class="historial">
      {#each [...pesos].reverse() as p (p.fecha)}
        <li><span>{fechaCorta(p.fecha)}</span><b>{num(p.peso, 1)} kg</b><span></span>
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
</style>
