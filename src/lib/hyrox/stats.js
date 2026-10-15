// Estadísticas de entreno a partir del plan HYROX y tus registros.
import { mejoresEstaciones } from './carrera.js';

export function estadisticas(plan, registros = {}, hoy) {
  const semanas = plan.semanas
    .filter((s) => s.lunes <= hoy)
    .map((s) => {
      let hechas = 0; let minutos = 0; let km = 0; let carga = 0;
      const previstas = s.sesiones.filter((x) => x.tipo !== 'carrera').length;
      for (const x of s.sesiones) {
        const r = registros[x.id];
        if (!r || r.estado === 'no') continue;
        const k = r.estado === 'parcial' ? 0.5 : 1;
        hechas += k;
        const min = r.duracion || x.duracion * k;
        minutos += min;
        km += r.distancia || (x.distancia || 0) * k;
        carga += (r.rpe || x.rpe) * min; // carga interna (sRPE)
      }
      return { w: s.w, lunes: s.lunes, fase: s.fase, previstas, hechas, minutos, km: Math.round(km * 10) / 10, carga: Math.round(carga) };
    });

  const conRegistro = plan.sesiones.filter((s) => registros[s.id]);
  const simulacros = conRegistro
    .filter((s) => ['simulacro', 'carrera'].includes(s.tipo) && registros[s.id].tiempo)
    .map((s) => ({ fecha: s.fecha, titulo: s.titulo, tiempo: registros[s.id].tiempo, completo: s.tipo === 'carrera' || /completo/i.test(s.titulo) }));
  const series = conRegistro.filter((s) => registros[s.id].ritmo).map((s) => ({ fecha: s.fecha, ritmo: registros[s.id].ritmo }));
  const fuerza = conRegistro.filter((s) => registros[s.id].peso).map((s) => ({ fecha: s.fecha, peso: registros[s.id].peso }));
  const pasadas = plan.sesiones.filter((s) => s.fecha < hoy && s.tipo !== 'carrera');
  const cumplidas = pasadas.filter((s) => ['completa', 'parcial'].includes(registros[s.id]?.estado)).length;

  return {
    semanas,
    totalSesiones: conRegistro.filter((s) => registros[s.id].estado !== 'no').length,
    totalKm: Math.round(semanas.reduce((a, s) => a + s.km, 0)),
    totalHoras: Math.round(semanas.reduce((a, s) => a + s.minutos, 0) / 6) / 10,
    cumplimiento: pasadas.length ? Math.round((cumplidas / pasadas.length) * 100) : null,
    records: {
      estaciones: mejoresEstaciones(registros),
      mejorSerie: series.length ? Math.min(...series.map((x) => x.ritmo)) : null,
      maxSentadilla: fuerza.length ? Math.max(...fuerza.map((x) => x.peso)) : null,
      mejorSimulacro: simulacros.filter((x) => x.completo).sort((a, b) => a.tiempo - b.tiempo)[0] || null,
    },
    simulacros,
    series,
  };
}
