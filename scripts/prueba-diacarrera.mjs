// Prueba: el modo día de carrera arma el día hora a hora (media maratón y HYROX)
import { get } from 'svelte/store';
const { actualizar, estado } = await import('../src/stores/estado.js');
const { guardarHyrox, guardarEvento } = await import('../src/lib/acciones.js');
const { hoyISO, sumarDias } = await import('../src/lib/planificador.js');
const { planDiaCarrera } = await import('../src/lib/hyrox/diaCarrera.js');

let fallos = 0;
const ok = (c, t) => { console.log(`${c ? '✓' : '✗'} ${t}`); if (!c) fallos++; };
const hoy = hoyISO();
actualizar((e) => { e.perfil = { sexo: 'h', edad: 30, altura: 178, peso: 80, objetivo: 'recomposicion', comidas: 4, condiciones: [] }; e.hyrox = null; });
guardarHyrox({ inicio: sumarDias(hoy, -14), fechaCarrera: sumarDias(hoy, 120), horaCarrera: '10:30', categoria: 'open', nivel: 'intermedio', dias: [1, 2, 4, 5], hora: '18:30', material: {}, lesiones: [], marcas: { t5k: 1440 }, enfoque: 'equilibrado', exigencia: 'normal' });
guardarEvento({ id: 'm', fecha: sumarDias(hoy, 6), hora: '09:00', km: 21.1, nombre: 'Media maratón' });
const m = planDiaCarrera(get(estado), sumarDias(hoy, 6));
ok(m?.tipo === 'popular' && m.items[0].hora === '06:15' && m.items.some((x) => x.titulo === 'Salida' && x.hora === '09:00'), `Media: desayuno a las ${m?.items[0].hora} y salida a las 09:00`);
ok(m.items.filter((x) => x.titulo.startsWith('Gel')).length === 2, `Dos geles: ${m.items.filter((x) => x.titulo.startsWith('Gel')).map((x) => `${x.titulo} (${x.hora})`).join(', ')}`);
ok(m.items.find((x) => x.titulo === 'Salida').lineas.length >= 4, 'La salida lleva tus pasos por km');
const h = planDiaCarrera(get(estado), sumarDias(hoy, 120));
ok(h?.tipo === 'hyrox' && h.items.some((x) => x.titulo === 'Salida' && x.hora === '10:30') && h.items.find((x) => x.titulo === 'Salida').lineas.length === 8, 'HYROX: salida a su hora y las 8 estaciones con su tiempo acumulado');
ok(!planDiaCarrera(get(estado), sumarDias(hoy, 3)), 'Un día sin carrera no tiene modo carrera');
process.exitCode = fallos ? 1 : 0;
