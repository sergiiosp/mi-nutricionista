// Salud, hábitos y suplementación. Solo suplementos con evidencia razonable,
// con dosis orientativas para adultos sanos y sus precauciones.

import { aMin, aHora } from './horario.js';

export const CONDICIONES = {
  anemia: { nombre: 'Anemia o hierro bajo', emoji: '🩸' },
  hipertension: { nombre: 'Tensión alta', emoji: '❤️' },
  colesterol: { nombre: 'Colesterol o triglicéridos altos', emoji: '🫀' },
  diabetes: { nombre: 'Diabetes o prediabetes', emoji: '🍬' },
  tiroides: { nombre: 'Hipotiroidismo', emoji: '🦋' },
  digestivo: { nombre: 'Problemas digestivos (colon irritable, reflujo…)', emoji: '🫃' },
  renal: { nombre: 'Enfermedad renal', emoji: '🫘' },
  hemorroides: { nombre: 'Hemorroides', emoji: '🌿' },
  embarazo: { nombre: 'Embarazo o lactancia', emoji: '🤰' },
  tca: { nombre: 'He tenido una relación difícil con la comida (TCA)', emoji: '🤍' },
};

export const ESTRES = { bajo: 'Bajo', medio: 'Medio', alto: 'Alto' };
export const SUENO = { poco: 'Menos de 6 h', justo: '6 – 7 h', bien: '7 – 8 h', mucho: 'Más de 8 h' };
export const ALCOHOL = { nunca: 'Nunca', ocasional: 'Alguna vez al mes', semanal: '1-2 veces por semana', frecuente: 'Casi a diario' };

// Alimentos a favorecer o limitar en el menú según la salud
const RICOS_HIERRO = ['lentejas', 'garbanzos', 'alubias', 'ternera_filete', 'picada_vacuno', 'espinacas', 'tofu', 'huevo', 'avena', 'langostino'];
const RICOS_VITC = ['pimiento_rojo', 'naranja', 'kiwi', 'fresas', 'tomate', 'tomate_cherry', 'brocoli'];
const ALTOS_SODIO = ['jamon_serrano', 'pavo_fiambre', 'salsa_soja', 'queso_rallado', 'tomate_frito'];
const GRASA_SATURADA = ['picada_vacuno', 'mozzarella', 'queso_rallado', 'jamon_serrano', 'cerdo_lomo'];
const CARDIOSALUDABLES = ['salmon', 'avena', 'lentejas', 'garbanzos', 'alubias', 'nueces', 'almendras', 'aceite'];
const AZUCARES = ['miel', 'confitura'];
const INTEGRALES = ['arroz_integral', 'pasta_integral', 'pan_integral', 'pan_molde', 'avena', 'lentejas', 'garbanzos', 'alubias'];
const FLATULENTOS = ['alubias', 'garbanzos', 'lentejas', 'cebolla', 'ajo', 'coliflor'];
const CON_FIBRA = ['kiwi', 'avena', 'lentejas', 'garbanzos', 'alubias', 'alubias_pintas', 'pan_integral', 'arroz_integral', 'pasta_integral', 'brocoli', 'judias_verdes', 'calabacin', 'zanahoria'];

/** Ingredientes con bonificación o penalización al elegir recetas. */
export function preferenciasAlimentos(perfil) {
  const c = perfil.condiciones || [];
  const bonus = new Set();
  const penal = new Set();
  const add = (set, lista) => lista.forEach((x) => set.add(x));
  if (c.includes('anemia')) { add(bonus, RICOS_HIERRO); add(bonus, RICOS_VITC); }
  if (c.includes('hipertension')) add(penal, ALTOS_SODIO);
  if (c.includes('colesterol')) { add(penal, GRASA_SATURADA); add(bonus, CARDIOSALUDABLES); }
  if (c.includes('diabetes')) { add(penal, AZUCARES); add(bonus, INTEGRALES); }
  if (c.includes('digestivo')) add(penal, FLATULENTOS);
  if (c.includes('hemorroides')) add(bonus, CON_FIBRA);
  for (const x of penal) bonus.delete(x);
  return { bonus, penal };
}

const restarHoras = (hhmm, h) => aHora(aMin(hhmm) - h * 60);

/**
 * Recomendaciones personalizadas.
 * @returns {{ avisos, alimentacion, suplementos, habitos }}
 */
export function recomendaciones(perfil, objetivos) {
  const c = perfil.condiciones || [];
  const peso = perfil.peso;
  const deportes = perfil.entrena ? perfil.deportes || [] : [];
  const clase = objetivos.clase;
  const avisos = [];
  const alimentacion = [];
  const suplementos = [];
  const habitos = [];
  const sinPescado = ['vegetariana'].includes(perfil.dieta) || (perfil.alergias || []).includes('pescado')
    || ['salmon'].every((x) => (perfil.noMeGusta || []).includes(x));
  const vegetariana = perfil.dieta === 'vegetariana';
  const dormir = perfil.dormir || '23:30';
  const entrenoTarde = perfil.entrena && perfil.horaEntreno && aMin(perfil.horaEntreno) >= 18 * 60;

  // ── Avisos de seguridad ──
  if (c.includes('embarazo')) avisos.push({ nivel: 'importante', texto: 'En embarazo y lactancia las necesidades cambian (ácido fólico, yodo, hierro…). He quitado el déficit calórico; sigue las pautas de tu matrona o ginecólogo y no tomes suplementos sin su indicación.' });
  if (c.includes('tca')) avisos.push({ nivel: 'importante', texto: 'Gracias por contármelo. He limitado el déficit a uno muy suave. Te recomiendo hacer este proceso acompañado de un dietista-nutricionista o psicólogo; si contar calorías te genera ansiedad, deja de usar esa parte de la app.' });
  if (c.includes('renal')) avisos.push({ nivel: 'importante', texto: 'Con enfermedad renal la proteína y algunos minerales deben pautarse por tu nefrólogo. Las cantidades de proteína de esta app pueden ser demasiado altas para ti.' });
  if (c.includes('diabetes')) avisos.push({ nivel: 'importante', texto: 'Si usas insulina o fármacos que bajan la glucosa, cambiar la dieta o entrenar puede provocar hipoglucemias: coméntalo con tu médico antes de empezar.' });
  if (perfil.medicacion) avisos.push({ nivel: 'info', texto: 'Tomas medicación habitual: consulta con tu médico o farmacéutico antes de añadir cualquier suplemento, porque algunos interaccionan.' });
  if (perfil.compite && perfil.categoriaPeso) avisos.push({ nivel: 'info', texto: 'Compites por categoría de peso: llega al peso con la dieta de forma gradual. No hagas cortes de agua ni sauna sin supervisión profesional.' });

  // ── Alimentación según salud ──
  if (c.includes('hemorroides')) alimentacion.push({ emoji: '🌿', titulo: 'Fibra y agua', texto: 'Tu menú tira de legumbres, integrales, avena y verdura cocinada. Dos kiwis pelados al día ayudan a ir al baño. Y bebe 2,5-3 l de agua: sin agua, la fibra estriñe. Los dos días antes de una carrera, menos fibra.' });
  if (c.includes('anemia')) alimentacion.push({ emoji: '🩸', titulo: 'Hierro', texto: 'He priorizado legumbres, carne roja magra, huevo y espinacas. Acompáñalos de vitamina C (pimiento, tomate, naranja, kiwi), que multiplica su absorción. Deja el café y el té para 1 h antes o después de comer: frenan la absorción del hierro.' });
  if (c.includes('hipertension')) alimentacion.push({ emoji: '🧂', titulo: 'Sal', texto: 'Menos embutido, salsa de soja y quesos curados en el menú. Cocina con especias, ajo y limón en vez de sal, y busca más fruta, verdura y legumbre (potasio).' });
  if (c.includes('colesterol')) alimentacion.push({ emoji: '🐟', titulo: 'Colesterol', texto: 'Más pescado, avena, legumbres, frutos secos y aceite de oliva; menos carne picada y quesos. La fibra soluble de la avena y las legumbres ayuda a bajar el LDL.' });
  if (c.includes('diabetes')) alimentacion.push({ emoji: '🌾', titulo: 'Glucosa', texto: 'Hidratos integrales y legumbres, siempre acompañados de proteína y verdura. Evita zumos y azúcares sueltos. Caminar 10-15 min después de comer ayuda mucho.' });
  if (c.includes('tiroides')) alimentacion.push({ emoji: '🦋', titulo: 'Levotiroxina', texto: 'Si la tomas, hazlo en ayunas 30-60 min antes del desayuno, solo con agua. Sepárala al menos 4 h del calcio, el hierro, la soja y el café.' });
  if (c.includes('digestivo')) alimentacion.push({ emoji: '🫃', titulo: 'Digestión', texto: 'He reducido legumbres, cebolla y ajo. Come despacio, en raciones moderadas, y no te tumbes justo después de cenar. Si tienes colon irritable, la dieta baja en FODMAP debe guiarla un profesional.' });
  if (perfil.compite) alimentacion.push({ emoji: '🏆', titulo: 'Día de competición', texto: 'No pruebes nada nuevo el día de la prueba. Haz la última comida principal 3-4 h antes (rica en hidratos, baja en grasa y fibra) y, si dura más de 75 min, toma 30-60 g de hidratos por hora durante la prueba.' });

  // ── Suplementos ──
  const haceFuerza = ['fuerza', 'mixto'].includes(clase);
  if (!c.includes('embarazo')) {
    if (haceFuerza || ['ganar', 'recomposicion'].includes(perfil.objetivo)) {
      suplementos.push({
        id: 'creatina', emoji: '⚡', nombre: 'Creatina monohidrato', evidencia: 'alta',
        dosis: '3-5 g al día', momento: 'Cualquier hora, todos los días (también los de descanso). Con una comida se tolera mejor.',
        porque: 'Es el suplemento con más evidencia para ganar fuerza y masa muscular. No hace falta fase de carga.',
        precauciones: c.includes('renal')
          ? 'Con enfermedad renal NO la tomes sin permiso de tu nefrólogo.'
          : `Retiene algo de agua dentro del músculo (≈1 kg en la báscula, no es grasa).${perfil.categoriaPeso ? ' Ojo si tienes que dar un peso.' : ''} Busca monohidrato 100 % (sello Creapure si puedes).`,
        recordatorio: c.includes('renal') ? null : { franja: 'desayuno', texto: 'Creatina 3-5 g' },
      });
    }
    const exigenteEntreno = ['fuerza', 'mixto', 'resistencia'].includes(clase) && perfil.intensidad !== 'suave';
    if (exigenteEntreno && !c.includes('hipertension') && perfil.estres !== 'alto' && !perfil.medicacion) {
      const mg = Math.min(300, Math.round((3 * peso) / 25) * 25);
      suplementos.push({
        id: 'cafeina', emoji: '☕', nombre: 'Cafeína antes de entrenar', evidencia: 'alta',
        dosis: `${mg} mg (≈3 mg/kg; un café solo tiene 60-100 mg)`, momento: '30-60 min antes de entrenar.',
        porque: 'Mejora el rendimiento en fuerza y resistencia y reduce la sensación de esfuerzo.',
        precauciones: entrenoTarde
          ? `Entrenas por la tarde-noche: la cafeína tarda unas 8 h en irse. Si duermes peor, sáltatela (nada a partir de las ${restarHoras(dormir, 8)}).`
          : `No pases de 400 mg al día en total y nada a partir de las ${restarHoras(dormir, 8)}.`,
        recordatorio: entrenoTarde ? null : { preEntreno: true, texto: `Café / cafeína ${mg} mg` },
      });
    }
    const exigente = (objetivos.gKg >= 1.8 && clase && clase !== 'ligero') || vegetariana;
    if (exigente) {
      suplementos.push({
        id: 'proteina', emoji: '🥤', nombre: 'Proteína en polvo (opcional)', evidencia: 'alta',
        dosis: '1 cacito (25-30 g) cuando no llegues', momento: 'Después de entrenar o como merienda.',
        porque: `Es comida, no magia: solo sirve si te cuesta llegar a tus ${objetivos.proteina} g de proteína. Tu menú ya está calculado para llegar sin ella.`,
        precauciones: (perfil.alergias || []).includes('lactosa') ? 'Con intolerancia a la lactosa, elige whey isolate o proteína vegetal (guisante/soja).' : vegetariana ? 'Elige proteína vegetal (guisante, soja) o whey si tomas lácteos.' : 'Whey concentrado o isolate; evita los que llevan "matrices" o muchos aditivos.',
        recordatorio: null,
      });
    }
    suplementos.push({
      id: 'vitd', emoji: '☀️', nombre: 'Vitamina D', evidencia: 'moderada',
      dosis: '1.000-2.000 UI al día', momento: 'Con la comida principal (necesita grasa para absorberse).',
      porque: 'Gran parte de la población en España tiene niveles bajos en otoño-invierno, sobre todo si trabajas en interior.',
      precauciones: 'Lo ideal es pedir una analítica (25-OH vitamina D) antes. No superes 4.000 UI/día sin indicación médica.',
      recordatorio: null,
    });
    if (sinPescado || c.includes('colesterol')) {
      suplementos.push({
        id: 'omega3', emoji: '🐟', nombre: vegetariana ? 'Omega-3 de algas' : 'Omega-3 (EPA + DHA)', evidencia: 'moderada',
        dosis: '250-500 mg de EPA+DHA al día', momento: 'Con una comida.',
        porque: c.includes('colesterol') ? 'Ayuda a bajar los triglicéridos.' : 'Apenas comes pescado azul, la fuente principal de estos ácidos grasos.',
        precauciones: 'Si tomas anticoagulantes, consúltalo antes. Mejor comer pescado azul 2 veces por semana si puedes.',
        recordatorio: null,
      });
    }
    if (vegetariana) {
      suplementos.push({
        id: 'b12', emoji: '💊', nombre: 'Vitamina B12', evidencia: 'alta',
        dosis: '25-100 µg al día o 2.000 µg una vez por semana', momento: 'Cualquier hora.',
        porque: 'Con dieta vegetariana es muy fácil quedarse corto, y su déficit da anemia y problemas neurológicos.',
        precauciones: 'Es segura; usa cianocobalamina.',
        recordatorio: { franja: 'desayuno', texto: 'Vitamina B12' },
      });
    }
    if (c.includes('anemia')) {
      suplementos.push({
        id: 'hierro', emoji: '🩸', nombre: 'Hierro', evidencia: 'alta',
        dosis: 'Solo con receta', momento: 'Según te indique tu médico.',
        porque: 'Si tienes anemia ferropénica confirmada suele hacer falta, pero la dosis depende de tu analítica (ferritina, hemoglobina).',
        precauciones: 'No lo tomes por tu cuenta: el exceso de hierro es tóxico y la anemia puede tener otras causas.',
        recordatorio: null,
      });
    }
    if (perfil.estres === 'alto' || perfil.sueno === 'poco') {
      suplementos.push({
        id: 'magnesio', emoji: '🌙', nombre: 'Magnesio (bisglicinato)', evidencia: 'baja',
        dosis: '200-300 mg', momento: 'Por la noche, con la cena.',
        porque: 'Puede ayudar a relajarte y dormir si tu dieta va justa de magnesio. Antes que el suplemento, prioriza el sueño y los hábitos de abajo.',
        precauciones: c.includes('renal') ? 'Con enfermedad renal, no lo tomes sin consultar.' : 'Si te sienta mal al estómago o produce diarrea, baja la dosis.',
        recordatorio: c.includes('renal') ? null : { franja: 'cena', texto: 'Magnesio' },
      });
    }
    if (perfil.compite && deportes.some((d) => ['hiit', 'equipo', 'natacion', 'carrera', 'ciclismo'].includes(d))) {
      suplementos.push({
        id: 'betaalanina', emoji: '🏁', nombre: 'Beta-alanina', evidencia: 'moderada',
        dosis: '3,2-6,4 g al día repartidos en tomas de 1,6 g', momento: 'Con las comidas, durante al menos 4 semanas.',
        porque: 'Mejora el rendimiento en esfuerzos intensos de 1 a 4 minutos (sprints repetidos, series, pruebas cortas).',
        precauciones: 'Produce un hormigueo inofensivo en la piel; repartir la dosis lo reduce.',
        recordatorio: null,
      });
    }
  }
  if (clase === 'resistencia' && (perfil.duracionEntreno || 0) >= 75) {
    suplementos.push({
      id: 'hidratos', emoji: '🍌', nombre: 'Hidratos durante el entreno', evidencia: 'alta',
      dosis: '30-60 g de hidratos por hora + sales (sodio)', momento: 'A partir de los 60-75 min de sesión.',
      porque: 'En sesiones largas mantiene el rendimiento y evita la "pájara". Vale con plátano, dátiles, bebida isotónica o geles.',
      precauciones: 'Entrénalo: el intestino se acostumbra. Prueba en los entrenos antes de usarlo en competición.',
      recordatorio: { duranteEntreno: true, texto: '30-60 g hidratos/h + sales' },
    });
  }

  // ── Hábitos ──
  habitos.push({ emoji: '💧', titulo: 'Agua', texto: `Unos ${String(objetivos.agua).replace('.', ',')} l al día${perfil.entrena ? ` y ${String(objetivos.aguaEntreno).replace('.', ',')} l los días de entreno` : ''}. Orina de color amarillo claro = vas bien.` });
  if (c.includes('hemorroides')) habitos.push({ emoji: '🧘', titulo: 'En el baño', texto: 'No aguantes las ganas, no empujes y no pases más de 5 minutos sentado (sin el móvil). Un taburete bajo los pies endereza el recto y sale solo. Si sangras o duele, coméntalo con tu médico.' });
  if (perfil.sueno === 'poco' || perfil.sueno === 'justo') habitos.push({ emoji: '😴', titulo: 'Sueño', texto: 'Dormir menos de 7 h aumenta el hambre (sobre todo de dulce), empeora la recuperación y dificulta perder grasa. Intenta acostarte a la misma hora, sin pantallas la última media hora y con la habitación fresca y oscura.' });
  if (perfil.estres === 'alto') habitos.push({ emoji: '🧘', titulo: 'Estrés', texto: 'El estrés alto sube el apetito y empeora el sueño. Lo que mejor funciona: caminar a diario (mejor al aire libre), 5 min de respiración lenta (4 s inspirar, 6 s soltar), no saltarte comidas y limitar la cafeína. Si se mantiene, habla con un profesional.' });
  if ((perfil.cafes || 0) >= 4) habitos.push({ emoji: '☕', titulo: 'Café', texto: `Tomas ${perfil.cafes} cafés al día. Por encima de 4 (~400 mg) puede afectar a tu sueño y ansiedad. El último, antes de las ${restarHoras(dormir, 8)}.` });
  if (perfil.alcohol === 'semanal' || perfil.alcohol === 'frecuente') habitos.push({ emoji: '🍷', titulo: 'Alcohol', texto: 'Aporta calorías vacías (una caña ≈ 100 kcal, una copa de vino ≈ 120), empeora el sueño y la recuperación muscular. Cuanto menos, mejor; si bebes, que no sea el día de entreno.' });
  if (perfil.trabajo === 'sentado') habitos.push({ emoji: '🚶', titulo: 'Moverse', texto: 'Trabajas sentado: levántate 2-3 min cada hora y busca llegar a 8.000 pasos. Suma más gasto que una sesión extra de cardio.' });

  return { avisos, alimentacion, suplementos, habitos };
}

/** Recordatorios de suplementos para la línea de tiempo de un día. */
// Por qué se toma a esa hora, en una línea (para la línea de tiempo de Hoy)
const BREVE = {
  creatina: 'Cada día, también en descanso: cuenta la constancia',
  cafeina: 'Hace efecto en unos 45 min',
  b12: 'Imprescindible si no comes carne',
  magnesio: 'Puede ayudarte a descansar mejor',
  hidratos: 'Mantienen el ritmo en sesiones largas',
};

export function recordatoriosDia(recs, franjas, sesion) {
  const lista = [];
  for (const s of recs.suplementos) {
    const r = s.recordatorio;
    if (!r) continue;
    if (r.franja) {
      const f = franjas.find((x) => x.id === r.franja) || franjas[0];
      if (!f) continue; // día sin menú
      lista.push({ id: s.id, hora: f.horaTexto, texto: r.texto, emoji: s.emoji, porque: BREVE[s.id] });
    } else if (r.preEntreno && sesion) {
      lista.push({ id: s.id, hora: aHora(aMin(sesion.inicio) - 45), texto: r.texto, emoji: s.emoji, porque: BREVE[s.id] });
    } else if (r.duranteEntreno && sesion) {
      lista.push({ id: s.id, hora: sesion.inicio, texto: r.texto, emoji: s.emoji, durante: true, porque: BREVE[s.id] });
    }
  }
  return lista;
}
