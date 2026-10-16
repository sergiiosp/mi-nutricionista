<script>
  import Icono from '../../components/Icono.svelte';
  // Cuestionario HYROX: carrera, categoría, nivel, marcas, disponibilidad, material y lesiones
  import { get } from 'svelte/store';
  import Emoji from '../../components/Emoji.svelte';
  import { estado } from '../../stores/estado.js';
  import { avisar } from '../../stores/ui.js';
  import { CATEGORIAS, NIVELES, MATERIAL, LESIONES } from '../../data/hyrox.js';
  import { guardarHyrox } from '../../lib/acciones.js';
  import { hoyISO } from '../../lib/planificador.js';
  import { aSegundos, mmss } from '../../lib/hyrox/ritmos.js';

  let { onguardado, oncancelar = null } = $props();
  const e = get(estado);
  const previa = e.hyrox?.config || {};
  const DIAS = [[1, 'L'], [2, 'M'], [3, 'X'], [4, 'J'], [5, 'V'], [6, 'S'], [0, 'D']];

  let sinFecha = $state(previa.inicio ? !previa.fechaCarrera : false);
  let fechaCarrera = $state(previa.fechaCarrera || '');
  let horaCarrera = $state(previa.horaCarrera || '10:00');
  let categoria = $state(previa.categoria || 'open');
  let nivel = $state(previa.nivel || 'intermedio');
  let t5k = $state(previa.marcas?.t5k ? mmss(previa.marcas.t5k) : '');
  let ski = $state(previa.marcas?.ski1000 ? mmss(previa.marcas.ski1000) : '');
  let row = $state(previa.marcas?.row1000 ? mmss(previa.marcas.row1000) : '');
  let dias = $state(previa.dias || (e.perfil.diasEntreno?.length ? [...e.perfil.diasEntreno] : [1, 2, 4, 6]));
  let hora = $state(previa.hora || e.perfil.horaEntreno || '19:00');
  let material = $state({ ski: true, row: true, sled: true, wallball: true, kettlebell: true, sandbag: true, ...(previa.material || {}) });
  let lesiones = $state(previa.lesiones || []);
  let error = $state('');

  const semanas = $derived(fechaCarrera ? Math.ceil((new Date(`${fechaCarrera}T12:00`) - new Date(`${hoyISO()}T12:00`)) / 604800000) : null);

  function alternarDia(d) {
    dias = dias.includes(d) ? dias.filter((x) => x !== d) : [...dias, d];
  }

  function guardar(ev) {
    ev.preventDefault();
    error = '';
    if (!sinFecha && !fechaCarrera) return (error = 'Pon la fecha de tu carrera o marca que aún no la tienes.');
    if (!sinFecha && fechaCarrera <= hoyISO()) return (error = 'La fecha de la carrera tiene que ser futura.');
    if (dias.length < 2) return (error = 'Necesito al menos 2 días de entreno por semana.');
    const marca = (txt, min, max) => {
      const s = aSegundos(txt);
      return s && s >= min && s <= max ? s : null;
    };
    const config = {
      inicio: previa.inicio || hoyISO(),
      fechaCarrera: sinFecha ? null : fechaCarrera,
      horaCarrera,
      categoria, nivel, dias, hora, material, lesiones,
      marcas: { ...(previa.marcas || {}), t5k: marca(t5k, 900, 3600), ski1000: marca(ski, 150, 480), row1000: marca(row, 150, 480) },
    };
    guardarHyrox(config);
    avisar(previa.inicio ? 'Plan HYROX actualizado' : '¡Tu plan HYROX está listo!', '🏆');
    onguardado?.();
  }
</script>

<form onsubmit={guardar}>
  <h2 class="seccion"><Emoji e="📅" tam={24} /> Tu carrera</h2>
  <div class="tarjeta">
    <label class="interruptor"><input type="checkbox" bind:checked={sinFecha} /><span><b>Aún no tengo fecha</b><small>Te preparo un bloque genérico de 12 semanas</small></span></label>
    {#if !sinFecha}
      <div class="fila-campos dos">
        <label class="campo"><span>Fecha</span><input type="date" bind:value={fechaCarrera} min={hoyISO()} /></label>
        <label class="campo"><span>Hora de salida</span><input type="time" bind:value={horaCarrera} step="900" /></label>
      </div>
      {#if semanas}<p class="pie-nota">Quedan {semanas} semanas{semanas < 6 ? ': plan corto, iremos directos a lo específico' : semanas > 24 ? ': empezaremos con una base larga' : ''}.</p>{/if}
    {/if}
  </div>

  <fieldset class="opciones dos"><legend>Categoría</legend>
    {#each Object.entries(CATEGORIAS) as [id, c] (id)}
      <label class="opcion"><input type="radio" name="categoria" value={id} bind:group={categoria} /><span><b>{c.nombre}</b><small>{c.desc}</small></span></label>
    {/each}
  </fieldset>

  <fieldset class="opciones lista"><legend>Tu nivel</legend>
    {#each Object.entries(NIVELES) as [id, n] (id)}
      <label class="opcion"><input type="radio" name="nivel" value={id} bind:group={nivel} /><span><i class="op-emoji"><Icono e={id === 'principiante' ? '🌱' : id === 'intermedio' ? '💪' : '🔥'} tam={22} /></i><b>{n.nombre}</b><small>{n.desc}</small></span></label>
    {/each}
  </fieldset>

  <h2 class="seccion"><Emoji e="⏱️" tam={24} /> Tus marcas</h2>
  <p class="pie-nota">Con ellas calculo tus ritmos y tu tiempo estimado. Si no las sabes, déjalas vacías y uso las de tu nivel.</p>
  <div class="fila-campos">
    <label class="campo"><span>5 km</span><input bind:value={t5k} placeholder="25:00" inputmode="numeric" /></label>
    <label class="campo"><span>SkiErg 1.000 m</span><input bind:value={ski} placeholder="4:30" inputmode="numeric" /></label>
    <label class="campo"><span>Remo 1.000 m</span><input bind:value={row} placeholder="4:10" inputmode="numeric" /></label>
  </div>

  <h2 class="seccion"><Emoji e="🗓️" tam={24} /> Disponibilidad</h2>
  <fieldset class="dias-sel"><legend>Días que puedes entrenar</legend>
    {#each DIAS as [n, l] (n)}
      <label class="dia-check"><input type="checkbox" checked={dias.includes(n)} onchange={() => alternarDia(n)} /><span>{l}</span></label>
    {/each}
  </fieldset>
  <label class="campo"><span>Hora habitual de entreno</span><input type="time" bind:value={hora} step="900" /></label>

  <h2 class="seccion"><Emoji e="🏋️" tam={24} /> Material de tu gimnasio</h2>
  <div class="chips-sel">
    {#each Object.entries(MATERIAL) as [id, m] (id)}
      <label class="chip-check"><input type="checkbox" bind:checked={material[id]} /><span>{m.emoji} {m.nombre}</span></label>
    {/each}
  </div>
  <p class="pie-nota">Lo que no tengas lo sustituyo por ejercicios equivalentes.</p>

  <fieldset class="chips-sel"><legend>Molestias o lesiones</legend>
    {#each Object.entries(LESIONES) as [id, n] (id)}
      <label class="chip-check no"><input type="checkbox" value={id} bind:group={lesiones} /><span>{n}</span></label>
    {/each}
  </fieldset>

  {#if error}<p class="error-form">{error}</p>{/if}
  <div class="botones">
    {#if oncancelar}<button type="button" class="boton boton-sec" onclick={oncancelar}>Cancelar</button>{/if}
    <button class="boton" type="submit">{previa.inicio ? 'Guardar cambios' : 'Crear mi plan'}</button>
  </div>
</form>

<style>
  .botones { display: flex; gap: 10px; margin: 20px 0 10px; }
  .botones .boton { flex: 1; }
  .fila-campos .campo input { padding-right: 12px; }
</style>
