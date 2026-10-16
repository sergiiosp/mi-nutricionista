// Estado de interfaz no persistente: hoja inferior abierta y avisos.
import { writable, get } from 'svelte/store';

/** Hoja inferior: { tipo: 'registrar' | 'receta' | 'alternativas' | ..., props } o null */
export const hoja = writable(null);
export const abrirHoja = (tipo, props = {}) => hoja.set({ tipo, props, clave: Date.now() });
export const cerrarHoja = () => hoja.set(null);

export const aviso = writable(null);
let t;
/** Aviso breve. Con `deshacer` (función) el aviso lleva un botón «Deshacer» y dura más. */
export function avisar(texto, emoji = '✅', deshacer = null) {
  aviso.set({ texto, emoji, deshacer, clave: Date.now() });
  clearTimeout(t);
  t = setTimeout(() => aviso.set(null), deshacer ? 6000 : 2800);
}
export function deshacerAviso() {
  const a = get(aviso);
  a?.deshacer?.();
  clearTimeout(t);
  aviso.set(null);
}

/** Celebración breve (confeti) para logros del día */
export const fiesta = writable(0);
export const celebrar = () => fiesta.update((n) => n + 1);
