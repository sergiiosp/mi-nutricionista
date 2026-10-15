// Cuestionario inicial (y edición del perfil): la "primera consulta" con la nutricionista.

import { ALIMENTOS, ALERGENOS } from '../../data/alimentos.js';
import { ACTIVIDAD, OBJETIVOS, DIETAS, calcularObjetivos } from '../nutricion.js';
import { esc, num } from '../ui.js';

const PERFIL_BASE = {
  nombre: '', sexo: '', edad: '', altura: '', peso: '', actividad: 'ligero', objetivo: '', ritmo: 'moderado',
  pesoObjetivo: '', comidas: 4, dieta: 'omnivora', alergias: [], noMeGusta: [], tiempoMax: 0, sobras: false,
  presupuesto: 'normal', ajusteKcal: 0,
};

let paso = 0;
let borrador = null;
let editando = false;

export function iniciarCuestionario(perfilActual) {
  editando = !!perfilActual;
  borrador = { ...PERFIL_BASE, ...(perfilActual || {}) };
  paso = editando ? 1 : 0;
}

const GRUPOS_NOMBRE = { proteina: 'Carne, pescado y huevos', lacteo: 'Lácteos', hidrato: 'Cereales, legumbres y tubérculos', fruta: 'Fruta', verdura: 'Verdura', grasa: 'Grasas y frutos secos', otros: 'Otros' };

const PASOS = [
  {
    titulo: '¡Hola! Soy tu nutricionista',
    burbuja: 'Te haré unas preguntas rápidas (2 minutos) para calcular lo que necesitas y prepararte menús semanales con productos de Mercadona, con las cantidades ajustadas a ti.',
    html: (b) => `
      <label class="campo"><span>¿Cómo te llamas?</span>
        <input name="nombre" value="${esc(b.nombre)}" placeholder="Tu nombre" autocomplete="given-name" maxlength="30"></label>`,
    leer: (f, b) => { b.nombre = f.get('nombre').trim(); },
  },
  {
    titulo: 'Cuéntame sobre ti',
    burbuja: 'Con estos datos calculo tu metabolismo basal (fórmula de Mifflin-St Jeor, la más fiable en adultos).',
    html: (b) => `
      <fieldset class="opciones dos"><legend>Sexo</legend>
        ${opcion('sexo', 'h', 'Hombre', b.sexo)}${opcion('sexo', 'm', 'Mujer', b.sexo)}
      </fieldset>
      <div class="fila-campos">
        <label class="campo"><span>Edad</span><input name="edad" type="number" inputmode="numeric" min="16" max="90" value="${esc(b.edad)}" required><small>años</small></label>
        <label class="campo"><span>Altura</span><input name="altura" type="number" inputmode="numeric" min="130" max="220" value="${esc(b.altura)}" required><small>cm</small></label>
        <label class="campo"><span>Peso</span><input name="peso" type="number" inputmode="decimal" step="0.1" min="35" max="250" value="${esc(b.peso)}" required><small>kg</small></label>
      </div>`,
    leer: (f, b) => {
      b.sexo = f.get('sexo') || '';
      b.edad = Number(f.get('edad'));
      b.altura = Number(f.get('altura'));
      b.peso = Number(String(f.get('peso')).replace(',', '.'));
    },
    validar: (b) => {
      if (!b.sexo) return 'Elige una opción de sexo (lo necesito para la fórmula del metabolismo).';
      if (!(b.edad >= 16 && b.edad <= 90)) return 'La edad debe estar entre 16 y 90 años.';
      if (!(b.altura >= 130 && b.altura <= 220)) return 'Revisa la altura (en centímetros).';
      if (!(b.peso >= 35 && b.peso <= 250)) return 'Revisa el peso (en kilos).';
    },
  },
  {
    titulo: '¿Cuánto te mueves?',
    burbuja: 'Piensa en una semana normal, sumando trabajo y ejercicio. Si dudas entre dos, elige la más baja: es habitual sobreestimarlo.',
    html: (b) => `<fieldset class="opciones lista">${Object.entries(ACTIVIDAD)
      .map(([k, a]) => opcion('actividad', k, a.nombre, b.actividad, a.desc))
      .join('')}</fieldset>`,
    leer: (f, b) => { b.actividad = f.get('actividad'); },
  },
  {
    titulo: '¿Qué quieres conseguir?',
    burbuja: 'Ajustaré las calorías y, sobre todo, la proteína según tu objetivo.',
    html: (b) => `
      <fieldset class="opciones lista">
        ${opcion('objetivo', 'perder', 'Perder grasa', b.objetivo, 'Déficit calórico con proteína alta para conservar el músculo')}
        ${opcion('objetivo', 'recomposicion', 'Recomposición', b.objetivo, 'Ligero déficit para perder grasa y ganar músculo a la vez (si entrenas fuerza)')}
        ${opcion('objetivo', 'mantener', 'Mantener mi peso', b.objetivo, 'Comer bien y equilibrado sin cambiar el peso')}
        ${opcion('objetivo', 'ganar', 'Ganar músculo', b.objetivo, 'Superávit controlado para ganar masa muscular')}
      </fieldset>
      <div class="solo-si" data-si="perder ganar">
        <fieldset class="opciones tres"><legend>Ritmo</legend>
          ${opcion('ritmo', 'suave', 'Suave', b.ritmo)}${opcion('ritmo', 'moderado', 'Moderado', b.ritmo)}${opcion('ritmo', 'rapido', 'Rápido', b.ritmo)}
        </fieldset>
        <p class="ayuda">Suave = más llevadero y fácil de mantener. Rápido = más exigente (más hambre al perder, más grasa al ganar).</p>
      </div>
      <label class="campo"><span>Peso objetivo <small>(opcional)</small></span>
        <input name="pesoObjetivo" type="number" inputmode="decimal" step="0.1" min="35" max="250" value="${esc(b.pesoObjetivo)}"><small>kg</small></label>`,
    leer: (f, b) => {
      b.objetivo = f.get('objetivo') || '';
      b.ritmo = f.get('ritmo') || 'moderado';
      b.pesoObjetivo = f.get('pesoObjetivo') ? Number(String(f.get('pesoObjetivo')).replace(',', '.')) : '';
    },
    validar: (b) => (!b.objetivo ? 'Elige un objetivo.' : null),
  },
  {
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
      <fieldset class="opciones tres"><legend>Tiempo máximo para cocinar</legend>
        ${opcion('tiempoMax', '20', '20 min', String(b.tiempoMax))}${opcion('tiempoMax', '30', '30 min', String(b.tiempoMax))}${opcion('tiempoMax', '0', 'Sin límite', String(b.tiempoMax))}
      </fieldset>
      <label class="interruptor"><input type="checkbox" name="sobras" ${b.sobras ? 'checked' : ''}>
        <span><b>Cocinar la comida para dos días</b><small>Haces una vez y te llevas táper al día siguiente</small></span></label>
      <label class="interruptor"><input type="checkbox" name="presupuesto" ${b.presupuesto === 'ajustado' ? 'checked' : ''}>
        <span><b>Priorizar recetas baratas</b><small>Menos salmón y ternera, más pollo, huevos y legumbres</small></span></label>`,
    leer: (f, b) => {
      b.comidas = Number(f.get('comidas'));
      b.dieta = f.get('dieta');
      b.alergias = f.getAll('alergias');
      b.tiempoMax = Number(f.get('tiempoMax') || 0);
      b.sobras = f.get('sobras') === 'on';
      b.presupuesto = f.get('presupuesto') === 'on' ? 'ajustado' : 'normal';
    },
  },
  {
    titulo: '¿Hay algo que no te guste?',
    burbuja: 'Marca lo que no quieras ver en tus menús. Lo podrás cambiar cuando quieras desde tu perfil.',
    html: (b) => {
      const grupos = {};
      for (const [id, a] of Object.entries(ALIMENTOS)) (grupos[a.grupo] ||= []).push([id, a]);
      return Object.entries(GRUPOS_NOMBRE)
        .filter(([g]) => grupos[g])
        .map(([g, nombre]) => `<fieldset class="chips-sel"><legend>${nombre}</legend>
          ${grupos[g].map(([id, a]) => chipCheck('noMeGusta', id, a.nombre, b.noMeGusta.includes(id), 'no')).join('')}</fieldset>`)
        .join('');
    },
    leer: (f, b) => { b.noMeGusta = f.getAll('noMeGusta'); },
  },
  {
    titulo: 'Tu plan',
    burbuja: null,
    html: (b) => resumenObjetivos(b),
    leer: () => {},
  },
];

function opcion(nombre, valor, etiqueta, actual, desc = '') {
  return `<label class="opcion"><input type="radio" name="${nombre}" value="${valor}" ${String(actual) === String(valor) ? 'checked' : ''}>
    <span><b>${esc(etiqueta)}</b>${desc ? `<small>${esc(desc)}</small>` : ''}</span></label>`;
}

function chipCheck(nombre, valor, etiqueta, marcado, estilo = '') {
  return `<label class="chip-check ${estilo}"><input type="checkbox" name="${nombre}" value="${valor}" ${marcado ? 'checked' : ''}><span>${esc(etiqueta)}</span></label>`;
}

export function resumenObjetivos(perfil) {
  const o = calcularObjetivos(perfil);
  const obj = OBJETIVOS[perfil.objetivo];
  const cambio = o.cambioSemanalKg;
  const kgKg = (x) => num(x / perfil.peso, 1);
  let semanas = '';
  if (perfil.pesoObjetivo && cambio && Math.sign(perfil.pesoObjetivo - perfil.peso) === Math.sign(cambio)) {
    const n = Math.ceil(Math.abs(perfil.pesoObjetivo - perfil.peso) / Math.abs(cambio));
    semanas = ` Al ritmo previsto llegarías a ${num(perfil.pesoObjetivo, 1)} kg en unas <b>${n} semanas</b>.`;
  }
  return `
    <div class="burbuja">${perfil.nombre ? `${esc(perfil.nombre)}, ` : ''}esto es lo que he calculado para ti. Objetivo: <b>${obj.nombre.toLowerCase()}</b>.</div>
    <div class="tarjeta resumen-obj">
      <div class="gran-cifra">${o.kcal}<small> kcal/día</small></div>
      <div class="macros-obj">
        <div class="mo mo-p"><b>${o.proteina} g</b><span>Proteína</span><small>${kgKg(o.proteina)} g/kg</small></div>
        <div class="mo mo-c"><b>${o.hidratos} g</b><span>Hidratos</span><small>${Math.round((o.hidratos * 4 * 100) / o.kcal)} %</small></div>
        <div class="mo mo-g"><b>${o.grasa} g</b><span>Grasa</span><small>${Math.round((o.grasa * 9 * 100) / o.kcal)} %</small></div>
      </div>
    </div>
    <dl class="explicacion">
      <dt>Metabolismo basal</dt><dd>${o.tmb} kcal — lo que gastas en reposo.</dd>
      <dt>Gasto diario estimado</dt><dd>${o.get} kcal — sumando tu actividad (${ACTIVIDAD[perfil.actividad].nombre.toLowerCase()}).</dd>
      <dt>Tu objetivo</dt><dd>${o.kcal} kcal (${o.kcal >= o.get ? '+' : ''}${o.kcal - o.get} kcal/día). ${cambio ? `Cambio esperado: <b>${cambio > 0 ? '+' : ''}${num(cambio, 2)} kg/semana</b>.` : 'Sin cambio de peso esperado.'}${semanas}</dd>
      <dt>IMC</dt><dd>${num(o.imc, 1)}</dd>
      <dt>Fibra y agua</dt><dd>Al menos ${o.fibra} g de fibra y unos ${num(o.agua, 1)} l de agua al día.</dd>
    </dl>
    ${o.limitado ? '<p class="alerta">He limitado las calorías a un mínimo seguro. Para déficits mayores consulta con un profesional sanitario.</p>' : ''}
    <p class="pie-nota">Son estimaciones: la báscula dirá si hay que ajustar. Registra tu peso en <b>Progreso</b> y te propondré cambios cada dos semanas.</p>`;
}

export function vistaCuestionario() {
  const p = PASOS[paso];
  const total = PASOS.length;
  return `<section class="cuestionario">
    <div class="progreso-pasos" aria-label="Paso ${paso + 1} de ${total}"><div style="width:${((paso + 1) / total) * 100}%"></div></div>
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

/** Devuelve el perfil completo si se ha terminado, o null si se avanza de paso. */
export function enviarPaso(form) {
  const p = PASOS[paso];
  p.leer(new FormData(form), borrador);
  const error = p.validar?.(borrador);
  if (error) {
    form.querySelector('#error-paso').textContent = error;
    return { error };
  }
  if (paso < PASOS.length - 1) {
    paso++;
    return { avanzar: true };
  }
  return { perfil: { ...borrador }, editando };
}

export function pasoAtras() {
  if (paso > 0) paso--;
}

// Muestra el ritmo solo para objetivos que lo usan
export function actualizarVisibles(form) {
  const obj = form.querySelector('input[name="objetivo"]:checked')?.value;
  for (const el of form.querySelectorAll('.solo-si')) el.hidden = !el.dataset.si.split(' ').includes(obj);
}
