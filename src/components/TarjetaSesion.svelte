<script>
  import Emoji from './Emoji.svelte';
  import { abrirHoja } from '../stores/ui.js';
  import { hoyISO } from '../lib/planificador.js';

  let { sesion, registro = null, compacta = false } = $props();
  const hoy = hoyISO();
  const estado = $derived(registro ? registro.estado : sesion.fecha < hoy ? 'sin-registrar' : 'pendiente');
  const ETQ = { completa: '✓ Hecha', parcial: '◐ A medias', no: '✕ No la hice', 'sin-registrar': '¿Qué tal fue?', pendiente: '' };
</script>

<article class="sesion c-{sesion.color} e-{estado}" class:compacta>
  <button class="cuerpo" onclick={() => abrirHoja('sesion', { id: sesion.id })}>
    <span class="ic"><Emoji e={sesion.emoji} tam={compacta ? 30 : 36} /></span>
    <span class="txt">
      <b>{sesion.titulo}</b>
      <small>{sesion.hora} · {sesion.duracion} min{sesion.distancia ? ` · ${String(sesion.distancia).replace('.', ',')} km` : ''} · RPE {sesion.rpe}{sesion.fecha !== sesion.fechaOriginal ? ' · 🔀 movida' : ''}</small>
    </span>
    {#if ETQ[estado]}<span class="etq-estado">{ETQ[estado]}</span>{/if}
  </button>
  {#if !registro && sesion.fecha <= hoy && sesion.tipo !== 'carrera'}
    <button class="registrar" onclick={() => abrirHoja('registrarSesion', { id: sesion.id })}>📝 Registrar sesión</button>
  {/if}
</article>

<style>
  .sesion { border-radius: 20px; background: var(--superficie); box-shadow: var(--sombra); overflow: hidden; border-left: 5px solid var(--borde); }
  .c-azul { border-left-color: var(--azul); } .c-coral { border-left-color: var(--coral); } .c-lila { border-left-color: var(--lila); }
  .c-amarillo { border-left-color: var(--amarillo); } .c-primario { border-left-color: var(--primario); } .c-gris { border-left-color: var(--texto-2); }
  .cuerpo { width: 100%; display: flex; align-items: center; gap: 12px; padding: 12px; border: 0; background: none; text-align: left; cursor: pointer; color: var(--texto); }
  .ic { width: 52px; height: 52px; border-radius: 16px; display: grid; place-items: center; background: var(--superficie-2); flex-shrink: 0; }
  .compacta .ic { width: 44px; height: 44px; }
  .txt { flex: 1; min-width: 0; display: grid; gap: 2px; }
  .txt b { font-size: 0.98rem; line-height: 1.25; }
  .txt small { color: var(--texto-2); font-weight: 600; font-size: 0.8rem; }
  .etq-estado { flex-shrink: 0; padding: 4px 9px; border-radius: 999px; font-size: 0.74rem; font-weight: 800; background: var(--superficie-2); color: var(--texto-2); }
  .e-completa .etq-estado { background: var(--primario-claro); color: var(--primario-fuerte); }
  .e-parcial .etq-estado { background: var(--amarillo-claro); color: color-mix(in srgb, var(--amarillo) 70%, var(--texto)); }
  .e-no .etq-estado { background: var(--coral-claro); color: var(--coral); }
  .e-sin-registrar .etq-estado { background: var(--lila-claro); color: var(--lila); }
  .e-completa .txt b { color: var(--texto-2); }
  .registrar { width: 100%; padding: 10px; border: 0; border-top: 1px solid var(--superficie-2); background: var(--superficie); font-weight: 800; color: var(--primario-fuerte); cursor: pointer; }
</style>
