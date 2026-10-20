// Prueba: el gasto real sale de lo que comes y la tendencia del peso, y ajusta las kcal desde mañana
import { get } from 'svelte/store';
const { estado, actualizar } = await import('../src/stores/estado.js');
const { crearPlan, revisarGasto } = await import('../src/lib/acciones.js');
const { calcularObjetivos, macrosComida } = await import('../src/lib/nutricion.js');
const { hoyISO, sumarDias } = await import('../src/lib/planificador.js');
const { gastoReal } = await import('../src/lib/gasto.js');

let fallos = 0;
const ok = (c, t) => { console.log(`${c ? '✓' : '✗'} ${t}`); if (!c) fallos++; };
const hoy = hoyISO();
const perfil = { sexo: 'h', edad: 30, altura: 178, peso: 80, trabajo: 'sentado', trabajoInicio: '09:00', trabajoFin: '18:00', despertar: '07:00', dormir: '23:30', pasos: 'normal', entrena: true, deportes: ['fuerza', 'carrera'], diasEntreno: [1, 2, 4, 5], horaEntreno: '18:30', duracionEntreno: 60, intensidad: 'moderada', objetivo: 'recomposicion', ritmo: 'moderado', comidas: 4, alergias: [], noMeGusta: [], dieta: 'omnivora', condiciones: [], leche: 'avena', whey: true };
actualizar((e) => { e.perfil = perfil; e.pesos = []; e.registros = {}; });
crearPlan();
const o = calcularObjetivos(perfil);
ok(!gastoReal(get(estado), o, hoy).listo, 'Sin datos, no hay estimación');

// 21 días comiendo 2.300 kcal y bajando 0,35 kg/semana → gasto ≈ 2.300 + 0,35 × 1.100 = 2.685
const reg = (f) => ({ id: f, fecha: f, hora: '14:00', franja: 'comida', tipo: 'alimento', ref: 'x', nombre: 'Día', macros: { kcal: 2300, p: 160, c: 250, g: 70 } });
actualizar((e) => {
  for (let i = 1; i <= 21; i++) e.registros[sumarDias(hoy, -i)] = [reg(sumarDias(hoy, -i))];
  for (let i = 21; i >= 1; i -= 3) e.pesos.push({ fecha: sumarDias(hoy, -i), peso: 80 - ((21 - i) / 7) * 0.35 });
});
const est = gastoReal(get(estado), o, hoy);
ok(est.listo && Math.abs(est.tdee - 2685) <= 30, `Gasto real ≈ 2.685 kcal (${est.tdee})`);
const kcalDia = (f) => Math.round(get(estado).plan.dias.find((d) => d.fecha === f).comidas.reduce((s, x) => s + macrosComida(x.ingredientes).kcal, 0));
const hoyAntes = kcalDia(hoy), mananaAntes = kcalDia(sumarDias(hoy, 1));
const r = revisarGasto(true);
ok(r.ajuste !== 0 && Math.abs(r.ajuste) <= 400, `Ajuste a medio camino y con tope (${r.ajuste} kcal; fórmula ${r.formula})`);
ok(get(estado).perfil.ajusteGasto === r.ajuste, 'El ajuste queda en el perfil');
ok(Math.abs(kcalDia(hoy) - hoyAntes) < 15, `Hoy no cambia (${hoyAntes} → ${kcalDia(hoy)})`);
ok(Math.sign(kcalDia(sumarDias(hoy, 1)) - mananaAntes) === Math.sign(r.ajuste), `Mañana cambia en el sentido del ajuste (${mananaAntes} → ${kcalDia(sumarDias(hoy, 1))})`);
const r2 = revisarGasto();
ok(r2.fecha === r.fecha && get(estado).perfil.ajusteGasto === r.ajuste, 'No se recalcula hasta dentro de una semana');
process.exitCode = fallos ? 1 : 0;
