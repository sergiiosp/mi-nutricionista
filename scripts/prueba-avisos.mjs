// Prueba: avisos inteligentes (olvido de comida, pre-entreno, proteína, viaje y carrera)
import { get } from 'svelte/store';
const { estado, actualizar } = await import('../src/stores/estado.js');
const { crearPlan, guardarHyrox, guardarEvento, guardarViaje } = await import('../src/lib/acciones.js');
const { hoyISO, sumarDias } = await import('../src/lib/planificador.js');
const { calcularAvisos, PREFS_DEFECTO } = await import('../src/lib/nube/avisos.js');

const hoy = hoyISO();
const perfil = { sexo: 'h', edad: 30, altura: 178, peso: 80, trabajo: 'sentado', trabajoInicio: '09:00', trabajoFin: '18:00', despertar: '07:00', dormir: '23:30', pasos: 'normal', entrena: true, deportes: ['fuerza', 'carrera'], diasEntreno: [1, 2, 4, 5], horaEntreno: '18:30', duracionEntreno: 60, intensidad: 'moderada', objetivo: 'recomposicion', ritmo: 'moderado', comidas: 4, alergias: [], noMeGusta: [], dieta: 'omnivora', condiciones: [], leche: 'avena', whey: true };
actualizar((e) => { e.perfil = perfil; });
guardarHyrox({ inicio: sumarDias(hoy, -28), fechaCarrera: sumarDias(hoy, 120), categoria: 'open', nivel: 'intermedio', dias: [1, 2, 3, 4, 5, 6, 0], hora: '18:30', material: {}, lesiones: [], marcas: { t5k: 1440 }, enfoque: 'equilibrado', exigencia: 'normal' });
crearPlan();
guardarViaje({ id: 'v', nombre: 'Madrid', desde: sumarDias(hoy, 3), hasta: sumarDias(hoy, 4), comida: ['fuera', 'super'] });
guardarEvento({ id: 'm', fecha: sumarDias(hoy, 6), hora: '09:00', km: 21.1, nombre: 'Media maratón' });
const lista = calcularAvisos(get(estado), { ...PREFS_DEFECTO, activo: true }, new Date(`${hoy}T00:30:00`).getTime());
let fallos = 0;
const ok = (c, t) => { console.log(`${c ? '✓' : '✗'} ${t}`); if (!c) fallos++; };
const hay = (pre) => lista.filter((a) => a.etiqueta.startsWith(pre));
ok(hay('olvido-').length > 0, 'Aviso si se olvida apuntar la comida o la cena');
ok(hay('viaje-').length === 2, 'Aviso de comer fuera los días de viaje');
ok(hay('carrera-vispera').length === 1 && hay('carrera-desayuno').length === 1, 'Víspera y desayuno de la carrera');
ok(hay('proteina-').length === 0, 'Sin aviso de proteína si el menú del día llega');
ok(lista.every((a) => !('franja' in a)), 'Los avisos que se suben no llevan datos internos');
console.log(lista.slice(0, 6).map((a) => `${new Date(a.t).toISOString().slice(5, 16)} ${a.titulo} · ${a.cuerpo}`).join('\n'));
process.exitCode = fallos ? 1 : 0;
