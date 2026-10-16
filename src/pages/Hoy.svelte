<script>
  import { onMount } from 'svelte';
  import Icono from '../components/Icono.svelte';
  import Cifra from '../components/Cifra.svelte';
  import TarjetaComida from '../components/TarjetaComida.svelte';
  import TarjetaSesion from '../components/TarjetaSesion.svelte';
  import { planDe, sesionesDia } from '../lib/hyrox/index.js';
  import { estado, añadirRegistro, horaActual } from '../stores/estado.js';
  import { avisar, abrirHoja } from '../stores/ui.js';
  import { calcularObjetivos, DEPORTES, cantidadTexto, macrosComida } from '../lib/nutricion.js';
  import { hoyISO } from '../lib/planificador.js';
  import { estadoDia, sugerencias, faltas } from '../lib/dia.js';
  import NotaDia from '../components/NotaDia.svelte';
  import { recomendaciones, recordatoriosDia } from '../lib/salud.js';
  import { esDiaEntreno, horarioDia } from '../lib/horario.js';
  import { crearRegistro } from '../lib/registro.js';
  import { crearPlan, marcarEntrenoDia, quitarRegistro } from '../lib/acciones.js';
  import { fechaLarga, saludo, entero, capital, num } from '../lib/formato.js';
  import { slide } from 'svelte/transition';
  import { tendencia } from '../lib/progreso.js';
  import { semanaDe } from '../lib/hyrox/plan.js';
  import { rachas } from '../lib/logros.js';

  const hoy = hoyISO();
  const objetivos = $derived(calcularObjetivos($estado.perfil));
  let ahora = $state(horaActual());
  $effect(() => { const t = setInterval(() => (ahora = horaActual()), 60000); return () => clearInterval(t); });
  const d = $derived(estadoDia($estado, objetivos, hoy, ahora));
  const siguiente = $derived(d.comidas.find((c) => c.situacion === 'pendiente' && !c.pasada)?.franja);
  const diaIdx = $derived($estado.plan?.dias.findIndex((x) => x.fecha === hoy) ?? -1);
  const entreno = $derived(d.dia ? d.entreno : esDiaEntreno($estado.perfil, hoy));
  const sesion = $derived(d.dia?.sesion || (entreno ? horarioDia($estado.perfil, true).entreno : null));
  const deportes = $derived(($estado.perfil.deportes || []).map((x) => DEPORTES[x]).filter(Boolean));
  const hyroxActivo = $derived(!!planDe($estado));
  const sesionesHoy = $derived(sesionesDia($estado, hoy));
  // ¿Hoy entrenas? Lo que diga el plan, salvo que lo cambies tú
  const entrenoPlan = $derived(hyroxActivo ? sesionesHoy.some((s) => s.tipo !== 'recuperacion') : esDiaEntreno($estado.perfil, hoy));
  const cambioHoy = $derived($estado.entrenoDia?.[hoy] || null);
  const entrenoHoy = $derived(cambioHoy ? cambioHoy === 'si' : entrenoPlan);
  function cambiarEntreno(quiero) {
    if (quiero === entrenoHoy) return;
    marcarEntrenoDia(hoy, quiero === entrenoPlan ? null : quiero ? 'si' : 'no');
    avisar(quiero ? 'Hoy cuenta como día de entreno: más hidratos y kcal' : 'Hoy cuenta como descanso: comidas ajustadas', quiero ? '💪' : '😴');
  }
  const recs = $derived(recomendaciones($estado.perfil, objetivos));
  const opciones = $derived(sugerencias(d.huecoFinal, $estado.perfil));
  const cortos = $derived(faltas(d.huecoFinal, entrenoHoy));
  const r = $derived(rachas($estado, objetivos, hoy));
  // Panel: qué bloque está abierto (ninguno al entrar: lo esencial ya se ve)
  let abierto = $state(null);
  const alternar = (k) => (abierto = abierto === k ? null : k);
  const tend = $derived(tendencia($estado.pesos || []));
  const sesionHecha = $derived(sesionesHoy.some((s) => $estado.hyrox?.registros?.[s.id]?.estado === 'completa'));
  const semanaEntreno = $derived.by(() => {
    const plan = planDe($estado);
    const sem = plan ? semanaDe(plan, hoy) : null;
    if (!sem) return null;
    const ses = sem.sesiones.filter((x) => x.tipo !== 'carrera');
    return { total: ses.length, hechas: ses.filter((x) => ['completa', 'parcial'].includes($estado.hyrox?.registros?.[x.id]?.estado)).length };
  });
  const NOMBRES = { desayuno: 'Desayuno', media: 'Media mañana', comida: 'Comida', merienda: 'Merienda', cena: 'Cena' };
  const nombreFranja = (c) => (['media', 'merienda'].includes(c.franja) && c.hora ? (c.hora < '14:00' ? 'Media mañana' : 'Merienda') : NOMBRES[c.franja]);

  // Tramos del día: cada comida del plan es un tramo; lo comido fuera de franja va en un tramo extra
  const tramos = $derived.by(() => {
    const lista = d.comidas.map((c) => {
      const plan = Math.max(1, macrosComida(c.ingredientes || []).kcal);
      const regs = d.registros.filter((x) => x.franja === c.franja);
      const comido = regs.reduce((t, x) => t + (x.macros?.kcal || 0), 0);
      return { id: c.franja, nombre: nombreFranja(c), plan, comido, hecha: c.situacion !== 'pendiente', saltada: c.situacion === 'saltada' };
    });
    const franjas = new Set(d.comidas.map((c) => c.franja));
    const fuera = d.registros.filter((x) => !x.franja || !franjas.has(x.franja)).reduce((t, x) => t + (x.macros?.kcal || 0), 0);
    if (fuera > 0) lista.push({ id: 'extra', nombre: 'Extra', plan: fuera, comido: fuera, hecha: true, extra: true });
    const siguiente = lista.find((t) => !t.hecha);
    if (siguiente) siguiente.siguiente = true;
    return lista;
  });
  // El único momento animado: los tramos se llenan uno tras otro al abrir Hoy
  let listo = $state(false);
  onMount(() => setTimeout(() => (listo = true), 120));

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

  // Lo siguiente que toca (comida pendiente o sesión sin registrar) y el resto del día, en líneas
  const proximo = $derived(linea.find((it) => (it.tipo === 'comida' && it.c.situacion === 'pendiente') || (it.tipo === 'hyrox' && it.s.tipo !== 'carrera' && !$estado.hyrox?.registros?.[it.s.id])) || null);
  const resto = $derived(linea.filter((it) => it !== proximo));

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
    <p>{capital(fechaLarga(hoy))}</p>
    <h1>{saludo()}{$estado.perfil.nombre ? `, ${$estado.perfil.nombre}` : ''}</h1>
  </header>

  <!-- Panel: lo esencial de un vistazo; cada bloque se toca para ver el detalle -->
  <div class="panel">
    <button class="bloque s-comida" class:activo={abierto === 'comida'} aria-expanded={abierto === 'comida'} onclick={() => alternar('comida')}>
      <span class="b-cab"><Icono n="utensils" tam={15} grosor={2.2} /> Comida</span>
      <b class="b-num cifra">{entero(d.consumido.kcal)}</b>
      <span class="b-sub">de {entero(d.objetivo.kcal)} kcal</span>
      <span class="b-pista" aria-hidden="true"><span style="width:{listo ? Math.min(100, (d.consumido.kcal / d.objetivo.kcal) * 100) : 0}%"></span></span>
      <span class="b-sub">P {Math.round(d.consumido.p)}/{Math.round(d.objetivo.p)} g</span>
    </button>
    <button class="bloque s-entreno" class:activo={abierto === 'entreno'} aria-expanded={abierto === 'entreno'} onclick={() => alternar('entreno')}>
      <span class="b-cab"><Icono n="dumbbell" tam={15} grosor={2.2} /> Entreno</span>
      <b class="b-num b-texto">{entrenoHoy ? (sesionesHoy[0]?.titulo.split(':')[0] || 'Entreno') : 'Descanso'}</b>
      <span class="b-sub">{#if !entrenoHoy}recupera y camina{:else if sesionesHoy[0]}{sesionesHoy[0].hora} · {sesionesHoy[0].duracion} min{:else if sesion}a las {sesion.inicio}{/if}</span>
      {#if sesionHecha}<span class="b-ok"><Icono n="check" tam={13} grosor={2.8} /> hecha</span>{/if}
    </button>
    <a class="bloque s-progreso" href="#progreso">
      <span class="b-cab"><Icono n="chart-column" tam={15} grosor={2.2} /> Semana</span>
      <b class="b-num cifra">{semanaEntreno ? `${semanaEntreno.hechas}/${semanaEntreno.total}` : r.registro}</b>
      <span class="b-sub">{semanaEntreno ? 'sesiones' : 'días seguidos'}</span>
      {#if tend}<span class="b-sub">{tend.kgSemana > 0 ? '+' : ''}{num(tend.kgSemana, 1)} kg/sem</span>{/if}
    </a>
  </div>

  {#if abierto === 'comida'}
    <section class="detalle s-comida" aria-label="Detalle de la comida de hoy" transition:slide={{ duration: 200 }}>
    <div class="marcador">
        <div>
          <span class="lbl">{d.pasado ? 'Por encima de tu objetivo' : 'Te quedan'}</span>
          <b class="num cifra" class:pasado={d.pasado}><Cifra valor={Math.abs(d.objetivo.kcal - d.consumido.kcal)} /></b>
          <span class="lbl">kcal</span>
        </div>
        <div class="dcha">
          <span class="lbl">Llevas</span>
          <b class="cifra">{entero(d.consumido.kcal)}</b>
          <span class="lbl">de {entero(d.objetivo.kcal)}</span>
        </div>
      </div>

      <div class="tramos" role="list">
        {#each tramos as t, i (t.id)}
          {@const pct = Math.min(100, (t.comido / t.plan) * 100)}
          <div class="tramo" role="listitem" style="flex:{t.plan}" class:siguiente={t.siguiente} class:saltada={t.saltada} class:extra={t.extra}>
            <div class="pista"><div class="relleno" class:sobra={t.comido > t.plan * 1.15} style="width:{listo ? pct : 0}%;transition-delay:{i * 140}ms"></div></div>
            <span class="t-nombre">{t.nombre}</span>
            <span class="t-kcal cifra" class:pendiente={!t.comido}>{t.saltada ? 'saltada' : entero(t.comido || t.plan)}</span>
          </div>
        {/each}
      </div>

      <div class="macros-dia">
        {#each [['Proteína', 'p', 'b-p'], ['Hidratos', 'c', 'b-c'], ['Grasa', 'g', 'b-g']] as [n, k, cl] (k)}
          <div class="macro {cl}">
            <span>{n}</span>
            <b class="cifra">{Math.round(d.consumido[k])}<small>/{Math.round(d.objetivo[k])} g</small></b>
            <div class="pista"><div class="relleno" style="width:{listo ? Math.min(100, (d.consumido[k] / d.objetivo[k]) * 100) : 0}%"></div></div>
          </div>
        {/each}
      </div>
    </section>
  {:else if abierto === 'entreno'}
    <section class="detalle s-entreno" aria-label="Entreno de hoy" transition:slide={{ duration: 200 }}>
      <div class="tipo-dia" role="group" aria-label="¿Hoy entrenas?">
        <button class:activo={entrenoHoy} aria-pressed={entrenoHoy} onclick={() => cambiarEntreno(true)}><Icono n="dumbbell" tam={15} grosor={2.2} /> Entreno</button>
        <button class:activo={!entrenoHoy} aria-pressed={!entrenoHoy} onclick={() => cambiarEntreno(false)}><Icono n="moon" tam={15} grosor={2.2} /> Descanso</button>
      </div>
      <p class="nota-cambio">{entrenoHoy ? 'Hoy comes como día de entreno: más hidratos y kcal.' : 'Hoy comes como día de descanso.'}{cambioHoy === 'no' && hyroxActivo && sesionesHoy.length ? ' Tu sesión sigue en el plan: muévela a otro día o márcala como no hecha.' : ''}</p>
      {#each sesionesHoy as s (s.id)}<TarjetaSesion sesion={s} registro={$estado.hyrox?.registros?.[s.id]} />{/each}
    </section>
  {/if}

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
    <div class="aviso amarillo"><Icono n="thumbs-up" tam={18} /> <span><b>Hoy vas algo por encima.</b> Es normal en días así: mañana sigue el menú sin compensar.</span></div>
  {/if}

  {#if d.dia && opciones.length && (d.huecoFinal.kcal > 120 || cortos.length)}
    <div class="tarjeta sugerencias">
      <div class="sug-cab">
        <Icono n="lightbulb" tam={20} />
        <div><b>{#if cortos.length}Vas corto de {cortos.map((x) => `${x.nombre} (${x.g} g)`).join(' y ')}{:else}Te faltan unas {entero(d.huecoFinal.kcal)} kcal{/if}</b><small>{d.pendientes.length ? 'Aunque hagas las comidas que quedan. Con esto llegas:' : 'Para cerrar el día, con esto llegas:'}</small></div>
      </div>
      {#each opciones as op (op.nombre)}
        <div class="sug">
          <span class="sug-txt"><b>{op.items.map((it) => `${cantidadTexto(it.a, it.g)}`).join(' + ')}</b><small>{op.nombre}: {entero(op.m.kcal)} kcal, {Math.round(op.m.p)} g de proteína</small></span>
          <button class="sug-mas" aria-label="Añadir {op.nombre}" onclick={() => añadirSugerencia(op)}><Icono n="plus" tam={18} grosor={2.4} /></button>
        </div>
      {/each}
    </div>
  {/if}

  {#if proximo}
    <h2 class="seccion">Ahora toca</h2>
    {#if proximo.tipo === 'comida'}
      <div class="s-comida"><TarjetaComida comida={proximo.c} fecha={hoy} {diaIdx} franjaNombre={nombreFranja(proximo.c)} destacada /></div>
    {:else}
      <div class="s-entreno"><TarjetaSesion sesion={proximo.s} registro={$estado.hyrox?.registros?.[proximo.s.id]} /></div>
    {/if}
  {:else if d.comidas.length}
    <div class="tarjeta completo s-comida"><Icono n="circle-check" tam={22} /> <span><b>Día completado.</b> Todas las comidas registradas.</span></div>
  {/if}

  {#if resto.length}
    <h2 class="seccion">Resto del día</h2>
    <div class="resto">
      {#each resto as it, i (it.tipo + (it.c?.franja || it.s?.id || it.x?.id || it.x?.texto || i))}
        {#if it.tipo === 'comida'}
          <div class="s-comida"><TarjetaComida comida={it.c} fecha={hoy} {diaIdx} franjaNombre={nombreFranja(it.c)} destacada={false} compacta /></div>
        {:else if it.tipo === 'hyrox'}
          {@const reg = $estado.hyrox?.registros?.[it.s.id]}
          <button class="fila s-entreno" onclick={() => abrirHoja('sesion', { id: it.s.id })}>
            <span class="f-ic" class:ok={reg?.estado === 'completa'}><Icono n={reg?.estado === 'completa' ? 'check' : 'dumbbell'} tam={15} grosor={2.4} /></span>
            <span class="f-txt"><small>{it.s.hora} · Entreno</small><b>{it.s.titulo}</b></span>
            <span class="f-dato">{it.s.duracion} min</span>
          </button>
        {:else if it.tipo === 'entreno'}
          <div class="fila s-entreno">
            <span class="f-ic"><Icono n="dumbbell" tam={15} grosor={2.4} /></span>
            <span class="f-txt"><small>{sesion.inicio} · Entreno</small><b>{deportes.map((x) => x.nombre).join(', ') || 'Tu sesión'}</b></span>
          </div>
        {:else if it.tipo === 'sup'}
          <div class="fila s-hoy">
            <span class="f-ic"><Icono e={it.x.emoji} tam={15} grosor={2.4} /></span>
            <span class="f-txt"><small>{it.hora || 'Hoy'} · Suplemento</small><b>{it.x.texto}</b></span>
          </div>
        {:else if it.tipo === 'extra'}
          <div class="fila s-comida">
            <span class="f-ic ok"><Icono n="check" tam={15} grosor={2.4} /></span>
            <span class="f-txt"><small>{it.x.hora || ''} · {it.x.franja ? NOMBRES[it.x.franja] : 'Picoteo'}</small><b>{it.x.nombre}</b></span>
            <span class="f-dato">{entero(it.x.macros.kcal)} kcal</span>
            <button class="borrar" aria-label="Borrar {it.x.nombre}" onclick={() => quitarRegistro(hoy, it.x.id)}><Icono n="x" tam={16} /></button>
          </div>
        {/if}
      {/each}
    </div>
    {#each d.dia?.consejos || [] as c (c)}<p class="nota-dia"><Icono n="info" tam={16} /> {c}</p>{/each}
  {/if}

  <NotaDia fecha={hoy} />
  <div class="consejo"><Icono n="lightbulb" tam={18} /><p>{consejo}</p></div>
</section>

<style>
  .saludo p { margin: 8px 0 0; color: var(--texto-2); font-weight: 600; font-size: 0.88rem; }
  .saludo h1 { margin: 2px 0 16px; }

  .detalle { margin-top: 10px; padding: 16px; border-radius: 22px; background: radial-gradient(120% 90% at 0% 0%, var(--tinte), transparent 65%), var(--superficie); box-shadow: var(--sombra); }
  .detalle .marcador { margin-top: 0; }
  .detalle :global(.sesion) { margin-top: 10px; }

  /* Resto del día: una lista de líneas, cada una con el color de lo que es */
  .resto { display: grid; gap: 6px; }
  .resto :global(.comida-card) { margin: 0; }
  .fila { width: 100%; display: flex; align-items: center; gap: 12px; min-height: 52px; padding: 6px 10px 6px 6px; border: 0; border-radius: 14px; background: var(--superficie); box-shadow: var(--sombra); color: var(--texto); font: inherit; text-align: left; }
  button.fila { cursor: pointer; }
  .f-ic { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 10px; background: var(--primario-claro); color: var(--primario); flex-shrink: 0; }
  .f-ic.ok { background: var(--primario); color: var(--sobre-primario); }
  .f-txt { flex: 1; min-width: 0; display: grid; }
  .f-txt small { font-size: 0.72rem; font-weight: 700; color: var(--primario-fuerte); }
  .f-txt b { font-weight: 600; font-size: 0.9rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .f-dato { font-weight: 700; font-size: 0.86rem; white-space: nowrap; color: var(--texto-2); }
  .completo { display: flex; gap: 10px; align-items: center; color: var(--texto-2); }
  .completo :global(.icono) { color: var(--primario); }

  .resumen { padding: 16px; border-radius: 24px; background: radial-gradient(120% 90% at 0% 0%, var(--tinte), transparent 65%), var(--superficie); box-shadow: var(--sombra); }
  .chips { display: flex; gap: 6px; flex-wrap: wrap; }
  .chip-hoy { display: inline-flex; align-items: center; gap: 6px; padding: 6px 11px; border-radius: 999px; background: var(--superficie-2); font-size: 0.78rem; font-weight: 600; color: var(--texto-2); max-width: 100%; }
  .chip-hoy.naranja { background: var(--primario-claro); color: var(--primario-fuerte); }
  .tipo-dia { display: inline-flex; padding: 3px; border-radius: 999px; background: var(--superficie-2); }
  .tipo-dia button { display: inline-flex; align-items: center; gap: 5px; padding: 5px 11px; border: 0; border-radius: 999px; background: none; color: var(--texto-3); font-weight: 600; font-size: 0.78rem; cursor: pointer; transition: background 0.2s, color 0.2s; }
  /* Zona táctil de 44 px sin cambiar el aspecto de la píldora */
  .tipo-dia button { position: relative; }
  .tipo-dia button::after { content: ""; position: absolute; inset: -8px 0; }
  .tipo-dia button.activo { background: var(--primario); color: var(--sobre-primario); }
  .nota-cambio { margin: 10px 0 0; font-size: 0.8rem; color: var(--texto-2); }
  .marcador { display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; margin: 16px 0 14px; }
  .marcador > div { display: grid; }
  .marcador .dcha { text-align: right; }
  .lbl { font-size: 0.8rem; font-weight: 600; color: var(--texto-2); }
  .num { font-size: 3.4rem; line-height: 1; letter-spacing: -0.05em; margin: 2px 0; }
  .num.pasado { color: var(--texto); }
  .dcha b { font-size: 1.6rem; line-height: 1.1; margin: 2px 0; }
  .tramos { display: flex; gap: 4px; }
  .tramo { min-width: 0; display: grid; gap: 5px; }
  .tramo .pista { height: 12px; border-radius: 4px; background: var(--superficie-3); overflow: hidden; }
  .tramo:first-child .pista { border-radius: 8px 4px 4px 8px; }
  .tramo:last-child .pista { border-radius: 4px 8px 8px 4px; }
  .tramo .relleno { height: 100%; background: var(--hero); transition: width 0.7s cubic-bezier(0.25, 0.9, 0.3, 1); }
  .tramo .relleno.sobra { background: var(--amarillo); }
  .tramo.siguiente .pista { box-shadow: inset 0 0 0 1.5px var(--primario); }
  .tramo.saltada { opacity: 0.45; }
  .tramo.extra .relleno { background: var(--lila); }
  .t-nombre { font-size: 0.74rem; font-weight: 600; color: var(--texto-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .tramo.siguiente .t-nombre { color: var(--primario); }
  .t-kcal { font-size: 0.9rem; color: var(--texto); margin-top: -4px; }
  .t-kcal.pendiente { color: var(--texto-3); font-weight: 600; }
  .macros-dia { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-top: 16px; padding-top: 14px; border-top: 1px solid var(--linea); }
  .macro { display: grid; gap: 2px; }
  .macro span { font-size: 0.76rem; font-weight: 600; color: var(--texto-2); }
  .macro b { font-size: 1rem; }
  .macro small { font-size: 0.74rem; font-weight: 600; color: var(--texto-3); letter-spacing: 0; }
  .macro .pista { height: 4px; border-radius: 999px; background: var(--superficie-3); overflow: hidden; margin-top: 4px; }
  .macro .relleno { height: 100%; border-radius: 999px; transition: width 0.9s cubic-bezier(0.25, 0.9, 0.3, 1) 0.4s; }
  .b-p .relleno { background: var(--coral); } .b-c .relleno { background: var(--amarillo); } .b-g .relleno { background: var(--azul); }

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
  .sug-mas, .borrar { display: grid; place-items: center; width: 44px; height: 44px; border-radius: 50%; border: 0; background: var(--primario); color: var(--sobre-primario); cursor: pointer; flex-shrink: 0; transition: transform 0.15s; }
  .sug-mas:active { transform: scale(0.9); }
  .borrar { background: var(--superficie-2); color: var(--texto-2); }

  .bloque-entreno { display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-radius: 18px; background: var(--superficie); box-shadow: var(--sombra); }
  .be-ic { display: grid; place-items: center; width: 44px; height: 44px; border-radius: 14px; background: var(--primario-claro); color: var(--primario); }
  .bloque-entreno b { font-weight: 600; }
  .bloque-entreno small { display: block; color: var(--texto-2); font-size: 0.78rem; }
  .recordatorio { display: inline-flex; align-items: center; gap: 7px; padding: 6px 12px; border-radius: 999px; background: var(--superficie); box-shadow: var(--sombra); font-size: 0.8rem; font-weight: 600; color: var(--texto-2); }
  .recordatorio :global(.icono) { color: var(--lila); }
  .extra { display: flex; align-items: center; gap: 10px; padding: 10px 0 12px; border-bottom: 1px solid var(--linea); }
  .extra img, .ic { width: 44px; height: 44px; border-radius: 12px; object-fit: contain; background: var(--superficie-2); display: grid; place-items: center; flex-shrink: 0; color: var(--texto-2); }
  .txt { flex: 1; min-width: 0; display: grid; }
  .txt b { font-weight: 600; font-size: 0.92rem; }
  .txt small { color: var(--texto-2); font-size: 0.74rem; }
  .txt small:first-child { font-weight: 700; font-size: 0.74rem; color: var(--texto-3); }
  .nota-dia { display: flex; gap: 8px; align-items: flex-start; }
  .nota-dia :global(.icono) { color: var(--primario); margin-top: 2px; }
  .consejo { display: flex; gap: 10px; align-items: flex-start; margin: 18px 0 0; padding: 14px; border-radius: 18px; border: 1px dashed var(--borde); color: var(--texto-2); font-size: 0.84rem; }
  .consejo :global(.icono) { color: var(--amarillo); margin-top: 1px; }
  .consejo p { margin: 0; }
  .vacia { text-align: center; }
  .vacia-ic { display: inline-grid; place-items: center; width: 60px; height: 60px; border-radius: 20px; background: var(--primario-claro); color: var(--primario); }
</style>
