// Suelo pélvico: 5 minutos al día que avanzan por fases (aprender tumbado → fuerza sentado y de pie → en
// movimiento). Se trabaja apretar y también soltar: un suelo pélvico fuerte que sabe relajarse ayuda a ir al baño
// sin empujar (hemorroides) y, con unos meses de práctica, da más firmeza en la erección y control al eyacular.
import { aMin, aHora } from './horario.js';

const diasEntre = (a, b) => Math.round((new Date(`${b}T12:00`) - new Date(`${a}T12:00`)) / 86400000);

const SOLTAR_INICIO = { nombre: 'Respira y suelta', dosis: '1 min', como: 'Respira lento con la barriga. Al coger aire, deja que el suelo pélvico baje y se afloje.' };
const SOLTAR_FIN = { nombre: 'Suelta del todo', dosis: '1 min', como: 'Respira con la barriga y nota cómo se afloja. Soltar bien es tan importante como apretar.' };
const APRETAR = 'Cierra y sube por dentro, como si cortaras el pis y aguantaras un gas a la vez. Glúteos, barriga y piernas quietos, y respira normal: no aguantes el aire.';

export const FASES_SUELO = [
  {
    id: 'aprender', nombre: 'Aprender', desde: 0, postura: 'Tumbado boca arriba, con las rodillas dobladas',
    ejercicios: [
      SOLTAR_INICIO,
      { nombre: 'Contracciones lentas', dosis: '10 × aprieta 5 s y suelta 10 s', como: APRETAR },
      { nombre: 'Contracciones rápidas', dosis: '10 × aprieta 1 s y suelta 1 s', como: 'Aprieta y suelta del todo cada vez, sin mover el resto del cuerpo.' },
      SOLTAR_FIN,
    ],
  },
  {
    id: 'fuerza', nombre: 'Fuerza', desde: 14, postura: 'Sentado y de pie',
    ejercicios: [
      SOLTAR_INICIO,
      { nombre: 'Lentas sentado', dosis: '10 × aprieta 8 s y suelta 8 s', como: APRETAR },
      { nombre: 'Lentas de pie', dosis: '8 × aprieta 8 s y suelta 8 s', como: 'Igual que sentado, de pie y con las rodillas sueltas.' },
      { nombre: 'Contracciones rápidas', dosis: '15 × aprieta 1 s y suelta 1 s', como: 'Rápido y suelta del todo cada vez.' },
      SOLTAR_FIN,
    ],
    truco: 'Aprieta justo antes de toser, estornudar o levantar algo pesado.',
  },
  {
    id: 'movimiento', nombre: 'En movimiento', desde: 42, postura: 'De pie y moviéndote',
    ejercicios: [
      SOLTAR_INICIO,
      { nombre: 'Lentas de pie', dosis: '10 × aprieta 10 s y suelta 10 s', como: APRETAR },
      { nombre: 'Contracciones rápidas', dosis: '20 × aprieta 1 s y suelta 1 s', como: 'Rápido y suelta del todo cada vez.' },
      { nombre: 'Sentadilla con suelo pélvico', dosis: '10 sentadillas sin peso', como: 'Al subir, suelta el aire y aprieta suave; al bajar, suelta el suelo pélvico.' },
      SOLTAR_FIN,
    ],
    truco: 'Aprieta justo antes de toser, estornudar o levantar algo pesado.',
  },
];

/** La rutina de hoy: fase según los días desde que empezaste, semana y ejercicios. */
export function rutinaSuelo(inicio, hoy) {
  const dias = Math.max(0, diasEntre(inicio, hoy));
  const fase = [...FASES_SUELO].reverse().find((f) => dias >= f.desde);
  const siguiente = FASES_SUELO[FASES_SUELO.indexOf(fase) + 1] || null;
  return { fase, semana: Math.floor(dias / 7) + 1, siguiente, enDias: siguiente ? siguiente.desde - dias : null };
}

/** Cuándo toca: media hora antes de dormir (la primera fase se hace tumbado). */
export const horaSuelo = (perfil) => aHora(aMin(perfil?.dormir || '23:30') - 30);
