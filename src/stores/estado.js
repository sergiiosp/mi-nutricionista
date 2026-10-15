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
  compra: { marcados: {}, soloRestantes: false, enCasa: {} },
  pesos: [], // { fecha, peso, cintura? }
  medidas: [], // { fecha, cintura, cadera, pecho, brazo, muslo }
  fotosProgreso: [], // { id, fecha, nota }
  propias: [], // comidas propias: { id, nombre, emoji, ingredientes?, macros, racion }
  recientes: [], // últimas cosas registradas (para repetir con un toque)
  productos: {}, // productos escaneados (Open Food Facts) para usarlos sin conexión
  tema: 'auto',
  hyrox: null, // { config, registros: { idSesion: {...} }, movidas: { idSesion: fecha } }
});

/** Convierte datos de la versión 1 (hechas: fecha|franja → true) al formato de registros. */
function migrar(datos) {
  const e = { ...VACIO(), ...datos };
  e.compra = { ...VACIO().compra, ...(datos.compra || {}) };
  delete e.strava; // de cuando hubo conexión con Strava
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

let pendiente;
estado.subscribe((e) => {
  clearTimeout(pendiente);
  pendiente = setTimeout(() => {
    try {
      localStorage.setItem(CLAVE, JSON.stringify(e));
    } catch {
      // sin almacenamiento (modo privado): la app funciona pero no recuerda nada
    }
  }, 150);
});

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

export function borrarRegistro(fecha, id) {
  actualizar((e) => {
    e.registros[fecha] = (e.registros[fecha] || []).filter((r) => r.id !== id);
  });
}

export function reiniciar() {
  estado.set(VACIO());
}

export function exportar() {
  return JSON.stringify(get(estado), null, 2);
}

export function importar(texto) {
  const datos = JSON.parse(texto);
  if (!datos || typeof datos !== 'object' || !('perfil' in datos)) throw new Error('El archivo no parece una copia de seguridad de la app');
  estado.set(migrar(datos));
}
