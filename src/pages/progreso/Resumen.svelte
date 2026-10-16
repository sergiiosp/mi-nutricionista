<script>
  import Icono from '../../components/Icono.svelte';
  import Emoji from '../../components/Emoji.svelte';
  import { estado } from '../../stores/estado.js';
  import { calcularObjetivos } from '../../lib/nutricion.js';
  import { hoyISO } from '../../lib/planificador.js';
  import { resumenSemanal, rachas } from '../../lib/logros.js';
  import { diaCorto, entero, num } from '../../lib/formato.js';

  const hoy = hoyISO();
  const objetivos = $derived(calcularObjetivos($estado.perfil));
  const s = $derived(resumenSemanal($estado, objetivos, hoy));
  const r = $derived(rachas($estado, objetivos, hoy));
  const maxKcal = $derived(Math.max(...s.porDia.map((d) => Math.max(d.r?.m.kcal || 0, d.r?.od.kcal || objetivos.kcal))) * 1.1);
</script>

<div class="rachas">
  <div><Emoji e="🔥" tam={30} /><b>{r.registro}</b><small>días registrando</small></div>
  <div><Emoji e="💪" tam={30} /><b>{r.proteina}</b><small>días con tu proteína</small></div>
  <div><Emoji e="🎯" tam={30} /><b>{r.calorias}</b><small>días en tus kcal</small></div>
</div>

<div class="tarjeta">
  <b>Calorías de los últimos 7 días</b>
  <div class="grafico" role="img" aria-label="Calorías por día frente a tu objetivo">
    {#each s.porDia as d (d.fecha)}
      {@const v = d.r?.m.kcal || 0}
      {@const obj = d.r?.od.kcal || objetivos.kcal}
      <div class="col">
        <div class="zona">
          <div class="objetivo" style="bottom:{(obj / maxKcal) * 100}%"></div>
          <div class="barra" class:sin={!d.r} class:ok={d.r?.kcalOk} class:alto={d.r && v > obj * 1.1} style="height:{(v / maxKcal) * 100}%"></div>
        </div>
        <small>{diaCorto(d.fecha)}</small>
        {#if d.r?.proteinaOk}<span class="p-ok" title="Proteína conseguida"><Icono e="💪" tam={18} /></span>{:else}<span class="p-ok"></span>{/if}
      </div>
    {/each}
  </div>
  <p class="pie-nota">Línea discontinua: tu objetivo de cada día · <Icono n="biceps-flexed" tam={14} /> = llegaste a tu proteína.</p>
</div>

<div class="cifras-g">
  <div class="tarjeta"><small>Media diaria</small><b>{entero(s.kcal)} kcal</b><small>objetivo {entero(s.objetivoKcal)}</small></div>
  <div class="tarjeta"><small>Proteína media</small><b>{Math.round(s.p)} g</b><small>objetivo {Math.round(s.objetivoP)} g</small></div>
  <div class="tarjeta"><small>Días registrados</small><b>{s.diasRegistrados}/6</b><small>{s.diasKcal} dentro de kcal</small></div>
  <div class="tarjeta"><small>Tendencia de peso</small><b>{s.tendencia ? `${s.tendencia.kgSemana > 0 ? '+' : ''}${num(s.tendencia.kgSemana, 2)}` : '—'}</b><small>kg/semana</small></div>
</div>

<div class="tarjeta consejos">
  <div class="cab"><Emoji e="🥗" tam={30} /><b>Tu nutricionista dice</b></div>
  {#each s.consejos as c (c)}<p>{c}</p>{/each}
</div>

<style>
  .rachas { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
  .rachas div { display: grid; justify-items: center; text-align: center; gap: 2px; padding: 14px 6px 12px; border-radius: 20px; background: var(--superficie); box-shadow: var(--sombra); color: var(--primario); }
  .rachas b { font-size: 1.7rem; font-weight: 800; line-height: 1.1; color: var(--texto); letter-spacing: -0.03em; }
  .rachas small { font-size: 0.68rem; font-weight: 600; color: var(--texto-2); line-height: 1.25; }
  .grafico { display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px; height: 170px; margin-top: 12px; }
  .col { display: grid; grid-template-rows: 1fr auto auto; justify-items: center; gap: 2px; }
  .zona { position: relative; width: 100%; height: 100%; }
  .barra { position: absolute; bottom: 0; left: 20%; right: 20%; border-radius: 8px 8px 3px 3px; background: linear-gradient(180deg, #ffd56b, var(--amarillo)); transition: height 0.5s; min-height: 3px; transform-origin: bottom; animation: crecer 0.8s cubic-bezier(0.25, 0.9, 0.3, 1) both; }
  .barra.ok { background: var(--hero); box-shadow: 0 0 14px rgb(255 91 31 / 0.4); }
  .barra.alto { background: linear-gradient(180deg, #ff7a8e, var(--coral)); }
  .barra.sin { background: var(--superficie-3); animation: none; }
  @keyframes crecer { from { transform: scaleY(0); } }
  .objetivo { position: absolute; left: 0; right: 0; border-top: 1.5px dashed var(--texto-3); }
  .col small { font-weight: 700; color: var(--texto-3); font-size: 0.7rem; }
  .p-ok { height: 18px; color: var(--primario); }
  .cifras-g { display: grid; grid-template-columns: 1fr 1fr; gap: 0 10px; }
  .cifras-g .tarjeta { display: grid; margin: 6px 0; }
  .cifras-g small { color: var(--texto-2); font-weight: 600; font-size: 0.72rem; }
  .cifras-g b { font-size: 1.4rem; font-weight: 800; letter-spacing: -0.03em; font-variant-numeric: tabular-nums; }
  .consejos .cab { display: flex; align-items: center; gap: 10px; color: var(--primario); }
  .consejos .cab b { color: var(--texto); }
  .consejos p { margin: 8px 0 0; font-weight: 500; font-size: 0.88rem; color: var(--texto-2); }
</style>
