<script>
  // Entreno → Semana: la sesión de hoy como protagonista (estilo programa con coach), lo próximo
  // en bloques de color por tipo y la semana en filas con la fecha a la izquierda.
  import Icono from '../../components/Icono.svelte';
  import { estado } from '../../stores/estado.js';
  import { abrirHoja } from '../../stores/ui.js';
  import { planDe } from '../../lib/hyrox/index.js';
  import { semanaDe, FASES } from '../../lib/hyrox/plan.js';
  import { TIPOS } from '../../lib/hyrox/sesiones.js';
  import { hoyISO, sumarDias } from '../../lib/planificador.js';
  import { diaSemana, fechaCorta } from '../../lib/formato.js';
  import { FOTOS_SESIONES } from '../../data/fotos.js';
  import PropuestaSemana from '../../components/PropuestaSemana.svelte';

  const hoy = hoyISO();
  const plan = $derived(planDe($estado));
  const actual = $derived(plan ? (semanaDe(plan, hoy)?.w ?? (hoy < plan.inicio ? 0 : plan.N - 1)) : 0);
  let sel = $state(null);
  const w = $derived(sel ?? actual);
  const semana = $derived(plan?.semanas[w]);
  const registros = $derived($estado.hyrox?.registros || {});
  const diasSemana = $derived(semana ? Array.from({ length: 7 }, (_, i) => sumarDias(semana.lunes, i)) : []);
  const enCurso = $derived(w === actual);
  const previstas = $derived(semana ? semana.sesiones.filter((s) => s.tipo !== 'carrera') : []);
  const hechas = $derived(previstas.filter((s) => ['completa', 'parcial'].includes(registros[s.id]?.estado)).length);
  const diasCarrera = $derived(plan?.carrera ? Math.round((new Date(`${plan.carrera}T12:00`) - new Date(`${hoy}T12:00`)) / 86400000) : null);

  // Hoy: la primera sesión del día; si no hay, descanso con lo siguiente que toca
  const deHoy = $derived(plan ? (plan.porFecha[hoy] || []) : []);
  const principal = $derived(deHoy.find((s) => !registros[s.id]) || deHoy[0] || null);
  const siguiente = $derived(plan ? plan.sesiones.find((s) => s.fecha > hoy) : null);
  const proximas = $derived(enCurso && semana ? semana.sesiones.filter((s) => s.fecha > hoy).slice(0, 6) : []);

  const COLOR = { azul: 'var(--azul)', coral: 'var(--coral)', lila: 'var(--lila)', amarillo: 'var(--amarillo)', primario: 'var(--primario)', gris: 'var(--texto-3)' };
  const color = (s) => COLOR[s?.color] || 'var(--lila)';
  const tipoNombre = (s) => TIPOS[s?.tipo]?.nombre || 'Sesión';
  const esFuerza = (s) => (s?.ejercicios?.length || 0) > 0;
  const corto = (f) => diaSemana(f).slice(0, 3);
  const ESTADO = { completa: 'Hecha', parcial: 'A medias', no: 'No la hice' };
  // Foto del tipo de sesión (en duotono con su color); si no hay, una genérica de gimnasio
  const foto = (s) => `img/sesiones/${FOTOS_SESIONES[s?.tipo] ? s.tipo : 'registrada'}.webp`;

  function empezar(s) {
    if (esFuerza(s)) abrirHoja('registrarSesion', { id: s.id, entreno: true });
    else abrirHoja('sesion', { id: s.id });
  }
</script>

{#if plan && semana}
  <PropuestaSemana />
  <!-- Dónde estás en el plan -->
  <div class="plan-cab">
    <span><b>Semana {actual + 1}</b> de {plan.N} · {FASES[plan.semanas[actual].fase].nombre}{plan.semanas[actual].deload ? ' · descarga' : ''}</span>
    {#if diasCarrera !== null && diasCarrera >= 0}<span class="faltan cifra">{diasCarrera === 0 ? '¡Hoy es tu HYROX!' : `${diasCarrera} días`}</span>{/if}
  </div>
  <div class="plan-barra" aria-hidden="true"><i style="--p:{((actual + 1) / plan.N) * 100}%"></i></div>

  {#if enCurso}
    <!-- Hoy: la sesión protagonista -->
    {#if principal}
      {@const reg = registros[principal.id]}
      <section class="portada" style="--c:{color(principal)}" aria-label="Sesión de hoy">
        <img class="foto-fondo" src={foto(principal)} alt="" />
        <span class="tinte" aria-hidden="true"></span><span class="velo" aria-hidden="true"></span>
        <div class="portada-sup">
          <span class="tipo"><Icono e={principal.emoji} tam={15} /> {tipoNombre(principal)} · hoy {principal.hora}</span>
          {#if reg}<span class="hecha"><Icono n="check" tam={14} grosor={2.8} /> {ESTADO[reg.estado] || 'Registrada'}</span>{/if}
        </div>
        <h2>{principal.titulo}</h2>
        <div class="cifras-hoy">
          <div><b class="cifra">{principal.duracion}</b><small>min</small></div>
          {#if principal.distancia}<div><b class="cifra">{String(principal.distancia).replace('.', ',')}</b><small>km</small></div>{/if}
          <div><b class="cifra">{principal.rpe}<span>/10</span></b><small>esfuerzo</small></div>
          {#if esFuerza(principal)}<div><b class="cifra">{principal.ejercicios.length}</b><small>ejercicios</small></div>{/if}
        </div>
        <div class="portada-acciones">
          {#if reg}
            <button class="b-claro" onclick={() => abrirHoja('sesion', { id: principal.id })}>Ver la sesión</button>
            <button class="b-ghost" onclick={() => abrirHoja('registrarSesion', { id: principal.id, entreno: esFuerza(principal) })}>Editar registro</button>
          {:else if principal.tipo === 'carrera'}
            <button class="b-claro" onclick={() => abrirHoja('sesion', { id: principal.id })}>Ver el plan de carrera</button>
          {:else}
            <button class="b-claro" onclick={() => empezar(principal)}>{#if esFuerza(principal)}<Icono n="dumbbell" tam={18} grosor={2.4} />{:else}<Icono n="play" tam={18} grosor={2.4} />{/if} {esFuerza(principal) ? 'Empezar entreno' : 'Ver la sesión'}</button>
            <button class="b-ghost" onclick={() => abrirHoja(esFuerza(principal) ? 'sesion' : 'registrarSesion', { id: principal.id })}>{esFuerza(principal) ? 'Ver detalle' : 'Registrar'}</button>
          {/if}
        </div>
      </section>
      {#if deHoy.length > 1}<p class="nota">Hoy tienes {deHoy.length} sesiones: la otra está en la semana, abajo.</p>{/if}
    {:else}
      <section class="portada descanso" aria-label="Hoy descansas">
        <img class="foto-fondo" src="img/sesiones/recuperacion.webp" alt="" />
        <span class="tinte" aria-hidden="true"></span><span class="velo" aria-hidden="true"></span>
        <div class="portada-sup"><span class="tipo"><Icono n="moon" tam={15} /> Descanso</span></div>
        <h2>Hoy toca recuperar</h2>
        <p class="portada-txt">Camina, estira y duerme bien: el músculo se construye hoy.</p>
        {#if siguiente}
          <button class="sig" style="--c:{color(siguiente)}" onclick={() => abrirHoja('sesion', { id: siguiente.id })}>
            <span class="sig-ic"><Icono e={siguiente.emoji} tam={20} /></span>
            <span class="sig-txt"><small>{siguiente.fecha === sumarDias(hoy, 1) ? 'Mañana' : `El ${diaSemana(siguiente.fecha)}`} · {siguiente.hora}</small><b>{siguiente.titulo}</b></span>
            <Icono n="chevron-right" tam={18} />
          </button>
        {/if}
      </section>
    {/if}

    {#if semana.ajuste?.motivo}
      <p class="ajuste"><Icono n="sparkles" tam={16} /> <span><b>Tu entrenador ha ajustado esta semana.</b> {semana.ajuste.motivo}</span></p>
    {/if}

    <!-- Lo próximo: bloques de color por tipo -->
    {#if proximas.length}
      <h3 class="cab">Lo próximo</h3>
      <div class="proximas">
        {#each proximas as s (s.id)}
          <button class="prox" style="--c:{color(s)}" onclick={() => abrirHoja('sesion', { id: s.id })}>
            <img class="foto-fondo" src={foto(s)} alt="" loading="lazy" />
            <span class="tinte" aria-hidden="true"></span><span class="velo" aria-hidden="true"></span>
            <span class="prox-dia">{corto(s.fecha)} {Number(s.fecha.slice(8))}</span>
            <span class="prox-ic"><Icono e={s.emoji} tam={22} /></span>
            <b>{s.titulo}</b>
            <small class="cifra">{s.duracion} min{s.distancia ? ` · ${String(s.distancia).replace('.', ',')} km` : ''}</small>
          </button>
        {/each}
      </div>
    {/if}
  {/if}

  <!-- La semana en filas: fecha a la izquierda, sesión a la derecha -->
  <div class="semana-cab">
    <h3 class="cab">{enCurso ? 'Esta semana' : `Semana ${w + 1}`}<small class="cifra">{hechas} de {previstas.length} hechas · {fechaCorta(semana.lunes)} – {fechaCorta(sumarDias(semana.lunes, 6))}</small></h3>
    <div class="flechas">
      <button aria-label="Semana anterior" disabled={w === 0} onclick={() => (sel = w - 1)}><Icono n="chevron-left" tam={18} /></button>
      <button aria-label="Semana siguiente" disabled={w === plan.N - 1} onclick={() => (sel = w + 1)}><Icono n="chevron-right" tam={18} /></button>
    </div>
  </div>
  <ol class="lista-semana">
    {#each diasSemana as f (f)}
      {@const ses = semana.sesiones.filter((s) => s.fecha === f)}
      <li class:hoy={f === hoy} class:pasado={f < hoy}>
        <span class="fecha"><small>{corto(f)}</small><b class="cifra">{Number(f.slice(8))}</b></span>
        <div class="dia-ses">
          {#each ses as s (s.id)}
            {@const reg = registros[s.id]}
            <button class="fila-ses" style="--c:{color(s)}" onclick={() => abrirHoja('sesion', { id: s.id })}>
              <i class="punto" aria-hidden="true"></i>
              <span class="fs-txt"><b>{s.titulo}</b><small class="cifra">{s.hora} · {s.duracion} min{s.distancia ? ` · ${String(s.distancia).replace('.', ',')} km` : ''}</small></span>
              {#if reg}
                <span class="marca ok" title={ESTADO[reg.estado]}><Icono n={reg.estado === 'no' ? 'x' : 'check'} tam={14} grosor={2.8} /></span>
              {:else if f < hoy && s.tipo !== 'carrera'}
                <span class="marca falta">¿Qué tal?</span>
              {:else}
                <Icono n="chevron-right" tam={16} />
              {/if}
            </button>
          {:else}
            <span class="libre">Descanso{plan.diasCarga.includes(f) ? ' · carga de hidratos' : ''}</span>
          {/each}
        </div>
      </li>
    {/each}
  </ol>
  <a class="agenda-link" href="#entreno/plan"><Icono n="flag" tam={16} /> ¿Una carrera o un viaje? Añádelo y lo ajusto todo</a>
{/if}

<style>
  /* Cabecera del plan: una línea y una barra fina */
  .plan-cab { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; margin: 4px 2px 8px; font-size: 0.86rem; color: var(--texto-2); }
  .plan-cab b { color: var(--texto); }
  .faltan { font-weight: 700; color: var(--primario-fuerte); }
  .plan-barra { height: 4px; border-radius: 999px; background: var(--superficie-3); overflow: hidden; margin-bottom: 16px; }
  .plan-barra i { display: block; width: 100%; height: 100%; border-radius: 999px; background: var(--lila); transform: translateX(calc(var(--p) - 100%)); }

  /* Hoy: bloque grande en el color del tipo de sesión */
  .portada {
    position: relative; overflow: hidden; padding: 18px 18px 16px; border-radius: var(--r-xl); color: #fff;
    background:
      radial-gradient(140% 100% at 100% 0%, color-mix(in srgb, var(--c) 38%, transparent), transparent 72%),
      linear-gradient(160deg, color-mix(in srgb, var(--c) 42%, #121218) 0%, color-mix(in srgb, var(--c) 14%, #0b0b0e) 100%);
    box-shadow: 0 18px 40px color-mix(in srgb, var(--c) 22%, transparent), 0 0 0 1px color-mix(in srgb, var(--c) 30%, transparent);
  }
  .portada.descanso { --c: var(--azul); }
  .portada { display: flex; flex-direction: column; min-height: 360px; isolation: isolate; }
  .portada > :not(.foto-fondo, .tinte, .velo) { position: relative; z-index: 2; }
  .portada .portada-sup { margin-bottom: auto; }
  .foto-fondo { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; z-index: 0; filter: grayscale(1) contrast(1.2) brightness(0.85); }
  .tinte { position: absolute; inset: 0; z-index: 1; background: var(--c); mix-blend-mode: color; opacity: 0.85; }
  .velo { position: absolute; inset: 0; z-index: 1; background: linear-gradient(180deg, rgb(8 8 12 / 0.25) 0%, rgb(8 8 12 / 0.15) 30%, rgb(8 8 12 / 0.78) 68%, rgb(8 8 12 / 0.92) 100%); }
  .portada-sup { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
  .tipo { display: inline-flex; align-items: center; gap: 6px; padding: 5px 10px; border-radius: 999px; background: rgb(255 255 255 / 0.14); font-size: 0.78rem; font-weight: 700; }
  .hecha { display: inline-flex; align-items: center; gap: 4px; padding: 5px 10px; border-radius: 999px; background: var(--exito); color: #062014; font-size: 0.76rem; font-weight: 700; }
  .portada h2 { margin: 120px 0 14px; text-shadow: 0 2px 18px rgb(0 0 0 / 0.35); font-size: 1.85rem; line-height: 1.08; letter-spacing: -0.03em; font-weight: 700; text-wrap: balance; }
  .cifras-hoy { display: flex; gap: 22px; margin-bottom: 18px; }
  .cifras-hoy div { display: grid; }
  .cifras-hoy b { font-size: 1.6rem; line-height: 1; font-weight: 700; letter-spacing: -0.03em; }
  .cifras-hoy b span { font-size: 0.95rem; color: rgb(255 255 255 / 0.7); }
  .cifras-hoy small { margin-top: 4px; font-size: 0.74rem; font-weight: 600; color: rgb(255 255 255 / 0.7); }
  .portada-acciones { display: flex; gap: 8px; }
  .portada-acciones button { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 50px; padding: 0 18px; border: 0; border-radius: var(--r-m); font: inherit; font-weight: 700; font-size: 0.95rem; cursor: pointer; }
  .b-claro { flex: 1; background: #fff; color: #0b0b0e; }
  .b-ghost { background: rgb(255 255 255 / 0.14); color: #fff; }
  .portada-txt { margin: -6px 0 14px; color: rgb(255 255 255 / 0.75); font-size: 0.92rem; }
  .sig { width: 100%; display: flex; align-items: center; gap: 12px; padding: 10px 12px; border: 0; border-radius: var(--r-m); background: rgb(255 255 255 / 0.08); color: #fff; font: inherit; text-align: left; cursor: pointer; }
  .sig-ic { width: 40px; height: 40px; border-radius: var(--r-s); display: grid; place-items: center; background: color-mix(in srgb, var(--c) 30%, transparent); color: #fff; flex-shrink: 0; }
  .sig-txt { flex: 1; display: grid; min-width: 0; }
  .sig-txt small { color: rgb(255 255 255 / 0.65); font-weight: 600; font-size: 0.76rem; }
  .nota { margin: 8px 4px 0; font-size: 0.8rem; color: var(--texto-3); }
  .ajuste { display: flex; gap: 8px; align-items: flex-start; margin: 14px 0 0; padding: 12px 14px; border-radius: var(--r-m); background: var(--lila-claro); font-size: 0.86rem; }

  .cab { margin: 26px 2px 10px; font-size: 1.05rem; font-weight: 700; }
  .cab small { display: block; margin-top: 2px; font-size: 0.78rem; font-weight: 600; color: var(--texto-2); }

  /* Lo próximo: bloques de color en fila deslizable */
  .proximas { display: grid; grid-auto-flow: column; grid-auto-columns: 46%; gap: 10px; overflow-x: auto; scroll-snap-type: x mandatory; scrollbar-width: none; margin: 0 -16px; padding: 0 16px 4px; scroll-padding: 0 16px; }
  .proximas::-webkit-scrollbar { display: none; }
  .prox {
    scroll-snap-align: start; display: grid; align-content: start; gap: 2px; min-height: 132px; padding: 12px; border: 0; border-radius: var(--r-l); text-align: left; cursor: pointer; color: var(--texto); font: inherit;
    background: linear-gradient(165deg, color-mix(in srgb, var(--c) 26%, var(--superficie)) 0%, color-mix(in srgb, var(--c) 8%, var(--superficie)) 100%);
    box-shadow: 0 0 0 1px color-mix(in srgb, var(--c) 22%, transparent);
  }
  .prox { position: relative; overflow: hidden; isolation: isolate; min-height: 168px; align-content: end; color: #fff; }
  .prox > :not(.foto-fondo, .tinte, .velo) { position: relative; z-index: 2; }
  .prox .velo { background: linear-gradient(180deg, rgb(8 8 12 / 0.1) 0%, rgb(8 8 12 / 0.85) 100%); }
  .prox small { color: rgb(255 255 255 / 0.75) !important; }
  .prox-dia { position: absolute !important; top: 12px; left: 12px; padding: 3px 9px; border-radius: 999px; background: rgb(0 0 0 / 0.35); color: #fff !important;
  font-size: 0.76rem; font-weight: 700; color: color-mix(in srgb, var(--c) 70%, #fff); text-transform: capitalize; }
  .prox-ic { margin: 10px 0 8px; color: var(--c); }
  .prox b { font-size: 0.95rem; line-height: 1.2; }
  .prox small { color: var(--texto-2); font-weight: 600; font-size: 0.76rem; }

  /* La semana: filas con la fecha en columna */
  .semana-cab { display: flex; align-items: flex-end; justify-content: space-between; gap: 10px; }
  .flechas { display: flex; gap: 6px; margin-bottom: 10px; }
  .flechas button { width: 38px; height: 38px; border-radius: var(--r-s); border: 0; background: var(--superficie); box-shadow: var(--sombra); display: grid; place-items: center; color: var(--texto); cursor: pointer; }
  .flechas button:disabled { opacity: 0.3; cursor: default; }
  .lista-semana { list-style: none; margin: 0; padding: 0; }
  .lista-semana li { display: grid; grid-template-columns: 46px minmax(0, 1fr); gap: 10px; align-items: center; min-height: 56px; padding: 6px 0; border-top: 1px solid var(--linea); }
  .lista-semana li:first-child { border-top: 0; }
  .fecha { display: grid; justify-items: center; line-height: 1.05; }
  .fecha small { font-size: 0.68rem; font-weight: 700; color: var(--texto-3); text-transform: capitalize; }
  .fecha b { font-size: 1.25rem; font-weight: 700; letter-spacing: -0.02em; }
  li.hoy .fecha { color: var(--lila); }
  li.hoy .fecha small { color: var(--lila); }
  li.pasado .fecha b { color: var(--texto-3); }
  .dia-ses { display: grid; gap: 4px; }
  .fila-ses { display: flex; align-items: center; gap: 10px; width: 100%; padding: 8px 4px 8px 0; border: 0; background: none; color: var(--texto); font: inherit; text-align: left; cursor: pointer; }
  .fila-ses > :global(svg) { color: var(--texto-3); flex-shrink: 0; }
  .punto { width: 10px; height: 10px; border-radius: 50%; background: var(--c); flex-shrink: 0; box-shadow: 0 0 0 4px color-mix(in srgb, var(--c) 18%, transparent); }
  .fs-txt { flex: 1; min-width: 0; display: grid; }
  .fs-txt b { font-size: 0.94rem; font-weight: 700; line-height: 1.25; }
  .fs-txt small { color: var(--texto-2); font-size: 0.76rem; font-weight: 600; }
  li.pasado .fs-txt b { color: var(--texto-2); }
  .marca { flex-shrink: 0; display: inline-grid; place-items: center; }
  .marca.ok { width: 26px; height: 26px; border-radius: 50%; background: var(--exito-claro); color: var(--exito); }
  .marca.falta { padding: 4px 10px; border-radius: 999px; background: var(--primario-claro); color: var(--primario-fuerte); font-size: 0.74rem; font-weight: 700; }
  .libre { color: var(--texto-3); font-size: 0.86rem; font-weight: 600; }
  .agenda-link { display: flex; align-items: center; justify-content: center; gap: 8px; min-height: 48px; margin-top: 14px; border-radius: var(--r-m); border: 1px dashed var(--borde); color: var(--primario); font-weight: 700; font-size: 0.86rem; text-decoration: none; }
</style>
