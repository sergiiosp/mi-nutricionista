// Prueba: la semana de la carrera. Nada fuerte la víspera (solo activación) ni estaciones a menos de 3 días, y la
// carga de hidratos de los dos días antes sin legumbre, con más hidratos y menos grasa
const { planDe } = await import('../src/lib/hyrox/index.js');
const { proveedorDe } = await import('../src/lib/hyrox/index.js');
const { generarPlan, recetaPorId } = await import('../src/lib/planificador.js');
const { calcularObjetivos, macrosComida } = await import('../src/lib/nutricion.js');
const { fijarPerfilRecetas } = await import('../src/lib/sustituciones.js');
const { sumarDias } = await import('../src/lib/planificador.js');

let fallos = 0;
const ok = (c, t) => { console.log(`${c ? '✓' : '✗'} ${t}`); if (!c) fallos++; };
const perfil = { nombre: 'Sergio', sexo: 'h', edad: 30, altura: 178, peso: 80.1, grasa: 17.2, trabajo: 'sentado', trabajoInicio: '09:00', trabajoFin: '18:00', despertar: '07:00', dormir: '23:30', pasos: 'normal', entrena: true, deportes: ['fuerza', 'carrera', 'hiit'], diasEntreno: [1, 2, 4, 5], horaEntreno: '18:30', duracionEntreno: 60, intensidad: 'moderada', compite: true, objetivo: 'recomposicion', ritmo: 'moderado', comidas: 4, recena: true, alergias: ['cacahuete', 'nueces', 'avellana', 'anacardo', 'verdura_cruda', 'fruta_piel'], noMeGusta: [], dieta: 'omnivora', condiciones: [], leche: 'avena', aparatos: ['microondas', 'airfryer', 'plancha'], whey: true };
const estadoCon = (carrera, dias) => ({ perfil, hyrox: { config: { inicio: '2026-09-22', fechaCarrera: carrera, categoria: 'doubles', nivel: 'intermedio', dias, hora: '18:30', material: {}, lesiones: [], marcas: { t5k: 1440 }, enfoque: 'equilibrado', exigencia: 'muy' }, registros: {}, movidas: {} }, agenda: { eventos: [], viajes: [{ id: 'jaen', desde: '2026-11-04', hasta: '2026-11-07', comida: ['fuera', 'super'], entreno: 'sinGym' }] } });

// ── Carrera un miércoles (la HYROX del 11) ──
for (const dias of [[1, 2, 4, 5], [1, 2, 3, 5, 6], [1, 3, 5, 6]]) {
  const plan = planDe(estadoCon('2026-11-11', dias));
  const de = (f) => (plan.porFecha[f] || []).filter((s) => s.tipo !== 'carrera');
  ok(de('2026-11-10').every((s) => s.tipo === 'activacion') && de('2026-11-10').length === 1, `Días ${dias}: la víspera solo activación (${de('2026-11-10').map((s) => s.titulo).join(', ')})`);
  ok(de('2026-11-09').every((s) => s.rpe <= 6 && s.tipo !== 'estaciones'), `Días ${dias}: dos días antes, como mucho series suaves (${de('2026-11-09').map((s) => `${s.titulo} RPE ${s.rpe}`).join(', ') || 'descanso'})`);
  ok(![sumarDias('2026-11-11', -1), sumarDias('2026-11-11', -2), sumarDias('2026-11-11', -3)].some((f) => de(f).some((s) => s.tipo === 'estaciones')), `Días ${dias}: ninguna sesión de estaciones a menos de 3 días`);
  ok((plan.porFecha['2026-11-11'] || []).some((s) => s.tipo === 'carrera'), `Días ${dias}: la carrera el 11`);
}
// ── Carrera un domingo: la semana de carrera sigue con sus dos sesiones cortas al principio ──
const domingo = planDe(estadoCon('2026-11-15', [1, 2, 4, 5]));
const semana = domingo.sesiones.filter((s) => s.fecha >= '2026-11-09' && s.fecha < '2026-11-15').map((s) => s.tipo);
ok(semana.includes('series') && semana.includes('estaciones') && semana.at(-1) === 'activacion', `Carrera en domingo: series, estaciones y activación (${semana.join(', ')})`);

// ── Carga de hidratos (9 y 10 de noviembre) ──
fijarPerfilRecetas(perfil);
const obj = calcularObjetivos(perfil);
const e = estadoCon('2026-11-11', [1, 2, 4, 5]);
const proveedor = proveedorDe(e);
const LEG = ['garbanzos', 'lentejas', 'alubias', 'alubias_pintas', 'hummus', 'hummus_piquillo', 'edamame', 'pasta_lentejas', 'guisantes', 'crema_lentejas'];
let legumbres = 0, c = 0, g = 0, n = 0, oC = 0, oG = 0, marcados = 0;
for (let s = 1; s <= 25; s++) {
  const plan = generarPlan(perfil, obj, { inicio: '2026-11-08', semilla: s * 7919, proveedor, viajes: e.agenda.viajes });
  for (const d of plan.dias.filter((x) => ['2026-11-09', '2026-11-10'].includes(x.fecha))) {
    if (d.objetivo.carga) marcados++;
    const ing = d.comidas.flatMap((x) => x.ingredientes);
    legumbres += d.comidas.filter((x) => recetaPorId[x.recetaId]?.ingredientes.some((i) => LEG.includes(i.a))).length;
    const m = macrosComida(ing);
    c += m.c; g += m.g; oC += d.objetivo.hidratos; oG += d.objetivo.grasa; n++;
  }
}
ok(marcados === n, `Los días 9 y 10 son de carga (${marcados} de ${n})`);
ok(legumbres === 0, `En la carga no sale legumbre (${legumbres} platos en ${n} días)`);
ok(c / oC >= 0.9, `Hidratos de la carga: ${(c / n / perfil.peso).toFixed(1)} g/kg de media (${Math.round((c / oC) * 100)} % del objetivo)`);
ok(g / oG <= 1.05, `Grasa de la carga: ${Math.round(g / n)} g de media (${Math.round((g / oG) * 100)} % del objetivo)`);

process.exitCode = fallos ? 1 : 0;
