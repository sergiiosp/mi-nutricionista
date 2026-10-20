// Prueba: una media maratón el domingo y un viaje de jueves a sábado → entreno y menú se adaptan
import { get } from 'svelte/store';
const { estado, actualizar } = await import('../src/stores/estado.js');
const { crearPlan, guardarHyrox, guardarEvento, guardarViaje } = await import('../src/lib/acciones.js');
const { macrosComida } = await import('../src/lib/nutricion.js');
const { hoyISO, sumarDias, recetaPorId } = await import('../src/lib/planificador.js');
const { planDe } = await import('../src/lib/hyrox/index.js');
const { listaCompra } = await import('../src/lib/compra.js');

const hoy = hoyISO();
const perfil = { sexo: 'h', edad: 30, altura: 178, peso: 80, trabajo: 'sentado', trabajoInicio: '09:00', trabajoFin: '18:00', despertar: '07:00', dormir: '23:30', pasos: 'normal', entrena: true, deportes: ['fuerza', 'carrera'], diasEntreno: [1, 2, 4, 5], horaEntreno: '18:30', duracionEntreno: 60, intensidad: 'moderada', objetivo: 'recomposicion', ritmo: 'moderado', comidas: 4, alergias: ['cacahuete', 'nueces', 'avellana', 'anacardo', 'verdura_cruda'], noMeGusta: [], dieta: 'omnivora', condiciones: [], leche: 'avena', whey: true };
actualizar((e) => { e.perfil = perfil; });
guardarHyrox({ inicio: sumarDias(hoy, -28), fechaCarrera: sumarDias(hoy, 120), categoria: 'open', nivel: 'intermedio', dias: [1, 2, 4, 5], hora: '18:30', material: {}, lesiones: [], marcas: { t5k: 1440 }, enfoque: 'equilibrado', exigencia: 'normal' });
crearPlan();
const carrera = sumarDias(hoy, 6);
guardarViaje({ id: 'v', nombre: 'Madrid', desde: sumarDias(hoy, 3), hasta: sumarDias(hoy, 5), comida: ['fuera', 'super'] });
guardarEvento({ id: 'm', fecha: carrera, hora: '09:00', km: 21.1, nombre: 'Media maratón' });
const e = get(estado);
const plan = planDe(e);
let fallos = 0;
const ok = (c, t) => { console.log(`${c ? '✓' : '✗'} ${t}`); if (!c) fallos++; };
for (const d of e.plan.dias) {
  const ses = (plan.porFecha[d.fecha] || []).map((s) => s.tipo).join(',') || '—';
  const kcal = Math.round(d.comidas.reduce((s, c) => s + macrosComida(c.ingredientes).kcal, 0));
  console.log(d.fecha, d.viaje ? 'VIAJE' : '     ', ses.padEnd(14), String(kcal).padStart(4), 'kcal ·', d.comidas.map((c) => c.recetaId).join(', '));
}
const dViaje = e.plan.dias.filter((d) => d.viaje);
ok(dViaje.length >= 2, 'Los días de viaje están marcados');
ok(dViaje.every((d) => d.comidas.every((c) => recetaPorId[c.recetaId]?.fuera || recetaPorId[c.recetaId]?.viaje)), 'De viaje solo hay comidas fuera o sin cocina');
ok((plan.porFecha[carrera] || []).some((s) => s.tipo === 'popular'), 'La media está en el plan el domingo');
ok(plan.diasCarga.includes(sumarDias(carrera, -1)), 'Carga de hidratos el día antes');
ok([3, 4, 5].every((i) => (plan.porFecha[sumarDias(hoy, i)] || []).every((s) => s.tipo === 'caminar')), 'De jueves a sábado, caminar');
const l = listaCompra({ dias: dViaje });
const ids = new Set([...l.grupos.flatMap((g) => g.items), ...(l.despensa || [])].map((i) => i.id));
ok(ids.size === 0, 'Los días de viaje no van a la lista de la compra');
process.exitCode = fallos ? 1 : 0;
