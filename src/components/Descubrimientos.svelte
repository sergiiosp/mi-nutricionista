<script>
  // Descubrimientos: lo que dicen tus propios datos (sueño, hidratos, proteína, cenas, fin de semana,
  // digestión), con la comparación de los dos grupos en barras. Y lo que aún está aprendiendo de ti.
  import { slide } from 'svelte/transition';
  import Icono from './Icono.svelte';
  import { estado } from '../stores/estado.js';
  import { descubrimientos } from '../lib/descubrimientos.js';
  import { valorarPlato } from '../lib/acciones.js';
  import { hoyISO } from '../lib/planificador.js';
  import { entero } from '../lib/formato.js';

  const d = $derived(descubrimientos($estado, hoyISO()));
  let todos = $state(false);
  const visibles = $derived(todos ? d.hallazgos : d.hallazgos.slice(0, 3));
  const quitado = (id) => ($estado.perfil?.recetasNo || []).includes(id);
</script>

<section class="tarjeta desc" aria-label="Descubrimientos con tus datos">
  <div class="ds-cab">
    <span class="ds-ic"><Icono n="lightbulb" tam={18} /></span>
    <span><b>Lo que dicen tus datos</b><small>{d.hallazgos.length ? `${d.hallazgos.length} ${d.hallazgos.length === 1 ? 'descubrimiento' : 'descubrimientos'} · últimos 4 meses` : 'Cruzo lo que apuntas para encontrar patrones'}</small></span>
  </div>

  {#each visibles as h (h.id)}
    {@const max = Math.max(...h.grupos.map((g) => g.valor), 1)}
    <article class="hz" style="--c:{h.color}" transition:slide={{ duration: 180 }}>
      <div class="hz-cab">
        <span class="hz-ic"><Icono n={h.icono} tam={17} grosor={2.1} /></span>
        <b>{h.titulo}</b>
      </div>
      <div class="hz-barras" role="img" aria-label={`${h.unidad}: ${h.grupos.map((g) => `${g.etiqueta} ${h.kcal ? entero(g.valor) : g.valor}`).join(', ')}`}>
        {#each h.grupos as g, i (g.etiqueta)}
          <div class="hz-fila" class:destaca={i === h.destaca}>
            <small>{g.etiqueta}</small>
            <span class="hz-pista"><i style="width:{Math.max(3, (g.valor / max) * 100)}%"></i></span>
            <b class="cifra">{h.kcal ? entero(g.valor) : `${g.valor} %`}</b>
          </div>
        {/each}
        <span class="hz-unidad">{h.unidad} · <span class="hz-conf" class:claro={h.claro}>{h.claro ? 'patrón claro' : 'primera pista'}</span> · {h.grupos.reduce((a, g) => a + g.n, 0)} {h.id.includes('sesion') ? 'sesiones' : h.id === 'cena-sueno' ? 'noches' : 'días'}</span>
      </div>
      <p>{h.detalle}</p>
      {#if h.receta}
        {#if quitado(h.receta)}<p class="hz-hecho"><Icono n="check" tam={14} grosor={2.6} /> Ya no sale en tu menú</p>
        {:else}<button class="boton boton-sec boton-peq" onclick={() => valorarPlato(h.receta, -1)}><Icono n="ban" tam={15} /> Quitarlo del menú</button>{/if}
      {/if}
    </article>
  {/each}
  {#if d.hallazgos.length > 3}
    <button class="ds-mas" onclick={() => (todos = !todos)}>{todos ? 'Ver menos' : `Ver ${d.hallazgos.length - 3} más`} <Icono n={todos ? 'chevron-up' : 'chevron-down'} tam={15} /></button>
  {/if}

  {#if d.sinEfecto.length}
    <div class="ds-bloque">
      <small class="ds-tit">Comprobado: sin diferencia</small>
      <ul class="ds-sin">{#each d.sinEfecto as s (s.id)}<li><Icono n="circle-check" tam={14} /> {s.texto}</li>{/each}</ul>
    </div>
  {/if}

  {#if d.aprendiendo.length}
    <div class="ds-bloque">
      <small class="ds-tit">Aprendiendo de ti</small>
      <ul class="ds-apr">
        {#each d.aprendiendo.slice(0, d.hallazgos.length ? 3 : 6) as a (a.id)}
          <li style="--c:{a.color}">
            <span class="apr-ic"><Icono n={a.icono} tam={15} /></span>
            <span class="apr-txt"><b>{a.titulo}</b><small>{a.como}</small></span>
            <span class="apr-pista" aria-label={`${Math.round(a.progreso * 100)} % de los datos que necesito`}><i style="width:{Math.max(4, a.progreso * 100)}%"></i></span>
          </li>
        {/each}
      </ul>
    </div>
  {/if}
  <p class="pie-nota">Son correlaciones de tus propios datos, no causas: tómalas como pistas para probar.</p>
</section>

<style>
  .desc { margin-top: 12px; }
  .ds-cab { display: flex; align-items: center; gap: 10px; }
  .ds-cab > span:last-child { display: grid; min-width: 0; }
  .ds-cab small { font-size: 0.76rem; color: var(--texto-2); }
  .ds-ic { display: grid; place-items: center; width: 34px; height: 34px; border-radius: var(--r-s); background: var(--amarillo-claro); color: var(--amarillo); flex-shrink: 0; }

  .hz { margin-top: 12px; padding: 14px; border-radius: var(--r-l); background: color-mix(in srgb, var(--c) 7%, var(--superficie)); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--c) 16%, transparent); }
  .hz-cab { display: flex; align-items: flex-start; gap: 10px; }
  .hz-cab b { font-size: 0.98rem; line-height: 1.3; letter-spacing: -0.01em; }
  .hz-ic { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 50%; background: color-mix(in srgb, var(--c) 16%, var(--superficie)); color: var(--c); flex-shrink: 0; }
  .hz-barras { display: grid; gap: 8px; margin-top: 12px; }
  .hz-fila { display: grid; grid-template-columns: minmax(0, 1fr) auto; grid-template-rows: auto auto; column-gap: 10px; row-gap: 4px; align-items: center; }
  .hz-fila small { font-size: 0.76rem; font-weight: 600; color: var(--texto-2); }
  .hz-fila b { grid-row: 1 / 3; grid-column: 2; min-width: 52px; text-align: right; font-size: 1.05rem; color: var(--texto-3); }
  .hz-pista { height: 10px; border-radius: 999px; background: color-mix(in srgb, var(--texto) 6%, transparent); overflow: hidden; }
  .hz-pista i { display: block; height: 100%; border-radius: 999px; background: color-mix(in srgb, var(--texto) 22%, transparent); transition: width 0.6s var(--ease-out); }
  .hz-fila.destaca small { color: var(--texto); }
  .hz-fila.destaca b { color: var(--c); }
  .hz-fila.destaca .hz-pista i { background: var(--c); }
  .hz-unidad { font-size: 0.72rem; color: var(--texto-3); }
  .hz-conf { font-weight: 700; }
  .hz-conf.claro { color: var(--c); }
  .hz p { margin: 10px 0 0; font-size: 0.84rem; line-height: 1.4; color: var(--texto-2); }
  .hz .boton { margin-top: 10px; }
  .hz-hecho { display: flex; align-items: center; gap: 6px; font-weight: 700; color: var(--c) !important; }
  .ds-mas { display: flex; align-items: center; justify-content: center; gap: 4px; width: 100%; min-height: 40px; margin-top: 8px; border: 0; background: none; color: var(--primario-fuerte); font: inherit; font-size: 0.84rem; font-weight: 700; cursor: pointer; }

  .ds-bloque { margin-top: 16px; }
  .ds-tit { display: block; margin-bottom: 6px; font-size: 0.72rem; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: var(--texto-3); }
  .ds-sin { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
  .ds-sin li { display: flex; align-items: flex-start; gap: 8px; font-size: 0.82rem; color: var(--texto-2); }
  .ds-sin li :global(svg) { flex-shrink: 0; margin-top: 2px; color: var(--dato-kcal); }
  .ds-apr { list-style: none; margin: 0; padding: 0; }
  .ds-apr li { display: grid; grid-template-columns: 30px minmax(0, 1fr) 54px; align-items: center; gap: 10px; padding: 8px 0; }
  .ds-apr li + li { border-top: 1px solid var(--linea); }
  .apr-ic { display: grid; place-items: center; width: 30px; height: 30px; border-radius: var(--r-xs); background: color-mix(in srgb, var(--c) 13%, var(--superficie)); color: var(--c); }
  .apr-txt { display: grid; }
  .apr-txt b { font-size: 0.86rem; }
  .apr-txt small { font-size: 0.74rem; line-height: 1.3; color: var(--texto-2); }
  .apr-pista { height: 6px; border-radius: 999px; background: var(--superficie-3); overflow: hidden; }
  .apr-pista i { display: block; height: 100%; border-radius: 999px; background: var(--c); }
</style>
