// Prueba: los descubrimientos salen solo con datos suficientes y una diferencia clara
const { descubrimientos } = await import('../src/lib/descubrimientos.js');
const { sumarDias } = await import('../src/lib/planificador.js');

let fallos = 0;
const ok = (c, t) => { console.log(`${c ? '✓' : '✗'} ${t}`); if (!c) fallos++; };
const hoy = '2026-10-20';
const comida = (p, c, kcal, hora = '14:00', ref = null) => ({ tipo: ref ? 'plan' : 'libre', ref, hora, macros: { kcal, p, c, g: 60 } });

// Sin datos: nada que descubrir, todo «aprendiendo»
const vacio = descubrimientos({ registros: {}, hyrox: null, feedback: { dias: {} } }, hoy);
ok(!vacio.hallazgos.length && vacio.aprendiendo.length >= 5, 'Sin datos no se inventa nada: todo está «aprendiendo»');

// 40 días: duerme bien en días pares (sesión bien) y mal en impares (sesión mal); más proteína → menos hambre;
// fines de semana con 500 kcal más; cenas tardías → mal sueño; las lentejas sientan mal.
const e = { registros: {}, hyrox: { registros: {}, forma: {} }, feedback: { dias: {} } };
for (let i = 1; i <= 40; i++) {
  const f = sumarDias(hoy, -i);
  const dia = new Date(`${f}T12:00:00`).getDay();
  const finde = dia === 0 || dia === 6;
  const muchaP = i % 3 !== 0;
  const tarde = i % 2 === 1;
  const lentejas = i % 5 === 0;
  e.registros[f] = [comida(muchaP ? 90 : 40, 120, 900, '09:00', lentejas ? 'lentejas-verduras' : null), comida(muchaP ? 90 : 40, 120, finde ? 1600 : 1100, tarde ? '22:45' : '20:30')];
  e.feedback.dias[f] = { hambre: muchaP ? 'normal' : 'mucha', energia: 'normal', digestion: lentejas ? 'mal' : 'bien' };
  // El sueño de la noche f depende de la cena de la víspera (f-1)
  const cenaVispera = (i + 1) % 2 === 1;
  const sueno = cenaVispera ? 0 : 2;
  e.hyrox.forma[f] = { sueno, agujetas: 1, energia: 1 };
  e.hyrox.registros[`s${i}`] = { fecha: f, estado: 'completa', rpe: sueno === 2 ? 6 : 8, sensacion: sueno === 2 ? 'bien' : 'mal', sesion: { rpe: 6 } };
}
const d = descubrimientos(e, hoy);
const id = (x) => d.hallazgos.find((h) => h.id === x);
ok(id('sueno-sesion')?.destaca === 0 && id('sueno-sesion').grupos[0].valor === 100, `Sueño → sesiones: «${id('sueno-sesion')?.titulo}»`);
ok(id('proteina-hambre')?.destaca === 0, `Proteína → hambre: «${id('proteina-hambre')?.titulo}»`);
ok(id('cena-sueno')?.destaca === 0, `Cena → sueño: «${id('cena-sueno')?.titulo}»`);
ok(id('finde-kcal')?.titulo.includes('500 kcal más'), `Fin de semana: «${id('finde-kcal')?.titulo}»`);
ok(id('digestion-plato')?.receta === 'lentejas-verduras', `Digestión: «${id('digestion-plato')?.titulo}»`);
ok(d.sinEfecto.some((s) => s.id === 'kcal-energia'), 'Energía siempre normal: «sin diferencia», no un falso descubrimiento');
ok(d.hallazgos.every((h, i, l) => !i || l[i - 1].fuerza >= h.fuerza), 'Ordenados del más claro al menos');
process.exitCode = fallos ? 1 : 0;
