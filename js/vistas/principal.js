// Vistas principales de la app.

import { RECETAS } from '../../data/recetas.js';
import { PRECIOS_INFO } from '../../data/precios.js';
import { ALERGENOS, ALIMENTOS } from '../../data/alimentos.js';
import { estado } from '../estado.js';
import {
  calcularObjetivos, objetivosDia, macrosComida, escalarReceta, recetaPermitida,
  OBJETIVOS, DIETAS, TRABAJO, DEPORTES, costeComida,
} from '../nutricion.js';
import { recetaPorId, hoyISO, contextoDia } from '../planificador.js';
import { horarioDia, objetivoFranja, REPARTOS } from '../horario.js';
import { listaCompra, textoEnvases } from '../compra.js';
import { tendencia, recomendacion } from '../progreso.js';
import { recomendaciones, recordatoriosDia, CONDICIONES } from '../salud.js';
import { resumenObjetivos } from './bienvenida.js';
import {
  esc, euros, num, icono, barra, anillo, tarjetaComida, chipsMacros, detalleReceta,
  fechaLarga, fechaCorta, diaSemana, diaCorto, ETIQUETAS,
} from '../ui.js';

export const objetivos = () => calcularObjetivos(estado.perfil);
const hecha = (fecha, franja) => !!estado.hechas[`${fecha}|${franja}`];
const TIPO_FRANJA = { desayuno: 'desayuno', media: 'snack', comida: 'comida', merienda: 'snack', cena: 'cena' };
const NOMBRE_FRANJA = { desayuno: 'Desayuno', media: 'Media mañana', comida: 'Comida', merienda: 'Merienda', cena: 'Cena' };

function nombreFranja(comida) {
  if (TIPO_FRANJA[comida.franja] === 'snack' && comida.hora) {
    const comidaDia = comida.hora < '14:00';
    return comidaDia ? 'Media mañana' : 'Merienda';
  }
  return NOMBRE_FRANJA[comida.franja] || comida.franja;
}

// Nota "táper" cuando la comida de hoy es la misma que la de ayer
function notaComida(plan, d, comida) {
  if (comida.franja !== 'comida' || !estado.perfil.sobras) return '';
  const ayer = plan.dias[d - 1]?.comidas.find((c) => c.franja === comida.franja);
  const manana = plan.dias[d + 1]?.comidas.find((c) => c.franja === comida.franja);
  if (ayer?.recetaId === comida.recetaId) return 'táper de ayer';
  if (manana?.recetaId === comida.recetaId) return 'haz ración doble';
  return '';
}

const CONSEJOS = [
  'Bebe un vaso de agua antes de cada comida: ayuda a la saciedad y a llegar a tu objetivo de agua.',
  'Llena medio plato de verdura: aporta volumen, fibra y casi nada de calorías.',
  'Si un día te sales del plan, no compenses al día siguiente: simplemente vuelve al menú.',
  'Cocina el arroz o la pasta para dos días: en la nevera aguantan 3 días en táper cerrado.',
  'Pésate siempre en las mismas condiciones: en ayunas, después del baño y con poca ropa.',
  'Reparte la proteína entre todas las comidas: tu músculo la aprovecha mejor.',
  'El aceite es saludable pero muy calórico: mídelo con cuchara en vez de echarlo "a ojo".',
  'Duerme 7-8 horas: dormir poco aumenta el hambre y empeora la recuperación.',
  'Las verduras congeladas de Mercadona son tan nutritivas como las frescas y te ahorran tiempo.',
  'Camina: 8.000-10.000 pasos al día suman mucho gasto sin aumentar el hambre.',
];

function consejoDelDia() {
  const d = new Date();
  const inicio = new Date(d.getFullYear(), 0, 0);
  return CONSEJOS[Math.floor((d - inicio) / 86400000) % CONSEJOS.length];
}

function saludo() {
  const h = new Date().getHours();
  return h < 6 ? 'Buenas noches' : h < 13 ? 'Buenos días' : h < 21 ? 'Buenas tardes' : 'Buenas noches';
}

function tarjetaSinPlan(texto) {
  return `<div class="tarjeta vacia">
    <div class="vacia-emoji">🥗</div>
    <p>${texto}</p>
    <button class="boton" data-accion="nuevo-plan">${icono('dados')} Crear menú de 7 días desde hoy</button>
  </div>`;
}

/** Línea de tiempo de un día: comidas, entreno y recordatorios de suplementos. */
function lineaTiempo(plan, d, { editable = true } = {}) {
  const dia = plan.dias[d];
  const recs = recomendaciones(estado.perfil, objetivos());
  const franjas = dia.comidas.map((c) => ({ id: c.franja, horaTexto: c.hora || '' }));
  const items = dia.comidas.map((c) => ({
    hora: c.hora || '',
    tipo: 'comida',
    html: tarjetaComida(c, {
      diaIdx: d, fecha: dia.fecha, franjaNombre: nombreFranja(c), tipo: TIPO_FRANJA[c.franja],
      hecho: hecha(dia.fecha, c.franja), nota: notaComida(plan, d, c), editable,
    }),
  }));
  if (dia.entreno && dia.sesion) {
    const deportes = (estado.perfil.deportes || []).map((x) => DEPORTES[x]).filter(Boolean);
    items.push({
      hora: dia.sesion.inicio,
      tipo: 'entreno',
      html: `<div class="bloque-entreno"><span class="be-emoji">${deportes[0]?.emoji || '🏋️'}</span>
        <div><b>Entreno</b><small>${dia.sesion.inicio} – ${dia.sesion.fin} · ${esc(deportes.map((x) => x.nombre).join(', ') || 'tu sesión')}</small></div></div>`,
    });
  }
  for (const r of recordatoriosDia(recs, franjas, dia.sesion)) {
    items.push({ hora: r.hora, tipo: 'sup', html: `<div class="recordatorio"><span>${r.emoji}</span> ${esc(r.texto)}${r.durante ? ' <small>(durante)</small>' : ''}</div>` });
  }
  const orden = { sup: 0, entreno: 1, comida: 2 };
  items.sort((a, b) => a.hora.localeCompare(b.hora) || orden[a.tipo] - orden[b.tipo]);
  return `<ol class="timeline">${items.map((it) => `<li class="tl tl-${it.tipo}">
      <div class="tl-hora">${it.tipo === 'sup' ? '' : esc(it.hora)}</div>
      <div class="tl-linea"><span></span></div>
      <div class="tl-contenido">${it.html}</div>
    </li>`).join('')}</ol>
    ${(dia.consejos || []).map((c) => `<p class="nota-dia">💡 ${esc(c)}</p>`).join('')}`;
}

function cuentaAtrasCompeticion() {
  const p = estado.perfil;
  if (!p.compite || !p.fechaCompeticion) return '';
  const dias = Math.round((new Date(`${p.fechaCompeticion}T00:00:00`) - new Date(`${hoyISO()}T00:00:00`)) / 86400000);
  if (dias < 0 || dias > 120) return '';
  return `<div class="tarjeta competicion">🏆 <b>${dias === 0 ? '¡Hoy compites!' : `Quedan ${dias} días para tu competición`}</b>
    ${dias <= 3 ? '<small>Nada nuevo en estos días: comidas conocidas, más hidratos y bien hidratado.</small>' : ''}</div>`;
}

// ── Hoy ────────────────────────────────────────────────────────────────────

export function vistaHoy() {
  const plan = estado.plan;
  const o = objetivos();
  const hoy = hoyISO();
  const nombre = estado.perfil.nombre ? `, ${esc(estado.perfil.nombre)}` : '';
  const d = plan ? plan.dias.findIndex((x) => x.fecha === hoy) : -1;
  const dia = d >= 0 ? plan.dias[d] : null;
  const entreno = dia ? dia.entreno : contextoDia(estado.perfil, o, hoy).entreno;
  const od = objetivosDia(o, entreno);

  let resumen = '';
  let cuerpo;
  if (!plan) {
    cuerpo = tarjetaSinPlan('Todavía no tienes menú.');
  } else if (!dia) {
    const futuro = plan.dias[0].fecha > hoy;
    cuerpo = futuro
      ? `<div class="tarjeta vacia"><div class="vacia-emoji">📅</div><p>Tu menú empieza el ${fechaLarga(plan.dias[0].fecha)}.</p><a class="boton boton-sec" href="#semana">Ver la semana</a></div>`
      : tarjetaSinPlan('Tu menú semanal ha terminado. ¿Preparamos el siguiente?');
  } else {
    const planificado = macrosComida(dia.comidas.flatMap((c) => c.ingredientes));
    const consumido = macrosComida(dia.comidas.filter((c) => hecha(dia.fecha, c.franja)).flatMap((c) => c.ingredientes));
    const hechas = dia.comidas.filter((c) => hecha(dia.fecha, c.franja)).length;
    resumen = `<div class="hero-cuerpo">
        ${anillo(consumido.kcal, od.kcal, { tam: 124, grosor: 11, subtexto: `de ${od.kcal} kcal`, clase: 'anillo-hero' })}
        <div class="barras">
          ${barra('Proteína', consumido.p, od.proteina, 'b-p')}
          ${barra('Hidratos', consumido.c, od.hidratos, 'b-c')}
          ${barra('Grasa', consumido.g, od.grasa, 'b-g')}
        </div>
      </div>
      <p class="hero-pie">${hechas}/${dia.comidas.length} comidas hechas · menú de hoy: ${Math.round(planificado.kcal)} kcal</p>`;
    const avisoProteina = planificado.p < od.proteina * 0.88
      ? `<p class="alerta">Hoy el menú se queda algo corto de proteína (${Math.round(planificado.p)} de ${od.proteina} g). Añade un yogur +Proteínas o cambia algún plato.</p>`
      : '';
    cuerpo = `${avisoProteina}<h2 class="seccion">Tu día</h2>${lineaTiempo(plan, d)}`;
  }

  const badge = entreno
    ? `<span class="hero-badge">💪 Día de entreno${dia?.sesion ? ` · ${dia.sesion.inicio}` : ''}</span>`
    : '<span class="hero-badge">😌 Día de descanso</span>';

  return `<section>
    <header class="hero">
      <p class="hero-fecha">${fechaLarga(hoy)}</p>
      <h1>${saludo()}${nombre} 👋</h1>
      ${badge}
      ${resumen}
    </header>
    ${cuentaAtrasCompeticion()}
    ${cuerpo}
    <div class="tarjeta consejo-dia"><span class="cd-emoji">💡</span><div><b>Consejo del día</b><p>${esc(consejoDelDia())}</p>
      <small>💧 Agua hoy: ~${num(entreno ? o.aguaEntreno : o.agua, 1)} l · 🌾 Fibra: ${o.fibra} g</small></div></div>
  </section>`;
}

// ── Semana ─────────────────────────────────────────────────────────────────

let diaSeleccionado = null;
export function seleccionarDia(i) { diaSeleccionado = i; }

export function vistaSemana() {
  const plan = estado.plan;
  if (!plan) return `<section><h1 class="titulo">Tu semana</h1>${tarjetaSinPlan('Todavía no tienes menú.')}</section>`;
  const o = objetivos();
  const hoy = hoyISO();
  if (diaSeleccionado === null || !plan.dias[diaSeleccionado]) {
    const i = plan.dias.findIndex((x) => x.fecha === hoy);
    diaSeleccionado = i === -1 ? 0 : i;
  }
  const d = diaSeleccionado;
  const dia = plan.dias[d];
  const od = objetivosDia(o, dia.entreno);
  const t = macrosComida(dia.comidas.flatMap((c) => c.ingredientes));
  const coste = dia.comidas.reduce((s, c) => s + costeComida(c.ingredientes), 0);

  return `<section>
    <p class="sobretitulo">${fechaCorta(plan.dias[0].fecha)} – ${fechaCorta(plan.dias.at(-1).fecha)}</p>
    <h1 class="titulo">Tu semana</h1>
    <div class="selector-dias" role="tablist">
      ${plan.dias.map((x, i) => `<button role="tab" class="dia-tab ${i === d ? 'activo' : ''} ${x.fecha === hoy ? 'hoy' : ''}" data-accion="ver-dia" data-dia="${i}" aria-selected="${i === d}" aria-label="${diaSemana(x.fecha)}${x.entreno ? ', día de entreno' : ''}">
        <span>${diaCorto(x.fecha)}</span><b>${Number(x.fecha.slice(8))}</b><i>${x.entreno ? '💪' : ''}</i></button>`).join('')}
    </div>
    <div class="tarjeta total-dia">
      <div class="td-cab"><b class="capital">${diaSemana(dia.fecha)}</b><span class="etq ${dia.entreno ? 'etq-pre' : 'etq-nota'}">${dia.entreno ? '💪 Entreno' : '😌 Descanso'}</span><span class="td-coste">${euros(coste)}</span></div>
      ${chipsMacros(t)}
      <p class="pie-nota">Objetivo: ${od.kcal} kcal · P ${od.proteina} · H ${od.hidratos} · G ${od.grasa}</p>
    </div>
    ${lineaTiempo(plan, d)}
    <div class="acciones-plan">
      <button class="boton boton-sec" data-accion="regenerar-plan">${icono('dados')} Otro menú con las mismas fechas</button>
      <button class="boton boton-sec" data-accion="nuevo-plan">Nueva semana desde hoy</button>
    </div>
  </section>`;
}

// ── Compra ─────────────────────────────────────────────────────────────────

export function datosCompra() {
  const plan = estado.plan;
  if (!plan) return null;
  const hoy = hoyISO();
  const dias = estado.compra.soloRestantes ? plan.dias.map((x, i) => (x.fecha >= hoy ? i : -1)).filter((i) => i >= 0) : null;
  return listaCompra(plan, dias);
}

export function vistaCompra() {
  const lista = datosCompra();
  if (!lista) return `<section><h1 class="titulo">Lista de la compra</h1>${tarjetaSinPlan('Crea un menú y te preparo la lista.')}</section>`;
  const marcados = estado.compra.marcados;
  const actualizado = new Date(PRECIOS_INFO.actualizado).toLocaleDateString('es-ES');
  const fila = (it) => {
    const p = it.producto;
    const marcado = !!marcados[it.id];
    return `<li class="item-compra ${marcado ? 'marcado' : ''}">
      <label class="item-check"><input type="checkbox" data-accion="marcar-compra" data-id="${it.id}" ${marcado ? 'checked' : ''} aria-label="${esc(p?.nombre || it.nombre)}"><span></span></label>
      ${p?.imagen ? `<img src="${esc(p.imagen)}" alt="" loading="lazy" width="52" height="52">` : '<div class="img-vacia">🛒</div>'}
      <div class="item-info">
        <div class="item-nombre">${esc(p?.nombre || it.nombre)}</div>
        <div class="item-detalle"><b>${esc(textoEnvases(it))}</b> · usas ${Math.round(it.gramos)} ${ALIMENTOS[it.id].medida || 'g'}</div>
      </div>
      <div class="item-precio">${p ? euros(it.coste) : ''}${p?.url ? `<a href="${esc(p.url)}" target="_blank" rel="noopener" aria-label="Ver en Mercadona">${icono('enlace')}</a>` : ''}</div>
    </li>`;
  };
  const todos = lista.grupos.flatMap((g) => g.items);
  const pendientes = todos.filter((i) => !marcados[i.id]);
  const restante = pendientes.reduce((s, i) => s + i.coste, 0);
  const progreso = todos.length ? Math.round(((todos.length - pendientes.length) / todos.length) * 100) : 0;

  return `<section>
    <h1 class="titulo">Lista de la compra</h1>
    <div class="tarjeta resumen-compra">
      <div class="rc-total"><span>Ticket estimado</span><b>${euros(lista.total)}</b></div>
      <div class="rc-progreso"><div style="width:${progreso}%"></div></div>
      <div class="cifras">
        <div><span>Te falta por coger</span><b>${euros(restante)}</b></div>
        <div><span>Coste real de lo que comes</span><b>${euros(lista.costeConsumo)}</b></div>
      </div>
      <p class="pie-nota">El ticket es mayor que lo que comes porque compras envases enteros (arroz, aceite…) que te duran varias semanas. Precios de Mercadona online del ${actualizado}.</p>
      <label class="interruptor"><input type="checkbox" data-accion="solo-restantes" ${estado.compra.soloRestantes ? 'checked' : ''}>
        <span><b>Solo lo que queda de semana</b><small>Desde hoy hasta el final del menú</small></span></label>
      <div class="acciones-fila">
        <button class="boton boton-peq" data-accion="copiar-compra">${icono('copiar')} Copiar / compartir</button>
        <button class="boton boton-sec boton-peq" data-accion="desmarcar-compra">Desmarcar todo</button>
      </div>
    </div>
    ${lista.grupos.map((g) => `<h2 class="pasillo">${esc(g.nombre)}</h2><ul class="lista-compra">${g.items.map(fila).join('')}</ul>`).join('')}
    ${lista.despensa.length ? `<h2 class="pasillo">Despensa <small>· comprueba si te queda</small></h2><ul class="lista-compra">${lista.despensa.map(fila).join('')}</ul>` : ''}
    ${lista.especias.length ? `<h2 class="pasillo">Especias y condimentos</h2><div class="chips-lista">${lista.especias.map((e) => e.producto ? `<a class="chip-sup" href="${esc(e.producto.url)}" target="_blank" rel="noopener">${esc(e.nombre)}</a>` : `<span class="chip-sup">${esc(e.nombre)}</span>`).join('')}</div>` : ''}
  </section>`;
}

// ── Recetas ────────────────────────────────────────────────────────────────

const filtrosRecetas = { tipo: 'todas', texto: '', todas: false };
export function cambiarFiltroRecetas(cambios) { Object.assign(filtrosRecetas, cambios); }

// Franja a la que se escala una receta al mostrarla en el recetario (día de descanso)
export function franjaDeReceta(receta) {
  const { franjas } = horarioDia(estado.perfil, false);
  const tipo = receta.prefiere || receta.tipos[0];
  return franjas.find((f) => f.tipo === tipo)
    || franjas.find((f) => receta.tipos.includes(f.tipo))
    || { id: 'snack', nombre: 'Snack', tipo: 'snack', pct: 0.12 };
}

export function racionReceta(receta) {
  const franja = franjaDeReceta(receta);
  const od = objetivosDia(objetivos(), false);
  return { franja, ingredientes: escalarReceta(receta, objetivoFranja(od, franja)).ingredientes };
}

export function vistaRecetas() {
  const { tipo, texto, todas } = filtrosRecetas;
  const t = texto.trim().toLowerCase();
  const lista = RECETAS.filter((r) => (todas || recetaPermitida(r, estado.perfil))
    && (tipo === 'todas' || (tipo === 'rapidas' ? r.tiempo <= 15 : tipo === 'taper' ? r.batch : r.tipos.includes(tipo)))
    && (!t || r.nombre.toLowerCase().includes(t) || r.ingredientes.some((i) => ALIMENTOS[i.a].nombre.toLowerCase().includes(t))));
  const filtro = (id, nombre) => `<button class="filtro ${tipo === id ? 'activo' : ''}" data-accion="filtro-recetas" data-tipo="${id}">${nombre}</button>`;

  return `<section>
    <h1 class="titulo">Recetas</h1>
    <div class="buscador-caja">${icono('buscar')}<input class="buscador" type="search" placeholder="Busca una receta o ingrediente…" value="${esc(texto)}" data-accion="buscar-recetas" aria-label="Buscar recetas"></div>
    <div class="filtros">${filtro('todas', 'Todas')}${filtro('desayuno', '🍳 Desayunos')}${filtro('comida', '🍲 Comidas')}${filtro('cena', '🌙 Cenas')}${filtro('snack', '🍎 Snacks')}${filtro('rapidas', '⚡ ≤ 15 min')}${filtro('taper', '🥡 Táper')}</div>
    <label class="interruptor mini"><input type="checkbox" data-accion="recetas-todas" ${todas ? 'checked' : ''}><span>Incluir recetas que no encajan con tu perfil</span></label>
    <p class="pie-nota">${lista.length} recetas · cantidades calculadas para tu ración</p>
    <div class="rejilla-recetas">
      ${lista.map((r) => {
        const { ingredientes, franja } = racionReceta(r);
        const m = macrosComida(ingredientes);
        return `<button class="receta-card t-${franja.tipo}" data-accion="ver-receta" data-id="${r.id}">
          <span class="rc-emoji" aria-hidden="true">${r.emoji}</span>
          <span class="rc-cuerpo">
            <span class="rc-meta">${esc(franja.nombre)} · ${r.tiempo} min${r.batch ? ' · 🥡' : ''}</span>
            <b>${esc(r.nombre)}</b>
            <span class="rc-macros"><span>${Math.round(m.kcal)} kcal</span><span class="t-p">P ${Math.round(m.p)}</span><span class="t-c">H ${Math.round(m.c)}</span><span class="t-g">G ${Math.round(m.g)}</span></span>
          </span>
        </button>`;
      }).join('') || '<p>No hay recetas con esos filtros.</p>'}
    </div>
  </section>`;
}

export function modalReceta(recetaId) {
  const r = recetaPorId[recetaId];
  const { ingredientes, franja } = racionReceta(r);
  const aviso = recetaPermitida(r, estado.perfil) ? '' : '<p class="alerta">Esta receta contiene algo que has excluido en tu perfil.</p>';
  return aviso + detalleReceta(r, ingredientes, { titulo: `Ración para tu ${franja.nombre.toLowerCase()}` });
}

// ── Progreso ───────────────────────────────────────────────────────────────

function grafico(pesos, objetivo) {
  if (pesos.length < 2) return '<p class="pie-nota">Añade al menos dos registros para ver la gráfica.</p>';
  const W = 340; const H = 180; const m = { t: 14, r: 12, b: 24, l: 36 };
  const ms = (iso) => new Date(`${iso}T00:00:00`).getTime();
  const xs = pesos.map((p) => ms(p.fecha));
  const valores = pesos.map((p) => p.peso).concat(objetivo ? [objetivo] : []);
  let min = Math.min(...valores); let max = Math.max(...valores);
  if (max - min < 2) { min -= 1; max += 1; }
  const x0 = Math.min(...xs); const x1 = Math.max(...xs);
  const X = (t) => m.l + ((t - x0) / Math.max(1, x1 - x0)) * (W - m.l - m.r);
  const Y = (v) => m.t + ((max - v) / (max - min)) * (H - m.t - m.b);
  // Media móvil exponencial: suaviza las fluctuaciones de agua del día a día
  let ema = pesos[0].peso;
  const suave = pesos.map((p) => (ema = ema + 0.3 * (p.peso - ema)));
  const linea = (vals) => vals.map((v, i) => `${i ? 'L' : 'M'}${X(xs[i]).toFixed(1)},${Y(v).toFixed(1)}`).join(' ');
  const area = `${linea(suave)} L${X(xs.at(-1)).toFixed(1)},${H - m.b} L${X(xs[0]).toFixed(1)},${H - m.b} Z`;
  const ticks = [min, (min + max) / 2, max];
  return `<svg class="grafico" viewBox="0 0 ${W} ${H}" role="img" aria-label="Evolución del peso">
    <defs><linearGradient id="g-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="g-area-ini"/><stop offset="1" class="g-area-fin"/></linearGradient></defs>
    ${ticks.map((v) => `<line x1="${m.l}" x2="${W - m.r}" y1="${Y(v)}" y2="${Y(v)}" class="g-rejilla"/><text x="${m.l - 6}" y="${Y(v) + 4}" text-anchor="end" class="g-eje">${num(v, 1)}</text>`).join('')}
    ${objetivo ? `<line x1="${m.l}" x2="${W - m.r}" y1="${Y(objetivo)}" y2="${Y(objetivo)}" class="g-objetivo"/><text x="${W - m.r}" y="${Y(objetivo) - 4}" text-anchor="end" class="g-eje">🎯 objetivo</text>` : ''}
    <path d="${area}" fill="url(#g-area)"/>
    <path d="${linea(suave)}" class="g-tendencia"/>
    ${pesos.map((p, i) => `<circle cx="${X(xs[i])}" cy="${Y(p.peso)}" r="3.5" class="g-punto"><title>${p.fecha}: ${num(p.peso, 1)} kg</title></circle>`).join('')}
    <text x="${m.l}" y="${H - 6}" class="g-eje">${fechaCorta(pesos[0].fecha)}</text>
    <text x="${W - m.r}" y="${H - 6}" text-anchor="end" class="g-eje">${fechaCorta(pesos.at(-1).fecha)}</text>
  </svg>`;
}

export function vistaProgreso() {
  const pesos = [...estado.pesos].sort((a, b) => a.fecha.localeCompare(b.fecha));
  const perfil = estado.perfil;
  const o = objetivos();
  const t = tendencia(pesos);
  const rec = recomendacion(pesos, perfil, o);
  const inicial = pesos[0]?.peso;
  const actual = pesos.at(-1)?.peso;
  const cambio = actual - inicial;

  return `<section>
    <h1 class="titulo">Progreso</h1>
    <form class="tarjeta form-peso" id="form-peso">
      <b class="fp-titulo">⚖️ Registrar peso</b>
      <label class="campo"><span>Fecha</span><input type="date" name="fecha" value="${hoyISO()}" max="${hoyISO()}" required></label>
      <label class="campo"><span>Peso</span><input type="number" name="peso" step="0.1" min="35" max="250" inputmode="decimal" required placeholder="${actual ? num(actual, 1) : ''}"><small>kg</small></label>
      <label class="campo"><span>Cintura <small>(opcional)</small></span><input type="number" name="cintura" step="0.5" min="40" max="200" inputmode="decimal"><small>cm</small></label>
      <button class="boton" type="submit">Guardar</button>
    </form>

    ${pesos.length ? `
    <div class="tarjeta">
      <div class="stats">
        <div><span>Inicio</span><b>${num(inicial, 1)}</b><small>kg</small></div>
        <div><span>Actual</span><b>${num(actual, 1)}</b><small>kg</small></div>
        <div class="${cambio < 0 ? 'baja' : cambio > 0 ? 'sube' : ''}"><span>Cambio</span><b>${cambio > 0 ? '+' : ''}${num(cambio, 1)}</b><small>kg</small></div>
        <div><span>Ritmo</span><b>${t ? `${t.kgSemana > 0 ? '+' : ''}${num(t.kgSemana, 2)}` : '—'}</b><small>kg/sem</small></div>
      </div>
      ${grafico(pesos, perfil.pesoObjetivo || null)}
      <p class="pie-nota">Puntos: tus registros · línea: tendencia suavizada. Esperado con tu plan: ${o.cambioSemanalKg > 0 ? '+' : ''}${num(o.cambioSemanalKg, 2)} kg/semana.</p>
    </div>` : ''}

    <div class="tarjeta recomendacion rec-${rec.tipo}">
      <div class="rec-cab"><span class="avatar">🥗</span><b>Tu nutricionista dice</b></div>
      <p>${esc(rec.texto)}</p>
      ${rec.tipo === 'ajuste' ? `<button class="boton" data-accion="aplicar-ajuste" data-ajuste="${rec.ajuste}">Aplicar ajuste (${rec.ajuste > 0 ? '+' : ''}${rec.ajuste} kcal)</button>` : ''}
      ${perfil.ajusteKcal ? `<p class="pie-nota">Ajuste acumulado sobre el cálculo inicial: ${perfil.ajusteKcal > 0 ? '+' : ''}${perfil.ajusteKcal} kcal. <button class="enlace" data-accion="quitar-ajuste">Quitar</button></p>` : ''}
    </div>

    ${pesos.length ? `<details class="tarjeta"><summary>Historial (${pesos.length})</summary>
      <ul class="historial">${[...pesos].reverse().map((p) => `<li><span>${fechaCorta(p.fecha)}</span><b>${num(p.peso, 1)} kg</b>${p.cintura ? `<span>${num(p.cintura, 1)} cm</span>` : '<span></span>'}
        <button class="boton-icono" data-accion="borrar-peso" data-fecha="${p.fecha}" aria-label="Borrar registro">${icono('basura')}</button></li>`).join('')}</ul>
    </details>` : ''}
  </section>`;
}

// ── Mi plan ────────────────────────────────────────────────────────────────

function horarioTipo(perfil, entreno) {
  const h = horarioDia(perfil, entreno);
  const items = h.franjas.map((f) => ({ hora: f.horaTexto, html: `${esc(f.nombre)}${f.etiqueta ? ` <span class="etq etq-${f.etiqueta}">${ETIQUETAS[f.etiqueta]}</span>` : ''}` }));
  if (h.entreno) items.push({ hora: h.entreno.inicio, html: `<b>🏋️ Entreno</b> hasta las ${h.entreno.fin}`, entreno: true });
  items.sort((a, b) => a.hora.localeCompare(b.hora));
  return `<ul class="horario-mini">${items.map((i) => `<li class="${i.entreno ? 'hm-entreno' : ''}"><b>${i.hora}</b> ${i.html}</li>`).join('')}</ul>
    ${h.consejos.map((c) => `<p class="nota-dia">💡 ${esc(c)}</p>`).join('')}`;
}

export function vistaPerfil() {
  const p = estado.perfil;
  const o = objetivos();
  const recs = recomendaciones(p, o);
  const etiquetas = (lista, dicc) => (lista?.length ? lista.map((x) => esc(dicc[x]?.nombre || dicc[x] || x)).join(', ') : 'Ninguna');
  const entrena = p.entrena && o.diasEntreno;
  const nombresDias = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
  const nivel = { alta: 'Evidencia alta', moderada: 'Evidencia moderada', baja: 'Evidencia limitada' };
  const legado = !p.trabajo;

  return `<section>
    <h1 class="titulo">Mi plan</h1>
    ${legado ? `<div class="tarjeta destacada"><b>✨ Nuevo: plan según tu horario y tus entrenos</b><p>Completa el cuestionario ampliado (horario, entreno, salud y hábitos) para afinar calorías, horas de comida y suplementos.</p><button class="boton" data-accion="editar-perfil">Completar mis datos</button></div>` : ''}
    ${recs.avisos.map((a) => `<p class="alerta ${a.nivel === 'importante' ? 'alerta-fuerte' : ''}">${esc(a.texto)}</p>`).join('')}
    ${resumenObjetivos(p)}

    ${!legado ? `<h2 class="seccion">🗓️ Tu horario</h2>
    <div class="tarjeta">
      ${entrena ? `<div class="pestanas-horario"><b>💪 Día de entreno</b><small>${(p.diasEntreno || []).slice().sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map((d) => nombresDias[d]).join(' · ')}</small></div>${horarioTipo(p, true)}<hr>` : ''}
      <div class="pestanas-horario"><b>😌 Día ${entrena ? 'de descanso' : 'normal'}</b></div>${horarioTipo(p, false)}
    </div>` : ''}

    ${recs.suplementos.length ? `<h2 class="seccion">💊 Suplementos</h2>
    <p class="pie-nota sub-seccion">Solo los que tienen sentido para ti. Dosis orientativas para adultos sanos: si tomas medicación o tienes alguna patología, consúltalo antes con tu médico o farmacéutico.</p>
    <div class="lista-sup">${recs.suplementos.map((s) => `<details class="tarjeta sup">
      <summary><span class="sup-emoji">${s.emoji}</span><span class="sup-tit"><b>${esc(s.nombre)}</b><small>${esc(s.dosis)}</small></span><span class="evid evid-${s.evidencia}">${nivel[s.evidencia]}</span></summary>
      <dl><dt>Cuándo</dt><dd>${esc(s.momento)}</dd><dt>Por qué</dt><dd>${esc(s.porque)}</dd><dt>Precaución</dt><dd>${esc(s.precauciones)}</dd></dl>
    </details>`).join('')}</div>` : ''}

    ${recs.alimentacion.length ? `<h2 class="seccion">🥦 Tu alimentación</h2>
    <div class="lista-consejos">${recs.alimentacion.map((a) => `<div class="tarjeta consejo-item"><span>${a.emoji}</span><div><b>${esc(a.titulo)}</b><p>${esc(a.texto)}</p></div></div>`).join('')}</div>` : ''}

    <h2 class="seccion">🌿 Hábitos</h2>
    <div class="lista-consejos">${recs.habitos.map((a) => `<div class="tarjeta consejo-item"><span>${a.emoji}</span><div><b>${esc(a.titulo)}</b><p>${esc(a.texto)}</p></div></div>`).join('')}</div>

    <h2 class="seccion">👤 Tus datos</h2>
    <div class="tarjeta">
      <dl class="datos-perfil">
        <dt>Persona</dt><dd>${p.sexo === 'h' ? 'Hombre' : 'Mujer'}, ${p.edad} años, ${p.altura} cm, ${num(p.peso, 1)} kg</dd>
        ${p.trabajo ? `<dt>Día a día</dt><dd>${esc(TRABAJO[p.trabajo]?.nombre || '')} · ${p.despertar}–${p.dormir}</dd>` : ''}
        ${p.trabajo ? `<dt>Entreno</dt><dd>${p.entrena ? `${esc((p.deportes || []).map((x) => DEPORTES[x]?.nombre).join(', '))} · ${(p.diasEntreno || []).length} días · ${p.horaEntreno}` : 'No entreno'}${p.compite ? ' · 🏆 compito' : ''}</dd>` : ''}
        <dt>Objetivo</dt><dd>${OBJETIVOS[p.objetivo].nombre}${p.pesoObjetivo ? ` (hasta ${num(p.pesoObjetivo, 1)} kg)` : ''}</dd>
        <dt>Comidas</dt><dd>${p.comidas} al día${p.sobras ? ' · táper' : ''}${p.tiempoMax ? ` · máx. ${p.tiempoMax} min` : ''}</dd>
        <dt>Alimentación</dt><dd>${DIETAS[p.dieta]}${p.presupuesto === 'ajustado' ? ' · económica' : ''}</dd>
        <dt>Alergias</dt><dd>${etiquetas(p.alergias, ALERGENOS)}</dd>
        ${p.trabajo ? `<dt>Salud</dt><dd>${etiquetas(p.condiciones, CONDICIONES)}</dd>` : ''}
        <dt>No me gusta</dt><dd>${p.noMeGusta.length} alimentos</dd>
      </dl>
      <button class="boton" data-accion="editar-perfil">Editar mis datos</button>
    </div>
    <div class="tarjeta">
      <b>💾 Copia de seguridad</b>
      <p class="pie-nota">Tus datos se guardan solo en este dispositivo. Descarga una copia para pasarlos a otro móvil o navegador.</p>
      <div class="acciones-fila">
        <button class="boton boton-sec boton-peq" data-accion="exportar">Descargar copia</button>
        <label class="boton boton-sec boton-peq">Restaurar copia<input type="file" accept="application/json" data-accion="importar" hidden></label>
        <button class="boton boton-peligro boton-peq" data-accion="reiniciar">Borrar todo</button>
      </div>
    </div>
    <p class="pie-nota aviso-legal">Esta app hace cálculos orientativos basados en fórmulas y guías validadas y no sustituye el consejo de un dietista-nutricionista o un médico, especialmente si tienes alguna patología, estás embarazada o tomas medicación.</p>
  </section>`;
}

export { REPARTOS };
