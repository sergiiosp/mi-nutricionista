// Acceso al plan HYROX desde el estado de la app (con memoria para no recalcularlo en cada render).
import { generarPlanHyrox, sesionesNutricion } from './plan.js';
import { hoyISO } from '../planificador.js';

let ultimaClave = null;
let ultimoPlan = null;

/** Plan HYROX del estado actual (o null si no está configurado). */
export function planDe(e) {
  if (!e?.hyrox?.config || !e.perfil) return null;
  const hoy = hoyISO();
  const clave = JSON.stringify([e.hyrox, e.perfil.peso, e.perfil.sexo, e.perfil.horaEntreno, hoy]);
  if (clave !== ultimaClave) {
    ultimoPlan = generarPlanHyrox(e.hyrox, e.perfil, hoy);
    ultimaClave = clave;
  }
  return ultimoPlan;
}

/** Proveedor de sesiones por fecha para la nutrición (null si la fecha queda fuera del plan). */
export function proveedorDe(e) {
  const plan = planDe(e);
  if (!plan) return null;
  const limite = plan.carrera || plan.fin;
  return (fecha) => (fecha >= plan.inicio && fecha <= limite ? sesionesNutricion(plan, fecha) : null);
}

/** Sesiones (visibles) de un día. */
export function sesionesDia(e, fecha) {
  const plan = planDe(e);
  return plan ? plan.porFecha[fecha] || [] : [];
}
