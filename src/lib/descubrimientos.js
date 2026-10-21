// Descubrimientos: lo que dicen tus propios datos. Cruza lo que apuntas (comidas, cómo llegas al entreno,
// cómo te salen las sesiones y tu nota del día) y busca diferencias claras entre dos grupos de días.
// Estadística sencilla, sin IA: solo sale un descubrimiento con datos suficientes en los dos lados y una
// diferencia que merezca la pena. Es correlación, no causa: se presenta como pista.
import { sumarMacros } from './nutricion.js';
import { sumarDias, recetaPorId } from './planificador.js';

const VENTANA = 120; // días hacia atrás
const MIN = 4; // datos mínimos en cada grupo
const CLARO = 8; // con esto en cada grupo ya es un patrón, no una pista
const DIF_PCT = 20; // puntos de diferencia para contar como descubrimiento

const media = (l) => l.reduce((a, b) => a + b, 0) / l.length;
function mediana(l) {
  const s = [...l].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
/** Parte una lista en dos por la mediana de `v` (≥ corte / < corte); si los empates dejan un lado corto, prueba > / ≤. */
function partir(l, v, redondeo) {
  const corte = Math.round(mediana(l.map(v)) / redondeo) * redondeo;
  const a = l.filter((x) => v(x) >= corte), b = l.filter((x) => v(x) < corte);
  if (Math.min(a.length, b.length) >= MIN) return { corte, a, b, mas: '≥' };
  const a2 = l.filter((x) => v(x) > corte), b2 = l.filter((x) => v(x) <= corte);
  return Math.min(a2.length, b2.length) > Math.min(a.length, b.length) ? { corte, a: a2, b: b2, mas: '>' } : { corte, a, b, mas: '≥' };
}
const pct = (l, f) => Math.round((l.filter(f).length / l.length) * 100);
const hhmm = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(Math.round(m % 60)).padStart(2, '0')}`;
const aMin = (h) => { const [a, b] = (h || '').split(':').map(Number); return Number.isFinite(a) ? a * 60 + (b || 0) : null; };
const finde = (f) => [0, 6].includes(new Date(`${f}T12:00:00`).getDay());

/** Lo comido un día, solo si el día está apuntado de verdad (no un desayuno suelto). */
function comido(e, f) {
  const l = e.registros?.[f];
  if (!l || l.length < 2) return null;
  const m = sumarMacros(l.map((r) => r.macros || { kcal: 0, p: 0, c: 0, g: 0 }));
  return m.kcal >= 1000 ? m : null;
}

/** Sesiones registradas (hechas) con su fecha y si salieron bien: sin malas sensaciones y sin costar más de lo previsto. */
function sesiones(e, desde) {
  return Object.values(e.hyrox?.registros || {})
    .filter((r) => r.fecha && r.fecha >= desde && r.estado && r.estado !== 'no')
    .map((r) => ({ fecha: r.fecha, bien: r.sensacion !== 'mal' && !(r.rpe && r.sesion?.rpe && r.rpe > r.sesion.rpe) }));
}

/**
 * Compara dos grupos con un porcentaje (más alto = mejor si `alto` es true). Devuelve el descubrimiento,
 * uno «sin diferencia» o lo que falta para saberlo.
 */
function comparar({ id, icono, color, a, b, alto = true, unidad, frases, aprende }) {
  const nMin = Math.min(a.l.length, b.l.length);
  if (nMin < MIN) return { aprendiendo: { id, icono, color, titulo: aprende.titulo, como: aprende.como, progreso: Math.min(a.l.length, MIN) / MIN / 2 + Math.min(b.l.length, MIN) / MIN / 2 } };
  const va = pct(a.l, a.f), vb = pct(b.l, b.f);
  const dif = va - vb;
  if (Math.abs(dif) < DIF_PCT) return { sinEfecto: { id, texto: frases.igual } };
  const mejor = (dif > 0) === alto ? 0 : 1;
  return {
    hallazgo: {
      id, icono, color, unidad,
      titulo: frases.titulo(mejor, Math.abs(dif) >= 40 ? 'mucho ' : ''),
      detalle: frases.detalle,
      grupos: [{ etiqueta: a.etiqueta, valor: va, n: a.l.length }, { etiqueta: b.etiqueta, valor: vb, n: b.l.length }],
      destaca: mejor, claro: nMin >= CLARO,
      fuerza: (Math.abs(dif) / 100) * Math.min(1, nMin / CLARO),
    },
  };
}

/** Todos los descubrimientos con tus datos de los últimos meses. */
export function descubrimientos(e, hoy) {
  const desde = sumarDias(hoy, -VENTANA);
  const res = [];
  const forma = e.hyrox?.forma || {};
  const notas = e.feedback?.dias || {};
  const ses = sesiones(e, desde).filter((s) => s.fecha < hoy || s.fecha === hoy);
  const bien = (s) => s.bien;

  // 1 · Sueño → cómo te salen las sesiones
  const conSueno = ses.filter((s) => forma[s.fecha]?.sueno != null);
  res.push(comparar({
    id: 'sueno-sesion', icono: 'bed', color: 'var(--dato-e)', unidad: '% de sesiones que salen bien',
    a: { etiqueta: 'Durmiendo bien', l: conSueno.filter((s) => forma[s.fecha].sueno === 2), f: bien },
    b: { etiqueta: 'Durmiendo regular o mal', l: conSueno.filter((s) => forma[s.fecha].sueno < 2), f: bien },
    frases: {
      titulo: (m, x) => (m === 0 ? `Cuando duermes bien, tus sesiones salen ${x}mejor` : 'Curioso: durmiendo peor te salen mejor las sesiones'),
      detalle: 'Salir bien: sin malas sensaciones y sin costarte más de lo previsto. Dormir es tu mejor suplemento.',
      igual: 'Dormir algo peor no cambia cómo te salen las sesiones.',
    },
    aprende: { titulo: 'Sueño y entrenos', como: 'Dime cómo llegas (sueño) antes de entrenar y apunta la sesión.' },
  }));

  // 2 · Hidratos del día antes → sesión
  const conHc = ses.map((s) => ({ ...s, c: comido(e, sumarDias(s.fecha, -1))?.c })).filter((s) => s.c != null);
  if (conHc.length) {
    const { corte, a, b, mas } = partir(conHc, (s) => s.c, 10);
    res.push(comparar({
      id: 'hidratos-sesion', icono: 'wheat', color: 'var(--dato-kcal)', unidad: '% de sesiones que salen bien',
      a: { etiqueta: `Día antes ${mas} ${corte} g de hidratos`, l: a, f: bien },
      b: { etiqueta: 'Día antes con menos', l: b, f: bien },
      frases: {
        titulo: (m, x) => (m === 0 ? `Con más hidratos el día antes, tus sesiones salen ${x}mejor` : 'Con menos hidratos el día antes te salen mejor las sesiones'),
        detalle: 'El glucógeno se carga el día anterior: es la gasolina de las series y los simulacros.',
        igual: 'Los hidratos del día antes no cambian cómo te salen las sesiones.',
      },
      aprende: { titulo: 'Hidratos y entrenos', como: 'Apunta tus comidas del día antes de cada sesión.' },
    }));
  } else res.push({ aprendiendo: { id: 'hidratos-sesion', icono: 'wheat', color: 'var(--dato-kcal)', titulo: 'Hidratos y entrenos', como: 'Apunta tus comidas del día antes de cada sesión.', progreso: 0 } });

  // Días con nota y comida apuntada
  const dias = Object.keys(notas).filter((f) => f >= desde && f < hoy).map((f) => ({ f, nota: notas[f], m: comido(e, f) })).filter((d) => d.m);

  // 3 · Proteína → hambre
  const conHambre = dias.filter((d) => d.nota.hambre);
  if (conHambre.length) {
    const { corte, a, b, mas } = partir(conHambre, (d) => d.m.p, 5);
    res.push(comparar({
      id: 'proteina-hambre', icono: 'drumstick', color: 'var(--dato-p)', unidad: '% de días con mucha hambre', alto: false,
      a: { etiqueta: `${mas} ${corte} g de proteína`, l: a, f: (d) => d.nota.hambre === 'mucha' },
      b: { etiqueta: 'Con menos proteína', l: b, f: (d) => d.nota.hambre === 'mucha' },
      frases: {
        titulo: (m, x) => (m === 0 ? `Pasando de ${corte} g de proteína, pasas ${x}menos hambre` : 'Con menos proteína tienes menos hambre: raro, sigo mirando'),
        detalle: 'La proteína es lo que más sacia: llegar a tu cifra hace el déficit mucho más llevadero.',
        igual: 'Tu hambre no depende de la proteína que comes.',
      },
      aprende: { titulo: 'Proteína y hambre', como: 'Rellena «¿Cómo ha ido hoy?» (hambre) los días que apuntas todo.' },
    }));
  } else res.push({ aprendiendo: { id: 'proteina-hambre', icono: 'drumstick', color: 'var(--dato-p)', titulo: 'Proteína y hambre', como: 'Rellena «¿Cómo ha ido hoy?» (hambre) los días que apuntas todo.', progreso: 0 } });

  // 4 · Calorías → energía
  const conEnergia = dias.filter((d) => d.nota.energia);
  if (conEnergia.length) {
    const { corte, a, b, mas } = partir(conEnergia, (d) => d.m.kcal, 50);
    res.push(comparar({
      id: 'kcal-energia', icono: 'battery-charging', color: 'var(--amarillo)', unidad: '% de días con energía baja', alto: false,
      a: { etiqueta: `${mas} ${corte} kcal`, l: a, f: (d) => d.nota.energia === 'baja' },
      b: { etiqueta: 'Comiendo menos', l: b, f: (d) => d.nota.energia === 'baja' },
      frases: {
        titulo: (m, x) => (m === 0 ? `Por debajo de ${corte} kcal te quedas ${x}más a menudo sin energía` : 'Comiendo algo menos tienes más energía'),
        detalle: 'Si te pasa a menudo, mejor un déficit algo más suave que perder calidad en los entrenos.',
        igual: 'Comer un poco menos no te baja la energía.',
      },
      aprende: { titulo: 'Calorías y energía', como: 'Rellena «¿Cómo ha ido hoy?» (energía) los días que apuntas todo.' },
    }));
  } else res.push({ aprendiendo: { id: 'kcal-energia', icono: 'battery-charging', color: 'var(--amarillo)', titulo: 'Calorías y energía', como: 'Rellena «¿Cómo ha ido hoy?» (energía) los días que apuntas todo.', progreso: 0 } });

  // 5 · Cena tarde → sueño
  const noches = Object.keys(forma).filter((f) => f >= desde && f <= hoy && forma[f].sueno != null).map((f) => {
    const horas = (e.registros?.[sumarDias(f, -1)] || []).map((r) => aMin(r.hora)).filter((m) => m != null && m >= 17 * 60);
    return horas.length ? { f, cena: Math.max(...horas), sueno: forma[f].sueno } : null;
  }).filter(Boolean);
  const corteCena = noches.length ? Math.round(mediana(noches.map((n) => n.cena)) / 15) * 15 : null;
  const tarde = noches.filter((n) => n.cena > corteCena), pronto = noches.filter((n) => n.cena <= corteCena);
  if (noches.length && Math.max(...noches.map((n) => n.cena)) - Math.min(...noches.map((n) => n.cena)) >= 45) {
    res.push(comparar({
      id: 'cena-sueno', icono: 'moon', color: 'var(--dato-e)', unidad: '% de noches que duermes bien',
      a: { etiqueta: `Cenando hasta las ${hhmm(corteCena)}`, l: pronto, f: (n) => n.sueno === 2 },
      b: { etiqueta: 'Cenando más tarde', l: tarde, f: (n) => n.sueno === 2 },
      frases: {
        titulo: (m, x) => (m === 0 ? `Cenando hasta las ${hhmm(corteCena)} duermes ${x}mejor` : 'Cenar tarde no te quita sueño: incluso duermes mejor'),
        detalle: 'Una cena pesada y tardía sube la temperatura y el pulso justo cuando toca bajar.',
        igual: 'La hora de la cena no cambia cómo duermes.',
      },
      aprende: { titulo: 'Hora de la cena y sueño', como: 'Apunta la cena y, al día siguiente, cómo has dormido antes de entrenar.' },
    }));
  } else res.push({ aprendiendo: { id: 'cena-sueno', icono: 'moon', color: 'var(--dato-e)', titulo: 'Hora de la cena y sueño', como: 'Apunta la cena y, al día siguiente, cómo has dormido antes de entrenar.', progreso: Math.min(1, noches.length / (MIN * 2)) } });

  // 6 · Fin de semana → calorías
  const apuntados = [];
  for (let f = desde; f < hoy; f = sumarDias(f, 1)) { const m = comido(e, f); if (m) apuntados.push({ f, kcal: m.kcal }); }
  const fs = apuntados.filter((d) => finde(d.f)), lab = apuntados.filter((d) => !finde(d.f));
  if (fs.length >= 3 && lab.length >= 6) {
    const kf = Math.round(media(fs.map((d) => d.kcal))), kl = Math.round(media(lab.map((d) => d.kcal)));
    const dif = kf - kl;
    if (Math.abs(dif) >= 150) {
      res.push({ hallazgo: {
        id: 'finde-kcal', icono: 'calendar-days', color: 'var(--dato-kcal)', unidad: 'kcal de media al día',
        titulo: dif > 0 ? `Los fines de semana comes ${dif} kcal más al día` : `Los fines de semana comes ${-dif} kcal menos al día`,
        detalle: dif > 0 ? `Son unas ${dif * 2} kcal más cada semana, que se comen parte de tu déficit. Mejor planificar el sábado que improvisarlo.` : 'Ojo con quedarte corto: el lunes llegarías con poca gasolina.',
        grupos: [{ etiqueta: 'Lunes a viernes', valor: kl, n: lab.length }, { etiqueta: 'Sábado y domingo', valor: kf, n: fs.length }],
        destaca: 1, claro: fs.length >= 6, fuerza: Math.min(1, Math.abs(dif) / 600) * Math.min(1, fs.length / 6), kcal: true,
      } });
    } else res.push({ sinEfecto: { id: 'finde-kcal', texto: 'Comes igual entre semana que el fin de semana.' } });
  } else res.push({ aprendiendo: { id: 'finde-kcal', icono: 'calendar-days', color: 'var(--dato-kcal)', titulo: 'Fin de semana y calorías', como: 'Apunta lo que comes también el sábado y el domingo.', progreso: Math.min(1, fs.length / 6 + lab.length / 12) } });

  // 7 · Digestión pesada → qué plato coincide
  const conDig = Object.keys(notas).filter((f) => f >= desde && f < hoy && notas[f].digestion && e.registros?.[f]?.length);
  const malos = conDig.filter((f) => notas[f].digestion === 'mal');
  if (conDig.length >= 6 && malos.length >= 2) {
    const cuenta = {};
    for (const f of conDig) {
      for (const id of new Set(e.registros[f].filter((r) => r.tipo === 'plan' && r.ref).map((r) => r.ref))) {
        cuenta[id] ||= { total: 0, mal: 0 };
        cuenta[id].total++;
        if (notas[f].digestion === 'mal') cuenta[id].mal++;
      }
    }
    const base = malos.length / conDig.length;
    const sosp = Object.entries(cuenta).filter(([id, c]) => c.mal >= 2 && c.mal / c.total >= 0.6 && c.mal / c.total >= base * 2 && recetaPorId[id])
      .sort((x, y) => y[1].mal / y[1].total - x[1].mal / x[1].total)[0];
    if (sosp) {
      const [id, c] = sosp;
      const sin = conDig.length - c.total;
      const malSin = malos.length - c.mal;
      res.push({ hallazgo: {
        id: 'digestion-plato', icono: 'soup', color: 'var(--coral)', unidad: '% de días con digestión pesada',
        titulo: `La digestión pesada coincide con «${recetaPorId[id].nombre}»`,
        detalle: `${c.mal} de las ${c.total} veces que lo comiste. Puede ser la ración, la hora o el plato: prueba a quitarlo unas semanas.`,
        grupos: [{ etiqueta: 'Sin ese plato', valor: sin ? Math.round((malSin / sin) * 100) : 0, n: sin }, { etiqueta: 'Con ese plato', valor: Math.round((c.mal / c.total) * 100), n: c.total }],
        destaca: 1, claro: c.total >= 4, fuerza: c.mal / c.total, receta: id,
      } });
    }
  } else if (conDig.length >= 10) res.push({ sinEfecto: { id: 'digestion-plato', texto: 'Ningún plato te sienta mal de forma repetida.' } });
  else res.push({ aprendiendo: { id: 'digestion-plato', icono: 'soup', color: 'var(--coral)', titulo: 'Platos y digestión', como: 'Rellena «¿Cómo ha ido hoy?» (digestión): si algo te sienta mal, lo encontraré.', progreso: Math.min(0.9, conDig.length / 10) } });

  return {
    hallazgos: res.map((r) => r.hallazgo).filter(Boolean).sort((a, b) => b.fuerza - a.fuerza),
    sinEfecto: res.map((r) => r.sinEfecto).filter(Boolean),
    aprendiendo: res.map((r) => r.aprendiendo).filter(Boolean).sort((a, b) => b.progreso - a.progreso),
  };
}
