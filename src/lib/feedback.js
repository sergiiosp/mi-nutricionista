// Tu feedback: una nota rápida al cerrar el día y un repaso al final de la semana. Con ellos la app
// propone ajustes (kcal, menú, platos) y prepara un resumen para pedir cambios más grandes.
import { actualizar } from '../stores/estado.js';
import { sumarDias } from './planificador.js';
import { resumenSemanal } from './logros.js';
import { tendencia } from './progreso.js';
import { recetaPorId } from './planificador.js';
import { planDe } from './hyrox/index.js';
import { estadisticas } from './hyrox/stats.js';
import { TIPOS } from './hyrox/sesiones.js';

export const PREGUNTAS_DIA = {
  hambre: { nombre: 'Hambre', opciones: [['poca', 'Poca'], ['normal', 'Normal'], ['mucha', 'Mucha']] },
  energia: { nombre: 'Energía', opciones: [['baja', 'Baja'], ['normal', 'Normal'], ['alta', 'Alta']] },
  digestion: { nombre: 'Digestión', opciones: [['bien', 'Bien'], ['regular', 'Regular'], ['mal', 'Pesada']] },
};
export const PREGUNTAS_SEMANA = {
  hambre: { nombre: '¿Qué tal de hambre esta semana?', opciones: [['poca', 'Me sobraba comida'], ['normal', 'Bien'], ['mucha', 'Pasaba hambre']] },
  entrenos: { nombre: '¿Cómo te han ido los entrenos?', opciones: [['flojos', 'Sin fuerza'], ['normales', 'Normales'], ['bien', 'Muy bien']] },
  sueno: { nombre: '¿Cómo has dormido?', opciones: [['mal', 'Mal'], ['normal', 'Normal'], ['bien', 'Bien']] },
  menu: { nombre: '¿Y el menú?', opciones: [['aburre', 'Me aburre'], ['regular', 'Regular'], ['gusta', 'Me gusta']] },
};

/** Lunes de la semana de una fecha (clave del repaso semanal). */
export function lunesDe(fecha) {
  const d = new Date(`${fecha}T12:00:00`).getDay();
  return sumarDias(fecha, -((d + 6) % 7));
}

export function guardarNotaDia(fecha, datos) {
  actualizar((e) => {
    e.feedback ||= { dias: {}, semanas: {} };
    e.feedback.dias[fecha] = { ...(e.feedback.dias[fecha] || {}), ...datos };
  });
}

export function guardarRepaso(lunes, datos) {
  actualizar((e) => {
    e.feedback ||= { dias: {}, semanas: {} };
    e.feedback.semanas[lunes] = { ...(e.feedback.semanas[lunes] || {}), ...datos, fecha: new Date().toISOString().slice(0, 10) };
  });
}

/** Notas de los 7 días que acaban en `hoy`. */
function notasSemana(e, hoy) {
  const dias = e.feedback?.dias || {};
  return Array.from({ length: 7 }, (_, i) => sumarDias(hoy, -6 + i)).map((f) => ({ fecha: f, ...(dias[f] || {}) })).filter((x) => Object.keys(x).length > 1);
}

/**
 * Ajustes que propongo con lo que me cuentas y tus datos de la semana.
 * Cada uno: { id, texto, porque, aplicar: { ajusteKcal? , recetasNo?, nuevoMenu?, condicion? } }
 */
export function propuestas(e, objetivos, hoy, repaso = {}) {
  const notas = notasSemana(e, hoy);
  const cuenta = (k, v) => notas.filter((n) => n[k] === v).length;
  const lista = [];
  const hambre = repaso.hambre === 'mucha' || cuenta('hambre', 'mucha') >= 3;
  const sobra = repaso.hambre === 'poca' || cuenta('hambre', 'poca') >= 3;
  const sinEnergia = repaso.entrenos === 'flojos' || cuenta('energia', 'baja') >= 3;
  const t = tendencia(e.pesos || []);
  const objetivo = e.perfil?.objetivo;

  if (hambre && sinEnergia) {
    lista.push({ id: 'kcal', texto: 'Subo 150 kcal al día', porque: 'Pasas hambre y los entrenos te cuestan: con tanto volumen necesitas algo más de comida, sobre todo hidratos.', aplicar: { ajusteKcal: 150 } });
  } else if (hambre) {
    lista.push({ id: 'kcal', texto: 'Subo 100 kcal al día', porque: 'Pasar hambre muchos días no se sostiene. Con 100 kcal más (y la verdura que quieras) se lleva mejor.', aplicar: { ajusteKcal: 100 } });
  } else if (sinEnergia) {
    lista.push({ id: 'kcal', texto: 'Subo 100 kcal al día', porque: 'Te notas sin energía al entrenar: más hidratos alrededor del entreno suelen arreglarlo.', aplicar: { ajusteKcal: 100 } });
  } else if (sobra && objetivo !== 'ganar') {
    lista.push({ id: 'kcal', texto: 'Bajo 100 kcal al día', porque: 'Te sobra comida: puedes ajustar un poco sin pasar hambre.', aplicar: { ajusteKcal: -100 } });
  }
  if (t && !lista.some((x) => x.id === 'kcal')) {
    if (objetivo === 'recomposicion' && t.kgSemana < -0.4) lista.push({ id: 'kcal', texto: 'Subo 100 kcal al día', porque: `Bajas ${String(Math.abs(t.kgSemana).toFixed(2)).replace('.', ',')} kg/semana: en recomposición es demasiado rápido y cuesta ganar músculo.`, aplicar: { ajusteKcal: 100 } });
    if (objetivo === 'recomposicion' && t.kgSemana > 0.3) lista.push({ id: 'kcal', texto: 'Bajo 100 kcal al día', porque: 'Tu peso sube más de lo que interesa en recomposición. Mira también la cintura: si baja, no pasa nada.', aplicar: { ajusteKcal: -100 } });
  }
  if (repaso.recetasNo?.length) {
    const nombres = repaso.recetasNo.map((id) => recetaPorId[id]?.nombre).filter(Boolean);
    lista.push({ id: 'recetas', texto: `Quito del menú: ${nombres.join(', ')}`, porque: 'Me dijiste que no las repetirías.', aplicar: { recetasNo: repaso.recetasNo } });
  }
  if (repaso.menu === 'aburre') lista.push({ id: 'menu', texto: 'Te hago un menú nuevo con otros platos', porque: 'Si el menú aburre, se deja. Puedes marcar tus favoritas para que salgan más.', aplicar: { nuevoMenu: true } });
  if (cuenta('digestion', 'mal') >= 2 && !(e.perfil?.condiciones || []).includes('digestivo')) {
    lista.push({ id: 'digestion', texto: 'Menos legumbre, cebolla y ajo en el menú', porque: 'Varias digestiones pesadas esta semana.', aplicar: { condicion: 'digestivo' } });
  }
  return lista;
}

/** Aplica los ajustes elegidos al perfil (el menú se reajusta fuera). */
export function aplicarPropuestas(elegidas) {
  actualizar((e) => {
    for (const p of elegidas) {
      const a = p.aplicar;
      if (a.ajusteKcal) e.perfil.ajusteKcal = (e.perfil.ajusteKcal || 0) + a.ajusteKcal;
      if (a.recetasNo) e.perfil.recetasNo = [...new Set([...(e.perfil.recetasNo || []), ...a.recetasNo])];
      if (a.condicion) e.perfil.condiciones = [...new Set([...(e.perfil.condiciones || []), a.condicion])];
    }
  });
  return { nuevoMenu: elegidas.some((p) => p.aplicar.nuevoMenu || p.aplicar.recetasNo || p.aplicar.condicion) };
}

/** Resumen de la semana en texto, para pegarlo en una conversación y pedir cambios más grandes. */
export function textoResumen(e, objetivos, hoy, repaso = {}) {
  const s = resumenSemanal(e, objetivos, hoy);
  const l = [`Repaso semanal de Pulso (${s.fechas[0]} a ${hoy})`, ''];
  l.push(`Objetivo: ${e.perfil?.objetivo || '—'} · ${e.perfil?.peso || '—'} kg · ajuste manual ${e.perfil?.ajusteKcal || 0} kcal`);
  if (!s.diasRegistrados) l.push('Comida: sin días registrados esta semana');
  else l.push(`Comida: ${s.diasRegistrados} días registrados · media ${Math.round(s.kcal)} kcal (objetivo ${Math.round(s.objetivoKcal)}) · proteína ${Math.round(s.p)} g (objetivo ${Math.round(s.objetivoP)} g)`);
  if (s.tendencia) l.push(`Peso: ${s.tendencia.kgSemana > 0 ? '+' : ''}${s.tendencia.kgSemana.toFixed(2)} kg/semana`);
  const med = [...(e.medidas || [])].sort((a, b) => a.fecha.localeCompare(b.fecha));
  if (med.length > 1) l.push(`Cintura: ${med[0].cintura ?? '—'} → ${med.at(-1).cintura ?? '—'} cm · brazo: ${med[0].brazo ?? '—'} → ${med.at(-1).brazo ?? '—'} cm`);
  const plan = planDe(e);
  if (plan) {
    const regs = e.hyrox?.registros || {};
    const semana = plan.sesiones.filter((x) => x.fecha >= s.fechas[0] && x.fecha <= hoy);
    const hechas = semana.filter((x) => ['completa', 'parcial'].includes(regs[x.id]?.estado));
    l.push(`Entreno: ${hechas.length}/${semana.length} sesiones · ${hechas.map((x) => `${TIPOS[x.tipo]?.nombre || x.tipo} RPE ${regs[x.id].rpe ?? '—'}${regs[x.id].notas ? ` («${regs[x.id].notas}»)` : ''}`).join('; ') || 'ninguna'}`);
    const f = estadisticas(plan, regs, hoy).fuerza;
    if (f.grupos.length) l.push(`Fuerza (8 sem.): ${f.grupos.map((g) => `${g.nombre} ${g.cambio === null ? '—' : `${g.cambio > 0 ? '+' : ''}${g.cambio.toFixed(1)} %`}`).join(', ')}`);
  }
  const notas = notasSemana(e, hoy);
  if (notas.length) {
    l.push('', 'Notas de cada día:');
    for (const n of notas) l.push(`- ${n.fecha}: hambre ${n.hambre || '—'}, energía ${n.energia || '—'}, digestión ${n.digestion || '—'}${n.nota ? ` · «${n.nota}»` : ''}`);
  }
  const r = repaso;
  if (Object.keys(r).length) {
    l.push('', 'Repaso:');
    for (const [k, p] of Object.entries(PREGUNTAS_SEMANA)) if (r[k]) l.push(`- ${p.nombre} ${p.opciones.find(([v]) => v === r[k])?.[1]}`);
    if (r.recetasNo?.length) l.push(`- No repetiría: ${r.recetasNo.map((id) => recetaPorId[id]?.nombre || id).join(', ')}`);
    if (r.entreno) l.push(`- Sobre el entreno: ${r.entreno}`);
    if (r.app) l.push(`- Sobre la app: ${r.app}`);
  }
  return l.join('\n');
}
