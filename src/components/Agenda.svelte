<script>
  // Carreras populares (5 km, 10 km, media, maratón) y viajes: el plan y el menú se adaptan solos
  import { slide } from 'svelte/transition';
  import Icono from './Icono.svelte';
  import { estado, nuevoId } from '../stores/estado.js';
  import { avisar } from '../stores/ui.js';
  import { guardarEvento, guardarViaje, borrarDeAgenda } from '../lib/acciones.js';
  import { hoyISO } from '../lib/planificador.js';
  import { fechaCorta, diaSemana } from '../lib/formato.js';

  const hoy = hoyISO();
  const agenda = $derived($estado.agenda || { eventos: [], viajes: [] });
  const eventos = $derived(agenda.eventos.filter((e) => e.fecha >= hoy));
  const viajes = $derived(agenda.viajes.filter((v) => v.hasta >= hoy));

  let abierto = $state(null); // 'carrera' | 'viaje'
  const DISTANCIAS = [['5', '5 km', 5], ['10', '10 km', 10], ['media', 'Media', 21.1], ['maraton', 'Maratón', 42.2], ['otra', 'Otra', null]];
  let dist = $state('media');
  let kmOtra = $state('');
  let fechaEv = $state('');
  let horaEv = $state('09:00');
  let nombreEv = $state('');
  let nombreV = $state('');
  let desde = $state('');
  let hasta = $state('');
  let comida = $state(['fuera', 'super']);
  let error = $state('');

  const COMIDA = [['fuera', 'Restaurantes'], ['super', 'Súper sin cocina'], ['cocina', 'Con cocina']];
  const textoComida = (l) => l.map((c) => COMIDA.find(([v]) => v === c)?.[1].toLowerCase()).filter(Boolean).join(' y ');

  function guardarCarrera() {
    const km = dist === 'otra' ? Number(String(kmOtra).replace(',', '.')) : DISTANCIAS.find(([v]) => v === dist)[2];
    if (!fechaEv) { error = 'Pon la fecha de la carrera'; return; }
    if (!(km > 0)) { error = 'Pon los km de la carrera'; return; }
    guardarEvento({ id: nuevoId(), fecha: fechaEv, hora: horaEv || '09:00', km, nombre: nombreEv.trim() || (km >= 40 ? 'Maratón' : km >= 20 ? 'Media maratón' : `${String(km).replace('.', ',')} km`) });
    avisar('Carrera añadida: plan y comida ajustados', '🏁');
    abierto = null; error = ''; fechaEv = ''; nombreEv = '';
  }
  function guardarElViaje() {
    if (!desde || !hasta) { error = 'Pon el primer y el último día del viaje'; return; }
    if (hasta < desde) { error = 'El último día no puede ser antes del primero'; return; }
    if (!comida.length) { error = 'Elige cómo vas a comer'; return; }
    guardarViaje({ id: nuevoId(), nombre: nombreV.trim() || 'Viaje', desde, hasta, comida: [...comida] });
    avisar('Viaje añadido: esos días, caminar y menú para comer fuera', '🧳');
    abierto = null; error = ''; desde = ''; hasta = ''; nombreV = '';
  }
  function abrir(t) { abierto = abierto === t ? null : t; error = ''; }
  const dias = (a, b) => (a === b ? `${diaSemana(a).slice(0, 3)} ${fechaCorta(a)}` : `${diaSemana(a).slice(0, 3)} ${fechaCorta(a)} – ${diaSemana(b).slice(0, 3)} ${fechaCorta(b)}`);
</script>

<div class="agenda">
  {#if eventos.length || viajes.length}
    <ul class="lista">
      {#each eventos as ev (ev.id)}
        <li>
          <span class="ic carrera"><Icono n="flag" tam={18} /></span>
          <span class="txt"><b>{ev.nombre}</b><small class="cifra">{dias(ev.fecha, ev.fecha)} · {ev.hora} · {String(ev.km).replace('.', ',')} km</small></span>
          <button class="borrar" aria-label="Quitar {ev.nombre}" onclick={() => borrarDeAgenda(ev.id)}><Icono n="trash" tam={17} /></button>
        </li>
      {/each}
      {#each viajes as v (v.id)}
        <li>
          <span class="ic viaje"><Icono n="map-pin" tam={18} /></span>
          <span class="txt"><b>{v.nombre}</b><small class="cifra">{dias(v.desde, v.hasta)} · {textoComida(v.comida)}</small></span>
          <button class="borrar" aria-label="Quitar {v.nombre}" onclick={() => borrarDeAgenda(v.id)}><Icono n="trash" tam={17} /></button>
        </li>
      {/each}
    </ul>
  {:else}
    <p class="vacio">¿Tienes una carrera o un viaje? Añádelos y ajusto el entreno (puesta a punto, recuperación, caminar) y el menú (carga de hidratos, comer fuera).</p>
  {/if}

  <div class="botones">
    <button class:activo={abierto === 'carrera'} onclick={() => abrir('carrera')}><Icono n="flag" tam={16} /> Carrera</button>
    <button class:activo={abierto === 'viaje'} onclick={() => abrir('viaje')}><Icono n="map-pin" tam={16} /> Viaje</button>
  </div>

  {#if abierto === 'carrera'}
    <div class="form" transition:slide={{ duration: 180 }}>
      <div class="chips" role="radiogroup" aria-label="Distancia">
        {#each DISTANCIAS as [v, n] (v)}<button role="radio" aria-checked={dist === v} class:activo={dist === v} onclick={() => (dist = v)}>{n}</button>{/each}
      </div>
      {#if dist === 'otra'}<label class="campo"><span>Kilómetros</span><input type="number" step="0.1" inputmode="decimal" enterkeyhint="done" bind:value={kmOtra} placeholder="15" /></label>{/if}
      <div class="dos">
        <label class="campo"><span>Día</span><input type="date" min={hoy} bind:value={fechaEv} /></label>
        <label class="campo"><span>Hora de salida</span><input type="time" bind:value={horaEv} /></label>
      </div>
      <label class="campo"><span>Nombre <small>(opcional)</small></span><input bind:value={nombreEv} placeholder="Media maratón de…" /></label>
      {#if error}<p class="error">{error}</p>{/if}
      <button class="boton ancho" onclick={guardarCarrera}>Añadir carrera</button>
      <p class="pie-nota">Si es de 15 km o más: semana suave antes, carga de hidratos el día anterior y recuperación al día siguiente.</p>
    </div>
  {:else if abierto === 'viaje'}
    <div class="form" transition:slide={{ duration: 180 }}>
      <label class="campo"><span>Destino <small>(opcional)</small></span><input bind:value={nombreV} placeholder="Madrid" /></label>
      <div class="dos">
        <label class="campo"><span>Primer día</span><input type="date" min={hoy} bind:value={desde} /></label>
        <label class="campo"><span>Último día</span><input type="date" min={desde || hoy} bind:value={hasta} /></label>
      </div>
      <fieldset class="chips" aria-label="Cómo vas a comer"><legend>¿Cómo vas a comer?</legend>
        {#each COMIDA as [v, n] (v)}
          <label class:activo={comida.includes(v)}><input type="checkbox" value={v} bind:group={comida} /> {n}</label>
        {/each}
      </fieldset>
      {#if error}<p class="error">{error}</p>{/if}
      <button class="boton ancho" onclick={guardarElViaje}>Añadir viaje</button>
      <p class="pie-nota">Esos días: caminar en vez de entrenar y un menú que no pide cocina. No entran en tu lista de la compra.</p>
    </div>
  {/if}
</div>

<style>
  .agenda { padding: 14px; border-radius: var(--r-l); background: var(--superficie); box-shadow: var(--sombra); }
  .lista { list-style: none; margin: 0 0 12px; padding: 0; }
  .lista li { display: flex; align-items: center; gap: 12px; padding: 8px 0; }
  .lista li + li { border-top: 1px solid var(--linea); }
  .ic { width: 40px; height: 40px; border-radius: var(--r-s); display: grid; place-items: center; flex-shrink: 0; }
  .ic.carrera { background: var(--primario-claro); color: var(--primario-fuerte); }
  .ic.viaje { background: var(--azul-claro); color: var(--azul); }
  .txt { flex: 1; min-width: 0; display: grid; }
  .txt small { color: var(--texto-2); font-weight: 600; font-size: 0.8rem; }
  .borrar { width: 40px; height: 40px; border: 0; border-radius: var(--r-s); background: none; color: var(--texto-3); display: grid; place-items: center; cursor: pointer; }
  .vacio { margin: 0 0 12px; color: var(--texto-2); font-size: 0.88rem; }
  .botones { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .botones button { display: inline-flex; align-items: center; justify-content: center; gap: 6px; min-height: 46px; border: 1px dashed var(--borde); border-radius: var(--r-m); background: none; color: var(--primario); font: inherit; font-weight: 700; cursor: pointer; }
  .botones button.activo { border-style: solid; border-color: var(--primario); background: var(--primario-claro); }
  .form { margin-top: 12px; display: grid; gap: 10px; }
  .dos { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; border: 0; margin: 0; padding: 0; }
  .chips legend { width: 100%; margin-bottom: 6px; font-weight: 700; font-size: 0.86rem; }
  .chips button, .chips label { display: inline-flex; align-items: center; gap: 6px; min-height: 40px; padding: 0 14px; border-radius: 999px; border: 1px solid var(--borde); background: var(--superficie-2); color: var(--texto); font: inherit; font-weight: 700; font-size: 0.84rem; cursor: pointer; }
  .chips .activo { border-color: var(--primario); background: var(--primario-claro); color: var(--primario-fuerte); }
  .chips input { position: absolute; opacity: 0; pointer-events: none; }
  .ancho { width: 100%; }
  .error { margin: 0; color: var(--peligro); font-weight: 700; font-size: 0.86rem; }
</style>
