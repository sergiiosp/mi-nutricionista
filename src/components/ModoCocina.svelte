<script>
  // Modo cocina: los ingredientes para tenerlos a mano y luego los pasos uno a uno, en grande, con la
  // pantalla siempre encendida y un temporizador en los pasos que dicen «10 min», «25 minutos»…
  import { onMount, onDestroy } from 'svelte';
  import Icono from './Icono.svelte';
  import { recetaPorId } from '../lib/planificador.js';
  import { cantidadTexto, alimento } from '../lib/nutricion.js';
  import { cerrarHoja } from '../stores/ui.js';

  let { recetaId, ingredientes } = $props();
  const receta = recetaPorId[recetaId];
  const ings = ingredientes || receta.ingredientes;
  const pasos = ['ingredientes', ...(receta.pasos || [])];
  let i = $state(0);
  let tengo = $state({});

  // Pantalla encendida mientras cocinas
  let bloqueo = null;
  async function mantenerEncendida() { try { bloqueo = await navigator.wakeLock?.request('screen'); } catch { /* sin permiso */ } }
  const alVolver = () => { if (document.visibilityState === 'visible') mantenerEncendida(); };
  onMount(() => { mantenerEncendida(); document.addEventListener('visibilitychange', alVolver); });
  onDestroy(() => { bloqueo?.release?.(); document.removeEventListener('visibilitychange', alVolver); clearInterval(tic); });

  // Temporizador: el primer «N min» del paso
  const minutosDe = (t) => Number(/(\d+)(?:\s*[-–a]\s*\d+)?\s*(?:min|minutos)\b/i.exec(t || '')?.[1]) || 0;
  let quedan = $state(0);
  let enMarcha = $state(false);
  let tic = null;
  function empezar(min) {
    clearInterval(tic);
    quedan = min * 60;
    enMarcha = true;
    tic = setInterval(() => {
      quedan -= 1;
      if (quedan <= 0) { clearInterval(tic); enMarcha = false; aviso(); }
    }, 1000);
  }
  function parar() { clearInterval(tic); enMarcha = false; quedan = 0; }
  function aviso() {
    navigator.vibrate?.([300, 150, 300, 150, 300]);
    try {
      const ctx = new AudioContext();
      for (let k = 0; k < 3; k++) {
        const o = ctx.createOscillator(); const g = ctx.createGain();
        o.frequency.value = 880; o.connect(g); g.connect(ctx.destination);
        g.gain.setValueAtTime(0.25, ctx.currentTime + k * 0.4); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + k * 0.4 + 0.3);
        o.start(ctx.currentTime + k * 0.4); o.stop(ctx.currentTime + k * 0.4 + 0.32);
      }
    } catch { /* sin audio */ }
  }
  const reloj = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const min = $derived(minutosDe(pasos[i]));
</script>

<div class="cocina">
  <div class="c-cab">
    <span class="c-num cifra">{i === 0 ? 'Antes de empezar' : `Paso ${i} de ${pasos.length - 1}`}</span>
    <div class="c-pista" aria-hidden="true"><i style="width:{(i / (pasos.length - 1)) * 100}%"></i></div>
  </div>

  {#key i}
    <div class="c-paso">
      {#if i === 0}
        <h2>{receta.nombre}</h2>
        <p class="c-sub">Saca todo antes de empezar:</p>
        <ul class="c-ings">
          {#each ings as x (x.a)}
            <li><button class:tengo={tengo[x.a]} aria-pressed={!!tengo[x.a]} onclick={() => (tengo = { ...tengo, [x.a]: !tengo[x.a] })}>
              <span class="c-check">{#if tengo[x.a]}<Icono n="check" tam={14} grosor={3} />{/if}</span>
              <span><b>{cantidadTexto(x.a, x.g)}</b> {alimento(x.a).nombre.toLowerCase()}</span>
            </button></li>
          {/each}
        </ul>
      {:else}
        <p class="c-texto">{pasos[i]}</p>
        {#if min}
          <div class="c-timer" class:activo={enMarcha}>
            {#if enMarcha}
              <b class="cifra">{reloj(quedan)}</b>
              <button class="boton boton-sec" onclick={parar}>Parar</button>
            {:else}
              <button class="boton" onclick={() => empezar(min)}><Icono n="timer" tam={20} /> Temporizador {min} min</button>
            {/if}
          </div>
        {/if}
      {/if}
    </div>
  {/key}

  <div class="c-nav">
    <button class="boton boton-sec" disabled={i === 0} onclick={() => (i -= 1)} aria-label="Paso anterior"><Icono n="chevron-left" tam={22} /></button>
    {#if i < pasos.length - 1}
      <button class="boton c-sig" onclick={() => (i += 1)}>{i === 0 ? 'Empezar' : 'Siguiente'} <Icono n="chevron-right" tam={20} /></button>
    {:else}
      <button class="boton c-sig" onclick={cerrarHoja}><Icono n="check" tam={20} /> Listo, a comer</button>
    {/if}
  </div>
  {#if enMarcha && i > 0}<p class="pie-nota">El temporizador sigue aunque pases de paso.</p>{/if}
</div>

<style>
  .cocina { display: flex; flex-direction: column; min-height: 70vh; }
  .c-cab { display: grid; gap: 8px; }
  .c-num { font-size: 0.86rem; font-weight: 800; color: var(--primario-fuerte); }
  .c-pista { height: 6px; border-radius: 999px; background: var(--superficie-3); overflow: hidden; }
  .c-pista i { display: block; height: 100%; border-radius: 999px; background: var(--hero); transition: width 0.3s var(--ease-out); }
  .c-paso { flex: 1; padding: 22px 0 12px; animation: entra 0.22s var(--ease-out); }
  @keyframes entra { from { opacity: 0; transform: translateX(14px); } }
  h2 { margin: 0 0 6px; font-size: 1.5rem; line-height: 1.15; }
  .c-sub { margin: 0 0 10px; color: var(--texto-2); }
  .c-texto { margin: 0; font-size: 1.45rem; line-height: 1.4; font-weight: 600; letter-spacing: -0.01em; text-wrap: pretty; }
  .c-ings { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
  .c-ings button { display: flex; align-items: center; gap: 12px; width: 100%; min-height: 52px; padding: 8px 12px; border: 0; border-radius: 14px; background: var(--superficie); box-shadow: var(--sombra); color: var(--texto); font: inherit; font-size: 1rem; text-align: left; cursor: pointer; }
  .c-ings button.tengo { opacity: 0.55; }
  .c-ings b { font-weight: 800; }
  .c-check { display: grid; place-items: center; width: 24px; height: 24px; border-radius: 50%; border: 2px solid var(--borde); flex-shrink: 0; color: var(--sobre-primario); }
  .tengo .c-check { background: var(--primario); border-color: var(--primario); }
  .c-timer { display: flex; align-items: center; gap: 14px; margin-top: 22px; }
  .c-timer b { font-size: 3rem; letter-spacing: -0.03em; color: var(--primario-fuerte); }
  .c-nav { display: grid; grid-template-columns: 64px 1fr; gap: 8px; position: sticky; bottom: 0; padding-top: 10px; background: linear-gradient(transparent, var(--fondo) 30%); }
  .c-nav .boton:first-child { padding: 0; }
  .c-sig { font-size: 1.05rem; }
</style>
