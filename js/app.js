// Punto de entrada: navegación, acciones de la interfaz y persistencia.

import { estado, guardar, reiniciar, exportar, importar } from './estado.js';
import { calcularObjetivos, macrosComida } from './nutricion.js';
import { generarPlan, alternativas, sustituir, reescalarPlan, recetaPorId, hoyISO, REPARTOS } from './planificador.js';
import { textoCompartir } from './compra.js';
import { $, $$, esc, icono, abrirModal, cerrarModal, aviso, chipsMacros, detalleReceta, euros } from './ui.js';
import { iniciarCuestionario, vistaCuestionario, enviarPaso, pasoAtras, actualizarVisibles } from './vistas/bienvenida.js';
import {
  vistaHoy, vistaSemana, vistaCompra, vistaRecetas, vistaProgreso, vistaPerfil,
  seleccionarDia, cambiarFiltroRecetas, modalReceta, datosCompra, objetivos,
} from './vistas/principal.js';

const VISTAS = { hoy: vistaHoy, semana: vistaSemana, compra: vistaCompra, recetas: vistaRecetas, progreso: vistaProgreso, perfil: vistaPerfil };
let enCuestionario = false;
let rutaAnterior = null;

const ruta = () => {
  const r = location.hash.replace('#', '');
  return VISTAS[r] ? r : 'hoy';
};

function render() {
  const main = $('#app');
  const nav = $('#nav');
  if (!estado.perfil && !enCuestionario) {
    iniciarCuestionario(null);
    enCuestionario = true;
  }
  if (enCuestionario) {
    main.innerHTML = vistaCuestionario();
    nav.hidden = true;
    $('#boton-perfil').hidden = true;
    const form = $('#form-paso');
    actualizarVisibles(form);
    window.scrollTo(0, 0);
    return;
  }
  nav.hidden = false;
  $('#boton-perfil').hidden = false;
  const r = ruta();
  main.innerHTML = VISTAS[r]();
  for (const a of $$('#nav a')) a.classList.toggle('activo', a.dataset.ruta === r);
  if (r !== rutaAnterior) window.scrollTo(0, 0);
  rutaAnterior = r;
}

function guardarYRender(mensaje) {
  guardar();
  render();
  if (mensaje) aviso(mensaje);
}

// ── Plan ───────────────────────────────────────────────────────────────────

function crearPlan(inicio = hoyISO()) {
  estado.plan = generarPlan(estado.perfil, objetivos(), { inicio, semilla: Math.floor(Math.random() * 1e9) });
  estado.compra.marcados = {};
  seleccionarDia(null);
}

let alternativasActuales = [];

function abrirCambio(clave) {
  const [d, franja] = clave.split('|');
  const plan = estado.plan;
  alternativasActuales = alternativas(plan, Number(d), franja, estado.perfil, objetivos()).slice(0, 8);
  const actual = plan.dias[d].comidas.find((c) => c.franja === franja);
  abrirModal(`<h2>Cambiar plato</h2>
    <p class="pie-nota">Ahora: <b>${esc(recetaPorId[actual.recetaId].nombre)}</b>. Estas opciones ya vienen ajustadas a tus macros:</p>
    <ul class="lista-alternativas">${alternativasActuales.map((alt, i) => `<li>
      <button class="tarjeta alternativa" data-accion="elegir-alternativa" data-indice="${i}" data-clave="${clave}">
        <b>${esc(recetaPorId[alt.comida.recetaId].nombre)}</b>
        <span class="meta">${recetaPorId[alt.comida.recetaId].tiempo} min${alt.usos ? ` · ya está ${alt.usos}× esta semana` : ''}</span>
        ${chipsMacros(alt.macros)}
      </button></li>`).join('') || '<li>No hay alternativas con tus filtros.</li>'}</ul>`);
}

function verComida(clave) {
  const [d, franja] = clave.split('|');
  const comida = estado.plan.dias[d].comidas.find((c) => c.franja === franja);
  const nombreFranja = (REPARTOS[estado.plan.comidasDia] || []).find((f) => f.id === franja)?.nombre || franja;
  abrirModal(detalleReceta(recetaPorId[comida.recetaId], comida.ingredientes, { titulo: nombreFranja })
    + `<div class="acciones-fila"><button class="boton boton-sec" data-accion="cambiar-comida" data-clave="${clave}">${icono('cambiar')} Cambiar este plato</button></div>`);
}

// Al cambiar peso u objetivos, las mismas recetas se reajustan a las nuevas cantidades
function reajustarPlanSiCambia(kcalAntes, mensaje) {
  const o = objetivos();
  if (estado.plan && Math.abs(o.kcal - kcalAntes) >= 30) {
    reescalarPlan(estado.plan, o);
    return mensaje || `Raciones actualizadas a ${o.kcal} kcal/día`;
  }
  return null;
}

// ── Acciones ───────────────────────────────────────────────────────────────

const acciones = {
  'cerrar-modal': () => cerrarModal(),
  'nuevo-plan': () => {
    if (estado.plan && estado.plan.dias.at(-1).fecha >= hoyISO() && !confirm('Se sustituirá tu menú actual por uno nuevo desde hoy. ¿Seguimos?')) return;
    crearPlan();
    location.hash = '#hoy';
    guardarYRender('¡Menú nuevo listo! Revisa la lista de la compra.');
  },
  'regenerar-plan': () => {
    if (!confirm('Se generará otro menú para las mismas fechas. ¿Seguimos?')) return;
    crearPlan(estado.plan.inicio);
    guardarYRender('Menú regenerado');
  },
  'ver-dia': (el) => { seleccionarDia(Number(el.dataset.dia)); render(); },
  'marcar-hecha': (el) => {
    const k = `${el.dataset.fecha}|${el.dataset.franja}`;
    if (estado.hechas[k]) delete estado.hechas[k];
    else estado.hechas[k] = true;
    guardarYRender();
  },
  'ver-comida': (el) => verComida(el.dataset.clave),
  'cambiar-comida': (el) => abrirCambio(el.dataset.clave),
  'elegir-alternativa': (el) => {
    const [d, franja] = el.dataset.clave.split('|');
    const alt = alternativasActuales[Number(el.dataset.indice)];
    sustituir(estado.plan, Number(d), franja, alt.comida);
    cerrarModal();
    guardarYRender(`Cambiado por ${recetaPorId[alt.comida.recetaId].nombre}`);
  },
  'copiar-compra': async () => {
    const texto = textoCompartir(datosCompra());
    try {
      if (navigator.share && matchMedia('(pointer: coarse)').matches) await navigator.share({ text: texto });
      else { await navigator.clipboard.writeText(texto); aviso('Lista copiada: pégala en WhatsApp o en Notas'); }
    } catch {
      abrirModal(`<h2>Lista de la compra</h2><textarea class="texto-copiar" readonly>${esc(texto)}</textarea>`);
    }
  },
  'desmarcar-compra': () => { estado.compra.marcados = {}; guardarYRender(); },
  'filtro-recetas': (el) => { cambiarFiltroRecetas({ tipo: el.dataset.tipo }); render(); },
  'ver-receta': (el) => abrirModal(modalReceta(el.dataset.id)),
  'aplicar-ajuste': (el) => {
    const antes = objetivos().kcal;
    estado.perfil.ajusteKcal = (estado.perfil.ajusteKcal || 0) + Number(el.dataset.ajuste);
    guardarYRender(reajustarPlanSiCambia(antes) || 'Ajuste aplicado');
  },
  'quitar-ajuste': () => {
    const antes = objetivos().kcal;
    estado.perfil.ajusteKcal = 0;
    guardarYRender(reajustarPlanSiCambia(antes) || 'Ajuste eliminado');
  },
  'borrar-peso': (el) => {
    if (!confirm('¿Borrar este registro?')) return;
    estado.pesos = estado.pesos.filter((p) => p.fecha !== el.dataset.fecha);
    guardarYRender();
  },
  'editar-perfil': () => { iniciarCuestionario(estado.perfil); enCuestionario = true; render(); },
  'cancelar-edicion': () => { enCuestionario = false; render(); },
  'paso-atras': () => { pasoAtras(); render(); },
  exportar: () => {
    const blob = new Blob([exportar()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `mi-nutricionista-${hoyISO()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  },
  reiniciar: () => {
    if (!confirm('Se borrarán tu perfil, menús y registros de peso de este dispositivo. ¿Seguro?')) return;
    reiniciar();
    enCuestionario = false;
    location.hash = '#hoy';
    render();
  },
};

const accionesCambio = {
  'marcar-compra': (el) => {
    if (el.checked) estado.compra.marcados[el.dataset.id] = true;
    else delete estado.compra.marcados[el.dataset.id];
    guardar();
    el.closest('.item-compra').classList.toggle('marcado', el.checked);
    render();
  },
  'solo-restantes': (el) => { estado.compra.soloRestantes = el.checked; guardarYRender(); },
  'recetas-todas': (el) => { cambiarFiltroRecetas({ todas: el.checked }); render(); },
  importar: async (el) => {
    const archivo = el.files[0];
    if (!archivo) return;
    try {
      importar(await archivo.text());
      enCuestionario = false;
      guardarYRender('Copia restaurada');
    } catch (e) {
      aviso(`No se pudo restaurar: ${e.message}`);
    }
  },
};

document.addEventListener('click', (ev) => {
  const el = ev.target.closest('[data-accion]');
  if (!el || el.tagName === 'INPUT') return;
  const fn = acciones[el.dataset.accion];
  if (fn) { ev.preventDefault(); fn(el); }
});

document.addEventListener('change', (ev) => {
  const el = ev.target;
  if (el.dataset?.accion && accionesCambio[el.dataset.accion]) accionesCambio[el.dataset.accion](el);
  if (el.name === 'objetivo') actualizarVisibles(el.form);
});

document.addEventListener('input', (ev) => {
  const el = ev.target;
  if (el.dataset?.accion !== 'buscar-recetas') return;
  cambiarFiltroRecetas({ texto: el.value });
  const pos = el.selectionStart;
  render();
  const nuevo = $('.buscador');
  nuevo.focus();
  nuevo.setSelectionRange(pos, pos);
});

document.addEventListener('submit', (ev) => {
  ev.preventDefault();
  const form = ev.target;
  if (form.id === 'form-paso') {
    const r = enviarPaso(form);
    if (r.error) return;
    if (r.avanzar) return render();
    terminarCuestionario(r.perfil, r.editando);
  } else if (form.id === 'form-peso') {
    const f = new FormData(form);
    const peso = Number(String(f.get('peso')).replace(',', '.'));
    const cintura = f.get('cintura') ? Number(String(f.get('cintura')).replace(',', '.')) : null;
    const fecha = f.get('fecha');
    if (!(peso >= 35 && peso <= 250) || !fecha) return aviso('Revisa el peso');
    estado.pesos = estado.pesos.filter((p) => p.fecha !== fecha).concat([{ fecha, peso, ...(cintura ? { cintura } : {}) }]);
    // El peso más reciente pasa a ser el del perfil (afecta al gasto y a la proteína)
    const ultimo = [...estado.pesos].sort((a, b) => a.fecha.localeCompare(b.fecha)).at(-1);
    const antes = objetivos().kcal;
    estado.perfil.peso = ultimo.peso;
    guardarYRender(reajustarPlanSiCambia(antes) || 'Peso guardado');
  }
});

const CLAVES_MENU = ['comidas', 'dieta', 'alergias', 'noMeGusta', 'tiempoMax', 'sobras', 'presupuesto'];

function terminarCuestionario(perfil, editando) {
  const anterior = estado.perfil;
  estado.perfil = perfil;
  enCuestionario = false;
  if (!editando) {
    estado.pesos = [{ fecha: hoyISO(), peso: perfil.peso }];
    crearPlan();
    location.hash = '#hoy';
    return guardarYRender('¡Tu primer menú está listo!');
  }
  const cambiaMenu = CLAVES_MENU.some((k) => JSON.stringify(anterior[k]) !== JSON.stringify(perfil[k]));
  if (cambiaMenu || !estado.plan) {
    crearPlan();
    return guardarYRender('Perfil guardado y menú nuevo creado');
  }
  const antes = calcularObjetivos(anterior).kcal;
  guardarYRender(reajustarPlanSiCambia(antes) || 'Perfil guardado');
}

window.addEventListener('hashchange', () => {
  if (!$('#modal').hidden) cerrarModal();
  if (!enCuestionario) render();
});
document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && !$('#modal').hidden) cerrarModal(); });

// Al volver a la app otro día, refresca la vista "Hoy"
let diaRender = hoyISO();
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && hoyISO() !== diaRender) { diaRender = hoyISO(); render(); }
});

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

render();
