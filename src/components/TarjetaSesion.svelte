<script>
  import Icono from './Icono.svelte';
  import { abrirHoja } from '../stores/ui.js';
  import { hoyISO } from '../lib/planificador.js';

  let { sesion, registro = null, compacta = false } = $props();
  const hoy = hoyISO();
  const estado = $derived(registro ? registro.estado : sesion.fecha < hoy ? 'sin-registrar' : 'pendiente');
  const ETQ = { completa: 'Hecha', parcial: 'A medias', no: 'No la hice', 'sin-registrar': '¿Qué tal fue?', pendiente: '' };
</script>

<article class="sesion c-{sesion.color} e-{estado}" class:compacta>
  <button class="cuerpo" onclick={() => abrirHoja('sesion', { id: sesion.id })}>
    <span class="ic"><Icono e={sesion.emoji} tam={compacta ? 22 : 24} /></span>
    <span class="txt">
      <b>{sesion.titulo}</b>
      <span class="datos">
        <span><Icono n="clock" tam={13} /> {sesion.hora}</span>
        <span><Icono n="timer" tam={13} /> {sesion.duracion} min</span>
        {#if sesion.distancia}<span><Icono n="route" tam={13} /> {String(sesion.distancia).replace('.', ',')} km</span>{/if}
        <span><Icono n="flame" tam={13} /> RPE {sesion.rpe}</span>
        {#if sesion.fecha !== sesion.fechaOriginal}<span><Icono n="shuffle" tam={13} /> movida</span>{/if}
        {#if sesion.sinGym}<span><Icono n="map-pin" tam={13} /> sin gimnasio</span>{/if}
      </span>
    </span>
    {#if ETQ[estado]}<span class="etq-estado">{ETQ[estado]}</span>{/if}
  </button>
  {#if !registro && sesion.fecha <= hoy && sesion.tipo !== 'carrera'}
    <button class="registrar" onclick={() => abrirHoja('registrarSesion', { id: sesion.id })}><Icono n="notebook-pen" tam={16} /> Registrar sesión</button>
  {/if}
</article>

<style>
  .sesion { position: relative; border-radius: 20px; background: var(--superficie); box-shadow: var(--sombra); overflow: hidden; --c: var(--primario); }
  .sesion::before { content: ""; position: absolute; left: 0; top: 14px; bottom: 14px; width: 3px; border-radius: 0 3px 3px 0; background: var(--c); }
  .c-azul { --c: var(--azul); } .c-coral { --c: var(--coral); } .c-lila { --c: var(--lila); }
  .c-amarillo { --c: var(--amarillo); } .c-primario { --c: var(--primario); } .c-gris { --c: var(--texto-3); }
  .cuerpo { width: 100%; display: flex; align-items: center; gap: 12px; padding: 12px 12px 12px 14px; border: 0; background: none; text-align: left; cursor: pointer; color: var(--texto); }
  .ic { width: 48px; height: 48px; border-radius: 14px; display: grid; place-items: center; flex-shrink: 0; color: var(--c); background: color-mix(in srgb, var(--c) 14%, var(--superficie)); }
  .compacta .ic { width: 42px; height: 42px; }
  .txt { flex: 1; min-width: 0; display: grid; gap: 2px; }
  .txt b { font-size: 0.95rem; font-weight: 600; line-height: 1.3; }
  .datos { display: flex; flex-wrap: wrap; gap: 3px 12px; color: var(--texto-2); font-size: 0.76rem; font-variant-numeric: tabular-nums; }
  .datos span { display: inline-flex; align-items: center; gap: 4px; }
  .etq-estado { flex-shrink: 0; padding: 4px 9px; border-radius: 999px; font-size: 0.74rem; font-weight: 700; background: var(--superficie-2); color: var(--texto-2); }
  .e-completa .etq-estado { background: var(--exito-claro); color: var(--exito); }
  .e-parcial .etq-estado { background: var(--amarillo-claro); color: var(--amarillo); }
  .e-no .etq-estado { background: var(--superficie-3); color: var(--texto-2); }
  .e-sin-registrar .etq-estado { background: var(--primario-claro); color: var(--primario-fuerte); }
  .e-completa .txt b { color: var(--texto-2); }
  .registrar { width: 100%; display: flex; align-items: center; justify-content: center; gap: 7px; padding: 11px; border: 0; border-top: 1px solid var(--linea); background: none; font-size: 0.86rem; font-weight: 700; color: var(--primario); cursor: pointer; }
</style>
