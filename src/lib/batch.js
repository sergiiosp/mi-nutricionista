// Batch cooking: qué cocinar de una vez (por ejemplo el domingo) para los próximos días del menú.
import { ALIMENTOS } from '../data/alimentos.js';
import { recetaPorId } from './planificador.js';
import { cantidadTexto } from './nutricion.js';

const BASES = {
  cocer: { titulo: 'Cereales para cocer', emoji: '🍚', ids: ['arroz', 'arroz_integral', 'cuscus'], consejo: 'Cuécelos al dente, enfríalos rápido y guárdalos en táper: aguantan 3-4 días en la nevera.' },
  tuberculos: { titulo: 'Patata y batata', emoji: '🥔', ids: ['patata', 'batata'], consejo: 'Ásalas o cuécelas enteras con piel; pélalas el día que las comas.' },
  proteinas: { titulo: 'Carnes para cocinar', emoji: '🍗', ids: ['pollo_pechuga', 'pollo_contramuslo', 'pavo_pechuga', 'cerdo_lomo', 'cerdo_solomillo', 'picada_pollo', 'picada_vacuno'], consejo: 'Hazlas a la plancha o al horno con sal y especias neutras. En nevera, 3 días; lo demás, al congelador.' },
  verduras: { titulo: 'Verduras para lavar y cortar', emoji: '🔪', ids: ['cebolla', 'pimiento_rojo', 'calabacin', 'zanahoria', 'berenjena', 'champinones', 'pepino', 'tomate', 'lechuga'], consejo: 'Córtalas y guárdalas en táper con papel de cocina para que no se humedezcan (3-4 días).' },
};
const PASTA = ['pasta', 'pasta_larga', 'pasta_integral'];

const nombreDia = (iso) => ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'][new Date(`${iso}T12:00:00`).getDay()];

/**
 * @param plan menú
 * @param desde fecha ISO desde la que preparar
 * @param dias número de días a cubrir (lo normal: 3-4)
 */
export function planBatch(plan, desde, dias = 4) {
  const seleccion = plan.dias.filter((d) => d.fecha >= desde).slice(0, dias);
  const recetasBatch = {};
  const bases = Object.fromEntries(Object.keys(BASES).map((k) => [k, {}]));
  let huevosCocidos = 0;
  const pasta = {};

  for (const dia of seleccion) {
    for (const c of dia.comidas) {
      const receta = recetaPorId[c.recetaId];
      if (!receta || !['comida', 'cena'].includes(c.franja)) continue;
      const cuando = `${nombreDia(dia.fecha)} ${c.franja}`;
      if (receta.batch) {
        const r = (recetasBatch[receta.id] ||= { receta, raciones: 0, cuando: [], ingredientes: {} });
        r.raciones++;
        r.cuando.push(cuando);
        for (const i of c.ingredientes) r.ingredientes[i.a] = (r.ingredientes[i.a] || 0) + i.g;
        continue;
      }
      for (const i of c.ingredientes) {
        for (const [k, base] of Object.entries(BASES)) {
          if (base.ids.includes(i.a)) {
            const b = (bases[k][i.a] ||= { g: 0, cuando: new Set() });
            b.g += i.g;
            b.cuando.add(cuando);
          }
        }
        if (PASTA.includes(i.a)) pasta[i.a] = (pasta[i.a] || 0) + i.g;
      }
      if (receta.pasos.some((p) => /huevo(s)? cocido|cuece (el|los) huevo/i.test(p))) {
        huevosCocidos += Math.round((c.ingredientes.find((i) => i.a === 'huevo')?.g || 0) / 60);
      }
    }
  }

  const tareas = [];
  for (const r of Object.values(recetasBatch)) {
    tareas.push({
      tipo: 'receta', emoji: r.receta.emoji, receta: r.receta,
      titulo: `${r.receta.nombre}`,
      detalle: `${r.raciones} ${r.raciones === 1 ? 'ración' : 'raciones'} · ${r.cuando.join(', ')}`,
      ingredientes: Object.entries(r.ingredientes).map(([a, g]) => ({ a, g })),
    });
  }
  for (const [k, base] of Object.entries(BASES)) {
    const items = Object.entries(bases[k]);
    if (!items.length) continue;
    tareas.push({
      tipo: 'base', emoji: base.emoji, titulo: base.titulo, consejo: base.consejo,
      lineas: items.map(([a, b]) => ({ texto: `${cantidadTexto(a, b.g)} de ${ALIMENTOS[a].nombre.toLowerCase()}`, cuando: [...b.cuando].join(', ') })),
    });
  }
  if (huevosCocidos) tareas.push({ tipo: 'base', emoji: '🥚', titulo: 'Huevos cocidos', consejo: 'Cuécelos 10 min y guárdalos con cáscara: aguantan 5 días.', lineas: [{ texto: `Cuece ${huevosCocidos} huevos`, cuando: '' }] });
  if (Object.keys(pasta).length) tareas.push({ tipo: 'nota', emoji: '🍝', titulo: 'La pasta, mejor el mismo día', consejo: 'Se pasa si la cueces antes. Ten la salsa hecha y cuece la pasta en 10 minutos.' });

  return { dias: seleccion.map((d) => d.fecha), tareas };
}
