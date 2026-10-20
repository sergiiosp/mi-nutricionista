<script>
  // Reservar kcal para un día libre: eliges el día, la comida y cuánto ahorrar; los días de antes
  // comen un poco menos y esa comida tiene todo el margen (para comer fuera o lo que te apetezca).
  import Icono from './Icono.svelte';
  import { estado } from '../stores/estado.js';
  import { avisar, cerrarHoja } from '../stores/ui.js';
  import { guardarDiaLibre, quitarDiaLibre } from '../lib/acciones.js';
  import { hoyISO, sumarDias, diasAhorro } from '../lib/planificador.js';
  import { diaSemana, capital, fechaCorta } from '../lib/formato.js';

  const hoy = hoyISO();
  const manana = sumarDias(hoy, 1);
  const actual = $estado.perfil?.diaLibre?.fecha >= hoy ? $estado.perfil.diaLibre : null;
  // Días posibles: del plan, a partir de pasado mañana (al menos un día para ahorrar)
  const dias = ($estado.plan?.dias || []).map((d) => d.fecha).filter((f) => f > manana);
  let fecha = $state(actual?.fecha || dias.find((f) => [5, 6].includes(new Date(`${f}T12:00`).getDay())) || dias.at(-1));
  let franja = $state(actual?.franja || 'cena');
  let ahorro = $state(actual?.ahorro || 150);
  const nDias = $derived(fecha ? diasAhorro({ desde: manana, fecha }).length : 0);
  const extra = $derived(ahorro * nDias);

  function guardar() {
    guardarDiaLibre({ fecha, franja, ahorro });
    avisar(`Reservadas ${extra} kcal para tu ${franja} del ${diaSemana(fecha)}`, '🎉');
    cerrarHoja();
  }
  function quitar() {
    quitarDiaLibre();
    avisar('Día libre quitado: el menú vuelve a lo normal', '↩️');
    cerrarHoja();
  }
</script>

<div class="libre">
  <p class="intro">Come un poco menos unos días y date un capricho sin salirte de la semana.</p>

  {#if !dias.length}
    <p class="pie-nota">Tu menú termina pronto: crea una semana nueva para reservar un día libre.</p>
  {:else}
    <h3>¿Qué día?</h3>
    <div class="opciones-fila">
      {#each dias as f (f)}
        <button class:activo={fecha === f} aria-pressed={fecha === f} onclick={() => (fecha = f)}><small>{capital(diaSemana(f)).slice(0, 3)}</small><b>{Number(f.slice(8))}</b></button>
      {/each}
    </div>

    <h3>¿Qué comida?</h3>
    <div class="segm">
      {#each [['comida', 'Comida'], ['cena', 'Cena']] as [id, n] (id)}
        <button class:activo={franja === id} aria-pressed={franja === id} onclick={() => (franja = id)}>{n}</button>
      {/each}
    </div>

    <h3>¿Cuánto ahorras cada día?</h3>
    <div class="segm">
      {#each [100, 150, 200, 250] as n (n)}
        <button class:activo={ahorro === n} aria-pressed={ahorro === n} onclick={() => (ahorro = n)}>{n} kcal</button>
      {/each}
    </div>

    <div class="resultado">
      <span class="r-ic"><Icono n="party-popper" tam={22} /></span>
      <div>
        <b class="cifra">+{extra.toLocaleString('es-ES')} kcal</b>
        <small>para tu {franja} del {diaSemana(fecha)} {Number(fecha.slice(8))} · ahorrando {ahorro} kcal {nDias === 1 ? 'mañana' : `durante ${nDias} días (desde mañana)`}</small>
      </div>
    </div>
    <p class="pie-nota">El ahorro sale sobre todo de hidratos y grasa: la proteína se mantiene para no perder músculo. Hoy no cambia nada.</p>

    <button class="boton ancho" onclick={guardar}><Icono n="check" tam={18} grosor={2.4} /> {actual ? 'Guardar cambios' : 'Reservar'}</button>
    {#if actual}<button class="boton boton-sec ancho" onclick={quitar}>Quitar el día libre del {fechaCorta(actual.fecha)}</button>{/if}
  {/if}
</div>

<style>
  .intro { margin: 0 0 6px; color: var(--texto-2); font-size: 0.92rem; }
  h3 { margin: 16px 0 8px; font-size: 0.86rem; font-weight: 700; color: var(--texto-2); }
  .opciones-fila { display: flex; gap: 6px; overflow-x: auto; scrollbar-width: none; }
  .opciones-fila button { flex: 0 0 52px; display: grid; justify-items: center; padding: 8px 0; border: 0; border-radius: 14px; background: var(--superficie); box-shadow: var(--sombra); color: var(--texto-2); font: inherit; cursor: pointer; }
  .opciones-fila small { font-size: 0.72rem; font-weight: 700; }
  .opciones-fila b { font-size: 1.1rem; color: var(--texto); }
  .opciones-fila button.activo { background: var(--primario); color: var(--sobre-primario); }
  .opciones-fila button.activo b { color: var(--sobre-primario); }
  .segm { display: flex; gap: 6px; flex-wrap: wrap; }
  .segm button { min-height: 42px; padding: 0 16px; border: 0; border-radius: 999px; background: var(--superficie); box-shadow: var(--sombra); color: var(--texto-2); font: inherit; font-weight: 700; font-size: 0.86rem; cursor: pointer; }
  .segm button.activo { background: var(--primario); color: var(--sobre-primario); }
  .resultado { display: flex; gap: 12px; align-items: center; margin-top: 18px; padding: 14px; border-radius: 18px; background: radial-gradient(120% 100% at 0% 0%, var(--tinte), transparent 65%), var(--superficie); box-shadow: var(--sombra); }
  .r-ic { display: grid; place-items: center; width: 46px; height: 46px; border-radius: 14px; background: var(--primario-claro); color: var(--primario); flex-shrink: 0; }
  .resultado div { display: grid; }
  .resultado b { font-size: 1.6rem; color: var(--primario-fuerte); letter-spacing: -0.02em; }
  .resultado small { font-size: 0.8rem; color: var(--texto-2); }
  .ancho { width: 100%; margin-top: 12px; }
</style>
