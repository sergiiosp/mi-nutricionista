// Por qué cada sesión: qué buscas con ella, qué estímulo le da al cuerpo y cómo deberías acabar. Lo que te
// diría tu entrenador antes de empezar, para que sepas a qué ir y si lo has hecho bien.
// corto: una línea para Hoy y la portada de Entreno.

const PORQUE = {
  rodaje: {
    corto: 'Base aeróbica: suma kilómetros sin cansarte',
    objetivo: 'Construir la base aeróbica que sostiene los 8 km de la carrera y te hace recuperar antes entre estaciones.',
    estimulo: 'Zona 2, suave de verdad: más mitocondrias y capilares en las piernas y un corazón que bombea más en cada latido, casi sin fatiga.',
    acabar: 'Como si no hubieras entrenado: has podido hablar todo el rato y podrías seguir media hora más.',
  },
  largo: {
    corto: 'Resistencia: aguantar el ritmo cuando llega el cansancio',
    objetivo: 'Que aguantes más de una hora en movimiento, que es lo que dura tu HYROX.',
    estimulo: 'Volumen aeróbico largo y suave: piernas más resistentes y un cuerpo que tira más de grasa y ahorra glucógeno.',
    acabar: 'Piernas cansadas pero el ritmo estable hasta el final. Si acabas mucho más lento de lo que empezaste, saliste rápido.',
  },
  series: {
    corto: 'Velocidad: subir tu techo aeróbico',
    objetivo: 'Correr más rápido sin ahogarte: sube tu consumo máximo de oxígeno (VO2 máx).',
    estimulo: 'Esfuerzos cortos cerca del máximo con recuperación entre medias: corazón y músculos trabajan a tope.',
    acabar: 'Muy cansado pero entero, con la última serie al ritmo de la primera. Si la última cae mucho, empezaste demasiado fuerte.',
  },
  umbral: {
    corto: 'Umbral: aguantar un ritmo rápido más tiempo',
    objetivo: 'Subir el ritmo que aguantas sin que la fatiga se dispare: está muy cerca del ritmo de los km de la HYROX.',
    estimulo: 'Ritmo cómodamente duro y mantenido: el cuerpo aprende a limpiar el lactato más rápido.',
    acabar: 'Exigente pero controlado: podrías haber seguido 5-10 minutos más a ese ritmo, hablando con frases cortas.',
  },
  fuerza: {
    corto: 'Fuerza de piernas y tronco para el trineo y las zancadas',
    objetivo: 'Que el trineo, las zancadas y los wall balls te cuesten menos: con más fuerza, cada repetición gasta menos de tu máximo.',
    estimulo: 'Series de 5 a 8 repeticiones con carga alta: el sistema nervioso recluta más fibras y el músculo se hace más fuerte (y, en la fase específica, más potente).',
    acabar: 'Músculo cansado, técnica limpia en todas las series y las repeticiones en reserva que marca la sesión. Sin dolor en las articulaciones.',
  },
  torso: {
    corto: 'Torso y brazos: más músculo para empujar y tirar',
    objetivo: 'Pecho, espalda, hombros y brazos más fuertes para el SkiErg, el remo, el sled pull y el farmers carry, y para ganar músculo.',
    estimulo: 'Hipertrofia: series de 8 a 15 repeticiones cerca del fallo, con la bajada controlada. El músculo crece si llegas a tu proteína.',
    acabar: 'Bombeo en el músculo trabajado y 1-3 repeticiones en reserva al final de cada serie, sin perder la técnica.',
  },
  estaciones: {
    corto: 'Técnica y fuerza-resistencia en las estaciones',
    objetivo: 'Hacer cada estación con buena técnica aunque vayas cansado: ahí es donde más tiempo se gana o se pierde.',
    estimulo: 'Fuerza-resistencia: muchas repeticiones con carga moderada y poco descanso, como en carrera.',
    acabar: 'Muy cansado pero sin romper la técnica, y respirando normal a los 2-3 minutos de terminar.',
  },
  compromised: {
    corto: 'Correr con las piernas cargadas, la clave de la HYROX',
    objetivo: 'Que el km de después de cada estación salga a tu ritmo: es lo que más se nota el día de la carrera.',
    estimulo: 'Pasar de una estación a correr sin pausa: el cuerpo aprende a correr con lactato y las piernas pesadas.',
    acabar: 'Cansado, con los km de después de las estaciones como mucho 20-30 s más lentos que tu ritmo. Si caen más, regula la estación.',
  },
  simulacro: {
    corto: 'Ensayo general: ritmo, transiciones y comida',
    objetivo: 'Ensayar la carrera de verdad: ritmo, transiciones, qué comes antes y cómo te encuentras.',
    estimulo: 'Esfuerzo muy alto y largo, casi de competición. Pide 2-3 días suaves después.',
    acabar: 'Vacío, como en carrera. Apunta el tiempo de cada parte y qué comiste: es tu mejor dato para el día de verdad.',
  },
  recuperacion: {
    corto: 'Movilidad suave para soltar',
    objetivo: 'Recuperarte antes de las sesiones duras sin sumar fatiga.',
    estimulo: 'Movimiento muy suave y movilidad: más riego en el músculo y menos rigidez.',
    acabar: 'Más suelto que al empezar. Si acabas cansado, te has pasado.',
  },
  activacion: {
    corto: 'Despertar las piernas antes de la carrera',
    objetivo: 'Llegar a la carrera con chispa y sin cansancio.',
    estimulo: 'Muy poco volumen con algún cambio de ritmo corto: activa el sistema nervioso sin gastar energía.',
    acabar: 'Fresco y con ganas de más. Si acabas cansado, sobró.',
  },
  carrera: {
    corto: 'Tu HYROX: a disfrutar lo entrenado',
    objetivo: 'Hacer tu mejor HYROX con la estrategia de Tu HYROX.',
    estimulo: 'Todo lo entrenado: corre a tu ritmo, regula en las estaciones y come lo de siempre.',
    acabar: 'Vacío en la meta, sin haberte quemado en el primer km.',
  },
  popular: {
    corto: 'Tu carrera: sal a tu ritmo objetivo',
    objetivo: 'Correr tu carrera al ritmo objetivo y, de paso, medir tu forma.',
    estimulo: 'Esfuerzo de competición: se pone a prueba todo lo entrenado.',
    acabar: 'Cansado y contento, con el último km de los más rápidos. Los días siguientes, suaves.',
  },
  caminar: {
    corto: 'Suma pasos sin cargar las piernas',
    objetivo: 'Moverte y gastar energía sin quitarle recuperación al entreno.',
    estimulo: 'Actividad suave y larga: suma gasto y ayuda a recuperar.',
    acabar: 'Fresco, como si no hubieras entrenado.',
  },
};

/** El porqué de una sesión (null si es un entreno registrado sin plan). */
export const porqueDe = (s) => PORQUE[s?.tipo] || null;
