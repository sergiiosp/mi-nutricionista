// Plan HYROX periodizado hasta la fecha de carrera, con ajuste automático según tus registros.
import { construirSesion, TIPOS, kcalSesionHyrox } from './sesiones.js';
import { ritmos, hms, mmss } from './ritmos.js';
import { sumarDias } from '../planificador.js';
import { EJERCICIOS } from '../../data/hyrox.js';

export const FASES = {
  base: { nombre: 'Base', desc: 'Base aeróbica, fuerza general y técnica de estaciones', color: '#4da3ff' },
  construccion: { nombre: 'Construcción', desc: 'Más ritmo, umbral y primeras combinaciones carrera + estación', color: '#a98bff' },
  especifico: { nombre: 'Específico', desc: 'Compromised running y simulacros a ritmo de carrera', color: '#ff5b1f' },
  taper: { nombre: 'Puesta a punto', desc: 'Menos volumen, mantener la chispa y llegar fresco', color: '#3ddc97' },
};

// Tipos de sesión por fase y número de días disponibles (de lunes a domingo)
const PLANTILLAS = {
  // Fuerza dos días por semana (A: pierna y empuje · B: cadera y tirón) en base y construcción
  base: {
    2: ['fuerza', 'series'], 3: ['fuerza', 'series', 'estaciones'], 4: ['fuerza', 'series', 'fuerza', 'largo'],
    5: ['fuerza', 'series', 'estaciones', 'fuerza', 'largo'], 6: ['fuerza', 'series', 'rodaje', 'fuerza', 'estaciones', 'largo'],
    7: ['fuerza', 'series', 'rodaje', 'fuerza', 'estaciones', 'recuperacion', 'largo'],
  },
  construccion: {
    2: ['fuerza', 'compromised'], 3: ['fuerza', 'umbral', 'compromised'], 4: ['fuerza', 'umbral', 'fuerza', 'compromised'],
    5: ['fuerza', 'series', 'compromised', 'fuerza', 'largo'], 6: ['fuerza', 'series', 'rodaje', 'fuerza', 'compromised', 'largo'],
    7: ['fuerza', 'series', 'rodaje', 'fuerza', 'compromised', 'recuperacion', 'largo'],
  },
  especifico: {
    2: ['series', 'simulacro'], 3: ['fuerza', 'series', 'simulacro'], 4: ['fuerza', 'series', 'compromised', 'simulacro'],
    5: ['fuerza', 'series', 'compromised', 'fuerza', 'simulacro'], 6: ['fuerza', 'series', 'rodaje', 'fuerza', 'compromised', 'simulacro'],
    7: ['fuerza', 'series', 'rodaje', 'fuerza', 'compromised', 'recuperacion', 'simulacro'],
  },
};

// HYROX + físico: una sesión de pierna completa, dos de torso y brazos, y carrera y estaciones
const PLANTILLAS_FISICO = {
  base: {
    3: ['fuerza', 'series', 'torso'], 4: ['fuerza', 'series', 'torso', 'largo'], 5: ['fuerza', 'series', 'torso', 'estaciones', 'largo'],
    6: ['fuerza', 'series', 'torso', 'estaciones', 'torso', 'largo'], 7: ['fuerza', 'series', 'torso', 'rodaje', 'estaciones', 'torso', 'largo'],
  },
  construccion: {
    3: ['fuerza', 'umbral', 'torso'], 4: ['fuerza', 'umbral', 'torso', 'compromised'], 5: ['fuerza', 'umbral', 'torso', 'compromised', 'largo'],
    6: ['fuerza', 'umbral', 'torso', 'compromised', 'torso', 'largo'], 7: ['fuerza', 'series', 'torso', 'rodaje', 'compromised', 'torso', 'largo'],
  },
  especifico: {
    3: ['fuerza', 'series', 'simulacro'], 4: ['fuerza', 'series', 'torso', 'simulacro'], 5: ['fuerza', 'series', 'torso', 'compromised', 'simulacro'],
    6: ['fuerza', 'series', 'torso', 'compromised', 'torso', 'simulacro'], 7: ['fuerza', 'series', 'torso', 'rodaje', 'compromised', 'torso', 'simulacro'],
  },
};
// Volumen de carrera y estaciones según la exigencia que elijas
const FACTOR_EXIGENCIA = { normal: 1, exigente: 1.1, muy: 1.2 };

const ordenSemana = (d) => (d + 6) % 7; // lunes = 0 … domingo = 6
const fechaDe = (iso) => new Date(`${iso}T12:00:00`);
export function lunesDe(iso) {
  return sumarDias(iso, -ordenSemana(fechaDe(iso).getDay()));
}
const diasEntre = (a, b) => Math.round((fechaDe(b) - fechaDe(a)) / 86400000);

/** Ajuste de la semana w según cómo fue la anterior (solo si ya terminó). */
function ajusteSemana(sesionesPrevias, registros, hoy) {
  const reales = sesionesPrevias.filter((s) => s.tipo !== 'carrera');
  if (!reales.length || reales.some((s) => s.fecha >= hoy)) return { factor: 1, motivo: null };
  let hechas = 0;
  const difs = [];
  let malas = 0;
  for (const s of reales) {
    const r = registros[s.id];
    if (!r) continue;
    hechas += r.estado === 'completa' ? 1 : r.estado === 'parcial' ? 0.5 : 0;
    if (r.rpe && r.estado !== 'no') difs.push(r.rpe - s.rpe);
    if (r.sensacion === 'mal') malas++;
  }
  const registradas = reales.filter((s) => registros[s.id]).length;
  if (!registradas) return { factor: 1, motivo: null };
  const cumplimiento = hechas / reales.length;
  const media = difs.length ? difs.reduce((a, b) => a + b, 0) / difs.length : 0;
  if (cumplimiento < 0.6) return { factor: 0.85, motivo: 'La semana pasada te saltaste varias sesiones: esta semana es algo más suave para retomar el ritmo sin lesionarte.' };
  if (media >= 1.5 || malas >= 2) return { factor: 0.85, motivo: 'La semana pasada fuiste más cargado de lo previsto: bajo un 15 % el volumen para que asimiles el trabajo.' };
  if (media <= -1.5 && cumplimiento >= 0.9) return { factor: 1.08, motivo: 'La semana pasada fuiste sobrado: subo un poco el volumen y el ritmo.' };
  return { factor: 1, motivo: null };
}

/**
 * @param hyrox { config, registros, movidas }
 * config: { inicio, fechaCarrera, categoria, nivel, dias[], hora, material{}, lesiones[], marcas{} }
 */
export function generarPlanHyrox(hyrox, perfil, hoy, agenda = null) {
  const { registros = {}, movidas = {}, sinGym = {}, forma = {} } = hyrox;
  // Un plan guardado antes de que existieran el enfoque y la exigencia sigue lo que el configurador da por
  // elegido (HYROX + físico, muy exigente), no otra cosa
  const config = { ...hyrox.config, enfoque: hyrox.config.enfoque || 'equilibrado', exigencia: hyrox.config.exigencia || 'muy' };
  const inicio = lunesDe(config.inicio);
  const carrera = config.fechaCarrera && config.fechaCarrera > inicio ? config.fechaCarrera : null;
  const N = carrera ? Math.min(30, Math.max(2, Math.ceil((diasEntre(inicio, carrera) + 1) / 7))) : 12;
  const taper = carrera ? (N >= 8 ? 2 : 1) : 0;
  const resto = N - taper;
  let nBase; let nConst;
  if (resto <= 4) { nBase = 0; nConst = Math.ceil(resto / 2); } else { nBase = Math.round(resto * 0.4); nConst = Math.round(resto * 0.3); }
  const nEsp = resto - nBase - nConst;
  const faseDe = (w) => (w < nBase ? 'base' : w < nBase + nConst ? 'construccion' : w < resto ? 'especifico' : 'taper');
  const inicioFase = (f) => ({ base: 0, construccion: nBase, especifico: nBase + nConst, taper: resto })[f];
  const largoFase = (f) => ({ base: nBase, construccion: nConst, especifico: nEsp, taper })[f] || 1;
  const dias = [...new Set(config.dias || [])].sort((a, b) => ordenSemana(a) - ordenSemana(b));
  const simCompletoSemana = carrera && N >= 10 ? resto - 3 : -1;
  // Días de viaje en los que entrenas sin máquinas: las sesiones salen con peso corporal, parque y cuestas
  const diasSinGym = new Set();
  for (const v of agenda?.viajes || []) {
    if (v.entreno !== 'sinGym' || !v.desde || !v.hasta) continue;
    for (let f = v.desde; f <= v.hasta; f = sumarDias(f, 1)) diasSinGym.add(f);
  }

  const semanas = [];
  const sesiones = [];
  for (let w = 0; w < N; w++) {
    const fase = faseDe(w);
    const p = largoFase(fase) > 1 ? (w - inicioFase(fase)) / (largoFase(fase) - 1) : 0.5;
    const deload = fase !== 'taper' && (w + 1) % 4 === 0 && w < resto - 1;
    const previas = w > 0 ? semanas[w - 1].sesiones : [];
    const ajuste = w > 0 ? ajusteSemana(previas, registros, hoy) : { factor: 1, motivo: null };
    const factor = (deload ? 0.7 : 1) * ajuste.factor * (fase === 'taper' && w === N - 2 ? 0.7 : 1);
    const rit = ritmos(config, perfil, ajuste.factor > 1 ? -2 : ajuste.factor < 1 ? 3 : 0);
    const lunes = sumarDias(inicio, w * 7);

    let tipos;
    if (fase === 'taper' && w === N - 1) {
      // Semana de carrera: como mucho dos sesiones cortas y ninguna cerca de la carrera (series cortas hasta 2 días
      // antes, estaciones hasta 3 días antes); la víspera, solo la activación. Si la carrera cae entre semana, sale
      // una sola o ninguna: llegar fresco manda.
      const pendientes = ['series', 'estaciones'];
      const limite = (t) => sumarDias(carrera, t === 'estaciones' ? -3 : -2);
      tipos = carrera
        ? dias.map((d) => {
          const t = pendientes.find((x) => sumarDias(lunes, ordenSemana(d)) <= limite(x));
          if (t) pendientes.splice(pendientes.indexOf(t), 1);
          return t || null;
        })
        : dias.slice(0, 2).map((_, i) => (i === 0 ? 'series' : 'estaciones'));
    } else {
      const base = fase === 'taper' ? 'especifico' : fase;
      const n = Math.min(7, Math.max(2, dias.length));
      const fisico = config.enfoque === 'equilibrado' && n >= 3;
      tipos = [...(fisico ? PLANTILLAS_FISICO : PLANTILLAS)[base][n]].slice(0, dias.length);
      if (fase === 'taper') tipos = tipos.map((t) => (t === 'simulacro' ? (dias.length >= 4 ? 'largo' : 'compromised') : t));
      if (fase === 'especifico') {
        const idx = tipos.indexOf('simulacro');
        // Simulacro una semana sí y otra no (y nunca en descarga); la otra, rodaje largo
        if (idx >= 0 && (deload || ((w - inicioFase('especifico')) % 2 === 1 && w !== simCompletoSemana))) tipos[idx] = dias.length >= 4 ? 'largo' : 'compromised';
      }
    }

    const semana = { w, fase, deload, ajuste, lunes, sesiones: [] };
    let nFuerza = 0;
    let nTorso = 0;
    const pierna = config.enfoque === 'equilibrado' && dias.length >= 3;
    // Con un solo día de torso a la semana, ese día es de torso completo (pecho, espalda y brazos)
    const unTorso = tipos.filter((t) => t === 'torso').length === 1;
    tipos.forEach((tipo, i) => {
      if (!tipo) return; // semana de carrera: ese día no toca
      const d = dias[i];
      let fecha = sumarDias(lunes, ordenSemana(d));
      if (carrera && fecha >= carrera) return; // nada el mismo día o después de la carrera
      const id = `s${w}-${d}`;
      const contenido = construirSesion({
        tipo, fase, p, factor: factor * (FACTOR_EXIGENCIA[config.exigencia] || 1), semana: w, config, perfil, rit,
        completo: w === simCompletoSemana, mitad: (w % 2 === 0 ? '1-4' : '5-8'),
        variante: tipo === 'fuerza' ? (pierna ? 'P' : nFuerza++ % 2 === 0 ? 'A' : 'B') : tipo === 'torso' ? (unTorso ? 'C' : nTorso++ % 2 === 0 ? 'A' : 'B') : 'A',
        // Lo que marques en la sesión manda; si no, la fuerza y las estaciones de un viaje sin máquinas van sin gimnasio
        sinGym: id in sinGym ? !!sinGym[id] : diasSinGym.has(movidas[id] || fecha) && ['fuerza', 'hyrox'].includes(TIPOS[tipo].clase),
      });
      const original = fecha;
      if (movidas[id]) fecha = movidas[id];
      semana.sesiones.push({ id, semana: w, fase, fecha, fechaOriginal: original, hora: config.hora || perfil?.horaEntreno || '19:00', ...contenido, rpe: deload ? Math.max(2, contenido.rpe - 1) : contenido.rpe });
    });

    if (carrera && w === N - 1) {
      const vispera = sumarDias(carrera, -1);
      if (vispera >= lunes) {
        semana.sesiones.push({ id: `s${w}-act`, semana: w, fase, fecha: movidas[`s${w}-act`] || vispera, fechaOriginal: vispera, hora: config.hora || '18:00', ...construirSesion({ tipo: 'activacion', fase, config, perfil, rit }) });
      }
      semana.sesiones.push({ id: 'carrera', semana: w, fase, fecha: carrera, fechaOriginal: carrera, hora: config.horaCarrera || '10:00', ...construirSesion({ tipo: 'carrera', fase, config, perfil, rit, duracionCarrera: config.duracionEstimada }) });
    }
    semana.sesiones.sort((a, b) => a.fecha.localeCompare(b.fecha));
    semana.volumen = semana.sesiones.reduce((s, x) => s + x.duracion, 0);
    semanas.push(semana);
    sesiones.push(...semana.sesiones);
  }

  // Carreras populares y viajes de tu agenda: puesta a punto, la carrera, recuperación y días de caminar
  const cargasExtra = [];
  const sueltas = aplicarAgenda(semanas, agenda, { config, perfil, rit: ritmos(config, perfil), cargasExtra });
  // Cómo llegas ese día (sueño, agujetas, energía): si vienes tocado, la sesión se suaviza
  for (const w of semanas) w.sesiones = w.sesiones.map((s) => (forma[s.fecha]?.nivel && forma[s.fecha].nivel !== 'bien' && s.tipo !== 'carrera' ? suavizar(s, forma[s.fecha].nivel, ritmos(config, perfil)) : s));
  sesiones.length = 0;
  for (const w of semanas) {
    w.sesiones.sort((a, b) => a.fecha.localeCompare(b.fecha));
    w.volumen = w.sesiones.reduce((s, x) => s + (x.duracion || 0), 0);
    sesiones.push(...w.sesiones);
  }
  sesiones.push(...sueltas);

  // Lo que ya registraste no cambia ni desaparece: la sesión se queda como la hiciste aunque luego
  // cambies los días, el enfoque o la app se actualice (si ese día ya no está en el plan, se añade tal cual)
  const porId = new Map(sesiones.map((s) => [s.id, s]));
  for (const [id, r] of Object.entries(registros)) {
    if (!r) continue;
    const actual = porId.get(id);
    if (actual) {
      if (r.sesion) Object.assign(actual, structuredClone(r.sesion));
      continue;
    }
    const fecha = r.fecha || r.fechaRegistro;
    if (!fecha) continue;
    const contenido = r.sesion ? structuredClone(r.sesion) : { tipo: 'registrada', titulo: TIPOS.registrada.nombre, emoji: TIPOS.registrada.emoji, color: 'gris', rpe: r.rpe || 6, duracion: r.duracion || 60, distancia: 0, calentamiento: [], bloques: [], vueltaCalma: [], notas: [], ejercicios: Object.keys(r.series || {}).map((ej) => ({ id: ej, nombre: EJERCICIOS[ej]?.nombre || ej, grupo: EJERCICIOS[ej]?.grupo, series: r.series[ej].length, reps: '' })) };
    const semana = semanas.find((x) => fecha >= x.lunes && fecha <= sumarDias(x.lunes, 6));
    const s = { id, semana: semana?.w ?? -1, fase: semana?.fase || 'base', fecha, fechaOriginal: fecha, hora: config.hora || '19:00', ...contenido, historica: true };
    sesiones.push(s);
    if (semana) {
      semana.sesiones.push(s);
      semana.sesiones.sort((a, b) => a.fecha.localeCompare(b.fecha));
      semana.volumen += s.duracion;
    }
  }
  sesiones.sort((a, b) => a.fecha.localeCompare(b.fecha));

  for (const s of sesiones) s.kcal = kcalSesionHyrox(s, perfil?.peso || 75);
  const porFecha = {};
  for (const s of sesiones) (porFecha[s.fecha] ||= []).push(s);
  const diasCarga = [...new Set([...(carrera ? [sumarDias(carrera, -2), sumarDias(carrera, -1)] : []), ...cargasExtra])];
  const fin = sumarDias(inicio, N * 7 - 1);
  return { inicio, carrera, N, fin, semanas, sesiones, porFecha, diasCarga, ritmos: ritmos(config, perfil) };
}

const KM_NOMBRE = (km) => (km >= 40 ? 'Maratón' : km >= 20 ? 'Media maratón' : km >= 14 ? `${Math.round(km)} km` : km >= 9 ? '10 km' : `${Math.round(km)} km`);

/**
 * Sesión de una carrera popular con su objetivo (Riegel desde tu 5 km), los pasos por km,
 * el desayuno, los geles y la bebida: el plan completo del día.
 */
function sesionCarrera(ev, km, rit, perfil = null) {
  const seg = Math.round(rit.t5k * Math.pow(km / 5, 1.06));
  const ritmo = seg / km;
  // Salida 6 s/km más lenta los 3 primeros km y el resto al ritmo que compensa
  const r1 = ritmo + 6;
  const r2 = (seg - 3 * r1) / Math.max(1, km - 3);
  const tiempoEn = (k) => (k <= 3 ? k * r1 : 3 * r1 + (k - 3) * r2);
  const pasos = [5, 10, 15, 20].filter((k) => k < km).map((k) => `Km ${k}: ${hms(Math.round(tiempoEn(k)))}`).concat(`Meta (${String(km).replace('.', ',')} km): ${hms(seg)}`);
  // Geles cada 40 min a partir del minuto 40 (si queda carrera para tomarlos)
  const geles = [];
  for (let t = 40 * 60; t < seg - 10 * 60; t += 40 * 60) geles.push(Math.round(t / ritmo));
  const peso = perfil?.peso || 75;
  const [h, m] = (ev.hora || '09:00').split(':').map(Number);
  const minDesayuno = (h * 60 + m - 165 + 1440) % 1440;
  const horaDesayuno = `${String(Math.floor(minDesayuno / 60)).padStart(2, '0')}:${String(minDesayuno % 60).padStart(2, '0')}`;
  const comer = seg >= 3600 ? [
    `Desayuno a las ${horaDesayuno} (2 h 45 antes): unos ${Math.round(peso * 1.5)} g de hidratos, poca fibra y poca grasa. Por ejemplo: 2 tostadas con mermelada, un plátano y café`,
    'De 30 a 15 min antes: medio plátano o un gel y unos sorbos de agua',
    ...(geles.length ? [`Durante: ${geles.length === 1 ? 'un gel' : `${geles.length} geles`} en el km ${geles.join(' y ')} (cada ~40 min), siempre con agua`] : []),
    'Bebe un poco en cada avituallamiento, sobre todo si hace calor',
  ] : ['Desayuno ligero 2 h antes (tostada con mermelada o un plátano) y agua'];
  return {
    tipo: 'popular', titulo: ev.nombre || KM_NOMBRE(km), emoji: '🏁', color: 'primario', rpe: 8,
    duracion: Math.round(seg / 60), distancia: km,
    calentamiento: ['10 min trotando muy suave', '3-4 rectas progresivas de 80 m', 'Movilidad de cadera y tobillos'],
    bloques: [
      { titulo: 'La carrera', lineas: [
        `Objetivo: ${hms(seg)} (${mmss(ritmo)}/km)`,
        `Primeros 3 km a ${mmss(r1)}/km: la salida engaña`,
        `Hasta el km ${Math.max(3, Math.round(km - 4))}: estable a ${mmss(r2)}/km`,
        'Los últimos km: si vas bien, aprieta poco a poco',
      ] },
      { titulo: 'Por dónde deberías pasar', lineas: pasos },
      { titulo: 'Comer y beber', lineas: comer },
    ],
    vueltaCalma: ['Camina 10 min', 'Estira suave', 'En la primera hora, algo con hidratos y proteína'],
    notas: [km >= 15 ? 'El día antes, carga de hidratos (tu menú ya la lleva) y cena pronto: nada nuevo ni muy graso. Deja ropa, dorsal y geles preparados la noche antes.' : 'La noche antes, cena de siempre con algo más de hidratos y nada nuevo.'],
    ejercicios: [], sinGym: false,
  };
}

// De viaje: caminar como único entreno (90 min) o además de la sesión sin máquinas (60 min)
const sesionCaminar = (min = 90) => ({
  tipo: 'caminar', titulo: 'Caminar por la ciudad', emoji: '🚶', color: 'azul', rpe: 2, duracion: min, distancia: 0,
  calentamiento: [], vueltaCalma: [], notas: [], ejercicios: [], sinGym: true,
  bloques: [{ titulo: 'Hoy', lineas: min >= 90
    ? ['Camina a buen paso: entre 8.000 y 12.000 pasos en el día', 'Sube escaleras cuando puedas', 'Si te apetece, 10-15 min de movilidad en el hotel']
    : ['Además del entreno, camina a buen paso: entre 6.000 y 10.000 pasos en el día', 'Sube escaleras cuando puedas'] }],
});

// Saltos y sprints: fuera los días en que las piernas vienen cargadas de una carrera
const EXPLOSIVOS = new Set(['cajon', 'zancada_salto', 'sprint_cuesta']);

/** Fuerza más ligera: una serie menos en cada ejercicio, menos peso y, si se pide, sin saltos ni sprints. */
function ligera(s, nota, sinSaltos = false) {
  const menos = (t) => t.replace(/(\d+) × /g, (_, n) => `${Math.max(2, Number(n) - 1)} × `);
  const fuera = sinSaltos ? EXPLOSIVOS : new Set();
  const nombres = new Set([...fuera].map((id) => EJERCICIOS[id].nombre));
  return {
    ...s, titulo: `${s.titulo} · ligera`, duracion: Math.round(s.duracion * 0.65), rpe: Math.max(4, s.rpe - 2),
    ejercicios: s.ejercicios.filter((x) => !fuera.has(x.id)).map((x) => ({ ...x, series: Math.max(2, x.series - 1) })),
    bloques: s.bloques.map((b) => ({ ...b, lineas: b.lineas.filter((l) => !nombres.has(l.split(':')[0])).map(menos) })),
    notas: [nota, ...(s.notas || [])],
  };
}

/** Rodaje suave en lugar de la sesión: para llegar fresco a una carrera o recuperarte de ella. */
function rodajeSuave(s, { dur, titulo, lineas, nota }, rit) {
  return {
    ...s, tipo: 'rodaje', titulo, emoji: TIPOS.rodaje.emoji, color: TIPOS.rodaje.color, rpe: 3,
    duracion: dur, distancia: Math.round((dur * 60 / rit.z2) * 10) / 10, ejercicios: [],
    calentamiento: ['5 min caminando o trotando muy suave'],
    bloques: [{ titulo: `${dur} min suaves`, lineas }],
    vueltaCalma: ['Estira suave 5 min'],
    notas: [nota],
  };
}

/**
 * Aplica la agenda (carreras populares y viajes) sobre el plan. Devuelve las sesiones que caen fuera
 * de las semanas del plan (se muestran igual en su día).
 */
function aplicarAgenda(semanas, agenda, { config, perfil, rit, cargasExtra }) {
  const sueltas = [];
  if (!agenda) return sueltas;
  const quitar = (pred) => { for (const w of semanas) w.sesiones = w.sesiones.filter((s) => s.tipo === 'carrera' || !pred(s)); };
  const poner = (s) => {
    const w = semanas.find((x) => s.fecha >= x.lunes && s.fecha <= sumarDias(x.lunes, 6));
    if (w) w.sesiones.push({ semana: w.w, fase: w.fase, ...s });
    else sueltas.push({ semana: -1, fase: 'base', ...s });
  };
  const eventos = (agenda.eventos || []).filter((e) => e.fecha);
  for (const ev of eventos) {
    const F = ev.fecha;
    const km = Number(ev.km) || 21.1;
    const antes = (s) => diasEntre(s.fecha, F);
    if (km >= 15) {
      // Puesta a punto: de 6 a 4 días antes, más corto y suave; los 3 últimos días, descanso
      const nombreEv = (ev.nombre || KM_NOMBRE(km)).toLowerCase();
      for (const w of semanas) {
        w.sesiones = w.sesiones.map((s) => {
          if (s.tipo === 'carrera' || antes(s) < 4 || antes(s) > 6) return s;
          // Fuerza: mismos ejercicios, una serie menos y menos peso
          if (s.ejercicios?.length) return ligera(s, `Semana de tu ${nombreEv}: una serie menos en cada ejercicio y un 70 % del peso de siempre. Nada de pierna pesada.`);
          // Carrera, series, umbral, estaciones…: rodaje suave corto para llegar fresco
          return rodajeSuave(s, {
            dur: 30, titulo: 'Rodaje suave de semana de carrera',
            lineas: [`Ritmo ${mmss(rit.z2)}/km o más lento: debes poder hablar`, 'Al final, 4 progresiones de 80 m para soltar piernas'],
            nota: `Semana de tu ${nombreEv}: hoy toca soltar piernas, no entrenar fuerte.`,
          }, rit);
        });
      }
      quitar((s) => antes(s) >= 0 && antes(s) <= 3);
      // Al día siguiente, recuperación
      const despues = sumarDias(F, 1);
      quitar((s) => s.fecha === despues);
      poner({ id: `rec-${ev.id}`, fecha: despues, fechaOriginal: despues, hora: config.hora || '18:30',
        ...construirSesion({ tipo: 'recuperacion', fase: 'base', config, perfil, rit }), titulo: 'Recuperación tras la carrera' });
      // Vuelta: hasta el día +4 (+9 tras un maratón), rodajes suaves y pierna ligera sin saltos; el torso, normal
      const finVuelta = km >= 30 ? 9 : 4;
      for (const w of semanas) {
        w.sesiones = w.sesiones.map((s) => {
          const d = -antes(s);
          if (d < 2 || d > finVuelta || ['carrera', 'torso', 'recuperacion', 'caminar', 'popular'].includes(s.tipo)) return s;
          if (s.ejercicios?.length) return ligera(s, `Vuelta tras tu ${nombreEv}: las piernas aún están cargadas. Una serie menos, un 70 % del peso y nada de saltos ni sprints.`, true);
          const dur = d === 2 ? 25 : d === 3 ? 30 : 35;
          return rodajeSuave(s, {
            dur, titulo: d === 2 ? 'Trote suave de vuelta' : 'Rodaje suave de vuelta',
            lineas: d === 2
              ? [`Ritmo ${mmss(rit.z2 + 20)}/km o más lento`, 'Si notas las piernas muy cargadas, mejor 30 min de bici o elíptica']
              : [`Ritmo ${mmss(rit.z2 + (d === 3 ? 10 : 0))}/km o más lento: debes poder hablar`, ...(d >= 4 ? ['Al final, 4 progresiones de 80 m si las piernas responden'] : [])],
            nota: `Vuelta tras tu ${nombreEv}: estos días, solo rodajes suaves. Las series y los simulacros vuelven cuando las piernas estén frescas.`,
          }, rit);
        });
      }
      cargasExtra.push(sumarDias(F, -1));
      if (km >= 30) cargasExtra.push(sumarDias(F, -2));
    } else {
      quitar((s) => s.fecha === F);
    }
    poner({ id: `ev-${ev.id}`, fecha: F, fechaOriginal: F, hora: ev.hora || '09:00', ...sesionCarrera(ev, km, rit, perfil) });
  }
  // Viajes (la carrera, si cae en uno, se mantiene): según cómo entrenes allí, caminar en lugar del entreno,
  // la sesión sin máquinas y además caminar, o el plan de siempre si hay gimnasio
  for (const v of agenda.viajes || []) {
    if (!v.desde || !v.hasta) continue;
    const modo = v.entreno || 'caminar';
    if (modo === 'gym') continue;
    for (let f = v.desde; f <= v.hasta; f = sumarDias(f, 1)) {
      if (eventos.some((e) => e.fecha === f)) continue;
      if (modo === 'caminar') {
        quitar((s) => s.fecha === f);
        poner({ id: `cam-${f}`, fecha: f, fechaOriginal: f, hora: '11:00', ...sesionCaminar() });
        continue;
      }
      // Sin máquinas: la sesión del día ya sale adaptada; caminando mucho, la carrera puede ser algo más corta
      let entrena = false;
      for (const w of semanas) {
        w.sesiones = w.sesiones.map((s) => {
          if (s.fecha !== f || ['recuperacion', 'caminar'].includes(s.tipo)) return s;
          entrena = true;
          return ['rodaje', 'largo'].includes(s.tipo) ? { ...s, notas: [...(s.notas || []), 'De viaje: si ese día ya llevas más de 15.000 pasos, acorta la carrera un 20 %.'] } : s;
        });
      }
      poner({ id: `cam-${f}`, fecha: f, fechaOriginal: f, hora: '11:00', ...sesionCaminar(entrena ? 60 : 90) });
    }
  }
  return sueltas;
}

/**
 * Sesión adaptada a cómo llegas: «suave» = menos volumen y un punto menos de esfuerzo;
 * «muy-suave» = la fuerza con dos series menos y un 80 % del peso, y lo demás, rodaje muy suave.
 */
export function suavizar(s, nivel, rit) {
  const muy = nivel === 'muy-suave';
  const nota = muy ? 'Hoy llegas fundido: sesión de mantenimiento. Mejor sumar mañana que romperte hoy.' : 'Hoy llegas algo tocado: menos volumen y un punto menos de esfuerzo.';
  if (s.ejercicios?.length) {
    const quitar = muy ? 2 : 1;
    const menos = (t) => t.replace(/(\d+) × /g, (_, n) => `${Math.max(2, Number(n) - quitar)} × `);
    return {
      ...s, titulo: `${s.titulo} · ${muy ? 'mínima' : 'suave'}`, duracion: Math.round(s.duracion * (muy ? 0.65 : 0.8)), rpe: Math.max(4, s.rpe - (muy ? 2 : 1)), forma: nivel,
      ejercicios: s.ejercicios.map((x) => ({ ...x, series: Math.max(2, x.series - quitar) })),
      bloques: s.bloques.map((b) => ({ ...b, lineas: b.lineas.map(menos) })),
      notas: [`${nota} Usa un ${muy ? 80 : 90} % del peso de siempre.`, ...(s.notas || [])],
    };
  }
  if (['recuperacion', 'caminar', 'popular'].includes(s.tipo)) return s;
  if (muy || ['rodaje', 'largo'].includes(s.tipo)) {
    const dur = muy ? 30 : Math.round(s.duracion * 0.8);
    return {
      ...s, tipo: 'rodaje', titulo: muy ? 'Rodaje muy suave' : `${s.titulo} · más corto`, emoji: TIPOS.rodaje.emoji, color: TIPOS.rodaje.color, rpe: muy ? 3 : Math.max(3, s.rpe - 1), forma: nivel,
      duracion: dur, distancia: Math.round((dur * 60 / rit.z2) * 10) / 10, ejercicios: [],
      bloques: muy ? [{ titulo: `${dur} min muy suaves`, lineas: [`Ritmo ${mmss(rit.z2 + 15)}/km o más lento`, 'Si a los 10 min sigues mal, camina y para'] }] : s.bloques,
      notas: [nota, ...(s.notas || [])],
    };
  }
  // Series, umbral, estaciones, simulacro…: un 30 % menos de repeticiones
  const menos = (t) => t.replace(/(\d+) ×/, (_, n) => `${Math.max(2, Math.ceil(Number(n) * 0.7))} ×`).replace(/(\d+) rondas/, (_, n) => `${Math.max(1, Math.ceil(Number(n) * 0.7))} rondas`);
  return {
    ...s, titulo: `${menos(s.titulo)} · suave`, duracion: Math.round(s.duracion * 0.8), rpe: Math.max(4, s.rpe - 1), forma: nivel,
    distancia: s.distancia ? Math.round(s.distancia * 0.75 * 10) / 10 : s.distancia,
    bloques: s.bloques.map((b) => ({ ...b, titulo: menos(b.titulo || ''), lineas: b.lineas.map(menos) })),
    notas: [nota, ...(s.notas || [])],
  };
}

/** Semana del plan que contiene una fecha (o null). */
export function semanaDe(plan, fecha) {
  return plan.semanas.find((s) => fecha >= s.lunes && fecha <= sumarDias(s.lunes, 6)) || null;
}

/** Sesiones de un día para la nutrición: { tipo, duracion, hora, kcal, carbos, carga } */
export function sesionesNutricion(plan, fecha) {
  const lista = (plan.porFecha[fecha] || []).map((s) => ({ tipo: s.tipo, duracion: s.duracion, hora: s.hora, kcal: s.kcal, carbos: TIPOS[s.tipo]?.carbos || 0 }));
  if (plan.diasCarga.includes(fecha)) lista.push({ tipo: 'carga', duracion: 0, kcal: 0, carbos: 7, carga: true });
  return lista;
}
