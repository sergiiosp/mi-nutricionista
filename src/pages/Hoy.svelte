<script>
  import { fly } from 'svelte/transition';
  import Anillo from '../components/Anillo.svelte';
  import Icono from '../components/Icono.svelte';
  import Cifra from '../components/Cifra.svelte';
  import TarjetaComida from '../components/TarjetaComida.svelte';
  import TarjetaSesion from '../components/TarjetaSesion.svelte';
  import { planDe, sesionesDia } from '../lib/hyrox/index.js';
  import { estado, añadirRegistro, borrarRegistro, horaActual } from '../stores/estado.js';
  import { avisar } from '../stores/ui.js';
  import { calcularObjetivos, DEPORTES, cantidadTexto } from '../lib/nutricion.js';
  import { hoyISO } from '../lib/planificador.js';
  import { estadoDia, sugerencias } from '../lib/dia.js';
  import { recomendaciones, recordatoriosDia } from '../lib/salud.js';
  import { esDiaEntreno, horarioDia } from '../lib/horario.js';
  import { crearRegistro } from '../lib/registro.js';
  import { crearPlan } from '../lib/acciones.js';
  import { fechaLarga, saludo, entero } from '../lib/formato.js';
  import { rachas } from '../lib/logros.js';

  const hoy = hoyISO();
  const objetivos = $derived(calcularObjetivos($estado.perfil));
  let ahora = $state(horaActual());
  $effect(() => { const t = setInterval(() => (ahora = horaActual()), 60000); return () => clearInterval(t); });
  const d = $derived(estadoDia($estado, objetivos, hoy, ahora));
  const diaIdx = $derived($estado.plan?.dias.findIndex((x) => x.fecha === hoy) ?? -1);
  const entreno = $derived(d.dia ? d.entreno : esDiaEntreno($estado.perfil, hoy));
  const sesion = $derived(d.dia?.sesion || (entreno ? horarioDia($estado.perfil, true).entreno : null));
  const deportes = $derived(($estado.perfil.deportes || []).map((x) => DEPORTES[x]).filter(Boolean));
  const hyroxActivo = $derived(!!planDe($estado));
  const sesionesHoy = $derived(sesionesDia($estado, hoy));
  const recs = $derived(recomendaciones($estado.perfil, objetivos));
  const opciones = $derived(sugerencias(d.huecoFinal, $estado.perfil));
  const r = $derived(rachas($estado, objetivos, hoy));
  const NOMBRES = { desayuno: 'Desayuno', media: 'Media mañana', comida: 'Comida', merienda: 'Merienda', cena: 'Cena' };
  const nombreFranja = (c) => (['media', 'merienda'].includes(c.franja) && c.hora ? (c.hora < '14:00' ? 'Media mañana' : 'Merienda') : NOMBRES[c.franja]);

  const linea = $derived.by(() => {
    const items = d.comidas.map((c) => ({ tipo: 'comida', hora: c.hora || '', c }));
    if (hyroxActivo) for (const s of sesionesHoy) items.push({ tipo: 'hyrox', hora: s.hora, s });
    else if (entreno && sesion) items.push({ tipo: 'entreno', hora: sesion.inicio });
    const franjas = d.comidas.map((c) => ({ id: c.franja, horaTexto: c.hora || '' }));
    for (const x of recordatoriosDia(recs, franjas, sesion)) items.push({ tipo: 'sup', hora: x.hora, x });
    for (const x of d.extras) items.push({ tipo: 'extra', hora: x.hora || '', x });
    const orden = { sup: 0, entreno: 1, hyrox: 1, extra: 2, comida: 3 };
    return items.sort((a, b) => a.hora.localeCompare(b.hora) || orden[a.tipo] - orden[b.tipo]);
  });

  const CONSEJOS = [
    'Llena medio plato de verdura: aporta volumen, fibra y casi nada de calorías.',
    'Si un día te sales del plan, no compenses al siguiente: vuelve al menú y listo.',
    'Reparte la proteína entre todas las comidas: tu músculo la aprovecha mejor.',
    'Mide el aceite con cuchara: es sano, pero muy calórico.',
    'Duerme 7-8 horas: dormir poco dispara el hambre y empeora la recuperación.',
    'Las verduras congeladas son tan nutritivas como las frescas y te ahorran tiempo.',
    'Camina: 8.000-10.000 pasos al día suman mucho gasto sin darte más hambre.',
  ];
  const consejo = CONSEJOS[new Date().getDate() % CONSEJOS.length];

  function añadirSugerencia(op) {
    for (const it of op.items) {
      añadirRegistro(hoy, crearRegistro({ item: { tipo: 'alimento', id: it.a }, cantidad: it.g, fecha: hoy, franja: null }));
    }
    avisar(`Añadido: ${op.nombre}`, '✅');
  }
</script>

<section class="hoy">
  <header class="saludo">
    <p>{fechaLarga(hoy)}</p>
    <h1>{saludo()}{$estado.perfil.nombre ? `, ${$estado.perfil.nombre}` : ''}</h1>
  </header>

  <div class="resumen" in:fly={{ y: 16, duration: 350 }}>
    <div class="chips">
      {#if hyroxActivo && sesionesHoy.length}
        <span class="chip-hoy naranja"><Icono e={sesionesHoy[0].emoji} tam={15} grosor={2.2} /> {sesionesHoy[0].titulo.split(':')[0]}</span>
      {:else if entreno}
        <span class="chip-hoy naranja"><Icono n="dumbbell" tam={15} grosor={2.2} /> Entreno{#if sesion}{' · '}{sesion.inicio}{/if}</span>
      {:else}
        <span class="chip-hoy"><Icono n="moon" tam={15} grosor={2.2} /> Descanso</span>
      {/if}
      {#if r.registro > 1}<span class="chip-hoy"><Icono n="flame" tam={15} grosor={2.2} /> {r.registro} días</span>{/if}
    </div>

    <div class="cuerpo">
      <Anillo valor={d.consumido.kcal} max={d.objetivo.kcal} tam={148} grosor={13} degradado={d.pasado ? ['#ff4d6a', '#ff2d55'] : ['#ffa21f', '#ff3d2e']} brillo>
        {#if d.pasado}
          <span class="num cifra">+<Cifra valor={d.consumido.kcal - d.objetivo.kcal} /></span><span class="lbl">kcal de más</span>
        {:else}
          <span class="num cifra"><Cifra valor={Math.max(0, d.faltan.kcal)} /></span><span class="lbl">kcal restantes</span>
        {/if}
      </Anillo>
      <div class="barras">
        {#each [['Proteína', 'p', 'b-p'], ['Hidratos', 'c', 'b-c'], ['Grasa', 'g', 'b-g']] as [n, k, cl] (k)}
          <div class="barra {cl}">
            <div class="barra-cab"><span>{n}</span><b class="cifra"><Cifra valor={d.consumido[k]} /><small>/{Math.round(d.objetivo[k])} g</small></b></div>
            <div class="pista"><div class="relleno" style="width:{Math.min(100, (d.consumido[k] / d.objetivo[k]) * 100)}%"></div></div>
          </div>
        {/each}
      </div>
    </div>

    <div class="resumen-stats">
      <div><b class="cifra"><Cifra valor={d.consumido.kcal} /></b><span>Comido</span></div>
      <div><b class="cifra"><Cifra valor={d.objetivo.kcal} /></b><span>Objetivo</span></div>
      <div><b class="cifra">{d.comidas.filter((c) => c.situacion === 'hecha').length}<small>/{d.comidas.length}</small></b><span>Comidas</span></div>
    </div>
  </div>

  {#if !$estado.plan || diaIdx === -1}
    <div class="tarjeta vacia">
      <span class="vacia-ic"><Icono n="utensils" tam={30} /></span>
      <p>{$estado.plan ? 'Tu menú semanal ha terminado.' : 'Todavía no tienes menú.'}</p>
      <button class="boton" onclick={() => { crearPlan(); avisar('Menú de 7 días listo', '🥗'); }}><Icono n="sparkles" tam={18} grosor={2.2} /> Crear menú de 7 días</button>
    </div>
  {/if}

  {#if d.desviado && d.comidas.some((c) => c.ajustada && c.situacion === 'pendiente')}
    <div class="aviso"><Icono n="refresh-cw" tam={18} /> <span><b>Próximas comidas reajustadas</b> para cuadrar el día con lo que ya has comido.</span></div>
  {/if}
  {#if d.pasado}
    <div class="aviso amarillo"><Icono n="thumbs-up" tam={18} /> <span><b>Te has pasado un poco.</b> No compenses mañana: sigue el menú normal.</span></div>
  {/if}

  {#if opciones.length && d.huecoFinal.kcal > 120}
    <div class="tarjeta sugerencias">
      <div class="sug-cab">
        <Icono n="lightbulb" tam={20} />
        <div><b>Te faltan ~{entero(d.huecoFinal.kcal)} kcal{#if d.huecoFinal.p > 8}{' · '}{Math.round(d.huecoFinal.p)} g proteína{/if}</b><small>{d.pendientes.length ? 'Aunque hagas las comidas que quedan' : 'Para cerrar el día'}</small></div>
      </div>
      {#each opciones as op (op.nombre)}
        <div class="sug">
          <span class="sug-txt"><b>{op.items.map((it) => `${cantidadTexto(it.a, it.g)}`).join(' + ')}</b><small>{op.nombre} · {entero(op.m.kcal)} kcal · P {Math.round(op.m.p)} g</small></span>
          <button class="sug-mas" aria-label="Añadir {op.nombre}" onclick={() => añadirSugerencia(op)}><Icono n="plus" tam={18} grosor={2.4} /></button>
        </div>
      {/each}
    </div>
  {/if}

  {#if linea.length}
    <h2 class="seccion">Tu día</h2>
    <ol class="timeline">
      {#each linea as it, i (it.tipo + (it.c?.franja || it.s?.id || it.x?.id || it.x?.texto || i))}
        <li class="tl tl-{it.tipo}" class:hecho={it.c?.situacion === 'hecha'}>
          <div class="tl-hora cifra">{it.tipo === 'sup' ? '' : it.hora}</div>
          <div class="tl-linea"><span></span></div>
          <div class="tl-contenido">
            {#if it.tipo === 'comida'}
              <TarjetaComida comida={it.c} fecha={hoy} {diaIdx} franjaNombre={nombreFranja(it.c)} />
            {:else if it.tipo === 'hyrox'}
              <TarjetaSesion sesion={it.s} registro={$estado.hyrox?.registros?.[it.s.id]} />
            {:else if it.tipo === 'entreno'}
              <div class="bloque-entreno">
                <span class="be-ic"><Icono e={deportes[0]?.emoji || '🏋️'} tam={24} /></span>
                <div><b>Entreno</b><small>{sesion.inicio} – {sesion.fin} · {deportes.map((x) => x.nombre).join(', ') || 'tu sesión'}</small></div>
              </div>
            {:else if it.tipo === 'sup'}
              <div class="recordatorio"><Icono e={it.x.emoji} tam={15} grosor={2.2} /> {it.x.texto}</div>
            {:else if it.tipo === 'extra'}
              <div class="extra">
                {#if it.x.imagen && it.x.tipo === 'producto'}<img src={it.x.imagen} alt="" />{:else}<span class="ic"><Icono n="utensils" tam={20} /></span>{/if}
                <span class="txt"><small>{it.x.franja ? NOMBRES[it.x.franja] : 'Picoteo'}</small><b>{it.x.nombre}</b><small>{it.x.cantidad?.texto} · {entero(it.x.macros.kcal)} kcal · P {Math.round(it.x.macros.p)} g</small></span>
                <button class="borrar" aria-label="Borrar {it.x.nombre}" onclick={() => borrarRegistro(hoy, it.x.id)}><Icono n="x" tam={16} /></button>
              </div>
            {/if}
          </div>
        </li>
      {/each}
    </ol>
    {#each d.dia?.consejos || [] as c (c)}<p class="nota-dia"><Icono n="info" tam={16} /> {c}</p>{/each}
  {/if}

  <div class="consejo"><Icono n="lightbulb" tam={18} /><p>{consejo}</p></div>
</section>

<style>
  .saludo p { margin: 8px 0 0; color: var(--texto-2); font-weight: 600; font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.08em; }
  .saludo h1 { margin: 2px 0 16px; }

  .resumen {
    position: relative; overflow: hidden; padding: 16px; border-radius: 26px;
    background: radial-gradient(120% 80% at 0% 0%, rgb(255 91 31 / 0.16), transparent 60%), var(--superficie);
    box-shadow: var(--sombra);
  }
  .chips { display: flex; gap: 6px; flex-wrap: wrap; }
  .chip-hoy { display: inline-flex; align-items: center; gap: 6px; padding: 6px 11px; border-radius: 999px; background: var(--superficie-2); font-size: 0.76rem; font-weight: 600; color: var(--texto-2); max-width: 100%; }
  .chip-hoy.naranja { background: var(--primario-claro); color: var(--primario-fuerte); }
  .cuerpo { display: flex; align-items: center; gap: 18px; margin-top: 14px; }
  .num { display: block; font-size: 2.3rem; line-height: 1; }
  .lbl { display: block; margin-top: 4px; font-size: 0.62rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--texto-2); }
  .barras { flex: 1; min-width: 0; display: grid; gap: 12px; }
  .barra-cab { display: flex; justify-content: space-between; align-items: baseline; font-size: 0.74rem; font-weight: 600; color: var(--texto-2); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 5px; }
  .barra-cab b { font-size: 0.95rem; color: var(--texto); }
  .barra-cab small { font-size: 0.72rem; font-weight: 600; color: var(--texto-3); letter-spacing: 0; }
  .pista { height: 6px; border-radius: 999px; background: var(--superficie-3); overflow: hidden; }
  .relleno { height: 100%; border-radius: 999px; transition: width 1s cubic-bezier(0.25, 0.9, 0.3, 1); }
  .b-p .relleno { background: var(--coral); box-shadow: 0 0 10px var(--coral); }
  .b-c .relleno { background: var(--amarillo); box-shadow: 0 0 10px var(--amarillo); }
  .b-g .relleno { background: var(--azul); box-shadow: 0 0 10px var(--azul); }
  .resumen-stats { display: grid; grid-template-columns: repeat(3, 1fr); margin-top: 16px; padding-top: 14px; border-top: 1px solid var(--linea); text-align: center; }
  .resumen-stats div { display: grid; }
  .resumen-stats div + div { border-left: 1px solid var(--linea); }
  .resumen-stats b { font-size: 1.2rem; line-height: 1.2; }
  .resumen-stats small { font-size: 0.8rem; color: var(--texto-3); }
  .resumen-stats span { font-size: 0.62rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--texto-3); }

  .aviso { display: flex; gap: 10px; align-items: flex-start; padding: 12px 14px; border-radius: 16px; margin: 12px 0; font-size: 0.85rem; color: var(--texto-2); background: var(--lila-claro); }
  .aviso :global(.icono) { color: var(--lila); margin-top: 1px; }
  .aviso b { color: var(--texto); font-weight: 600; }
  .aviso.amarillo { background: var(--amarillo-claro); }
  .aviso.amarillo :global(.icono) { color: var(--amarillo); }

  .sugerencias { padding: 14px; }
  .sug-cab { display: flex; gap: 10px; align-items: flex-start; margin-bottom: 6px; color: var(--amarillo); }
  .sug-cab b { color: var(--texto); font-weight: 600; font-size: 0.92rem; }
  .sug-cab small { display: block; color: var(--texto-2); font-size: 0.78rem; }
  .sug { display: flex; align-items: center; gap: 10px; padding: 10px 0; border-top: 1px solid var(--linea); }
  .sug-txt { flex: 1; min-width: 0; display: grid; font-size: 0.86rem; }
  .sug-txt b { font-weight: 600; }
  .sug-txt small { color: var(--texto-2); font-size: 0.74rem; }
  .sug-mas, .borrar { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 50%; border: 0; background: var(--primario); color: var(--sobre-primario); cursor: pointer; flex-shrink: 0; transition: transform 0.15s; }
  .sug-mas:active { transform: scale(0.9); }
  .borrar { background: var(--superficie-2); color: var(--texto-2); }

  .bloque-entreno { display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-radius: 18px; background: var(--superficie); box-shadow: var(--sombra); }
  .be-ic { display: grid; place-items: center; width: 44px; height: 44px; border-radius: 14px; background: var(--primario-claro); color: var(--primario); }
  .bloque-entreno b { font-weight: 600; }
  .bloque-entreno small { display: block; color: var(--texto-2); font-size: 0.78rem; }
  .recordatorio { display: inline-flex; align-items: center; gap: 7px; padding: 6px 12px; border-radius: 999px; background: var(--superficie); box-shadow: var(--sombra); font-size: 0.8rem; font-weight: 600; color: var(--texto-2); }
  .recordatorio :global(.icono) { color: var(--lila); }
  .extra { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 18px; background: var(--superficie); box-shadow: var(--sombra); }
  .extra img, .ic { width: 44px; height: 44px; border-radius: 12px; object-fit: contain; background: var(--superficie-2); display: grid; place-items: center; flex-shrink: 0; color: var(--texto-2); }
  .txt { flex: 1; min-width: 0; display: grid; }
  .txt b { font-weight: 600; font-size: 0.92rem; }
  .txt small { color: var(--texto-2); font-size: 0.74rem; }
  .txt small:first-child { text-transform: uppercase; letter-spacing: 0.08em; font-weight: 700; font-size: 0.64rem; color: var(--texto-3); }
  .nota-dia { display: flex; gap: 8px; align-items: flex-start; }
  .nota-dia :global(.icono) { color: var(--primario); margin-top: 2px; }
  .consejo { display: flex; gap: 10px; align-items: flex-start; margin: 18px 0 0; padding: 14px; border-radius: 18px; border: 1px dashed var(--borde); color: var(--texto-2); font-size: 0.84rem; }
  .consejo :global(.icono) { color: var(--amarillo); margin-top: 1px; }
  .consejo p { margin: 0; }
  .vacia { text-align: center; }
  .vacia-ic { display: inline-grid; place-items: center; width: 60px; height: 60px; border-radius: 20px; background: var(--primario-claro); color: var(--primario); }
  @media (max-width: 360px) { .cuerpo { flex-direction: column; align-items: stretch; } .cuerpo :global(.anillo) { align-self: center; } }
</style>
