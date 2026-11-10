// Prueba: la carga de hidratos y el día de carrera (poca fibra, proteína justa, sin lácteo, desayuno 3 h antes de
// salir) y que un menú hecho con reglas anteriores rehaga solo lo que queda por comer, sin tocar lo apuntado.
import { get } from 'svelte/store';
const { estado, actualizar, registroDePlan } = await import('../src/stores/estado.js');
const { crearPlan, rehacerDiasCarrera, horaHyrox2026 } = await import('../src/lib/acciones.js');
const { macrosComida, alimento } = await import('../src/lib/nutricion.js');
const { hoyISO, sumarDias, recetaPorId } = await import('../src/lib/planificador.js');
const { fijarPerfilRecetas } = await import('../src/lib/sustituciones.js');

let fallos = 0;
const ok = (c, t) => { console.log(`${c ? '✓' : '✗'} ${t}`); if (!c) fallos++; };
const hoy = hoyISO();
const manana = sumarDias(hoy, 1);
const perfil = { sexo: 'h', edad: 30, altura: 178, peso: 89.5, grasa: 14.4, trabajo: 'sentado', trabajoInicio: '09:00', trabajoFin: '18:00', despertar: '07:00', dormir: '23:30', pasos: 'normal', entrena: true, deportes: ['fuerza', 'carrera', 'hiit'], diasEntreno: [1, 2, 3, 5, 6], horaEntreno: '18:30', duracionEntreno: 60, intensidad: 'moderada', compite: true, objetivo: 'recomposicion', ritmo: 'moderado', comidas: 4, recena: true, alergias: ['cacahuete', 'nueces', 'avellana', 'anacardo', 'verdura_cruda', 'fruta_piel'], noMeGusta: [], dieta: 'omnivora', condiciones: [], leche: 'avena', aparatos: ['microondas', 'airfryer', 'plancha'], whey: true };
fijarPerfilRecetas(perfil);
const config = { inicio: sumarDias(hoy, -50), fechaCarrera: manana, horaCarrera: '11:00', categoria: 'doubles', nivel: 'intermedio', dias: [1, 2, 3, 5, 6], hora: '18:30', material: {}, lesiones: [], marcas: { t5k: 1440 }, enfoque: 'equilibrado', exigencia: 'muy' };
actualizar((e) => { e.perfil = perfil; e.hyrox = { config, registros: {}, movidas: {} }; e.registros = {}; e.saltadas = {}; e.agenda = { eventos: [], viajes: [] }; });
crearPlan();

const dia = (f) => get(estado).plan.dias.find((d) => d.fecha === f);
const lacteo = (c) => c.ingredientes.some((i) => alimento(i.a)?.dieta === 'lacteo' && i.g >= 20);
const legumbre = (c) => c.ingredientes.some((i) => ['garbanzos', 'lentejas', 'alubias', 'alubias_pintas', 'hummus', 'edamame'].includes(i.a));
const fibra = (d) => d.comidas.reduce((s, c) => s + macrosComida(c.ingredientes).f, 0);

// Menú nuevo: víspera (carga) y carrera
const v = dia(hoy), c = dia(manana);
ok(v.objetivo.carga && c.objetivo.carrera, 'Hoy es de carga y mañana de carrera');
ok(v.objetivo.proteina <= Math.round(1.5 * perfil.peso) && c.objetivo.proteina <= Math.round(1.5 * perfil.peso), `Proteína justa: ${v.objetivo.proteina} g y ${c.objetivo.proteina} g (≤ 1,5 g/kg)`);
ok(!v.comidas.some((x) => x.franja === 'recena') && !c.comidas.some((x) => x.franja === 'recena'), 'Sin recena láctea en la carga ni el día de carrera');
ok(![...v.comidas, ...c.comidas].some(lacteo), 'Ningún plato con lácteo en la carga ni el día de carrera');
ok(![...v.comidas, ...c.comidas].some(legumbre), 'Sin legumbre en la carga ni el día de carrera');
ok(fibra(v) <= 35, `Poca fibra en la carga (${Math.round(fibra(v))} g)`);
const hidratos = v.comidas.reduce((s, x) => s + macrosComida(x.ingredientes).c, 0);
ok(hidratos / perfil.peso >= 6.3, `La carga llega a los hidratos (${(hidratos / perfil.peso).toFixed(1)} g/kg)`);
ok(![...v.comidas, ...c.comidas].some((x) => x.ingredientes.some((i) => ['pan_integral', 'pan_molde', 'arroz_integral', 'pasta_integral'].includes(i.a))), 'Pan, arroz y pasta blancos (nada integral)');
const desayuno = c.comidas.find((x) => x.franja === 'desayuno');
ok(desayuno?.hora === '08:00' && desayuno?.etiqueta === 'pre', `Desayuno de carrera 3 h antes de salir (${desayuno?.hora}, ${desayuno?.etiqueta})`);
ok(!get(estado).plan.dias.some((d) => !d.objetivo.carga && !d.objetivo.carrera && d.comidas.some((x) => recetaPorId[x.recetaId]?.soloCarga)), 'Los platos de carga no salen en días normales');

// Menú hecho con reglas anteriores: hoy con recena de queso batido y el desayuno ya apuntado; mañana con lentejas
const queso = { franja: 'recena', recetaId: 'recena-queso-batido-canela', ingredientes: [{ a: 'queso_batido', g: 250 }], hora: '22:45' };
const dal = { franja: 'cena', recetaId: 'dal-lentejas', ingredientes: recetaPorId['dal-lentejas'].ingredientes, hora: '21:00' };
actualizar((e) => {
  for (const d of e.plan.dias.filter((x) => [hoy, manana].includes(x.fecha))) delete d.reglasCarrera;
  const dv = e.plan.dias.find((x) => x.fecha === hoy);
  dv.comidas.push(queso);
  const des = dv.comidas.find((x) => x.franja === 'desayuno');
  e.registros[hoy] = [registroDePlan(des, hoy)];
  const dc = e.plan.dias.find((x) => x.fecha === manana);
  dc.comidas = dc.comidas.map((x) => (x.franja === 'cena' ? dal : x));
});
const desayunoAntes = dia(hoy).comidas.find((x) => x.franja === 'desayuno').recetaId;
ok(rehacerDiasCarrera() === 2, 'Rehace los dos días hechos con reglas anteriores');
ok(dia(hoy).comidas.find((x) => x.franja === 'desayuno').recetaId === desayunoAntes, 'El desayuno ya apuntado se queda como estaba');
ok(get(estado).registros[hoy].length === 1, 'Lo apuntado no se toca');
ok(!dia(hoy).comidas.some((x) => x.franja === 'recena'), 'Fuera la recena de queso batido');
ok(dia(manana).comidas.find((x) => x.franja === 'cena')?.recetaId !== 'dal-lentejas', 'Fuera las lentejas de la noche de la carrera');
ok(rehacerDiasCarrera() === 0, 'Una vez rehechos, no se vuelven a rehacer');

// La hora de la HYROX del 11-nov (ajuste puntual, una sola vez)
actualizar((e) => { e.hyrox.config = { ...config, fechaCarrera: '2026-11-11', horaCarrera: '10:00' }; e.migraciones = {}; });
horaHyrox2026();
ok(get(estado).hyrox.config.horaCarrera === '11:00', 'La HYROX del 11-nov sale a las 11:00');
actualizar((e) => { e.hyrox.config.horaCarrera = '12:00'; });
horaHyrox2026();
ok(get(estado).hyrox.config.horaCarrera === '12:00', 'Si luego cambias la hora, se respeta');

console.log(fallos ? `\n${fallos} fallos` : '\nTodo bien');
process.exit(fallos ? 1 : 0);
