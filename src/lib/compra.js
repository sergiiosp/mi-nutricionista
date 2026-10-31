// Lista de la compra: agrega los ingredientes del plan y los convierte en envases de Mercadona.

import { ESPECIAS } from '../data/alimentos.js';
import { PRECIOS } from '../data/precios.js';
import { alimento, producto, gramosPorEnvase, costeDe } from './nutricion.js';
import { recetaPorId } from './planificador.js';

// Orden aproximado de los pasillos para recorrer la tienda
const ORDEN_PASILLOS = [
  'Fruta y verdura', 'Carne', 'Marisco y pescado', 'Charcutería y quesos', 'Huevos, leche y mantequilla',
  'Postres y yogures', 'Panadería y pastelería', 'Cereales y galletas', 'Arroz, legumbres y pasta',
  'Conservas, caldos y cremas', 'Aceite, especias y salsas', 'Aperitivos', 'Pizzas y platos preparados',
  'Azúcar, caramelos y chocolate', 'Cacao, café e infusiones', 'Congelados',
];

/**
 * @param plan  plan generado
 * @param dias  índices de los días a incluir (por defecto todos)
 */
// «Pollo tikka en air fryer con arroz y salsa de yogur» → «Pollo tikka en air fryer»
function nombreCorto(n = '') {
  const antes = n.split(' con ')[0];
  return antes.includes(' ') ? antes : n.replace(/ \(.*?\)/g, '').split(',')[0];
}

export function listaCompra(plan, dias = null) {
  const totales = {};
  const platos = {}; // para qué platos es cada cosa (la misma cesta sirve para recetas distintas)
  const especias = new Set();
  plan.dias.forEach((dia, i) => {
    if (dias && !dias.includes(i)) return;
    if (dia.viaje) return; // de viaje compras allí o comes fuera
    for (const c of dia.comidas) {
      if (c.libre) continue; // comida libre: no se compra nada para ella
      const nombre = nombreCorto(recetaPorId[c.recetaId]?.nombre);
      for (const ing of c.ingredientes) {
        totales[ing.a] = (totales[ing.a] || 0) + ing.g;
        (platos[ing.a] ||= new Set()).add(ing.extra ? 'acompañamientos' : nombre);
      }
      for (const e of recetaPorId[c.recetaId]?.especias || []) especias.add(e);
    }
  });

  const items = Object.entries(totales).map(([id, gramos]) => {
    const a = alimento(id);
    const p = producto(id);
    const bruto = gramos / (a.rendimiento || 1);
    const envase = gramosPorEnvase(id);
    // 5 % de tolerancia: si necesitas 410 g y el envase es de 400 g, compras uno
    const envases = envase ? Math.max(1, Math.ceil(bruto / envase - 0.05)) : 1;
    return {
      id,
      nombre: a.nombre,
      gramos,
      bruto,
      envases,
      producto: p,
      coste: p ? envases * p.precio : 0,
      costeConsumo: costeDe(id, gramos),
      despensa: !!a.despensa,
      pasillo: p?.categoria || 'Otros',
      platos: [...(platos[id] || [])],
    };
  });

  const pasillos = {};
  for (const it of items.filter((i) => !i.despensa)) (pasillos[it.pasillo] ||= []).push(it);
  const grupos = Object.entries(pasillos)
    .sort(([a], [b]) => indicePasillo(a) - indicePasillo(b))
    .map(([nombre, lista]) => ({ nombre, items: lista.sort((x, y) => x.nombre.localeCompare(y.nombre)) }));

  const despensa = items.filter((i) => i.despensa).sort((x, y) => x.nombre.localeCompare(y.nombre));
  const listaEspecias = [...especias].map((e) => ({
    id: e,
    nombre: ESPECIAS[e]?.nombre || e,
    producto: ESPECIAS[e]?.mercadona ? PRECIOS[ESPECIAS[e].mercadona] : null,
  }));

  return {
    grupos,
    despensa,
    especias: listaEspecias,
    total: items.filter((i) => !i.despensa).reduce((s, i) => s + i.coste, 0),
    totalDespensa: despensa.reduce((s, i) => s + i.coste, 0),
    costeConsumo: items.reduce((s, i) => s + i.costeConsumo, 0),
  };
}

function indicePasillo(nombre) {
  const i = ORDEN_PASILLOS.indexOf(nombre);
  return i === -1 ? 99 : i;
}

// "Bandeja · 0.52 kg" → "bandeja de 520 g"; "Malla · 3 kg" → "malla de 3 kg"
export function formatoEnvase(p) {
  const [envase, tam] = (p.formato || '').includes(' · ') ? p.formato.split(' · ') : [/\d/.test(p.formato) ? '' : p.formato, /\d/.test(p.formato) ? p.formato : ''];
  let medida = '';
  const m = /^([\d.]+) (kg|l|ud)$/.exec(tam || '');
  if (m) {
    const v = Number(m[1]);
    if (m[2] === 'ud') medida = `${v} ud`;
    else if (v < 1) medida = `${Math.round(v * 1000)} ${m[2] === 'kg' ? 'g' : 'ml'}`;
    else medida = `${String(v).replace('.', ',')} ${m[2]}`;
  } else if (p.contenido && p.unidadContenido === 'g') {
    medida = `~${Math.round(p.contenido)} g`; // peso variable (p. ej. pescado congelado)
  }
  const nombre = (envase || 'envase').toLowerCase();
  return medida ? `${nombre} de ${medida}` : nombre;
}

// Cantidad que hay que coger en la tienda, en texto
export function textoEnvases(item) {
  const p = item.producto;
  if (!p) return `${Math.round(item.bruto)} g`;
  if (/^pieza/i.test(p.formato || '')) {
    // Fruta y verdura que se vende por unidades
    return `${item.envases} ${item.envases === 1 ? 'pieza' : 'piezas'}`;
  }
  return `${item.envases} × ${formatoEnvase(p)}`;
}

export function textoCompartir(lista) {
  const lineas = ['🛒 Lista de la compra (Mercadona)', ''];
  for (const g of lista.grupos) {
    lineas.push(`— ${g.nombre} —`);
    for (const it of g.items) lineas.push(`☐ ${it.producto?.nombre || it.nombre}: ${textoEnvases(it)}`);
    lineas.push('');
  }
  if (lista.despensa.length) {
    lineas.push('— Revisa si te queda —');
    for (const it of lista.despensa) lineas.push(`☐ ${it.producto?.nombre || it.nombre}`);
    lineas.push('');
  }
  lineas.push(`Total estimado: ${lista.total.toFixed(2).replace('.', ',')} €`);
  return lineas.join('\n');
}
