// Prueba: más variedad con los mismos alimentos. La semana nueva no repite los platos de la anterior,
// no abusa de un estilo (mexicano, asiático…) y la lista de la compra dice para qué platos es cada cosa
const { generarPlan, estiloDe, recetaPorId } = await import('../src/lib/planificador.js');
const { calcularObjetivos } = await import('../src/lib/nutricion.js');
const { RECETAS_VARIEDAD } = await import('../src/data/recetas-variedad.js');
const { listaCompra } = await import('../src/lib/compra.js');

let fallos = 0;
const ok = (c, t) => { console.log(`${c ? '✓' : '✗'} ${t}`); if (!c) fallos++; };
const perfil = { sexo: 'h', edad: 30, altura: 178, peso: 89.5, grasa: 14.4, trabajo: 'sentado', trabajoInicio: '09:00', trabajoFin: '18:00', despertar: '07:00', dormir: '23:30', pasos: 'normal', entrena: true, deportes: ['fuerza', 'carrera', 'hiit'], diasEntreno: [1, 2, 3, 5, 6], horaEntreno: '18:30', duracionEntreno: 75, intensidad: 'intensa', compite: true, objetivo: 'recomposicion', ritmo: 'moderado', comidas: 4, alergias: ['cacahuete', 'nueces', 'avellana', 'anacardo', 'verdura_cruda', 'fruta_piel'], noMeGusta: [], dieta: 'omnivora', condiciones: [], leche: 'avena', aparatos: ['microondas', 'airfryer', 'plancha'], whey: true };
const obj = calcularObjetivos(perfil);
const principales = (plan) => plan.dias.flatMap((d) => d.comidas.filter((c) => ['comida', 'cena'].includes(c.franja)).map((c) => c.recetaId));

const s1 = generarPlan(perfil, obj, { inicio: '2026-11-09', semilla: 3 });
const s2 = generarPlan(perfil, obj, { inicio: '2026-11-16', semilla: 4, recientes: s1.dias.flatMap((d) => d.comidas.map((c) => c.recetaId)) });
const p1 = principales(s1);
const p2 = principales(s2);
const repetidos = p2.filter((id) => p1.includes(id));
console.log(`   Semana 1: ${p1.map((id) => recetaPorId[id]?.nombre.split(' con ')[0]).join(' · ')}`);
console.log(`   Semana 2: ${p2.map((id) => recetaPorId[id]?.nombre.split(' con ')[0]).join(' · ')}`);
ok(repetidos.length <= 2, `La semana 2 repite como mucho 2 comidas o cenas de la anterior (${repetidos.length})`);
for (const [n, p] of [[1, p1], [2, p2]]) {
  const estilos = {};
  for (const id of p) { const e = estiloDe(recetaPorId[id]); estilos[e] = (estilos[e] || 0) + 1; }
  const peor = Object.entries(estilos).filter(([e]) => e !== 'casero').sort((a, b) => b[1] - a[1])[0];
  ok(!peor || peor[1] <= 3, `Semana ${n}: ningún estilo más de 3 veces (${Object.entries(estilos).map(([e, k]) => `${e} ${k}`).join(', ')})`);
  ok(new Set(p).size >= p.length - 2, `Semana ${n}: ${new Set(p).size} platos distintos en ${p.length} comidas y cenas`);
}
const nuevas = new Set(RECETAS_VARIEDAD.map((r) => r.id));
ok([...p1, ...p2].filter((id) => nuevas.has(id)).length >= 4, 'Las recetas nuevas salen en el menú');
const l = listaCompra(s2);
const items = l.grupos.flatMap((g) => g.items);
ok(items.length > 0 && items.every((i) => i.platos?.length), 'Cada cosa de la lista dice para qué platos es');
const pollo = items.find((i) => i.id === 'pollo_pechuga');
if (pollo) console.log(`   Pechuga de pollo → para ${pollo.platos.join(', ')}`);

process.exitCode = fallos ? 1 : 0;
