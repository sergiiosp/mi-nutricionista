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

<div class="rejilla">
  {#each l.lista as x (x.id)}
    <div class="logro" class:ok={x.ok}>
      <Emoji e={x.emoji} tam={44} />
      <b>{x.nombre}</b>
      <small>{x.desc}</small>
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
  .logro:not(.ok) { opacity: 0.45; filter: grayscale(1); }
  .logro.ok { background: linear-gradient(160deg, var(--amarillo-claro), var(--superficie) 70%); }
  .logro b { font-size: 0.9rem; }
  .logro small { font-size: 0.74rem; color: var(--texto-2); font-weight: 600; }
</style>
