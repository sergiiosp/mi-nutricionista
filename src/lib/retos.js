// Retos de la semana (de lunes a domingo): proteína, sesiones y días apuntados, y la racha de
// semanas seguidas cumpliendo al menos dos de los tres.
import { resumenDia } from './logros.js';
import { sumarDias } from './planificador.js';
import { planDe } from './hyrox/index.js';
import { semanaDe } from './hyrox/plan.js';

const lunesDe = (f) => {
  const d = new Date(`${f}T12:00`).getDay();
  return sumarDias(f, -((d + 6) % 7));
};

function retosDe(e, objetivos, lunes, hasta) {
  const fechas = Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i)).filter((f) => f <= hasta);
  const dias = fechas.map((f) => resumenDia(e, objetivos, f)).filter(Boolean);
  const lista = [
    { id: 'proteina', nombre: 'Proteína', detalle: 'días llegando a tu proteína', valor: dias.filter((d) => d.proteinaOk).length, meta: 6, icono: 'biceps-flexed' },
    { id: 'apuntar', nombre: 'Apuntar', detalle: 'días con lo que comes apuntado', valor: dias.length, meta: 6, icono: 'notebook-pen' },
  ];
  const plan = planDe(e);
  const sem = plan ? semanaDe(plan, lunes) : null;
  if (sem) {
    const ses = sem.sesiones.filter((s) => s.tipo !== 'carrera' && s.tipo !== 'caminar');
    const hechas = ses.filter((s) => ['completa', 'parcial'].includes(e.hyrox?.registros?.[s.id]?.estado)).length;
    lista.push({ id: 'sesiones', nombre: 'Sesiones', detalle: 'sesiones del plan hechas', valor: hechas, meta: ses.length || 1, icono: 'dumbbell' });
  }
  for (const r of lista) r.hecho = r.valor >= r.meta;
  return lista;
}

export function retosSemana(e, objetivos, hoy) {
  const lunes = lunesDe(hoy);
  const lista = retosDe(e, objetivos, lunes, hoy);
  // Racha: semanas anteriores seguidas con al menos 2 retos cumplidos
  let racha = 0;
  for (let l = sumarDias(lunes, -7); racha < 52; l = sumarDias(l, -7)) {
    const r = retosDe(e, objetivos, l, sumarDias(l, 6));
    if (r.filter((x) => x.hecho).length >= 2) racha++;
    else break;
  }
  return { lunes, lista, completados: lista.filter((x) => x.hecho).length, racha };
}
