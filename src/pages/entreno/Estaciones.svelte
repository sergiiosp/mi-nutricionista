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

<p class="intro">8 veces: 1 km corriendo y una estación. Toca cada una para ver técnica, errores y consejos.</p>
<div class="rejilla">
  {#each ESTACIONES as e (e.id)}
    <button class="card" onclick={() => abrirHoja('estacion', { id: e.id })}>
      {#if FOTOS_ESTACIONES[e.id]}<img class="foto-fondo" src="img/estaciones/{e.id}.webp" alt="" loading="lazy" />{:else}<span class="ilus" aria-hidden="true"><Emoji e={e.emoji} tam={56} /></span>{/if}
      <span class="tinte" aria-hidden="true"></span><span class="velo" aria-hidden="true"></span>
      <span class="n cifra">{e.n}</span>
      {#if mejores[e.id]}<span class="mejor cifra"><Icono n="medal" tam={13} grosor={2.4} /> {mmss(mejores[e.id])}</span>{/if}
      <span class="cuerpo">
        <b>{e.nombre}</b>
        <small class="cifra">{e.distancia}{pesoEstacion(e, config.categoria, $estado.perfil.sexo) ? ` · ${pesoEstacion(e, config.categoria, $estado.perfil.sexo)}` : ''}</small>
      </span>
    </button>
  {/each}
</div>

<details class="tarjeta ejercicios">
  <summary><Icono n="dumbbell" tam={18} /> Ejercicios de fuerza del plan</summary>
  {#each Object.values(EJERCICIOS) as x (x.nombre)}
    <div class="ej"><Emoji e={x.emoji} tam={26} /><div><b>{x.nombre}</b><p>{x.tecnica}</p></div></div>
  {/each}
</details>

<style>
  .intro { margin: 0 2px 12px; color: var(--texto-2); font-size: 0.88rem; }
  .rejilla { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; }
  /* Tarjeta de estación: la foto en duotono naranja y el nombre encima, abajo */
  .card {
    position: relative; overflow: hidden; isolation: isolate; display: flex; align-items: flex-end; min-height: 176px; padding: 0; border: 0; border-radius: 20px;
    background: linear-gradient(160deg, color-mix(in srgb, var(--primario) 35%, #121218), #0b0b0e); text-align: left; cursor: pointer; color: #fff; font: inherit;
    box-shadow: 0 0 0 1px color-mix(in srgb, var(--primario) 22%, transparent);
  }
  .foto-fondo { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; z-index: 0; filter: grayscale(1) contrast(1.2) brightness(0.85); }
  .tinte { position: absolute; inset: 0; z-index: 1; background: var(--primario); mix-blend-mode: color; opacity: 0.8; }
  .velo { position: absolute; inset: 0; z-index: 1; background: linear-gradient(180deg, rgb(8 8 12 / 0.15) 0%, rgb(8 8 12 / 0.15) 35%, rgb(8 8 12 / 0.88) 100%); }
  .ilus { position: absolute; inset: 0 0 40px; display: grid; place-items: center; z-index: 2; color: var(--primario-fuerte); }
  .n { position: absolute; left: 10px; top: 10px; z-index: 2; width: 28px; height: 28px; border-radius: 50%; display: grid; place-items: center; background: #fff; color: #0b0b0e; font-weight: 800; font-size: 0.82rem; }
  .mejor { position: absolute; right: 10px; top: 10px; z-index: 2; display: inline-flex; align-items: center; gap: 4px; padding: 4px 8px; border-radius: 999px; background: rgb(0 0 0 / 0.45); font-size: 0.74rem; font-weight: 800; }
  .cuerpo { position: relative; z-index: 2; display: grid; padding: 12px; }
  .cuerpo b { font-size: 1.02rem; line-height: 1.15; font-weight: 800; }
  .cuerpo small { margin-top: 2px; color: rgb(255 255 255 / 0.75); font-weight: 600; font-size: 0.76rem; }
  .ejercicios { margin-top: 16px; }
  .ej { display: flex; gap: 10px; align-items: flex-start; padding: 8px 0; border-top: 1px solid var(--linea); }
  .ej p { margin: 2px 0 0; font-size: 0.86rem; color: var(--texto-2); }
</style>
