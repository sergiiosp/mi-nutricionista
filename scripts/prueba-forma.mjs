// Prueba: «¿Cómo llegas hoy?» suaviza la sesión y la progresión de cargas propone el peso de hoy
import { get } from 'svelte/store';
const { estado, actualizar } = await import('../src/stores/estado.js');
const { crearPlan, guardarHyrox, guardarForma, borrarForma } = await import('../src/lib/acciones.js');
const { hoyISO, sumarDias } = await import('../src/lib/planificador.js');
const { planDe } = await import('../src/lib/hyrox/index.js');
const { siguienteCarga } = await import('../src/lib/hyrox/fuerza.js');

let fallos = 0;
const ok = (c, t) => { console.log(`${c ? '✓' : '✗'} ${t}`); if (!c) fallos++; };
const hoy = hoyISO();
const perfil = { sexo: 'h', edad: 30, altura: 178, peso: 80, trabajo: 'sentado', trabajoInicio: '09:00', trabajoFin: '18:00', despertar: '07:00', dormir: '23:30', pasos: 'normal', entrena: true, deportes: ['fuerza', 'carrera'], diasEntreno: [0, 1, 2, 3, 4, 5, 6], horaEntreno: '18:30', duracionEntreno: 60, intensidad: 'moderada', objetivo: 'recomposicion', ritmo: 'moderado', comidas: 4, alergias: [], noMeGusta: [], dieta: 'omnivora', condiciones: [], leche: 'avena', whey: true };
actualizar((e) => { e.perfil = perfil; });
guardarHyrox({ inicio: sumarDias(hoy, -14), fechaCarrera: sumarDias(hoy, 120), categoria: 'open', nivel: 'intermedio', dias: [0, 1, 2, 3, 4, 5, 6], hora: '18:30', material: {}, lesiones: [], marcas: { t5k: 1440 }, enfoque: 'equilibrado', exigencia: 'normal' });
crearPlan();
const fechaCon = (pred) => planDe(get(estado)).sesiones.find((s) => s.fecha >= hoy && pred(s));
const fuerza = fechaCon((s) => s.ejercicios?.length);
const antes = structuredClone(fuerza);
ok(guardarForma(fuerza.fecha, { sueno: 2, agujetas: 2, energia: 1 }) === 'bien', 'Bien dormido y sin agujetas: sesión tal cual');
ok(planDe(get(estado)).porFecha[fuerza.fecha].find((s) => s.id === antes.id).ejercicios[0].series === antes.ejercicios[0].series, 'No cambia nada');
ok(guardarForma(fuerza.fecha, { sueno: 0, agujetas: 1, energia: 1 }) === 'suave', 'Mal dormido y algo cargado: sesión suave');
const suave = planDe(get(estado)).porFecha[fuerza.fecha].find((s) => s.id === antes.id);
ok(suave.ejercicios[0].series === Math.max(2, antes.ejercicios[0].series - 1) && suave.rpe < antes.rpe, `Fuerza: una serie menos y menos RPE (${antes.ejercicios[0].series} → ${suave.ejercicios[0].series})`);
const series = fechaCon((s) => s.tipo === 'series');
if (series) {
  guardarForma(series.fecha, { sueno: 0, agujetas: 0, energia: 1 });
  const s2 = planDe(get(estado)).porFecha[series.fecha].find((s) => s.id === series.id);
  ok(s2.titulo !== series.titulo && s2.duracion < series.duracion, `Series: menos repeticiones («${series.titulo}» → «${s2.titulo}»)`);
}
borrarForma(fuerza.fecha);
ok(planDe(get(estado)).porFecha[fuerza.fecha].find((s) => s.id === antes.id).titulo === antes.titulo, 'Deshacer deja la sesión como estaba');

const ej = { id: 'sentadilla', series: 3, reps: '8-10' };
const ultima = (reps, rpe) => ({ kg: 60, rpe, series: reps.map((r) => ({ kg: 60, reps: r })) });
ok(siguienteCarga(ultima([10, 10, 10], 7), ej).kg === 62.5, 'Todas las series en 10 reps con RPE 7: +2,5 kg');
ok(siguienteCarga(ultima([10, 9, 8], 8), ej).kg === 60, 'Aún no llegas a 10 en todas: mismo peso');
ok(siguienteCarga(ultima([8, 7, 6], 9.5), ej).kg === 57.5, 'Te quedas corto al límite: un 5 % menos');
ok(siguienteCarga(ultima([10, 10, 10], 7), ej, 0.9).kg === 57.5, 'Llegando tocado: un 90 %');
process.exitCode = fallos ? 1 : 0;
