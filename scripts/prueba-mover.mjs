// Prueba de las notas del buzón del 15 y 19-nov: mover de día cualquier sesión (también la natación y el rodaje
// extra), que lo registrado o movido en el plan de octubre no se cuele en el bloque nuevo, el rodaje extra el jueves
// por la mañana y los menús sin lentejas ni garbanzos. La fecha se simula: jueves 19-nov.
const REAL = Date;
const ahora = '2026-11-19T09:00:00';
globalThis.Date = class extends REAL {
  constructor(...a) { super(...(a.length ? a : [ahora])); }
  static now() { return new REAL(ahora).getTime(); }
};
const get = (s) => { let v; s.subscribe((x) => (v = x))(); return v; };
const { estado, actualizar } = await import('../src/stores/estado.js');
const { crearPlan, moverSesion, separarPlanAnterior, jueves2026, legumbres2026 } = await import('../src/lib/acciones.js');
const { planDe } = await import('../src/lib/hyrox/index.js');
const { fijarPerfilRecetas } = await import('../src/lib/sustituciones.js');

let fallos = 0;
const ok = (c, t) => { console.log(`${c ? '✓' : '✗'} ${t}`); if (!c) fallos++; };
const perfil = { sexo: 'h', edad: 30, altura: 178, peso: 89.55, grasa: 14.4, trabajo: 'no', despertar: '07:00', dormir: '23:30', pasos: 'normal', entrena: true, deportes: ['fuerza', 'carrera', 'hiit'], diasEntreno: [1, 2, 3, 5, 6], horaEntreno: '10:00', duracionEntreno: 60, intensidad: 'moderada', objetivo: 'perder', ritmo: 'moderado', comidas: 4, recena: true, alergias: [], noMeGusta: [], dieta: 'omnivora', condiciones: [], leche: 'avena', whey: true };
fijarPerfilRecetas(perfil);
const config = { inicio: '2026-11-16', fechaCarrera: null, categoria: 'doubles', nivel: 'intermedio', dias: [1, 2, 3, 5, 6], hora: '10:00', material: {}, lesiones: [], marcas: { t5k: 1440 }, enfoque: 'hyrox', exigencia: 'exigente', natacion: { dias: [1, 5], hora: '18:00' }, masCarrera: { dias: [2], hora: '18:00' } };
// Lo que quedó del plan de octubre (empezaba el 12-oct), con los mismos números de sesión que el bloque nuevo
const viejo = (fecha, titulo) => ({ estado: 'completa', fecha, fechaRegistro: fecha, sesion: { tipo: 'largo', titulo, emoji: '🏃', color: 'azul', rpe: 5, duracion: 60, distancia: 10, calentamiento: [], bloques: [], vueltaCalma: [], notas: [], ejercicios: [] } });
const registros = {
  's0-6': viejo('2026-10-18', 'Rodaje largo de octubre'),
  's1-2': { ...viejo('2026-10-20', 'Series de octubre'), series: { sentadilla: [{ kg: 100, reps: 5 }] } },
  carrera: { estado: 'completa', fecha: '2026-11-11', fechaRegistro: '2026-11-12', tiempo: 4369 },
  's0-1': { estado: 'completa', fechaRegistro: '2026-11-16', fecha: '2026-11-16' }, // la Fuerza A de este lunes, de verdad
};
const movidas = { 's0-5': '2026-10-17', 's0-6': '2026-10-18' };
actualizar((e) => { e.perfil = perfil; e.hyrox = { config, registros, movidas }; e.agenda = { eventos: [], viajes: [] }; e.migraciones = {}; });

// Aunque no se limpie nada, un cambio de día que cae fuera de su semana no cuenta
let plan = planDe(get(estado));
let sem = plan.semanas[0].sesiones;
ok(sem.find((s) => s.id === 's0-5')?.fecha === '2026-11-20', 'La Fuerza B vuelve a su viernes 20 (no al 17 de octubre)');

// Lo de octubre pasa al historial con su fecha y deja libres las sesiones del bloque
ok(separarPlanAnterior() === 5, 'Separa 3 registros viejos (con la HYROX del 11-nov) y 2 cambios de día');
const e = get(estado);
ok(!e.hyrox.registros['s0-6'] && e.hyrox.registros['s0-6@2026-10-18']?.estado === 'completa' && e.hyrox.registros['carrera@2026-11-11']?.tiempo === 4369, 'El largo de octubre y la HYROX, en el historial con su fecha');
ok(e.hyrox.registros['s0-1']?.estado === 'completa', 'La Fuerza A de este lunes se queda como hecha');
ok(!Object.keys(e.hyrox.movidas).length, 'Los cambios de día de octubre, olvidados');
ok(separarPlanAnterior() === 0, 'La segunda vez no hay nada que tocar');
plan = planDe(get(estado));
sem = plan.semanas[0].sesiones;
const largo = sem.find((s) => s.id === 's0-6');
ok(largo?.fecha === '2026-11-21' && largo.titulo !== 'Rodaje largo de octubre' && !get(estado).hyrox.registros['s0-6'], 'El sábado 21, el largo del bloque y sin hacer');
ok(plan.sesiones.some((s) => s.id === 's0-6@2026-10-18' && s.fecha === '2026-10-18' && s.historica), 'El de octubre sigue en tu historial, el 18-oct');
ok(plan.sesiones.some((s) => s.id === 's1-2@2026-10-20' && s.fecha === '2026-10-20') && !plan.semanas[1].sesiones.some((s) => s.titulo === 'Series de octubre'), 'La semana que viene, nada de octubre');

// Rodaje extra al jueves por la mañana (solo si seguía en el martes, y una sola vez)
jueves2026();
ok(get(estado).hyrox.config.masCarrera.dias.join() === '4' && get(estado).hyrox.config.masCarrera.hora === '10:00', 'Rodaje extra: jueves a las 10:00');
actualizar((x) => { x.hyrox.config.masCarrera = { dias: [3], hora: '19:00' }; });
jueves2026();
ok(get(estado).hyrox.config.masCarrera.dias.join() === '3', 'Si luego lo cambia en Configurar, se respeta');
actualizar((x) => { x.hyrox.config.masCarrera = { dias: [4], hora: '10:00' }; });
plan = planDe(get(estado));
const rod = plan.semanas[1].sesiones.find((s) => s.id === 's1-rod4');
ok(rod?.fecha === '2026-11-26' && rod.titulo === 'Rodaje suave' && !plan.semanas[1].sesiones.some((s) => s.fecha === '2026-11-24' && s.tipo === 'rodaje'), 'Jueves 26: «Rodaje suave»; el martes, solo las series');

// Mover de día: la natación y el rodaje extra también se mueven (antes avisaba «Movida» y no la movía)
moverSesion('s0-nat5', '2026-11-21', '2026-11-20');
moverSesion('s1-rod4', '2026-11-28', '2026-11-26');
plan = planDe(get(estado));
ok(plan.sesiones.find((s) => s.id === 's0-nat5')?.fecha === '2026-11-21', 'Natación del viernes, movida al sábado');
ok(plan.sesiones.find((s) => s.id === 's1-rod4')?.fecha === '2026-11-28', 'Rodaje del jueves 26, movido al sábado 28');
moverSesion('s0-nat5', '2026-11-20', '2026-11-20');
ok(planDe(get(estado)).sesiones.find((s) => s.id === 's0-nat5')?.fecha === '2026-11-20' && !get(estado).hyrox.movidas['s0-nat5'], 'Y vuelve a su día original');

// Sin lentejas ni garbanzos (el hummus le sienta bien: se queda)
const FUERA = ['lentejas', 'garbanzos'];
actualizar((x) => { x.perfil.noMeGusta = []; });
crearPlan('2026-11-19');
// Para probar el cambio, se mete un plato con lentejas en la comida de mañana
actualizar((x) => { const c = x.plan.dias[1].comidas.find((y) => y.franja === 'comida'); c.ingredientes = [...c.ingredientes, { a: 'lentejas', g: 200 }]; });
legumbres2026();
const p = get(estado);
ok(FUERA.every((id) => p.perfil.noMeGusta.includes(id)) && !p.perfil.noMeGusta.includes('hummus'), 'Lentejas y garbanzos, en «No me gusta» de Tu perfil; el hummus no');
const quedan = p.plan.dias.filter((d) => d.fecha >= '2026-11-19').flatMap((d) => d.comidas).filter((c) => c.ingredientes.some((x) => FUERA.includes(x.a)));
ok(!quedan.length, `Ninguna comida pendiente las lleva (${quedan.map((c) => c.nombre).join(', ') || 'ninguna'})`);
actualizar((x) => { x.perfil.noMeGusta = ['lentejas']; });
legumbres2026();
ok(get(estado).perfil.noMeGusta.join() === 'lentejas', 'Una sola vez: si vuelve a poner los garbanzos, se respeta');
crearPlan('2026-11-23');
const semanaNueva = get(estado).plan.dias.flatMap((d) => d.comidas).filter((c) => c.ingredientes.some((x) => x.a === 'lentejas'));
ok(!semanaNueva.length, 'Un menú nuevo tampoco trae lentejas');

console.log(fallos ? `\n${fallos} fallos` : '\nTodo bien');
globalThis.Date = REAL;
process.exit(fallos ? 1 : 0);
