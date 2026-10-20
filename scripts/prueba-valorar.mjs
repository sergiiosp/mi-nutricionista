// Prueba: «no me gusta» quita el plato de los próximos días; «me gusta» lo guarda en favoritas
import { get } from 'svelte/store';
const { estado, actualizar } = await import('../src/stores/estado.js');
const { crearPlan, valorarPlato, alternarToma } = await import('../src/lib/acciones.js');
const { hoyISO } = await import('../src/lib/planificador.js');

const perfil = { sexo: 'h', edad: 30, altura: 178, peso: 80, trabajo: 'sentado', trabajoInicio: '09:00', trabajoFin: '18:00', despertar: '07:00', dormir: '23:30', pasos: 'normal', entrena: true, deportes: ['fuerza'], diasEntreno: [1, 2, 4, 5], horaEntreno: '18:30', duracionEntreno: 60, intensidad: 'moderada', objetivo: 'recomposicion', ritmo: 'moderado', comidas: 4, alergias: [], noMeGusta: [], dieta: 'omnivora', condiciones: [], leche: 'avena', whey: true };
actualizar((e) => { e.perfil = perfil; });
crearPlan();
let fallos = 0;
const ok = (c, t) => { console.log(`${c ? '✓' : '✗'} ${t}`); if (!c) fallos++; };
const hoy = hoyISO();
const futuras = () => get(estado).plan.dias.filter((d) => d.fecha > hoy).flatMap((d) => d.comidas.map((c) => c.recetaId));
const cuenta = {};
for (const id of futuras()) cuenta[id] = (cuenta[id] || 0) + 1;
const repetida = Object.entries(cuenta).sort((a, b) => b[1] - a[1])[0][0];
const deHoy = get(estado).plan.dias.find((d) => d.fecha === hoy).comidas.map((c) => c.recetaId).join();
valorarPlato(repetida, -1);
ok(!futuras().includes(repetida), `«No me gusta» quita ${repetida} de los próximos días`);
ok(get(estado).perfil.recetasNo.includes(repetida), 'Y no volverá a salir en menús nuevos');
ok(get(estado).plan.dias.find((d) => d.fecha === hoy).comidas.map((c) => c.recetaId).join() === deHoy, 'El menú de hoy no cambia');
valorarPlato(repetida, 1);
ok(get(estado).favoritas.includes(repetida) && !get(estado).perfil.recetasNo.includes(repetida), '«Me gusta» lo pasa a favoritas');
valorarPlato(repetida, 1);
ok(!get(estado).favoritas.includes(repetida), 'Tocar otra vez lo deshace');
alternarToma(hoy, 'creatina');
ok(get(estado).tomas[hoy]?.creatina === true, 'La creatina queda marcada como tomada hoy');
process.exitCode = fallos ? 1 : 0;
