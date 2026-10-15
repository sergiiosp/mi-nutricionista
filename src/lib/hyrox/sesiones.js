// Contenido de cada tipo de sesión: calentamiento, bloques con ritmos y pesos, y vuelta a la calma.
import { ESTACIONES, estacionPorId, pesoEstacion, ejercicio } from '../../data/hyrox.js';
import { mmss } from './ritmos.js';

export const TIPOS = {
  rodaje: { nombre: 'Rodaje suave', emoji: '🏃', color: 'azul', rpe: 4, met: 8, carbos: 0, clase: 'carrera' },
  largo: { nombre: 'Rodaje largo', emoji: '🛣️', color: 'azul', rpe: 5, met: 8.5, carbos: 5, clase: 'carrera' },
  series: { nombre: 'Series', emoji: '⚡', color: 'coral', rpe: 8, met: 10.5, carbos: 4.5, clase: 'carrera' },
  umbral: { nombre: 'Umbral', emoji: '🔥', color: 'coral', rpe: 7, met: 10, carbos: 4.5, clase: 'carrera' },
  fuerza: { nombre: 'Fuerza', emoji: '🏋️', color: 'lila', rpe: 7, met: 5, carbos: 3.5, clase: 'fuerza' },
  estaciones: { nombre: 'Estaciones', emoji: '🛷', color: 'amarillo', rpe: 7, met: 8, carbos: 4, clase: 'hyrox' },
  compromised: { nombre: 'Compromised running', emoji: '🔁', color: 'amarillo', rpe: 8, met: 9.5, carbos: 5, clase: 'hyrox' },
  simulacro: { nombre: 'Simulacro', emoji: '🏁', color: 'primario', rpe: 9, met: 9.5, carbos: 6, clase: 'hyrox' },
  recuperacion: { nombre: 'Recuperación activa', emoji: '🧘', color: 'gris', rpe: 2, met: 2.5, carbos: 0, clase: 'suave' },
  activacion: { nombre: 'Activación pre-carrera', emoji: '🔋', color: 'primario', rpe: 4, met: 6, carbos: 7, clase: 'hyrox' },
  carrera: { nombre: 'HYROX', emoji: '🏆', color: 'primario', rpe: 10, met: 10, carbos: 6, clase: 'hyrox' },
};

const MATERIAL_DE = { ski: 'ski', push: 'sled', pull: 'sled', row: 'row', wallballs: 'wallball', farmers: 'kettlebell', lunges: 'sandbag' };
const SUSTITUTO_CORTO = {
  ski: 'remo o assault bike', push: 'prensa de piernas pesada o sprints en cuesta', pull: 'remo en polea pesado',
  row: 'bici o SkiErg', wallballs: 'thrusters con mancuernas', farmers: 'mancuernas o garrafas', lunges: 'zancadas con mancuernas',
};
const MEDIA = { ski: '500 m', push: '25 m', pull: '25 m', bbj: '40 m', row: '500 m', farmers: '100 m', lunges: '50 m', wallballs: '50 reps' };
const COMPLETA = { ski: '1.000 m', push: '50 m', pull: '50 m', bbj: '80 m', row: '1.000 m', farmers: '200 m', lunges: '100 m', wallballs: '100 reps' };

const CALENTAMIENTO = {
  carrera: ['10 min de trote muy suave', 'Movilidad dinámica: balanceos de pierna, skipping, talones al glúteo (5 min)', '3-4 progresiones de 80 m acelerando poco a poco'],
  fuerza: ['5 min de remo o bici suave', 'Movilidad de cadera, tobillos y hombros (5 min)', '2 series de aproximación ligeras del primer ejercicio'],
  hyrox: ['10 min de trote suave + 5 min de remo o SkiErg suave', 'Movilidad dinámica de cuerpo entero (5 min)', 'Una ronda corta de las estaciones del día al 50 %'],
  suave: [],
};
const VUELTA_CALMA = {
  carrera: ['5-10 min caminando o trotando muy suave', 'Estiramientos suaves de gemelos, cuádriceps, isquios y cadera'],
  fuerza: ['5 min de estiramientos de las zonas trabajadas'],
  hyrox: ['10 min caminando o en bici suave hasta recuperar el pulso', 'Estiramientos suaves de cuerpo entero', 'Come algo con hidratos y proteína en la hora siguiente'],
  suave: [],
};

/**
 * @param ctx { tipo, fase, p (0-1 progreso en la fase), factor (volumen), semana, config, perfil, rit, mitad ('1-4'|'5-8'), completo }
 */
export function construirSesion(ctx) {
  const { tipo, fase, p = 0, factor = 1, semana = 0, config, perfil, rit } = ctx;
  const T = TIPOS[tipo];
  const material = config.material || {};
  const lesiones = config.lesiones || [];
  const vol = (a, b) => Math.max(1, Math.round((a + (b - a) * p) * factor));
  const nombreEst = (id) => {
    const e = estacionPorId[id];
    const falta = MATERIAL_DE[id] && material[MATERIAL_DE[id]] === false;
    return falta ? `${e.nombre} → ${SUSTITUTO_CORTO[id]}` : e.nombre;
  };
  const peso = (id) => {
    if (MATERIAL_DE[id] && material[MATERIAL_DE[id]] === false && id !== 'lunges' && id !== 'farmers') return ''; // el sustituto no usa ese peso
    const pe = pesoEstacion(estacionPorId[id], config.categoria, perfil?.sexo);
    return pe ? ` · ${pe}` : '';
  };
  const km = (s) => `${mmss(s)}/km`;
  const principiante = config.nivel === 'principiante';
  let titulo = T.nombre;
  let duracion = 45;
  let distancia = 0;
  const bloques = [];
  const notas = [];

  switch (tipo) {
    case 'rodaje': {
      duracion = vol(30, 45);
      distancia = (duracion * 60) / rit.z2;
      bloques.push({ titulo: `${duracion} min en zona 2`, lineas: [`Ritmo ${km(rit.z2)} o más lento`, 'Debes poder hablar en frases completas'] });
      break;
    }
    case 'largo': {
      const [a, b] = fase === 'base' ? [40, 60] : fase === 'construccion' ? [50, 70] : [60, 80];
      duracion = Math.max(30, vol(a, b) - (principiante ? 10 : 0));
      distancia = (duracion * 60) / rit.z2;
      bloques.push({ titulo: `${duracion} min continuos`, lineas: [`Ritmo cómodo: ${km(rit.z2)}`, fase === 'especifico' ? 'Los últimos 10 min a ritmo HYROX' : 'Sin mirar el reloj: pulso bajo y constante'] });
      if (duracion >= 70) notas.push('Lleva agua y, si pasas de 75 min, algo de hidratos (plátano, gel o bebida isotónica).');
      break;
    }
    case 'series': {
      if (fase === 'base') {
        const n = vol(6, 10);
        titulo = `Series ${n} × 400 m`;
        bloques.push({ titulo: `${n} × 400 m`, lineas: [`Ritmo ${km(rit.cortas)}`, '90 s de trote suave entre series'] });
        distancia = n * 0.4 + 4; duracion = 20 + n * 3.5;
      } else if (fase === 'construccion') {
        const n = vol(4, 6);
        titulo = `Series ${n} × 1 km`;
        bloques.push({ titulo: `${n} × 1.000 m`, lineas: [`Ritmo ${km(rit.intervalo)}`, '2 min de trote suave entre series'] });
        distancia = n + 4; duracion = 20 + n * (rit.intervalo / 60 + 2);
      } else if (fase === 'taper') {
        titulo = 'Series cortas de chispa';
        bloques.push({ titulo: '4 × 400 m', lineas: [`Ritmo ${km(rit.cortas)} sin forzar`, '2 min de descanso: tienes que acabar con ganas'] });
        distancia = 5; duracion = 35;
      } else {
        const n = vol(5, 8);
        titulo = `${n} × 1 km a ritmo HYROX`;
        bloques.push({ titulo: `${n} × 1.000 m`, lineas: [`Ritmo HYROX: ${km(rit.hyrox)}`, '75 s de descanso de pie (como en el roxzone)', 'Clava el ritmo en todas: ni la primera más rápida ni la última más lenta'] });
        distancia = n + 4; duracion = 20 + n * (rit.hyrox / 60 + 1.25);
      }
      break;
    }
    case 'umbral': {
      const bl = fase === 'especifico' ? 3 : vol(2, 3);
      const min = fase === 'especifico' ? 10 : vol(8, 15);
      titulo = `Umbral ${bl} × ${min} min`;
      bloques.push({ titulo: `${bl} × ${min} min`, lineas: [`Ritmo umbral: ${km(rit.umbral)} ("cómodamente duro")`, '3 min de trote suave entre bloques'] });
      duracion = 20 + bl * (min + 3);
      distancia = 4 + (bl * min * 60) / rit.umbral;
      break;
    }
    case 'fuerza': {
      const lista = {
        base: [['sentadilla', '4 × 8'], ['pmr', '3 × 10'], ['zancadas', '3 × 10 por pierna'], ['remo_barra', '4 × 8'], ['press', '3 × 8'], ['plancha', '3 × 40 s']],
        construccion: [['sentadilla', '4 × 6'], ['pmr', '4 × 6'], [material.sled === false ? 'zancadas' : 'sled_pesado', material.sled === false ? '3 × 12 por pierna' : '4 × 20 m'], ['thrusters', '3 × 10'], ['dominadas', '4 × 6-8'], ['farmer_pesado', '4 × 40 m']],
        especifico: [['sentadilla', '3 × 5 (pesado)'], ['cajon', '4 × 5'], ['thrusters', '3 × 12'], ['dominadas', '3 × 8'], ['farmer_pesado', '3 × 50 m'], ['plancha', '3 × 45 s']],
        taper: [['sentadilla', '2 × 5 (ligero)'], ['cajon', '3 × 3'], ['plancha', '2 × 30 s']],
      }[fase] || [];
      titulo = { base: 'Fuerza general', construccion: 'Fuerza + trineo', especifico: 'Fuerza y potencia', taper: 'Fuerza ligera' }[fase] || 'Fuerza';
      bloques.push({
        titulo: factor < 0.9 ? 'Circuito (una serie menos en cada ejercicio)' : 'Ejercicios',
        lineas: lista.map(([id, series]) => {
          const e = ejercicio(id, lesiones);
          return `${e.nombre}: ${series}${e.alternativa ? ' (alternativa por tu lesión)' : ''}`;
        }),
      });
      notas.push('RPE 7-8: termina cada serie con 2-3 repeticiones en reserva. Descansa 90-120 s entre series.');
      duracion = fase === 'taper' ? 30 : Math.round(55 * Math.min(1, factor + 0.1));
      break;
    }
    case 'estaciones': {
      const rondas = factor < 0.9 ? 2 : vol(3, 4);
      const circuito = semana % 2 === 0
        ? [['ski', '500 m'], ['push', '15 m'], ['wallballs', '15 reps'], ['bbj', '10 m']]
        : [['row', '500 m'], ['pull', '25 m'], ['farmers', '100 m'], ['lunges', '25 m']];
      titulo = semana % 2 === 0 ? 'Estaciones A: ski, trineo, wall balls, burpees' : 'Estaciones B: remo, pull, carry, lunges';
      bloques.push({ titulo: `${rondas} rondas`, lineas: [...circuito.map(([id, d]) => `${d} ${nombreEst(id)}${peso(id)}`), fase === 'base' ? '2 min de descanso entre rondas · foco en técnica' : '90 s de descanso · a ritmo de carrera'] });
      duracion = 25 + rondas * 9;
      break;
    }
    case 'compromised': {
      const rondas = factor < 0.9 ? 3 : vol(3, 5);
      const ids = ESTACIONES.map((e) => e.id);
      const sel = Array.from({ length: rondas }, (_, i) => ids[(semana * 2 + i) % 8]);
      titulo = `Compromised running ${rondas} rondas`;
      bloques.push({
        titulo: `${rondas} rondas seguidas`,
        lineas: sel.flatMap((id) => [`1 km a ritmo HYROX (${km(rit.hyrox)})`, `${MEDIA[id]} ${nombreEst(id)}${peso(id)}`]),
      });
      notas.push('Sin descanso entre la carrera y la estación: así aprendes a correr con las piernas cargadas. 1-2 min de pausa entre rondas.');
      duracion = 25 + rondas * (rit.hyrox / 60 + 5);
      distancia = rondas + 3;
      break;
    }
    case 'simulacro': {
      const completo = ctx.completo;
      const tramo = ctx.mitad === '5-8' ? ESTACIONES.slice(4) : ESTACIONES.slice(0, 4);
      const estaciones = completo ? ESTACIONES : tramo;
      titulo = completo ? 'Simulacro HYROX completo' : `Medio simulacro (estaciones ${ctx.mitad || '1-4'})`;
      bloques.push({
        titulo: completo ? '8 × (1 km + estación)' : '4 × (1 km + estación)',
        lineas: estaciones.flatMap((e) => [`1 km a ritmo HYROX (${km(rit.hyrox)})`, `${COMPLETA[e.id]} ${nombreEst(e.id)}${peso(e.id)}`]),
      });
      notas.push('Cronometra cada tramo y apúntalo al registrar la sesión: así afino tu estimación de carrera.');
      if (completo) notas.push('Ensaya también la nutrición del día de carrera (desayuno, cafeína, gel).');
      duracion = completo ? 95 : 55;
      distancia = estaciones.length + 3;
      break;
    }
    case 'recuperacion': {
      bloques.push({ titulo: 'Suave de verdad', lineas: ['20-30 min de movilidad: cadera, tobillos, columna y hombros', '20 min de paseo o bici muy suave', 'Si tienes agujetas fuertes, hoy descanso total'] });
      duracion = 40;
      break;
    }
    case 'activacion': {
      bloques.push({ titulo: 'Activar sin cansar', lineas: ['15 min de trote suave', `4 × 200 m a ritmo HYROX (${km(rit.hyrox)}) con 1 min de pausa`, '1 ronda ligera: 250 m SkiErg + 10 wall balls + 10 m sled push', 'Terminas con ganas de más: perfecto'] });
      duracion = 35;
      distancia = 4;
      break;
    }
    case 'carrera': {
      titulo = `HYROX ${config.categoria === 'open' ? 'Open' : config.categoria === 'pro' ? 'Pro' : config.categoria === 'doubles' ? 'Doubles' : 'Relay'}`;
      bloques.push({ titulo: '¡Día de carrera!', lineas: ['Revisa tu estrategia y tu plan de nutrición en la pestaña Carrera', 'Calienta 15 min: trote, movilidad y 2 progresiones', 'Primer km controlado: la carrera empieza en el SkiErg'] });
      duracion = ctx.duracionCarrera || 90;
      distancia = 8;
      break;
    }
    default:
      break;
  }

  return {
    tipo,
    titulo,
    emoji: T.emoji,
    color: T.color,
    rpe: T.rpe,
    duracion: Math.round(duracion),
    distancia: Math.round(distancia * 10) / 10,
    calentamiento: CALENTAMIENTO[T.clase] || [],
    bloques,
    vueltaCalma: VUELTA_CALMA[T.clase] || [],
    notas,
  };
}

/** kcal netas aproximadas de una sesión (MET) */
export function kcalSesionHyrox(sesion, peso) {
  const met = TIPOS[sesion.tipo]?.met || 6;
  return Math.round((met - 1) * peso * (sesion.duracion / 60));
}
