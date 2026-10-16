<script>
  import Emoji from '../../components/Emoji.svelte';
  import { estado } from '../../stores/estado.js';
  import { calcularObjetivos } from '../../lib/nutricion.js';
  import { hoyISO } from '../../lib/planificador.js';
  import { logros } from '../../lib/logros.js';

  const l = $derived(logros($estado, calcularObjetivos($estado.perfil), hoyISO()));
</script>

<div class="tarjeta cab">
  <Emoji e="🏅" tam={48} />
  <div><b>{l.conseguidos} de {l.lista.length} logros</b>
    <div class="barra"><div style="width:{(l.conseguidos / l.lista.length) * 100}%"></div></div></div>
</div>

<p class="pie-nota explica">Los logros son pequeñas metas para coger hábitos: se desbloquean solos al usar la app. Debajo de cada uno ves cómo se consigue y cuánto te falta.</p>

<div class="rejilla">
  {#each l.lista as x (x.id)}
    <div class="logro" class:ok={x.ok}>
      <Emoji e={x.emoji} tam={44} />
      <b>{x.nombre}</b>
      <small>{x.desc}</small>
      {#if !x.ok && x.p[1] > 1}
        <div class="mini-barra" aria-label="{x.p[0]} de {x.p[1]}"><div style="width:{(x.p[0] / x.p[1]) * 100}%"></div></div>
        <small class="falta">{String(x.p[0]).replace('.', ',')} de {x.p[1]}</small>
      {/if}
    </div>
  {/each}
</div>

<style>
  .cab { display: flex; gap: 14px; align-items: center; }
  .cab > div { flex: 1; }
  .barra { height: 10px; border-radius: 999px; background: var(--superficie-2); overflow: hidden; margin-top: 8px; }
  .barra div { height: 100%; border-radius: 999px; background: var(--hero); }
  .rejilla { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 10px; }
  .logro { display: grid; justify-items: center; gap: 4px; text-align: center; padding: 16px 10px; border-radius: 20px; background: var(--superficie); box-shadow: var(--sombra); }
  .logro:not(.ok) { opacity: 0.6; filter: grayscale(1); }
  .explica { margin: 0 0 10px; }
  .mini-barra { width: 80%; height: 5px; border-radius: 999px; background: var(--superficie-2); overflow: hidden; margin-top: 4px; }
  .mini-barra div { height: 100%; background: var(--primario); }
  .falta { font-weight: 800 !important; }
  .logro.ok { background: linear-gradient(160deg, var(--amarillo-claro), var(--superficie) 70%); }
  .logro b { font-size: 0.9rem; }
  .logro small { font-size: 0.74rem; color: var(--texto-2); font-weight: 600; }
</style>
