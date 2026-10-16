<script>
  import Icono from '../../components/Icono.svelte';
  import Emoji from '../../components/Emoji.svelte';
  import RepasoSemanal from '../../components/RepasoSemanal.svelte';
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

<RepasoSemanal />

<div class="panel">
  <div class="bloque bajo"><span class="b-cab"><Icono n="flame" tam={15} grosor={2.2} /> Racha</span><b class="b-num cifra">{r.registro}</b><span class="b-sub">días registrando</span></div>
  <div class="bloque bajo"><span class="b-cab"><Icono n="biceps-flexed" tam={15} grosor={2.2} /> Proteína</span><b class="b-num cifra">{r.proteina}</b><span class="b-sub">días seguidos llegando</span></div>
  <div class="bloque bajo"><span class="b-cab"><Icono n="target" tam={15} grosor={2.2} /> Kcal</span><b class="b-num cifra">{r.calorias}</b><span class="b-sub">días en tu objetivo</span></div>
</div>

{#if s.porDia.some((d) => d.r)}
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

<h2 class="seccion">Medias de la semana</h2>
<div class="panel dos">
  <div class="bloque bajo"><span class="b-cab">Kcal al día</span><b class="b-num cifra">{entero(s.kcal)}</b><span class="b-sub">objetivo {entero(s.objetivoKcal)}</span></div>
  <div class="bloque bajo"><span class="b-cab">Proteína al día</span><b class="b-num cifra">{Math.round(s.p)} g</b><span class="b-sub">objetivo {Math.round(s.objetivoP)} g</span></div>
  <div class="bloque bajo"><span class="b-cab">Días registrados</span><b class="b-num cifra">{s.diasRegistrados}/6</b><span class="b-sub">{s.diasKcal} dentro de kcal</span></div>
  <div class="bloque bajo"><span class="b-cab">Peso</span><b class="b-num cifra">{s.tendencia ? `${s.tendencia.kgSemana > 0 ? '+' : ''}${num(s.tendencia.kgSemana, 2)}` : '—'}</b><span class="b-sub">kg por semana</span></div>
</div>

{:else}
<div class="tarjeta vacia-semana"><Icono n="chart-column" tam={26} /><p>Cuando registres tus comidas verás aquí tus calorías y tu proteína de cada día.</p></div>
{/if}

<div class="tarjeta destacada consejos">
  <div class="cab"><span class="ic-cab"><Icono n="lightbulb" tam={18} /></span><b>Tu nutricionista dice</b></div>
  {#each s.consejos as c (c)}<p>{c}</p>{/each}
</div>

<style>
  .grafico { display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px; height: 170px; margin-top: 12px; }
  .col { display: grid; grid-template-rows: 1fr auto auto; justify-items: center; gap: 2px; }
  .zona { position: relative; width: 100%; height: 100%; }
  .barra { position: absolute; bottom: 0; left: 20%; right: 20%; border-radius: 8px 8px 3px 3px; background: linear-gradient(180deg, #ffd56b, var(--amarillo)); transition: height 0.5s; min-height: 3px; }
  .barra.ok { background: var(--hero); box-shadow: 0 0 14px rgb(255 91 31 / 0.4); }
  .barra.alto { background: linear-gradient(180deg, #ffd56b, var(--amarillo)); opacity: 0.75; }
  .barra.sin { background: var(--superficie-3); }
  .objetivo { position: absolute; left: 0; right: 0; border-top: 1.5px dashed var(--texto-3); }
  .col small { font-weight: 700; color: var(--texto-3); font-size: 0.7rem; }
  .p-ok { height: 18px; color: var(--primario); }
  .consejos .cab { display: flex; align-items: center; gap: 10px; color: var(--primario); }
  .vacia-semana { display: flex; gap: 12px; align-items: center; color: var(--primario); }
  .vacia-semana p { margin: 0; color: var(--texto-2); font-size: 0.88rem; }
  .ic-cab { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 10px; background: var(--primario-claro); }
  .consejos .cab b { color: var(--texto); }
  .consejos p { margin: 8px 0 0; font-weight: 500; font-size: 0.88rem; color: var(--texto-2); }
</style>
