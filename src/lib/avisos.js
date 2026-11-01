// Avisos y propuestas pendientes, para la campana de la cabecera (al estilo de Cal AI, Hoy queda limpio).
// Cada condición es la misma que usa su tarjeta para mostrarse; si cambias una, cambia la otra.
import { sumarDias } from './planificador.js';
import { estadoRevision } from './revision.js';
import { diaPreparar, planBatch } from './batch.js';
import { explicarPlan } from './coach.js';
import { calcularObjetivos } from './nutricion.js';

/** Lista de avisos que tocan hoy: [{ id, texto }] */
export function avisosPendientes(e, hoy, nubeActiva = false) {
  if (!e?.perfil) return [];
  const vistas = e.propuestasVistas || {};
  const agenda = e.agenda || { eventos: [], viajes: [] };
  const l = [];

  // Propuesta de la semana de la media (PropuestaSemana)
  const semanaMedia = agenda.eventos.some((x) => x.fecha === '2026-10-25') || agenda.viajes.some((v) => v.desde <= '2026-10-24' && v.hasta >= '2026-10-22');
  if (hoy <= '2026-10-25' && !semanaMedia && !vistas['media-2026-10-25']) l.push({ id: 'semana', texto: 'Ajustar la semana de la media' });

  // Plan HYROX tras la media (PropuestaHyrox)
  const jaen = agenda.viajes.some((v) => v.desde <= '2026-11-07' && v.hasta >= '2026-11-04');
  if (e.hyrox?.config && hoy < '2026-11-04' && !jaen && !vistas['hyrox-tras-media-2026']) l.push({ id: 'hyrox', texto: 'Plan HYROX tras la media' });

  // Suelo pélvico (PropuestaSuelo)
  if (!e.perfil.sueloPelvico && !vistas['suelo-pelvico']) l.push({ id: 'suelo', texto: 'Rutina de suelo pélvico' });

  // Copia de seguridad (AvisoCopia)
  const dias = e.ultimaCopia ? Math.round((new Date(`${hoy}T12:00`) - new Date(`${e.ultimaCopia}T12:00`)) / 86400000) : null;
  const conDatos = Object.values(e.registros || {}).reduce((s, x) => s + x.length, 0) >= 3;
  const pospuesto = e.copiaPospuesta && sumarDias(e.copiaPospuesta, 3) > hoy;
  if (!nubeActiva && conDatos && !pospuesto && (dias == null || dias >= 7)) l.push({ id: 'copia', texto: 'Guardar una copia' });

  // Revisión del mes (AvisoRevision)
  if (estadoRevision(e, hoy).aviso) l.push({ id: 'revision', texto: 'Revisión del mes' });

  // Preparar comida (TarjetaPreparar)
  const toca = diaPreparar(e.plan, hoy);
  const batch = toca ? planBatch(e.plan, toca.desde, toca.dias, e.perfil?.aparatos) : null;
  const guardado = e.preparar?.desde === hoy ? e.preparar : null;
  if (batch?.tareas.length && !guardado?.oculto) l.push({ id: 'preparar', texto: 'Hoy toca preparar' });

  // Tu semana, explicada (cuando hay una nueva)
  const coach = explicarPlan(e, calcularObjetivos(e.perfil), hoy);
  if (e.coachVisto !== coach.lunes) l.push({ id: 'semana-explicada', texto: coach.resumen });

  return l;
}
