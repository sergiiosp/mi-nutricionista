// Raciones visuales para registrar sin báscula (método de la mano), convertidas a gramos.
import { ALIMENTOS } from '../data/alimentos.js';

const CRUDOS_SECOS = ['arroz', 'arroz_integral', 'pasta', 'pasta_larga', 'pasta_integral', 'cuscus'];
const LEGUMBRES = ['garbanzos', 'lentejas', 'alubias'];

/** @returns {{ nombre: string, emoji: string, g: number, nota?: string }[]} */
export function racionesAlimento(id) {
  const a = ALIMENTOS[id];
  if (!a) return [];
  const r = [];
  if (a.unidad) {
    const u = a.unidad;
    if (u.g >= 20) {
      r.push({ nombre: `½ ${u.n}`, emoji: '🌓', g: u.g / 2 });
      r.push({ nombre: `1 ${u.n}`, emoji: '1️⃣', g: u.g });
      r.push({ nombre: `2 ${u.pl}`, emoji: '2️⃣', g: u.g * 2 });
    } else {
      r.push({ nombre: `2 ${u.pl}`, emoji: '2️⃣', g: u.g * 2 }, { nombre: `3 ${u.pl}`, emoji: '3️⃣', g: u.g * 3 }, { nombre: `5 ${u.pl}`, emoji: '5️⃣', g: u.g * 5 });
    }
  }
  if (CRUDOS_SECOS.includes(id)) {
    r.push({ nombre: '1 puño cocido', emoji: '✊', g: 50, nota: '≈150 g cocido' });
    r.push({ nombre: '1 plato normal', emoji: '🍽️', g: 80, nota: '≈240 g cocido' });
    r.push({ nombre: '1 plato grande', emoji: '🍝', g: 110, nota: '≈330 g cocido' });
  } else if (LEGUMBRES.includes(id)) {
    r.push({ nombre: '1 puño', emoji: '✊', g: 150 }, { nombre: '1 plato', emoji: '🍲', g: 250 }, { nombre: '1 bote entero', emoji: '🫙', g: 400 });
  } else if (id === 'patata' || id === 'batata') {
    r.push({ nombre: '1 puño', emoji: '✊', g: 150 }, { nombre: '1 mediana', emoji: '🥔', g: 200 }, { nombre: '1 grande', emoji: '🥔', g: 300 });
  } else if (id === 'pan_integral') {
    r.push({ nombre: '1 rebanada', emoji: '🍞', g: 30 }, { nombre: 'trozo de un palmo', emoji: '✋', g: 60 }, { nombre: 'media barra', emoji: '🥖', g: 115 });
  } else if (id === 'avena') {
    r.push({ nombre: '1 puñado', emoji: '🤲', g: 40 }, { nombre: '2 puñados', emoji: '🤲', g: 80 });
  } else if (id === 'aceite') {
    r.push({ nombre: '1 cucharadita', emoji: '🥄', g: 4 }, { nombre: '1 cucharada', emoji: '🥄', g: 10 }, { nombre: '2 cucharadas', emoji: '🥄', g: 20 });
  } else if (['nueces', 'almendras'].includes(id)) {
    r.push({ nombre: '1 puñadito', emoji: '🤏', g: 15 }, { nombre: '1 puñado', emoji: '🤲', g: 30 });
  } else if (['crema_cacahuete', 'miel', 'confitura', 'chia', 'cacao'].includes(id)) {
    r.push({ nombre: '1 cucharadita', emoji: '🥄', g: id === 'miel' ? 7 : 5 }, { nombre: '1 cucharada', emoji: '🥄', g: 15 });
  } else if (a.medida === 'ml') {
    r.push({ nombre: '1 vaso', emoji: '🥛', g: 250 }, { nombre: '½ vaso', emoji: '🥛', g: 125 }, { nombre: '1 taza', emoji: '☕', g: 200 });
  } else if (a.grupo === 'proteina' && !a.unidad) {
    r.push({ nombre: '½ palma', emoji: '✋', g: 60 }, { nombre: '1 palma', emoji: '✋', g: 120 }, { nombre: '2 palmas', emoji: '🙌', g: 240 });
  } else if (a.grupo === 'lacteo' && !a.unidad) {
    r.push({ nombre: '1 cucharada', emoji: '🥄', g: 30 }, { nombre: '1 bol pequeño', emoji: '🥣', g: 150 }, { nombre: '1 bol', emoji: '🥣', g: 250 });
  } else if (a.grupo === 'verdura') {
    r.push({ nombre: '1 puño', emoji: '✊', g: 80 }, { nombre: '1 plato', emoji: '🥗', g: 200 }, { nombre: '1 plato grande', emoji: '🥗', g: 300 });
  } else if (a.grupo === 'fruta' && !a.unidad) {
    r.push({ nombre: '1 puñado', emoji: '🤲', g: 80 }, { nombre: '1 bol', emoji: '🥣', g: 150 });
  }
  r.push({ nombre: '100 g', emoji: '⚖️', g: 100 });
  return r;
}

/** Raciones para un producto de Open Food Facts. */
export function racionesProducto(p) {
  const r = [];
  if (p.racion?.g) r.push({ nombre: p.racion.texto || `1 ración (${p.racion.g} g)`, emoji: '🍽️', g: p.racion.g });
  if (p.cantidadEnvase && p.cantidadEnvase <= 600) r.push({ nombre: 'Envase entero', emoji: '📦', g: p.cantidadEnvase });
  r.push({ nombre: '30 g', emoji: '🤏', g: 30 }, { nombre: '100 g', emoji: '⚖️', g: 100 }, { nombre: '200 g', emoji: '⚖️', g: 200 });
  return r;
}
