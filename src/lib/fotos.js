// Fotos (diario de comidas y progreso) en IndexedDB: localStorage no da para imágenes.
import { get, set, del } from 'idb-keyval';

/** Reduce la foto a un tamaño razonable (lado mayor 1000 px, JPEG) antes de guardarla. */
export async function comprimir(archivo, lado = 1000, calidad = 0.78) {
  const bitmap = await createImageBitmap(archivo);
  const escala = Math.min(1, lado / Math.max(bitmap.width, bitmap.height));
  const lienzo = document.createElement('canvas');
  lienzo.width = Math.round(bitmap.width * escala);
  lienzo.height = Math.round(bitmap.height * escala);
  lienzo.getContext('2d').drawImage(bitmap, 0, 0, lienzo.width, lienzo.height);
  return new Promise((ok) => lienzo.toBlob(ok, 'image/jpeg', calidad));
}

export async function guardarFoto(clave, archivo) {
  const blob = await comprimir(archivo);
  await set(`foto:${clave}`, blob);
  return clave;
}

const urls = new Map();
/** URL temporal para mostrar una foto guardada (o null si no existe). */
export async function urlFoto(clave) {
  if (!clave) return null;
  if (urls.has(clave)) return urls.get(clave);
  const blob = await get(`foto:${clave}`);
  if (!blob) return null;
  const url = URL.createObjectURL(blob);
  urls.set(clave, url);
  return url;
}

export async function borrarFoto(clave) {
  urls.delete(clave);
  await del(`foto:${clave}`);
}
