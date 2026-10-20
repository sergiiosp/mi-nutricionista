// Prueba: la despensa se llena con la compra, se vacía al comer y el menú tira de ella
import { get } from 'svelte/store';
const { estado, actualizar } = await import('../src/stores/estado.js');
const { crearPlan, ajustarDespensa, marcarHecha } = await import('../src/lib/acciones.js');
const { hoyISO, alternativas, fijarDespensa } = await import('../src/lib/planificador.js');
const { calcularObjetivos } = await import('../src/lib/nutricion.js');

let fallos = 0;
const ok = (c, t) => { console.log(`${c ? '✓' : '✗'} ${t}`); if (!c) fallos++; };
const hoy = hoyISO();
const perfil = { sexo: 'h', edad: 30, altura: 178, peso: 80, trabajo: 'sentado', trabajoInicio: '09:00', trabajoFin: '18:00', despertar: '07:00', dormir: '23:30', pasos: 'normal', entrena: false, deportes: [], diasEntreno: [], objetivo: 'recomposicion', ritmo: 'moderado', comidas: 4, alergias: [], noMeGusta: [], dieta: 'omnivora', condiciones: [], leche: 'avena' };
actualizar((e) => { e.perfil = perfil; e.registros = {}; e.despensa = {}; });
crearPlan();
const comida = get(estado).plan.dias[0].comidas.find((c) => c.franja === 'comida');
const ing = comida.ingredientes.find((i) => i.g >= 50);
ajustarDespensa(ing.a, 1000);
ok(get(estado).despensa[ing.a]?.g === 1000, `Lo cogido entra en la despensa (${ing.a}: 1000 g)`);
marcarHecha(hoy, { ...comida });
const queda = get(estado).despensa[ing.a]?.g;
ok(queda < 1000 && queda > 0, `Al comer, sale lo que has usado (queda ${queda} g)`);
ajustarDespensa(ing.a, -2000);
ok(!get(estado).despensa[ing.a], 'Si se acaba, desaparece de la despensa');

fijarDespensa(['pechuga_pollo', 'arroz']);
const alts = alternativas(get(estado).plan, 1, 'comida', perfil, calcularObjetivos(perfil));
const conCasa = alts.filter((a) => a.enCasa.length);
ok(conCasa.length > 0 && conCasa.every((a) => a.enCasa.every((x) => ['pechuga_pollo', 'arroz'].includes(x))), `Las alternativas marcan lo que tienes en casa (${conCasa.length} recetas)`);
const pos = (l) => l.findIndex((a) => a.enCasa.length);
fijarDespensa([]);
const sin = alternativas(get(estado).plan, 1, 'comida', perfil, calcularObjetivos(perfil));
fijarDespensa(['pechuga_pollo', 'arroz']);
ok(pos(alts) <= Math.max(0, sin.findIndex((a) => a.comida.recetaId === alts[pos(alts)].comida.recetaId)), 'Y suben en la lista');
process.exitCode = fallos ? 1 : 0;
