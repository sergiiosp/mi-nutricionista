// Acceso al plan HYROX desde el estado de la app (con memoria para no recalcularlo en cada render).
import { generarPlanHyrox, sesionesNutricion } from './plan.js';
import { hoyISO } from '../planificador.js';

let ultimaClave = null;
let ultimoPlan = null;

/** Plan HYROX del estado actual (o null si no está configurado). */
export function planDe(e) {
  if (!e?.hyrox?.config || !e.perfil) return null;
  const hoy = hoyISO();
  const clave = JSON.stringify([e.hyrox, e.agenda, e.perfil.peso, e.perfil.sexo, e.perfil.horaEntreno, hoy]);
  if (clave !== ultimaClave) {
    ultimoPlan = generarPlanHyrox(e.hyrox, e.perfil, hoy, e.agenda);
    ultimaClave = clave;
  }
  return ultimoPlan;
}

/** Sesión genérica para un día que decides entrenar fuera del plan (MET 7, tu duración habitual). */
function sesionExtra(perfil) {
  const duracion = perfil?.duracionEntreno || 60;
  return { tipo: 'extra', duracion, hora: perfil?.horaEntreno || '19:00', kcal: Math.round(6 * (perfil?.peso || 75) * (duracion / 60)), carbos: 3 };
}

/**
 * Proveedor de sesiones por fecha para la nutrición (null si no hay nada que cambiar ese día).
 * Respeta lo que marques en Hoy: «hoy no entreno» (día de descanso) o «hoy sí entreno».
 */
export function proveedorDe(e) {
  const plan = planDe(e);
  const cambios = e?.entrenoDia || {};
  if (!plan && !Object.keys(cambios).length) return null;
  const limite = plan ? plan.carrera || plan.fin : null;
  const delPlan = (fecha) => (plan && fecha >= plan.inicio && fecha <= limite ? sesionesNutricion(plan, fecha) : null);
  return (fecha) => {
    const cambio = cambios[fecha];
    const sesiones = delPlan(fecha);
    if (cambio === 'no') return (sesiones || []).filter((s) => s.carga); // descanso (la carga de hidratos pre-carrera se mantiene)
    if (cambio === 'si' && !(sesiones || []).some((s) => !s.carga && s.tipo !== 'recuperacion')) return [...(sesiones || []), sesionExtra(e.perfil)];
    return sesiones;
  };
}

/** Sesiones (visibles) de un día. */
export function sesionesDia(e, fecha) {
  const plan = planDe(e);
  return plan ? plan.porFecha[fecha] || [] : [];
}
