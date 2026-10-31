<script>
  // Hoja «Suelo pélvico»: la rutina de hoy según tu fase, con «Hecho» para marcarla, y lo que conviene saber (cómo
  // encontrarlo, por qué ayuda, en el gimnasio y cuándo consultar). En Hoy solo aparece como «Suelo pélvico».
  import Icono from './Icono.svelte';
  import { estado } from '../stores/estado.js';
  import { avisar } from '../stores/ui.js';
  import { hoyISO } from '../lib/planificador.js';
  import { rutinaSuelo } from '../lib/suelo.js';
  import { alternarToma, activarSuelo, desactivarSuelo } from '../lib/acciones.js';

  const hoy = hoyISO();
  const activa = $derived(!!$estado.perfil?.sueloPelvico);
  const r = $derived(rutinaSuelo($estado.perfil?.sueloPelvico?.inicio || hoy, hoy));
  const hecho = $derived(!!$estado.tomas?.[hoy]?.suelo);
  function marcar() {
    alternarToma(hoy, 'suelo');
    if (!hecho) avisar('Suelo pélvico hecho', '✅');
  }
  function activar() {
    activarSuelo();
    avisar('Rutina activada: la tienes cada noche en Tu día', '✅');
  }
</script>

<div class="suelo">
  <header class="cab">
    <span class="ic"><Icono n="activity" tam={22} /></span>
    <div>
      <small>Suelo pélvico · {activa ? `semana ${r.semana}` : '5 minutos al día'}</small>
      <h2>Fase {r.fase.nombre.toLowerCase()}</h2>
      <p>{r.fase.postura}{activa && r.siguiente ? `. En ${r.enDias} ${r.enDias === 1 ? 'día' : 'días'}, «${r.siguiente.nombre}»` : ''}</p>
    </div>
  </header>

  <ol class="ejercicios">
    {#each r.fase.ejercicios as x, i (i)}
      <li><span class="n cifra">{i + 1}</span><div><b>{x.nombre}</b><span class="dosis">{x.dosis}</span><p>{x.como}</p></div></li>
    {/each}
  </ol>
  {#if r.fase.truco}<p class="truco"><Icono n="lightbulb" tam={16} /> <span>{r.fase.truco}</span></p>{/if}

  {#if activa}
    <button class="boton ancho" class:hecho aria-pressed={hecho} onclick={marcar}><Icono n="check" tam={18} grosor={2.4} /> {hecho ? 'Hecho hoy' : 'Marcar como hecho'}</button>
  {:else}
    <button class="boton ancho" onclick={activar}>Empezar hoy</button>
  {/if}

  <details class="saber">
    <summary>Cómo encontrarlo <Icono n="chevron-down" tam={18} /></summary>
    <p>Imagina que cortas el pis a mitad y que a la vez aguantas un gas: lo que se cierra y sube por dentro es tu suelo pélvico. Bien hecho, la base del pene se recoge un poco y los testículos suben.</p>
    <p>Úsalo solo para encontrarlo: no lo practiques cortando el pis de verdad.</p>
  </details>
  <details class="saber">
    <summary>Por qué ayuda <Icono n="chevron-down" tam={18} /></summary>
    <p><b>Hemorroides.</b> Un suelo pélvico fuerte que sabe soltarse te ayuda a ir al baño sin empujar. Lo que más las alivia: fibra (tu menú ya lleva algo más), 2,5-3 l de agua, no aguantar las ganas, no empujar ni pasar más de 5 minutos sentado, y un taburete bajo los pies.</p>
    <p><b>Sexo.</b> Son los músculos que mantienen firme la erección y controlan la eyaculación. En los estudios, con unos 3 meses de práctica diaria mejoran las dos cosas. La constancia cuenta más que apretar fuerte.</p>
  </details>
  <details class="saber">
    <summary>En el gimnasio <Icono n="chevron-down" tam={18} /></summary>
    <p>En lo pesado (sentadilla, peso muerto, trineo), coge aire arriba y suéltalo al pasar la parte más dura. No aguantes la respiración apretando más de lo justo: esa presión empuja hacia abajo, justo donde no quieres. Tus sesiones de fuerza te lo recuerdan.</p>
  </details>
  <details class="saber">
    <summary>Cuándo consultar <Icono n="chevron-down" tam={18} /></summary>
    <p>Si sangras, te duele o notas un bulto que no vuelve a entrar, coméntalo con tu médico.</p>
    <p>Un fisioterapeuta de suelo pélvico te dice si lo tienes débil o demasiado tenso. Si está tenso, lo primero es aprender a soltar, y te adapta los ejercicios.</p>
  </details>

  {#if activa}<button class="dejar" onclick={desactivarSuelo}>Dejar la rutina</button>{/if}
</div>

<style>
  .suelo { display: grid; gap: 12px; }
  .cab { display: flex; gap: 14px; align-items: flex-start; }
  .ic { display: grid; place-items: center; width: 46px; height: 46px; border-radius: var(--r-m); background: var(--primario-claro); color: var(--primario-fuerte); flex-shrink: 0; }
  .cab small { font-size: 0.76rem; font-weight: 700; color: var(--primario-fuerte); }
  .cab h2 { margin: 2px 0 4px; font-size: 1.45rem; letter-spacing: -0.02em; }
  .cab p { margin: 0; font-size: 0.88rem; color: var(--texto-2); }
  .ejercicios { list-style: none; margin: 0; padding: 2px 14px; border-radius: var(--r-l); background: var(--superficie); box-shadow: var(--sombra); }
  .ejercicios li { display: grid; grid-template-columns: 26px minmax(0, 1fr); gap: 10px; padding: 12px 0; }
  .ejercicios li + li { border-top: 1px solid var(--linea); }
  .n { width: 26px; height: 26px; border-radius: 50%; display: grid; place-items: center; background: var(--primario-claro); color: var(--primario-fuerte); font-weight: 700; font-size: 0.8rem; }
  .ejercicios b { display: block; font-size: 0.95rem; }
  .dosis { display: block; margin-top: 1px; font-size: 0.84rem; font-weight: 700; color: var(--primario-fuerte); }
  .ejercicios p { margin: 4px 0 0; font-size: 0.86rem; line-height: 1.4; color: var(--texto-2); }
  .truco { display: flex; gap: 8px; align-items: flex-start; margin: 0; padding: 10px 12px; border-radius: var(--r-m); background: var(--amarillo-claro); font-size: 0.86rem; }
  .truco :global(svg) { flex-shrink: 0; margin-top: 2px; }
  .boton.hecho { background: var(--primario-claro); color: var(--primario-fuerte); box-shadow: inset 0 0 0 1.5px var(--primario); }
  .saber { padding: 12px 14px; border-radius: var(--r-m); background: var(--superficie); box-shadow: var(--sombra); }
  .saber summary { display: flex; align-items: center; gap: 8px; min-height: 28px; font-weight: 700; list-style: none; cursor: pointer; }
  .saber summary::-webkit-details-marker { display: none; }
  .saber summary :global(svg) { margin-left: auto; color: var(--texto-3); transition: transform 0.2s var(--ease-out); }
  .saber[open] summary :global(svg) { transform: rotate(180deg); }
  .saber p { margin: 8px 0 0; font-size: 0.88rem; line-height: 1.45; color: var(--texto-2); }
  .saber p b { color: var(--texto); }
  .dejar { justify-self: center; min-height: 44px; border: 0; background: none; color: var(--texto-3); font: inherit; font-weight: 600; font-size: 0.84rem; cursor: pointer; }
</style>
