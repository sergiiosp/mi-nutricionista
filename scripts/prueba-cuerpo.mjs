// Prueba: báscula con grasa, músculo y agua → calorías con masa magra, media de grasa y «desde mañana»
import { get } from 'svelte/store';
const { estado, actualizar } = await import('../src/stores/estado.js');
const { crearPlan, reajustarPlan } = await import('../src/lib/acciones.js');
const { calcularObjetivos, macrosComida } = await import('../src/lib/nutricion.js');
const { hoyISO, sumarDias } = await import('../src/lib/planificador.js');
const { grasaReferencia, cambioCuerpo, veredicto, avisoAgua } = await import('../src/lib/cuerpo.js');

let fallos = 0;
const ok = (c, t) => { console.log(`${c ? '✓' : '✗'} ${t}`); if (!c) fallos++; };
const hoy = hoyISO();
const perfil = { sexo: 'h', edad: 30, altura: 178, peso: 80, trabajo: 'sentado', trabajoInicio: '09:00', trabajoFin: '18:00', despertar: '07:00', dormir: '23:30', pasos: 'normal', entrena: true, deportes: ['fuerza', 'carrera'], diasEntreno: [1, 2, 4, 5], horaEntreno: '18:30', duracionEntreno: 60, intensidad: 'moderada', objetivo: 'recomposicion', ritmo: 'moderado', comidas: 4, alergias: [], noMeGusta: [], dieta: 'omnivora', condiciones: [], leche: 'avena', whey: true };

const sin = calcularObjetivos(perfil);
const con = calcularObjetivos({ ...perfil, grasa: 15 });
ok(sin.metodoTmb === 'peso' && con.metodoTmb === 'magra', 'Con % de grasa el metabolismo sale de la masa magra');
ok(Math.abs(con.tmb - Math.round(370 + 21.6 * 68)) <= 1, `Katch-McArdle: 68 kg magros → ${con.tmb} kcal de basal`);
ok(con.proteina === Math.round(Math.min(68 * 2.0 * 1.2, (con.kcal * 0.35) / 4)), `Proteína sobre la masa magra: ${con.proteina} g`);
const graso = calcularObjetivos({ ...perfil, grasa: 30 });
ok(graso.tmb < con.tmb && graso.proteina < con.proteina, 'Con más grasa (mismo peso), menos basal y menos proteína');

const pesos = [
  { fecha: sumarDias(hoy, -20), peso: 80, grasa: 18, musculo: 62, agua: 56 },
  { fecha: sumarDias(hoy, -18), peso: 80.2, grasa: 17.8, musculo: 62.1, agua: 56.2 },
  { fecha: sumarDias(hoy, -4), peso: 79.8, grasa: 16.9, musculo: 62.4, agua: 56.1 },
  { fecha: sumarDias(hoy, -2), peso: 79.9, grasa: 16.7, musculo: 62.5, agua: 56 },
  { fecha: hoy, peso: 79.5, grasa: 17.6, musculo: 62.3, agua: 54 },
];
ok(grasaReferencia(pesos, hoy) === 17.1, `Grasa de referencia = media de las 3 últimas (${grasaReferencia(pesos, hoy)} %)`);
const c = cambioCuerpo(pesos);
ok(c && c.grasaKg < 0 && c.musculo > 0, `Cambio: grasa ${c?.grasaKg} kg, músculo +${c?.musculo} kg`);
ok(veredicto(c, 'recomposicion')?.bien, `Veredicto: ${veredicto(c, 'recomposicion')?.texto}`);
ok(!!avisoAgua(pesos), 'Avisa si hoy hay menos agua de lo normal');

// Peso real distinto al declarado: hoy no cambia, mañana sí
actualizar((e) => { e.perfil = perfil; e.pesos = []; });
crearPlan();
const kcalDia = (f) => Math.round(get(estado).plan.dias.find((d) => d.fecha === f).comidas.reduce((s, x) => s + macrosComida(x.ingredientes).kcal, 0));
const hoyAntes = kcalDia(hoy), mananaAntes = kcalDia(sumarDias(hoy, 1));
actualizar((e) => {
  const d = e.plan.dias.find((x) => x.fecha === hoy);
  d.perfilFijo = { peso: e.perfil.peso, grasa: null };
  e.pesos = [{ fecha: hoy, peso: 86, grasa: 22 }];
  e.perfil.peso = 86;
  e.perfil.grasa = 22;
});
reajustarPlan();
ok(Math.abs(kcalDia(hoy) - hoyAntes) < 15, `Hoy se queda igual (${hoyAntes} → ${kcalDia(hoy)} kcal)`);
ok(Math.abs(kcalDia(sumarDias(hoy, 1)) - mananaAntes) >= 30, `Mañana cambia (${mananaAntes} → ${kcalDia(sumarDias(hoy, 1))} kcal)`);
process.exitCode = fallos ? 1 : 0;
