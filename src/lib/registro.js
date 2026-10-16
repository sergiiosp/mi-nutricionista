// Ayudas para registrar comida: iconos de alimentos, raciones de receta y creación de registros.
import { ALIMENTOS } from '../data/alimentos.js';
import { macrosDe, macrosComida, escalarReceta, objetivosDia, cantidadTexto } from './nutricion.js';
import { horarioDia, objetivoFranja } from './horario.js';
import { macrosProducto } from './off.js';
import { nuevoId, horaActual } from '../stores/estado.js';

export const EMOJI_ALIMENTO = {
  pollo_pechuga: '🍗', pollo_contramuslo: '🍗', pavo_pechuga: '🦃', ternera_filete: '🥩', picada_vacuno: '🥩', picada_pollo: '🍗',
  cerdo_lomo: '🥩', cerdo_solomillo: '🥩', salmon: '🐟', merluza: '🐟', atun_natural: '🐟', langostino: '🦐', huevo: '🥚', claras: '🥚',
  tofu: '🧊', pavo_fiambre: '🥓', jamon_serrano: '🍖', queso_batido: '🥛', yogur_proteinas: '🥛', queso_burgos_0: '🧀', mozzarella: '🧀',
  queso_rallado: '🧀', garbanzos: '🫘', lentejas: '🫘', alubias: '🫘', hummus: '🫘', arroz: '🍚', arroz_integral: '🍚', pasta: '🍝',
  pasta_larga: '🍝', pasta_integral: '🍝', cuscus: '🍚', patata: '🥔', batata: '🍠', avena: '🥣', pan_integral: '🥖', pan_molde: '🍞',
  tortitas_arroz: '🍘', tortilla_trigo: '🫓', maiz: '🌽', platano: '🍌', manzana: '🍎', pera: '🍐', kiwi: '🥝', naranja: '🍊', fresas: '🍓',
  arandanos: '🫐', brocoli: '🥦', espinacas: '🥬', calabacin: '🥒', pimiento_rojo: '🫑', cebolla: '🧅', ajo: '🧄', tomate: '🍅',
  tomate_cherry: '🍅', tomate_triturado: '🍅', tomate_frito: '🍅', lechuga: '🥬', zanahoria: '🥕', champinones: '🍄', judias_verdes: '🫛',
  pepino: '🥒', berenjena: '🍆', wok_verduras: '🥗', pisto: '🍅', esparragos: '🥦', aguacate: '🥑', aceite: '🫒', nueces: '🌰',
  almendras: '🌰', crema_cacahuete: '🥜', chia: '🌱', leche_semi: '🥛', leche_desnatada: '🥛', bebida_soja: '🥛', miel: '🍯', cacao: '🍫',
  confitura: '🍓', salsa_soja: '🍶', caldo_pollo: '🍲', vinagre: '🍶', mostaza: '🌭',
  lomo_embuchado: '🥓', cabecero_lomo: '🥓', lomo_pavo: '🦃', pollo_braseado_lonchas: '🍗', jamon_cocido_extra: '🍖',
  almendra_tostada: '🌰', pistacho: '🌰', pipas_girasol: '🌱', pipas_calabaza: '🌱', arroz_microondas: '🍚', arroz_vasito: '🍚',
  patata_microondas: '🥔', alubias_pintas: '🫘', aceitunas_negras: '🫒', pimientos_asados: '🫑', proteina_whey: '🥛',
  bebida_avena: '🥛', bebida_almendra: '🥛', huevos_cocidos: '🥚', tortitas_maiz: '🍘',
};
export const emojiAlimento = (id) => EMOJI_ALIMENTO[id] || '🍽️';

/** Ración de una receta ajustada a tu objetivo para esa franja (día de descanso). */
export function racionReceta(receta, perfil, objetivos, franjaId) {
  const { franjas } = horarioDia(perfil, false);
  const f = franjas.find((x) => x.id === franjaId)
    || franjas.find((x) => receta.tipos.includes(x.tipo))
    || { pct: 0.3, tipo: 'comida' };
  return escalarReceta(receta, objetivoFranja(objetivosDia(objetivos, false), f)).ingredientes;
}

/** Datos para mostrar y calcular cualquier cosa registrable. */
export function describir(item, ctx) {
  switch (item.tipo) {
    case 'alimento': {
      const a = ALIMENTOS[item.id];
      return { nombre: a.nombre, emoji: emojiAlimento(item.id), unidad: a.medida || 'g', macros: (g) => macrosDe(item.id, g), texto: (g) => cantidadTexto(item.id, g) };
    }
    case 'producto':
      return { nombre: item.producto.nombre, marca: item.producto.marca, imagen: item.producto.imagen, emoji: '🛒', unidad: 'g', macros: (g) => macrosProducto(item.producto, g), texto: (g) => `${Math.round(g)} g` };
    case 'receta': {
      const base = racionReceta(item.receta, ctx.perfil, ctx.objetivos, ctx.franja);
      const m1 = macrosComida(base);
      return { nombre: item.receta.nombre, emoji: item.receta.emoji, receta: item.receta, raciones: true, base, macros: (r) => escalarM(m1, r), texto: (r) => textoRaciones(r) };
    }
    case 'propia':
      return { nombre: item.propia.nombre, emoji: item.propia.emoji || '🍱', raciones: true, macros: (r) => escalarM(item.propia.macros, r), texto: (r) => textoRaciones(r) };
    case 'fuera':
      return { nombre: item.plato.nombre, emoji: item.plato.emoji, raciones: true, tamanos: true, macros: (k) => escalarM(item.plato, k), texto: (k) => (k === 1 ? 'tamaño normal' : k < 1 ? 'tamaño pequeño' : 'tamaño grande') };
    default:
      return null;
  }
}

const escalarM = (m, k) => ({ kcal: m.kcal * k, p: m.p * k, c: m.c * k, g: m.g * k, f: (m.f || 0) * k });
const textoRaciones = (r) => (r === 1 ? '1 ración' : `${String(r).replace('.', ',')} raciones`);

export function crearRegistro({ item, cantidad, fecha, franja, hora, foto, ctx = {} }) {
  const d = describir(item, { ...ctx, franja: ctx.franja || franja });
  const ref = item.tipo === 'alimento' ? item.id : item.tipo === 'producto' ? item.producto.id : item.tipo === 'receta' ? item.receta.id : item.tipo === 'propia' ? item.propia.id : item.plato.id;
  return {
    id: nuevoId(),
    fecha,
    hora: hora || horaActual(),
    franja: franja || null,
    tipo: item.tipo,
    ref,
    nombre: d.nombre,
    emoji: d.emoji,
    imagen: item.tipo === 'producto' ? item.producto.imagen : item.tipo === 'receta' ? `img/recetas/${item.receta.id}.webp` : null,
    cantidad: { valor: cantidad, texto: d.texto(cantidad) },
    macros: d.macros(cantidad),
    item: item.tipo === 'producto' ? { tipo: 'producto', producto: item.producto } : undefined,
    foto: foto || undefined,
  };
}
