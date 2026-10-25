// Prueba: tras una media maratón, semana de vuelta suave; de viaje, entrenos sin máquinas y caminar
const { generarPlanHyrox } = await import('../src/lib/hyrox/plan.js');
const { hoyISO, sumarDias } = await import('../src/lib/planificador.js');

const hoy = hoyISO();
const perfil = { sexo: 'h', edad: 30, altura: 178, peso: 80 };
const config = { inicio: sumarDias(hoy, -28), fechaCarrera: sumarDias(hoy, 120), categoria: 'open', nivel: 'intermedio', dias: [1, 2, 3, 4, 5, 6], hora: '18:30', material: {}, lesiones: [], marcas: { t5k: 1440 }, enfoque: 'equilibrado', exigencia: 'muy' };
const media = { id: 'm', fecha: hoy, hora: '09:00', km: 21.1, nombre: 'Media maratón' };
const viaje = { id: 'v', nombre: 'Jaén', desde: sumarDias(hoy, 10), hasta: sumarDias(hoy, 13), comida: ['fuera', 'super'], entreno: 'sinGym' };
const plan = (agenda, extra = {}) => generarPlanHyrox({ config, registros: {}, movidas: {}, ...extra }, perfil, hoy, agenda);

let fallos = 0;
const ok = (c, t) => { console.log(`${c ? '✓' : '✗'} ${t}`); if (!c) fallos++; };
const de = (p, d) => p.porFecha[sumarDias(hoy, d)] || [];

// ── Vuelta tras la media ──
const p = plan({ eventos: [media], viajes: [] });
for (let d = 0; d <= 7; d++) console.log(sumarDias(hoy, d), de(p, d).map((s) => s.titulo).join(' + ') || '—');
ok(de(p, 1).length === 1 && de(p, 1)[0].tipo === 'recuperacion', 'Al día siguiente, solo recuperación');
const vuelta = [2, 3, 4].flatMap((d) => de(p, d));
ok(vuelta.every((s) => !['series', 'umbral', 'compromised', 'simulacro', 'estaciones', 'largo'].includes(s.tipo)), 'Del día +2 al +4, nada de series, estaciones ni tirada larga');
ok(vuelta.filter((s) => s.tipo === 'fuerza').every((s) => s.titulo.includes('ligera') && !s.ejercicios.some((x) => ['cajon', 'zancada_salto', 'sprint_cuesta'].includes(x.id))), 'La pierna de esos días va ligera y sin saltos');
ok(vuelta.filter((s) => s.tipo === 'torso').every((s) => !s.titulo.includes('ligera')), 'El torso de esos días, normal');
ok(vuelta.some((s) => s.tipo === 'rodaje' && s.duracion <= 35), 'Rodajes suaves y cortos para volver');
ok([5, 6, 7, 8, 9].flatMap((d) => de(p, d)).some((s) => ['series', 'umbral', 'compromised', 'estaciones', 'largo', 'simulacro'].includes(s.tipo)), 'Desde el día +5 vuelve el entreno de calidad');

// ── Viaje sin máquinas ──
const pv = plan({ eventos: [], viajes: [viaje] });
const dias = [10, 11, 12, 13];
for (const d of dias) console.log(sumarDias(hoy, d), de(pv, d).map((s) => `${s.titulo}${s.sinGym && s.tipo !== 'caminar' ? ' [sin gym]' : ''}`).join(' + ') || '—');
ok(dias.every((d) => de(pv, d).some((s) => s.tipo === 'caminar')), 'Cada día de viaje suma caminar');
const sesiones = dias.flatMap((d) => de(pv, d)).filter((s) => s.tipo !== 'caminar');
ok(sesiones.length >= 3, 'Los entrenos siguen en el viaje (no solo caminar)');
const conGym = ['press_banca', 'press_inclinado', 'cruces_polea', 'jalon', 'face_pull', 'extension_triceps', 'curl_barra', 'sentadilla', 'pmr', 'remo_barra', 'dominadas', 'remo_mancuerna'];
ok(sesiones.filter((s) => s.ejercicios?.length).every((s) => s.sinGym && s.ejercicios.every((x) => !conGym.includes(x.id))), 'Fuerza y torso sin máquinas');
ok(sesiones.filter((s) => ['estaciones', 'compromised', 'simulacro'].includes(s.tipo)).every((s) => s.sinGym), 'Estaciones sin máquinas');
const torsoViaje = sesiones.find((s) => s.tipo === 'torso');
if (torsoViaje) {
  const pc = plan({ eventos: [], viajes: [viaje] }, { sinGym: { [torsoViaje.id]: false } });
  ok(!pc.sesiones.find((s) => s.id === torsoViaje.id).sinGym, 'Si ese día sí hay gimnasio, lo marcas en la sesión y vuelve la de gimnasio');
}
const pg = plan({ eventos: [], viajes: [{ ...viaje, entreno: 'gym' }] });
ok(dias.every((d) => !de(pg, d).some((s) => s.tipo === 'caminar' || s.sinGym)), 'Con gimnasio en el viaje, el plan de siempre');
const pc = plan({ eventos: [], viajes: [{ ...viaje, entreno: undefined }] });
ok(dias.every((d) => de(pc, d).every((s) => s.tipo === 'caminar')), 'Los viajes de antes (sin modo), solo caminar');

process.exitCode = fallos ? 1 : 0;
