// Prueba: el repaso del domingo (cuándo toca y qué ajuste propone), la media de 7 días del peso y la revisión
// de partida al empezar un bloque.
const { claveRepaso, tocaRepaso, repasoHecho, propuestas } = await import('../src/lib/feedback.js');
const { calcularObjetivos } = await import('../src/lib/nutricion.js');
const { mediaSemana } = await import('../src/lib/progreso.js');
const { estadoRevision } = await import('../src/lib/revision.js');
const { sumarDias } = await import('../src/lib/planificador.js');

let fallos = 0;
const ok = (c, t) => { console.log(`${c ? '✓' : '✗'} ${t}`); if (!c) fallos++; };
const perfil = { sexo: 'h', edad: 30, altura: 178, peso: 89.5, grasa: 14.4, trabajo: 'sentado', trabajoInicio: '09:00', trabajoFin: '18:00', despertar: '07:00', dormir: '23:30', pasos: 'normal', entrena: true, deportes: ['fuerza', 'carrera'], diasEntreno: [1, 2, 3, 5, 6], horaEntreno: '18:30', duracionEntreno: 60, intensidad: 'moderada', objetivo: 'perder', ritmo: 'moderado', comidas: 4, alergias: [], noMeGusta: [], dieta: 'omnivora', condiciones: [], leche: 'avena' };
const objetivos = calcularObjetivos(perfil);
const domingo = '2026-11-22';
const CINCO = { hambre: 'normal', entrenos: 'normales', sueno: 'normal', correr: 'igual', ropa: 'igual' };

// Cuándo toca
ok(claveRepaso(domingo) === '2026-11-16' && claveRepaso('2026-11-23') === '2026-11-16' && claveRepaso('2026-11-18') === '2026-11-16', 'El domingo y el lunes siguiente cuentan para la misma semana');
const e0 = { perfil, feedback: { semanas: {} } };
ok(tocaRepaso(e0, domingo) && tocaRepaso(e0, '2026-11-23') && !tocaRepaso(e0, '2026-11-18'), 'Toca el domingo (y el lunes si se pasó), no entre semana');
ok(!tocaRepaso({ perfil, feedback: { semanas: { '2026-11-16': { ...CINCO } } } }, domingo), 'Con las cinco preguntas contestadas, ya no toca');
ok(!repasoHecho({ hambre: 'normal' }) && tocaRepaso({ perfil, feedback: { semanas: { '2026-11-16': { hambre: 'normal' } } } }, domingo), 'A medias sigue tocando');

// Pesos de 3 semanas (un pesaje cada 3 días) con un ritmo dado
const pesos = (kgSemana) => Array.from({ length: 8 }, (_, i) => ({ fecha: sumarDias(domingo, -21 + i * 3), peso: Math.round((89.5 + (kgSemana * (-21 + i * 3)) / 7) * 10) / 10 }));
const kcal = (lista) => lista.filter((p) => p.id === 'kcal');
const e = (kgSemana, repaso = CINCO) => ({ perfil, pesos: pesos(kgSemana), feedback: { dias: {}, semanas: {} }, _r: repaso });
const prop = (kgSemana, repaso = CINCO) => propuestas(e(kgSemana), objetivos, domingo, repaso);

const estancado = kcal(prop(0));
ok(estancado.length === 1 && estancado[0].aplicar.ajusteKcal === -150, `Peso estancado: baja 150 kcal (${estancado[0]?.texto})`);
ok(kcal(prop(0, { ...CINCO, ropa: 'holgada' })).length === 0, 'Estancado pero la ropa más holgada: no se toca (bajas grasa)');
const hambre = kcal(prop(0, { ...CINCO, hambre: 'mucha', entrenos: 'flojos' }));
ok(hambre.length === 1 && hambre[0].aplicar.ajusteKcal === 150, 'Con hambre y sin fuerzas: sube 150, aunque el peso esté parado');
ok(kcal(prop(0, { ...CINCO, hambre: 'mucha' }))[0]?.aplicar.ajusteKcal === 100, 'Solo con hambre: sube 100');
const rapido = kcal(prop(-1.3));
ok(rapido.length === 1 && rapido[0].aplicar.ajusteKcal === 150, 'Bajando demasiado rápido: sube 150 para proteger el músculo');
ok(kcal(prop(-0.5)).length === 0, 'A buen ritmo y bien: no se toca nada');
ok(kcal(prop(-0.5, { ...CINCO, hambre: 'poca' }))[0]?.aplicar.ajusteKcal === -100, 'Te sobra comida y vas bien: baja 100');
ok([prop(0), prop(-1.3), prop(0, { ...CINCO, hambre: 'mucha' })].every((l) => kcal(l).length <= 1 && kcal(l).every((p) => Math.abs(p.aplicar.ajusteKcal) <= 150)), 'Nunca más de un cambio de kcal ni más de ±150');
ok(kcal(prop(0)).every((p) => /hidratos/.test(p.texto)), 'El cambio es en hidratos');

// Media de 7 días
const m = mediaSemana([{ fecha: '2026-11-10', peso: 90 }, { fecha: '2026-11-16', peso: 89 }, { fecha: '2026-11-18', peso: 89.4 }, { fecha: '2026-11-20', peso: 88.6 }]);
ok(m.peso === 89 && m.n === 3, `Media de 7 días: ${m.peso} kg con ${m.n} pesajes (el de hace 10 días no cuenta)`);

// Revisión de partida al empezar el bloque
const base = { perfil, pesos: [{ fecha: '2026-10-20', peso: 89.5 }], revisiones: [{ fecha: '2026-11-01' }], revisionDesde: '2026-11-16' };
ok(!estadoRevision(base, '2026-11-15').toca, 'Antes del lunes 16, la revisión no toca (la última fue el 1-nov)');
ok(estadoRevision(base, '2026-11-16').toca, 'El lunes 16 toca la revisión de partida');
ok(!estadoRevision({ ...base, revisiones: [...base.revisiones, { fecha: '2026-11-16' }] }, '2026-11-17').toca, 'Hecha la de partida, la siguiente a las 4 semanas');

console.log(fallos ? `\n${fallos} fallos` : '\nTodo bien');
process.exit(fallos ? 1 : 0);
