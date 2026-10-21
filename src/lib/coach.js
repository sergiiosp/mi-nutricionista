// «Tu plan» explicado como lo haría tu nutricionista y tu entrenador: por qué tus números, dónde estás,
// qué esperar este mes y esta semana, y cómo vas. Todo sale de tus datos (báscula, registros, plan y agenda).
// Cada punto: { titulo, cifra, texto (lo esencial), detalle (lo técnico, se despliega) }.
import { OBJETIVOS, TRABAJO, PASOS } from './nutricion.js';
import { sumarDias } from './planificador.js';
import { planDe } from './hyrox/index.js';
import { semanaDe, FASES } from './hyrox/plan.js';
import { TIPOS } from './hyrox/sesiones.js';
import { ultimaComposicion, cambioCuerpo, veredicto, avisoVisceral } from './cuerpo.js';
import { resumenSemanal } from './logros.js';
import { tendencia, recomendacion } from './progreso.js';
import { entero, num, fechaCorta, diaSemana } from './formato.js';
import { FOTOS_SESIONES as FOTOS } from '../data/fotos.js';

const diasEntre = (a, b) => Math.round((new Date(`${b}T12:00`) - new Date(`${a}T12:00`)) / 86400000);
const lunesDe = (f) => sumarDias(f, -((new Date(`${f}T12:00`).getDay() + 6) % 7));
const signo = (x, d = 1) => `${x > 0 ? '+' : ''}${num(x, d)}`;

/** Lo que se espera en un mes según el objetivo (recomposición: la grasa baja y el músculo aguanta o sube). */
const ESPERADO = {
  recomposicion: { grasa: '−0,5 a −1 kg de grasa', musculo: 'músculo estable o +0,2 a 0,5 kg', peso: 'peso casi estable (±0,5 kg)' },
  perder: { grasa: '−1,5 a −2,5 kg de grasa', musculo: 'músculo estable si cumples la proteína', peso: 'peso a la baja' },
  mantener: { grasa: 'grasa estable', musculo: 'músculo estable o algo arriba', peso: 'peso estable' },
  ganar: { grasa: 'grasa +0,2 a 0,4 kg como mucho', musculo: 'músculo +0,4 a 0,8 kg', peso: 'peso al alza poco a poco' },
};

export function explicarPlan(e, o, hoy) {
  const perfil = e.perfil;
  const obj = perfil.objetivo || 'recomposicion';
  const plan = planDe(e);
  const sem = plan ? semanaDe(plan, hoy) : null;
  const comp = ultimaComposicion(e.pesos || [], perfil.altura);
  const cambio = cambioCuerpo(e.pesos || []);
  const juicio = veredicto(cambio, obj);
  const visceral = avisoVisceral(comp?.visceral);
  const t = tendencia(e.pesos || []);
  const res = resumenSemanal(e, o, hoy);
  const ritmo = OBJETIVOS[obj]?.ritmos[perfil.ritmo] ?? Object.values(OBJETIVOS[obj]?.ritmos || { x: 0 })[0];
  const ent = o.porTipo.entreno;
  const desc = o.porTipo.descanso;
  const ajustes = (perfil.ajusteGasto || 0) + (perfil.ajusteKcal || 0);

  // ── Por qué tus números ──
  const numeros = [
    {
      titulo: 'Calorías', cifra: `${entero(o.kcal)} kcal/día`,
      texto: `${entero(ent.kcal)} los días de entreno y ${entero(desc.kcal)} los de descanso. ${ritmo < 0 ? `Un ${Math.round(-ritmo * 100)} % por debajo de lo que gastas: lo justo para perder grasa sin frenar el músculo.` : ritmo > 0 ? `Un ${Math.round(ritmo * 100)} % por encima de lo que gastas, para construir músculo.` : 'Lo que gastas, para mantenerte.'}`,
      detalle: [
        `Metabolismo basal: ${entero(o.tmb)} kcal, ${o.metodoTmb === 'magra' ? `calculado con tu masa magra (${num(o.magraKg, 1)} kg, fórmula Katch-McArdle), más fiable si tienes más músculo de la media` : 'calculado con peso, altura y edad (Mifflin-St Jeor); con el % de grasa de la báscula afino más'}.`,
        comp?.bmr ? `Tu báscula dice ${entero(comp.bmr)} kcal de basal: ${Math.abs(comp.bmr - o.tmb) < 100 ? 'casi lo mismo, buena señal' : 'difiere algo; me fío más de tu gasto real cuando haya datos'}.` : null,
        `Con tu día a día (${TRABAJO[perfil.trabajo]?.nombre.toLowerCase() || 'actividad normal'}${PASOS[perfil.pasos] ? `, ${PASOS[perfil.pasos].nombre} pasos` : ''}) gastas unas ${entero(desc.get)} kcal en descanso; cada sesión suma unas ${entero(o.kcalSesion)} kcal.`,
        ajustes ? `Ajuste aplicado: ${signo(ajustes, 0)} kcal${perfil.ajusteGasto ? ' (por tu gasto real medido)' : ''}${perfil.ajusteKcal ? ' (por tu repaso semanal)' : ''}.` : 'Sin ajustes por ahora: cuando haya 2 semanas de datos, el gasto real afina esta cifra solo.',
      ].filter(Boolean),
    },
    {
      titulo: 'Proteína', cifra: `${o.proteina} g/día`,
      texto: `${num(o.gKg, 1)} g por kg de peso${o.magraKg ? ` (${num(o.proteina / o.magraKg, 1)} g por kg de masa magra)` : ''}: lo que pide ${obj === 'recomposicion' ? 'ganar músculo mientras pierdes grasa' : obj === 'perder' ? 'no perder músculo en déficit' : 'construir músculo'} entrenando ${o.diasEntreno} días.`,
      detalle: [
        'Repartida en 4-5 tomas de 25-40 g: el músculo la aprovecha mejor que en dos comidas grandes.',
        'La última, con caseína (queso batido, yogur proteico) antes de dormir: se digiere lenta y alimenta el músculo de noche.',
        'Si un día no llegas, el batido de proteína es el comodín, no la base.',
      ],
    },
    {
      titulo: 'Hidratos', cifra: `${entero(ent.hidratos)} g / ${entero(desc.hidratos)} g`,
      texto: 'Más en días de entreno que de descanso, y sobre todo antes de las series y los simulacros: son la gasolina del esfuerzo intenso.',
      detalle: [
        `Mínimo por tipo de sesión (g por kg): ${['series', 'fuerza', 'estaciones', 'simulacro', 'largo'].map((k) => `${TIPOS[k].nombre.toLowerCase()} ${num(TIPOS[k].carbos, 1)}`).join(', ')}.`,
        'Antes de series o carrera: más hidratos y poca grasa (se digiere rápido). Después de fuerza: más proteína.',
        plan?.diasCarga?.length ? 'El día antes de una carrera larga, carga de hidratos: el menú ya la lleva.' : null,
      ].filter(Boolean),
    },
    {
      titulo: 'Grasa', cifra: `${entero(o.grasa)} g/día`,
      texto: 'Nunca por debajo del mínimo saludable (hormonas y vitaminas); se recorta antes de entrenar y se recupera en el resto de comidas.',
      detalle: ['Prioridad: aceite de oliva, pescado azul, huevo y frutos secos que puedes tomar (almendra tostada, pistacho).'],
    },
  ];

  // ── Dónde estás ──
  const donde = [];
  donde.push({
    titulo: 'Tu objetivo', cifra: OBJETIVOS[obj]?.nombre || obj,
    texto: comp?.grasa ? `Hoy: ${num(comp.peso, 1)} kg con un ${num(comp.grasa, 1)} % de grasa (${num(comp.magraKg, 1)} kg magros)${comp.musculo ? ` y ${num(comp.musculo, 1)} kg de músculo` : ''}.` : `Hoy: ${num(perfil.peso, 1)} kg. Apunta grasa y músculo de la báscula para afinar.`,
    detalle: [cambio ? `Desde el ${fechaCorta(cambio.desde)}: grasa ${cambio.grasaKg != null ? `${signo(cambio.grasaKg)} kg` : '—'}, músculo ${cambio.musculo != null ? `${signo(cambio.musculo)} kg` : '—'}, peso ${cambio.peso != null ? `${signo(cambio.peso)} kg` : '—'}.` : 'Con 3 mediciones en 2 semanas verás la tendencia de grasa y músculo.'],
  });
  if (plan && sem) {
    const N = plan.N;
    const fase = FASES[sem.fase];
    const dias = plan.carrera ? diasEntre(hoy, plan.carrera) : null;
    const tramos = [];
    for (const w of plan.semanas) { const u = tramos.at(-1); if (u?.fase === w.fase) u.hasta = w.w + 1; else tramos.push({ fase: w.fase, desde: w.w + 1, hasta: w.w + 1 }); }
    donde.push({
      titulo: 'Tu HYROX', cifra: `Semana ${sem.w + 1} de ${N}`,
      texto: `Fase ${fase.nombre.toLowerCase()}: ${fase.desc.toLowerCase()}.${dias != null && dias >= 0 ? ` Quedan ${dias} días para la carrera (${fechaCorta(plan.carrera)}).` : ''}`,
      detalle: [
        `El plan va por fases: ${tramos.map((x) => `${FASES[x.fase].nombre.toLowerCase()} (semanas ${x.desde}-${x.hasta})`).join(', ')}.`,
        'Cada 3-4 semanas hay una de descarga (menos volumen) para asimilar el trabajo: no es perder el tiempo, es cuando mejoras.',
        sem.ajuste?.motivo ? `Ajuste de esta semana: ${sem.ajuste.motivo}` : 'Si fallas sesiones o las haces muy duras, el plan baja el volumen solo; si vas sobrado, lo sube.',
      ],
    });
  }
  const carreras = (plan?.sesiones || []).filter((s) => s.tipo === 'popular' && s.fecha >= hoy);
  for (const c of carreras.slice(0, 2)) {
    donde.push({
      titulo: c.titulo, cifra: `${capital(diaSemana(c.fecha))} ${Number(c.fecha.slice(8))}`,
      texto: `${c.bloques?.[0]?.lineas?.[0] || ''}. ${diasEntre(hoy, c.fecha) <= 7 ? 'Es esta semana: el entreno ya está en puesta a punto.' : 'Antes, una semana de puesta a punto.'}`,
      detalle: (c.bloques || []).flatMap((b) => b.lineas).slice(1),
    });
  }

  // ── Qué esperar este mes ──
  const esp = ESPERADO[obj] || ESPERADO.recomposicion;
  const mes = [
    {
      titulo: 'Tu cuerpo', cifra: obj === 'recomposicion' ? 'Recomposición' : OBJETIVOS[obj]?.nombre,
      texto: `En 4 semanas, lo esperable si cumples: ${esp.grasa}, ${esp.musculo} y ${esp.peso}.`,
      detalle: [
        `Con tu plan, la báscula debería moverse unos ${signo(o.cambioSemanalKg * 4.3, 1)} kg en el mes.`,
        'El peso de un día oscila ±1 kg por agua, sal y digestión: mira la tendencia y la cintura, no el número suelto.',
        obj === 'recomposicion' ? 'En recomposición la báscula engaña: que el peso no baje no es mala señal si baja la grasa y sube el músculo.' : null,
      ].filter(Boolean),
    },
  ];
  if (plan && sem) {
    const prox = plan.semanas.slice(sem.w, sem.w + 4);
    mes.push({
      titulo: 'Tu entreno', cifra: `${prox.length} semanas`,
      texto: capital(agrupar(prox).map((g) => `${g.desde === g.hasta ? `semana ${g.desde}` : `semanas ${g.desde} a ${g.hasta}`}: ${g.deload ? 'descarga' : FASES[g.fase].nombre.toLowerCase()}`).join('; ')) + '.',
      detalle: prox.map((w) => `Semana ${w.w + 1}: ${w.sesiones.filter((s) => s.tipo !== 'carrera').length} sesiones, ${num(w.volumen / 60, 1)} h${w.deload ? ' · descarga' : ''}`),
    });
  }
  const eventosMes = [
    ...(e.agenda?.eventos || []).filter((x) => x.fecha >= hoy && x.fecha <= sumarDias(hoy, 30)).map((x) => `${x.nombre || 'Carrera'} el ${fechaCorta(x.fecha)}`),
    ...(e.agenda?.viajes || []).filter((x) => x.hasta >= hoy && x.desde <= sumarDias(hoy, 30)).map((x) => `viaje del ${fechaCorta(x.desde)} al ${fechaCorta(x.hasta)}`),
    ...(perfil.diaLibre?.fecha >= hoy ? [`día libre el ${fechaCorta(perfil.diaLibre.fecha)}`] : []),
  ];
  if (eventosMes.length) mes.push({ titulo: 'En tu agenda', cifra: `${eventosMes.length}`, texto: `${capital(eventosMes.join(', '))}. El menú y el entreno ya los tienen en cuenta.`, detalle: [] });
  if (visceral) mes.push({ titulo: 'Prioridad de salud', cifra: `Visceral ${comp.visceral}`, texto: visceral.texto, detalle: [] });

  // ── Esta semana ──
  const semana = [];
  if (plan && sem) {
    const previa = plan.semanas[sem.w - 1];
    const ses = sem.sesiones.filter((s) => s.tipo !== 'carrera');
    const cambioVol = previa?.volumen ? Math.round(((sem.volumen - previa.volumen) / previa.volumen) * 100) : 0;
    const clave = [...ses].filter((s) => s.fecha >= hoy).sort((a, b) => (b.rpe || 0) - (a.rpe || 0) || b.duracion - a.duracion)[0];
    semana.push({
      titulo: 'Entreno', cifra: `${ses.length} sesiones · ${num(sem.volumen / 60, 1)} h`,
      texto: `${sem.deload ? 'Semana de descarga: menos volumen para asimilar. ' : cambioVol >= 10 ? `Sube el volumen un ${cambioVol} %. ` : cambioVol <= -10 ? `Baja el volumen un ${-cambioVol} %. ` : ''}${clave ? `La sesión clave: ${clave.titulo} el ${diaSemana(clave.fecha)}.` : 'Ya has hecho las sesiones de la semana.'}`,
      detalle: ses.map((s) => `${capital(diaSemana(s.fecha)).slice(0, 3)} ${Number(s.fecha.slice(8))}: ${s.titulo} (${s.duracion} min)`),
    });
  }
  const lunes = lunesDe(hoy);
  const diasSem = (e.plan?.dias || []).filter((d) => d.fecha >= lunes && d.fecha <= sumarDias(lunes, 6));
  if (diasSem.length) {
    const carga = (plan?.diasCarga || []).filter((f) => f >= lunes && f <= sumarDias(lunes, 6));
    const notas = [
      carga.length ? `El ${diaSemana(carga[0])}, carga de hidratos: al día siguiente puedes pesar +0,5 a 1 kg de agua. Es normal.` : null,
      diasSem.some((d) => d.viaje) ? 'Días de viaje: menú para comer fuera o del súper, sin cocinar.' : null,
      diasSem.some((d) => d.libre) ? 'Tienes un día libre reservado: los días de antes comen algo menos.' : null,
      plan && sem && !sem.deload && sem.volumen > (plan.semanas[sem.w - 1]?.volumen || Infinity) ? 'Con más volumen es normal tener más hambre los días fuertes: tira de verdura y proteína.' : null,
    ].filter(Boolean);
    semana.push({
      titulo: 'Comida', cifra: `${entero(diasSem.reduce((s, d) => s + (d.objetivo?.kcal || 0), 0) / diasSem.length)} kcal de media`,
      texto: notas[0] || 'Sin días especiales: menú normal, con más hidratos los días de entreno.',
      detalle: notas.slice(1).concat(diasSem.map((d) => `${capital(diaSemana(d.fecha)).slice(0, 3)} ${Number(d.fecha.slice(8))}: ${entero(d.objetivo?.kcal || 0)} kcal${d.entreno ? ' · entreno' : ''}${d.viaje ? ' · viaje' : ''}${d.libre ? ' · día libre' : ''}`)),
    });
  }

  // ── Cómo vas y qué ajusto ──
  const rec = recomendacion(e.pesos || [], perfil, o);
  const sesionesHechas = plan ? plan.sesiones.filter((s) => s.fecha >= sumarDias(hoy, -7) && s.fecha < hoy && s.tipo !== 'carrera') : [];
  const hechas = sesionesHechas.filter((s) => ['completa', 'parcial'].includes(e.hyrox?.registros?.[s.id]?.estado)).length;
  const vas = [
    {
      titulo: 'Últimos 7 días', cifra: `${res.diasProteina}/${res.diasRegistrados || 0} días con proteína`,
      texto: res.diasRegistrados ? `Apuntaste ${res.diasRegistrados} de 6 días, ${res.diasKcal} dentro de tus kcal${plan ? ` y ${hechas} de ${sesionesHechas.length} sesiones hechas` : ''}.` : 'Esta semana casi no has apuntado comidas: sin datos no puedo ajustar bien.',
      detalle: res.consejos,
    },
    {
      titulo: 'Tendencia', cifra: t ? `${signo(t.kgSemana, 2)} kg/sem` : 'Sin datos',
      texto: juicio?.texto || rec.texto,
      detalle: [rec.texto, e.gasto?.listo ? `Tu gasto real medido: ${entero(e.gasto.tdee)} kcal/día (la fórmula decía ${entero(e.gasto.formula)}).` : 'Gasto real: calibrando con tus datos (necesito 2 semanas de comidas y pesajes).'].filter((x, i, l) => x && l.indexOf(x) === i),
    },
  ];

  // Resumen para Hoy (una frase)
  const resumen = plan && sem
    ? `${FASES[sem.fase].nombre}${sem.deload ? ' (descarga)' : ''}: ${semana[0]?.texto.split('. ')[0].toLowerCase() || FASES[sem.fase].desc.toLowerCase()}.`
    : `${OBJETIVOS[obj]?.nombre}: ${o.proteina} g de proteína y ${entero(o.kcal)} kcal de media.`;

  // ── Datos para los gráficos de «Tu plan» ──
  const visual = {};
  if (plan && sem) {
    const tramos = [];
    for (const w of plan.semanas) { const u = tramos.at(-1); if (u?.fase === w.fase) u.hasta = w.w + 1; else tramos.push({ fase: w.fase, nombre: FASES[w.fase].nombre, desde: w.w + 1, hasta: w.w + 1 }); }
    const clave = [...sem.sesiones].filter((s) => s.tipo !== 'carrera').sort((a, b) => (b.rpe || 0) - (a.rpe || 0) || b.duracion - a.duracion)[0];
    visual.portada = {
      semana: sem.w + 1, total: plan.N, fase: FASES[sem.fase].nombre, desc: FASES[sem.fase].desc, deload: !!sem.deload,
      dias: plan.carrera ? diasEntre(hoy, plan.carrera) : null, carrera: plan.carrera, tramos,
      foto: `img/sesiones/${clave && FOTOS[clave.tipo] ? clave.tipo : 'carrera'}.webp`,
      semanas: plan.semanas.map((w) => ({ n: w.w + 1, fase: w.fase, vol: w.volumen || 0, deload: !!w.deload })),
    };
  }
  // La semana, día a día: sesión, kcal del menú y si ya está hecha
  const regs = e.hyrox?.registros || {};
  visual.semana = Array.from({ length: 7 }, (_, i) => {
    const f = sumarDias(lunes, i);
    const d = (e.plan?.dias || []).find((x) => x.fecha === f);
    const ses = (plan?.porFecha?.[f] || []).filter((x) => x.tipo !== 'carrera')[0] || null;
    return { fecha: f, dia: capital(diaSemana(f)).slice(0, 1), num: Number(f.slice(8)), hoy: f === hoy, kcal: d?.objetivo?.kcal || 0, libre: !!d?.libre, viaje: !!d?.viaje,
      ses: ses ? { tipo: ses.tipo, emoji: ses.emoji, titulo: ses.titulo, duracion: ses.duracion, hecha: ['completa', 'parcial'].includes(regs[ses.id]?.estado) } : null };
  });
  const claveSem = visual.semana.filter((d) => d.ses && d.fecha >= hoy).sort((a, b) => (TIPOS[b.ses.tipo]?.rpe || 0) - (TIPOS[a.ses.tipo]?.rpe || 0))[0];
  if (claveSem) claveSem.clave = true;
  // La cuenta de tus kcal: basal + día a día + entreno (media) ± objetivo = lo que comes
  visual.cuenta = [
    { n: 'Basal', v: Math.round(o.tmb), sub: o.metodoTmb === 'magra' ? 'con tu masa magra' : 'peso, altura y edad' },
    { n: 'Día a día', v: Math.round(desc.get - o.tmb), sub: TRABAJO[perfil.trabajo]?.nombre.toLowerCase() || 'actividad' },
    { n: 'Entreno', v: Math.round(o.get - desc.get), sub: `${o.diasEntreno} días/sem` },
    { n: obj === 'ganar' ? 'Superávit' : obj === 'mantener' ? 'Ajuste' : 'Déficit', v: Math.round(o.kcal - o.get), sub: ritmo ? `${signo(ritmo * 100, 0)} %${ajustes ? ` y ${signo(ajustes, 0)} kcal` : ''}` : ajustes ? `${signo(ajustes, 0)} kcal` : 'ninguno' },
  ];
  visual.total = o.kcal;
  const kcalP = o.proteina * 4, kcalC = o.hidratos * 4, kcalG = o.grasa * 9;
  const sumaM = kcalP + kcalC + kcalG || 1;
  visual.macros = [
    { n: 'Proteína', g: o.proteina, pct: kcalP / sumaM, sub: `${num(o.proteina / (o.magraKg || perfil.peso), 1)} g/kg${o.magraKg ? ' magro' : ''}`, color: 'var(--coral)' },
    { n: 'Hidratos', g: o.hidratos, pct: kcalC / sumaM, sub: `${entero(ent.hidratos)} / ${entero(desc.hidratos)} g`, color: 'var(--amarillo)' },
    { n: 'Grasa', g: o.grasa, pct: kcalG / sumaM, sub: `${num(o.grasa / perfil.peso, 1)} g/kg`, color: 'var(--azul)' },
  ];
  // Lo esperado este mes, con tu dato real al lado cuando lo hay
  // [nombre, dirección, texto del rango, tu dato, mínimo y máximo esperables en kg]
  const pesoMes = o.cambioSemanalKg * 4.3;
  // Tu cambio llevado a un mes (si hay más de 30 días de datos), para compararlo con lo esperable en un mes
  const alMes = (x) => (x == null || !cambio ? null : (x * 30) / Math.max(30, cambio.dias));
  const RANGOS = {
    recomposicion: [['Grasa', 'baja', '0,5–1 kg', cambio?.grasaKg, -1.5, -0.4], ['Músculo', 'sube', '0,2–0,5 kg', cambio?.musculo, 0.1, 1], ['Peso', 'igual', '±0,5 kg', cambio?.peso, -0.8, 0.5]],
    perder: [['Grasa', 'baja', '1,5–2,5 kg', cambio?.grasaKg, -3, -1], ['Músculo', 'igual', 'se mantiene', cambio?.musculo, -0.3, 1], ['Peso', 'baja', `${num(Math.abs(pesoMes), 1)} kg`, cambio?.peso, pesoMes * 1.6, pesoMes * 0.5]],
    mantener: [['Grasa', 'igual', 'estable', cambio?.grasaKg, -0.5, 0.3], ['Músculo', 'sube', 'algo arriba', cambio?.musculo, -0.2, 1], ['Peso', 'igual', 'estable', cambio?.peso, -0.6, 0.6]],
    ganar: [['Músculo', 'sube', '0,4–0,8 kg', cambio?.musculo, 0.3, 1.2], ['Grasa', 'igual', 'como mucho +0,4 kg', cambio?.grasaKg, -0.5, 0.5], ['Peso', 'sube', `${num(pesoMes, 1)} kg`, cambio?.peso, pesoMes * 0.4, pesoMes * 1.8]],
  };
  visual.esperado = (RANGOS[obj] || RANGOS.recomposicion).map(([n, dir, rango, bruto, min, max]) => ({ n, dir, rango, real: alMes(bruto) })).map(({ n, dir, rango, real }, i) => ({ n, dir, rango, min: (RANGOS[obj] || RANGOS.recomposicion)[i][4], max: (RANGOS[obj] || RANGOS.recomposicion)[i][5], real })).map(({ n, dir, rango, real, min, max }) => ({
    n, dir, rango, real: real == null ? null : `${signo(real).replace('-', '−')} kg`,
    // bien = dentro de lo esperable; mejor = incluso mejor; ojo = en sentido contrario
    estado: real == null ? null : real >= min && real <= max ? 'bien' : (dir === 'baja' && real < min) || (dir === 'sube' && real > max) ? 'mejor' : 'ojo',
  }));
  // Tu peso de las últimas 6 semanas, para la tendencia
  visual.pesos = [...(e.pesos || [])].filter((p) => p.fecha >= sumarDias(hoy, -42)).sort((a, b) => a.fecha.localeCompare(b.fecha)).map((p) => ({ fecha: p.fecha, peso: p.peso }));
  visual.tendencia = t ? t.kgSemana : null;
  visual.esperadoSemana = o.cambioSemanalKg;
  // La próxima carrera de tu agenda (o la HYROX), a la vista
  const pop = carreras[0];
  if (pop) {
    const objetivo = /Objetivo: ([0-9:]+)/.exec(pop.bloques?.[0]?.lineas?.[0] || '')?.[1];
    visual.carrera = { nombre: pop.titulo, fecha: pop.fecha, dias: diasEntre(hoy, pop.fecha), objetivo, ritmo: /\(([^)]+)\)/.exec(pop.bloques?.[0]?.lineas?.[0] || '')?.[1] };
  }
  // Diario del coach: lo que ha cambiado en tu plan y por qué (y los ajustes automáticos del entreno)
  const ICONO_DIARIO = { gasto: 'trending-up', peso: 'scale', libre: 'party-popper', forma: 'heart-pulse', perfil: 'user', manual: 'pencil', entreno: 'dumbbell' };
  const auto = (plan?.semanas || []).filter((w) => w.ajuste?.motivo && w.lunes <= hoy).map((w) => ({ fecha: w.lunes, tipo: 'entreno', titulo: `Semana ${w.w + 1}: ${w.ajuste.factor > 1 ? 'más' : 'menos'} volumen`, motivo: w.ajuste.motivo }));
  visual.diario = [...(e.diario || []), ...auto]
    .sort((a, b) => b.fecha.localeCompare(a.fecha))
    .map((d) => ({ ...d, icono: ICONO_DIARIO[d.tipo] || (d.tipo.startsWith('ev-') ? 'flag' : d.tipo.startsWith('vi-') ? 'map-pin' : d.tipo.startsWith('repaso') ? 'clipboard-list' : 'sparkles') }));
  // Totales de la semana
  const sesSem = visual.semana.filter((d) => d.ses);
  visual.totalSemana = { sesiones: sesSem.length, horas: sesSem.reduce((t, d) => t + (d.ses.duracion || 0), 0) / 60, hechas: sesSem.filter((d) => d.ses.hecha).length, kcal: Math.round(visual.semana.filter((d) => d.kcal).reduce((t, d) => t + d.kcal, 0) / Math.max(1, visual.semana.filter((d) => d.kcal).length)) };
  // La frase del coach: lo más importante ahora mismo
  visual.coach = visual.carrera && visual.carrera.dias <= 7
    ? `Semana de ${visual.carrera.nombre.toLowerCase()}: llega fresco. Menos volumen, carga de hidratos el día antes y nada nuevo el día de la carrera.`
    : sem?.deload ? 'Semana de descarga: entrenas menos para asimilar lo de las anteriores. Come igual: el músculo se construye ahora.'
    : `${semana[0]?.texto || ''} ${visceral ? 'Y vigila la grasa visceral: déficit suave y pasos diarios.' : obj === 'recomposicion' ? 'Cumple la proteína y la báscula hará el resto.' : ''}`.trim();
  // Cómo vas: los tres anillos de los últimos 7 días
  visual.anillos = [
    { n: 'Proteína', valor: res.diasProteina, meta: 6, color: 'var(--dato-p)' },
    { n: 'Kcal', valor: res.diasKcal, meta: 6, color: 'var(--dato-kcal)' },
    ...(plan ? [{ n: 'Sesiones', valor: hechas, meta: Math.max(1, sesionesHechas.length), color: 'var(--dato-e)' }] : []),
  ];
  visual.frase = juicio?.texto || rec.texto;

  return {
    visual,
    lunes,
    cabecera: plan && sem ? `Semana ${sem.w + 1} de ${plan.N}` : 'Tu plan',
    resumen,
    secciones: [
      { id: 'semana', titulo: 'Esta semana', icono: 'calendar-days', items: semana },
      { id: 'numeros', titulo: 'Por qué tus números', icono: 'target', items: numeros },
      { id: 'donde', titulo: 'Dónde estás', icono: 'map-pin', items: donde },
      { id: 'mes', titulo: 'Qué esperar este mes', icono: 'trending-up', items: mes },
      { id: 'vas', titulo: 'Cómo vas y qué ajusto', icono: 'activity', items: vas },
    ].filter((s) => s.items.length),
  };
}

/** Semanas seguidas de la misma fase (y descarga aparte), para contarlo como lo diría un entrenador. */
function agrupar(semanas) {
  const g = [];
  for (const w of semanas) {
    const u = g.at(-1);
    if (u && u.fase === w.fase && u.deload === !!w.deload) u.hasta = w.w + 1;
    else g.push({ fase: w.fase, deload: !!w.deload, desde: w.w + 1, hasta: w.w + 1 });
  }
  return g;
}

function capital(s) { return s ? s[0].toUpperCase() + s.slice(1) : s; }
