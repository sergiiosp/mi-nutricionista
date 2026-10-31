// Acciones de alto nivel sobre el estado (marcar comidas, saltar, cambiar platos, crear menús).
import { get } from 'svelte/store';
import { estado, actualizar, registroDePlan, borrarRegistro, anotarDiario } from '../stores/estado.js';
import { avisar, celebrar } from '../stores/ui.js';
import { calcularObjetivos, alimentoPermitido, alimento } from './nutricion.js';
const alimentoBruto = (id) => { try { return alimento(id).rendimiento || 1; } catch { return 1; } };
import { generarPlan, sustituir, reescalarPlan, completarPlan, alternativas, hoyISO, sumarDias } from './planificador.js';
import { estadoDia } from './dia.js';
import { crearRegistro } from './registro.js';
import { proveedorDe, planDe } from './hyrox/index.js';
import { copiaSesion } from './hyrox/sesiones.js';
import { gastoReal, ajusteGasto } from './gasto.js';
import { marcasDeTests, testPorId } from './hyrox/tests.js';
import { mmss } from './hyrox/ritmos.js';
import { grasaReferencia } from './cuerpo.js';
import { num } from './formato.js';
import { resumenRevision } from './revision.js';

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
  if (!comida.libre) consumirDespensa(comida.ingredientes);
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
    const previos = x.plan?.dias || [];
    // Los platos de los últimos 7 días, para que la semana nueva no los repita
    const recientes = previos.filter((d) => d.fecha < inicio).slice(-7).flatMap((d) => d.comidas.map((c) => c.recetaId));
    const nuevo = generarPlan(x.perfil, objetivos, { inicio, semilla: Math.floor(Math.random() * 1e9), proveedor: prov, favoritas: x.favoritas || [], viajes: viajesDe(x), recientes });
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
    anotarDiario('gasto', `${nuevo > antes ? 'Subo' : 'Bajo'} ${Math.abs(nuevo - antes)} kcal al día`, `Con tus comidas y tu peso de las últimas semanas, gastas unas ${est.tdee} kcal (la fórmula decía ${objetivos.get}).`);
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
  anotarDiario('libre', `Día libre el ${fecha.slice(8)}/${fecha.slice(5, 7)}`, `Ahorras ${ahorro} kcal al día hasta la víspera para tener margen en esa ${franja}.`);
}
export function quitarDiaLibre() {
  actualizar((x) => { delete x.perfil.diaLibre; });
  reajustarPlan(sumarDias(hoyISO(), 1));
  anotarDiario('libre', 'Día libre quitado', 'El menú vuelve a lo normal desde mañana.');
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
  if (nivel !== 'bien') anotarDiario('forma', nivel === 'suave' ? 'Sesión de hoy más suave' : 'Sesión de hoy de mantenimiento', `Me dijiste que llegabas ${nivel === 'suave' ? 'algo tocado' : 'fundido'} (sueño, agujetas y energía): menos volumen y algo menos de peso.`);
  return nivel;
}
export function borrarForma(fecha) {
  actualizar((x) => { if (x.hyrox?.forma) delete x.hyrox.forma[fecha]; });
}

// ── Despensa: lo cogido en la compra entra; lo que comes del menú sale ─────────

/** Suma (o resta) gramos de un alimento en tu despensa. */
export function ajustarDespensa(id, gramos) {
  actualizar((x) => {
    x.despensa ||= {};
    const g = Math.round((x.despensa[id]?.g || 0) + gramos);
    if (g <= 0) delete x.despensa[id];
    else x.despensa[id] = { g, fecha: gramos > 0 ? hoyISO() : x.despensa[id]?.fecha || hoyISO() };
  });
}
/** Lo que te comes sale de la despensa (en crudo, tal como se compra). */
export function consumirDespensa(ingredientes) {
  actualizar((x) => {
    for (const i of ingredientes || []) {
      const d = x.despensa?.[i.a];
      if (!d) continue;
      const g = d.g - i.g / (alimentoBruto(i.a) || 1);
      if (g <= 5) delete x.despensa[i.a];
      else d.g = Math.round(g);
    }
  });
}
export function quitarDeDespensa(id) {
  actualizar((x) => { if (x.despensa) delete x.despensa[id]; });
}

/**
 * Apunta un test (5 km, SkiErg, remo o una estación). Si es de los que marcan los ritmos, tus ritmos de
 * entreno y el predictor se actualizan con él.
 */
export function guardarTest(fecha, id, seg) {
  const antes = get(estado).tests?.filter((t) => t.id === id).sort((a, b) => a.fecha.localeCompare(b.fecha)).at(-1);
  actualizar((x) => {
    x.tests = [...(x.tests || []).filter((t) => !(t.fecha === fecha && t.id === id)), { fecha, id, seg }];
    if (x.hyrox?.config) x.hyrox.config = { ...x.hyrox.config, marcas: { ...(x.hyrox.config.marcas || {}), ...marcasDeTests(x.tests) } };
  });
  const dif = antes ? seg - antes.seg : null;
  anotarDiario(`test-${id}`, `Test de ${testPorId[id]?.corto || id}: ${mmss(seg)}`, dif == null ? 'Primera marca: a partir de aquí verás si mejoras.' : `${dif < 0 ? 'Mejoras' : 'Empeoras'} ${mmss(Math.abs(dif))} respecto al ${antes.fecha.slice(8)}/${antes.fecha.slice(5, 7)}.${['5k', 'ski1000', 'row1000'].includes(id) ? ' Tus ritmos de entreno se ajustan a esta marca.' : ''}`);
  reajustarPlan();
  return dif;
}
export function borrarTest(fecha, id) {
  actualizar((x) => {
    x.tests = (x.tests || []).filter((t) => !(t.fecha === fecha && t.id === id));
    if (x.hyrox?.config) x.hyrox.config = { ...x.hyrox.config, marcas: { ...(x.hyrox.config.marcas || {}), ...marcasDeTests(x.tests) } };
  });
}

/**
 * Apunta un peso (y lo que quieras de la báscula). Hoy se queda con el peso con el que se planificó: si cambian
 * tus kcal, las cantidades nuevas van desde mañana y queda en el diario del coach. Devuelve el texto del aviso.
 */
export function guardarPeso(fecha, p, extra = {}) {
  const hoy = hoyISO();
  const antes = get(estado).perfil;
  const kcalAntes = calcularObjetivos(antes).kcal;
  actualizar((e) => {
    const dHoy = e.plan?.dias.find((d) => d.fecha === hoy);
    if (dHoy && !('peso' in (dHoy.perfilFijo || {}))) dHoy.perfilFijo = { ...(dHoy.perfilFijo || {}), peso: antes.peso, grasa: antes.grasa ?? null };
    e.pesos = e.pesos.filter((x) => x.fecha !== fecha).concat([{ fecha, peso: p, ...extra }]);
    e.perfil.peso = [...e.pesos].sort((a, b) => a.fecha.localeCompare(b.fecha)).at(-1).peso;
    const g = grasaReferencia(e.pesos, hoy);
    if (g) e.perfil.grasa = g;
  });
  revisarGasto();
  const ahora = get(estado).perfil;
  const kcalAhora = calcularObjetivos(ahora).kcal;
  const salto = Math.abs(ahora.peso - antes.peso);
  if (Math.abs(kcalAhora - kcalAntes) < 30 && salto < 2) return 'Peso guardado';
  reajustarPlan();
  anotarDiario('peso', `Tu plan pasa de ${kcalAntes} a ${kcalAhora} kcal`, salto >= 2 ? `Tu peso real (${num(ahora.peso, 1)} kg) era ${num(salto, 1)} kg distinto del que tenía.` : `Con tu peso${extra.grasa ? ' y tu grasa' : ''} de hoy (${num(p, 1)} kg${extra.grasa ? `, ${num(extra.grasa, 1)} %` : ''}).`);
  return salto >= 2 ? `Tu peso real difiere ${num(salto, 1)} kg del que tenía: cantidades nuevas desde mañana` : `Guardado: tu plan pasa a ${kcalAhora} kcal desde mañana`;
}

/** Revisión del mes: empezar (o seguir la que está a medias), apuntar medidas y terminar. */
export function empezarRevision() {
  actualizar((x) => { x.revision ||= { inicio: hoyISO() }; x.revisionPospuesta = null; });
}
export function guardarMedidas(fecha, datos) {
  actualizar((x) => { x.medidas = (x.medidas || []).filter((m) => m.fecha !== fecha).concat([{ fecha, ...datos }]); });
}
export function posponerRevision() {
  actualizar((x) => { x.revisionPospuesta = hoyISO(); });
}
export function terminarRevision() {
  const e = get(estado);
  const inicio = e.revision?.inicio || hoyISO();
  const r = resumenRevision(e, inicio);
  const cambios = r.filas.filter((f) => f.dif != null && f.dif !== 0).map((f) => `${f.nombre.toLowerCase()} ${f.dif > 0 ? '+' : '−'}${f.unidad === 'seg' ? mmss(Math.abs(f.dif)) : `${num(Math.abs(f.dif), f.dec)} ${f.unidad}`}`);
  actualizar((x) => {
    x.revisiones = [...(x.revisiones || []).filter((v) => v.fecha !== hoyISO()), { fecha: hoyISO(), inicio }];
    x.revision = null;
  });
  anotarDiario('revision', 'Revisión del mes hecha', cambios.length ? `${r.titular} Desde la anterior: ${cambios.join(', ')}.` : r.titular);
  return r;
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
  anotarDiario(`ev-${ev.id}`, `${ev.nombre || 'Carrera'} el ${ev.fecha.slice(8)}/${ev.fecha.slice(5, 7)}`, Number(ev.km) >= 15 ? 'Semana de puesta a punto antes, carga de hidratos la víspera y recuperación el día después.' : 'La sesión de ese día se sustituye por la carrera.');
}
export function guardarViaje(v) {
  actualizar((x) => {
    x.agenda ||= { eventos: [], viajes: [] };
    x.agenda.viajes = [...x.agenda.viajes.filter((y) => y.id !== v.id), v].sort((a, b) => a.desde.localeCompare(b.desde));
  });
  rehacerDiasViaje();
  reajustarPlan();
  const entreno = { sinGym: 'entrenos sin máquinas y caminar', gym: 'tu entreno de siempre' }[v.entreno] || 'caminar en vez de entrenar';
  anotarDiario(`vi-${v.id}`, `Viaje del ${v.desde.slice(8)} al ${v.hasta.slice(8)}/${v.hasta.slice(5, 7)}`, `Esos días: ${entreno} y menú para comer fuera o del súper.`);
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

/**
 * Marca (o desmarca) que una sesión la harás sin gimnasio: peso corporal, parque y cuestas. Se guarda también
 * el «con gimnasio», para que en un viaje sin máquinas puedas decir que ese día sí tienes uno.
 */
export function alternarSinGym(id, actual = false) {
  const ahora = !actual;
  actualizar((x) => {
    x.hyrox.sinGym ||= {};
    x.hyrox.sinGym[id] = ahora;
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
