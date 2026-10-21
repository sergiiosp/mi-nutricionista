<script>
  // Todos los logros: conseguidos en dorado y, en los que faltan, cuánto te queda.
  import Emoji from '../../components/Emoji.svelte';
  import Icono from '../../components/Icono.svelte';
  import { estado } from '../../stores/estado.js';
  import { calcularObjetivos } from '../../lib/nutricion.js';
  import { hoyISO } from '../../lib/planificador.js';
  import { logros } from '../../lib/logros.js';

  const l = $derived(logros($estado, calcularObjetivos($estado.perfil), hoyISO()));
</script>

<div class="tarjeta cab">
  <span class="cab-ic"><Icono n="medal" tam={24} /></span>
  <div>
    <b class="cifra">{l.conseguidos} <span>de {l.lista.length}</span></b>
    <div class="barra"><div style="width:{(l.conseguidos / l.lista.length) * 100}%"></div></div>
  </div>
</div>

<p class="pie-nota explica">Pequeñas metas para coger hábitos: se desbloquean solas al usar la app.</p>

<div class="rejilla">
  {#each l.lista as x (x.id)}
    <div class="logro" class:ok={x.ok}>
      <span class="medalla"><Emoji e={x.emoji} tam={24} /></span>
      <b>{x.nombre}</b>
      <small>{x.desc}</small>
      {#if x.ok}
        <span class="hecho"><Icono n="check" tam={12} grosor={3} /> Conseguido</span>
      {:else if x.p[1] > 1}
        <div class="mini-barra" aria-label="{x.p[0]} de {x.p[1]}"><div style="width:{(x.p[0] / x.p[1]) * 100}%"></div></div>
        <small class="falta cifra">{String(x.p[0]).replace('.', ',')} de {x.p[1]}</small>
      {/if}
    </div>
  {/each}
</div>

<style>
  .cab { display: flex; gap: 14px; align-items: center; }
  .cab > div { flex: 1; }
  .cab-ic { display: grid; place-items: center; width: 48px; height: 48px; border-radius: var(--r-m); background: var(--amarillo-claro); color: var(--amarillo); }
  .cab b { font-size: 1.5rem; letter-spacing: -0.02em; }
  .cab b span { font-size: 0.9rem; font-weight: 700; color: var(--texto-3); }
  .barra { height: 8px; border-radius: 999px; background: var(--superficie-3); overflow: hidden; margin-top: 6px; }
  .barra div { height: 100%; border-radius: 999px; background: var(--amarillo); }
  .explica { margin: 10px 0; }
  .rejilla { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 8px; }
  .logro { display: grid; justify-items: center; align-content: start; gap: 4px; text-align: center; padding: 16px 10px 14px; border-radius: var(--r-l); background: var(--superficie); box-shadow: var(--sombra); }
  .medalla { display: grid; place-items: center; width: 52px; height: 52px; margin-bottom: 4px; border-radius: 50%; background: var(--superficie-2); color: var(--texto-3); }
  .logro.ok .medalla { background: radial-gradient(circle at 30% 25%, #fff6d8, var(--amarillo-claro) 60%); color: var(--amarillo); box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--amarillo) 45%, transparent); }
  .logro b { font-size: 0.88rem; line-height: 1.2; }
  .logro:not(.ok) b { color: var(--texto-2); }
  .logro small { font-size: 0.72rem; line-height: 1.3; color: var(--texto-2); font-weight: 500; }
  .hecho { display: inline-flex; align-items: center; gap: 4px; margin-top: 4px; padding: 2px 8px; border-radius: 999px; background: var(--amarillo-claro); color: var(--amarillo); font-size: 0.68rem; font-weight: 800; }
  .mini-barra { width: 80%; height: 5px; border-radius: 999px; background: var(--superficie-3); overflow: hidden; margin-top: 6px; }
  .mini-barra div { height: 100%; border-radius: 999px; background: var(--amarillo); }
  .falta { font-weight: 700 !important; color: var(--texto-3) !important; }
</style>
