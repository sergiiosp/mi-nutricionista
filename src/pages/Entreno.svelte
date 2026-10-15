<script>
  import Emoji from '../components/Emoji.svelte';
  import { estado } from '../stores/estado.js';
  import { calcularObjetivos, objetivosDia, DEPORTES } from '../lib/nutricion.js';
  import { esDiaEntreno, horarioDia } from '../lib/horario.js';
  import { hoyISO, sumarDias } from '../lib/planificador.js';
  import { diaCorto, entero } from '../lib/formato.js';

  const hoy = hoyISO();
  const p = $derived($estado.perfil);
  const o = $derived(calcularObjetivos(p));
  const deportes = $derived((p.deportes || []).map((x) => DEPORTES[x]).filter(Boolean));
  const sesion = $derived(horarioDia(p, true).entreno);
  const semana = $derived(Array.from({ length: 7 }, (_, i) => {
    const f = sumarDias(hoy, i);
    const e = esDiaEntreno(p, f);
    return { f, e, od: objetivosDia(o, e) };
  }));
</script>

<h1 class="titulo">Entreno</h1>

{#if p.entrena}
  <div class="tarjeta resumen">
    <div class="r-cab"><Emoji e={deportes[0]?.emoji || '🏋️'} tam={44} /><div><b>{deportes.map((d) => d.nombre).join(' + ')}</b><small>{p.diasEntreno.length} días/semana · {p.horaEntreno} · {p.duracionEntreno} min · intensidad {p.intensidad}</small></div></div>
    <p class="pie-nota">Cada sesión gasta unas <b>{entero(o.kcalSesion)} kcal</b>. Los días de entreno comes {entero(o.porTipo.entreno.kcal - o.porTipo.descanso.kcal)} kcal más, sobre todo de hidratos, con comida pre y post-entreno.</p>
  </div>

  <h2 class="seccion">Tus próximos 7 días</h2>
  <div class="semana">
    {#each semana as d (d.f)}
      <div class="dia" class:entreno={d.e} class:hoy={d.f === hoy}>
        <span class="dc">{diaCorto(d.f)}</span>
        <b>{Number(d.f.slice(8))}</b>
        <Emoji e={d.e ? '💪' : '😌'} tam={22} />
        <small>{entero(d.od.kcal)}</small>
        <small class="h">H {d.od.hidratos}</small>
      </div>
    {/each}
  </div>
  {#if sesion}<p class="pie-nota">Horario tipo de un día de entreno: sesión de {sesion.inicio} a {sesion.fin}. Lo ves en <a href="#hoy">Hoy</a> con tus comidas alrededor.</p>{/if}
{:else}
  <div class="tarjeta vacia">
    <Emoji e="🛋️" tam={56} />
    <p>Ahora mismo no tienes entrenos en tu perfil.</p>
    <a class="boton" href="#ajustes">Añadir mis entrenos</a>
  </div>
{/if}

<div class="tarjeta proximo">
  <div class="r-cab"><Emoji e="🏆" tam={44} /><div><b>Plan HYROX: muy pronto</b><small>Lo siguiente que vamos a construir</small></div></div>
  <ul>
    <li><Emoji e="🗓️" tam={20} /> Plan por fases hasta la fecha de tu carrera</li>
    <li><Emoji e="🏃" tam={20} /> Carrera, estaciones, fuerza y <i>compromised running</i></li>
    <li><Emoji e="⏱️" tam={20} /> Tus ritmos según tus marcas y tiempo estimado de carrera</li>
    <li><Emoji e="📊" tam={20} /> Registro de sesiones y ajuste automático del plan</li>
    <li><Emoji e="🍝" tam={20} /> Nutrición según la sesión y para el día de carrera</li>
  </ul>
</div>

<style>
  .r-cab { display: flex; gap: 12px; align-items: center; }
  .r-cab small { display: block; color: var(--texto-2); font-weight: 600; }
  .semana { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; }
  .dia { display: grid; justify-items: center; gap: 2px; padding: 10px 2px; border-radius: 16px; background: var(--superficie); box-shadow: var(--sombra); }
  .dia.entreno { background: linear-gradient(180deg, var(--coral-claro), var(--superficie)); }
  .dia.hoy { outline: 2px solid var(--primario); outline-offset: -2px; }
  .dc { font-size: 0.72rem; font-weight: 800; color: var(--texto-2); }
  .dia b { font-size: 1.05rem; font-weight: 900; }
  .dia small { font-size: 0.68rem; font-weight: 800; color: var(--texto-2); }
  .dia .h { color: var(--amarillo); }
  .proximo { background: linear-gradient(135deg, var(--lila-claro), var(--superficie) 70%); margin-top: 18px; }
  .proximo ul { list-style: none; padding: 0; margin: 12px 0 0; display: grid; gap: 8px; }
  .proximo li { display: flex; gap: 10px; align-items: center; font-weight: 700; font-size: 0.92rem; }
  .vacia { text-align: center; }
</style>
