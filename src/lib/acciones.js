// Acciones de alto nivel sobre el estado (marcar comidas, saltar, cambiar platos, crear menús).
import { get } from 'svelte/store';
import { estado, actualizar, registroDePlan, borrarRegistro } from '../stores/estado.js';
import { avisar, celebrar } from '../stores/ui.js';
import { calcularObjetivos } from './nutricion.js';
import { generarPlan, sustituir, reescalarPlan, completarPlan, hoyISO, sumarDias } from './planificador.js';
import { estadoDia } from './dia.js';
import { proveedorDe } from './hyrox/index.js';

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
    x.plan = generarPlan(x.perfil, calcularObjetivos(x.perfil), { inicio, semilla: Math.floor(Math.random() * 1e9), proveedor: proveedorDe(x), favoritas: x.favoritas || [] });
    x.compra.marcados = {};
  });
}

/** Guarda o quita una comida (receta o montada) de tus favoritas. Devuelve si queda guardada. */
export function alternarFavorita(id) {
  let guardada = false;
  actualizar((x) => {
    const lista = x.favoritas || [];
    guardada = !lista.includes(id);
    x.favoritas = guardada ? [...lista, id] : lista.filter((f) => f !== id);
  });
  return guardada;
}

export function sustituirComida(diaIdx, franja, comida) {
  actualizar((x) => sustituir(x.plan, diaIdx, franja, comida));
}

/** Cambia si un día entrenas o descansas (null = lo que diga el plan) y recalcula la comida. */
export function marcarEntrenoDia(fecha, valor) {
  actualizar((x) => {
    x.entrenoDia ||= {};
    if (valor) x.entrenoDia[fecha] = valor;
    else delete x.entrenoDia[fecha];
    // Se olvidan los cambios de días ya pasados de hace más de dos semanas
    const limite = sumarDias(hoyISO(), -14);
    for (const f of Object.keys(x.entrenoDia)) if (f < limite) delete x.entrenoDia[f];
  });
  reajustarPlan();
}

/** Rellena las comidas que le falten al menú actual (sin tocar las demás). */
export function completarMenu() {
  const e = get(estado);
  if (!e.plan || !e.perfil) return 0;
  const copia = structuredClone(e.plan);
  const n = completarPlan(copia, e.perfil, calcularObjetivos(e.perfil), proveedorDe(e), e.favoritas || []);
  if (n) actualizar((x) => { x.plan = copia; });
  return n;
}

/** Tras cambiar perfil o peso: mismas recetas, nuevas cantidades y horario. */
export function reajustarPlan() {
  actualizar((x) => {
    if (x.plan) reescalarPlan(x.plan, x.perfil, calcularObjetivos(x.perfil), proveedorDe(x));
  });
}

// ── HYROX ─────────────────────────────────────────────────────────────────

/** Guarda la configuración HYROX, sincroniza el perfil de entreno y adapta el menú. */
export function guardarHyrox(config) {
  actualizar((x) => {
    const previo = x.hyrox || {};
    x.hyrox = { registros: {}, movidas: {}, ...previo, config: { ...config, inicio: previo.config?.inicio || config.inicio || hoyISO() } };
    const deportes = new Set([...(x.perfil.deportes || []), 'carrera', 'hiit']);
    x.perfil = { ...x.perfil, entrena: true, deportes: [...deportes], diasEntreno: config.dias, horaEntreno: config.hora, duracionEntreno: 60, intensidad: 'moderada', compite: true, fechaCompeticion: config.fechaCarrera || '' };
  });
  reajustarPlan();
}

export function registrarSesion(id, datos) {
  actualizar((x) => { x.hyrox.registros[id] = { ...datos, fechaRegistro: hoyISO() }; });
  reajustarPlan();
}

export function borrarRegistroSesion(id) {
  actualizar((x) => { delete x.hyrox.registros[id]; });
  reajustarPlan();
}

/** Marca (o desmarca) que una sesión la harás sin gimnasio: peso corporal, parque y cuestas. */
export function alternarSinGym(id) {
  let ahora = false;
  actualizar((x) => {
    x.hyrox.sinGym ||= {};
    ahora = !x.hyrox.sinGym[id];
    if (ahora) x.hyrox.sinGym[id] = true;
    else delete x.hyrox.sinGym[id];
  });
  reajustarPlan();
  return ahora;
}

export function moverSesion(id, fecha, fechaOriginal) {
  actualizar((x) => {
    if (fecha === fechaOriginal) delete x.hyrox.movidas[id];
    else x.hyrox.movidas[id] = fecha;
  });
  reajustarPlan();
}

export function reiniciarHyrox() {
  actualizar((x) => { x.hyrox = null; });
  reajustarPlan();
}
