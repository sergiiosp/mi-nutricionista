// Prueba: la rutina de suelo pélvico avanza por fases, se activa de un toque (con más fibra en el menú por las
// hemorroides), sale antes de dormir y las sesiones de fuerza recuerdan respirar bien
import { get } from 'svelte/store';
const { estado, actualizar } = await import('../src/stores/estado.js');
const { activarSuelo, desactivarSuelo, alternarToma } = await import('../src/lib/acciones.js');
const { rutinaSuelo, horaSuelo, FASES_SUELO } = await import('../src/lib/suelo.js');
const { recomendaciones, preferenciasAlimentos } = await import('../src/lib/salud.js');
const { calcularObjetivos } = await import('../src/lib/nutricion.js');
const { construirSesion } = await import('../src/lib/hyrox/sesiones.js');
const { ritmos } = await import('../src/lib/hyrox/ritmos.js');
const { hoyISO, sumarDias } = await import('../src/lib/planificador.js');

let fallos = 0;
const ok = (c, t) => { console.log(`${c ? '✓' : '✗'} ${t}`); if (!c) fallos++; };
const hoy = hoyISO();

// Fases
ok(rutinaSuelo(hoy, hoy).fase.id === 'aprender' && rutinaSuelo(hoy, hoy).semana === 1, 'Empieza en «Aprender», semana 1');
ok(rutinaSuelo(hoy, sumarDias(hoy, 13)).fase.id === 'aprender' && rutinaSuelo(hoy, sumarDias(hoy, 14)).fase.id === 'fuerza', 'A las 2 semanas pasa a «Fuerza»');
ok(rutinaSuelo(hoy, sumarDias(hoy, 42)).fase.id === 'movimiento' && rutinaSuelo(hoy, sumarDias(hoy, 300)).fase.id === 'movimiento', 'Desde la semana 7, «En movimiento», y ahí se queda');
ok(rutinaSuelo(hoy, sumarDias(hoy, 10)).enDias === 4, 'Dice cuántos días faltan para la siguiente fase');
ok(FASES_SUELO.every((f) => f.ejercicios[0].nombre === 'Respira y suelta' && f.ejercicios.at(-1).nombre === 'Suelta del todo'), 'Todas las fases empiezan y acaban soltando');
ok(horaSuelo({ dormir: '23:30' }) === '23:00', 'Sale media hora antes de dormir');

// Activar
const perfil = { nombre: 'Sergio', sexo: 'h', edad: 30, altura: 178, peso: 80.1, grasa: 17.2, trabajo: 'sentado', trabajoInicio: '09:00', trabajoFin: '18:00', despertar: '07:00', dormir: '23:30', pasos: 'normal', entrena: true, deportes: ['fuerza'], diasEntreno: [1, 2, 4, 5], horaEntreno: '18:30', duracionEntreno: 60, intensidad: 'moderada', objetivo: 'recomposicion', ritmo: 'moderado', comidas: 4, alergias: [], noMeGusta: [], dieta: 'omnivora', condiciones: [], whey: true };
actualizar((e) => { e.perfil = { ...perfil }; e.propuestasVistas = {}; e.tomas = {}; });
activarSuelo();
let e = get(estado);
ok(e.perfil.sueloPelvico?.inicio === hoy && e.perfil.condiciones.includes('hemorroides') && e.propuestasVistas['suelo-pelvico'], 'Al activarla: empieza hoy, añade «hemorroides» al perfil y la propuesta desaparece');
alternarToma(hoy, 'suelo');
ok(get(estado).tomas[hoy].suelo, 'Se marca como hecha en el día');
const recs = recomendaciones(e.perfil, calcularObjetivos(e.perfil));
ok(recs.alimentacion.some((x) => x.titulo === 'Fibra y agua') && recs.habitos.some((x) => x.titulo === 'En el baño'), 'Salud da los consejos de fibra, agua y baño');
ok(preferenciasAlimentos(e.perfil).bonus.has('kiwi') && preferenciasAlimentos(e.perfil).bonus.has('avena'), 'El menú favorece kiwi, avena, legumbre e integrales');

// Sesiones: respirar bien en lo pesado
const config = { inicio: '2026-09-22', fechaCarrera: '2027-02-20', categoria: 'open', nivel: 'intermedio', dias: [1, 2, 4, 5], hora: '18:30', material: {}, lesiones: [], marcas: { t5k: 1440 }, enfoque: 'equilibrado', exigencia: 'normal' };
const rit = ritmos(config, e.perfil);
const fuerza = construirSesion({ tipo: 'fuerza', fase: 'base', config, perfil: e.perfil, rit, variante: 'P' });
const rodaje = construirSesion({ tipo: 'rodaje', fase: 'base', config, perfil: e.perfil, rit });
ok(fuerza.notas.some((n) => n.startsWith('Suelo pélvico')) && !rodaje.notas.some((n) => n.startsWith('Suelo pélvico')), 'La fuerza recuerda respirar sin aguantar el aire; el rodaje no');
desactivarSuelo();
e = get(estado);
ok(!e.perfil.sueloPelvico && !construirSesion({ tipo: 'fuerza', fase: 'base', config, perfil: e.perfil, rit, variante: 'P' }).notas.some((n) => n.startsWith('Suelo pélvico')), 'Al dejarla, desaparece de las sesiones');

process.exitCode = fallos ? 1 : 0;
