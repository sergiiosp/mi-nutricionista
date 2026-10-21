<script>
  // Logros, en pequeño al final de Semana: cuántos llevas y los tres que tienes más cerca. Todos, en su hoja.
  import Icono from './Icono.svelte';
  import Emoji from './Emoji.svelte';
  import { estado } from '../stores/estado.js';
  import { abrirHoja } from '../stores/ui.js';
  import { calcularObjetivos } from '../lib/nutricion.js';
  import { hoyISO } from '../lib/planificador.js';
  import { logros } from '../lib/logros.js';

  const l = $derived(logros($estado, calcularObjetivos($estado.perfil), hoyISO()));
  // Los más cerca de conseguir (los que llevan más hecho)
  const cerca = $derived(l.lista.filter((x) => !x.ok).sort((a, b) => b.p[0] / b.p[1] - a.p[0] / a.p[1]).slice(0, 3));
</script>

<section class="tarjeta logros-res" aria-label="Logros">
  <button class="lr-cab" onclick={() => abrirHoja('logros')}>
    <span class="lr-ic"><Icono n="medal" tam={18} /></span>
    <span class="lr-txt"><b>Logros</b><small>{l.conseguidos} de {l.lista.length} conseguidos</small></span>
    <span class="lr-ver">Ver todos <Icono n="chevron-right" tam={15} /></span>
  </button>
  <div class="lr-barra" aria-hidden="true"><i style="width:{(l.conseguidos / l.lista.length) * 100}%"></i></div>
  {#if cerca.length}
    <small class="lr-tit">Los tienes cerca</small>
    <ul>
      {#each cerca as x (x.id)}
        <li>
          <Emoji e={x.emoji} tam={26} />
          <span class="lr-n"><b>{x.nombre}</b><small>{x.desc}</small></span>
          {#if x.p[1] > 1}<span class="lr-p cifra">{String(x.p[0]).replace('.', ',')}/{x.p[1]}</span>{/if}
        </li>
      {/each}
    </ul>
  {/if}
</section>

<style>
  .logros-res { margin-top: 12px; }
  .lr-cab { display: flex; align-items: center; gap: 10px; width: 100%; padding: 0; border: 0; background: none; color: var(--texto); font: inherit; text-align: left; cursor: pointer; }
  .lr-ic { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 10px; background: var(--amarillo-claro); color: var(--amarillo); flex-shrink: 0; }
  .lr-txt { flex: 1; display: grid; }
  .lr-txt small { font-size: 0.76rem; color: var(--texto-2); }
  .lr-ver { display: inline-flex; align-items: center; gap: 2px; font-size: 0.8rem; font-weight: 700; color: var(--primario-fuerte); }
  .lr-barra { height: 6px; margin-top: 10px; border-radius: 999px; background: var(--superficie-3); overflow: hidden; }
  .lr-barra i { display: block; height: 100%; border-radius: 999px; background: var(--amarillo); }
  .lr-tit { display: block; margin: 14px 0 2px; font-size: 0.72rem; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: var(--texto-3); }
  ul { list-style: none; margin: 0; padding: 0; }
  li { display: flex; align-items: center; gap: 10px; padding: 8px 0; }
  li + li { border-top: 1px solid var(--linea); }
  .lr-n { flex: 1; min-width: 0; display: grid; }
  .lr-n b { font-size: 0.88rem; }
  .lr-n small { font-size: 0.74rem; color: var(--texto-2); line-height: 1.3; }
  .lr-p { font-size: 0.86rem; font-weight: 700; color: var(--texto-2); }
</style>
