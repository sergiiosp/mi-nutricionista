// El día de la carrera, hora a hora: desayuno, café, llegada, calentamiento, salida con tus pasos por km,
// geles y recuperación. Sirve para las carreras de tu agenda (media, 10 km…) y para la HYROX.
import { planDe } from './index.js';
import { estimarCarrera, estrategia, nutricionDiaCarrera } from './carrera.js';
import { aMin, aHora } from '../horario.js';
import { hms } from './ritmos.js';

const sinCafeinaDe = (perfil) => (perfil?.condiciones || []).includes('hipertension') || perfil?.estres === 'alto';
const lineasDe = (s, titulo) => s.bloques?.find((b) => b.titulo === titulo)?.lineas || [];

/** Plan del día para una fecha con carrera (o null). */
export function planDiaCarrera(e, fecha) {
  const plan = planDe(e);
  if (!plan) return null;
  const perfil = e.perfil;
  const popular = (plan.porFecha[fecha] || []).find((s) => s.tipo === 'popular');
  if (popular) return diaPopular(popular, perfil);
  if (plan.carrera === fecha) return diaHyrox(e, plan, perfil);
  return null;
}

function diaPopular(s, perfil) {
  const salida = aMin(s.hora || '09:00');
  const seg = s.duracion * 60;
  const ritmo = s.distancia ? seg / s.distancia : 330;
  const comer = lineasDe(s, 'Comer y beber');
  const geles = /km ([\d ,y]+) \(/.exec(comer.find((l) => l.startsWith('Durante')) || '')?.[1]?.split(/ y |, /).map(Number).filter(Boolean) || [];
  const items = [
    { min: -165, icono: 'utensils', titulo: 'Desayuno de carrera', texto: comer[0]?.replace(/^Desayuno a las [\d:]+ \([^)]*\): /, '') || 'Hidratos fáciles, poca fibra y poca grasa. Lo de siempre.' },
    { min: -90, icono: 'droplet', titulo: 'Bebe', texto: '400-500 ml de agua o isotónica a sorbos.' },
    { min: -60, icono: 'map-pin', titulo: 'Llega a la salida', texto: 'Dorsal y chip puestos, guardarropa y baño con tiempo: las colas se alargan.' },
  ];
  if (!sinCafeinaDe(perfil)) items.push({ min: -50, icono: 'coffee', titulo: 'Café', texto: 'Un café solo (≈3 mg de cafeína por kg) si ya lo has probado entrenando.' });
  items.push({ min: -25, icono: 'flame', titulo: 'Calentamiento', texto: (s.calentamiento || []).join(' · ') || '10 min de trote suave y unas progresiones.' });
  items.push({ min: -10, icono: 'flag', titulo: 'A tu cajón', texto: comer[1] || 'Medio plátano o un gel y unos sorbos de agua.' });
  items.push({ min: 0, icono: 'play', titulo: 'Salida', texto: lineasDe(s, 'La carrera').slice(1, 3).join('. ') + '.', lineas: lineasDe(s, 'Por dónde deberías pasar') });
  for (const km of geles) items.push({ min: Math.round((km * ritmo) / 60), icono: 'zap', titulo: `Gel en el km ${km}`, texto: 'Con agua del avituallamiento; sin parar del todo.' });
  items.push({ min: s.duracion, icono: 'trophy', titulo: 'Meta', texto: `Objetivo: ${hms(seg)}. Camina 10 min y no te pares en seco.` });
  items.push({ min: s.duracion + 45, icono: 'cup-soda', titulo: 'Recuperación', texto: 'En la primera hora: hidratos y proteína (batido con plátano, bocadillo de pavo y fruta) y bebe bien.' });
  return { tipo: 'popular', nombre: s.titulo, hora: s.hora || '09:00', duracion: s.duracion, objetivo: hms(seg), salida, items: conHora(items, salida) };
}

function diaHyrox(e, plan, perfil) {
  const config = e.hyrox.config;
  const hora = config.horaCarrera || '10:00';
  const salida = aMin(hora);
  const est = estimarCarrera(config, perfil, e.hyrox.registros || {}, e.tests || []);
  const dur = Math.round(est.total / 60);
  const items = nutricionDiaCarrera(perfil, hora, dur, { sinCafeina: sinCafeinaDe(perfil) }).map((x) => ({ min: x.min, emoji: x.emoji, titulo: x.titulo, texto: x.texto }));
  items.push({ min: -60, icono: 'map-pin', titulo: 'Llega a la zona', texto: 'Recoge el dorsal, deja la bolsa y localiza el roxzone y las estaciones.' });
  items.push({ min: 0, icono: 'play', titulo: 'Salida', texto: estrategia(config, est).general.slice(0, 2).join(' '), lineas: est.tramos.filter((t) => t.tipo === 'estacion').map((t) => `${t.nombre}: ${hms(Math.round(t.acumulado))}`) });
  items.push({ min: dur, icono: 'trophy', titulo: 'Meta', texto: `Tiempo estimado: ${hms(Math.round(est.total))}.` });
  return { tipo: 'hyrox', nombre: 'HYROX', hora, duracion: dur, objetivo: hms(Math.round(est.total)), salida, items: conHora(items, salida) };
}

const conHora = (items, salida) => items.map((x) => ({ ...x, hora: aHora(salida + x.min) })).sort((a, b) => a.min - b.min);
