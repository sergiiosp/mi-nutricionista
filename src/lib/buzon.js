// Buzón: notas desde la app (un fallo, una idea, algo de la dieta o de los entrenos que no cuadra) que
// revisamos juntos en las sesiones de mejora. Se guardan en tu servidor (Cloudflare, gratis) con el contexto
// de dónde estabas, y vuelven aquí con su estado y la respuesta. Sin conexión, esperan en el móvil.
import { get } from 'svelte/store';
import { get as leerIdb, set as guardarIdb } from 'idb-keyval';
import { estado, actualizar } from '../stores/estado.js';
import { SERVIDOR } from './nube/config.js';
import { planDe } from './hyrox/index.js';
import { semanaDe } from './hyrox/plan.js';
import { estadoDia } from './dia.js';
import { calcularObjetivos, macrosComida } from './nutricion.js';
import { hoyISO, recetaPorId } from './planificador.js';
import { diaSemana, fechaCorta } from './formato.js';

const COLA = 'buzon:cola'; // notas aún sin enviar, con su contexto y su captura
const FINALES = ['hecha', 'descartada'];

/** Clave del buzón de este móvil (se crea la primera vez; el servidor se liga a ella). */
function clave() {
  let k = get(estado).buzon?.clave;
  if (!k) {
    const b = crypto.getRandomValues(new Uint8Array(32));
    k = btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    actualizar((x) => { x.buzon = { notas: [], ...(x.buzon || {}), clave: k }; });
  }
  return k;
}
const cabeceras = (json = false) => ({ Authorization: `Bearer ${clave()}`, ...(json ? { 'Content-Type': 'application/json' } : {}) });

function cambiarNota(id, cambios) {
  actualizar((x) => { x.buzon.notas = (x.buzon?.notas || []).map((n) => (n.id === id ? { ...n, ...cambios } : n)); });
}

/** Guarda la nota y la envía (si no hay conexión, se queda en la cola). Devuelve true si llegó. */
export async function enviarNota({ tipo = null, tema = 'app', texto, contexto = null, foto = null }) {
  const nota = { id: crypto.randomUUID(), creada: Date.now(), tipo: tipo || 'nota', tema, texto: texto.trim(), contexto, foto };
  clave();
  actualizar((x) => {
    const { id, creada } = nota;
    x.buzon = { ...x.buzon, notas: [{ id, creada, tipo: nota.tipo, tema, texto: nota.texto, estado: 'pendiente', conFoto: !!foto, leida: true }, ...(x.buzon?.notas || [])] };
  });
  await guardarIdb(COLA, [...((await leerIdb(COLA)) || []), nota]);
  await enCurso; // si ya se estaba enviando la cola, esta nota va en la vuelta siguiente
  await vaciarCola();
  return get(estado).buzon.notas.find((n) => n.id === nota.id)?.estado === 'enviada';
}

let enCurso = null;
/** Envía lo que quedó pendiente. Lo que el servidor rechaza se queda marcado (y se reintenta más tarde). */
export function vaciarCola() {
  enCurso ||= (async () => {
    const cola = (await leerIdb(COLA)) || [];
    const quedan = [];
    for (const n of cola) {
      try {
        const r = await fetch(`${SERVIDOR}/buzon`, { method: 'POST', headers: cabeceras(true), body: JSON.stringify(n) });
        if (r.ok) { cambiarNota(n.id, { estado: 'enviada', error: undefined }); continue; }
        const { error } = await r.json().catch(() => ({}));
        if (r.status !== 429 && r.status < 500) cambiarNota(n.id, { estado: 'error', error: error || `El servidor respondió ${r.status}` });
      } catch { /* sin conexión: se queda en la cola */ }
      quedan.push(n);
    }
    await guardarIdb(COLA, quedan);
  })().finally(() => { enCurso = null; });
  return enCurso;
}

let ultima = 0;
/** Trae el estado y las respuestas de tus notas. Lo nuevo (una respuesta o una nota cerrada) queda sin leer. */
export async function actualizarBuzon() {
  if (!get(estado).buzon?.clave) return;
  ultima = Date.now();
  let lista;
  try {
    const r = await fetch(`${SERVIDOR}/buzon`, { headers: cabeceras() });
    if (!r.ok) return;
    lista = await r.json();
  } catch { return; }
  actualizar((x) => {
    const previas = new Map((x.buzon.notas || []).map((n) => [n.id, n]));
    const notas = lista.map((s) => {
      const l = previas.get(s.id);
      const nuevo = l && ((s.respuesta && s.respuesta !== l.respuesta) || (FINALES.includes(s.estado) && s.estado !== l.estado));
      return { ...s, leida: nuevo ? false : (l?.leida ?? true) };
    });
    const enServidor = new Set(lista.map((n) => n.id));
    for (const n of x.buzon.notas || []) if (!enServidor.has(n.id) && ['pendiente', 'error'].includes(n.estado)) notas.push(n);
    x.buzon.notas = notas.sort((a, b) => b.creada - a.creada).slice(0, 200);
  });
}

export async function borrarNota(n) {
  if (!['pendiente', 'error'].includes(n.estado)) {
    try {
      const r = await fetch(`${SERVIDOR}/buzon/${n.id}`, { method: 'DELETE', headers: cabeceras() });
      if (!r.ok || !(await r.json()).borrada) return false;
    } catch { return false; }
  }
  await guardarIdb(COLA, ((await leerIdb(COLA)) || []).filter((x) => x.id !== n.id));
  actualizar((x) => { x.buzon.notas = x.buzon.notas.filter((y) => y.id !== n.id); });
  return true;
}

export function marcarLeidas() {
  if (!(get(estado).buzon?.notas || []).some((n) => n.leida === false)) return;
  actualizar((x) => { x.buzon.notas = x.buzon.notas.map((n) => ({ ...n, leida: true })); });
}

/** Respuestas o notas cerradas que aún no has visto. */
export const sinLeer = (e) => (e.buzon?.notas || []).filter((n) => n.leida === false).length;

/** Al abrir la app (y al volver a ella o recuperar la conexión): envía lo pendiente y trae las respuestas. */
export function iniciarBuzon() {
  const abiertas = () => (get(estado).buzon?.notas || []).some((n) => !FINALES.includes(n.estado));
  const repasar = () => { if (abiertas()) vaciarCola().then(actualizarBuzon); };
  repasar();
  addEventListener('online', repasar);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && Date.now() - ultima > 10 * 60_000) repasar(); });
}

// ── Contexto: lo que la app añade sola para saber de qué hablas ───────────

const PANTALLAS = { hoy: 'Hoy', entreno: 'Entreno', comida: 'Comida', progreso: 'Progreso', ajustes: 'Mi plan' };
const FRANJAS = { desayuno: 'Desayuno', media: 'Media mañana', comida: 'Comida', merienda: 'Merienda', cena: 'Cena', recena: 'Recena' };

/** Tema que toca por defecto según desde dónde escribes. */
export function temaDe(pagina, objeto) {
  if (objeto?.tipo === 'sesion' || pagina === 'entreno') return 'entreno';
  if (objeto?.tipo === 'comida' || pagina === 'comida') return 'dieta';
  return 'app';
}

/** «Sobre qué» escribes, en una línea. */
export function sobreTexto(e, { pagina = 'hoy', sub = '', objeto = null } = {}) {
  if (objeto?.tipo === 'sesion') {
    const s = planDe(e)?.sesiones.find((x) => x.id === objeto.id);
    if (s) return `${s.titulo.split(':')[0]} · ${diaSemana(s.fecha).slice(0, 3)} ${fechaCorta(s.fecha)}`;
  }
  if (objeto?.tipo === 'comida') return `${FRANJAS[objeto.franja] || 'Receta'} · ${recetaPorId[objeto.recetaId]?.nombre || 'Comida'}`;
  const nombre = PANTALLAS[pagina] || 'Hoy';
  return sub ? `${nombre} → ${sub[0].toUpperCase()}${sub.slice(1)}` : nombre;
}

// La versión publicada se reconoce por el nombre del archivo principal (index-XXXX.js)
const versionApp = () => [...document.querySelectorAll('script[type="module"][src]')].map((s) => s.getAttribute('src')).find((s) => /index-|main\.js/.test(s))?.split('/').pop() || '';

/** Lo que va con la nota: dónde estabas, qué sesión o comida y lo básico de tu plan. */
export function contextoNota(e, { pagina = 'hoy', sub = '', objeto = null } = {}) {
  const hoy = hoyISO();
  const t = new Date();
  const c = {
    cuando: `${hoy} ${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`,
    pantalla: sub ? `${pagina}/${sub}` : pagina,
    version: versionApp(),
    perfil: e.perfil ? { peso: e.perfil.peso, grasa: e.perfil.grasa, objetivo: e.perfil.objetivo, comidas: e.perfil.comidas, dieta: e.perfil.dieta } : null,
    hyrox: e.hyrox?.config ? (({ dias, enfoque, exigencia, fechaCarrera, nivel, categoria }) => ({ dias, enfoque, exigencia, fechaCarrera, nivel, categoria }))(e.hyrox.config) : null,
  };
  try {
    const plan = planDe(e);
    if (objeto?.tipo === 'sesion') {
      const s = plan?.sesiones.find((x) => x.id === objeto.id);
      if (s) {
        c.sesion = { id: s.id, fecha: s.fecha, titulo: s.titulo, tipo: s.tipo, fase: s.fase, duracion: s.duracion, rpe: s.rpe, sinGym: !!s.sinGym, lineas: (s.bloques || []).flatMap((b) => b.lineas).slice(0, 30) };
        const r = e.hyrox?.registros?.[s.id];
        if (r) c.registro = { estado: r.estado, rpe: r.rpe, sensacion: r.sensacion, duracion: r.duracion, series: r.series };
      }
    } else if (objeto?.tipo === 'comida') {
      const m = macrosComida(objeto.ingredientes || []);
      c.comida = { fecha: e.plan?.dias?.[objeto.diaIdx]?.fecha || null, franja: objeto.franja || null, recetaId: objeto.recetaId, receta: recetaPorId[objeto.recetaId]?.nombre,
        ingredientes: (objeto.ingredientes || []).map((i) => `${i.a} ${Math.round(i.g)} g`), kcal: Math.round(m.kcal), p: Math.round(m.p), c: Math.round(m.c), g: Math.round(m.g) };
    }
    if (['hoy', 'comida'].includes(pagina) || objeto?.tipo === 'comida') {
      const d = estadoDia(e, calcularObjetivos(e.perfil), hoy);
      c.dia = { objetivo: { kcal: Math.round(d.objetivo.kcal), p: Math.round(d.objetivo.p) }, consumido: { kcal: Math.round(d.consumido.kcal), p: Math.round(d.consumido.p) }, entreno: d.entreno,
        comidas: d.comidas.map((x) => `${x.franja} ${x.hora || ''}: ${recetaPorId[x.recetaId]?.nombre || x.recetaId} · ${Math.round(macrosComida(x.ingredientes).kcal)} kcal · ${x.situacion}`) };
    }
    if (plan && (['hoy', 'entreno'].includes(pagina) || objeto?.tipo === 'sesion')) {
      const w = semanaDe(plan, hoy);
      if (w) c.semana = { n: w.w + 1, de: plan.N, fase: w.fase, descarga: !!w.deload, sesiones: w.sesiones.map((s) => `${s.fecha} ${s.titulo}${e.hyrox.registros?.[s.id] ? ` (${e.hyrox.registros[s.id].estado})` : ''}`) };
    }
  } catch { /* el contexto ayuda, pero la nota se envía igual */ }
  return c;
}
