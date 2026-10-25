// Prueba: bíceps y tríceps en todos los días de torso (con y sin gimnasio, puesta a punto y un solo día de torso)
const { generarPlanHyrox } = await import('../src/lib/hyrox/plan.js');
const { hoyISO, sumarDias } = await import('../src/lib/planificador.js');
const { EJERCICIOS } = await import('../src/data/hyrox.js');

const hoy = hoyISO();
const perfil = { sexo: 'h', edad: 30, altura: 178, peso: 80 };
const base = { inicio: sumarDias(hoy, -7), fechaCarrera: sumarDias(hoy, 100), categoria: 'open', nivel: 'intermedio', dias: [1, 2, 3, 4, 5, 6], hora: '18:30', material: {}, lesiones: [], marcas: { t5k: 1440 }, enfoque: 'equilibrado', exigencia: 'muy' };
const plan = (cambios = {}, extra = {}) => generarPlanHyrox({ config: { ...base, ...cambios }, registros: {}, movidas: {}, ...extra }, perfil, hoy, null);
const grupo = (x) => EJERCICIOS[x.id]?.grupo;
const torsos = (w) => w.sesiones.filter((s) => s.tipo === 'torso');
const cuenta = (lista, g) => lista.flatMap((s) => s.ejercicios).filter((x) => grupo(x) === g).length;

let fallos = 0;
const ok = (c, t) => { console.log(`${c ? '✓' : '✗'} ${t}`); if (!c) fallos++; };

// 6 días: torso A y B
const p6 = plan();
const semana = p6.semanas.find((w) => w.fase === 'base' && torsos(w).length === 2);
for (const s of torsos(semana)) console.log(`· ${s.titulo}: ${s.ejercicios.map((x) => x.nombre).join(', ')}`);
ok(p6.semanas.filter((w) => w.fase !== 'taper' && torsos(w).length).every((w) => cuenta(torsos(w), 'biceps') >= 3 && cuenta(torsos(w), 'triceps') >= 3), 'Con 6 días: 3 ejercicios de bíceps y 3 de tríceps a la semana');
const B = torsos(semana).find((s) => s.titulo.includes('B:'));
const ids = B.ejercicios.map((x) => x.id);
ok(ids.indexOf('curl_martillo') >= 0 && ids.indexOf('curl_martillo') < ids.indexOf('curl_inclinado'), 'Torso B: curl martillo y luego curl inclinado');
ok(ids.includes('press_frances'), 'Torso B: press francés');
const A = torsos(semana).find((s) => s.titulo.includes('A:'));
ok(A.ejercicios.some((x) => x.id === 'extension_triceps') && A.ejercicios.some((x) => x.id === 'fondos'), 'Torso A: fondos y extensión de tríceps en polea');

// Un solo día de torso: torso completo con los dos brazos
const p4 = plan({ dias: [1, 2, 4, 5] });
const unico = p4.semanas.filter((w) => w.fase !== 'taper').map(torsos).filter((l) => l.length);
console.log(`· ${unico[0][0].titulo}: ${unico[0][0].ejercicios.map((x) => x.nombre).join(', ')}`);
ok(unico.every((l) => l.length === 1 && l[0].titulo.includes('completo') && cuenta(l, 'biceps') >= 2 && cuenta(l, 'triceps') >= 2), 'Con 4 días: torso completo con 2 de bíceps y 2 de tríceps');

// Puesta a punto: el torso conserva un ejercicio de cada brazo
const taper = p6.semanas.filter((w) => w.fase === 'taper').flatMap(torsos);
ok(taper.length > 0 && taper.every((s) => cuenta([s], 'biceps') >= 1 && cuenta([s], 'triceps') >= 1), 'En la puesta a punto, un ejercicio de bíceps y otro de tríceps (ligeros)');

// Sin gimnasio: mochila o garrafas para el bíceps y peso corporal para el tríceps
const idB = B.id;
const pSin = plan({}, { sinGym: { [idB]: true } });
const Bsin = pSin.sesiones.find((s) => s.id === idB);
console.log(`· ${Bsin.titulo}: ${Bsin.ejercicios.map((x) => x.nombre).join(', ')}`);
ok(Bsin.ejercicios.some((x) => x.id === 'curl_mochila') && Bsin.ejercicios.some((x) => grupo(x) === 'triceps'), 'Torso B sin gimnasio: curl con mochila y tríceps');

// Planes guardados sin enfoque ni exigencia: HYROX + físico (como marca el configurador)
const pViejo = generarPlanHyrox({ config: { ...base, enfoque: undefined, exigencia: undefined }, registros: {}, movidas: {} }, perfil, hoy, null);
ok(pViejo.sesiones.some((s) => s.tipo === 'torso'), 'Sin enfoque guardado, el plan es HYROX + físico');

// Con lesión de hombro, ningún ejercicio repetido
const pHombro = plan({ lesiones: ['hombro'] });
const repetidos = pHombro.sesiones.filter((s) => s.ejercicios?.length).some((s) => new Set(s.ejercicios.map((x) => x.id)).size !== s.ejercicios.length);
ok(!repetidos, 'Con lesión de hombro, ningún ejercicio sale dos veces');

process.exitCode = fallos ? 1 : 0;
