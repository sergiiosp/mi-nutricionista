// Prueba: comes como día de entreno y a media tarde cambias a descanso → el resto del día se reajusta
import { get } from 'svelte/store';
const { estado, actualizar, registroDePlan } = await import('../src/stores/estado.js');
const { crearPlan, marcarEntrenoDia, guardarHyrox } = await import('../src/lib/acciones.js');
const { estadoDia } = await import('../src/lib/dia.js');
const { calcularObjetivos, macrosComida, sumarMacros } = await import('../src/lib/nutricion.js');
const { hoyISO } = await import('../src/lib/planificador.js');

const perfil = { sexo: 'h', edad: 30, altura: 178, peso: 80, trabajo: 'sentado', trabajoInicio: '09:00', trabajoFin: '18:00', despertar: '07:00', dormir: '23:30', pasos: 'normal', entrena: true, deportes: ['fuerza', 'carrera'], diasEntreno: [0, 1, 2, 3, 4, 5, 6], horaEntreno: '18:30', duracionEntreno: 60, intensidad: 'moderada', objetivo: 'recomposicion', ritmo: 'moderado', comidas: 4, alergias: [], noMeGusta: [], dieta: 'omnivora', condiciones: [], whey: true };
actualizar((e) => { e.perfil = perfil; });
crearPlan();
const hoy = hoyISO();
const o = calcularObjetivos(perfil);
let e = get(estado);
const dia = e.plan.dias.find((d) => d.fecha === hoy);
// Desayuno y comida hechos como día de entreno
actualizar((x) => { x.registros[hoy] = dia.comidas.filter((c) => ['desayuno', 'comida'].includes(c.franja)).map((c) => registroDePlan(c, hoy)); });
const antes = estadoDia(get(estado), o, hoy, '15:00');
marcarEntrenoDia(hoy, 'no');
const despues = estadoDia(get(estado), o, hoy, '15:00');
const total = (d) => Math.round(sumarMacros([d.consumido, ...d.pendientes.map((c) => macrosComida(c.ingredientes))]).kcal);
console.log('Entreno: objetivo', antes.objetivo.kcal, '· previsto', total(antes));
console.log('Descanso: objetivo', despues.objetivo.kcal, '· previsto', total(despues));
for (const c of despues.comidas) console.log(' ', c.franja, c.situacion, Math.round(macrosComida(c.ingredientes).kcal), c.ajustada ? '(ajustada)' : '');
const ok = Math.abs(total(despues) - despues.objetivo.kcal) / despues.objetivo.kcal < 0.08;
console.log(ok ? '✓ el día de descanso cuadra' : '✗ no cuadra');
process.exitCode = ok ? 0 : 1;
