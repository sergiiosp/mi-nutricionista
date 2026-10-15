<script>
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
        {#if d.r?.proteinaOk}<span class="p-ok" title="Proteína conseguida">💪</span>{:else}<span class="p-ok"></span>{/if}
      </div>
    {/each}
  </div>
  <p class="pie-nota">Línea discontinua: tu objetivo de cada día · 💪 = llegaste a tu proteína.</p>
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
  .rachas div { display: grid; justify-items: center; text-align: center; padding: 12px 6px; border-radius: 20px; background: var(--superficie); box-shadow: var(--sombra); }
  .rachas b { font-size: 1.6rem; font-weight: 900; line-height: 1.1; }
  .rachas small { font-size: 0.72rem; font-weight: 700; color: var(--texto-2); }
  .grafico { display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px; height: 170px; margin-top: 12px; }
  .col { display: grid; grid-template-rows: 1fr auto auto; justify-items: center; gap: 2px; }
  .zona { position: relative; width: 100%; height: 100%; }
  .barra { position: absolute; bottom: 0; left: 18%; right: 18%; border-radius: 10px 10px 4px 4px; background: var(--amarillo); transition: height 0.5s; min-height: 3px; }
  .barra.ok { background: var(--primario); }
  .barra.alto { background: var(--coral); }
  .barra.sin { background: var(--superficie-2); }
  .objetivo { position: absolute; left: 0; right: 0; border-top: 2px dashed var(--texto-2); opacity: 0.45; }
  .col small { font-weight: 800; color: var(--texto-2); font-size: 0.75rem; }
  .p-ok { height: 16px; font-size: 0.75rem; }
  .cifras-g { display: grid; grid-template-columns: 1fr 1fr; gap: 0 10px; }
  .cifras-g .tarjeta { display: grid; margin: 6px 0; }
  .cifras-g small { color: var(--texto-2); font-weight: 700; font-size: 0.76rem; }
  .cifras-g b { font-size: 1.35rem; font-weight: 900; }
  .consejos .cab { display: flex; align-items: center; gap: 10px; }
  .consejos p { margin: 8px 0 0; font-weight: 600; }
</style>
