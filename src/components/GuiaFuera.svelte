<script>
  // Guía para comer fuera: lo que te queda hoy, qué pedir y qué evitar según el sitio (con tus alergias)
  import Icono from './Icono.svelte';
  import { estado } from '../stores/estado.js';
  import { abrirHoja } from '../stores/ui.js';
  import { SITIOS, A_OJO } from '../data/guia-fuera.js';
  import { calcularObjetivos } from '../lib/nutricion.js';
  import { estadoDia } from '../lib/dia.js';
  import { hoyISO } from '../lib/planificador.js';
  import { entero } from '../lib/formato.js';

  let { sitio = 'menu' } = $props();
  let sel = $state(SITIOS.some((s) => s.id === sitio) ? sitio : 'menu');
  const s = $derived(SITIOS.find((x) => x.id === sel));
  const hoy = hoyISO();
  const alergias = $derived(new Set($estado.perfil?.alergias || []));
  const d = $derived($estado.perfil ? estadoDia($estado, calcularObjetivos($estado.perfil), hoy) : null);
  const quedan = $derived(d ? { kcal: Math.max(0, d.objetivo.kcal - d.consumido.kcal), p: Math.max(0, d.objetivo.p - d.consumido.p) } : null);
  const pide = $derived(s.pide.filter((x) => !(x.no || []).some((a) => alergias.has(a))));
  const avisos = $derived((s.si || []).filter((x) => x.alergias.some((a) => alergias.has(a))));
  // Al abrir con un sitio elegido, su pestaña a la vista
  let fila = $state();
  $effect(() => { fila?.querySelector('.activo')?.scrollIntoView({ inline: 'center', block: 'nearest' }); });
</script>

<div class="guia">
  <h2>¿Qué pido?</h2>
  {#if quedan}
    <p class="quedan">Hoy te quedan <b class="cifra">{entero(quedan.kcal)} kcal</b> y <b class="cifra">{Math.round(quedan.p)} g</b> de proteína.</p>
  {/if}

  <div class="sitios" bind:this={fila} role="tablist" aria-label="Tipo de sitio">
    {#each SITIOS as x (x.id)}
      <button role="tab" aria-selected={sel === x.id} class:activo={sel === x.id} onclick={() => (sel = x.id)}><Icono n={x.icono} tam={16} grosor={2.2} /> {x.nombre}</button>
    {/each}
  </div>

  {#key sel}
    <section class="ficha" aria-label={s.nombre}>
      <p class="idea">{s.idea}</p>
      {#each avisos as a (a.t)}
        <p class="alerta"><Icono n="triangle-alert" tam={18} /> <span>{a.t}</span></p>
      {/each}
      <h3>Pide</h3>
      <ul class="lista si">
        {#each pide as x (x.t)}<li><span class="marca"><Icono n="check" tam={13} grosor={3} /></span>{x.t}</li>{/each}
      </ul>
      <h3>Mejor evita</h3>
      <ul class="lista no">
        {#each s.evita as x (x)}<li><span class="marca"><Icono n="minus" tam={13} grosor={3} /></span>{x}</li>{/each}
      </ul>
      <p class="truco"><Icono n="lightbulb" tam={18} /> <span>{s.truco}</span></p>
    </section>
  {/key}

  <h3>Sin báscula, a ojo</h3>
  <div class="ojo">
    {#each A_OJO as x (x.t)}
      <div><span class="o-ic"><Icono n={x.icono} tam={18} /></span><span><b>{x.t}</b><small>{x.d}</small></span></div>
    {/each}
  </div>

  <button class="boton" onclick={() => abrirHoja('registrar', { fecha: hoy, vista: 'fuera' })}><Icono n="plus" tam={18} grosor={2.4} /> Apuntar lo que he comido</button>
</div>

<style>
  .guia h2 { margin: 0 0 4px; font-size: 1.5rem; letter-spacing: -0.02em; }
  .quedan { margin: 0 0 14px; color: var(--texto-2); font-size: 0.9rem; }
  .quedan b { color: var(--primario-fuerte); font-weight: 700; }
  .sitios { display: flex; gap: 6px; overflow-x: auto; scrollbar-width: none; margin: 0 -16px; padding: 2px 16px 12px; }
  .sitios::-webkit-scrollbar { display: none; }
  .sitios button { flex-shrink: 0; display: inline-flex; align-items: center; gap: 6px; min-height: 40px; padding: 0 14px; border: 0; border-radius: 999px; background: var(--superficie); box-shadow: var(--sombra); color: var(--texto-2); font: inherit; font-weight: 700; font-size: 0.84rem; cursor: pointer; transition: background 0.2s var(--ease-out), color 0.2s var(--ease-out); }
  .sitios button.activo { background: var(--primario); color: var(--sobre-primario); }
  .ficha { padding: 16px; border-radius: 22px; background: radial-gradient(120% 90% at 0% 0%, var(--tinte), transparent 65%), var(--superficie); box-shadow: var(--sombra); animation: entra 0.22s var(--ease-out); }
  @keyframes entra { from { opacity: 0; transform: translateY(6px); } }
  .idea { margin: 0; font-size: 1.08rem; font-weight: 700; line-height: 1.3; letter-spacing: -0.01em; text-wrap: pretty; }
  h3 { margin: 16px 0 8px; font-size: 0.86rem; font-weight: 700; color: var(--texto-2); }
  .lista { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
  .lista li { display: flex; gap: 10px; align-items: flex-start; font-size: 0.9rem; line-height: 1.35; }
  .marca { display: grid; place-items: center; width: 20px; height: 20px; margin-top: 1px; border-radius: 50%; flex-shrink: 0; }
  .si .marca { background: var(--primario); color: var(--sobre-primario); }
  .no .marca { background: var(--superficie-3); color: var(--texto-2); }
  .no li { color: var(--texto-2); }
  .alerta, .truco { display: flex; gap: 10px; align-items: flex-start; margin: 12px 0 0; padding: 12px; border-radius: 14px; font-size: 0.86rem; line-height: 1.4; }
  .alerta { background: var(--amarillo-claro); color: var(--texto); }
  .alerta :global(.icono) { color: var(--amarillo); flex-shrink: 0; }
  .truco { margin-top: 16px; background: var(--superficie-2); color: var(--texto-2); }
  .truco :global(.icono) { color: var(--primario); flex-shrink: 0; }
  .ojo { display: grid; gap: 6px; }
  .ojo > div { display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: 14px; background: var(--superficie); box-shadow: var(--sombra); }
  .o-ic { display: grid; place-items: center; width: 36px; height: 36px; border-radius: 10px; background: var(--primario-claro); color: var(--primario); flex-shrink: 0; }
  .ojo b { display: block; font-size: 0.88rem; }
  .ojo small { color: var(--texto-2); font-size: 0.8rem; }
  .boton { width: 100%; margin-top: 18px; }
</style>
