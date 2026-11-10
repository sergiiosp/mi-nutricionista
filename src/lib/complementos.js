// Complementos: cuando un plato, sin desproporcionarse, no llega a lo que pide tu día, se añade algo que
// pegue con esa comida (unas tortitas de maíz, pan o fruta) en vez de inflar un ingrediente. La proteína
// solo se completa si de verdad falta (un batido o un yogur +Proteínas): ni proteína ni grasa de más.
import { alimento, alimentoPermitido, escalarReceta, macrosComida, macrosDe, cantidadTexto } from './nutricion.js';

// Por tipo de comida, en orden de preferencia
const HIDRATOS = {
  desayuno: ['platano', 'kiwi', 'pan_integral', 'tortitas_maiz'],
  snack: ['platano', 'tortitas_maiz', 'mandarina', 'tortitas_arroz'],
  comida: ['pan_integral', 'tortitas_maiz', 'platano', 'mandarina'],
  cena: ['tortitas_maiz', 'pan_integral', 'kiwi', 'mandarina'],
};
const PROTEINA = {
  desayuno: ['yogur_proteinas', 'queso_batido', 'bebida_soja'],
  snack: ['proteina_whey', 'bebida_proteinas_fresa', 'yogur_proteinas', 'gelatina_proteinas', 'bebida_soja'],
  comida: ['yogur_proteinas', 'queso_batido', 'gelatina_proteinas', 'edamame'],
  cena: ['yogur_proteinas', 'queso_batido', 'gelatina_proteinas', 'edamame'],
};
// Días de carga de hidratos: complementos de poca fibra y casi sin grasa, como se comerían de verdad
// (pan con la comida, zumo y un plátano en el desayuno), en vez de fruta y tortitas en cada comida
const CARGA = {
  desayuno: ['zumo_naranja', 'platano', 'pan_blanco'],
  snack: ['zumo_naranja', 'platano', 'tortitas_arroz'],
  comida: ['pan_blanco', 'zumo_naranja'],
  cena: ['pan_blanco'],
};
// En la carga y el día de carrera, en la comida y la cena el hidrato del plato (la pasta, el arroz, la patata)
// puede crecer mucho más que la proteína (aunque quede poca proteína por comer): mejor más pasta que pan y tortitas al lado
const ESCALA_CARGA = [{ P: [0.5, 2.6], C: [0.35, 4], G: [0.4, 2.2] }, { proporcion: { P: { C: 6, G: 6 }, C: { P: 6, G: 6 }, G: { P: 1.5, C: 1.5 } } }];
// En la carga, como mucho un plátano por comida
const MAX_CARGA = { platano: 110 };
// La carga y el día de carrera van con pan blanco (poca fibra) en vez de integral
const REFINADO = { pan_integral: 'pan_blanco', pan_molde: 'pan_blanco', arroz_integral: 'arroz', pasta_integral: 'pasta' };
export const refinado = (id) => REFINADO[id] || id;
// Lo máximo que tiene sentido añadir de cada uno
const MAX = { pan_blanco: 120, zumo_naranja: 330, platano: 220, kiwi: 170, mandarina: 210, pan_integral: 80, tortitas_maiz: 45, tortitas_arroz: 46, proteina_whey: 30, bebida_proteinas_fresa: 280, yogur_proteinas: 120, queso_batido: 200, gelatina_proteinas: 200, bebida_soja: 300, edamame: 150 };
// Cómo se nombra en una frase («+ 4 tortitas de maíz y 1 plátano»)
const NOMBRE = { tortitas_maiz: 'de maíz', tortitas_arroz: 'de arroz', pan_integral: 'de pan', pan_blanco: 'de pan', zumo_naranja: 'de zumo de naranja', proteina_whey: 'de proteína en batido', bebida_proteinas_fresa: 'de bebida +Proteínas', yogur_proteinas: 'de yogur +Proteínas', queso_batido: 'de queso batido', gelatina_proteinas: 'de gelatina +Proteínas', bebida_soja: 'de bebida de soja', edamame: 'de edamame' };

const TIPO_FRANJA = { desayuno: 'desayuno', media: 'snack', comida: 'comida', merienda: 'snack', cena: 'cena', recena: 'recena' };
export const tipoFranja = (id) => TIPO_FRANJA[id] || id;

/** Gramos de un alimento para cubrir lo que falta de un macro (o de kcal), en cantidades que se compran y se comen. */
function gramosPara(id, falta, clave, max = MAX[id]) {
  const porGramo = macrosDe(id, 100)[clave] / 100;
  if (!(porGramo > 0)) return 0;
  const a = alimento(id);
  const g = Math.min(max || 100, falta / porGramo);
  if (a.unidad) {
    const n = Math.round(g / a.unidad.g);
    return n >= 1 ? n * a.unidad.g : 0;
  }
  return Math.round(g / 10) * 10 >= 20 ? Math.round(g / 10) * 10 : 0;
}

const permitido = (perfil, tiene) => (id) => !tiene.has(id) && alimentoPermitido(id, perfil) && (id !== 'proteina_whey' || perfil.whey);

/**
 * Escala un plato a su objetivo { kcal, p, c, g } y, si sin desproporcionarse no llega, le añade complementos
 * (marcados con extra: true). Si falta proteína (más de 10 g), primero un complemento de proteína y el plato
 * se reescala con lo que queda, para no pasarse de kcal; luego, las kcal que falten, con hidratos.
 * En un día de carga (opciones.carga), lo que le falte de hidratos al plato se completa con hidratos de poca fibra
 * y el plato se ajusta al resto, para que no los compense con grasa. En la carga y el día de carrera
 * (opciones.carrera), ningún complemento lácteo y pan blanco en vez de integral.
 */
export function platoCompleto(receta, obj, tipo, perfil, { carga = false, carrera = false } = {}) {
  const ligero = carga || carrera;
  const escala = ligero && ['comida', 'cena'].includes(tipo) ? ESCALA_CARGA : [];
  let { ingredientes } = escalarReceta(receta, obj, ...escala);
  if (!HIDRATOS[tipo] || !perfil) return ingredientes;
  const tiene = new Set(ingredientes.map((i) => i.a));
  const sinLacteo = (id) => !ligero || alimento(id)?.dieta !== 'lacteo';
  const vale = (id) => permitido(perfil, tiene)(id) && sinLacteo(id);
  const extras = [];
  const añadir = (id, g) => { extras.push({ a: id, g, extra: true }); tiene.add(id); };

  const faltaP = obj.p - macrosComida(ingredientes).p;
  if (faltaP >= 10) {
    const id = PROTEINA[tipo].find(vale);
    const g = id ? gramosPara(id, faltaP, 'p') : 0;
    if (g) {
      añadir(id, g);
      const m = macrosDe(id, g);
      ingredientes = escalarReceta(receta, { kcal: Math.max(0, obj.kcal - m.kcal), p: Math.max(0, obj.p - m.p), c: Math.max(0, obj.c - m.c), g: Math.max(0, obj.g - m.g) }, ...escala).ingredientes;
    }
  }
  // Carga y día de carrera, comida y cena: los hidratos que falten los pone la pasta, el arroz o la patata del plato
  // (hasta 4 veces la receta), no pan ni tortitas al lado. Se cuenta por gramos, aunque suba un poco la proteína.
  const masDelPlato = escala.length > 0;
  if (masDelPlato) {
    const faltaC = obj.c - macrosComida([...ingredientes, ...extras]).c;
    const deC = ingredientes.filter((_, i) => receta.ingredientes[i]?.rol === 'C');
    const cDeC = macrosComida(deC).c;
    if (faltaC >= 15 && cDeC > 0) {
      const tope = Math.min(...ingredientes.map((ing, i) => (receta.ingredientes[i]?.rol === 'C' ? (4 * receta.ingredientes[i].g) / ing.g : Infinity)));
      const k = Math.min(1 + faltaC / cDeC, tope);
      ingredientes = ingredientes.map((ing, i) => (receta.ingredientes[i]?.rol === 'C' ? { ...ing, g: Math.round((ing.g * k) / 5) * 5 } : ing));
    }
  }
  if (carga) {
    let faltaC = obj.c - macrosComida([...ingredientes, ...extras]).c;
    const antes = extras.length;
    for (const id of masDelPlato ? [] : CARGA[tipo] || []) {
      if (faltaC < 20) break;
      if (!vale(id)) continue;
      const g = gramosPara(id, faltaC, 'c', MAX_CARGA[id] ?? MAX[id]);
      if (!g) continue;
      añadir(id, g);
      faltaC -= macrosDe(id, g).c;
    }
    if (extras.length > antes) {
      const m = macrosComida(extras);
      ingredientes = escalarReceta(receta, { kcal: Math.max(0, obj.kcal - m.kcal), p: Math.max(0, obj.p - m.p), c: Math.max(0, obj.c - m.c), g: Math.max(0, obj.g - m.g) }, ...escala).ingredientes;
    }
  }
  // Las kcal que faltan, con hidratos: es lo que más pide el entreno y no sube proteína ni grasa
  const umbral = Math.max(60, obj.kcal * 0.08);
  let falta = obj.kcal - macrosComida([...ingredientes, ...extras]).kcal;
  // En la carga y el día de carrera, sin fruta con mucha fibra (kiwi); en su comida y su cena, nada al lado
  for (const id of masDelPlato ? [] : ligero ? [...new Set([...(CARGA[tipo] || []), ...HIDRATOS[tipo].map(refinado)])].filter((id) => id !== 'kiwi') : HIDRATOS[tipo]) {
    if (falta < umbral) break;
    if (!vale(id)) continue;
    const g = gramosPara(id, falta, 'kcal');
    if (!g) continue;
    añadir(id, g);
    falta -= macrosDe(id, g).kcal;
  }
  return [...ingredientes, ...extras];
}

/** Los complementos de una comida en una frase: «4 tortitas de maíz y 1 plátano». */
export function textoComplementos(ingredientes) {
  const partes = ingredientes.filter((i) => i.extra).map((i) => `${cantidadTexto(i.a, i.g).replace(/ \(\d+ g\)$/, '')}${NOMBRE[i.a] ? ` ${NOMBRE[i.a]}` : ''}`);
  return partes.length > 1 ? `${partes.slice(0, -1).join(', ')} y ${partes.at(-1)}` : partes[0] || '';
}
