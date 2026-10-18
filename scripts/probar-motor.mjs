// Comprueba que el motor genera menús que cumplen los objetivos con varios perfiles.
// Uso: node scripts/probar-motor.mjs
import { calcularObjetivos, macrosComida, recetaPermitida, objetivosDia } from '../src/lib/nutricion.js';
import { generarPlan } from '../src/lib/planificador.js';
import { listaCompra } from '../src/lib/compra.js';
import { recomendaciones } from '../src/lib/salud.js';
import { RECETAS } from '../src/data/recetas.js';
import { ALIMENTOS } from '../src/data/alimentos.js';

for (const r of RECETAS) for (const i of r.ingredientes) if (!ALIMENTOS[i.a]) throw new Error(`${r.id}: ingrediente ${i.a} no existe`);

const comun = { alergias: [], noMeGusta: [], dieta: 'omnivora', condiciones: [], despertar: '07:00', dormir: '23:30', pasos: 'normal' };
const perfiles = {
  'Oficina, fuerza 18:30, perder': { ...comun, sexo: 'h', edad: 32, altura: 178, peso: 82.5, trabajo: 'sentado', trabajoInicio: '09:00', trabajoFin: '18:00', entrena: true, deportes: ['fuerza'], diasEntreno: [1, 2, 4, 5], horaEntreno: '18:30', duracionEntreno: 60, intensidad: 'moderada', objetivo: 'perder', ritmo: 'moderado', comidas: 4, sobras: true },
  'Corredora que compite, mantener': { ...comun, sexo: 'm', edad: 28, altura: 165, peso: 58, trabajo: 'de_pie', trabajoInicio: '08:00', trabajoFin: '15:00', pasos: 'bastantes', entrena: true, deportes: ['carrera'], diasEntreno: [2, 4, 6, 0], horaEntreno: '19:00', duracionEntreno: 75, intensidad: 'intensa', compite: true, objetivo: 'mantener', comidas: 5 },
  'Entreno 7:00 en ayunas, ganar': { ...comun, sexo: 'h', edad: 24, altura: 180, peso: 70, trabajo: 'fisico', trabajoInicio: '09:00', trabajoFin: '17:00', despertar: '06:30', entrena: true, deportes: ['fuerza', 'hiit'], diasEntreno: [1, 3, 5], horaEntreno: '07:00', duracionEntreno: 60, intensidad: 'intensa', objetivo: 'ganar', ritmo: 'moderado', comidas: 5 },
  'Sin entreno, anemia + tensión': { ...comun, sexo: 'm', edad: 45, altura: 160, peso: 68, trabajo: 'sentado', trabajoInicio: '08:00', trabajoFin: '15:00', pasos: 'pocos', entrena: false, objetivo: 'perder', ritmo: 'suave', comidas: 3, condiciones: ['anemia', 'hipertension'], estres: 'alto', sueno: 'poco' },
  'Perfil antiguo (sin cuestionario nuevo)': { ...comun, sexo: 'h', edad: 32, altura: 178, peso: 80, actividad: 'moderado', objetivo: 'perder', ritmo: 'moderado', comidas: 4 },
  'Vegetariana sin lactosa': { ...comun, sexo: 'm', edad: 40, altura: 160, peso: 68, trabajo: 'sentado', entrena: true, deportes: ['otro'], diasEntreno: [2, 4], horaEntreno: '20:00', duracionEntreno: 60, intensidad: 'suave', objetivo: 'perder', ritmo: 'suave', comidas: 4, dieta: 'vegetariana', alergias: ['lactosa'] },
};

let fallos = 0;
for (const [nombre, perfil] of Object.entries(perfiles)) {
  const obj = calcularObjetivos(perfil);
  const plan = generarPlan(perfil, obj, { inicio: '2026-10-19', semilla: 42 });
  const e = obj.porTipo.entreno;
  const r = obj.porTipo.descanso;
  console.log(`\n== ${nombre}\n   Entreno: ${e.kcal} kcal (P ${e.proteina} H ${e.hidratos} G ${e.grasa}) · Descanso: ${r.kcal} kcal (H ${r.hidratos}) · media ${obj.kcal} · ${obj.gKg} g/kg · sesión ${obj.kcalSesion} kcal`);
  for (const dia of plan.dias) {
    const o = objetivosDia(obj, dia.entreno);
    const t = macrosComida(dia.comidas.flatMap((c) => c.ingredientes));
    const dk = (t.kcal / o.kcal - 1) * 100;
    const dp = (t.p / o.proteina - 1) * 100;
    const ok = Math.abs(dk) <= 8 && dp > (perfil.dieta === 'vegetariana' ? -20 : -12);
    if (!ok) fallos++;
    const franjas = dia.comidas.map((c) => `${c.hora} ${c.franja}${c.etiqueta ? `[${c.etiqueta}]` : ''}`).join(', ');
    console.log(`${ok ? '✓' : '✗'} ${dia.fecha} ${dia.entreno ? `💪${dia.sesion?.inicio}` : '😌     '} ${Math.round(t.kcal)}/${o.kcal} kcal (${dk >= 0 ? '+' : ''}${dk.toFixed(1)}%) P ${Math.round(t.p)} (${dp.toFixed(0)}%) H ${Math.round(t.c)} | ${franjas}`);
    for (const c of dia.consejos || []) console.log(`      consejo: ${c}`);
  }
  const l = listaCompra(plan);
  const recs = recomendaciones(perfil, obj);
  console.log(`   Compra: ${l.total.toFixed(2)} € · consumo ${l.costeConsumo.toFixed(2)} €/semana · suplementos: ${recs.suplementos.map((s) => s.id).join(', ')} · avisos: ${recs.avisos.length}`);
  const sinRecetas = ['desayuno', 'snack', 'comida', 'cena'].filter((t) => !RECETAS.some((x) => x.tipos.includes(t) && recetaPermitida(x, perfil)));
  if (sinRecetas.length) { console.log(`   ✗ Sin recetas para: ${sinRecetas}`); fallos++; }
}
console.log(fallos ? `\n${fallos} días fuera de margen` : '\nTodo dentro de margen');
process.exitCode = fallos ? 1 : 0;

// ── Plan HYROX ─────────────────────────────────────────────────────────────
const { generarPlanHyrox } = await import('../src/lib/hyrox/plan.js');
const { estimarCarrera } = await import('../src/lib/hyrox/carrera.js');
const { hms } = await import('../src/lib/hyrox/ritmos.js');
const perfilH = { sexo: 'h', peso: 82.5, horaEntreno: '18:30' };
const configH = { inicio: '2026-10-12', fechaCarrera: '2027-02-20', categoria: 'open', nivel: 'intermedio', dias: [1, 2, 4, 5, 6], hora: '18:30', material: {}, lesiones: [], marcas: { t5k: 1500 } };
let fallosH = 0;
const comprobar = (cond, texto) => { console.log(`${cond ? '✓' : '✗'} ${texto}`); if (!cond) fallosH++; };
const ph = generarPlanHyrox({ config: configH }, perfilH, '2026-10-12');
console.log(`\n== HYROX: ${ph.N} semanas hasta ${ph.carrera}`);
comprobar(ph.sesiones.at(-1).tipo === 'carrera' && ph.sesiones.at(-1).fecha === '2027-02-20', 'La última sesión es la carrera, en su fecha');
comprobar(ph.sesiones.some((s) => s.tipo === 'activacion' && s.fecha === '2027-02-19'), 'Activación la víspera');
comprobar(ph.semanas.some((s) => s.deload), 'Hay semanas de descarga');
comprobar(ph.sesiones.filter((s) => s.tipo === 'simulacro').length >= 2, 'Hay al menos 2 simulacros');
comprobar(ph.diasCarga.join() === '2027-02-18,2027-02-19', 'Carga de hidratos los dos días previos');
// Ajuste: semana 0 muy dura → semana 1 baja el volumen
const regs = Object.fromEntries(ph.semanas[0].sesiones.map((s) => [s.id, { estado: 'completa', rpe: Math.min(10, s.rpe + 2), sensacion: 'mal' }]));
const ph2 = generarPlanHyrox({ config: configH, registros: regs }, perfilH, '2026-10-20');
comprobar(ph2.semanas[1].ajuste.factor < 1, 'Si la semana fue muy dura, la siguiente baja la carga');
const est = estimarCarrera(configH, perfilH);
comprobar(est.total > 3600 && est.total < 7200, `Estimación razonable: ${hms(est.total)}`);

// ── Sincronización: juntar versiones de dos dispositivos ───────────────────
const { fusionar, aplanar, desaplanar } = await import('../src/lib/nube/sincro.js');
const ahora = Date.now();
const m = fusionar(
  { p: { tema: 'claro', 'registros/2026-10-12': ['a'], 'registros/2026-10-13': ['b'] }, t: { tema: ahora - 100, 'registros/2026-10-14': ahora - 10 } },
  { p: { tema: 'oscuro', 'registros/2026-10-12': ['a'], 'registros/2026-10-14': ['c'] }, t: { tema: ahora - 50, 'registros/2026-10-14': ahora - 500 } },
  ahora,
);
comprobar(m.p.tema === 'oscuro', 'Sincro: gana el cambio más reciente');
comprobar(m.p['registros/2026-10-13'] && !m.p['registros/2026-10-14'], 'Sincro: se juntan los días y los borrados recientes ganan');
comprobar(m.cambiaLocal && m.cambiaRemoto, 'Sincro: hay que aplicar y subir');
const estadoH = { perfil: { peso: 80 }, registros: { d: [1] }, hyrox: { config: { a: 1 }, registros: { s1: { estado: 'completa' } }, movidas: {} }, fotosProgreso: [{ id: 'f' }] };
const ida = desaplanar(aplanar(estadoH));
comprobar(ida.hyrox.registros.s1.estado === 'completa' && ida.registros.d && !ida.fotosProgreso.length, 'Sincro: aplanar y reconstruir conserva los datos (las fotos se quedan en local)');
// ── Fuerza dos días, sin gimnasio y «hoy no entreno» ─────────────────────
const cfg4 = { ...configH, dias: [1, 3, 4, 6] };
const ph4 = generarPlanHyrox({ config: cfg4 }, perfilH, '2026-10-12');
comprobar(ph4.semanas[0].sesiones.filter((s) => s.tipo === 'fuerza').length === 2, 'HYROX: con 4 días hay 2 sesiones de fuerza (A y B)');
const idF = ph4.semanas[0].sesiones.find((s) => s.tipo === 'fuerza').id;
const sinGym = generarPlanHyrox({ config: cfg4, sinGym: { [idF]: true } }, perfilH, '2026-10-12').sesiones.find((s) => s.id === idF);
comprobar(sinGym.sinGym && !/barra|mancuerna/i.test(sinGym.bloques[0].lineas.join(' ')), 'HYROX: la sesión sin gimnasio no usa barra ni mancuernas');
const { proveedorDe } = await import('../src/lib/hyrox/index.js');
const { metaDia } = await import('../src/lib/nutricion.js');
const fechaF = ph4.semanas[0].sesiones.find((s) => s.id === idF).fecha;
const estH = { perfil: { ...perfiles['Oficina, fuerza 18:30, perder'], peso: 82.5 }, hyrox: { config: cfg4, registros: {}, movidas: {} }, entrenoDia: { [fechaF]: 'no' } };
const objH = calcularObjetivos(estH.perfil);
const conEntreno = metaDia(objH, proveedorDe({ ...estH, entrenoDia: {} })(fechaF));
const sinEntreno = metaDia(objH, proveedorDe(estH)(fechaF));
comprobar(sinEntreno.kcal < conEntreno.kcal, `«Hoy no entreno» baja las kcal del día (${conEntreno.kcal} → ${sinEntreno.kcal})`);

const ph6 = generarPlanHyrox({ config: { ...configH, dias: [1, 2, 3, 4, 5, 6], enfoque: 'equilibrado', exigencia: 'muy' } }, perfilH, '2026-10-12');
const tiposS0 = ph6.semanas[0].sesiones.map((s) => s.tipo);
comprobar(tiposS0.filter((t) => t === 'torso').length === 2 && tiposS0.filter((t) => t === 'fuerza').length === 1, 'HYROX + físico con 6 días: pierna, 2 de torso y brazos, carrera y estaciones');
comprobar(/pecho|banca/i.test(ph6.sesiones.find((s) => s.tipo === 'torso').bloques[0].lineas.join(' ')), 'Torso A trabaja pecho');

// ── Comidas montadas por ingredientes ─────────────────────────────────────
const { proponerCombos, montarCombo } = await import('../src/lib/combos.js');
const perfilD = { ...comun, sexo: 'h', edad: 32, altura: 178, peso: 80, objetivo: 'perder', ritmo: 'moderado', comidas: 4 };
const objD = { kcal: 480, p: 30, c: 58, g: 13 };
const props = proponerCombos(perfilD, 'd', objD, { n: 4, semilla: 3 });
comprobar(props.length === 4 && props.every((x) => Math.abs(macrosComida(x.ingredientes).kcal - objD.kcal) < objD.kcal * 0.12), 'Combos: 4 desayunos propuestos que cuadran las kcal');
const mio = montarCombo('d', ['cereales_trigo_0', 'bebida_almendra', 'yogur_proteinas', 'platano', 'matcha'], objD);
comprobar(mio && Math.abs(mio.macros.kcal - objD.kcal) < objD.kcal * 0.15 && mio.ingredientes.find((i) => i.a === 'matcha').g === 2, `Combos: desayuno montado a mano ajustado (${Math.round(mio.macros.kcal)} kcal)`);
// Alguien a quien no le encaja ninguna receta de desayuno: nunca se queda sin desayuno
const exigente = { ...perfilD, alergias: ['gluten', 'lactosa', 'huevo'], noMeGusta: ['platano', 'fresas', 'kiwi', 'manzana', 'pera', 'avena', 'pan_integral', 'pan_molde', 'tortitas_arroz', 'aguacate'] };
const planE = generarPlan(exigente, calcularObjetivos(exigente), { inicio: '2026-10-19', semilla: 5 });
comprobar(planE.dias.every((d) => d.comidas.some((c) => c.franja === 'desayuno')), 'Menú: con muchas restricciones sigue habiendo desayuno todos los días');
const fav = 'combo:d:cereales_trigo_0+bebida_almendra+yogur_proteinas+platano';
const planF = generarPlan(perfilD, calcularObjetivos(perfilD), { inicio: '2026-10-19', semilla: 5, favoritas: [fav] });
comprobar(planF.dias.some((d) => d.comidas.some((c) => c.recetaId === fav)), 'Menú: usa tus comidas favoritas');

// ── Alergias por fruto seco y recetas adaptadas ───────────────────────────
const { alimentoPermitido } = await import('../src/lib/nutricion.js');
const { adaptarReceta } = await import('../src/lib/sustituciones.js');
const alergicoNueces = { ...perfilD, alergias: ['cacahuete', 'nueces', 'avellana', 'anacardo'], leche: 'avena' };
comprobar(alimentoPermitido('almendra_tostada', alergicoNueces) && alimentoPermitido('pistacho', alergicoNueces)
  && !alimentoPermitido('crema_cacahuete', alergicoNueces) && !alimentoPermitido('frutos_secos_mix', alergicoNueces),
'Alergias: con cacahuete y nueces sí se permiten almendra y pistacho, pero no la mezcla de frutos secos');
comprobar(!alimentoPermitido('pistacho', { ...perfilD, alergias: ['frutos_secos'] }), 'Alergias: «todos los frutos secos» bloquea también el pistacho');
const porridge = adaptarReceta(RECETAS.find((r) => r.id === 'porridge-proteico'), alergicoNueces);
comprobar(porridge.ingredientes.some((i) => i.a === 'almendra_tostada') && porridge.ingredientes.some((i) => i.a === 'bebida_avena')
  && !/cacahuete|leche/i.test(porridge.pasos.join(' ')) && recetaPermitida(porridge, alergicoNueces),
'Recetas: el porridge cambia la crema de cacahuete por almendra tostada y la leche por bebida de avena');
const planN = generarPlan(alergicoNueces, calcularObjetivos(alergicoNueces), { inicio: '2026-10-19', semilla: 7 });
comprobar(planN.dias.every((d) => d.comidas.every((c) => c.ingredientes.every((i) => alimentoPermitido(i.a, alergicoNueces) && !i.a.startsWith('leche_')))),
  'Menú: con alergia a nueces y bebida vegetal no aparece nada prohibido ni leche de vaca');

// ── Pesos por serie y progresión por zonas ────────────────────────────────
const { historialFuerza, progresoGrupos } = await import('../src/lib/hyrox/fuerza.js');
const regsF = {
  a: { estado: 'completa', fecha: '2026-09-01', series: { press_banca: [{ kg: 60, reps: 8 }], sentadilla: [{ kg: 80, reps: 6 }] } },
  b: { estado: 'completa', fecha: '2026-10-10', series: { press_banca: [{ kg: 65, reps: 8 }], sentadilla: [{ kg: 80, reps: 5 }] } },
};
const pg = progresoGrupos(historialFuerza(regsF), '2026-10-16');
comprobar(pg.grupos.find((g) => g.grupo === 'pecho').cambio > 5 && pg.flojo?.grupo === 'pierna', 'Fuerza: el pecho sube y la pierna sale como la zona más floja');
const torsoA = ph6.sesiones.find((s) => s.tipo === 'torso');
comprobar(torsoA.ejercicios.length >= 5 && torsoA.ejercicios.every((x) => x.series > 0 && x.grupo), 'Fuerza: las sesiones de torso traen sus ejercicios para apuntar kilos');

// ── Sugerencias para cerrar el día ────────────────────────────────────────
const { sugerencias } = await import('../src/lib/dia.js');
const sug = sugerencias({ kcal: 60, p: 30, c: 0, g: 0 }, { ...alergicoNueces, whey: true });
comprobar(sug.length && sug[0].m.p >= 20, `Sugerencias: si solo falta proteína se propone algo proteico (${sug[0]?.nombre})`);

// ── Que no se pierda nada al cambiar el plan o actualizar la app ──────────
const { copiaSesion } = await import('../src/lib/hyrox/sesiones.js');
const sesF = ph.sesiones.find((s) => s.tipo === 'fuerza' && s.fecha < '2026-10-19');
const regsC = { [sesF.id]: { estado: 'completa', rpe: 7, fecha: sesF.fecha, series: { sentadilla: [{ kg: 80, reps: 6 }] }, sesion: copiaSesion(sesF) } };
// Cambias los días de entreno: ese día ya no está en el plan, pero tu sesión sigue ahí tal cual
const phDias = generarPlanHyrox({ config: { ...configH, dias: [3, 0] }, registros: regsC }, perfilH, '2026-10-20');
const sigue = phDias.sesiones.find((s) => s.id === sesF.id);
comprobar(sigue && sigue.fecha === sesF.fecha && sigue.titulo === sesF.titulo && sigue.ejercicios.length === sesF.ejercicios.length, 'Registros: una sesión hecha no desaparece al cambiar los días de entreno');
comprobar(phDias.porFecha[sesF.fecha]?.some((s) => s.id === sesF.id), 'Registros: y sigue saliendo en su día');
// Sesión registrada sin copia (versiones anteriores) en un día que ya no existe: sale como «Entreno registrado»
const phViejo = generarPlanHyrox({ config: { ...configH, dias: [3, 0] }, registros: { 's0-9': { estado: 'completa', fechaRegistro: '2026-10-14', duracion: 50 } } }, perfilH, '2026-10-20');
comprobar(phViejo.sesiones.some((s) => s.id === 's0-9' && s.tipo === 'registrada' && s.fecha === '2026-10-14'), 'Registros: los antiguos sin copia también se ven');
// Si el plan cambia el contenido de una sesión ya hecha, se mantiene lo que hiciste
const otra = generarPlanHyrox({ config: { ...configH, exigencia: 'muy' }, registros: regsC }, perfilH, '2026-10-20').sesiones.find((s) => s.id === sesF.id);
comprobar(otra.duracion === sesF.duracion && JSON.stringify(otra.bloques) === JSON.stringify(sesF.bloques), 'Registros: una sesión hecha no cambia aunque cambie la exigencia');

const { coincide, textoAlimento } = await import('../src/lib/buscar.js');
comprobar(coincide(textoAlimento(ALIMENTOS.confitura), 'mermelada 0 fresa') && coincide(textoAlimento(ALIMENTOS.batata), 'boniato')
  && coincide(textoAlimento(ALIMENTOS.yogur_proteinas), 'yogures proteina'), 'Buscador: mermelada → confitura, boniato → batata, «yogures proteina» → postre +Proteínas');

if (fallosH) process.exitCode = 1;
