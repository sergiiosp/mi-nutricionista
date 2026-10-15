// Plan HYROX periodizado hasta la fecha de carrera, con ajuste automático según tus registros.
import { construirSesion, TIPOS, kcalSesionHyrox } from './sesiones.js';
import { ritmos } from './ritmos.js';
import { sumarDias } from '../planificador.js';

export const FASES = {
  base: { nombre: 'Base', desc: 'Base aeróbica, fuerza general y técnica de estaciones', color: '#4b8cf5' },
  construccion: { nombre: 'Construcción', desc: 'Más ritmo, umbral y primeras combinaciones carrera + estación', color: '#8576ef' },
  especifico: { nombre: 'Específico', desc: 'Compromised running y simulacros a ritmo de carrera', color: '#ff6f56' },
  taper: { nombre: 'Puesta a punto', desc: 'Menos volumen, mantener la chispa y llegar fresco', color: '#12a86b' },
};

// Tipos de sesión por fase y número de días disponibles (de lunes a domingo)
const PLANTILLAS = {
  base: {
    2: ['series', 'estaciones'], 3: ['series', 'fuerza', 'largo'], 4: ['series', 'fuerza', 'estaciones', 'largo'],
    5: ['series', 'fuerza', 'rodaje', 'estaciones', 'largo'], 6: ['series', 'fuerza', 'rodaje', 'estaciones', 'recuperacion', 'largo'],
    7: ['series', 'fuerza', 'rodaje', 'estaciones', 'recuperacion', 'rodaje', 'largo'],
  },
  construccion: {
    2: ['umbral', 'compromised'], 3: ['umbral', 'fuerza', 'compromised'], 4: ['series', 'fuerza', 'compromised', 'largo'],
    5: ['umbral', 'fuerza', 'rodaje', 'compromised', 'largo'], 6: ['series', 'fuerza', 'rodaje', 'compromised', 'recuperacion', 'largo'],
    7: ['series', 'fuerza', 'rodaje', 'compromised', 'recuperacion', 'estaciones', 'largo'],
  },
  especifico: {
    2: ['series', 'simulacro'], 3: ['series', 'fuerza', 'simulacro'], 4: ['series', 'fuerza', 'compromised', 'simulacro'],
    5: ['umbral', 'fuerza', 'rodaje', 'compromised', 'simulacro'], 6: ['series', 'fuerza', 'rodaje', 'compromised', 'recuperacion', 'simulacro'],
    7: ['series', 'fuerza', 'rodaje', 'compromised', 'recuperacion', 'estaciones', 'simulacro'],
  },
};

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
export function generarPlanHyrox(hyrox, perfil, hoy) {
  const { config, registros = {}, movidas = {} } = hyrox;
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
      // Semana de carrera: dos sesiones cortas al principio, activación la víspera y la carrera
      tipos = dias.slice(0, 2).map((_, i) => (i === 0 ? 'series' : 'estaciones'));
    } else {
      const base = fase === 'taper' ? 'especifico' : fase;
      const n = Math.min(7, Math.max(2, dias.length));
      tipos = [...PLANTILLAS[base][n]].slice(0, dias.length);
      if (fase === 'taper') tipos = tipos.map((t) => (t === 'simulacro' ? (dias.length >= 4 ? 'largo' : 'compromised') : t));
      if (fase === 'especifico') {
        const idx = tipos.indexOf('simulacro');
        // Simulacro una semana sí y otra no (y nunca en descarga); la otra, rodaje largo
        if (idx >= 0 && (deload || ((w - inicioFase('especifico')) % 2 === 1 && w !== simCompletoSemana))) tipos[idx] = dias.length >= 4 ? 'largo' : 'compromised';
      }
    }

    const semana = { w, fase, deload, ajuste, lunes, sesiones: [] };
    tipos.forEach((tipo, i) => {
      const d = dias[i];
      let fecha = sumarDias(lunes, ordenSemana(d));
      if (carrera && fecha >= carrera) return; // nada el mismo día o después de la carrera
      const contenido = construirSesion({
        tipo, fase, p, factor, semana: w, config, perfil, rit,
        completo: w === simCompletoSemana, mitad: (w % 2 === 0 ? '1-4' : '5-8'),
      });
      const id = `s${w}-${d}`;
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

  for (const s of sesiones) s.kcal = kcalSesionHyrox(s, perfil?.peso || 75);
  const porFecha = {};
  for (const s of sesiones) (porFecha[s.fecha] ||= []).push(s);
  const diasCarga = carrera ? [sumarDias(carrera, -2), sumarDias(carrera, -1)] : [];
  const fin = sumarDias(inicio, N * 7 - 1);
  return { inicio, carrera, N, fin, semanas, sesiones, porFecha, diasCarga, ritmos: ritmos(config, perfil) };
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
