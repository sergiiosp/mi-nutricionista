// Comprueba que el motor genera menús que cumplen los objetivos con varios perfiles.
// Uso: node scripts/probar-motor.mjs
import { calcularObjetivos, macrosComida, recetaPermitida, objetivosDia } from '../js/nutricion.js';
import { generarPlan } from '../js/planificador.js';
import { listaCompra } from '../js/compra.js';
import { recomendaciones } from '../js/salud.js';
import { RECETAS } from '../data/recetas.js';
import { ALIMENTOS } from '../data/alimentos.js';

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
