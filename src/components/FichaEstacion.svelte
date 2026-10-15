<script>
  import Emoji from './Emoji.svelte';
  import { estado } from '../stores/estado.js';
  import { estacionPorId, pesoEstacion } from '../data/hyrox.js';
  import { FOTOS_ESTACIONES } from '../data/fotos.js';
  import { mejoresEstaciones } from '../lib/hyrox/carrera.js';
  import { mmss } from '../lib/hyrox/ritmos.js';

  let { id } = $props();
  const e = $derived(estacionPorId[id]);
  const config = $derived($estado.hyrox?.config);
  const peso = $derived(config ? pesoEstacion(e, config.categoria, $estado.perfil?.sexo) : null);
  const mejor = $derived(mejoresEstaciones($estado.hyrox?.registros)[id]);
</script>

<div class="foto">
  {#if FOTOS_ESTACIONES[id]}<img src="img/estaciones/{id}.webp" alt={e.nombre} />{:else}<div class="ilus"><Emoji e={e.emoji} tam={110} /></div>{/if}
  <span class="num">Estación {e.n}</span>
</div>
<h2>{e.nombre}</h2>
<div class="datos">
  <span>📏 {e.distancia}</span>
  {#if peso}<span>🏋️ {peso}</span>{/if}
  {#if mejor}<span class="mejor">🏅 Tu mejor: {mmss(mejor)}</span>{/if}
</div>
<p class="desc">{e.desc}</p>
<p class="pie-nota">Trabaja: {e.musculos}</p>

<h3>✅ Técnica</h3>
<ul class="lista ok">{#each e.tecnica as t (t)}<li>{t}</li>{/each}</ul>
<h3>⚠️ Errores típicos</h3>
<ul class="lista mal">{#each e.errores as t (t)}<li>{t}</li>{/each}</ul>
<div class="consejo">🏁 <b>En carrera:</b> {e.carrera}</div>
<div class="consejo sust">🔁 {e.sustituto}</div>

<style>
  .foto { position: relative; border-radius: 24px; overflow: hidden; height: 210px; background: linear-gradient(135deg, var(--amarillo-claro), var(--coral-claro)); }
  .foto img { width: 100%; height: 100%; object-fit: cover; }
  .ilus { height: 100%; display: grid; place-items: center; }
  .num { position: absolute; left: 12px; top: 12px; padding: 4px 10px; border-radius: 999px; background: rgb(0 0 0 / 0.55); color: #fff; font-weight: 800; font-size: 0.8rem; }
  h2 { margin: 14px 0 6px; }
  .datos { display: flex; flex-wrap: wrap; gap: 6px; }
  .datos span { padding: 4px 10px; border-radius: 999px; background: var(--superficie); box-shadow: var(--sombra); font-weight: 800; font-size: 0.82rem; }
  .datos .mejor { background: var(--amarillo-claro); }
  .desc { font-weight: 600; }
  .lista { margin: 0; padding: 12px 14px 12px 32px; border-radius: 16px; background: var(--superficie); box-shadow: var(--sombra); display: grid; gap: 6px; font-weight: 600; font-size: 0.92rem; }
  .lista.ok { border-left: 4px solid var(--primario); }
  .lista.mal { border-left: 4px solid var(--coral); }
  .consejo { margin-top: 12px; padding: 12px 14px; border-radius: 16px; background: var(--primario-claro); font-weight: 600; font-size: 0.9rem; }
  .consejo.sust { background: var(--superficie-2); }
</style>
