<script>
  // ¿Qué tal estaba? Me gusta → sale más a menudo (favoritas); no me gusta → deja de salir en el menú.
  import Icono from './Icono.svelte';
  import { estado } from '../stores/estado.js';
  import { valorarPlato } from '../lib/acciones.js';

  let { id, compacto = false } = $props();
  const gusta = $derived(($estado.favoritas || []).includes(id));
  const noGusta = $derived(($estado.perfil?.recetasNo || []).includes(id));
</script>

<div class="valorar" class:compacto role="group" aria-label="¿Qué tal estaba?">
  <span>{gusta ? 'Te gusta: saldrá más a menudo' : noGusta ? 'No volverá a salir' : '¿Qué tal estaba?'}</span>
  <button class:activo={gusta} aria-pressed={gusta} aria-label="Me ha gustado" onclick={() => valorarPlato(id, 1)}><Icono n="thumbs-up" tam={16} grosor={2.2} /></button>
  <button class:activo={noGusta} class:no={noGusta} aria-pressed={noGusta} aria-label="No me ha gustado" onclick={() => valorarPlato(id, -1)}><Icono n="thumbs-down" tam={16} grosor={2.2} /></button>
</div>

<style>
  .valorar { display: flex; align-items: center; gap: 6px; margin-top: 8px; font-size: 0.8rem; font-weight: 600; color: var(--texto-2); }
  .valorar span { flex: 1; min-width: 0; }
  .valorar.compacto { margin: 4px 0 0 4px; font-size: 0.76rem; color: var(--texto-3); }
  button { display: grid; place-items: center; width: 44px; height: 36px; border: 0; border-radius: 12px; background: var(--superficie-2); color: var(--texto-2); cursor: pointer; transition: background 0.15s var(--ease-out), color 0.15s var(--ease-out), transform 0.12s var(--ease-out); }
  button:active { transform: scale(0.94); }
  button.activo { background: var(--primario-claro); color: var(--primario-fuerte); box-shadow: inset 0 0 0 1.5px var(--primario); }
  button.activo :global(.icono) { animation: pop 260ms var(--ease-out); }
  button.no { background: var(--superficie-3); color: var(--texto); box-shadow: inset 0 0 0 1.5px var(--texto-3); }
</style>
