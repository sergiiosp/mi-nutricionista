// Tu feedback: el repaso del domingo (báscula y cinco preguntas). Con él y la tendencia de tu peso, la app
// propone un ajuste para la semana siguiente (como mucho ±150 kcal, siempre en hidratos) y prepara un resumen
// para pedir cambios más grandes por el buzón.
import { anotarDiario } from '../stores/estado.js';
import { actualizar } from '../stores/estado.js';
import { sumarDias } from './planificador.js';
import { resumenSemanal } from './logros.js';
import { recomendacion } from './progreso.js';
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
  correr: { nombre: '¿Cómo te notas corriendo?', opciones: [['pesado', 'Pesado'], ['igual', 'Igual'], ['ligero', 'Más ligero']] },
  ropa: { nombre: '¿Cómo te queda la ropa de siempre?', opciones: [['justa', 'Más justa'], ['igual', 'Igual'], ['holgada', 'Más holgada']] },
};

/** La semana a la que pertenece el repaso: la que acaba el domingo (el lunes, aún se puede hacer el de ayer). */
export function claveRepaso(hoy) {
  const d = new Date(`${hoy}T12:00:00`).getDay();
  return lunesDe(d === 1 ? sumarDias(hoy, -1) : hoy);
}
/** ¿Toca el repaso? El domingo y, si se te pasó, el lunes; hecho = las cinco preguntas contestadas. */
export function tocaRepaso(e, hoy) {
  if (!e?.perfil) return false;
  const d = new Date(`${hoy}T12:00:00`).getDay();
  if (d !== 0 && d !== 1) return false;
  return !repasoHecho(e.feedback?.semanas?.[claveRepaso(hoy)]);
}
export const repasoHecho = (r) => !!r && Object.keys(PREGUNTAS_SEMANA).every((k) => r[k]);

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
 * Ajustes que propongo con lo que me cuentas y la tendencia de tu peso. Como mucho un cambio de kcal por semana
 * (±150, siempre en hidratos: la proteína y la grasa no se tocan) y lo que pidas del menú.
 * Cada uno: { id, texto, porque, aplicar: { ajusteKcal? , recetasNo?, nuevoMenu?, condicion? } }
 */
export function propuestas(e, objetivos, hoy, repaso = {}) {
  const notas = notasSemana(e, hoy);
  const cuenta = (k, v) => notas.filter((n) => n[k] === v).length;
  const lista = [];
  const hambre = repaso.hambre === 'mucha' || cuenta('hambre', 'mucha') >= 3;
  const sobra = repaso.hambre === 'poca' || cuenta('hambre', 'poca') >= 3;
  const sinEnergia = repaso.entrenos === 'flojos' || cuenta('energia', 'baja') >= 3;
  const malDormido = repaso.sueno === 'mal';
  const objetivo = e.perfil?.objetivo;
  // Lo que dice tu peso (media de las últimas semanas; con menos de 2 semanas de pesajes, nada)
  const rec = recomendacion(e.pesos || [], e.perfil || {}, objetivos);
  const kcal = (n, porque) => lista.push({ id: 'kcal', texto: `${n > 0 ? 'Subo' : 'Bajo'} ${Math.abs(n)} kcal al día, en hidratos`, porque, aplicar: { ajusteKcal: n } });

  // Primero, cómo te encuentras: con hambre o sin fuerzas, bajar más no se sostiene
  if (hambre && (sinEnergia || malDormido)) kcal(150, 'Pasas hambre y te cuesta rendir: con tanto entreno necesitas algo más de comida, sobre todo hidratos alrededor de las sesiones.');
  else if (hambre) kcal(100, 'Pasar hambre muchos días no se sostiene. Con 100 kcal más (y la verdura que quieras) se lleva mejor.');
  else if (sinEnergia) kcal(100, 'Te notas sin energía al entrenar: más hidratos alrededor del entreno suelen arreglarlo.');
  else if (rec.tipo === 'ajuste' && rec.ajuste < 0 && repaso.ropa === 'holgada') {
    // La báscula se para, pero la ropa dice que bajas grasa: no se toca
  } else if (rec.tipo === 'ajuste') kcal(Math.max(-150, Math.min(150, rec.ajuste)), rec.texto.replace(/ Te propongo[^.]*\./, '').trim() + (rec.ajuste < 0 ? ' Bajo un poco los hidratos.' : ' Así proteges el músculo.'));
  else if (sobra && objetivo === 'perder') kcal(-100, 'Te sobra comida: puedes bajar un poco sin pasar hambre.');
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
  for (const p of elegidas) anotarDiario(`repaso-${p.id}`, p.texto, p.porque || 'De tu repaso semanal.');
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
    if (r.aplicadas?.length) l.push(`- Aplicado: ${r.aplicadas.join('; ')}`);
    if (r.recetasNo?.length) l.push(`- No repetiría: ${r.recetasNo.map((id) => recetaPorId[id]?.nombre || id).join(', ')}`);
    if (r.entreno) l.push(`- Sobre el entreno: ${r.entreno}`);
    if (r.app) l.push(`- Sobre la app: ${r.app}`);
  }
  return l.join('\n');
}
