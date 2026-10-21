<script>
  // Modo día de carrera: cuenta atrás a la salida y el día hora a hora, con lo que toca ahora resaltado.
  // Mantiene la pantalla encendida mientras está abierta.
  import { onMount, onDestroy } from 'svelte';
  import Icono from './Icono.svelte';
  import Portada from './Portada.svelte';
  import { estado } from '../stores/estado.js';
  import { planDiaCarrera } from '../lib/hyrox/diaCarrera.js';
  import { hoyISO } from '../lib/planificador.js';
  import { fechaLarga, capital } from '../lib/formato.js';

  let { fecha = hoyISO() } = $props();
  const dia = $derived(planDiaCarrera($estado, fecha));
  const esHoy = fecha === hoyISO();
  const minAhora = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };
  let ahora = $state(minAhora());
  let tic;
  let bloqueo = null;
  onMount(async () => {
    tic = setInterval(() => (ahora = minAhora()), 20000);
    try { bloqueo = await navigator.wakeLock?.request('screen'); } catch { /* sin permiso */ }
  });
  onDestroy(() => { clearInterval(tic); bloqueo?.release?.(); });

  // Minutos respecto a la salida (negativo: antes)
  const rel = $derived(esHoy && dia ? ahora - dia.salida : null);
  const actual = $derived(dia && rel != null ? [...dia.items].reverse().find((x) => x.min <= rel) : null);
  const siguiente = $derived(dia && rel != null ? dia.items.find((x) => x.min > rel) : dia?.items[0]);
  const reloj = (m) => (Math.abs(m) >= 60 ? `${Math.floor(Math.abs(m) / 60)} h ${String(Math.abs(m) % 60).padStart(2, '0')} min` : `${Math.abs(m)} min`);
  const estadoCuenta = $derived(rel == null ? `${capital(fechaLarga(fecha))} · salida a las ${dia?.hora}` : rel < 0 ? `Salida en ${reloj(rel)}` : rel < (dia?.duracion || 0) ? `En carrera · ${reloj(rel)}` : '¡Carrera terminada!');
</script>

{#if !dia}
  <p class="pie-nota">No hay ninguna carrera ese día.</p>
{:else}
  <div class="modo">
    <Portada foto="img/sesiones/carrera.webp" color="var(--primario)" alto={250} etiqueta="Día de carrera">
      <div class="mc-sup"><span class="mc-chip"><Icono n="flag" tam={14} grosor={2.2} /> Día de carrera</span><span class="mc-chip">Salida {dia.hora}</span></div>
      <div class="mc-abajo">
        <small>{dia.nombre}</small>
        <b class="cifra cifra-xl">{estadoCuenta}</b>
        <span>Objetivo <b class="cifra">{dia.objetivo}</b></span>
      </div>
    </Portada>

    {#if siguiente && rel != null && rel < (dia.duracion || 0)}
      <div class="proximo"><small>Lo siguiente · {siguiente.hora} (en {reloj(siguiente.min - rel)})</small><b>{siguiente.titulo}</b></div>
    {/if}

    <ol class="linea">
      {#each dia.items as x (x.min + x.titulo)}
        {@const pasado = rel != null && x !== actual && x.min < rel}
        <li class:ahora={x === actual} class:pasado>
          <span class="h cifra">{x.hora}</span>
          <span class="nodo">{#if x.icono}<Icono n={x.icono} tam={15} grosor={2.2} />{:else}<Icono e={x.emoji} tam={15} />{/if}</span>
          <div class="cuerpo">
            <b>{x.titulo}{#if x === actual}<i>ahora</i>{/if}</b>
            <p>{x.texto}</p>
            {#if x.lineas?.length}<ul>{#each x.lineas as l (l)}<li class="cifra">{l}</li>{/each}</ul>{/if}
          </div>
        </li>
      {/each}
    </ol>
    <p class="pie-nota">Nada nuevo hoy: ni comida, ni zapatillas, ni ritmos. La pantalla se queda encendida mientras tengas esto abierto.</p>
  </div>
{/if}

<style>
  .mc-sup { display: flex; justify-content: space-between; gap: 8px; }
  .mc-chip { display: inline-flex; align-items: center; gap: 6px; padding: 6px 11px; border-radius: 999px; background: rgb(0 0 0 / 0.42); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); font-size: 0.78rem; font-weight: 600; }
  .mc-abajo { margin-top: auto; display: grid; gap: 4px; color: #fff; }
  .mc-abajo small { font-size: 0.86rem; font-weight: 600; color: rgb(255 255 255 / 0.8); }
  .mc-abajo > b { font-size: 1.9rem; line-height: 1.1; }
  .mc-abajo span { font-size: 0.86rem; color: rgb(255 255 255 / 0.85); }
  .proximo { display: grid; margin-top: 12px; padding: 12px 14px; border-radius: 16px; background: var(--primario-claro); }
  .proximo small { font-size: 0.76rem; font-weight: 600; color: var(--primario-fuerte); }
  .proximo b { font-size: 1.05rem; }
  .linea { list-style: none; margin: 14px 0 0; padding: 0; position: relative; }
  .linea::before { content: ""; position: absolute; left: 61px; top: 10px; bottom: 10px; width: 2px; background: var(--linea); }
  .linea > li { display: grid; grid-template-columns: 44px 36px minmax(0, 1fr); gap: 0 6px; padding: 6px 0; }
  .h { padding-top: 8px; font-size: 0.8rem; font-weight: 700; color: var(--texto-2); text-align: right; }
  .nodo { position: relative; display: grid; place-items: center; width: 32px; height: 32px; margin: 2px auto 0; border-radius: 50%; background: var(--superficie); box-shadow: 0 0 0 1.5px var(--linea), 0 0 0 4px var(--fondo); color: var(--primario); }
  .cuerpo { padding: 6px 10px 10px; border-radius: 14px; }
  .cuerpo b { display: flex; align-items: center; gap: 8px; font-size: 0.95rem; }
  .cuerpo b i { font-style: normal; padding: 1px 8px; border-radius: 999px; background: var(--primario); color: var(--sobre-primario); font-size: 0.68rem; }
  .cuerpo p { margin: 3px 0 0; font-size: 0.86rem; line-height: 1.4; color: var(--texto-2); }
  .cuerpo ul { margin: 6px 0 0; padding: 8px 10px; border-radius: 10px; background: var(--superficie-2); list-style: none; display: grid; gap: 2px; font-size: 0.82rem; }
  .ahora .cuerpo { background: var(--superficie); box-shadow: inset 0 0 0 1.5px var(--primario); }
  .ahora .nodo { background: var(--primario); color: var(--sobre-primario); }
  .pasado { opacity: 0.45; }
</style>
