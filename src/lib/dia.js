// Día dinámico: lo que llevas comido, lo que te falta y el reajuste de las comidas que quedan.
import { macrosComida, sumarMacros, objetivosDia, macrosDe, alimentoPermitido, alimento } from './nutricion.js';
import { recetaPorId } from './planificador.js';
import { platoCompleto, tipoFranja } from './complementos.js';

const CERO = { kcal: 0, p: 0, c: 0, g: 0, f: 0 };
// Comidas pequeñas que pueden sobrar un día con menos gasto (la de antes de dormir es la última en quitarse)
const SNACKS = ['merienda', 'media'];

export function restar(a, b) {
  return { kcal: a.kcal - b.kcal, p: a.p - b.p, c: a.c - b.c, g: a.g - b.g, f: (a.f || 0) - (b.f || 0) };
}

export function objetivoMacros(od) {
  return { kcal: od.kcal, p: od.proteina, c: od.hidratos, g: od.grasa, f: 0 };
}

/**
 * Estado completo de un día del plan.
 * Cada comida del plan queda como: hecha · saltada · sustituida (registraste otra cosa en su lugar) · pendiente.
 * Si el día se ha desviado (comida fuera del plan, saltada…), las pendientes se reescalan para cuadrar el objetivo.
 */
/** @param ahora hora actual (HH:MM) si el día es hoy: las comidas ya pasadas no se reajustan */
export function estadoDia(e, objetivos, fecha, ahora = null) {
  const dia = e.plan?.dias.find((d) => d.fecha === fecha) || null;
  const entreno = dia?.entreno ?? false;
  const od = dia?.objetivo || objetivosDia(objetivos, entreno);
  const objetivo = objetivoMacros(od);
  const registros = (e.registros[fecha] || []).slice().sort((a, b) => (a.hora || '').localeCompare(b.hora || ''));
  const consumido = sumarMacros(registros.map((r) => r.macros));

  const comidas = (dia?.comidas || []).map((c) => {
    const delPlan = registros.find((r) => r.tipo === 'plan' && r.franja === c.franja);
    const otros = registros.filter((r) => r.tipo !== 'plan' && r.franja === c.franja);
    let situacion = 'pendiente';
    if (delPlan) situacion = 'hecha';
    else if (e.saltadas[`${fecha}|${c.franja}`]) situacion = 'saltada';
    else if (otros.length) situacion = 'sustituida';
    // Una comida pendiente cuya hora pasó hace más de 1 h: probablemente se hizo y no se marcó
    const pasada = situacion === 'pendiente' && ahora && c.hora && restarHora(ahora, c.hora) > 60;
    return { ...c, situacion, registro: delPlan, otros, pasada };
  });

  let pendientes = comidas.filter((c) => c.situacion === 'pendiente');
  let porVenir = pendientes.filter((c) => !c.pasada);
  const desviado = registros.some((r) => r.tipo !== 'plan') || comidas.some((c) => c.situacion === 'saltada');
  // Las comidas ya pasadas sin marcar cuentan como hechas al calcular lo que queda
  const pasadas = sumarMacros(pendientes.filter((c) => c.pasada).map((c) => macrosComida(c.ingredientes)));
  // También se reajusta si lo comido ya no cuadra con el objetivo del día (p. ej. cambias a descanso
  // después de haber desayunado y comido como día de entreno)
  const previsto = sumarMacros([consumido, pasadas, ...porVenir.map((c) => macrosComida(c.ingredientes))]);
  const descuadre = registros.length > 0 && Math.abs(previsto.kcal - objetivo.kcal) / objetivo.kcal > 0.06;

  // Reajuste: lo que falta se reparte entre las pendientes según su peso en el plan original
  if ((desviado || descuadre) && porVenir.length) {
    const restante = restar(restar(objetivo, consumido), pasadas);
    // Si queda poco margen, una merienda o media mañana sobra: mejor quitarla que dejar dos comidas raquíticas
    const totalPorVenir = sumarMacros(porVenir.map((c) => macrosComida(c.ingredientes)));
    if (porVenir.length >= 2 && restante.kcal < totalPorVenir.kcal * 0.75) {
      const snack = porVenir.filter((c) => SNACKS.includes(c.franja) && c.etiqueta !== 'pre' && !e.mantener?.[`${fecha}|${c.franja}`])
        .sort((a, b) => macrosComida(a.ingredientes).kcal - macrosComida(b.ingredientes).kcal)[0];
      if (snack) {
        snack.situacion = 'sobra';
        porVenir = porVenir.filter((c) => c !== snack);
        pendientes = pendientes.filter((c) => c !== snack);
      }
    }
    const original = porVenir.map((c) => macrosComida(c.ingredientes));
    const total = sumarMacros(original);
    porVenir.forEach((c, i) => {
      const receta = recetaPorId[c.recetaId];
      if (!receta) return;
      const reparto = (k) => (total[k] > 0 ? original[i][k] / total[k] : 1 / porVenir.length);
      const meta = {
        p: Math.max(0, restante.p) * reparto('p'),
        c: Math.max(0, restante.c) * reparto('c'),
        g: Math.max(0, restante.g) * reparto('g'),
      };
      meta.kcal = meta.p * 4 + meta.c * 4 + meta.g * 9;
      if (meta.kcal < 80) return; // sin margen: se deja como estaba y se avisa en la vista
      const nuevos = platoCompleto(receta, meta, tipoFranja(c.franja), e.perfil);
      const antes = original[i].kcal;
      const despues = macrosComida(nuevos).kcal;
      if (Math.abs(despues - antes) / antes > 0.05) {
        c.ajustada = true;
        c.ingredientesOriginales = c.ingredientes;
        c.ingredientes = nuevos;
      }
    });
  }

  const planPendiente = sumarMacros(pendientes.map((c) => macrosComida(c.ingredientes)));
  const proyectado = sumarMacros([consumido, planPendiente]);
  const faltan = restar(objetivo, consumido);
  const huecoFinal = restar(objetivo, proyectado);

  return {
    dia, entreno, od, objetivo, registros, consumido, comidas, pendientes, desviado,
    faltan, proyectado, huecoFinal,
    pasado: consumido.kcal > objetivo.kcal * 1.05,
    extras: registros.filter((r) => r.tipo !== 'plan' && !comidas.some((c) => c.franja === r.franja)),
  };
}

// ── Sugerencias para completar el día ─────────────────────────────────────

const RAPIDOS = [
  { a: 'yogur_proteinas', g: 120 }, { a: 'yogur_proteinas', g: 240 }, { a: 'atun_natural', g: 60 }, { a: 'atun_natural', g: 120 },
  { a: 'pavo_fiambre', g: 50 }, { a: 'queso_batido', g: 200 }, { a: 'huevo', g: 120 }, { a: 'claras', g: 200 },
  { a: 'jamon_serrano', g: 40 }, { a: 'queso_burgos_0', g: 125 }, { a: 'platano', g: 110 }, { a: 'manzana', g: 170 },
  { a: 'tortitas_arroz', g: 23 }, { a: 'pan_integral', g: 60 }, { a: 'avena', g: 40 }, { a: 'leche_semi', g: 250 },
  { a: 'almendras', g: 20 }, { a: 'nueces', g: 15 }, { a: 'crema_cacahuete', g: 15 }, { a: 'kiwi', g: 85 },
  // Embutidos magros, más lácteos proteicos y frutos secos tostados
  { a: 'lomo_embuchado', g: 40 }, { a: 'lomo_pavo', g: 60 }, { a: 'pollo_braseado_lonchas', g: 75 }, { a: 'jamon_cocido_extra', g: 60 },
  { a: 'postre_proteinas_fresa', g: 120 }, { a: 'huevos_cocidos', g: 104 }, { a: 'almendra_tostada', g: 20 }, { a: 'pistacho', g: 20 },
  { a: 'tortitas_maiz', g: 23 }, { a: 'bebida_soja', g: 250 }, { a: 'bebida_avena', g: 250 }, { a: 'arroz_vasito', g: 125 },
];
// Proteína en polvo: solo si dices que la tienes
const WHEY = [{ a: 'proteina_whey', g: 30 }, { a: 'proteina_whey', g: 45 }];

/** Qué macros te faltan de verdad (para decírtelo en una frase). */
export function faltas(hueco, entreno = false) {
  const l = [];
  if (hueco.p >= 10) l.push({ macro: 'p', nombre: 'proteína', g: Math.round(hueco.p) });
  if (hueco.c >= (entreno ? 30 : 40)) l.push({ macro: 'c', nombre: 'hidratos', g: Math.round(hueco.c) });
  if (hueco.g >= 15) l.push({ macro: 'g', nombre: 'grasa', g: Math.round(hueco.g) });
  return l;
}

/**
 * Hasta 3 opciones (1 o 2 alimentos) que tapan el hueco de macros que queda, priorizando la proteína.
 * @param hueco macros que faltan { kcal, p, c, g }
 */
export function sugerencias(hueco, perfil) {
  if (hueco.kcal < 120 && hueco.p < 10 && hueco.c < 30 && hueco.g < 15) return [];
  const vaca = !perfil.leche || perfil.leche === 'vaca';
  const base = [...RAPIDOS, ...(perfil.whey ? WHEY : [])]
    .filter((x) => alimento(x.a) && alimentoPermitido(x.a, perfil) && (vaca || !x.a.startsWith('leche_')));
  const opciones = base.map((x) => ({ items: [x], m: macrosDe(x.a, x.g) }));
  const combinadas = [...opciones];
  for (let i = 0; i < opciones.length; i++) {
    for (let j = i + 1; j < opciones.length; j++) {
      if (opciones[i].items[0].a === opciones[j].items[0].a) continue;
      combinadas.push({ items: [...opciones[i].items, ...opciones[j].items], m: sumarMacros([opciones[i].m, opciones[j].m]) });
    }
  }
  const pesoP = hueco.p > 15 ? 3 : 1;
  const pesoC = hueco.c > 30 ? 1.5 : 0.3;
  const pesoG = hueco.g > 15 ? 1 : 0.2;
  const puntuar = ({ m, items }) => {
    const exceso = Math.max(0, m.kcal - Math.max(hueco.kcal, 150) * 1.1);
    return Math.abs(m.kcal - Math.max(hueco.kcal, 0)) / Math.max(hueco.kcal, 150)
      + (pesoP * Math.abs(m.p - Math.max(hueco.p, 0))) / Math.max(hueco.p, 20)
      + (pesoC * Math.abs(m.c - Math.max(hueco.c, 0))) / Math.max(hueco.c, 30)
      + (pesoG * Math.abs(m.g - Math.max(hueco.g, 0))) / Math.max(hueco.g, 10)
      + exceso / 100 + (items.length - 1) * 0.15;
  };
  const vistas = new Set();
  const lista = combinadas
    .map((o) => ({ ...o, puntos: puntuar(o) }))
    .sort((a, b) => a.puntos - b.puntos)
    .filter((o) => {
      const clave = o.items.map((i) => i.a).sort().join('+');
      if (vistas.has(clave)) return false;
      vistas.add(clave);
      return true;
    })
    .slice(0, 3);
  // Si falta bastante proteína y tienes proteína en polvo, el batido siempre sale como opción (la más rápida)
  const conBatido = lista.some((o) => o.items.some((i) => i.a === 'proteina_whey'));
  if (perfil.whey && hueco.p >= 15 && !conBatido) {
    const g = hueco.p >= 30 ? 45 : 30;
    lista.splice(Math.min(lista.length, 2), 1, { items: [{ a: 'proteina_whey', g }], m: macrosDe('proteina_whey', g) });
  }
  return lista.map((o) => ({
    ...o,
    nombre: o.items.length === 1 && o.items[0].a === 'proteina_whey' ? 'Batido de proteína' : o.items.map((i) => alimento(i.a).nombre).join(' + '),
  }));
}

export { CERO };

function restarHora(a, b) {
  const m = (h) => Number(h.slice(0, 2)) * 60 + Number(h.slice(3, 5));
  return m(a) - m(b);
}
