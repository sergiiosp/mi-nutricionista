// Qué foto lleva una receta: la suya o, si se adaptó a tus alergias cambiando algo que se ve
// (un fruto seco, la granola…), la de su versión adaptada. null si no hay ninguna fiel.
import { FOTOS_RECETAS } from '../data/fotos.js';

export function fotoReceta(receta) {
  const id = receta?.sinFoto ? receta.fotoAdaptada : receta?.id;
  return id && FOTOS_RECETAS[id] ? `img/recetas/${id}.webp` : null;
}
