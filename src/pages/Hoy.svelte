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
  import { hoyISO, recetaPorId } from '../lib/planificador.js';
  import { estadoDia, sugerencias, faltas } from '../lib/dia.js';
  import NotaDia from '../components/NotaDia.svelte';
  import { recomendaciones, recordatoriosDia } from '../lib/salud.js';
  import { esDiaEntreno, horarioDia, aMin, CLASE_SESION } from '../lib/horario.js';
  import { crearRegistro } from '../lib/registro.js';
  import { crearPlan, marcarEntrenoDia, quitarRegistro, alternarToma } from '../lib/acciones.js';
  import { fechaLarga, saludo, entero, capital, num } from '../lib/formato.js';
  import { slide } from 'svelte/transition';
  import { tendencia } from '../lib/progreso.js';
  import { semanaDe } from '../lib/hyrox/plan.js';
  import { rachas } from '../lib/logros.js';
  import PropuestaSemana from '../components/PropuestaSemana.svelte';
  import Valorar from '../components/Valorar.svelte';
  import Anillos from '../components/Anillos.svelte';
  import ComoLlegas from '../components/ComoLlegas.svelte';
  import FotoReceta from '../components/FotoReceta.svelte';
  import { sumarDias } from '../lib/planificador.js';

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
  const NOMBRES = { desayuno: 'Desayuno', media: 'Media mañana', comida: 'Comida', merienda: 'Merienda', cena: 'Cena', recena: 'Antes de dormir' };
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
  // Marca «Ahora» en la línea de tiempo: antes del primer momento que aún no ha llegado
  const posAhora = $derived.by(() => { const i = resto.findIndex((it) => it.hora && it.hora > ahora); return i === -1 ? resto.length : i; });
  const tomadas = $derived($estado.tomas?.[hoy] || {});

  // Por qué toca esa comida a esa hora, en una línea
  const horaEntreno = $derived(entrenoHoy ? (sesionesHoy.find((s) => !['carrera', 'recuperacion', 'caminar'].includes(s.tipo))?.hora || sesion?.inicio || null) : null);
  function porQue(c) {
    if (c.situacion === 'sobra') return 'Hoy no hace falta: el día ya cuadra sin ella';
    if (c.libre) return `Margen de ~${entero(macrosComida(c.ingredientes).kcal)} kcal: come lo que te apetezca`;
    if (c.franja === 'recena') return 'Caseína: proteína lenta mientras duermes';
    if (d.dia?.viaje) return 'De viaje: fácil de encontrar fuera de casa';
    // Según lo que entrenas hoy: antes de series, hidratos y poca grasa; después de fuerza, más proteína
    const clase = CLASE_SESION[sesPrincipal?.tipo];
    if (c.etiqueta === 'pre') return clase === 'intensa' ? `Antes de ${minus(sesPrincipal.titulo.split(':')[0]).split(' ')[0]}: hidratos rápidos y poca grasa` : clase === 'fuerza' ? 'Antes de fuerza: hidratos y algo de proteína' : 'Antes de entrenar: hidratos para rendir';
    if (c.etiqueta === 'post') return clase === 'fuerza' ? 'Después de fuerza: más proteína para el músculo' : clase === 'intensa' ? 'Después de la sesión: hidratos para recargar y proteína' : 'Después de entrenar: proteína para recuperar';
    if (horaEntreno && c.hora) {
      const dif = aMin(horaEntreno) - aMin(c.hora);
      if (dif >= 45 && dif <= 240) return 'Antes de entrenar: hidratos para rendir';
      if (dif < 0 && dif >= -210) return 'Después de entrenar: proteína para recuperar';
    }
    return { desayuno: 'Empieza el día con proteína', comida: 'La comida fuerte del día', cena: entrenoHoy ? 'Recupera sin acostarte lleno' : 'Ligera, para dormir mejor', merienda: 'Llegas a la cena sin hambre', media: 'Aguantas hasta la comida' }[c.franja] || '';
  }
  const POR_QUE_SESION = { caminar: 'Suma pasos sin cargar las piernas', popular: 'Tu carrera: sal a tu ritmo objetivo', recuperacion: 'Movilidad suave para soltar' };

  // Momento del día: Hoy cambia por la mañana, por la tarde y por la noche
  const momento = $derived(ahora < '12:00' ? 'manana' : ahora < '20:30' ? 'tarde' : 'noche');
  const cerrado = $derived(d.comidas.length > 0 && d.comidas.every((c) => c.situacion !== 'pendiente'));
  const sesPrincipal = $derived(sesionesHoy.find((s) => !['carrera'].includes(s.tipo)) || null);
  const regPrincipal = $derived(sesPrincipal ? $estado.hyrox?.registros?.[sesPrincipal.id] : null);
  const minus = (t) => (t ? t[0].toLowerCase() + t.slice(1) : t);
  const COLOR = { kcal: '#b4e35a', p: 'var(--coral)', e: '#a08cff' };

  // Una frase que resume el día (lo que un coach te diría al abrir la app)
  const titular = $derived.by(() => {
    const pre = d.comidas.find((c) => c.etiqueta === 'pre' && c.situacion === 'pendiente');
    const post = d.comidas.find((c) => c.etiqueta === 'post' && c.situacion === 'pendiente');
    const pOk = d.consumido.p >= d.objetivo.p * 0.9;
    if (cerrado && entrenoHoy && sesPrincipal && !regPrincipal && sesPrincipal.tipo !== 'caminar') return { t: 'Comidas hechas: te queda la sesión', s: `${capital(minus(sesPrincipal.titulo.split(':')[0]))} a las ${sesPrincipal.hora}` };
    if (cerrado) return { t: pOk ? 'Día cerrado y proteína cumplida' : 'Día cerrado', s: `${entero(d.consumido.kcal)} kcal y ${Math.round(d.consumido.p)} g de proteína de ${Math.round(d.objetivo.p)} g` };
    const carrera = sesionesHoy.find((x) => x.tipo === 'popular');
    if (carrera) return { t: 'Hoy es tu carrera', s: `Sales a las ${carrera.hora}: desayuno de siempre 2-3 h antes y a disfrutar` };
    if (d.dia?.viaje) return { t: 'Día de viaje', s: 'Come fuera con cabeza: mira qué pedir según el sitio' };
    if (entrenoHoy && sesPrincipal && !regPrincipal && sesPrincipal.tipo !== 'caminar') {
      const partes = [pre && `${nombreFranja(pre).toLowerCase()} pre a las ${pre.hora}`, post && `${nombreFranja(post).toLowerCase()} de recuperación a las ${post.hora}`].filter(Boolean);
      return { t: `Hoy toca ${minus(sesPrincipal.titulo.split(':')[0])} a las ${sesPrincipal.hora}`, s: partes.length ? capital(partes.join(' y ')) : `${sesPrincipal.duracion} min` };
    }
    if (entrenoHoy && regPrincipal) return { t: 'Sesión hecha: toca recuperar', s: 'Proteína en lo que queda y a dormir pronto' };
    if (sesPrincipal?.tipo === 'caminar') return { t: 'Hoy toca caminar', s: 'Suma pasos sin cargar las piernas' };
    if (entrenoHoy) return { t: 'Hoy entrenas', s: sesion ? `A las ${sesion.inicio}` : 'Más hidratos y kcal que un día de descanso' };
    return { t: 'Día de descanso', s: 'Camina, estira y llega a tu proteína' };
  });
  const anillos = $derived([
    { valor: d.consumido.kcal, meta: d.objetivo.kcal, color: COLOR.kcal },
    { valor: d.consumido.p, meta: d.objetivo.p, color: COLOR.p },
    ...(entrenoHoy && sesPrincipal ? [{ valor: regPrincipal ? 1 : 0, meta: 1, color: COLOR.e }] : []),
  ]);

  // Mañana: lo primero que toca (para la noche y el cierre del día)
  const manana = $derived.by(() => {
    const f = sumarDias(hoy, 1);
    const dia = $estado.plan?.dias.find((x) => x.fecha === f);
    const ses = sesionesDia($estado, f).find((x) => x.tipo !== 'carrera');
    return { primera: dia?.comidas[0], ses };
  });

  // Lo ya hecho antes de «Ahora» se pliega en una fila (se despliega al tocar)
  let verHechas = $state(false);
  const esHecho = (it) => (it.tipo === 'comida' && it.c.situacion !== 'pendiente') || it.tipo === 'extra' || (it.tipo === 'hyrox' && $estado.hyrox?.registros?.[it.s.id]?.estado === 'completa') || (it.tipo === 'sup' && !!tomadas[it.x.id]);
  const hechasAntes = $derived(resto.filter((it, i) => i < posAhora && esHecho(it)));
  const plegarHechas = $derived(hechasAntes.length >= 2 && !verHechas);
  const kcalHechas = $derived(Math.round(hechasAntes.reduce((t, it) => t + (it.tipo === 'comida' ? macrosComida(it.c.situacion === 'hecha' && it.c.registro?.ingredientes ? it.c.registro.ingredientes : it.c.ingredientes || []).kcal * (it.c.situacion === 'saltada' || it.c.situacion === 'sobra' ? 0 : 1) : it.tipo === 'extra' ? it.x.macros.kcal : 0), 0)));
  // Solo se pregunta «¿Qué tal estaba?» por la última comida hecha sin valorar (una cada vez)
  const sinValorar = $derived(resto.filter((it) => it.tipo === 'comida' && it.c.situacion === 'hecha' && recetaPorId[it.c.recetaId] && !($estado.favoritas || []).includes(it.c.recetaId) && !($estado.perfil.recetasNo || []).includes(it.c.recetaId)).at(-1));
  const nombreHecho = (it) => (it.tipo === 'comida' ? nombreFranja(it.c) : it.tipo === 'sup' ? it.x.texto.split(' ')[0] : it.tipo === 'hyrox' ? 'entreno' : it.x.nombre);
  const resumenHechas = $derived.by(() => {
    const n = hechasAntes.map(nombreHecho);
    const txt = n.length > 3 ? `${n.slice(0, 3).join(', ')} y ${n.length - 3} más` : n.length > 1 ? `${n.slice(0, -1).join(', ')} y ${n.at(-1)}` : n[0];
    return capital(txt.toLowerCase());
  });


  function añadirSugerencia(op) {
    for (const it of op.items) {
      añadirRegistro(hoy, crearRegistro({ item: { tipo: 'alimento', id: it.a }, cantidad: it.g, fecha: hoy, franja: null }));
    }
    avisar(`Añadido: ${op.nombre}`, '✅');
  }
</script>

<section class="hoy">
  <header class="cab-dia">
    <p class="fecha">{capital(fechaLarga(hoy))} · {saludo().toLowerCase()}{$estado.perfil.nombre ? `, ${$estado.perfil.nombre}` : ''}</p>
    <h1 class="titular">{titular.t}</h1>
    {#if titular.s}<p class="sub-titular">{titular.s}</p>{/if}
  </header>

  <PropuestaSemana />

  <!-- El día en anillos: kcal, proteína y entreno; cada fila se toca para ver el detalle -->
  <section class="resumen-dia s-comida" aria-label="Tu día en cifras">
    <Anillos {anillos} tam={124} grosor={13} />
    <div class="r-filas">
      <button class="r-fila" class:activo={abierto === 'comida'} aria-expanded={abierto === 'comida'} style="--c:{COLOR.kcal}" onclick={() => alternar('comida')}>
        <small>Kcal</small><b class="cifra">{entero(d.consumido.kcal)}<span>/{entero(d.objetivo.kcal)}</span></b>
      </button>
      <button class="r-fila" class:activo={abierto === 'comida'} style="--c:{COLOR.p}" onclick={() => alternar('comida')}>
        <small>Proteína</small><b class="cifra">{Math.round(d.consumido.p)}<span>/{Math.round(d.objetivo.p)} g</span></b>
      </button>
      <button class="r-fila" class:activo={abierto === 'entreno'} aria-expanded={abierto === 'entreno'} style="--c:{COLOR.e}" onclick={() => alternar('entreno')}>
        <small>{entrenoHoy ? 'Entreno' : 'Descanso'}</small>
        <b class="r-texto">{#if !entrenoHoy}recupera y camina{:else if regPrincipal}hecho{:else if sesPrincipal}{sesPrincipal.hora} · {sesPrincipal.duracion} min{:else if sesion}a las {sesion.inicio}{:else}hoy{/if}</b>
      </button>
    </div>
    <a class="r-semana s-progreso" href="#progreso">
      <Icono n="chart-column" tam={14} grosor={2.2} />
      {#if semanaEntreno}{semanaEntreno.hechas}/{semanaEntreno.total} sesiones esta semana{:else}{r.registro} {r.registro === 1 ? 'día' : 'días'} seguidos{/if}{#if tend} · {tend.kgSemana > 0 ? '+' : ''}{num(tend.kgSemana, 1)} kg/sem{/if}
      <Icono n="chevron-right" tam={14} />
    </a>
  </section>

  {#if entrenoHoy && sesPrincipal && !regPrincipal && !['caminar', 'recuperacion', 'popular'].includes(sesPrincipal.tipo) && (momento !== 'noche' || $estado.hyrox?.forma?.[hoy])}
    <ComoLlegas fecha={hoy} sesion={sesPrincipal} />
  {/if}

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
            <div class="pista"><div class="relleno" class:sobra={t.comido > t.plan * 1.15} style="--p:{listo ? pct : 0}%;transition-delay:{i * 140}ms"></div></div>
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
            <div class="pista"><div class="relleno" style="--p:{listo ? Math.min(100, (d.consumido[k] / d.objetivo[k]) * 100) : 0}%"></div></div>
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
  {#if d.dia?.viaje}
    <button class="aviso viaje" onclick={() => abrirHoja('guiaFuera')}><Icono n="map-pin" tam={18} /> <span><b>Hoy comes fuera.</b> Mira qué pedir según el sitio para no salirte del día.</span> <Icono n="chevron-right" tam={18} /></button>
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
      <div class="s-comida"><TarjetaComida comida={proximo.c} fecha={hoy} {diaIdx} franjaNombre={nombreFranja(proximo.c)} destacada portada porque={porQue(proximo.c)} /></div>
    {:else}
      <div class="s-entreno"><TarjetaSesion sesion={proximo.s} registro={$estado.hyrox?.registros?.[proximo.s.id]} /></div>
    {/if}
  {:else if d.comidas.length}
    <section class="cierre" aria-label="Cierre del día">
      <div class="ci-cab"><Icono n="moon" tam={18} grosor={2.2} /> <b>Cierre del día</b></div>
      <div class="ci-datos">
        <div style="--c:{COLOR.kcal}"><small>Kcal</small><b class="cifra">{entero(d.consumido.kcal)}</b><span>{Math.abs(d.consumido.kcal - d.objetivo.kcal) <= d.objetivo.kcal * 0.07 ? 'en tu objetivo' : d.consumido.kcal > d.objetivo.kcal ? `+${entero(d.consumido.kcal - d.objetivo.kcal)} sobre el objetivo` : `${entero(d.objetivo.kcal - d.consumido.kcal)} por debajo`}</span></div>
        <div style="--c:{COLOR.p}"><small>Proteína</small><b class="cifra">{Math.round(d.consumido.p)} g</b><span>{d.consumido.p >= d.objetivo.p * 0.9 ? 'cumplida' : `faltan ${Math.round(d.objetivo.p - d.consumido.p)} g`}</span></div>
      </div>
      {#if manana.primera || manana.ses}
        <p class="ci-manana"><b>Mañana:</b> {#if manana.ses}{minus(manana.ses.titulo.split(':')[0])} a las {manana.ses.hora}{manana.primera ? ' · ' : ''}{/if}{#if manana.primera}desayuno a las {manana.primera.hora}: {recetaPorId[manana.primera.recetaId]?.nombre}{/if}</p>
      {/if}
    </section>
  {/if}

  {#if resto.length}
    <h2 class="seccion">Tu día</h2>
    <ol class="linea-dia">
      {#if plegarHechas}
        <li class="paso hecho plegadas">
          <span class="t-hora cifra">{hechasAntes[0].hora}</span>
          <span class="t-nodo" aria-hidden="true"><Icono n="check" tam={11} grosor={3} /></span>
          <div class="t-cuerpo">
            <button class="fila hechas" onclick={() => (verHechas = true)} aria-expanded="false">
              <span class="f-fotos">{#each hechasAntes.filter((it) => it.tipo === 'comida').slice(0, 3) as it (it.c.franja)}<FotoReceta receta={recetaPorId[it.c.recetaId]} alto={30} redondeo={9} />{/each}</span>
              <span class="f-txt"><small>Hecho · {entero(kcalHechas)} kcal</small><b>{resumenHechas}</b></span>
              <Icono n="chevron-down" tam={18} />
            </button>
            {#if sinValorar && hechasAntes.includes(sinValorar)}<Valorar id={sinValorar.c.recetaId} compacto />{/if}
          </div>
        </li>
      {/if}
      {#each resto as it, i (it.tipo + (it.c?.franja || it.s?.id || it.x?.id || it.x?.texto || i))}
        {#if !(plegarHechas && hechasAntes.includes(it))}
        {#if i === posAhora}<li class="ahora" aria-label="Ahora, {ahora}"><span class="t-hora cifra">{ahora}</span><span class="t-ahora">Ahora</span></li>{/if}
        {@const reg = it.tipo === 'hyrox' ? $estado.hyrox?.registros?.[it.s.id] : null}
        {@const hecho = (it.tipo === 'comida' && it.c.situacion !== 'pendiente') || it.tipo === 'extra' || reg?.estado === 'completa' || (it.tipo === 'sup' && !!tomadas[it.x.id])}
        <li class="paso" class:s-comida={it.tipo === 'comida' || it.tipo === 'extra'} class:s-entreno={it.tipo === 'hyrox' || it.tipo === 'entreno'} class:s-hoy={it.tipo === 'sup'} class:hecho class:pasado={i < posAhora}>
          <span class="t-hora cifra">{it.hora || ''}</span>
          <span class="t-nodo" aria-hidden="true">{#if hecho}<Icono n="check" tam={11} grosor={3} />{/if}</span>
          <div class="t-cuerpo">
            {#if it.tipo === 'comida'}
              <TarjetaComida comida={it.c} fecha={hoy} {diaIdx} franjaNombre={nombreFranja(it.c)} destacada={false} compacta />
              {#if !hecho && porQue(it.c)}<p class="t-porque">{porQue(it.c)}</p>
              {:else if it === sinValorar}<Valorar id={it.c.recetaId} compacto />{/if}
            {:else if it.tipo === 'hyrox'}
              <button class="fila" onclick={() => abrirHoja('sesion', { id: it.s.id })}>
                <span class="f-ic" class:ok={reg?.estado === 'completa'}><Icono n={reg?.estado === 'completa' ? 'check' : 'dumbbell'} tam={15} grosor={2.4} /></span>
                <span class="f-txt"><small>Entreno</small><b>{it.s.titulo}</b></span>
                <span class="f-dato">{it.s.duracion} min</span>
              </button>
              {#if !hecho && POR_QUE_SESION[it.s.tipo]}<p class="t-porque">{POR_QUE_SESION[it.s.tipo]}</p>{/if}
            {:else if it.tipo === 'entreno'}
              <div class="fila">
                <span class="f-ic"><Icono n="dumbbell" tam={15} grosor={2.4} /></span>
                <span class="f-txt"><small>Entreno</small><b>{deportes.map((x) => x.nombre).join(', ') || 'Tu sesión'}</b></span>
              </div>
            {:else if it.tipo === 'sup'}
              <button class="chip-toma" class:tomado={tomadas[it.x.id]} aria-pressed={!!tomadas[it.x.id]} title={it.x.porque} onclick={() => alternarToma(hoy, it.x.id)}>
                {#if tomadas[it.x.id]}<Icono n="check" tam={14} grosor={2.6} />{:else}<Icono n="pill" tam={14} grosor={2.2} />{/if}
                {it.x.texto}<small>{tomadas[it.x.id] ? 'tomado' : 'toca para marcar'}</small>
              </button>
            {:else if it.tipo === 'extra'}
              <div class="fila">
                <span class="f-ic ok"><Icono n="check" tam={15} grosor={2.4} /></span>
                <span class="f-txt"><small>{it.x.franja ? NOMBRES[it.x.franja] : 'Picoteo'}</small><b>{it.x.nombre}</b></span>
                <span class="f-dato">{entero(it.x.macros.kcal)} kcal</span>
                <button class="borrar" aria-label="Borrar {it.x.nombre}" onclick={() => quitarRegistro(hoy, it.x.id)}><Icono n="trash" tam={16} /></button>
              </div>
            {/if}
          </div>
        </li>
        {/if}
      {/each}
      {#if verHechas && hechasAntes.length >= 2}<li class="replegar-li"><button class="replegar-hechas" onclick={() => (verHechas = false)}><Icono n="chevron-up" tam={15} /> Plegar lo hecho</button></li>{/if}
      {#if posAhora === resto.length}<li class="ahora" aria-label="Ahora, {ahora}"><span class="t-hora cifra">{ahora}</span><span class="t-ahora">Ahora</span></li>{/if}
    </ol>
    {#each d.dia?.consejos || [] as c (c)}<p class="nota-dia"><Icono n="info" tam={16} /> {c}</p>{/each}
  {/if}

  {#if momento === 'noche' || cerrado}<NotaDia fecha={hoy} />{/if}
</section>

<style>
  /* Cabecera: la fecha pequeña y el titular del día */
  .cab-dia { margin: 6px 0 16px; }
  .fecha { margin: 0; color: var(--texto-2); font-weight: 600; font-size: 0.84rem; }
  .titular { margin: 4px 0 0; font-size: 1.7rem; line-height: 1.12; letter-spacing: -0.03em; text-wrap: balance; }
  .sub-titular { margin: 6px 0 0; color: var(--texto-2); font-size: 0.92rem; line-height: 1.35; }

  /* El día en anillos */
  .resumen-dia { display: grid; grid-template-columns: auto 1fr; align-items: center; gap: 4px 18px; padding: 16px; border-radius: 26px; background: radial-gradient(120% 100% at 0% 0%, var(--halo), transparent 60%), var(--superficie); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--primario) 16%, transparent); }
  .r-filas { display: grid; gap: 4px; min-width: 0; }
  .r-fila { display: grid; justify-items: start; padding: 4px 8px; margin-left: -8px; border: 0; border-radius: 10px; background: none; color: var(--texto); font: inherit; text-align: left; cursor: pointer; }
  .r-fila.activo { background: var(--superficie-2); }
  .r-fila small { display: inline-flex; align-items: center; gap: 6px; font-size: 0.72rem; font-weight: 700; color: var(--texto-2); }
  .r-fila small::before { content: ""; width: 8px; height: 8px; border-radius: 50%; background: var(--c); }
  .r-fila b { font-size: 1.25rem; line-height: 1.1; color: var(--c); }
  .r-fila b span { font-size: 0.78rem; font-weight: 700; color: var(--texto-3); margin-left: 1px; }
  .r-fila .r-texto { font-size: 0.95rem; font-weight: 700; }
  .r-semana { grid-column: 1 / -1; display: flex; align-items: center; gap: 6px; margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--linea); color: var(--texto-2); font-size: 0.8rem; font-weight: 600; text-decoration: none; }
  .r-semana :global(svg:first-child) { color: var(--primario); }
  .r-semana :global(svg:last-child) { margin-left: auto; color: var(--texto-3); }

  /* Cierre del día */
  .cierre { margin-top: 12px; padding: 16px; border-radius: 22px; background: radial-gradient(120% 100% at 100% 0%, color-mix(in srgb, var(--lila) 22%, transparent), transparent 60%), var(--superficie); box-shadow: var(--sombra); }
  .ci-cab { display: flex; align-items: center; gap: 8px; color: var(--lila); }
  .ci-cab b { color: var(--texto); }
  .ci-datos { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 12px; }
  .ci-datos div { display: grid; }
  .ci-datos small { font-size: 0.72rem; font-weight: 700; color: var(--texto-2); }
  .ci-datos b { font-size: 1.5rem; color: var(--c); line-height: 1.1; }
  .ci-datos span { font-size: 0.78rem; color: var(--texto-2); }
  .ci-manana { margin: 14px 0 0; padding-top: 12px; border-top: 1px solid var(--linea); font-size: 0.86rem; color: var(--texto-2); }
  .ci-manana b { color: var(--texto); }

  /* Lo hecho, plegado */
  .fila.hechas { cursor: pointer; }
  .fila.hechas > :global(svg:last-child) { color: var(--texto-3); flex-shrink: 0; }
  .f-fotos { display: flex; flex-shrink: 0; padding-left: 4px; }
  .f-fotos :global(.foto) { width: 30px; box-shadow: 0 0 0 2px var(--superficie); }
  .f-fotos :global(.foto + .foto) { margin-left: -10px; }
  .replegar-li { list-style: none; padding: 0 0 10px 68px; }
  .replegar-hechas { display: inline-flex; align-items: center; gap: 4px; min-height: 36px; padding: 0 10px; border: 0; border-radius: 10px; background: none; color: var(--texto-3); font: inherit; font-weight: 600; font-size: 0.78rem; cursor: pointer; }

  /* Suplementos: un chip pequeño en su hora */
  .chip-toma { display: inline-flex; align-items: center; gap: 6px; min-height: 40px; margin-top: 8px; padding: 0 14px 0 12px; border: 1px dashed color-mix(in srgb, var(--primario) 45%, transparent); border-radius: 999px; background: none; color: var(--texto); font: inherit; font-size: 0.84rem; font-weight: 700; cursor: pointer; }
  .chip-toma :global(svg) { color: var(--primario); }
  .chip-toma small { font-weight: 600; font-size: 0.72rem; color: var(--texto-3); }
  .chip-toma.tomado { border-style: solid; border-color: transparent; background: var(--primario-claro); color: var(--primario-fuerte); }

  .detalle { margin-top: 10px; padding: 16px; border-radius: 22px; background: radial-gradient(120% 90% at 0% 0%, var(--tinte), transparent 65%), var(--superficie); box-shadow: var(--sombra); }
  .detalle .marcador { margin-top: 0; }
  .detalle :global(.sesion) { margin-top: 10px; }

  /* Tu día: línea de tiempo con la hora a la izquierda; cada paso con el color de lo que es */
  .linea-dia { list-style: none; margin: 0; padding: 0; position: relative; }
  .linea-dia::before { content: ""; position: absolute; left: 55px; top: 18px; bottom: 18px; width: 2px; border-radius: 2px; background: var(--linea); }
  .paso, .ahora { position: relative; display: grid; grid-template-columns: 44px 24px minmax(0, 1fr); align-items: start; }
  .paso { padding-bottom: 10px; }
  .t-hora { padding: 17px 2px 0 0; font-size: 0.78rem; font-weight: 700; color: var(--texto-2); text-align: right; }
  .paso.pasado .t-hora { color: var(--texto-3); }
  .t-nodo { justify-self: center; margin-top: 18px; width: 14px; height: 14px; border-radius: 50%; display: grid; place-items: center; background: var(--fondo); box-shadow: inset 0 0 0 2px var(--primario); color: var(--sobre-primario); z-index: 1; }
  .paso.hecho .t-nodo { width: 18px; height: 18px; margin-top: 16px; background: var(--primario); box-shadow: 0 0 0 3px var(--fondo); }
  .t-cuerpo { min-width: 0; padding-left: 6px; }
  .t-cuerpo :global(.comida-card) { margin: 0; }
  .t-porque { margin: 5px 0 0 4px; font-size: 0.76rem; color: var(--texto-3); line-height: 1.3; }
  .ahora { align-items: center; padding: 0 0 10px; }
  .ahora .t-hora { padding-top: 0; color: var(--primario); }
  .t-ahora { grid-column: 2 / 4; display: flex; align-items: center; gap: 8px; font-size: 0.74rem; font-weight: 800; color: var(--primario); }
  .t-ahora::before { content: ""; width: 10px; height: 10px; margin-left: 7px; border-radius: 50%; background: var(--primario); box-shadow: 0 0 0 4px color-mix(in srgb, var(--primario) 25%, transparent); }
  .t-ahora::after { content: ""; flex: 1; height: 2px; border-radius: 2px; background: linear-gradient(90deg, var(--primario), transparent); }
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
  .tipo-dia button { display: inline-flex; align-items: center; gap: 5px; padding: 5px 11px; border: 0; border-radius: 999px; background: none; color: var(--texto-3); font-weight: 600; font-size: 0.78rem; cursor: pointer; transition: background 0.2s var(--ease-out), color 0.2s var(--ease-out); }
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
  .tramo .relleno { width: 100%; height: 100%; background: var(--hero); transform: translateX(calc(var(--p, 0%) - 100%)); transition: transform 0.7s var(--ease-out); }
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
  .macro .relleno { width: 100%; height: 100%; border-radius: 999px; transform: translateX(calc(var(--p, 0%) - 100%)); transition: transform 0.9s var(--ease-out) 0.4s; }
  .b-p .relleno { background: var(--coral); } .b-c .relleno { background: var(--amarillo); } .b-g .relleno { background: var(--azul); }

  .aviso { display: flex; gap: 10px; align-items: flex-start; padding: 12px 14px; border-radius: 16px; margin: 12px 0; font-size: 0.85rem; color: var(--texto-2); background: var(--lila-claro); }
  .aviso :global(.icono) { color: var(--lila); margin-top: 1px; }
  .aviso b { color: var(--texto); font-weight: 600; }
  .aviso.amarillo { background: var(--amarillo-claro); }
  .aviso.viaje { width: 100%; border: 0; font: inherit; text-align: left; cursor: pointer; align-items: center; }
  .aviso.viaje span { flex: 1; }
  .aviso.amarillo :global(.icono) { color: var(--amarillo); }

  .sugerencias { padding: 14px; }
  .sug-cab { display: flex; gap: 10px; align-items: flex-start; margin-bottom: 6px; color: var(--amarillo); }
  .sug-cab b { color: var(--texto); font-weight: 600; font-size: 0.92rem; }
  .sug-cab small { display: block; color: var(--texto-2); font-size: 0.78rem; }
  .sug { display: flex; align-items: center; gap: 10px; padding: 10px 0; border-top: 1px solid var(--linea); }
  .sug-txt { flex: 1; min-width: 0; display: grid; font-size: 0.86rem; }
  .sug-txt b { font-weight: 600; }
  .sug-txt small { color: var(--texto-2); font-size: 0.74rem; }
  .sug-mas, .borrar { display: grid; place-items: center; width: 44px; height: 44px; border-radius: 50%; border: 0; background: var(--primario); color: var(--sobre-primario); cursor: pointer; flex-shrink: 0; transition: transform 0.15s var(--ease-out); }
  .sug-mas:active { transform: scale(0.9); }
  .borrar { background: var(--superficie-2); color: var(--texto-2); }

  .bloque-entreno { display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-radius: 18px; background: var(--superficie); box-shadow: var(--sombra); }
  .be-ic { display: grid; place-items: center; width: 44px; height: 44px; border-radius: 14px; background: var(--primario-claro); color: var(--primario); }
  .bloque-entreno b { font-weight: 600; }
  .bloque-entreno small { display: block; color: var(--texto-2); font-size: 0.78rem; }
  .recordatorio { display: inline-flex; align-items: center; gap: 7px; padding: 6px 12px; border-radius: 999px; background: var(--superficie); box-shadow: var(--sombra); font-size: 0.8rem; font-weight: 600; color: var(--texto-2); }
  .recordatorio :global(.icono) { color: var(--lila); }
  .extra { display: flex; align-items: center; gap: 10px; padding: 10px 0 12px; border-bottom: 1px solid var(--linea); }
  .ic { width: 44px; height: 44px; border-radius: 12px; object-fit: contain; background: var(--superficie-2); display: grid; place-items: center; flex-shrink: 0; color: var(--texto-2); }
  .txt { flex: 1; min-width: 0; display: grid; }
  .txt b { font-weight: 600; font-size: 0.92rem; }
  .txt small { color: var(--texto-2); font-size: 0.74rem; }
  .txt small:first-child { font-weight: 700; font-size: 0.74rem; color: var(--texto-3); }
  .nota-dia { display: flex; gap: 8px; align-items: flex-start; }
  .nota-dia :global(.icono) { color: var(--primario); margin-top: 2px; }
  .vacia { text-align: center; }
  .vacia-ic { display: inline-grid; place-items: center; width: 60px; height: 60px; border-radius: 20px; background: var(--primario-claro); color: var(--primario); }
</style>
