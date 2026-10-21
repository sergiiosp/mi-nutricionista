// Estado persistente de la app (localStorage). Las fotos van aparte, en IndexedDB (lib/fotos.js).
import { writable, get } from 'svelte/store';
import { macrosComida } from '../lib/nutricion.js';
import { recetaPorId } from '../lib/planificador.js';

const CLAVE = 'mi-nutricionista:v1';

export const VACIO = () => ({
  version: 2,
  perfil: null,
  plan: null,
  // fecha → [{ id, hora, franja, tipo, ref, nombre, emoji, imagen, cantidad, macros, foto }]
  registros: {},
  saltadas: {}, // "fecha|franja" → true
  mantener: {}, // "fecha|franja" → true: comidas que la app proponía quitar y decides tomar igualmente
  compra: { marcados: {}, soloRestantes: false, enCasa: {}, quitados: {}, envases: {}, extra: {} },
  pesos: [], // { fecha, peso, cintura? }
  medidas: [], // { fecha, cintura, cadera, pecho, brazo, muslo }
  fotosProgreso: [], // { id, fecha, nota }
  propias: [], // comidas propias: { id, nombre, emoji, ingredientes?, macros, racion }
  recientes: [], // últimas cosas registradas (para repetir con un toque)
  productos: {}, // productos escaneados (Open Food Facts) para usarlos sin conexión
  tema: 'oscuro', // oscuro · claro · sistema
  fuente: 'sistema', // sistema (SF Pro en iPhone) · manrope · geist
  favoritas: [], // ids de recetas o comidas montadas («combo:…») que el menú usa a menudo
  entrenoDia: {}, // fecha → 'si' | 'no' cuando cambias si ese día entrenas
  hyrox: null, // { config, registros: { idSesion: {...} }, movidas: { idSesion: fecha } }
  feedback: { dias: {}, semanas: {} }, // notas del día (hambre, energía…) y repasos semanales (clave: lunes)
  agenda: { eventos: [], viajes: [] },
  tomas: {}, // fecha → { idSuplemento: true }: suplementos tomados ese día
  despensa: {}, // alimento → { g, fecha }: lo que tienes en casa (lo cogido en la compra, menos lo que comes)
  diario: [], // diario del coach: cada cambio del plan { fecha, tipo, titulo, motivo }
  ultimaCopia: null,
  copiaPospuesta: null, // «Más tarde» en el aviso de copia (vuelve a los 3 días) // fecha de la última copia guardada fuera del móvil
  coachVisto: null, // lunes de la última semana en que abriste «Tu plan» (para el aviso del lunes en Hoy)
  gasto: null, // última estimación del gasto real { fecha, listo, tdee, ingesta, kgSemana, formula, ajuste }
  propuestasVistas: {}, // propuestas de un toque ya respondidas // carreras populares { id, fecha, nombre, km, hora } y viajes { id, desde, hasta, comida[] }
});

/** Convierte datos de la versión 1 (hechas: fecha|franja → true) al formato de registros. */
function migrar(datos) {
  const e = { ...VACIO(), ...datos };
  e.compra = { ...VACIO().compra, ...(datos.compra || {}) };
  delete e.strava; // de cuando hubo conexión con Strava
  e.favoritas ||= [];
  e.entrenoDia ||= {};
  e.mantener ||= {};
  e.tomas ||= {};
  e.diario ||= [];
  if (!['sistema', 'manrope', 'geist'].includes(e.fuente)) e.fuente = 'sistema';
  e.despensa ||= {};
  e.agenda = { eventos: [], viajes: [], ...(datos.agenda || {}) };
  e.feedback = { dias: {}, semanas: {}, ...(datos.feedback || {}) };
  if (!['oscuro', 'claro', 'sistema'].includes(e.tema)) e.tema = 'oscuro'; // el diseño nuevo es oscuro por defecto
  if (datos.hechas && e.plan) {
    for (const clave of Object.keys(datos.hechas)) {
      const [fecha, franja] = clave.split('|');
      const dia = e.plan.dias.find((d) => d.fecha === fecha);
      const comida = dia?.comidas.find((c) => c.franja === franja);
      if (!comida) continue;
      (e.registros[fecha] ||= []).push(registroDePlan(comida, fecha));
    }
  }
  delete e.hechas;
  e.version = 2;
  return e;
}

function cargar() {
  try {
    const crudo = localStorage.getItem(CLAVE);
    if (crudo) return migrar(JSON.parse(crudo));
  } catch {
    // almacenamiento no disponible o datos corruptos: se empieza de cero
  }
  return VACIO();
}

export const estado = writable(cargar());

let pendiente = null;
function guardarYa() {
  if (!pendiente) return;
  clearTimeout(pendiente);
  pendiente = null;
  try {
    localStorage.setItem(CLAVE, JSON.stringify(get(estado)));
  } catch {
    // sin almacenamiento (modo privado): la app funciona pero no recuerda nada
  }
}
estado.subscribe(() => {
  clearTimeout(pendiente);
  pendiente = setTimeout(guardarYa, 150);
});
// Al salir de la app (o cerrarla) se guarda al momento, sin esperar
if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', guardarYa);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') guardarYa(); });
}

/** Modifica el estado con una función que muta un borrador. */
export function actualizar(fn) {
  estado.update((e) => {
    fn(e);
    return e;
  });
}

export const nuevoId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

export function horaActual() {
  const f = new Date();
  return `${String(f.getHours()).padStart(2, '0')}:${String(f.getMinutes()).padStart(2, '0')}`;
}

export function registroDePlan(comida, fecha, ingredientes = comida.ingredientes) {
  const receta = recetaPorId[comida.recetaId];
  return {
    id: nuevoId(),
    fecha,
    hora: comida.hora || horaActual(),
    franja: comida.franja,
    tipo: 'plan',
    ref: comida.recetaId,
    nombre: receta?.nombre || 'Comida del plan',
    emoji: receta?.emoji,
    imagen: receta ? `img/recetas/${receta.id}.webp` : null,
    ingredientes,
    macros: macrosComida(ingredientes),
  };
}

export function añadirRegistro(fecha, registro) {
  actualizar((e) => {
    (e.registros[fecha] ||= []).push(registro);
    if (registro.tipo !== 'plan') {
      const clave = `${registro.tipo}:${registro.ref || registro.nombre}`;
      e.recientes = [{ ...registro, clave, foto: undefined }, ...e.recientes.filter((r) => r.clave !== clave)].slice(0, 30);
    }
  });
}

/** Cambia las cantidades de algo que ya registraste (lo que comiste de verdad). */
export function editarRegistro(fecha, id, ingredientes) {
  const limpios = ingredientes.filter((i) => i.g > 0).map((i) => ({ a: i.a, g: Math.round(i.g) }));
  actualizar((e) => {
    const r = (e.registros[fecha] || []).find((x) => x.id === id);
    if (!r) return;
    r.ingredientes = limpios;
    r.macros = macrosComida(limpios);
    r.editado = true;
  });
}

export function borrarRegistro(fecha, id) {
  actualizar((e) => {
    e.registros[fecha] = (e.registros[fecha] || []).filter((r) => r.id !== id);
  });
}

export function reiniciar() {
  estado.set(VACIO());
}

/** Diario del coach: apunta un cambio del plan con su motivo (los últimos 120). */
export function anotarDiario(tipo, titulo, motivo = '') {
  const hoy = new Date();
  const fecha = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
  actualizar((e) => {
    const l = (e.diario ||= []);
    // El mismo tipo de cambio dos veces el mismo día: se queda el último
    const i = l.findIndex((x) => x.fecha === fecha && x.tipo === tipo);
    const nota = { fecha, tipo, titulo, motivo };
    if (i >= 0) l[i] = nota; else l.push(nota);
    e.diario = l.slice(-120);
  });
}

export function exportar() {
  return JSON.stringify(get(estado), null, 2);
}

export function importar(texto) {
  const datos = JSON.parse(texto);
  if (!datos || typeof datos !== 'object' || !('perfil' in datos)) throw new Error('El archivo no parece una copia de seguridad de la app');
  estado.set(migrar(datos));
}
