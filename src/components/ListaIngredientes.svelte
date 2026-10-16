<script>
  // Ingredientes con su cantidad en crudo. Al tocar uno: cuánto pesa hecho y cómo cocinarlo con lo que tienes.
  import { slide } from 'svelte/transition';
  import Icono from './Icono.svelte';
  import { estado } from '../stores/estado.js';
  import { cantidadTexto, alimento, producto } from '../lib/nutricion.js';
  import { equivalenciaCocido, comoCocinar, APARATOS } from '../data/coccion.js';

  /** antes: ingredientes originales (para marcar lo que se ha ajustado) */
  let { ingredientes, enlaces = false, antes = null, caja = false } = $props();
  let abierto = $state(null);
  const aparatos = $derived($estado.perfil?.aparatos?.length ? $estado.perfil.aparatos : ['microondas', 'airfryer', 'plancha', 'olla']);
  const tieneInfo = (a) => !!(equivalenciaCocido(a, 100) || comoCocinar(a, aparatos));
</script>

<ul class="lista-ing" class:caja>
  {#each ingredientes as i (i.a)}
    {@const p = enlaces ? producto(i.a) : null}
    {@const eq = equivalenciaCocido(i.a, i.g)}
    {@const como = comoCocinar(i.a, aparatos)}
    {@const previo = antes?.find((x) => x.a === i.a)?.g}
    <li>
      {#if tieneInfo(i.a)}
        <button class="fila" class:abierto={abierto === i.a} aria-expanded={abierto === i.a} onclick={() => (abierto = abierto === i.a ? null : i.a)}>
          <span class="cant">{cantidadTexto(i.a, i.g)}{#if eq}<small>crudo</small>{/if}</span>
          <span class="nombre">{alimento(i.a).nombre}{#if previo && Math.abs(previo - i.g) >= 5}<small class="antes">antes {cantidadTexto(i.a, previo)}</small>{/if}</span>
          <Icono n="info" tam={16} clase="mas-info" />
        </button>
        {#if abierto === i.a}
          <div class="info" transition:slide={{ duration: 160 }}>
            {#if eq}<p><b>{cantidadTexto(i.a, i.g)} en crudo ≈ {eq.gramos} g {eq.como}.</b> Si lo pesas ya hecho, busca unos {eq.gramos} g.</p>{/if}
            {#if como}<p class="como"><Icono n={APARATOS[como.aparato].icono} tam={15} /> <span><b>{APARATOS[como.aparato].nombre}:</b> {como.texto}</span></p>{/if}
            {#if p}<a href={p.url} target="_blank" rel="noopener">Ver en Mercadona</a>{/if}
          </div>
        {/if}
      {:else}
        <div class="fila">
          <span class="cant">{cantidadTexto(i.a, i.g)}</span>
          <span class="nombre">{#if p}<a href={p.url} target="_blank" rel="noopener">{alimento(i.a).nombre}</a>{:else}{alimento(i.a).nombre}{/if}{#if previo && Math.abs(previo - i.g) >= 5}<small class="antes">antes {cantidadTexto(i.a, previo)}</small>{/if}</span>
        </div>
      {/if}
    </li>
  {/each}
</ul>
<p class="nota-crudo">Pesos en crudo (legumbres y conservas, escurridas). Toca un alimento con <Icono n="info" tam={13} /> para ver cuánto pesa hecho y cómo cocinarlo.</p>

<style>
  .lista-ing { list-style: none; margin: 10px 0 0; padding: 0; display: grid; font-size: 0.92rem; }
  .lista-ing.caja { background: var(--superficie); padding: 6px 14px; border-radius: var(--radio-s); box-shadow: var(--sombra); }
  .lista-ing li + li { border-top: 1px solid var(--linea); }
  .fila { width: 100%; display: grid; grid-template-columns: minmax(64px, max-content) 1fr auto; gap: 12px; align-items: center; min-height: 40px; padding: 6px 0; border: 0; background: none; color: var(--texto); font: inherit; text-align: left; }
  button.fila { cursor: pointer; }
  .cant { display: grid; font-weight: 800; text-align: right; white-space: nowrap; }
  .cant small { font-size: 0.66rem; font-weight: 600; color: var(--texto-3); }
  .nombre { display: grid; min-width: 0; }
  .nombre a { color: inherit; text-decoration: underline; text-decoration-color: var(--borde); text-underline-offset: 3px; }
  .antes { color: var(--lila); font-weight: 600; font-size: 0.78rem; }
  .fila :global(.mas-info) { color: var(--texto-3); }
  .fila.abierto :global(.mas-info) { color: var(--primario); }
  .info { margin: 0 0 10px; padding: 10px 12px; border-radius: 12px; background: var(--superficie-2); font-size: 0.84rem; line-height: 1.45; color: var(--texto-2); }
  .info p { margin: 0 0 6px; }
  .info b { color: var(--texto); }
  .como { display: flex; gap: 8px; align-items: flex-start; }
  .como :global(svg) { color: var(--primario); flex-shrink: 0; margin-top: 3px; }
  .info a { color: var(--primario); font-weight: 700; }
  .nota-crudo { margin: 8px 0 0; font-size: 0.74rem; color: var(--texto-3); }
  .nota-crudo :global(svg) { vertical-align: -2px; }
</style>
