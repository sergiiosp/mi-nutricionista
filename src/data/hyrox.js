// HYROX: formato de carrera, estaciones con pesos oficiales y ejercicios de entrenamiento.
// Pesos de referencia de las temporadas recientes (el trineo incluye su propio peso).
// Comprueba siempre el reglamento oficial de tu temporada: hyrox.com

export const CATEGORIAS = {
  open: { nombre: 'Open', desc: 'La categoría estándar, con pesos asequibles' },
  pro: { nombre: 'Pro', desc: 'Pesos más altos, para atletas avanzados' },
  doubles: { nombre: 'Doubles', desc: 'En pareja: corréis juntos y os repartís las estaciones' },
  relay: { nombre: 'Relay', desc: 'Relevos de 4: cada uno hace 2 km y 2 estaciones' },
};

// Pesos por división: open/pro y hombre (h) / mujer (m). Doubles y relay usan los de Open.
const P = (oh, om, ph, pm) => ({ open: { h: oh, m: om }, pro: { h: ph, m: pm } });

export const ESTACIONES = [
  {
    id: 'ski', n: 1, nombre: 'SkiErg', emoji: '⛷️', distancia: '1.000 m', pesos: null,
    desc: 'Ergómetro de esquí de fondo: tiras de los tiradores de arriba abajo usando todo el cuerpo.',
    tecnica: ['Brazos casi estirados arriba y bisagra de cadera al tirar', 'La fuerza sale de las piernas y el tronco, no solo de los brazos', 'Termina el tirón con las manos junto a los muslos', 'Ritmo de unas 30-40 paladas por minuto'],
    errores: ['Tirar solo con los brazos y acabar con los hombros quemados', 'Salir demasiado fuerte: es la primera estación y quedan 7', 'No respirar con el ritmo de la palada'],
    carrera: 'Ve a un ritmo cómodo, 3-5 s/500 m más lento que tu ritmo de 1.000 m. Aquí no se gana la carrera.',
    sustituto: 'Sin SkiErg: remo, assault bike o jalones con banda elástica (mismo tiempo de trabajo).',
    musculos: 'Dorsales, tríceps, core y piernas',
  },
  {
    id: 'push', n: 2, nombre: 'Sled Push', emoji: '🛷', distancia: '50 m (4 × 12,5 m)', pesos: P(152, 102, 202, 152),
    desc: 'Empujar un trineo cargado por una moqueta.',
    tecnica: ['Brazos casi estirados y cuerpo inclinado unos 45°', 'Pasos cortos y rápidos empujando con la parte delantera del pie', 'Mantén el trineo en movimiento: arrancar desde parado cuesta el doble', 'En los giros, recoloca rápido sin soltar el ritmo'],
    errores: ['Brazos flexionados: cansas los tríceps y pierdes empuje', 'Zancadas largas que frenan el trineo', 'Pararse a mitad de largo'],
    carrera: 'Empuje constante sin parar. Si tienes que descansar, hazlo al final del largo, nunca a mitad.',
    sustituto: 'Sin trineo: prensa de piernas pesada, empujar un coche en llano o sprints en cuesta de 20 s.',
    musculos: 'Cuádriceps, glúteos, gemelos y hombros',
  },
  {
    id: 'pull', n: 3, nombre: 'Sled Pull', emoji: '🪢', distancia: '50 m (4 × 12,5 m)', pesos: P(103, 78, 153, 103),
    desc: 'Arrastrar el trineo hacia ti con una cuerda, de pie detrás de una línea.',
    tecnica: ['Apóyate atrás con las piernas flexionadas, como en el remo', 'Tira mano sobre mano con brazos largos y usa el peso del cuerpo', 'Camina hacia atrás para ganar recorrido en cada tirón', 'Deja la cuerda ordenada a un lado para no pisarla'],
    errores: ['Tirar solo con los brazos y quemar el agarre', 'Quedarse quieto de pie: pierdes metros por tirón', 'Enredarse con la cuerda'],
    carrera: 'Tirones largos y rítmicos. Es la estación donde más se dispara el pulso: controla la respiración.',
    sustituto: 'Sin trineo: remo con banda o polea pesada, arrastre de neumático o remo invertido.',
    musculos: 'Espalda, bíceps, antebrazos y glúteos',
  },
  {
    id: 'bbj', n: 4, nombre: 'Burpee Broad Jumps', emoji: '🐸', distancia: '80 m', pesos: null,
    desc: 'Burpee (pecho al suelo) y salto horizontal con los dos pies, una y otra vez.',
    tecnica: ['Baja con el pecho al suelo y levántate en un solo movimiento fluido', 'Saltos cómodos, no máximos: la eficiencia gana', 'Aterriza suave y enlaza con el siguiente burpee', 'Encuentra un ritmo que puedas mantener los 80 m'],
    errores: ['Saltar al máximo los primeros metros y morir después', 'Pararse de pie entre repeticiones', 'Caer con las rodillas hacia dentro'],
    carrera: 'Ritmo constante tipo "burpee-salto-respira". Es la estación más larga para muchos: paciencia.',
    sustituto: 'Sin espacio: burpees normales + saltos de longitud por separado, o burpees con salto al frente.',
    musculos: 'Todo el cuerpo, sobre todo piernas, pecho y hombros',
  },
  {
    id: 'row', n: 5, nombre: 'Remo', emoji: '🚣', distancia: '1.000 m', pesos: null,
    desc: 'Remoergómetro.',
    tecnica: ['Orden: piernas, tronco, brazos al tirar; al revés al volver', 'El 60 % de la fuerza sale de las piernas', 'Vuelta lenta y controlada, tirón explosivo', 'Entre 26 y 30 paladas por minuto'],
    errores: ['Tirar primero con los brazos', 'Volver deprisa y cansarse sin avanzar', 'Resistencia (damper) demasiado alta: con 5-6 basta'],
    carrera: 'Llega con las piernas cansadas del burpee: empieza 2-3 s/500 m más lento y acaba fuerte.',
    sustituto: 'Sin remo: SkiErg, bici o remo con banda elástica.',
    musculos: 'Piernas, espalda y brazos',
  },
  {
    id: 'farmers', n: 6, nombre: 'Farmers Carry', emoji: '🧺', distancia: '200 m', pesos: P('2 × 24', '2 × 16', '2 × 32', '2 × 24'),
    desc: 'Caminar con una kettlebell en cada mano.',
    tecnica: ['Hombros atrás y abajo, pecho arriba, mirada al frente', 'Pasos rápidos y cortos, casi trotando', 'Agarre firme con toda la mano, no solo los dedos', 'Si paras, deja las pesas con cuidado y retoma rápido'],
    errores: ['Encorvar la espalda', 'Caminar lento: más tiempo cargando = más agarre gastado', 'Soltar muchas veces por mal agarre'],
    carrera: 'Es la estación "rápida": a paso ligero y del tirón si tu agarre aguanta.',
    sustituto: 'Sin kettlebells: mancuernas, garrafas de agua o bolsas cargadas.',
    musculos: 'Agarre, trapecios, core y piernas',
  },
  {
    id: 'lunges', n: 7, nombre: 'Sandbag Lunges', emoji: '🎒', distancia: '100 m', pesos: P(20, 10, 30, 20),
    desc: 'Zancadas caminando con un saco sobre los hombros; la rodilla de atrás toca el suelo.',
    tecnica: ['Saco apoyado en los hombros por detrás de la cabeza', 'Toca suavemente el suelo con la rodilla de atrás', 'Tronco erguido y pasos de longitud media', 'Respira en cada zancada y mantén un ritmo fijo'],
    errores: ['No tocar con la rodilla (penalización)', 'Inclinar el tronco hacia delante', 'Zancadas demasiado largas que te frenan al levantarte'],
    carrera: 'Mucha gente se para aquí: mejor un ritmo lento pero continuo que ir rápido y parar.',
    sustituto: 'Sin saco: zancadas con mancuernas, barra o mochila cargada.',
    musculos: 'Cuádriceps, glúteos y core',
  },
  {
    id: 'wallballs', n: 8, nombre: 'Wall Balls', emoji: '🏐', distancia: '100 repeticiones', pesos: P('6 kg (3 m)', '4 kg (2,7 m)', '9 kg (3 m)', '6 kg (2,7 m)'),
    desc: 'Sentadilla completa con balón medicinal y lanzarlo a una diana en la pared.',
    tecnica: ['Sentadilla por debajo de la paralela con el balón pegado al pecho', 'Usa el impulso de las piernas para lanzar, no los brazos', 'Recoge el balón y enlaza la siguiente bajada', 'Parte en bloques desde el principio (por ejemplo, 5 × 20)'],
    errores: ['No bajar lo suficiente (no cuenta)', 'Ir sin parar hasta el fallo y luego hacer series de 3', 'Lanzar con los brazos'],
    carrera: 'Divide antes de cansarte: bloques fijos con pausas cortas de 3-5 respiraciones.',
    sustituto: 'Sin balón: thrusters con mancuernas ligeras o sentadilla con lanzamiento de balón medicinal al aire.',
    musculos: 'Piernas, glúteos y hombros',
  },
];
export const estacionPorId = Object.fromEntries(ESTACIONES.map((e) => [e.id, e]));

/** Peso de una estación según la configuración (las categorías por equipos usan los pesos Open). */
export function pesoEstacion(estacion, categoria, sexo) {
  if (!estacion.pesos) return null;
  const c = categoria === 'pro' ? 'pro' : 'open';
  const v = estacion.pesos[c][sexo === 'm' ? 'm' : 'h'];
  return typeof v === 'number' ? `${v} kg` : `${v}${/kg/.test(v) ? '' : ' kg'}`;
}

// Tiempos de referencia por estación (segundos) para un nivel intermedio en Open.
export const TIEMPOS_BASE = { ski: 270, push: 210, pull: 240, bbj: 300, row: 255, farmers: 120, lunges: 270, wallballs: 330 };
export const NIVELES = {
  principiante: { nombre: 'Principiante', desc: 'Primera HYROX o poca experiencia en fuerza y carrera', k: 1.3, carrera: 1.24, roxzone: 60, t5k: 1800 },
  intermedio: { nombre: 'Intermedio', desc: 'Entrenas fuerza y carrera con regularidad', k: 1, carrera: 1.16, roxzone: 45, t5k: 1500 },
  avanzado: { nombre: 'Avanzado', desc: 'Compites o tienes buena base de carrera y fuerza', k: 0.8, carrera: 1.1, roxzone: 32, t5k: 1260 },
};

// Ejercicios de fuerza y accesorios con técnica breve
export const EJERCICIOS = {
  sentadilla: { nombre: 'Sentadilla con barra', emoji: '🏋️', tecnica: 'Pies a la anchura de hombros, baja por debajo de la paralela con la espalda neutra y empuja el suelo al subir.' },
  pmr: { nombre: 'Peso muerto rumano', emoji: '🏋️', tecnica: 'Rodillas algo flexionadas, lleva la cadera atrás con la barra pegada a las piernas hasta notar los isquios.', espalda: 'hipthrust' },
  hipthrust: { nombre: 'Hip thrust', emoji: '🍑', tecnica: 'Espalda alta en un banco, empuja la cadera arriba apretando glúteos 1 s.' },
  zancadas: { nombre: 'Zancadas con mancuernas', emoji: '🦵', tecnica: 'Paso largo, rodilla de atrás casi al suelo, tronco recto.', rodilla: 'puente' },
  puente: { nombre: 'Puente de glúteo a una pierna', emoji: '🍑', tecnica: 'Tumbado, una pierna flexionada, eleva la cadera sin arquear la lumbar.' },
  remo_barra: { nombre: 'Remo con barra', emoji: '🚣', tecnica: 'Tronco inclinado a 45°, tira de la barra al ombligo juntando escápulas.' },
  dominadas: { nombre: 'Dominadas o jalón al pecho', emoji: '🧗', tecnica: 'Desde brazos estirados, lleva el pecho a la barra sin balancearte.' },
  press: { nombre: 'Press militar', emoji: '🙌', tecnica: 'De pie, glúteos apretados, empuja la barra por encima de la cabeza.', hombro: 'flexiones' },
  flexiones: { nombre: 'Flexiones', emoji: '🙇', tecnica: 'Cuerpo en bloque, pecho al suelo y empuja.' },
  thrusters: { nombre: 'Thrusters con mancuernas', emoji: '🏋️', tecnica: 'Sentadilla frontal y, al subir, empuja las mancuernas sobre la cabeza en un solo gesto.' },
  plancha: { nombre: 'Plancha', emoji: '🧘', tecnica: 'Antebrazos y puntas de los pies, cuerpo recto y abdomen apretado.' },
  cajon: { nombre: 'Saltos al cajón', emoji: '📦', tecnica: 'Salto explosivo, aterriza suave con las dos piernas y baja andando.', rodilla: 'puente' },
  farmer_pesado: { nombre: 'Farmer carry pesado', emoji: '🧺', tecnica: 'Más peso que en carrera y tramos cortos: agarre y core a tope.' },
  sled_pesado: { nombre: 'Sled push pesado', emoji: '🛷', tecnica: 'Más peso que en carrera, tramos de 15-20 m con buena técnica.' },
};

/** Ejercicio con alternativa si hay lesión (rodilla, espalda, hombro). */
export function ejercicio(id, lesiones = []) {
  const e = EJERCICIOS[id];
  for (const l of lesiones) if (e?.[l]) return { id: e[l], ...EJERCICIOS[e[l]], alternativa: true };
  return { id, ...e };
}

export const LESIONES = { rodilla: 'Rodilla', espalda: 'Espalda / lumbar', hombro: 'Hombro' };
export const MATERIAL = {
  ski: { nombre: 'SkiErg', emoji: '⛷️' },
  row: { nombre: 'Remo', emoji: '🚣' },
  sled: { nombre: 'Trineo', emoji: '🛷' },
  wallball: { nombre: 'Balón medicinal / wall ball', emoji: '🏐' },
  kettlebell: { nombre: 'Kettlebells o mancuernas', emoji: '🏋️' },
  sandbag: { nombre: 'Sandbag', emoji: '🎒' },
};
