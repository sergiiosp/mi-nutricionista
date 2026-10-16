<script>
  import Icono from '../../components/Icono.svelte';
  import Emoji from '../../components/Emoji.svelte';
  import { estado } from '../../stores/estado.js';
  import { abrirHoja } from '../../stores/ui.js';
  import { ESTACIONES, EJERCICIOS, pesoEstacion } from '../../data/hyrox.js';
  import { FOTOS_ESTACIONES } from '../../data/fotos.js';
  import { mejoresEstaciones } from '../../lib/hyrox/carrera.js';
  import { mmss } from '../../lib/hyrox/ritmos.js';

  const config = $derived($estado.hyrox.config);
  const mejores = $derived(mejoresEstaciones($estado.hyrox.registros));
</script>

<p class="pie-nota">El formato: 8 × (1 km corriendo + 1 estación). Toca cada una para ver técnica, errores y consejos.</p>
<div class="rejilla">
  {#each ESTACIONES as e (e.id)}
    <button class="card" onclick={() => abrirHoja('estacion', { id: e.id })}>
      <div class="foto">
        {#if FOTOS_ESTACIONES[e.id]}<img src="img/estaciones/{e.id}.webp" alt="" loading="lazy" />{:else}<div class="ilus"><Emoji e={e.emoji} tam={64} /></div>{/if}
        <span class="n">{e.n}</span>
      </div>
      <span class="cuerpo">
        <b>{e.nombre}</b>
        <small>{e.distancia}{pesoEstacion(e, config.categoria, $estado.perfil.sexo) ? ` · ${pesoEstacion(e, config.categoria, $estado.perfil.sexo)}` : ''}</small>
        {#if mejores[e.id]}<small class="mejor"><Icono e="🏅" tam={18} /> {mmss(mejores[e.id])}</small>{/if}
      </span>
    </button>
  {/each}
</div>

<details class="tarjeta ejercicios">
  <summary><Icono e="💪" tam={18} /> Ejercicios de fuerza del plan</summary>
  {#each Object.values(EJERCICIOS) as x (x.nombre)}
    <div class="ej"><Emoji e={x.emoji} tam={26} /><div><b>{x.nombre}</b><p>{x.tecnica}</p></div></div>
  {/each}
</details>

<style>
  .rejilla { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; }
  .card { padding: 0; border: 0; border-radius: 20px; overflow: hidden; background: var(--superficie); box-shadow: var(--sombra); text-align: left; cursor: pointer; color: var(--texto); }
  .foto { position: relative; height: 110px; background: radial-gradient(circle at 30% 20%, var(--superficie-3), var(--superficie-2)); color: var(--primario); }
  .foto img { width: 100%; height: 100%; object-fit: cover; }
  .ilus { height: 100%; display: grid; place-items: center; }
  .n { position: absolute; left: 8px; top: 8px; width: 26px; height: 26px; border-radius: 50%; display: grid; place-items: center; background: rgb(0 0 0 / 0.6); color: #fff; font-weight: 800; font-size: 0.8rem; }
  .cuerpo { display: grid; padding: 10px 12px 12px; }
  .cuerpo small { color: var(--texto-2); font-weight: 700; font-size: 0.76rem; }
  .cuerpo .mejor { color: color-mix(in srgb, var(--amarillo) 70%, var(--texto)); }
  .ejercicios { margin-top: 16px; }
  .ej { display: flex; gap: 10px; align-items: flex-start; padding: 8px 0; border-top: 1px solid var(--superficie-2); }
  .ej p { margin: 2px 0 0; font-size: 0.86rem; color: var(--texto-2); font-weight: 600; }
</style>
