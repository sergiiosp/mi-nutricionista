// Acciones de alto nivel sobre el estado (marcar comidas, saltar, cambiar platos, crear menús).
import { get } from 'svelte/store';
import { estado, actualizar, registroDePlan, borrarRegistro } from '../stores/estado.js';
import { avisar, celebrar } from '../stores/ui.js';
import { calcularObjetivos, alimentoPermitido } from './nutricion.js';
import { generarPlan, sustituir, reescalarPlan, completarPlan, alternativas, hoyISO, sumarDias } from './planificador.js';
import { estadoDia } from './dia.js';
import { crearRegistro } from './registro.js';
import { proveedorDe, planDe } from './hyrox/index.js';
import { copiaSesion } from './hyrox/sesiones.js';
import { gastoReal, ajusteGasto } from './gasto.js';

export const objetivosActuales = () => calcularObjetivos(get(estado).perfil);
export const viajesDe = (x) => x?.agenda?.viajes || [];

/** Borra un registro del día con opción de deshacer (vuelve a su sitio en la lista). */
export function quitarRegistro(fecha, id, texto) {
  const lista = get(estado).registros[fecha] || [];
  const pos = lista.findIndex((r) => r.id === id);
  if (pos === -1) return;
  const registro = lista[pos];
  borrarRegistro(fecha, id);
  avisar(texto || `Borrado: ${registro.nombre}`, '🗑️', () => {
    actualizar((x) => {
      const dia = (x.registros[fecha] ||= []);
      if (!dia.some((r) => r.id === id)) dia.splice(Math.min(pos, dia.length), 0, registro);
    });
  });
}

export function marcarHecha(fecha, comida) {
  const e = get(estado);
  const ya = (e.registros[fecha] || []).find((r) => r.tipo === 'plan' && r.franja === comida.franja);
  if (ya) {
    quitarRegistro(fecha, ya.id, 'Comida desmarcada');
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

/**
 * Te saltas una comida pero te tomas un batido de proteína (whey) en su lugar: se apunta en esa
 * comida y deja de contar como saltada, así no pierdes la proteína del día.
 */
export function tomarBatido(fecha, franja, gramos = 30) {
  const r = crearRegistro({ item: { tipo: 'alimento', id: 'proteina_whey' }, cantidad: gramos, fecha, franja });
  r.nombre = 'Batido de proteína';
  actualizar((x) => {
    delete x.saltadas[`${fecha}|${franja}`];
    (x.registros[fecha] ||= []).push(r);
  });
  avisar(`Batido apuntado · ${Math.round(r.macros.p)} g de proteína`, '🥤');
}

/** Una comida que sobraba hoy (cambio a descanso…): tomarla igualmente. */
export function mantenerComida(fecha, franja) {
  actualizar((x) => { x.mantener ||= {}; x.mantener[`${fecha}|${franja}`] = true; });
}

/** Marca o desmarca un suplemento como tomado ese día (creatina, vitamina…). */
export function alternarToma(fecha, id) {
  actualizar((x) => {
    const dia = ((x.tomas ||= {})[fecha] ||= {});
    if (dia[id]) delete dia[id];
    else dia[id] = true;
  });
}

export function alternarSaltada(fecha, franja) {
  actualizar((x) => {
    const k = `${fecha}|${franja}`;
    if (x.saltadas[k]) delete x.saltadas[k];
    else x.saltadas[k] = true;
  });
}

/**
 * Menú nuevo. Hoy y los días pasados se quedan como estaban (el plan del día no cambia por sorpresa);
 * solo se cambia una comida de hoy, aún sin hacer, si ahora lleva algo que ya no puedes o no quieres comer.
 */
export function crearPlan(inicio = hoyISO()) {
  actualizar((x) => {
    const hoy = hoyISO();
    const objetivos = calcularObjetivos(x.perfil);
    const prov = proveedorDe(x);
    const nuevo = generarPlan(x.perfil, objetivos, { inicio, semilla: Math.floor(Math.random() * 1e9), proveedor: prov, favoritas: x.favoritas || [], viajes: viajesDe(x) });
    const previos = x.plan?.dias || [];
    nuevo.dias = nuevo.dias.map((d) => (d.fecha <= hoy && previos.find((v) => v.fecha === d.fecha)) || d);
    const i = nuevo.dias.findIndex((d) => d.fecha === hoy);
    if (i >= 0 && previos.some((v) => v.fecha === hoy)) {
      const hechas = new Set((x.registros[hoy] || []).filter((r) => r.tipo === 'plan').map((r) => r.franja));
      for (const c of [...nuevo.dias[i].comidas]) {
        if (hechas.has(c.franja) || c.ingredientes.every((ing) => alimentoPermitido(ing.a, x.perfil))) continue;
        const alt = alternativas(nuevo, i, c.franja, x.perfil, objetivos, prov, x.favoritas || [], viajesDe(x))[0];
        if (alt) sustituir(nuevo, i, c.franja, alt.comida);
      }
    }
    // La compra marcada solo se reinicia al empezar semana (si el menú anterior ya terminó)
    if (!previos.length || previos[previos.length - 1].fecha < hoy) x.compra.marcados = {};
    x.plan = nuevo;
    x.compra.envases = {};
  });
}

/**
 * No vas a comprar un alimento: sale de la lista y las comidas que quedan por hacer y lo usan
 * se cambian por otras que cuadren igual tus macros. Devuelve cuántas comidas han cambiado.
 */
export function quitarDeCompra(id) {
  const e = get(estado);
  if (!e.plan) return 0;
  const hoy = hoyISO();
  const fuera = [...(e.perfil.noMeGusta || []), ...Object.keys(e.compra.quitados || {}), id];
  const perfil = { ...e.perfil, noMeGusta: fuera };
  const objetivos = calcularObjetivos(e.perfil);
  const prov = proveedorDe(e);
  const copia = structuredClone(e.plan);
  let n = 0;
  copia.dias.forEach((d, i) => {
    if (d.fecha < hoy) return;
    for (const c of [...d.comidas]) {
      if (!c.ingredientes.some((x) => x.a === id)) continue;
      if ((e.registros[d.fecha] || []).some((r) => r.tipo === 'plan' && r.franja === c.franja)) continue; // ya la comiste
      const alt = alternativas(copia, i, c.franja, perfil, objetivos, prov, e.favoritas || [], viajesDe(e))
        .find((x) => !x.comida.ingredientes.some((y) => fuera.includes(y.a)));
      if (alt) { sustituir(copia, i, c.franja, alt.comida); n++; }
    }
  });
  actualizar((x) => {
    x.plan = copia;
    x.compra.quitados = { ...(x.compra.quitados || {}), [id]: true };
  });
  return n;
}

/** Vuelve a poner en la lista algo que habías quitado (el menú no se toca). */
export function devolverACompra(id) {
  actualizar((x) => { if (x.compra.quitados) delete x.compra.quitados[id]; });
}

/** Cuántos envases vas a coger de verdad (null = los que pide el menú). */
export function cambiarEnvases(id, n) {
  actualizar((x) => {
    x.compra.envases ||= {};
    if (n == null) delete x.compra.envases[id];
    else x.compra.envases[id] = Math.max(0, n);
  });
}

/** Algo que quieres comprar aunque no esté en el menú. */
export function añadirACompra(id, delta = 1) {
  actualizar((x) => {
    x.compra.extra ||= {};
    x.compra.extra[id] = (x.compra.extra[id] || 0) + delta;
    if (x.compra.extra[id] <= 0) delete x.compra.extra[id];
  });
}
export function quitarExtra(id) {
  actualizar((x) => { if (x.compra.extra) delete x.compra.extra[id]; });
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

/**
 * Valoras un plato al comerlo. Me gusta: entra en tus favoritas y sale más a menudo. No me gusta:
 * deja de salir (perfil.recetasNo) y se cambia desde mañana por otra comida que cuadre igual.
 * Tocar otra vez la misma valoración la deshace.
 */
export function valorarPlato(id, v) {
  const e = get(estado);
  const quitar = v === 1 ? (e.favoritas || []).includes(id) : (e.perfil.recetasNo || []).includes(id);
  actualizar((x) => {
    x.favoritas = (x.favoritas || []).filter((f) => f !== id);
    x.perfil.recetasNo = (x.perfil.recetasNo || []).filter((f) => f !== id);
    if (!quitar) (v === 1 ? x.favoritas : x.perfil.recetasNo).push(id);
  });
  if (quitar) return;
  if (v === 1) { avisar('Apuntado: te lo pondré más a menudo', '👍'); return; }
  const n = cambiarProximas(id);
  avisar(n ? `No volverá a salir: cambiado en ${n} ${n === 1 ? 'comida' : 'comidas'} de esta semana` : 'No volverá a salir en tus menús', '👎');
}

/** Cambia por otra cada vez que ese plato sale en el menú a partir de mañana. Devuelve cuántas. */
function cambiarProximas(id) {
  const e = get(estado);
  if (!e.plan) return 0;
  const hoy = hoyISO();
  const objetivos = calcularObjetivos(e.perfil);
  const prov = proveedorDe(e);
  const copia = structuredClone(e.plan);
  let n = 0;
  copia.dias.forEach((d, i) => {
    if (d.fecha <= hoy) return;
    for (const c of [...d.comidas]) {
      if (c.recetaId !== id) continue;
      const alt = alternativas(copia, i, c.franja, e.perfil, objetivos, prov, e.favoritas || [], viajesDe(e)).find((x) => x.comida.recetaId !== id);
      if (alt) { sustituir(copia, i, c.franja, alt.comida); n++; }
    }
  });
  if (n) actualizar((x) => { x.plan = copia; });
  return n;
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

/**
 * Una vez por semana: calcula tu gasto real con lo que comes y la tendencia del peso, y ajusta las kcal.
 * Hoy se queda como estaba (las cantidades nuevas, desde mañana). Devuelve la estimación.
 */
export function revisarGasto(forzar = false) {
  const e = get(estado);
  if (!e.perfil) return null;
  const hoy = hoyISO();
  if (!forzar && e.gasto?.fecha && sumarDias(e.gasto.fecha, 7) > hoy) return e.gasto;
  const objetivos = calcularObjetivos({ ...e.perfil, ajusteGasto: 0 });
  const est = gastoReal(e, objetivos, hoy);
  const antes = e.perfil.ajusteGasto || 0;
  const nuevo = ajusteGasto(est, objetivos, antes);
  const registro = { fecha: hoy, ...est, formula: objetivos.get, ajuste: nuevo };
  actualizar((x) => {
    x.gasto = registro;
    x.gastoHistorial = [...(x.gastoHistorial || []).filter((g) => g.fecha !== hoy), registro].slice(-26);
    if (nuevo !== antes) {
      const dHoy = x.plan?.dias.find((d) => d.fecha === hoy);
      if (dHoy && !('ajusteGasto' in (dHoy.perfilFijo || {}))) dHoy.perfilFijo = { ...(dHoy.perfilFijo || {}), ajusteGasto: antes };
      x.perfil.ajusteGasto = nuevo;
    }
  });
  if (nuevo !== antes) {
    reajustarPlan();
    avisar(`Tu gasto real es ~${est.tdee} kcal: desde mañana ${nuevo > antes ? 'subo' : 'bajo'} ${Math.abs(nuevo - antes)} kcal`, '📈');
  }
  return registro;
}

/**
 * Día libre: ahorras `ahorro` kcal al día desde mañana hasta la víspera y esa comida (cena por defecto)
 * tiene todo ese margen. Hoy no cambia.
 */
export function guardarDiaLibre({ fecha, franja = 'cena', ahorro }) {
  const desde = sumarDias(hoyISO(), 1);
  actualizar((x) => { x.perfil.diaLibre = { fecha, franja, ahorro, desde }; });
  reajustarPlan(desde);
}
export function quitarDiaLibre() {
  actualizar((x) => { delete x.perfil.diaLibre; });
  reajustarPlan(sumarDias(hoyISO(), 1));
}

/**
 * Cómo llegas hoy al entreno (sueño, agujetas, energía: 0-2 cada uno). Con 4 o más, la sesión va tal cual;
 * con 2-3, más suave; con 0-1, de mantenimiento. Devuelve el nivel.
 */
export function guardarForma(fecha, datos) {
  const total = (datos.sueno ?? 1) + (datos.agujetas ?? 1) + (datos.energia ?? 1);
  const nivel = total >= 4 ? 'bien' : total >= 2 ? 'suave' : 'muy-suave';
  actualizar((x) => {
    if (!x.hyrox) return;
    x.hyrox.forma = { ...(x.hyrox.forma || {}), [fecha]: { ...datos, nivel } };
  });
  return nivel;
}
export function borrarForma(fecha) {
  actualizar((x) => { if (x.hyrox?.forma) delete x.hyrox.forma[fecha]; });
}

/** Rellena las comidas que le falten al menú actual (sin tocar las demás). */
export function completarMenu() {
  const e = get(estado);
  if (!e.plan || !e.perfil) return 0;
  const copia = structuredClone(e.plan);
  const n = completarPlan(copia, e.perfil, calcularObjetivos(e.perfil), proveedorDe(e), e.favoritas || [], viajesDe(e));
  if (n) actualizar((x) => { x.plan = copia; });
  return n;
}

/** Tras cambiar perfil o peso: mismas recetas, nuevas cantidades y horario (desde hoy o la fecha que digas). */
export function reajustarPlan(desde = hoyISO()) {
  actualizar((x) => {
    if (x.plan) reescalarPlan(x.plan, x.perfil, calcularObjetivos(x.perfil), proveedorDe(x), desde);
  });
}

// ── Agenda: carreras populares y viajes ───────────────────────────────────

/**
 * Rehace el menú de los días que cambian de modo (empiezan o dejan de ser de viaje), desde mañana
 * (o desde hoy si aún no has comido nada); el resto del menú se queda igual y se recalculan cantidades.
 */
function rehacerDiasViaje() {
  const e = get(estado);
  if (!e.plan) return;
  const hoy = hoyISO();
  const viajes = viajesDe(e);
  const objetivos = calcularObjetivos(e.perfil);
  const prov = proveedorDe(e);
  const copia = structuredClone(e.plan);
  let cambios = 0;
  copia.dias.forEach((d, i) => {
    if (d.fecha < hoy || (d.fecha === hoy && (e.registros[hoy] || []).length)) return;
    const debe = viajes.some((v) => d.fecha >= v.desde && d.fecha <= v.hasta);
    if (debe === !!d.viaje) return;
    const nuevo = generarPlan(e.perfil, objetivos, { inicio: d.fecha, dias: 1, semilla: Math.floor(Math.random() * 1e9), proveedor: prov, favoritas: e.favoritas || [], viajes }).dias[0];
    copia.dias[i] = nuevo;
    cambios++;
  });
  if (cambios) actualizar((x) => { x.plan = copia; });
}

export function guardarEvento(ev) {
  actualizar((x) => {
    x.agenda ||= { eventos: [], viajes: [] };
    x.agenda.eventos = [...x.agenda.eventos.filter((y) => y.id !== ev.id), ev].sort((a, b) => a.fecha.localeCompare(b.fecha));
  });
  reajustarPlan();
}
export function guardarViaje(v) {
  actualizar((x) => {
    x.agenda ||= { eventos: [], viajes: [] };
    x.agenda.viajes = [...x.agenda.viajes.filter((y) => y.id !== v.id), v].sort((a, b) => a.desde.localeCompare(b.desde));
  });
  rehacerDiasViaje();
  reajustarPlan();
}
export function borrarDeAgenda(id) {
  actualizar((x) => {
    if (!x.agenda) return;
    x.agenda.eventos = x.agenda.eventos.filter((y) => y.id !== id);
    x.agenda.viajes = x.agenda.viajes.filter((y) => y.id !== id);
  });
  rehacerDiasViaje();
  reajustarPlan();
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

/** Guarda una copia de cada sesión ya registrada que aún no la tenga (datos de versiones anteriores). */
export function congelarSesiones() {
  const e = get(estado);
  const regs = e.hyrox?.registros || {};
  const faltan = Object.keys(regs).filter((id) => regs[id] && !regs[id].sesion);
  const plan = faltan.length ? planDe(e) : null;
  if (!plan) return;
  actualizar((x) => {
    for (const id of faltan) {
      const s = plan.sesiones.find((y) => y.id === id && !y.historica);
      if (!s) continue;
      x.hyrox.registros[id].sesion = copiaSesion(s);
      x.hyrox.registros[id].fecha ||= s.fecha;
    }
  });
}

export function registrarSesion(id, datos) {
  actualizar((x) => { x.hyrox.registros[id] = { ...datos, fechaRegistro: hoyISO() }; });
  reajustarPlan();
}

export function borrarRegistroSesion(id) {
  const anterior = get(estado).hyrox?.registros?.[id];
  actualizar((x) => { delete x.hyrox.registros[id]; });
  reajustarPlan();
  if (anterior) {
    avisar('Registro de la sesión borrado', '🗑️', () => {
      actualizar((x) => { if (x.hyrox) x.hyrox.registros[id] = anterior; });
      reajustarPlan();
    });
  }
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
