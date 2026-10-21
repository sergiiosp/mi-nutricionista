// Prueba: los tests actualizan tus ritmos y el predictor de HYROX
import { get } from 'svelte/store';
const { estado, actualizar } = await import('../src/stores/estado.js');
const { guardarHyrox, guardarTest } = await import('../src/lib/acciones.js');
const { hoyISO, sumarDias } = await import('../src/lib/planificador.js');
const { planDe } = await import('../src/lib/hyrox/index.js');
const { estimarCarrera } = await import('../src/lib/hyrox/carrera.js');
const { estadoTests } = await import('../src/lib/hyrox/tests.js');

let fallos = 0;
const ok = (c, t) => { console.log(`${c ? '✓' : '✗'} ${t}`); if (!c) fallos++; };
const hoy = hoyISO();
const perfil = { sexo: 'h', edad: 30, altura: 178, peso: 80, trabajo: 'sentado', trabajoInicio: '09:00', trabajoFin: '18:00', despertar: '07:00', dormir: '23:30', pasos: 'normal', entrena: true, deportes: ['fuerza', 'carrera'], diasEntreno: [1, 2, 4, 5], horaEntreno: '18:30', duracionEntreno: 60, intensidad: 'moderada', objetivo: 'recomposicion', ritmo: 'moderado', comidas: 4, alergias: [], noMeGusta: [], dieta: 'omnivora', condiciones: [], leche: 'avena', whey: true };
actualizar((e) => { e.perfil = perfil; e.tests = []; e.diario = []; });
guardarHyrox({ inicio: sumarDias(hoy, -14), fechaCarrera: sumarDias(hoy, 120), categoria: 'open', nivel: 'intermedio', dias: [1, 2, 4, 5], hora: '18:30', material: {}, lesiones: [], marcas: { t5k: 1500 }, enfoque: 'equilibrado', exigencia: 'normal' });
ok(estadoTests([], hoy).toca, 'Sin tests, toca hacer el primero');
const z2Antes = planDe(get(estado)).ritmos.z2;
const predAntes = estimarCarrera(get(estado).hyrox.config, perfil, {}, []).total;
guardarTest(sumarDias(hoy, -40), '5k', 1500);
guardarTest(hoy, '5k', 1440);
ok(get(estado).hyrox.config.marcas.t5k === 1440, 'El último 5 km pasa a ser tu marca (24:00)');
ok(planDe(get(estado)).ritmos.z2 < z2Antes, 'Tus ritmos de entreno se ajustan (más rápidos)');
guardarTest(hoy, 'wallballs', 280);
const pred = estimarCarrera(get(estado).hyrox.config, perfil, {}, get(estado).tests);
ok(pred.tramos.find((t) => t.id === 'wallballs').seg === 280 && pred.total < predAntes, `El predictor usa tus tests (${Math.round(predAntes / 60)} → ${Math.round(pred.total / 60)} min)`);
ok(!estadoTests(get(estado).tests, hoy).toca, 'Con un test reciente, aún no toca repetir');
ok(get(estado).diario.some((d) => d.tipo === 'test-5k' && d.motivo.includes('Mejoras')), 'Queda en el diario del coach que mejoras');
process.exitCode = fallos ? 1 : 0;
