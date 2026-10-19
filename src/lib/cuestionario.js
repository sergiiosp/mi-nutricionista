// Cuestionario inicial (y edición del perfil): la "primera consulta" con la nutricionista.

import { ALIMENTOS, ALERGENOS } from '../data/alimentos.js';
import { OBJETIVOS, DIETAS, TRABAJO, PASOS, DEPORTES, calcularObjetivos } from './nutricion.js';
import { horarioDia } from './horario.js';
import { CONDICIONES, ESTRES, SUENO, ALCOHOL, recomendaciones } from './salud.js';
import { num } from './formato.js';
import { iconoSVG } from './iconos.js';

export function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

const PERFIL_BASE = {
  nombre: '', sexo: '', edad: '', altura: '', peso: '',
  despertar: '07:30', dormir: '23:30', trabajo: '', trabajoInicio: '09:00', trabajoFin: '18:00', pasos: 'normal',
  entrena: null, deportes: [], diasEntreno: [1, 3, 5], horaEntreno: '19:00', duracionEntreno: 60, intensidad: 'moderada',
  compite: false, fechaCompeticion: '', categoriaPeso: false,
  objetivo: '', ritmo: 'moderado', pesoObjetivo: '',
  condiciones: [], medicacion: false, estres: 'medio', sueno: 'bien', cafes: 1, alcohol: 'ocasional',
  comidas: 4, dieta: 'omnivora', alergias: [], noMeGusta: [], leche: 'vaca', whey: false, aparatos: ['microondas', 'airfryer', 'plancha', 'olla'], tiempoMax: 0, sobras: false, presupuesto: 'normal', ajusteKcal: 0,
};

let paso = 0;
let borrador = null;
let editando = false;

export function iniciarCuestionario(perfilActual) {
  editando = !!perfilActual;
  borrador = { ...PERFIL_BASE, ...(perfilActual || {}) };
  paso = editando ? 1 : 0;
}

const DURACIONES = { 30: '30 min', 45: '45 min', 60: '1 h', 75: '1 h 15 min', 90: '1 h 30 min', 120: '2 h' };
const DIAS = [[1, 'L'],[2, 'M'], [3, 'X'], [4, 'J'], [5, 'V'], [6, 'S'], [0, 'D']];
const GRUPOS_NOMBRE = { proteina: 'Carne, pescado y huevos', lacteo: 'Lácteos', hidrato: 'Cereales, legumbres y tubérculos', fruta: 'Fruta', verdura: 'Verdura', grasa: 'Grasas y frutos secos', otros: 'Otros' };
const numero = (v) => Number(String(v ?? '').replace(',', '.'));

const PASOS_CUESTIONARIO = [
  {
    emoji: '👋',
    titulo: '¡Hola! Soy Pulso, tu nutricionista y entrenador',
    burbuja: 'Te haré unas preguntas (unos 3 minutos) para calcular lo que necesitas, organizar tus comidas según tu horario y tus entrenos, y prepararte menús con productos de Mercadona.',
    html: (b) => `
      <label class="campo"><span>¿Cómo te llamas?</span>
        <input name="nombre" value="${esc(b.nombre)}" placeholder="Tu nombre" autocomplete="given-name" maxlength="30"></label>`,
    leer: (f, b) => { b.nombre = f.get('nombre').trim(); },
  },
  {
    emoji: '🧍',
    titulo: 'Cuéntame sobre ti',
    burbuja: 'Con estos datos calculo tu metabolismo basal (fórmula de Mifflin-St Jeor, la más fiable en adultos).',
    html: (b) => `
      <fieldset class="opciones dos"><legend>Sexo</legend>
        ${opcion('sexo', 'h', 'Hombre', b.sexo, '', '👨')}${opcion('sexo', 'm', 'Mujer', b.sexo, '', '👩')}
      </fieldset>
      <div class="fila-campos">
        ${campoNum('edad', 'Edad', b.edad, 'años', 16, 90)}
        ${campoNum('altura', 'Altura', b.altura, 'cm', 130, 220)}
        ${campoNum('peso', 'Peso', b.peso, 'kg', 35, 250, 0.1)}
      </div>`,
    leer: (f, b) => {
      b.sexo = f.get('sexo') || '';
      b.edad = numero(f.get('edad'));
      b.altura = numero(f.get('altura'));
      b.peso = numero(f.get('peso'));
    },
    validar: (b) => {
      if (!b.sexo) return 'Elige una opción de sexo (lo necesito para la fórmula del metabolismo).';
      if (!(b.edad >= 16 && b.edad <= 90)) return 'La edad debe estar entre 16 y 90 años.';
      if (!(b.altura >= 130 && b.altura <= 220)) return 'Revisa la altura (en centímetros).';
      if (!(b.peso >= 35 && b.peso <= 250)) return 'Revisa el peso (en kilos).';
    },
  },
  {
    emoji: '🕐',
    titulo: '¿Cómo es tu día?',
    burbuja: 'Con tu horario coloco las comidas en el mejor momento. Piensa en un día de diario normal.',
    html: (b) => `
      <div class="fila-campos dos">
        ${campoHora('despertar', 'Me levanto', b.despertar)}
        ${campoHora('dormir', 'Me acuesto', b.dormir)}
      </div>
      <fieldset class="opciones dos"><legend>Tu trabajo es…</legend>
        ${Object.entries(TRABAJO).map(([k, t]) => opcion('trabajo', k, t.nombre, b.trabajo, t.desc, t.emoji)).join('')}
      </fieldset>
      <div class="solo-si" data-si="trabajo=sentado|de_pie|fisico">
        <div class="fila-campos dos">
          ${campoHora('trabajoInicio', 'Entro a trabajar', b.trabajoInicio)}
          ${campoHora('trabajoFin', 'Salgo de trabajar', b.trabajoFin)}
        </div>
      </div>
      <fieldset class="opciones dos"><legend>Pasos al día (sin contar el entreno)</legend>
        ${Object.entries(PASOS).map(([k, p]) => opcion('pasos', k, p.nombre, b.pasos)).join('')}
      </fieldset>
      <p class="ayuda">Si no lo sabes, mira la app Salud o Google Fit del móvil.</p>`,
    leer: (f, b) => {
      b.despertar = f.get('despertar') || '07:30';
      b.dormir = f.get('dormir') || '23:30';
      b.trabajo = f.get('trabajo') || '';
      b.trabajoInicio = f.get('trabajoInicio') || b.trabajoInicio;
      b.trabajoFin = f.get('trabajoFin') || b.trabajoFin;
      b.pasos = f.get('pasos') || 'normal';
    },
    validar: (b) => (!b.trabajo ? 'Dime qué tipo de trabajo tienes (o si no trabajas ahora).' : null),
  },
  {
    emoji: '🏋️',
    titulo: 'Tu entrenamiento',
    burbuja: 'Los días que entrenes comerás más (sobre todo hidratos) y pondré una comida antes y otra después del entreno.',
    html: (b) => `
      <fieldset class="opciones dos"><legend>¿Entrenas o haces deporte?</legend>
        ${opcion('entrena', 'si', 'Sí', b.entrena === true ? 'si' : b.entrena === false ? 'no' : '', '', '💪')}
        ${opcion('entrena', 'no', 'Ahora no', b.entrena === true ? 'si' : b.entrena === false ? 'no' : '', '', '🛋️')}
      </fieldset>
      <div class="solo-si" data-si="entrena=si">
        <fieldset class="chips-sel"><legend>¿Qué entrenas?</legend>
          ${Object.entries(DEPORTES).map(([k, d]) => chipCheck('deportes', k, d.nombre, b.deportes.includes(k))).join('')}
        </fieldset>
        <fieldset class="dias-sel"><legend>¿Qué días?</legend>
          ${DIAS.map(([n, l]) => `<label class="dia-check"><input type="checkbox" name="diasEntreno" value="${n}" ${b.diasEntreno.includes(n) ? 'checked' : ''}><span>${l}</span></label>`).join('')}
        </fieldset>
        <div class="fila-campos dos">
          ${campoHora('horaEntreno', '¿A qué hora sueles empezar?', b.horaEntreno)}
          <label class="campo"><span>Duración</span>
            <select name="duracionEntreno">${Object.entries(DURACIONES).map(([m, t]) => `<option value="${m}" ${Number(b.duracionEntreno) === Number(m) ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
        </div>
        <fieldset class="opciones tres"><legend>Intensidad habitual</legend>
          ${opcion('intensidad', 'suave', 'Suave', b.intensidad, 'Puedes hablar sin problema', '🙂')}
          ${opcion('intensidad', 'moderada', 'Moderada', b.intensidad, 'Sudas y te cuesta hablar', '😤')}
          ${opcion('intensidad', 'intensa', 'Intensa', b.intensidad, 'Acabas reventado', '🥵')}
        </fieldset>
        <label class="interruptor"><input type="checkbox" name="compite" ${b.compite ? 'checked' : ''}>
          <span><b>Compito o me preparo para una prueba</b><small>Carrera, torneo, culturismo, powerlifting…</small></span></label>
        <div class="solo-si" data-si="compite=on">
          <label class="campo"><span>Fecha de la próxima competición <small>(opcional)</small></span>
            <input type="date" name="fechaCompeticion" value="${esc(b.fechaCompeticion)}"></label>
          <label class="interruptor"><input type="checkbox" name="categoriaPeso" ${b.categoriaPeso ? 'checked' : ''}>
            <span><b>Tengo que dar un peso</b><small>Compito por categorías de peso</small></span></label>
        </div>
      </div>`,
    leer: (f, b) => {
      const e = f.get('entrena');
      b.entrena = e === 'si' ? true : e === 'no' ? false : null;
      b.deportes = f.getAll('deportes');
      b.diasEntreno = f.getAll('diasEntreno').map(Number);
      b.horaEntreno = f.get('horaEntreno') || b.horaEntreno;
      b.duracionEntreno = Number(f.get('duracionEntreno') || 60);
      b.intensidad = f.get('intensidad') || 'moderada';
      b.compite = f.get('compite') === 'on';
      b.fechaCompeticion = f.get('fechaCompeticion') || '';
      b.categoriaPeso = f.get('categoriaPeso') === 'on';
    },
    validar: (b) => {
      if (b.entrena === null) return 'Dime si entrenas o no.';
      if (b.entrena && !b.deportes.length) return 'Marca al menos un tipo de entreno.';
      if (b.entrena && !b.diasEntreno.length) return 'Marca qué días entrenas.';
    },
  },
  {
    emoji: '🎯',
    titulo: '¿Qué quieres conseguir?',
    burbuja: 'Ajustaré las calorías y, sobre todo, la proteína según tu objetivo.',
    html: (b) => `
      <fieldset class="opciones lista">
        ${opcion('objetivo', 'perder', 'Perder grasa', b.objetivo, 'Déficit calórico con proteína alta para conservar el músculo', '🔥')}
        ${opcion('objetivo', 'recomposicion', 'Recomposición', b.objetivo, 'Ligero déficit para perder grasa y ganar músculo a la vez (si entrenas fuerza)', '⚖️')}
        ${opcion('objetivo', 'mantener', 'Mantener mi peso', b.objetivo, 'Comer bien y rendir, sin cambiar el peso', '🎯')}
        ${opcion('objetivo', 'ganar', 'Ganar músculo', b.objetivo, 'Superávit controlado para ganar masa muscular', '💪')}
      </fieldset>
      <div class="solo-si" data-si="objetivo=perder|ganar">
        <fieldset class="opciones tres"><legend>Ritmo</legend>
          ${opcion('ritmo', 'suave', 'Suave', b.ritmo, '', '🐢')}${opcion('ritmo', 'moderado', 'Moderado', b.ritmo, '', '🚶')}${opcion('ritmo', 'rapido', 'Rápido', b.ritmo, '', '🐇')}
        </fieldset>
        <p class="ayuda">Suave = más llevadero. Rápido = más exigente (más hambre al perder, más grasa al ganar).</p>
      </div>
      ${campoNum('pesoObjetivo', 'Peso objetivo <small>(opcional)</small>', b.pesoObjetivo, 'kg', 35, 250, 0.1, false)}`,
    leer: (f, b) => {
      b.objetivo = f.get('objetivo') || '';
      b.ritmo = f.get('ritmo') || 'moderado';
      b.pesoObjetivo = f.get('pesoObjetivo') ? numero(f.get('pesoObjetivo')) : '';
    },
    validar: (b) => (!b.objetivo ? 'Elige un objetivo.' : null),
  },
  {
    emoji: '🩺',
    titulo: 'Salud y hábitos',
    burbuja: 'Así adapto los alimentos y te digo qué suplementos tienen sentido para ti. Esta información se queda solo en tu dispositivo.',
    html: (b) => `
      <fieldset class="chips-sel"><legend>¿Tienes alguna de estas situaciones?</legend>
        ${Object.entries(CONDICIONES).map(([k, c]) => chipCheck('condiciones', k, c.nombre, b.condiciones.includes(k))).join('')}
      </fieldset>
      <label class="interruptor"><input type="checkbox" name="medicacion" ${b.medicacion ? 'checked' : ''}>
        <span><b>Tomo medicación de forma habitual</b><small>Para avisarte de posibles interacciones con suplementos</small></span></label>
      <fieldset class="opciones tres"><legend>Nivel de estrés</legend>
        ${opcion('estres', 'bajo', ESTRES.bajo, b.estres, '', '😌')}${opcion('estres', 'medio', ESTRES.medio, b.estres, '', '😐')}${opcion('estres', 'alto', ESTRES.alto, b.estres, '', '😵')}
      </fieldset>
      <fieldset class="opciones dos"><legend>¿Cuánto duermes?</legend>
        ${Object.entries(SUENO).map(([k, v]) => opcion('sueno', k, v, b.sueno)).join('')}
      </fieldset>
      <div class="fila-campos dos">
        <label class="campo"><span>Cafés al día</span>
          <select name="cafes">${[0, 1, 2, 3, 4, 5, 6].map((n) => `<option value="${n}" ${Number(b.cafes) === n ? 'selected' : ''}>${n === 6 ? '6 o más' : n}</option>`).join('')}</select></label>
        <label class="campo"><span>Alcohol</span>
          <select name="alcohol">${Object.entries(ALCOHOL).map(([k, v]) => `<option value="${k}" ${b.alcohol === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
      </div>`,
    leer: (f, b) => {
      b.condiciones = f.getAll('condiciones');
      b.medicacion = f.get('medicacion') === 'on';
      b.estres = f.get('estres') || 'medio';
      b.sueno = f.get('sueno') || 'bien';
      b.cafes = Number(f.get('cafes') || 0);
      b.alcohol = f.get('alcohol') || 'ocasional';
    },
  },
  {
    emoji: '🍽️',
    titulo: '¿Cómo te gusta comer?',
    burbuja: 'Así adapto el menú a tu día a día.',
    html: (b) => `
      <fieldset class="opciones tres"><legend>Comidas al día</legend>
        ${opcion('comidas', '3', '3', String(b.comidas), 'Desayuno, comida y cena')}
        ${opcion('comidas', '4', '4', String(b.comidas), '+ merienda')}
        ${opcion('comidas', '5', '5', String(b.comidas), '+ media mañana')}
      </fieldset>
      <label class="campo"><span>Tipo de alimentación</span>
        <select name="dieta">${Object.entries(DIETAS).map(([k, v]) => `<option value="${k}" ${b.dieta === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
      <fieldset class="chips-sel"><legend>Alergias o intolerancias</legend>
        ${Object.entries(ALERGENOS).map(([k, v]) => chipCheck('alergias', k, v, b.alergias.includes(k))).join('')}
      </fieldset>
      <fieldset class="opciones dos"><legend>¿Qué tomas en el café, los cereales o el porridge?</legend>
        ${opcion('leche', 'vaca', 'Leche de vaca', b.leche || 'vaca')}${opcion('leche', 'avena', 'Bebida de avena', b.leche)}
        ${opcion('leche', 'almendra', 'Bebida de almendras', b.leche)}${opcion('leche', 'soja', 'Bebida de soja', b.leche, 'La que más proteína tiene')}
      </fieldset>
      <fieldset class="chips-sel"><legend>¿Con qué cocinas? Te explico cada receta con lo que tengas</legend>
        ${[['microondas', 'Microondas'], ['airfryer', 'Air fryer'], ['plancha', 'Plancha o sartén'], ['horno', 'Horno'], ['olla', 'Olla (solo pasta y arroz)']].map(([k, v]) => chipCheck('aparatos', k, v, (b.aparatos || []).includes(k))).join('')}
      </fieldset>
      <fieldset class="opciones tres"><legend>Tiempo máximo para cocinar</legend>
        ${opcion('tiempoMax', '20', '20 min', String(b.tiempoMax), '', '⚡')}${opcion('tiempoMax', '30', '30 min', String(b.tiempoMax), '', '⏱️')}${opcion('tiempoMax', '0', 'Sin límite', String(b.tiempoMax), '', '👨‍🍳')}
      </fieldset>
      <label class="interruptor"><input type="checkbox" name="sobras" ${b.sobras ? 'checked' : ''}>
        <span><b>Cocinar la comida para dos días</b><small>Cocinas una vez y te llevas táper al día siguiente</small></span></label>
      <label class="interruptor"><input type="checkbox" name="whey" ${b.whey ? 'checked' : ''}>
        <span><b>Tengo proteína en polvo</b><small>Si un día vas corto de proteína, te la propongo para cerrar el día</small></span></label>
      <label class="interruptor"><input type="checkbox" name="presupuesto" ${b.presupuesto === 'ajustado' ? 'checked' : ''}>
        <span><b>Priorizar recetas baratas</b><small>Menos salmón y ternera, más pollo, huevos y legumbres</small></span></label>`,
    leer: (f, b) => {
      b.comidas = Number(f.get('comidas'));
      b.dieta = f.get('dieta');
      b.alergias = f.getAll('alergias');
      b.leche = f.get('leche') || 'vaca';
      b.aparatos = f.getAll('aparatos');
      b.tiempoMax = Number(f.get('tiempoMax') || 0);
      b.sobras = f.get('sobras') === 'on';
      b.presupuesto = f.get('presupuesto') === 'on' ? 'ajustado' : 'normal';
      b.whey = f.get('whey') === 'on';
    },
  },
  {
    emoji: '🙅',
    titulo: '¿Hay algo que no te guste?',
    burbuja: 'Toca lo que no quieras ver en tus menús. Lo podrás cambiar cuando quieras.',
    html: (b) => {
      const grupos = {};
      for (const [id, a] of Object.entries(ALIMENTOS)) if (!a.catalogo || b.noMeGusta.includes(id)) (grupos[a.grupo] ||= []).push([id, a]);
      return Object.entries(GRUPOS_NOMBRE)
        .filter(([g]) => grupos[g])
        .map(([g, nombre]) => `<fieldset class="chips-sel"><legend>${nombre}</legend>
          ${grupos[g].map(([id, a]) => chipCheck('noMeGusta', id, a.nombre, b.noMeGusta.includes(id), 'no')).join('')}</fieldset>`)
        .join('');
    },
    leer: (f, b) => { b.noMeGusta = f.getAll('noMeGusta'); },
  },
  {
    emoji: '✅',
    titulo: 'Tu plan',
    burbuja: null,
    html: (b) => resumenObjetivos(b, { conHorario: true }),
    leer: () => {},
  },
];

function opcion(nombre, valor, etiqueta, actual, desc = '', emoji = '') {
  return `<label class="opcion"><input type="radio" name="${nombre}" value="${valor}" ${String(actual) === String(valor) ? 'checked' : ''}>
    <span>${emoji ? `<i class="op-emoji" aria-hidden="true">${iconoSVG(emoji, 24)}</i>` : ''}<b>${esc(etiqueta)}</b>${desc ? `<small>${esc(desc)}</small>` : ''}</span></label>`;
}

function chipCheck(nombre, valor, etiqueta, marcado, estilo = '') {
  return `<label class="chip-check ${estilo}"><input type="checkbox" name="${nombre}" value="${valor}" ${marcado ? 'checked' : ''}><span>${esc(etiqueta)}</span></label>`;
}

function campoNum(nombre, etiqueta, valor, unidad, min, max, paso = 1, requerido = true) {
  return `<label class="campo"><span>${etiqueta}</span>
    <input name="${nombre}" type="number" inputmode="${paso < 1 ? 'decimal' : 'numeric'}" step="${paso}" min="${min}" max="${max}" value="${esc(valor)}" ${requerido ? 'required' : ''}><small>${unidad}</small></label>`;
}

function campoHora(nombre, etiqueta, valor) {
  return `<label class="campo"><span>${etiqueta}</span><input type="time" name="${nombre}" value="${esc(valor)}" step="900"></label>`;
}

/** Resumen de objetivos (y opcionalmente horario tipo y suplementos) de un perfil. */
export function resumenObjetivos(perfil, { conHorario = false } = {}) {
  const o = calcularObjetivos(perfil);
  const obj = OBJETIVOS[perfil.objetivo];
  const cambio = o.cambioSemanalKg;
  let semanas = '';
  if (perfil.pesoObjetivo && cambio && Math.sign(perfil.pesoObjetivo - perfil.peso) === Math.sign(cambio)) {
    const n = Math.ceil(Math.abs(perfil.pesoObjetivo - perfil.peso) / Math.abs(cambio));
    semanas = ` Llegarías a ${num(perfil.pesoObjetivo, 1)} kg en unas <b>${n} semanas</b>.`;
  }
  const tarjetaDia = (t, titulo, emoji, clase) => `<div class="dia-obj ${clase}">
      <div class="dia-obj-cab">${iconoSVG(emoji, 18)} ${titulo}</div>
      <div class="dia-obj-kcal">${t.kcal}<small> kcal</small></div>
      <div class="dia-obj-macros"><span class="t-p">P ${t.proteina}</span><span class="t-c">H ${t.hidratos}</span><span class="t-g">G ${t.grasa}</span></div>
    </div>`;
  const entrena = perfil.entrena && o.diasEntreno;

  let horario = '';
  if (conHorario) {
    const h = horarioDia(perfil, !!entrena);
    horario = `<h3>${entrena ? 'Tu horario un día de entreno' : 'Tu horario de comidas'}</h3>
      <ul class="horario-mini">
        ${h.franjas.map((f) => `<li><b>${f.horaTexto}</b> ${esc(f.nombre)}${f.etiqueta ? ` <span class="etq etq-${f.etiqueta}">${f.etiqueta === 'pre' ? 'pre-entreno' : 'post-entreno'}</span>` : ''}</li>`)
          .concat(h.entreno ? [`<li class="hm-entreno"><b>${h.entreno.inicio}</b> Entreno hasta las ${h.entreno.fin}</li>`] : [])
          .sort((a, b) => a.match(/<b>(.*?)<\/b>/)[1].localeCompare(b.match(/<b>(.*?)<\/b>/)[1]))
          .join('')}
      </ul>`;
    const recs = recomendaciones(perfil, o);
    if (recs.suplementos.length) {
      horario += `<h3>Suplementos que tienen sentido para ti</h3>
        <div class="chips-lista">${recs.suplementos.map((s) => `<span class="chip-sup">${iconoSVG(s.emoji, 15)} ${esc(s.nombre)}</span>`).join('')}</div>
        <p class="pie-nota">Tienes las dosis, el momento y las precauciones en <b>Mi plan</b>.</p>`;
    }
    if (recs.avisos.length) horario += recs.avisos.map((a) => `<p class="alerta">${esc(a.texto)}</p>`).join('');
  }

  return `
    <div class="burbuja">${perfil.nombre ? `${esc(perfil.nombre)}, esto` : 'Esto'} es lo que he calculado para ti. Objetivo: <b>${obj.nombre.toLowerCase()}</b>.</div>
    <div class="tarjeta resumen-obj">
      ${entrena
        ? `<div class="dias-obj">${tarjetaDia(o.porTipo.entreno, 'Día de entreno', '💪', 'entreno')}${tarjetaDia(o.porTipo.descanso, 'Día de descanso', '😌', 'descanso')}</div>
           <p class="pie-nota">Media semanal: ${o.kcal} kcal · ${o.gKg} g de proteína por kg</p>`
        : `<div class="gran-cifra">${o.kcal}<small> kcal/día</small></div>
           <div class="macros-obj">
             <div class="mo mo-p"><b>${o.proteina} g</b><span>Proteína</span><small>${num(o.gKg, 1)} g/kg</small></div>
             <div class="mo mo-c"><b>${o.hidratos} g</b><span>Hidratos</span><small>${Math.round((o.hidratos * 400) / o.kcal)} %</small></div>
             <div class="mo mo-g"><b>${o.grasa} g</b><span>Grasa</span><small>${Math.round((o.grasa * 900) / o.kcal)} %</small></div>
           </div>`}
    </div>
    <dl class="explicacion">
      <dt>Metabolismo basal</dt><dd>${o.tmb} kcal — lo que gastas en reposo.</dd>
      <dt>Gasto medio</dt><dd>${o.get} kcal al día${o.kcalSesion ? `, de ellas ~${o.kcalSesion} kcal por sesión de entreno` : ''}.</dd>
      <dt>Ritmo esperado</dt><dd>${cambio ? `<b>${cambio > 0 ? '+' : ''}${num(cambio, 2)} kg/semana</b>.${semanas}` : 'Sin cambio de peso.'}</dd>
      <dt>IMC</dt><dd>${num(o.imc, 1)}</dd>
      <dt>Agua y fibra</dt><dd>~${num(o.agua, 1)} l de agua${entrena ? ` (${num(o.aguaEntreno, 1)} l al entrenar)` : ''} y al menos ${o.fibra} g de fibra.</dd>
    </dl>
    ${o.limitado ? '<p class="alerta">He limitado las calorías a un mínimo seguro. Para déficits mayores consulta con un profesional sanitario.</p>' : ''}
    ${horario}
    <p class="pie-nota">Son estimaciones: la báscula dirá si hay que ajustar. Registra tu peso en <b>Progreso</b> y te propondré cambios cada dos semanas.</p>`;
}

export function vistaCuestionario() {
  const p = PASOS_CUESTIONARIO[paso];
  const total = PASOS_CUESTIONARIO.length;
  return `<section class="cuestionario">
    <div class="cuest-cab">
      <div class="progreso-pasos" aria-label="Paso ${paso + 1} de ${total}"><div style="width:${((paso + 1) / total) * 100}%"></div></div>
      <span class="paso-num">${paso + 1}/${total}</span>
    </div>
    <div class="cuest-emoji" aria-hidden="true">${iconoSVG(p.emoji, 30, 1.6)}</div>
    <h1>${esc(p.titulo)}</h1>
    ${p.burbuja ? `<div class="burbuja">${esc(p.burbuja)}</div>` : ''}
    <form id="form-paso" novalidate>
      ${p.html(borrador)}
      <p class="error-form" id="error-paso" role="alert"></p>
      <div class="botones-paso">
        ${paso > (editando ? 1 : 0) ? '<button type="button" class="boton boton-sec" data-accion="paso-atras">Atrás</button>' : editando ? '<button type="button" class="boton boton-sec" data-accion="cancelar-edicion">Cancelar</button>' : '<span></span>'}
        <button type="submit" class="boton">${paso === total - 1 ? (editando ? 'Guardar cambios' : 'Crear mi menú') : 'Siguiente'}</button>
      </div>
    </form>
  </section>`;
}

/** Devuelve el perfil completo si se ha terminado, o indica avance/error. */
export function enviarPaso(form) {
  const p = PASOS_CUESTIONARIO[paso];
  p.leer(new FormData(form), borrador);
  const error = p.validar?.(borrador);
  if (error) {
    form.querySelector('#error-paso').textContent = error;
    return { error };
  }
  if (paso < PASOS_CUESTIONARIO.length - 1) {
    paso++;
    return { avanzar: true };
  }
  const perfil = { ...borrador };
  delete perfil.actividad; // el cuestionario nuevo sustituye al factor de actividad antiguo
  return { perfil, editando };
}

export function pasoAtras() {
  if (paso > 0) paso--;
}

// Muestra u oculta bloques según otras respuestas: data-si="campo=valor1|valor2"
export function actualizarVisibles(form) {
  if (!form) return;
  for (const el of form.querySelectorAll('[data-si]')) {
    const [campo, valores] = el.dataset.si.split('=');
    const inputs = [...form.elements].filter((i) => i.name === campo);
    let valor = '';
    for (const i of inputs) {
      if (i.type === 'radio' || i.type === 'checkbox') { if (i.checked) valor = i.value; } else valor = i.value;
    }
    el.hidden = !valores.split('|').includes(valor);
  }
}
