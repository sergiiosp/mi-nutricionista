// Acciones de alto nivel sobre el estado (marcar comidas, saltar, cambiar platos, crear menús).
import { get } from 'svelte/store';
import { estado, actualizar, registroDePlan, borrarRegistro } from '../stores/estado.js';
import { avisar, celebrar } from '../stores/ui.js';
import { calcularObjetivos } from './nutricion.js';
import { generarPlan, sustituir, reescalarPlan, hoyISO } from './planificador.js';
import { estadoDia } from './dia.js';

export const objetivosActuales = () => calcularObjetivos(get(estado).perfil);

export function marcarHecha(fecha, comida) {
  const e = get(estado);
  const ya = (e.registros[fecha] || []).find((r) => r.tipo === 'plan' && r.franja === comida.franja);
  if (ya) {
    borrarRegistro(fecha, ya.id);
    return;
  }
  actualizar((x) => {
    delete x.saltadas[`${fecha}|${comida.franja}`];
    (x.registros[fecha] ||= []).push(registroDePlan(comida, fecha, comida.ingredientes));
  });
  // ¿Día completo? pequeña celebración
  const d = estadoDia(get(estado), objetivosActuales(), fecha);
  if (d.comidas.length && d.comidas.every((c) => c.situacion !== 'pendiente')) {
    celebrar();
    avisar('¡Día completado!', '🎉');
  }
}

export function alternarSaltada(fecha, franja) {
  actualizar((x) => {
    const k = `${fecha}|${franja}`;
    if (x.saltadas[k]) delete x.saltadas[k];
    else x.saltadas[k] = true;
  });
}

export function crearPlan(inicio = hoyISO()) {
  actualizar((x) => {
    x.plan = generarPlan(x.perfil, calcularObjetivos(x.perfil), { inicio, semilla: Math.floor(Math.random() * 1e9) });
    x.compra.marcados = {};
  });
}

export function sustituirComida(diaIdx, franja, comida) {
  actualizar((x) => sustituir(x.plan, diaIdx, franja, comida));
}

/** Tras cambiar perfil o peso: mismas recetas, nuevas cantidades y horario. */
export function reajustarPlan() {
  actualizar((x) => {
    if (x.plan) reescalarPlan(x.plan, x.perfil, calcularObjetivos(x.perfil));
  });
}
