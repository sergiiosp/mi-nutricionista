// Prueba: Tu HYROX parte de la carrera real (Doubles del 11-nov, 1:12:49) y del objetivo de 1:02 que se eligió el
// 15-nov. También que la fórmula de Doubles sin carrera real se acerque a lo que pasó de verdad.
const REAL = Date;
const ahora = '2026-11-15T18:00:00';
globalThis.Date = class extends REAL {
  constructor(...a) { super(...(a.length ? a : [ahora])); }
  static now() { return new REAL(ahora).getTime(); }
};
const get = (s) => { let v; s.subscribe((x) => (v = x))(); return v; };
const { estado, actualizar } = await import('../src/stores/estado.js');
const { hyroxReal2026 } = await import('../src/lib/acciones.js');
const { estimarCarrera, objetivoCarrera, oportunidades, nuevoObjetivo } = await import('../src/lib/hyrox/carrera.js');
const { hms } = await import('../src/lib/hyrox/ritmos.js');

let fallos = 0;
const ok = (c, t) => { console.log(`${c ? '✓' : '✗'} ${t}`); if (!c) fallos++; };
const perfil = { sexo: 'h', edad: 30, altura: 178, peso: 89.55 };
const config = { inicio: '2026-11-16', fechaCarrera: null, horaCarrera: '11:00', categoria: 'doubles', nivel: 'intermedio', dias: [1, 2, 3, 5, 6], hora: '10:00', material: {}, lesiones: [], marcas: { t5k: 1440 }, enfoque: 'hyrox', exigencia: 'exigente' };
actualizar((e) => { e.perfil = perfil; e.hyrox = { config, registros: {}, movidas: {} }; e.tests = []; e.migraciones = {}; });

// Sin carrera real: la fórmula de Doubles, ya calibrada, cerca de lo que hizo (40:15 + 27:05 + 5:29)
const gen = estimarCarrera(config, perfil);
ok(Math.abs(gen.total - 4369) < 180, `Doubles sin carrera real, a menos de 3 min de 1:12:49 (${hms(gen.total)})`);
ok(Math.abs(gen.estaciones - 1625) < 120 && Math.abs(gen.carreras / 8 - 302) < 10, `Estaciones ${hms(gen.estaciones)} y km a ${hms(gen.carreras / 8)} (antes salían 19:57 y 5:37)`);

// Con su carrera real y su objetivo
hyroxReal2026();
const c = get(estado).hyrox.config;
const est = estimarCarrera(c, perfil);
const obj = objetivoCarrera(c);
ok(Math.round(est.total) === 4369 && est.ultima?.fecha === '2026-11-11', `Ahora: su HYROX real (${hms(est.total)})`);
ok(Math.round(est.carreras) === 2415 && Math.round(est.estaciones) === 1625 && Math.round(est.roxzone) === 329, 'Con sus 8 km, sus estaciones y su roxzone');
ok(Math.round(obj.total) === 3720 && Math.round(obj.carreras / 8) === 270, `Objetivo: ${hms(obj.total)} con los km a 4:30`);
const o = oportunidades(c, perfil, est, obj);
ok(o.nivelRef === 'tu objetivo' && o.lista[0].id === 'carrera' && Math.round(o.lista[0].gana) === 255, `Donde más gana: corriendo (−${hms(o.lista[0].gana)})`);
ok(o.lista.some((x) => x.id === 'pull' && Math.round(x.gana) === 63) && o.lista.some((x) => x.id === 'roxzone' && Math.round(x.gana) === 104), 'Sled pull −1:03 y roxzone −1:44');

// Solo una vez
actualizar((x) => { x.hyrox.config.objetivo = null; });
hyroxReal2026();
ok(get(estado).hyrox.config.objetivo === null, 'Solo una vez: si quita el objetivo, no vuelve');

// Si mejora el 5 km, los km bajan en proporción; las estaciones no se tocan
const mejor = estimarCarrera({ ...c, marcas: { t5k: 1320 } }, perfil);
ok(Math.round(mejor.carreras) === Math.round(2415 * 1320 / 1440) && Math.round(mejor.estaciones) === 1625, `5 km en 22:00 → corriendo ${hms(mejor.carreras)}`);

// Si va en individual: su carrera y su objetivo pasados a Open
const open = { ...c, categoria: 'open', objetivo: get(estado).hyrox.config.objetivo || { categoria: 'doubles', km: Array(8).fill(270), estaciones: { ski: 225, push: 115, pull: 170, bbj: 130, row: 230, farmers: 85, lunges: 185, wallballs: 195 }, roxzone: 225 } };
const eo = estimarCarrera(open, perfil);
const oo = objetivoCarrera(open);
ok(eo.total > 4800 && eo.total < 5200 && oo.total > 4100 && oo.total < 4400, `En individual: ahora ${hms(eo.total)}, objetivo ${hms(oo.total)}`);

// Simulacros: los de antes de la carrera no cuentan; los de después, sí
const regs = { a: { fecha: '2026-10-20', estaciones: { wallballs: 200 } }, b: { fecha: '2026-11-25', estaciones: { lunges: 200 } } };
const conRegs = estimarCarrera(c, perfil, regs);
ok(conRegs.tramos.find((t) => t.id === 'wallballs').seg === 241 && conRegs.tramos.find((t) => t.id === 'lunges').seg === 200, 'Un simulacro de octubre no pisa la carrera; uno de después, sí');

// Objetivo nuevo desde Configurar: se reparte igual que el que tenía
const nuevo = nuevoObjetivo(open, eo, 4500);
ok(Math.abs(objetivoCarrera({ ...open, objetivo: nuevo }).total - 4500) < 5, 'Cambiar el objetivo a 1:15:00 lo reparte por tramos');

console.log(fallos ? `\n${fallos} fallos` : '\nTodo bien');
globalThis.Date = REAL;
process.exit(fallos ? 1 : 0);
