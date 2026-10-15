// Estado de interfaz no persistente: hoja inferior abierta y avisos.
import { writable } from 'svelte/store';

/** Hoja inferior: { tipo: 'registrar' | 'receta' | 'alternativas' | ..., props } o null */
export const hoja = writable(null);
export const abrirHoja = (tipo, props = {}) => hoja.set({ tipo, props, clave: Date.now() });
export const cerrarHoja = () => hoja.set(null);

export const aviso = writable(null);
let t;
export function avisar(texto, emoji = '✅') {
  aviso.set({ texto, emoji, clave: Date.now() });
  clearTimeout(t);
  t = setTimeout(() => aviso.set(null), 2800);
}

/** Celebración breve (confeti) para logros del día */
export const fiesta = writable(0);
export const celebrar = () => fiesta.update((n) => n + 1);
