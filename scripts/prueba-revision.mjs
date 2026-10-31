// Prueba: la revisión del mes avisa cuando toca, guarda cada paso y resume lo que ha cambiado
import { get } from 'svelte/store';
const { estado, actualizar } = await import('../src/stores/estado.js');
const { empezarRevision, terminarRevision, posponerRevision } = await import('../src/lib/acciones.js');
const { estadoRevision, pasosRevision, resumenRevision } = await import('../src/lib/revision.js');
const { hoyISO, sumarDias } = await import('../src/lib/planificador.js');

let fallos = 0;
const ok = (c, t) => { console.log(`${c ? '✓' : '✗'} ${t}`); if (!c) fallos++; };
const hoy = hoyISO();
const perfil = { sexo: 'h', edad: 30, altura: 178, peso: 80, objetivo: 'recomposicion', ritmo: 'moderado', comidas: 4, alergias: [], noMeGusta: [], dieta: 'omnivora', condiciones: [] };
const hace = (n) => sumarDias(hoy, -n);
actualizar((e) => {
  e.perfil = perfil; e.diario = []; e.revisiones = []; e.revision = null; e.revisionPospuesta = null; e.fotosProgreso = []; e.tests = [];
  e.pesos = [{ fecha: hace(10), peso: 80.4, grasa: 18 }];
});
ok(!estadoRevision(get(estado), hoy).toca, 'Con 10 días de datos aún no toca la primera');
actualizar((e) => { e.pesos = [{ fecha: hace(30), peso: 81.2, grasa: 18.6, musculo: 61.8 }, { fecha: hace(10), peso: 80.4, grasa: 18 }]; e.tests = [{ fecha: hace(32), id: '5k', seg: 1500 }]; });
ok(estadoRevision(get(estado), hoy).aviso, 'A las 2 semanas del primer pesaje, Hoy avisa de la primera');
posponerRevision();
ok(!estadoRevision(get(estado), hoy).aviso && estadoRevision(get(estado), sumarDias(hoy, 3)).aviso, '«Más tarde» la aparta 3 días');

empezarRevision();
const inicio = get(estado).revision.inicio;
ok(pasosRevision(get(estado), inicio).every((p) => !p.hecho), 'Al empezar, ningún paso hecho');
actualizar((e) => { e.pesos.push({ fecha: hoy, peso: 79.9, grasa: 17.4, musculo: 62.2 }); e.tests.push({ fecha: hace(3), id: '5k', seg: 1452 }); e.fotosProgreso = ['frente', 'lado', 'espalda'].map((pose, i) => ({ id: `f${i}`, fecha: hoy, pose })); });
const pasos = pasosRevision(get(estado), inicio);
ok(pasos.length === 3 && pasos.every((p) => p.hecho), `Los 3 pasos hechos (el test de hace 3 días cuenta): ${pasos.map((p) => p.id).join(', ')}`);
ok(estadoRevision(get(estado), hoy).enCurso === inicio, 'Si cierras a medias, sigue en curso');

const r = resumenRevision(get(estado), inicio);
const f = (id) => r.filas.find((x) => x.id === id);
ok(f('peso').dif === -1.3 && f('grasa').dif === -1.2 && f('grasa').bien, `Peso y grasa frente a hace 4 semanas: ${f('peso').dif} kg, ${f('grasa').dif} %`);
ok(f('musculo').dif === 0.4 && f('musculo').bien && !f('cintura'), 'Músculo sube y ya no hay medidas');
ok(f('5k').dif === -48 && f('5k').bien, '5 km 48 s más rápido');
ok(r.titular.startsWith('Mes bueno'), `Titular: «${r.titular}»`);

terminarRevision();
const e = get(estado);
ok(!e.revision && e.revisiones.at(-1).fecha === hoy, 'Al terminar queda guardada y ya no está a medias');
ok(e.diario.some((d) => d.tipo === 'revision' && d.motivo.includes('grasa −1,2 %')), 'Queda en el diario del coach con lo que ha cambiado');
ok(!estadoRevision(e, hoy).toca && estadoRevision(e, sumarDias(hoy, 28)).toca, 'La siguiente toca en 4 semanas');
process.exitCode = fallos ? 1 : 0;
