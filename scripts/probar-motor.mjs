// Comprueba que el motor genera menús que cumplen los objetivos con varios perfiles.
import { calcularObjetivos, macrosComida, recetaPermitida } from '../js/nutricion.js';
import { generarPlan } from '../js/planificador.js';
import { listaCompra } from '../js/compra.js';
import { RECETAS } from '../data/recetas.js';
import { ALIMENTOS } from '../data/alimentos.js';

// Todos los ingredientes de las recetas existen
for (const r of RECETAS) for (const i of r.ingredientes) if (!ALIMENTOS[i.a]) throw new Error(`${r.id}: ingrediente ${i.a} no existe`);

const perfiles = {
  'Hombre 80 kg perder': { sexo: 'h', edad: 32, altura: 178, peso: 80, actividad: 'moderado', objetivo: 'perder', ritmo: 'moderado', comidas: 4, dieta: 'omnivora', alergias: [], noMeGusta: [] },
  'Mujer 60 kg mantener': { sexo: 'm', edad: 28, altura: 165, peso: 60, actividad: 'ligero', objetivo: 'mantener', comidas: 3, dieta: 'omnivora', alergias: [], noMeGusta: [] },
  'Hombre 70 kg ganar 5 comidas': { sexo: 'h', edad: 24, altura: 180, peso: 70, actividad: 'alto', objetivo: 'ganar', ritmo: 'moderado', comidas: 5, dieta: 'omnivora', alergias: [], noMeGusta: [], sobras: true },
  'Vegetariana sin lactosa': { sexo: 'm', edad: 40, altura: 160, peso: 68, actividad: 'ligero', objetivo: 'perder', ritmo: 'suave', comidas: 4, dieta: 'vegetariana', alergias: ['lactosa'], noMeGusta: [] },
};

let fallos = 0;
for (const [nombre, perfil] of Object.entries(perfiles)) {
  const obj = calcularObjetivos(perfil);
  const plan = generarPlan(perfil, obj, { inicio: '2026-10-19', semilla: 42 });
  console.log(`\n== ${nombre}: ${obj.kcal} kcal · P ${obj.proteina} · C ${obj.hidratos} · G ${obj.grasa} (TMB ${obj.tmb}, GET ${obj.get})`);
  for (const dia of plan.dias) {
    const t = macrosComida(dia.comidas.flatMap((c) => c.ingredientes));
    const dk = (t.kcal / obj.kcal - 1) * 100;
    const dp = (t.p / obj.proteina - 1) * 100;
    const ok = Math.abs(dk) <= 8 && dp > (perfil.dieta === 'vegetariana' ? -20 : -10);
    if (!ok) fallos++;
    console.log(`${ok ? '✓' : '✗'} ${dia.fecha}  ${Math.round(t.kcal)} kcal (${dk >= 0 ? '+' : ''}${dk.toFixed(1)}%) · P ${Math.round(t.p)} (${dp.toFixed(0)}%) · C ${Math.round(t.c)} · G ${Math.round(t.g)} · fibra ${Math.round(t.f)}  | ${dia.comidas.map((c) => c.recetaId).join(', ')}`);
  }
  const l = listaCompra(plan);
  console.log(`   Compra: ${l.total.toFixed(2)} € (+ despensa ${l.totalDespensa.toFixed(2)} €) · coste real consumido ${l.costeConsumo.toFixed(2)} €/semana`);
  const sinRecetas = ['desayuno', 'snack', 'comida', 'cena'].filter((t) => !RECETAS.some((r) => r.tipos.includes(t) && recetaPermitida(r, perfil)));
  if (sinRecetas.length) { console.log(`   ✗ Sin recetas para: ${sinRecetas}`); fallos++; }
}
console.log(fallos ? `\n${fallos} días fuera de margen` : '\nTodo dentro de margen');
process.exitCode = fallos ? 1 : 0;
