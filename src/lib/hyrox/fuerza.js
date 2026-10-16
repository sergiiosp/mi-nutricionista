// Progresión de fuerza a partir de los kilos y repeticiones que apuntas en cada serie.
import { EJERCICIOS, GRUPOS } from '../../data/hyrox.js';
import { sumarDias } from '../planificador.js';

/** 1RM estimado (Epley): sirve para comparar series con distintas repeticiones. */
export function e1rm(kg, reps) {
  if (!(kg > 0) || !(reps > 0)) return 0;
  return kg * (1 + Math.min(reps, 15) / 30);
}

/** Fecha de un registro de sesión (la guardada al registrar o la del plan). */
function fechaDe(id, r, plan) {
  return r.fecha || plan?.sesiones.find((s) => s.id === id)?.fecha || r.fechaRegistro;
}

/**
 * Historial por ejercicio: { ejercicio: [{ fecha, sesion, series, mejor, kg, reps, volumen }] } en orden de fecha.
 */
export function historialFuerza(registros = {}, plan = null) {
  const hist = {};
  for (const [id, r] of Object.entries(registros)) {
    if (!r?.series || r.estado === 'no') continue;
    const fecha = fechaDe(id, r, plan);
    for (const [ej, series] of Object.entries(r.series)) {
      const validas = (series || []).filter((x) => x.kg > 0 || x.reps > 0);
      if (!validas.length) continue;
      const mejorSerie = validas.reduce((a, x) => (e1rm(x.kg, x.reps) > e1rm(a.kg, a.reps) ? x : a), validas[0]);
      (hist[ej] ||= []).push({
        fecha,
        sesion: id,
        series: validas,
        mejor: Math.round(e1rm(mejorSerie.kg, mejorSerie.reps) * 10) / 10,
        kg: Math.max(...validas.map((x) => x.kg || 0)),
        reps: mejorSerie.reps,
        volumen: validas.reduce((a, x) => a + (x.kg || 0) * (x.reps || 0), 0),
      });
    }
  }
  for (const l of Object.values(hist)) l.sort((a, b) => (a.fecha < b.fecha ? -1 : 1));
  return hist;
}

/** Series de la última vez que hiciste un ejercicio (sin contar la sesión que estás registrando). */
export function ultimaVez(registros, ej, excluir, plan = null) {
  const l = (historialFuerza(registros, plan)[ej] || []).filter((x) => x.sesion !== excluir);
  return l.at(-1) || null;
}

/**
 * Progresión por grupo muscular en las últimas semanas.
 * Devuelve [{ grupo, nombre, cambio (%), series (semana), ejercicios: [{ id, nombre, cambio, ultimo }] }] y el grupo más flojo.
 */
export function progresoGrupos(hist, hoy, semanas = 8) {
  const desde = sumarDias(hoy, -7 * semanas);
  const hace14 = sumarDias(hoy, -14);
  const grupos = {};
  for (const [ej, l] of Object.entries(hist)) {
    const info = EJERCICIOS[ej];
    if (!info?.grupo) continue;
    const ventana = l.filter((x) => x.fecha >= desde);
    if (!ventana.length) continue;
    const g = (grupos[info.grupo] ||= { grupo: info.grupo, nombre: GRUPOS[info.grupo], ejercicios: [], series: 0 });
    const primero = ventana[0];
    const ultimo = ventana.at(-1);
    const cambio = ventana.length > 1 && primero.mejor > 0 ? ((ultimo.mejor - primero.mejor) / primero.mejor) * 100 : null;
    g.ejercicios.push({ id: ej, nombre: info.nombre, cambio, ultimo, veces: ventana.length });
    g.series += l.filter((x) => x.fecha >= hace14).reduce((a, x) => a + x.series.length, 0) / 2;
  }
  const lista = Object.values(grupos).map((g) => {
    const con = g.ejercicios.filter((x) => x.cambio !== null);
    return { ...g, series: Math.round(g.series), cambio: con.length ? con.reduce((a, x) => a + x.cambio, 0) / con.length : null };
  });
  lista.sort((a, b) => Object.keys(GRUPOS).indexOf(a.grupo) - Object.keys(GRUPOS).indexOf(b.grupo));
  // El más flojo: el que menos progresa (solo si hay al menos dos grupos con datos para comparar)
  const comparables = lista.filter((g) => g.cambio !== null && g.grupo !== 'core');
  const flojo = comparables.length >= 2 ? comparables.reduce((a, g) => (g.cambio < a.cambio ? g : a)) : null;
  return { grupos: lista, flojo: flojo && flojo.cambio < 2.5 ? flojo : null };
}
