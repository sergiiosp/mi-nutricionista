// Prueba: el simulador «¿y si…?» proyecta con sentido (más déficit, más pérdida; demasiado, aviso)
const { baseSimulador, simular, avisosSimulacion, semanasHasta } = await import('../src/lib/simulador.js');

let fallos = 0;
const ok = (c, t) => { console.log(`${c ? '✓' : '✗'} ${t}`); if (!c) fallos++; };
const hoy = '2026-10-20';
const perfil = { sexo: 'h', edad: 30, altura: 178, peso: 80, grasa: 17, trabajo: 'sentado', pasos: 'normal', entrena: true, deportes: ['fuerza', 'carrera'], diasEntreno: [1, 2, 4, 5], duracionEntreno: 60, intensidad: 'moderada', objetivo: 'recomposicion', ritmo: 'moderado', comidas: 4, condiciones: [] };
const e = { perfil, pesos: [], hyrox: { config: { fechaCarrera: '2027-02-20', dias: [1, 2, 4, 5] } } };
const b = baseSimulador(e, hoy);
const s = semanasHasta(hoy, b.carrera);
ok(b.sesiones === 4 && b.gasto > b.kcal && s === 18, `Base: gasta ${b.gasto}, come ${b.kcal}, 4 sesiones, ${s} semanas a la carrera`);

const plan = simular(b, { kcal: b.kcal, sesiones: 4, semanas: s });
ok(plan.dPeso < 0 && plan.grasa < 17, `Con tu plan: ${plan.peso.toFixed(1)} kg y ${plan.grasa.toFixed(1)} % el día de la carrera`);
const menos = simular(b, { kcal: b.kcal - 300, sesiones: 4, semanas: s });
ok(menos.peso < plan.peso && menos.grasa < plan.grasa, `300 kcal menos: ${menos.peso.toFixed(1)} kg (más pérdida)`);
const finde = simular(b, { kcal: b.kcal, sesiones: 4, extraFinde: 700, semanas: s });
ok(finde.peso > plan.peso, `+700 kcal el fin de semana se come parte del déficit: ${finde.peso.toFixed(1)} kg`);
const mas = simular(b, { kcal: b.kcal, sesiones: 6, semanas: s });
ok(mas.peso < plan.peso, `Dos sesiones más: ${mas.peso.toFixed(1)} kg`);
const largo = simular(b, { kcal: b.kcal - 300, sesiones: 4, semanas: 52 });
const lineal = b.peso + ((b.kcal - 300 - b.gasto) * 364) / 7700;
ok(largo.peso > lineal, 'El gasto baja al perder peso: la pérdida se frena (no es lineal)');
const bruto = simular(b, { kcal: 1400, sesiones: 4, semanas: 12 });
const av = avisosSimulacion(b, { kcal: 1400, sesiones: 4 }, bruto);
ok(av.some((a) => a.tipo === 'mal') && bruto.dMagra < 0, `Déficit brutal: aviso y pérdida de magra (${bruto.dMagra.toFixed(1)} kg)`);
ok(avisosSimulacion(b, { kcal: b.kcal, sesiones: 4 }, plan).some((a) => a.tipo === 'bien'), 'Tu plan: ritmo sostenible');
const sinGrasa = simular(baseSimulador({ ...e, perfil: { ...perfil, grasa: null } }, hoy), { kcal: b.kcal, sesiones: 4, semanas: 4 });
ok(sinGrasa.grasa == null && Number.isFinite(sinGrasa.peso), 'Sin dato de grasa, simula solo el peso');
process.exitCode = fallos ? 1 : 0;
