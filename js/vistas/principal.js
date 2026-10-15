// Vistas principales de la app.

import { RECETAS } from '../../data/recetas.js';
import { PRECIOS_INFO } from '../../data/precios.js';
import { estado } from '../estado.js';
import { calcularObjetivos, macrosComida, escalarReceta, recetaPermitida, ACTIVIDAD, OBJETIVOS, DIETAS, costeComida } from '../nutricion.js';
import { REPARTOS, recetaPorId, objetivoFranja, hoyISO } from '../planificador.js';
import { listaCompra, textoEnvases } from '../compra.js';
import { tendencia, recomendacion } from '../progreso.js';
import { resumenObjetivos } from './bienvenida.js';
import {
  esc, euros, num, icono, barra, anillo, tarjetaComida, chipsMacros, detalleReceta,
  fechaLarga, fechaCorta, diaSemana, diaCorto,
} from '../ui.js';
import { ALERGENOS, ALIMENTOS } from '../../data/alimentos.js';

export const objetivos = () => calcularObjetivos(estado.perfil);
const franjasPlan = () => REPARTOS[estado.plan?.comidasDia] || REPARTOS[estado.perfil.comidas] || REPARTOS[4];
const nombreFranja = (id) => franjasPlan().find((f) => f.id === id)?.nombre || id;
const hecha = (fecha, franja) => !!estado.hechas[`${fecha}|${franja}`];

// Nota "táper" cuando la comida de hoy es la misma que la de ayer
function notaComida(plan, d, comida) {
  const ayer = plan.dias[d - 1]?.comidas.find((c) => c.franja === comida.franja);
  const manana = plan.dias[d + 1]?.comidas.find((c) => c.franja === comida.franja);
  if (comida.franja !== 'comida' || !estado.perfil.sobras) return '';
  if (ayer?.recetaId === comida.recetaId) return 'táper de ayer';
  if (manana?.recetaId === comida.recetaId) return 'cocina doble ración';
  return '';
}

const CONSEJOS = [
  'Bebe un vaso de agua antes de cada comida: ayuda a la saciedad y a llegar a tu objetivo de agua.',
  'Llena medio plato de verdura: aporta volumen, fibra y casi nada de calorías.',
  'Si un día te sales del plan, no compenses al día siguiente: simplemente vuelve al menú.',
  'Cocina el arroz o la pasta para dos días: en la nevera aguantan 3 días en táper cerrado.',
  'Pésate siempre en las mismas condiciones: en ayunas, después del baño y con poca ropa.',
  'Intenta repartir la proteína entre todas las comidas: tu músculo lo aprovecha mejor.',
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
  return h < 13 ? 'Buenos días' : h < 21 ? 'Buenas tardes' : 'Buenas noches';
}

function tarjetaSinPlan(texto) {
  return `<div class="tarjeta vacia">
    <p>${texto}</p>
    <button class="boton" data-accion="nuevo-plan">${icono('dados')} Crear menú de 7 días desde hoy</button>
  </div>`;
}

// ── Hoy ────────────────────────────────────────────────────────────────────

export function vistaHoy() {
  const plan = estado.plan;
  const o = objetivos();
  const hoy = hoyISO();
  const nombre = estado.perfil.nombre ? `, ${esc(estado.perfil.nombre)}` : '';
  let cuerpo;

  const d = plan ? plan.dias.findIndex((x) => x.fecha === hoy) : -1;
  if (!plan) {
    cuerpo = tarjetaSinPlan('Todavía no tienes menú.');
  } else if (d === -1) {
    const futuro = plan.dias[0].fecha > hoy;
    cuerpo = futuro
      ? `<div class="tarjeta vacia"><p>Tu menú empieza el ${fechaLarga(plan.dias[0].fecha)}.</p><a class="boton boton-sec" href="#semana">Ver la semana</a></div>`
      : tarjetaSinPlan('Tu menú semanal ha terminado. ¿Preparamos el siguiente?');
  } else {
    const dia = plan.dias[d];
    const planificado = macrosComida(dia.comidas.flatMap((c) => c.ingredientes));
    const consumido = macrosComida(dia.comidas.filter((c) => hecha(dia.fecha, c.franja)).flatMap((c) => c.ingredientes));
    const avisoProteina = planificado.p < o.proteina * 0.88
      ? `<p class="alerta">Hoy el menú se queda algo corto de proteína (${Math.round(planificado.p)} g de ${o.proteina} g). Añade un yogur +Proteínas o cambia algún plato.</p>`
      : '';
    cuerpo = `
      <div class="tarjeta resumen-dia">
        ${anillo(consumido.kcal, o.kcal, { subtexto: `de ${o.kcal} kcal` })}
        <div class="barras">
          ${barra('Proteína', consumido.p, o.proteina, 'b-p')}
          ${barra('Hidratos', consumido.c, o.hidratos, 'b-c')}
          ${barra('Grasa', consumido.g, o.grasa, 'b-g')}
          <p class="pie-nota">Menú de hoy: ${Math.round(planificado.kcal)} kcal · marca cada comida al hacerla.</p>
        </div>
      </div>
      ${avisoProteina}
      ${dia.comidas.map((c) => tarjetaComida(c, {
        diaIdx: d, fecha: dia.fecha, franjaNombre: nombreFranja(c.franja), hecho: hecha(dia.fecha, c.franja), nota: notaComida(plan, d, c),
      })).join('')}`;
  }

  return `<section>
    <p class="sobretitulo">${fechaLarga(hoy)}</p>
    <h1>${saludo()}${nombre}</h1>
    ${cuerpo}
    <div class="tarjeta consejo-dia"><b>Consejo del día</b><p>${esc(consejoDelDia())}</p>
      <p class="pie-nota">Agua: ~${num(o.agua, 1)} l · Fibra: ${o.fibra} g</p></div>
  </section>`;
}

// ── Semana ─────────────────────────────────────────────────────────────────

let diaSeleccionado = null;
export function seleccionarDia(i) { diaSeleccionado = i; }

export function vistaSemana() {
  const plan = estado.plan;
  if (!plan) return `<section><h1>Tu semana</h1>${tarjetaSinPlan('Todavía no tienes menú.')}</section>`;
  const o = objetivos();
  const hoy = hoyISO();
  if (diaSeleccionado === null || !plan.dias[diaSeleccionado]) {
    const i = plan.dias.findIndex((x) => x.fecha === hoy);
    diaSeleccionado = i === -1 ? 0 : i;
  }
  const d = diaSeleccionado;
  const dia = plan.dias[d];
  const t = macrosComida(dia.comidas.flatMap((c) => c.ingredientes));
  const coste = dia.comidas.reduce((s, c) => s + costeComida(c.ingredientes), 0);
  const ultimo = plan.dias.at(-1).fecha;

  return `<section>
    <p class="sobretitulo">${fechaCorta(plan.dias[0].fecha)} – ${fechaCorta(ultimo)}</p>
    <h1>Tu semana</h1>
    <div class="selector-dias" role="tablist">
      ${plan.dias.map((x, i) => `<button role="tab" class="dia-tab ${i === d ? 'activo' : ''} ${x.fecha === hoy ? 'hoy' : ''}" data-accion="ver-dia" data-dia="${i}" aria-selected="${i === d}">
        <span>${diaCorto(x.fecha)}</span><b>${Number(x.fecha.slice(8))}</b></button>`).join('')}
    </div>
    <div class="tarjeta total-dia">
      <div><b class="capital">${diaSemana(dia.fecha)}</b> · ${euros(coste)}</div>
      ${chipsMacros(t)}
      <p class="pie-nota">Objetivo: ${o.kcal} kcal · P ${o.proteina} · H ${o.hidratos} · G ${o.grasa}</p>
    </div>
    ${dia.comidas.map((c) => tarjetaComida(c, {
      diaIdx: d, fecha: dia.fecha, franjaNombre: nombreFranja(c.franja), hecho: hecha(dia.fecha, c.franja), nota: notaComida(plan, d, c),
    })).join('')}
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
  if (!lista) return `<section><h1>Lista de la compra</h1>${tarjetaSinPlan('Crea un menú y te preparo la lista.')}</section>`;
  const marcados = estado.compra.marcados;
  const actualizado = new Date(PRECIOS_INFO.actualizado).toLocaleDateString('es-ES');
  const fila = (it) => {
    const p = it.producto;
    const marcado = !!marcados[it.id];
    return `<li class="item-compra ${marcado ? 'marcado' : ''}">
      <label class="item-check"><input type="checkbox" data-accion="marcar-compra" data-id="${it.id}" ${marcado ? 'checked' : ''} aria-label="${esc(p?.nombre || it.nombre)}"><span></span></label>
      ${p?.imagen ? `<img src="${esc(p.imagen)}" alt="" loading="lazy" width="48" height="48">` : '<div class="img-vacia"></div>'}
      <div class="item-info">
        <div class="item-nombre">${esc(p?.nombre || it.nombre)}</div>
        <div class="item-detalle">Coger <b>${esc(textoEnvases(it))}</b> · necesitas ${Math.round(it.gramos)} ${ALIMENTOS[it.id].medida || 'g'}</div>
      </div>
      <div class="item-precio">${p ? euros(it.coste) : ''}${p?.url ? `<a href="${esc(p.url)}" target="_blank" rel="noopener" aria-label="Ver en Mercadona">${icono('enlace')}</a>` : ''}</div>
    </li>`;
  };
  const pendientes = lista.grupos.flatMap((g) => g.items).filter((i) => !marcados[i.id]);
  const restante = pendientes.reduce((s, i) => s + i.coste, 0);

  return `<section>
    <h1>Lista de la compra</h1>
    <div class="tarjeta resumen-compra">
      <div class="cifras">
        <div><span>Ticket estimado</span><b>${euros(lista.total)}</b></div>
        <div><span>Te falta por coger</span><b>${euros(restante)}</b></div>
        <div><span>Coste real de lo que comes</span><b>${euros(lista.costeConsumo)}</b></div>
      </div>
      <p class="pie-nota">El ticket es mayor que lo que comes porque compras envases completos (arroz, aceite…) que duran varias semanas. Precios de Mercadona online (${esc(PRECIOS_INFO.almacen)}) del ${actualizado}.</p>
      <label class="interruptor"><input type="checkbox" data-accion="solo-restantes" ${estado.compra.soloRestantes ? 'checked' : ''}>
        <span><b>Solo lo que queda de semana</b><small>Desde hoy hasta el final del menú</small></span></label>
      <div class="acciones-fila">
        <button class="boton boton-sec boton-peq" data-accion="copiar-compra">${icono('copiar')} Copiar lista</button>
        <button class="boton boton-sec boton-peq" data-accion="desmarcar-compra">Desmarcar todo</button>
      </div>
    </div>
    ${lista.grupos.map((g) => `<h2 class="pasillo">${esc(g.nombre)}</h2><ul class="lista-compra">${g.items.map(fila).join('')}</ul>`).join('')}
    ${lista.despensa.length ? `<h2 class="pasillo">Despensa <small>(comprueba si te queda)</small></h2><ul class="lista-compra">${lista.despensa.map(fila).join('')}</ul>` : ''}
    ${lista.especias.length ? `<h2 class="pasillo">Especias y condimentos</h2><p class="especias-lista">${lista.especias.map((e) => e.producto ? `<a href="${esc(e.producto.url)}" target="_blank" rel="noopener">${esc(e.nombre)}</a>` : esc(e.nombre)).join(' · ')}</p>` : ''}
  </section>`;
}

// ── Recetas ────────────────────────────────────────────────────────────────

const filtrosRecetas = { tipo: 'todas', texto: '', todas: false };
export function cambiarFiltroRecetas(cambios) { Object.assign(filtrosRecetas, cambios); }

// Franja a la que se escala una receta al mostrarla en el recetario
export function franjaDeReceta(receta) {
  const franjas = REPARTOS[estado.perfil.comidas] || REPARTOS[4];
  const tipo = receta.prefiere || receta.tipos[0];
  return franjas.find((f) => f.tipo === tipo)
    || franjas.find((f) => receta.tipos.includes(f.tipo))
    || { id: 'snack', nombre: 'Snack', tipo: 'snack', pct: 0.12 };
}

export function racionReceta(receta) {
  const franja = franjaDeReceta(receta);
  return { franja, ingredientes: escalarReceta(receta, objetivoFranja(objetivos(), franja)).ingredientes };
}

export function vistaRecetas() {
  const { tipo, texto, todas } = filtrosRecetas;
  const t = texto.trim().toLowerCase();
  const lista = RECETAS.filter((r) => (todas || recetaPermitida(r, estado.perfil))
    && (tipo === 'todas' || (tipo === 'rapidas' ? r.tiempo <= 15 : tipo === 'taper' ? r.batch : r.tipos.includes(tipo)))
    && (!t || r.nombre.toLowerCase().includes(t) || r.ingredientes.some((i) => i.a.replace('_', ' ').includes(t))));
  const filtro = (id, nombre) => `<button class="filtro ${tipo === id ? 'activo' : ''}" data-accion="filtro-recetas" data-tipo="${id}">${nombre}</button>`;

  return `<section>
    <h1>Recetas</h1>
    <input class="buscador" type="search" placeholder="Buscar receta o ingrediente…" value="${esc(texto)}" data-accion="buscar-recetas" aria-label="Buscar recetas">
    <div class="filtros">${filtro('todas', 'Todas')}${filtro('desayuno', 'Desayunos')}${filtro('comida', 'Comidas')}${filtro('cena', 'Cenas')}${filtro('snack', 'Snacks')}${filtro('rapidas', '≤ 15 min')}${filtro('taper', 'Para táper')}</div>
    <label class="interruptor mini"><input type="checkbox" data-accion="recetas-todas" ${todas ? 'checked' : ''}><span>Incluir recetas que no encajan con tu perfil</span></label>
    <p class="pie-nota">${lista.length} recetas · cantidades calculadas para tu ración</p>
    <div class="rejilla-recetas">
      ${lista.map((r) => {
        const { ingredientes, franja } = racionReceta(r);
        const m = macrosComida(ingredientes);
        return `<button class="tarjeta receta-card" data-accion="ver-receta" data-id="${r.id}">
          <span class="franja">${esc(franja.nombre)} · ${r.tiempo} min${r.batch ? ' · táper' : ''}</span>
          <b>${esc(r.nombre)}</b>
          ${chipsMacros(m)}
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
  const W = 340; const H = 180; const m = { t: 12, r: 12, b: 24, l: 36 };
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
  const ticks = [min, (min + max) / 2, max];
  return `<svg class="grafico" viewBox="0 0 ${W} ${H}" role="img" aria-label="Evolución del peso">
    ${ticks.map((v) => `<line x1="${m.l}" x2="${W - m.r}" y1="${Y(v)}" y2="${Y(v)}" class="g-rejilla"/><text x="${m.l - 6}" y="${Y(v) + 4}" text-anchor="end" class="g-eje">${num(v, 1)}</text>`).join('')}
    ${objetivo ? `<line x1="${m.l}" x2="${W - m.r}" y1="${Y(objetivo)}" y2="${Y(objetivo)}" class="g-objetivo"/><text x="${W - m.r}" y="${Y(objetivo) - 4}" text-anchor="end" class="g-eje">objetivo</text>` : ''}
    <path d="${linea(suave)}" class="g-tendencia"/>
    ${pesos.map((p, i) => `<circle cx="${X(xs[i])}" cy="${Y(p.peso)}" r="3" class="g-punto"><title>${p.fecha}: ${num(p.peso, 1)} kg</title></circle>`).join('')}
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

  return `<section>
    <h1>Progreso</h1>
    <form class="tarjeta form-peso" id="form-peso">
      <label class="campo"><span>Fecha</span><input type="date" name="fecha" value="${hoyISO()}" max="${hoyISO()}" required></label>
      <label class="campo"><span>Peso</span><input type="number" name="peso" step="0.1" min="35" max="250" inputmode="decimal" required placeholder="${actual ? num(actual, 1) : 'kg'}"><small>kg</small></label>
      <label class="campo"><span>Cintura <small>(opc.)</small></span><input type="number" name="cintura" step="0.5" min="40" max="200" inputmode="decimal"><small>cm</small></label>
      <button class="boton" type="submit">Guardar</button>
    </form>

    ${pesos.length ? `
    <div class="tarjeta">
      <div class="cifras">
        <div><span>Inicio</span><b>${num(inicial, 1)} kg</b></div>
        <div><span>Actual</span><b>${num(actual, 1)} kg</b></div>
        <div><span>Cambio</span><b>${actual - inicial > 0 ? '+' : ''}${num(actual - inicial, 1)} kg</b></div>
        <div><span>Ritmo</span><b>${t ? `${t.kgSemana > 0 ? '+' : ''}${num(t.kgSemana, 2)} kg/sem` : '—'}</b></div>
      </div>
      ${grafico(pesos, perfil.pesoObjetivo || null)}
      <p class="pie-nota">Puntos: tus registros · línea: tendencia suavizada. Esperado con tu plan: ${o.cambioSemanalKg > 0 ? '+' : ''}${num(o.cambioSemanalKg, 2)} kg/semana.</p>
    </div>` : ''}

    <div class="tarjeta recomendacion rec-${rec.tipo}">
      <b>Tu nutricionista dice</b>
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

// ── Perfil ─────────────────────────────────────────────────────────────────

export function vistaPerfil() {
  const p = estado.perfil;
  const etiquetas = (lista, dicc) => lista.length ? lista.map((x) => esc(dicc[x] || x)).join(', ') : 'Ninguna';
  return `<section>
    <h1>Tu perfil</h1>
    ${resumenObjetivos(p)}
    <div class="tarjeta">
      <dl class="datos-perfil">
        <dt>Datos</dt><dd>${p.sexo === 'h' ? 'Hombre' : 'Mujer'}, ${p.edad} años, ${p.altura} cm, ${num(p.peso, 1)} kg</dd>
        <dt>Actividad</dt><dd>${ACTIVIDAD[p.actividad].nombre}</dd>
        <dt>Objetivo</dt><dd>${OBJETIVOS[p.objetivo].nombre}${p.pesoObjetivo ? ` (hasta ${num(p.pesoObjetivo, 1)} kg)` : ''}</dd>
        <dt>Comidas</dt><dd>${p.comidas} al día${p.sobras ? ' · comida para 2 días' : ''}${p.tiempoMax ? ` · máx. ${p.tiempoMax} min` : ''}</dd>
        <dt>Alimentación</dt><dd>${DIETAS[p.dieta]}${p.presupuesto === 'ajustado' ? ' · económica' : ''}</dd>
        <dt>Alergias</dt><dd>${etiquetas(p.alergias, ALERGENOS)}</dd>
        <dt>No me gusta</dt><dd>${p.noMeGusta.length} alimentos excluidos</dd>
      </dl>
      <button class="boton" data-accion="editar-perfil">Editar mis datos</button>
    </div>
    <div class="tarjeta">
      <b>Tus datos</b>
      <p class="pie-nota">Se guardan solo en este dispositivo. Haz una copia para pasarlos al móvil o a otro navegador.</p>
      <div class="acciones-fila">
        <button class="boton boton-sec boton-peq" data-accion="exportar">Descargar copia</button>
        <label class="boton boton-sec boton-peq">Restaurar copia<input type="file" accept="application/json" data-accion="importar" hidden></label>
        <button class="boton boton-peligro boton-peq" data-accion="reiniciar">Borrar todo</button>
      </div>
    </div>
    <p class="pie-nota aviso-legal">Esta app hace cálculos orientativos basados en fórmulas validadas y no sustituye el consejo de un dietista-nutricionista o médico, especialmente si tienes alguna patología, estás embarazada o tomas medicación.</p>
  </section>`;
}
