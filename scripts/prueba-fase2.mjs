// Prueba: la app propone. Comer fuera en una comida (y volver a casa), el día de preparar de una vez, los platos
// «Para probar» de la semana y el porqué de cada tipo de sesión
import { get } from 'svelte/store';
const { estado, actualizar } = await import('../src/stores/estado.js');
const { crearPlan, comerFuera, volverACasa, probarEnMenu, marcarPreparado, ocultarPreparar, reajustarPlan } = await import('../src/lib/acciones.js');
const { hoyISO, sumarDias, recetaPorId } = await import('../src/lib/planificador.js');
const { macrosComida } = await import('../src/lib/nutricion.js');
const { listaCompra } = await import('../src/lib/compra.js');
const { planBatch, diaPreparar } = await import('../src/lib/batch.js');
const { paraProbar, huecosPara } = await import('../src/lib/probar.js');
const { porqueDe } = await import('../src/lib/hyrox/porque.js');
const { TIPOS } = await import('../src/lib/hyrox/sesiones.js');
const { fijarPerfilRecetas } = await import('../src/lib/sustituciones.js');

let fallos = 0;
const ok = (c, t) => { console.log(`${c ? '✓' : '✗'} ${t}`); if (!c) fallos++; };
const productos = (plan) => { const l = listaCompra(plan); return [...l.grupos.flatMap((g) => g.items), ...l.despensa]; };
const hoy = hoyISO();
const perfil = { sexo: 'h', edad: 30, altura: 178, peso: 89.5, grasa: 14.4, trabajo: 'sentado', trabajoInicio: '09:00', trabajoFin: '18:00', despertar: '07:00', dormir: '23:30', pasos: 'normal', entrena: true, deportes: ['fuerza', 'carrera', 'hiit'], diasEntreno: [1, 2, 3, 5, 6], horaEntreno: '18:30', duracionEntreno: 75, intensidad: 'intensa', compite: true, objetivo: 'recomposicion', ritmo: 'moderado', comidas: 4, alergias: ['cacahuete', 'nueces', 'avellana', 'anacardo', 'verdura_cruda', 'fruta_piel'], noMeGusta: [], dieta: 'omnivora', condiciones: [], leche: 'avena', aparatos: ['microondas', 'airfryer', 'plancha'], whey: true };
actualizar((e) => { e.perfil = perfil; e.registros = {}; e.favoritas = []; e.preparar = null; e.probar = null; });
fijarPerfilRecetas(perfil);
crearPlan();

// ── Hoy como fuera ──
const i = 2;
const antes = get(estado).plan.dias[i].comidas.find((c) => c.franja === 'comida');
const kcalAntes = macrosComida(antes.ingredientes).kcal;
const compraAntes = productos(get(estado).plan).length;
ok(comerFuera(i, 'comida'), 'Pasar una comida a «como fuera»');
let c = get(estado).plan.dias[i].comidas.find((x) => x.franja === 'comida');
ok(recetaPorId[c.recetaId]?.fuera && c.enCasa === antes.recetaId, `Ahora es un plato de restaurante (${recetaPorId[c.recetaId].nombre}) y recuerda el de casa`);
ok(Math.abs(macrosComida(c.ingredientes).kcal - kcalAntes) / kcalAntes < 0.2, `A la medida de esa comida: ${Math.round(macrosComida(c.ingredientes).kcal)} kcal frente a ${Math.round(kcalAntes)}`);
ok(!productos(get(estado).plan).some((x) => x.platos.includes(recetaPorId[c.recetaId].nombre.split(' con ')[0])), `No entra en la compra (${compraAntes} → ${productos(get(estado).plan).length} productos)`);
ok(!planBatch(get(estado).plan, get(estado).plan.dias[0].fecha, 7).tapers.some((t) => t.nombre === recetaPorId[c.recetaId].nombre), 'Ni en lo que hay que preparar');
reajustarPlan();
c = get(estado).plan.dias[i].comidas.find((x) => x.franja === 'comida');
ok(c.enCasa === antes.recetaId, 'Al reajustar el menú sigue sabiendo cuál era el plato de casa');
ok(volverACasa(i, 'comida') && get(estado).plan.dias[i].comidas.find((x) => x.franja === 'comida').recetaId === antes.recetaId, '«Al final como en casa» vuelve a su plato');
ok(!comerFuera(i, 'merienda'), 'En la merienda no hay opción de fuera');

// ── Preparar de una vez ──
const plan = get(estado).plan;
ok(diaPreparar(plan, plan.dias[0].fecha)?.dias === 4 && diaPreparar(plan, plan.dias[4].fecha)?.dias === 3, 'Se prepara el primer día del menú (4 días) y el quinto (3 días)');
ok(!diaPreparar(plan, plan.dias[1].fecha), 'Los demás días no toca');
const b = planBatch(plan, plan.dias[0].fecha, 4);
ok(b.tareas.length > 0, `El día de preparar hay ${b.tareas.length} pasos: ${b.tareas.map((t) => t.titulo).join(', ')}`);
marcarPreparado(plan.dias[0].fecha, b.tareas[0].titulo);
ok(get(estado).preparar.hechas[b.tareas[0].titulo], 'Lo que marcas como hecho se guarda');
ocultarPreparar(plan.dias[0].fecha);
ok(get(estado).preparar.oculto && get(estado).preparar.hechas[b.tareas[0].titulo], '«Hoy no» la oculta sin perder lo hecho');

// ── Para probar ──
const lista = paraProbar(get(estado), hoy);
const enMenu = new Set(get(estado).plan.dias.flatMap((d) => d.comidas.map((x) => x.recetaId)));
ok(lista.length >= 4, `${lista.length} platos para probar: ${lista.map((x) => x.receta.nombre.split(' con ')[0]).join(' · ')}`);
ok(lista.every((x) => !enMenu.has(x.receta.id)), 'Ninguno está ya en tu menú');
ok(lista.every((x) => !x.receta.ingredientes.some((ing) => ['cacahuete', 'nueces', 'avellana', 'anacardo'].includes(ing.a))), 'Ninguno lleva lo que te da alergia');
ok(JSON.stringify(paraProbar(get(estado), hoy).map((x) => x.receta.id)) === JSON.stringify(lista.map((x) => x.receta.id)), 'La lista no cambia en la semana');
const r = lista.find((x) => x.receta.tipos.includes('cena') || x.receta.tipos.includes('comida')).receta;
const huecos = huecosPara(get(estado).plan, r, hoy);
ok(huecos.length > 0 && huecos.every((h) => h.fecha > hoy), `Huecos desde mañana para ponerlo: ${huecos.map((h) => `${h.fecha.slice(5)} ${h.franja}`).join(', ')}`);
ok(probarEnMenu(huecos[0].diaIdx, huecos[0].franja, r.id, hoy) && get(estado).plan.dias[huecos[0].diaIdx].comidas.find((x) => x.franja === huecos[0].franja).recetaId === r.id, '«Ponlo en mi menú» lo pone en esa comida');
const despues = paraProbar(get(estado), hoy);
ok(despues.find((x) => x.receta.id === r.id)?.puesta?.fecha === huecos[0].fecha, 'Y en la lista queda marcado como puesto, sin desaparecer');
ok(JSON.stringify(paraProbar(get(estado), sumarDias(hoy, 7)).map((x) => x.receta.id)) !== JSON.stringify(despues.map((x) => x.receta.id)), 'La semana siguiente propone otros');

// ── El porqué de cada sesión ──
const sinPorque = Object.keys(TIPOS).filter((t) => t !== 'registrada' && !porqueDe({ tipo: t }));
ok(!sinPorque.length, `Todas las sesiones del plan explican su porqué${sinPorque.length ? ` (faltan: ${sinPorque.join(', ')})` : ''}`);
ok(Object.keys(TIPOS).every((t) => { const p = porqueDe({ tipo: t }); return !p || (p.corto.length <= 60 && p.objetivo && p.estimulo && p.acabar); }), 'Cada una con objetivo, estímulo, cómo acabar y una línea corta');

process.exitCode = fallos ? 1 : 0;
