// Actividades de Strava (y del Apple Watch a través de Strava) → sesiones del plan y calorías extra.
import { TIPOS } from './sesiones.js';

// sport_type de Strava → familia
const FAMILIAS = {
  Run: 'carrera', TrailRun: 'carrera', VirtualRun: 'carrera',
  WeightTraining: 'gimnasio', Workout: 'gimnasio', Crossfit: 'gimnasio', HighIntensityIntervalTraining: 'gimnasio',
  Rowing: 'gimnasio', VirtualRow: 'gimnasio', Elliptical: 'gimnasio', StairStepper: 'gimnasio',
  Yoga: 'suave', Pilates: 'suave', Walk: 'suave', Hike: 'suave',
  Ride: 'bici', VirtualRide: 'bici', MountainBikeRide: 'bici', GravelRide: 'bici', EBikeRide: 'suave',
  Swim: 'nado',
};
export const familia = (tipo) => FAMILIAS[tipo] || 'otro';

// Qué familias valen para cada clase de sesión (puntos de afinidad)
const AFINIDAD = {
  carrera: { carrera: 3, hyrox: 2, suave: 1 },
  gimnasio: { fuerza: 3, hyrox: 3, suave: 1 },
  suave: { suave: 3 },
  bici: { suave: 2 },
  nado: { suave: 2 },
  otro: { suave: 1 },
};

export const EMOJI_FAMILIA = { carrera: '🏃', gimnasio: '🏋️', suave: '🧘', bici: '🚴', nado: '🏊', otro: '⌚' };
const MET = { gimnasio: 6, suave: 3, bici: 7, nado: 7, otro: 5 };

/** Calorías gastadas por encima del reposo. */
export function kcalActividad(a, peso = 75) {
  if (a.kj) return Math.round(a.kj * 0.95); // bici con potencia: 1 kJ mecánico ≈ 1 kcal metabólica
  const horas = (a.duracion || 0) / 3600;
  const f = familia(a.tipo);
  const met = f === 'carrera' && a.distancia ? Math.max(6, (a.distancia / 1000 / Math.max(horas, 0.01)) * 1.0) : MET[f] || 5;
  return Math.round((met - 1) * peso * horas);
}

/**
 * Empareja actividades nuevas con sesiones del plan HYROX.
 * @returns { asignadas: { idActividad: idSesion|null }, registros: { idSesion: registro } }
 */
export function emparejar(actividades, plan, registros = {}, previas = {}) {
  const asignadas = {};
  const porSesion = {};
  // Actividades ya importadas antes que siguen asignadas
  for (const a of Object.values(previas)) if (a.sesion) (porSesion[a.sesion] ||= []).push(a);

  for (const a of [...actividades].sort((x, y) => x.inicio.localeCompare(y.inicio))) {
    if (previas[a.id]) continue;
    const fecha = a.inicio.slice(0, 10);
    const f = familia(a.tipo);
    let mejor = null;
    for (const s of plan?.porFecha[fecha] || []) {
      const r = registros[s.id];
      if (r && r.fuente !== 'strava') continue; // ya la registraste tú a mano
      const clase = TIPOS[s.tipo]?.clase;
      const afinidad = AFINIDAD[f]?.[clase] || 0;
      if (!afinidad) continue;
      // Una sesión de carrera o fuerza admite una actividad; las de HYROX, varias (carrera + estaciones)
      if (porSesion[s.id]?.length && clase !== 'hyrox') continue;
      const puntos = afinidad * 10 - Math.abs((a.duracion || 0) / 60 - s.duracion) / 10;
      if (!mejor || puntos > mejor.puntos) mejor = { s, puntos };
    }
    asignadas[a.id] = mejor ? mejor.s.id : null;
    if (mejor) (porSesion[mejor.s.id] ||= []).push(a);
  }

  const nuevosRegistros = {};
  for (const [id, lista] of Object.entries(porSesion)) {
    if (!lista.some((a) => asignadas[a.id])) continue; // nada nuevo en esta sesión
    const s = plan.sesiones.find((x) => x.id === id);
    if (!s) continue;
    const minutos = Math.round(lista.reduce((t, a) => t + (a.duracion || 0), 0) / 60);
    const km = lista.filter((a) => familia(a.tipo) === 'carrera').reduce((t, a) => t + (a.distancia || 0), 0) / 1000;
    const conFc = lista.filter((a) => a.fc);
    const reg = {
      ...(registros[id] || {}),
      estado: minutos >= s.duracion * 0.5 ? 'completa' : 'parcial',
      duracion: minutos,
      fuente: 'strava',
      strava: lista.map((a) => a.id),
    };
    if (['rodaje', 'largo'].includes(s.tipo) && km > 0) reg.distancia = Math.round(km * 10) / 10;
    if (s.tipo === 'carrera') reg.tiempo = lista.reduce((t, a) => t + (a.total || a.duracion || 0), 0);
    if (conFc.length) reg.fc = Math.round(conFc.reduce((t, a) => t + a.fc, 0) / conFc.length);
    nuevosRegistros[id] = reg;
  }
  return { asignadas, registros: nuevosRegistros };
}

/**
 * Entrenos de Strava de un día que no estaban en el plan: suman calorías a ese día.
 * Si no usas el plan HYROX, la primera actividad de un día de entreno se toma como el entreno previsto.
 */
export function extrasDia(e, fecha, diaEntreno = false) {
  const lista = Object.values(e.strava || {}).filter((a) => !a.sesion && !a.ignorada && a.inicio?.startsWith(fecha))
    .sort((a, b) => a.inicio.localeCompare(b.inicio));
  const extras = !e.hyrox?.config && diaEntreno ? lista.slice(1) : lista;
  const peso = e.perfil?.peso || 75;
  const kcal = extras.reduce((t, a) => t + kcalActividad(a, peso), 0);
  return { actividades: lista, extras, kcal };
}
