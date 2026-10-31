// Prueba: los platos crecen enteros (nada de 6 tortillas con el mismo relleno) y lo que no cabe lo pone un
// complemento con sentido, sin pasarse de proteína ni de grasa en el día
const { RECETAS } = await import('../src/data/recetas.js');
const { generarPlan, recetaPorId } = await import('../src/lib/planificador.js');
const { calcularObjetivos, escalarReceta, macrosComida, alimento, objetivosDia } = await import('../src/lib/nutricion.js');
const { platoCompleto, textoComplementos } = await import('../src/lib/complementos.js');

let fallos = 0;
const ok = (c, t) => { console.log(`${c ? '✓' : '✗'} ${t}`); if (!c) fallos++; };
const unidades = (id, g) => g / alimento(id).unidad.g;

// 1. Todas las recetas, de raciones pequeñas a muy grandes: lo que se cuenta no se dispara y los grupos van a la par
let topes = 0;
let proporciones = 0;
for (const r of RECETAS) {
  const base = macrosComida(r.ingredientes);
  for (const k of [0.6, 1, 1.6, 2.2]) {
    const obj = { kcal: base.kcal * k, p: base.p * k, c: base.c * k * 1.15, g: base.g * k * 0.85 };
    const { ingredientes, factores: x } = escalarReceta(r, obj);
    r.ingredientes.forEach((ing, i) => {
      const a = alimento(ing.a);
      if (a.redondeo !== 'unidad' || !a.unidad) return;
      const n0 = Math.max(1, Math.round(unidades(ing.a, ing.g)));
      if (unidades(ing.a, ingredientes[i].g) > Math.max(n0 + 1, Math.floor(n0 * 1.5)) + 0.01) topes++;
    });
    if ((x.C && x.P && x.C / x.P > 1.61) || (x.G && x.P && x.G / x.P > 1.51) || (x.G && x.C && x.G / x.C > 1.51)) proporciones++;
  }
}
ok(topes === 0, `Ninguna receta pasa de 3 tortillas, 4 huevos… por plato (${topes} casos)`);
ok(proporciones === 0, `Hidratos y grasa crecen a la par que la proteína (${proporciones} casos fuera)`);

// 2. La pizza de la cena de Sergio (unas 790 kcal): como mucho 3 tortillas
const perfilS = { sexo: 'h', edad: 30, altura: 178, peso: 89.5, grasa: 14.4, trabajo: 'sentado', trabajoInicio: '09:00', trabajoFin: '18:00', despertar: '07:00', dormir: '23:30', pasos: 'normal', entrena: true, deportes: ['fuerza', 'carrera', 'hiit'], diasEntreno: [1, 2, 3, 5, 6], horaEntreno: '18:30', duracionEntreno: 75, intensidad: 'intensa', compite: true, objetivo: 'recomposicion', ritmo: 'moderado', comidas: 4, alergias: ['cacahuete', 'nueces', 'avellana', 'anacardo', 'verdura_cruda', 'fruta_piel'], noMeGusta: [], dieta: 'omnivora', condiciones: [], leche: 'avena', aparatos: ['microondas', 'airfryer', 'plancha'], whey: true };
for (const kcal of [790, 1000]) {
  const obj = { kcal, p: (kcal * 0.24) / 4, c: (kcal * 0.5) / 4, g: (kcal * 0.26) / 9 };
  const pizza = platoCompleto(recetaPorId['pizza-tortilla'], obj, 'cena', perfilS);
  const m = macrosComida(pizza);
  const tort = unidades('tortilla_trigo', pizza.find((i) => i.a === 'tortilla_trigo').g);
  console.log(`   Pizza a ${kcal} kcal: ${tort} tortillas, ${Math.round(m.kcal)} kcal, ${Math.round(m.p)} g de proteína${textoComplementos(pizza) ? ` + ${textoComplementos(pizza)}` : ''}`);
  ok(tort <= 3 && Math.abs(m.kcal - kcal) / kcal < 0.1 && m.p <= obj.p * 1.2, `Pizza para ${kcal} kcal: ${tort} tortillas y llega con un complemento si hace falta`);
}

// 3. Una semana como la de Sergio (3.170 kcal los días de entreno): cuadra sin pasarse de proteína ni de grasa
const obj = calcularObjetivos(perfilS);
const plan = generarPlan(perfilS, obj, { inicio: '2026-11-02', semilla: 11 });
let dias = 0;
let extras = 0;
const permitidos = new Set(['platano', 'kiwi', 'mandarina', 'pan_integral', 'tortitas_maiz', 'tortitas_arroz', 'proteina_whey', 'bebida_proteinas_fresa', 'yogur_proteinas', 'queso_batido', 'gelatina_proteinas', 'bebida_soja', 'edamame']);
let rarezas = 0;
for (const d of plan.dias) {
  const o = objetivosDia(obj, d.entreno);
  const t = macrosComida(d.comidas.flatMap((c) => c.ingredientes));
  if (Math.abs(t.kcal / o.kcal - 1) <= 0.05 && t.p <= o.proteina * 1.08 && t.g <= o.grasa * 1.1) dias++;
  for (const c of d.comidas) for (const i of c.ingredientes.filter((x) => x.extra)) { extras++; if (!permitidos.has(i.a)) rarezas++; }
}
ok(dias === plan.dias.length, `Los 7 días cuadran (±5 % de kcal) sin pasarse de proteína (+8 %) ni de grasa (+10 %): ${dias}/7`);
ok(rarezas === 0, `Los complementos son de la lista (tortitas, pan, fruta, batido, yogur…): ${extras} en la semana`);
ok(plan.dias.every((d) => d.comidas.every((c) => (c.ingredientes.find((i) => i.a === 'tortilla_trigo')?.g || 0) <= 135)), 'Ningún plato de la semana lleva más de 3 tortillas');

process.exitCode = fallos ? 1 : 0;
