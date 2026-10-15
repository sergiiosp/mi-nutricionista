// Utilidades de interfaz: escape de HTML, formato, iconos, modal, avisos y componentes comunes.

import { ALIMENTOS } from '../data/alimentos.js';
import { cantidadTexto, macrosComida, costeComida, producto } from './nutricion.js';
import { recetaPorId } from './planificador.js';

export const $ = (sel, raiz = document) => raiz.querySelector(sel);
export const $$ = (sel, raiz = document) => [...raiz.querySelectorAll(sel)];

export function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

export const euros = (n) => `${n.toFixed(2).replace('.', ',')} €`;
export const num = (n, dec = 0) => n.toFixed(dec).replace('.', ',');

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const DIAS_CORTOS = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

function fecha(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}
export const diaSemana = (iso) => DIAS[fecha(iso).getDay()];
export const diaCorto = (iso) => DIAS_CORTOS[fecha(iso).getDay()];
export const fechaLarga = (iso) => {
  const f = fecha(iso);
  return `${DIAS[f.getDay()]} ${f.getDate()} de ${MESES[f.getMonth()]}`;
};
export const fechaCorta = (iso) => {
  const f = fecha(iso);
  return `${f.getDate()} ${MESES[f.getMonth()].slice(0, 3)}`;
};

// Iconos (trazo, 24×24)
const RUTAS = {
  hoy: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  semana: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  compra: '<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6"/>',
  recetas: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
  progreso: '<path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/>',
  perfil: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',
  cambiar: '<path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>',
  reloj: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  cerrar: '<path d="M18 6 6 18M6 6l12 12"/>',
  enlace: '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6M10 14 21 3"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  copiar: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  dados: '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.2" fill="currentColor"/><circle cx="15.5" cy="15.5" r="1.2" fill="currentColor"/><circle cx="15.5" cy="8.5" r="1.2" fill="currentColor"/><circle cx="8.5" cy="15.5" r="1.2" fill="currentColor"/>',
  taper: '<rect x="3" y="8" width="18" height="12" rx="2"/><path d="M2 8h20M7 4h10l1 4H6z"/>',
  buscar: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  basura: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>',
};
export const icono = (n, clase = '') =>
  `<svg class="ico ${clase}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${RUTAS[n]}</svg>`;

// ── Modal y avisos ─────────────────────────────────────────────────────────

let alCerrarModal = null;
export function abrirModal(html, { onClose } = {}) {
  const m = $('#modal');
  m.innerHTML = `<div class="modal-fondo" data-accion="cerrar-modal"></div>
    <div class="modal-caja" role="dialog" aria-modal="true">
      <button class="modal-cerrar" data-accion="cerrar-modal" aria-label="Cerrar">${icono('cerrar')}</button>
      ${html}
    </div>`;
  m.hidden = false;
  document.body.classList.add('sin-scroll');
  alCerrarModal = onClose || null;
  $('.modal-caja', m).scrollTop = 0;
}
export function cerrarModal() {
  const m = $('#modal');
  m.hidden = true;
  m.innerHTML = '';
  document.body.classList.remove('sin-scroll');
  const cb = alCerrarModal;
  alCerrarModal = null;
  cb?.();
}

let temporizador;
export function aviso(texto) {
  const t = $('#toast');
  t.textContent = texto;
  t.hidden = false;
  t.classList.add('visible');
  clearTimeout(temporizador);
  temporizador = setTimeout(() => {
    t.classList.remove('visible');
    setTimeout(() => (t.hidden = true), 250);
  }, 2600);
}

// ── Componentes ────────────────────────────────────────────────────────────

export function chipsMacros(m, { kcal = true } = {}) {
  return `<div class="macros">
    ${kcal ? `<span class="chip chip-kcal">${Math.round(m.kcal)} kcal</span>` : ''}
    <span class="chip chip-p" title="Proteína">P ${Math.round(m.p)} g</span>
    <span class="chip chip-c" title="Hidratos">H ${Math.round(m.c)} g</span>
    <span class="chip chip-g" title="Grasa">G ${Math.round(m.g)} g</span>
  </div>`;
}

export function barra(etiqueta, actual, objetivo, clase, unidad = 'g') {
  const pct = objetivo ? Math.min(100, (actual / objetivo) * 100) : 0;
  return `<div class="barra-macro ${clase}">
    <div class="barra-cab"><span>${etiqueta}</span><span><b>${Math.round(actual)}</b> / ${Math.round(objetivo)} ${unidad}</span></div>
    <div class="barra-pista"><div class="barra-relleno" style="width:${pct}%"></div></div>
  </div>`;
}

export function anillo(actual, objetivo, { tam = 132, grosor = 12, texto, subtexto, clase = '' } = {}) {
  const r = (tam - grosor) / 2;
  const c = 2 * Math.PI * r;
  const pct = objetivo ? Math.min(1, actual / objetivo) : 0;
  return `<svg class="anillo ${clase}" width="${tam}" height="${tam}" viewBox="0 0 ${tam} ${tam}" role="img" aria-label="${Math.round(actual)} de ${Math.round(objetivo)} kcal">
    <circle cx="${tam / 2}" cy="${tam / 2}" r="${r}" class="anillo-pista" stroke-width="${grosor}" fill="none"/>
    <circle cx="${tam / 2}" cy="${tam / 2}" r="${r}" class="anillo-valor" stroke-width="${grosor}" fill="none"
      stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - pct)}" stroke-linecap="round" transform="rotate(-90 ${tam / 2} ${tam / 2})"/>
    <text x="50%" y="47%" text-anchor="middle" class="anillo-texto">${texto ?? Math.round(actual)}</text>
    <text x="50%" y="63%" text-anchor="middle" class="anillo-sub">${subtexto ?? `de ${Math.round(objetivo)} kcal`}</text>
  </svg>`;
}

export function listaIngredientes(ingredientes, { enlaces = false } = {}) {
  return `<ul class="ingredientes">${ingredientes
    .map((i) => {
      const p = enlaces ? producto(i.a) : null;
      const nombre = esc(ALIMENTOS[i.a].nombre);
      return `<li><span class="ing-cant">${esc(cantidadTexto(i.a, i.g))}</span>
        <span class="ing-nombre">${p ? `<a href="${esc(p.url)}" target="_blank" rel="noopener">${nombre}</a>` : nombre}</span></li>`;
    })
    .join('')}</ul>`;
}

export const ETIQUETAS = { pre: '⚡ Pre-entreno', post: '💪 Post-entreno' };

/**
 * Tarjeta de una comida del plan.
 * opciones: { diaIdx, fecha, franjaNombre, hecho, editable, nota }
 */
export function tarjetaComida(comida, o = {}) {
  const receta = recetaPorId[comida.recetaId];
  if (!receta) return '';
  const m = macrosComida(comida.ingredientes);
  const clave = `${o.diaIdx}|${comida.franja}`;
  const tipo = o.tipo || 'comida';
  return `<article class="comida t-${tipo} ${o.hecho ? 'hecha' : ''}">
    <button class="comida-emoji" data-accion="ver-comida" data-clave="${clave}" aria-label="Ver receta de ${esc(receta.nombre)}">${receta.emoji || '🍽️'}</button>
    <div class="comida-cuerpo">
      <div class="comida-franja">${esc(o.franjaNombre || comida.franja)}${comida.etiqueta ? ` <span class="etq etq-${comida.etiqueta}">${ETIQUETAS[comida.etiqueta]}</span>` : ''}${o.nota ? ` <span class="etq etq-nota">🥡 ${esc(o.nota)}</span>` : ''}</div>
      <h3 class="comida-titulo"><button class="enlace-receta" data-accion="ver-comida" data-clave="${clave}">${esc(receta.nombre)}</button></h3>
      <div class="meta">${icono('reloj')} ${receta.tiempo} min <span class="punto">·</span> ${euros(costeComida(comida.ingredientes))}</div>
      ${chipsMacros(m)}
    </div>
    ${o.editable !== false && o.fecha ? `<button class="check-hecho ${o.hecho ? 'activo' : ''}" data-accion="marcar-hecha" data-fecha="${o.fecha}" data-franja="${comida.franja}" aria-pressed="${!!o.hecho}" aria-label="${o.hecho ? 'Desmarcar' : 'Marcar como comida'}">${icono('check')}</button>` : ''}
    <details class="comida-ing"><summary>Ingredientes</summary>${listaIngredientes(comida.ingredientes)}</details>
    ${o.editable !== false ? `<footer class="comida-pie">
      <button class="boton-texto" data-accion="ver-comida" data-clave="${clave}">${icono('recetas')} Receta</button>
      <button class="boton-texto" data-accion="cambiar-comida" data-clave="${clave}">${icono('cambiar')} Cambiar</button>
    </footer>` : ''}
  </article>`;
}

export function detalleReceta(receta, ingredientes, { titulo } = {}) {
  const m = macrosComida(ingredientes);
  return `<div class="detalle-receta">
    <div class="receta-cabecera">
      <div class="receta-emoji-grande" aria-hidden="true">${receta.emoji || '🍽️'}</div>
      <div>
        <p class="sobre-etiqueta">${esc(titulo || receta.tipos.join(' · '))}</p>
        <h2>${esc(receta.nombre)}</h2>
        <div class="meta">${icono('reloj')} ${receta.tiempo} min <span class="punto">·</span> ${euros(costeComida(ingredientes))} por ración${receta.batch ? ` <span class="punto">·</span> 🥡 aguanta en táper` : ''}</div>
      </div>
    </div>
    <div class="macros-grandes">
      <div><b>${Math.round(m.kcal)}</b><span>kcal</span></div>
      <div class="t-p"><b>${Math.round(m.p)} g</b><span>proteína</span></div>
      <div class="t-c"><b>${Math.round(m.c)} g</b><span>hidratos</span></div>
      <div class="t-g"><b>${Math.round(m.g)} g</b><span>grasa</span></div>
    </div>
    <h3>🛒 Ingredientes <small>(tu ración)</small></h3>
    ${listaIngredientes(ingredientes, { enlaces: true })}
    ${receta.especias?.length ? `<p class="especias">🧂 <b>Para condimentar:</b> ${esc(receta.especias.map(nombreEspecia).join(', '))}</p>` : ''}
    <h3>👨‍🍳 Preparación</h3>
    <ol class="pasos">${receta.pasos.map((p) => `<li>${esc(p)}</li>`).join('')}</ol>
    ${receta.consejo ? `<p class="consejo">💡 ${esc(receta.consejo)}</p>` : ''}
    <p class="pie-nota">Fibra: ${Math.round(m.f)} g. Pesos en crudo; legumbres y conservas, escurridas.</p>
  </div>`;
}

const NOMBRES_ESPECIAS = {
  sal: 'sal', pimienta: 'pimienta', pimenton: 'pimentón', comino: 'comino', curry: 'curry', oregano: 'orégano',
  canela: 'canela', perejil: 'perejil', limon: 'limón', ajo_polvo: 'ajo en polvo',
};
const nombreEspecia = (e) => NOMBRES_ESPECIAS[e] || e;
