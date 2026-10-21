// Prueba: la nutrición cambia con la fase del plan HYROX (específico y puesta a punto, a mantenimiento)
import { get } from 'svelte/store';
const { estado, actualizar } = await import('../src/stores/estado.js');
const { crearPlan, guardarHyrox } = await import('../src/lib/acciones.js');
const { calcularObjetivos, ritmoFase } = await import('../src/lib/nutricion.js');
const { hoyISO, sumarDias } = await import('../src/lib/planificador.js');
const { planDe } = await import('../src/lib/hyrox/index.js');
const { semanaDe } = await import('../src/lib/hyrox/plan.js');

let fallos = 0;
const ok = (c, t) => { console.log(`${c ? '✓' : '✗'} ${t}`); if (!c) fallos++; };
ok(ritmoFase('recomposicion', -0.08, 'base') === -0.08 && Math.abs(ritmoFase('recomposicion', -0.08, 'construccion') + 0.048) < 1e-9 && ritmoFase('recomposicion', -0.08, 'especifico') === 0 && ritmoFase('ganar', 0.1, 'especifico') === 0.1 && ritmoFase('ganar', 0.1, 'taper') === 0, 'Déficit por fase: base igual, construcción más suave, específico y puesta a punto a mantenimiento');
const hoy = hoyISO();
const perfil = { sexo: 'h', edad: 30, altura: 178, peso: 80, trabajo: 'sentado', trabajoInicio: '09:00', trabajoFin: '18:00', despertar: '07:00', dormir: '23:30', pasos: 'normal', entrena: true, deportes: ['fuerza', 'carrera'], diasEntreno: [1, 2, 4, 5], horaEntreno: '18:30', duracionEntreno: 60, intensidad: 'moderada', objetivo: 'recomposicion', ritmo: 'moderado', comidas: 4, alergias: [], noMeGusta: [], dieta: 'omnivora', condiciones: [], leche: 'avena', whey: true };
const kcalDescanso = () => {
  const e = get(estado);
  const p = planDe(e);
  const d = e.plan.dias.find((x) => !(p.porFecha[x.fecha] || []).length && x.fecha > hoy);
  return { kcal: d?.objetivo.kcal, fase: semanaDe(p, d.fecha)?.fase };
};
actualizar((e) => { e.perfil = perfil; });
guardarHyrox({ inicio: sumarDias(hoy, -7), fechaCarrera: sumarDias(hoy, 150), categoria: 'open', nivel: 'intermedio', dias: [1, 2, 4, 5], hora: '18:30', material: {}, lesiones: [], marcas: { t5k: 1440 }, enfoque: 'equilibrado', exigencia: 'normal' });
crearPlan();
const base = kcalDescanso();
actualizar((e) => { e.hyrox = null; });
guardarHyrox({ inicio: sumarDias(hoy, -140), fechaCarrera: sumarDias(hoy, 40), categoria: 'open', nivel: 'intermedio', dias: [1, 2, 4, 5], hora: '18:30', material: {}, lesiones: [], marcas: { t5k: 1440 }, enfoque: 'equilibrado', exigencia: 'normal' });
crearPlan();
const esp = kcalDescanso();
const o = calcularObjetivos(perfil);
ok(base.fase === 'base' && esp.fase === 'especifico', `Fases de prueba: ${base.fase} y ${esp.fase}`);
ok(Math.abs(base.kcal - o.porTipo.descanso.kcal) <= 10, `En base, el descanso va con tu déficit (${base.kcal} kcal)`);
ok(esp.kcal > base.kcal + 100, `En específico, el descanso sube a mantenimiento (${base.kcal} → ${esp.kcal} kcal)`);
process.exitCode = fallos ? 1 : 0;
