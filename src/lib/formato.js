// Formato de números, dinero y fechas en español.
export const euros = (n) => `${(n || 0).toFixed(2).replace('.', ',')} €`;
export const num = (n, dec = 0) => (n || 0).toFixed(dec).replace('.', ',');
export const entero = (n) => Math.round(n || 0).toLocaleString('es-ES');

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const DIAS_CORTOS = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

const fecha = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
};
export const diaSemana = (iso) => DIAS[fecha(iso).getDay()];
export const diaCorto = (iso) => DIAS_CORTOS[fecha(iso).getDay()];
export const fechaLarga = (iso) => {
  const f = fecha(iso);
  return `${DIAS[f.getDay()]} ${f.getDate()} de ${MESES[f.getMonth()]}`;
};
export const fechaCorta = (iso) => {
  const f = fecha(iso);
  return `${f.getDate()} ${MESES[f.getMonth()].slice(0, 3)}`;
};
export const capital = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);

export function saludo() {
  const h = new Date().getHours();
  return h < 6 ? 'Buenas noches' : h < 13 ? 'Buenos días' : h < 21 ? 'Buenas tardes' : 'Buenas noches';
}

/** Franja sugerida según la hora actual y el plan del día. */
export function franjaPorHora(comidas = []) {
  const ahora = new Date();
  const hhmm = `${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}`;
  let mejor = null;
  for (const c of comidas) {
    if (!c.hora) continue;
    if (c.hora <= hhmm || !mejor) mejor = c.franja;
  }
  return mejor || (hhmm < '11:00' ? 'desayuno' : hhmm < '16:30' ? 'comida' : hhmm < '19:30' ? 'merienda' : 'cena');
}
