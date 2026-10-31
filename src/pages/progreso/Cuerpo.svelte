<script>
  // Progreso → Cuerpo: peso y fotos en una sola pestaña. Arriba, dos fichas con lo último de cada cosa
  // que sirven también para cambiar de vista.
  import Icono from '../../components/Icono.svelte';
  import Peso from './Peso.svelte';
  import Fotos from './Fotos.svelte';
  import { estado } from '../../stores/estado.js';
  import { ir } from '../../stores/ruta.js';
  import { num } from '../../lib/formato.js';
  import { tendencia } from '../../lib/progreso.js';

  let { parte = 'peso' } = $props();
  let vista = $derived(parte); // se puede cambiar tocando las fichas
  const ordenar = (l) => [...(l || [])].sort((a, b) => a.fecha.localeCompare(b.fecha));
  const pesos = $derived(ordenar($estado.pesos));
  const t = $derived(tendencia(pesos));
  const dif = (l, k) => (l.length > 1 ? l.at(-1)[k] - l[0][k] : null);
  const fichas = $derived([
    { id: 'peso', icono: 'scale', nombre: 'Peso', valor: pesos.at(-1) ? num(pesos.at(-1).peso, 1) : '—', unidad: 'kg', cambio: dif(pesos, 'peso') },
    { id: 'fotos', icono: 'camera', nombre: 'Fotos', valor: String(($estado.fotosProgreso || []).length), unidad: '', cambio: null },
  ]);
  function elegir(id) { vista = id; ir('progreso', id); }
</script>

<div class="fichas" role="tablist" aria-label="Peso o fotos">
  {#each fichas as f (f.id)}
    <button role="tab" aria-selected={vista === f.id} class:activa={vista === f.id} onclick={() => elegir(f.id)}>
      <span class="f-cab"><Icono n={f.icono} tam={14} grosor={2.2} /> {f.nombre}</span>
      <b class="cifra">{f.valor}{#if f.unidad}<em>{f.unidad}</em>{/if}</b>
      {#if f.id === 'peso' && t}<small class:baja={t.kgSemana < 0}>{t.kgSemana > 0 ? '+' : t.kgSemana < 0 ? '−' : ''}{num(Math.abs(t.kgSemana), 2)} kg/semana</small>
      {:else if f.cambio != null}<small class:baja={f.cambio < 0}>{f.cambio > 0 ? '+' : f.cambio < 0 ? '−' : ''}{num(Math.abs(f.cambio), 1)} desde el inicio</small>{:else}<small>{f.id === 'fotos' ? 'antes y ahora' : 'sin datos aún'}</small>{/if}
    </button>
  {/each}
</div>

{#if vista === 'fotos'}<Fotos />
{:else}<Peso />{/if}

<style>
  .fichas { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; margin-bottom: 12px; }
  .fichas button { display: grid; gap: 2px; min-height: 84px; padding: 10px 11px; border: 0; border-radius: var(--r-l); background: var(--superficie); box-shadow: var(--sombra); color: var(--texto); font: inherit; text-align: left; cursor: pointer; transition: box-shadow 0.2s var(--ease-out), background 0.2s var(--ease-out); }
  .fichas button.activa { background: var(--primario-claro); box-shadow: inset 0 0 0 1.5px var(--primario); }
  .f-cab { display: flex; align-items: center; gap: 5px; font-size: 0.74rem; font-weight: 700; color: var(--texto-2); }
  .activa .f-cab { color: var(--primario-fuerte); }
  .fichas b { font-size: 1.3rem; line-height: 1.15; letter-spacing: -0.02em; }
  .fichas b em { font-style: normal; font-size: 0.74rem; font-weight: 700; margin-left: 2px; color: var(--texto-3); }
  .fichas small { font-size: 0.68rem; font-weight: 600; color: var(--texto-3); line-height: 1.2; }
  .fichas small.baja { color: var(--dato-kcal); }
</style>
