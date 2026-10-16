// Batch cooking: qué cocinar de una vez (por ejemplo el domingo) para los próximos días del menú,
// en qué orden hacerlo para tardar poco, cómo conservarlo y cómo no perder nutrientes por el camino.
import { ALIMENTOS } from '../data/alimentos.js';
import { comoCocinar } from '../data/coccion.js';
import { recetaPorId } from './planificador.js';
import { cantidadTexto } from './nutricion.js';

// Bloques de trabajo en el orden en que conviene empezarlos (lo que más tarda, primero)
const BASES = {
  tuberculos: {
    orden: 1, titulo: 'Patata y batata', emoji: '🥔', minutos: 10, ids: ['patata', 'batata'],
    conserva: 'Nevera 4 días. Asadas con piel aguantan mejor; pélalas el día que las comas.',
    nutriente: 'Enfriadas en la nevera forman almidón resistente: menos pico de glucosa y mejor para tu intestino, aunque las recalientes.',
  },
  cocer: {
    orden: 2, titulo: 'Arroz y cuscús', emoji: '🍚', minutos: 5, ids: ['arroz', 'arroz_integral', 'cuscus'],
    conserva: 'Enfría el arroz en menos de 1 h (extiéndelo en una bandeja) y a la nevera: 3 días. Para más, congélalo en raciones.',
    nutriente: 'Cuécelo al dente y escúrrelo: pasado de cocción sube más la glucosa. Enfriarlo también forma almidón resistente.',
  },
  proteinas: {
    orden: 3, titulo: 'Carnes', emoji: '🍗', minutos: 15,
    ids: ['pollo_pechuga', 'pollo_contramuslo', 'pavo_pechuga', 'cerdo_lomo', 'cerdo_solomillo', 'picada_pollo', 'picada_vacuno', 'ternera_filete'],
    conserva: 'Nevera 3 días. Lo del día 4 en adelante, al congelador nada más enfriar.',
    nutriente: 'No la hagas de más: sácala justo al hacerse (pollo a 74 °C por dentro). Recocinada se queda seca y pierde vitaminas B.',
  },
  pescado: {
    orden: 4, titulo: 'Pescado', emoji: '🐟', minutos: 10, ids: ['salmon', 'merluza', 'langostino'],
    conserva: 'Nevera solo 2 días. Si lo comes más tarde, mejor hazlo ese mismo día (son 10 min en air fryer o microondas).',
    nutriente: 'Su omega-3 se estropea con el calor fuerte y el tiempo: cocínalo poco y recaliéntalo suave (microondas a media potencia).',
  },
  verduras: {
    orden: 5, titulo: 'Verduras cocinadas', emoji: '🥦', minutos: 10,
    ids: ['brocoli', 'judias_verdes', 'calabacin', 'champinones', 'berenjena', 'pimiento_rojo', 'zanahoria', 'esparragos', 'espinacas', 'cebolla'],
    conserva: 'Nevera 3-4 días, en táper aparte de la salsa para que no se ablanden.',
    nutriente: 'Al vapor o en microondas con muy poca agua conservan hasta el doble de vitamina C que hervidas. Déjalas algo crujientes: terminan de hacerse al recalentar.',
  },
  cortar: {
    orden: 6, titulo: 'Verdura para lavar y cortar', emoji: '🔪', minutos: 10, ids: ['lechuga', 'pepino', 'tomate', 'tomate_cherry'],
    conserva: 'Lávala, sécala bien y guárdala con papel de cocina en el táper: 3-4 días.',
    nutriente: 'Córtala lo más tarde que puedas: cuanto más superficie al aire, más vitaminas se pierden.',
  },
};
const PASTA = ['pasta', 'pasta_larga', 'pasta_integral'];
const NOMBRE_FRANJA = { comida: 'comida', cena: 'cena' };
const nombreDia = (iso) => ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'][new Date(`${iso}T12:00:00`).getDay()];

// Reglas de oro para conservar y recalentar sin riesgos
export const CONSERVAR = [
  { icono: 'snowflake', texto: 'Enfría rápido: nada más de 2 h fuera. Reparte en tápers planos y a la nevera aunque estén templados.' },
  { icono: 'package', texto: 'Tápers de vidrio con tapa, uno por comida y con el día apuntado. Así solo abres lo que vas a comer.' },
  { icono: 'calendar', texto: 'Nevera: carne y arroz 3 días, pescado 2, legumbres y guisos 4. Lo demás, al congelador (hasta 3 meses).' },
  { icono: 'thermometer-sun', texto: 'Descongela en la nevera la noche antes, nunca en la encimera. Recalienta hasta que humee por dentro, y solo una vez.' },
  { icono: 'droplet', texto: 'Las salsas y aliños, aparte: el aceite y el limón se añaden al servir y la comida no se ablanda.' },
];

/**
 * @param plan menú
 * @param desde fecha ISO desde la que preparar
 * @param dias número de días a cubrir (lo normal: 3-4)
 * @param aparatos con qué cocinas (orden de preferencia)
 */
export function planBatch(plan, desde, dias = 4, aparatos = undefined) {
  const seleccion = plan.dias.filter((d) => d.fecha >= desde).slice(0, dias);
  const recetasBatch = {};
  const bases = Object.fromEntries(Object.keys(BASES).map((k) => [k, {}]));
  const tapers = [];
  let huevosCocidos = 0;
  const pasta = {};

  for (const dia of seleccion) {
    for (const c of dia.comidas) {
      const receta = recetaPorId[c.recetaId];
      if (!receta || !['comida', 'cena'].includes(c.franja)) continue;
      const cuando = `${nombreDia(dia.fecha)} ${NOMBRE_FRANJA[c.franja]}`;
      tapers.push({ cuando, nombre: receta.nombre, emoji: receta.emoji, pescado: c.ingredientes.some((i) => BASES.pescado.ids.includes(i.a)), fecha: dia.fecha });
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
  for (const [k, base] of Object.entries(BASES)) {
    const items = Object.entries(bases[k]);
    if (!items.length) continue;
    // El pescado de dentro de 3 días o más no se adelanta
    const lejos = k === 'pescado' && seleccion.length > 2;
    tareas.push({
      tipo: 'base', orden: base.orden, emoji: base.emoji, titulo: base.titulo, minutos: base.minutos,
      conserva: base.conserva, nutriente: base.nutriente,
      aviso: lejos ? 'Cocina hoy solo el de los próximos 2 días; el resto, el mismo día.' : null,
      lineas: items.map(([a, b]) => ({
        texto: `${cantidadTexto(a, b.g)} de ${ALIMENTOS[a].nombre.toLowerCase()}`,
        cuando: [...b.cuando].join(', '),
        como: comoCocinar(a, aparatos),
      })),
    });
  }
  for (const r of Object.values(recetasBatch)) {
    tareas.push({
      tipo: 'receta', orden: 2.5, emoji: r.receta.emoji, receta: r.receta, minutos: r.receta.tiempo,
      titulo: r.receta.nombre,
      detalle: `${r.raciones} ${r.raciones === 1 ? 'ración' : 'raciones'} · ${r.cuando.join(', ')}`,
      ingredientes: Object.entries(r.ingredientes).map(([a, g]) => ({ a, g })),
      conserva: 'Nevera 4 días. Los guisos y legumbres están incluso mejor al día siguiente; también se congelan bien.',
    });
  }
  if (huevosCocidos) {
    tareas.push({
      tipo: 'base', orden: 0, emoji: '🥚', titulo: 'Huevos cocidos', minutos: 2,
      conserva: 'Con cáscara aguantan 5 días en la nevera.', nutriente: '10 min y a agua fría: más tiempo vuelve verde la yema y pierde textura.',
      lineas: [{ texto: `${huevosCocidos} huevos`, cuando: '', como: comoCocinar('huevo', aparatos) }],
    });
  }
  tareas.sort((a, b) => a.orden - b.orden);
  const notas = [];
  if (Object.keys(pasta).length) notas.push({ emoji: '🍝', titulo: 'La pasta, mejor el mismo día', texto: 'Se pasa si la cueces antes. Ten la salsa hecha y cuece la pasta en 10 minutos.' });

  // Tiempo total: los bloques se solapan (mientras se hace una cosa, preparas la siguiente)
  const minutos = Math.round(tareas.reduce((s, t) => s + (t.minutos || 10), 0) * 0.7 + 10);
  return { dias: seleccion.map((d) => d.fecha), tareas, notas, tapers, minutos };
}
