// Prueba: después de la HYROX del 11-nov, semana de vuelta y, desde el lunes 16, el bloque que eligió Sergio
// (perder grasa a ritmo moderado, «Solo HYROX» exigente, su 10 km del 31-dic) con el déficit sin cortar.
// La fecha se simula: primero el 12-nov y luego el 16-nov.
const REAL = Date;
let ahora = '2026-11-12T12:00:00';
globalThis.Date = class extends REAL {
  constructor(...a) { super(...(a.length ? a : [ahora])); }
  static now() { return new REAL(ahora).getTime(); }
};
const get = (s) => { let v; s.subscribe((x) => (v = x))(); return v; };
const { estado, actualizar } = await import('../src/stores/estado.js');
const { bloqueTrasHyrox2026, reajustarPlan } = await import('../src/lib/acciones.js');
const { planDe, proveedorDe } = await import('../src/lib/hyrox/index.js');
const { calcularObjetivos, metaDia } = await import('../src/lib/nutricion.js');
const { fijarPerfilRecetas } = await import('../src/lib/sustituciones.js');

let fallos = 0;
const ok = (c, t) => { console.log(`${c ? '✓' : '✗'} ${t}`); if (!c) fallos++; };
const perfil = { sexo: 'h', edad: 30, altura: 178, peso: 89.55, grasa: 14.4, trabajo: 'sentado', trabajoInicio: '09:00', trabajoFin: '18:00', despertar: '07:00', dormir: '23:30', pasos: 'normal', entrena: true, deportes: ['fuerza', 'carrera', 'hiit'], diasEntreno: [1, 2, 3, 5, 6], horaEntreno: '18:30', duracionEntreno: 60, intensidad: 'moderada', compite: true, objetivo: 'recomposicion', ritmo: 'moderado', comidas: 4, recena: true, alergias: [], noMeGusta: [], dieta: 'omnivora', condiciones: [], leche: 'avena', whey: true };
fijarPerfilRecetas(perfil);
const config = { inicio: '2026-09-22', fechaCarrera: '2026-11-11', horaCarrera: '11:00', categoria: 'doubles', nivel: 'intermedio', dias: [1, 2, 3, 5, 6], hora: '18:30', material: {}, lesiones: [], marcas: { t5k: 1440 }, enfoque: 'equilibrado', exigencia: 'muy' };
actualizar((e) => { e.perfil = perfil; e.hyrox = { config, registros: {}, movidas: {} }; e.agenda = { eventos: [], viajes: [] }; e.migraciones = {}; });

// Semana de vuelta (12-15 nov): nada fuerte
let plan = planDe(get(estado));
const vuelta = ['2026-11-12', '2026-11-13', '2026-11-14', '2026-11-15'].flatMap((f) => (plan.porFecha[f] || []).map((s) => `${f.slice(8)} ${s.titulo} (${s.tipo}, ${s.duracion} min)`));
console.log('  ' + vuelta.join('\n  '));
ok(vuelta.length === 3 && plan.porFecha['2026-11-12'][0].tipo === 'recuperacion' && plan.porFecha['2026-11-15'][0].tipo === 'rodaje', 'Semana de vuelta: recuperación, movilidad y un rodaje suave');
bloqueTrasHyrox2026();
ok(get(estado).hyrox.config.fechaCarrera === '2026-11-11' && get(estado).perfil.objetivo === 'recomposicion', 'Antes del lunes 16, nada cambia');

// Lunes 16: el bloque nuevo
ahora = '2026-11-16T09:00:00';
bloqueTrasHyrox2026();
const e = get(estado);
ok(e.perfil.objetivo === 'perder' && e.perfil.ritmo === 'moderado', 'Objetivo: perder grasa a ritmo moderado');
ok(e.hyrox.config.inicio === '2026-11-16' && !e.hyrox.config.fechaCarrera && e.hyrox.config.enfoque === 'hyrox' && e.hyrox.config.exigencia === 'exigente', 'Plan desde el 16-nov, sin carrera HYROX, «Solo HYROX» y exigente');
ok(e.agenda.eventos.some((ev) => ev.fecha === '2026-12-31' && ev.km === 10), 'El 10 km del 31-dic en la agenda');
ok(e.hyrox.config.dias.join() === '1,2,3,5,6' && e.hyrox.registros && e.perfil.peso === 89.55, 'Sus días, sus registros y su peso, intactos');
actualizar((x) => { x.perfil.objetivo = 'mantener'; });
bloqueTrasHyrox2026();
ok(get(estado).perfil.objetivo === 'mantener', 'Solo una vez: si luego cambias el objetivo, se respeta');
actualizar((x) => { x.perfil.objetivo = 'perder'; });

plan = planDe(get(estado));
const semana = (lunes) => plan.semanas.find((w) => w.lunes === lunes);
const s1 = semana('2026-11-16');
console.log(`  Semana 1 (${s1.fase}): ` + s1.sesiones.map((s) => `${s.fecha.slice(8)} ${s.titulo} (${s.tipo}, ${s.duracion} min)`).join(' · '));
ok(s1.sesiones.length === 5 && s1.sesiones.filter((s) => ['rodaje', 'series', 'umbral', 'largo'].includes(s.tipo)).length >= 2, 'Primera semana: 5 sesiones, al menos 2 de carrera');
const sc = semana('2026-12-28');
console.log(`  Semana del 10 km: ` + sc.sesiones.map((s) => `${s.fecha.slice(8)} ${s.titulo} (${s.tipo})`).join(' · '));
const dic29 = sc.sesiones.find((s) => s.fecha === '2026-12-29');
ok(sc.sesiones.some((s) => s.fecha === '2026-12-31' && s.tipo === 'popular'), 'El 10 km sale en su semana');
ok(!sc.sesiones.some((s) => s.fecha === '2026-12-30'), 'La víspera del 10 km, descanso');
ok(!dic29 || dic29.tipo === 'rodaje' || dic29.ejercicios?.length, 'Dos días antes, rodaje suave o fuerza ligera');

// Nutrición: déficit también en las semanas finales (sin carrera HYROX no hay «específico» que lo quite)
const objetivos = calcularObjetivos(get(estado).perfil);
const prov = proveedorDe(get(estado));
const ultima = plan.semanas.at(-1);
const diaFuerte = ultima.sesiones.find((s) => s.tipo !== 'popular' && s.tipo !== 'carrera')?.fecha;
ok(prov.fase(diaFuerte) === null, 'Sin carrera HYROX, la fase no quita el déficit');
const descanso = objetivos.porTipo.descanso.kcal;
const base = objetivos.base;
ok(descanso < base.getDescanso * 0.85, `Descanso con déficit (${descanso} kcal frente a ${Math.round(base.getDescanso)} de gasto)`);
const meta = metaDia(objetivos, prov(diaFuerte), prov.fase(diaFuerte));
ok(meta.kcal < base.getDescanso + prov(diaFuerte).reduce((s, x) => s + x.kcal, 0), `Día de entreno de la última semana, también con déficit (${meta.kcal} kcal)`);
ok(meta.proteina <= objetivos.base.proteina, `La proteína no sube (${meta.proteina} g)`);

console.log(fallos ? `\n${fallos} fallos` : '\nTodo bien');
globalThis.Date = REAL;
process.exit(fallos ? 1 : 0);
