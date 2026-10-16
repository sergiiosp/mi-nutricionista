<script>
  import Icono from '../../components/Icono.svelte';
  import Emoji from '../../components/Emoji.svelte';
  import { PRECIOS_INFO } from '../../data/precios.js';
  import { ALIMENTOS } from '../../data/alimentos.js';
  import { estado, actualizar } from '../../stores/estado.js';
  import { avisar } from '../../stores/ui.js';
  import { hoyISO } from '../../lib/planificador.js';
  import { listaCompra, textoEnvases, formatoEnvase } from '../../lib/compra.js';
  import { producto, gramosPorEnvase } from '../../lib/nutricion.js';
  import { quitarDeCompra, devolverACompra, cambiarEnvases, añadirACompra, quitarExtra } from '../../lib/acciones.js';
  import ElegirAlimento from '../../components/ElegirAlimento.svelte';
  import { slide } from 'svelte/transition';
  import { euros } from '../../lib/formato.js';

  const hoy = hoyISO();
  const lista = $derived.by(() => {
    const plan = $estado.plan;
    if (!plan) return null;
    const dias = $estado.compra.soloRestantes ? plan.dias.map((d, i) => (d.fecha >= hoy ? i : -1)).filter((i) => i >= 0) : null;
    return listaCompra(plan, dias);
  });
  const enCasa = $derived($estado.compra.enCasa || {});
  const quitados = $derived($estado.compra.quitados || {});
  const envasesTuyos = $derived($estado.compra.envases || {});
  // Envases que coges (los tuyos si los has cambiado) y su precio
  const conTusEnvases = (it) => {
    const n = envasesTuyos[it.id] ?? it.envases;
    return { ...it, envases: n, cambiado: envasesTuyos[it.id] != null, coste: it.producto ? n * it.producto.precio : 0, corto: it.producto && n * (gramosPorEnvase(it.id) || 0) < it.bruto * 0.9 };
  };
  const grupos = $derived(lista ? lista.grupos.map((g) => ({ ...g, items: g.items.filter((i) => !quitados[i.id]).map(conTusEnvases) })).filter((g) => g.items.length) : []);
  // Lo que añades tú aunque no esté en el menú
  const extras = $derived(Object.entries($estado.compra.extra || {}).map(([id, n]) => {
    const p = producto(id);
    return { id, nombre: ALIMENTOS[id]?.nombre || id, producto: p, envases: n, coste: p ? n * p.precio : 0, extra: true, gramos: 0, bruto: 0 };
  }));
  let abierto = $state(null);
  let añadiendo = $state(false);
  function quitar(it) {
    const n = quitarDeCompra(it.id);
    abierto = null;
    avisar(n ? `Fuera de la lista: ${n === 1 ? 'he cambiado 1 comida' : `he cambiado ${n} comidas`} del menú` : 'Fuera de la lista', '🛒', () => devolverACompra(it.id));
  }
  function añadir(id) {
    añadirACompra(id);
    añadiendo = false;
    avisar(`Añadido a la lista: ${ALIMENTOS[id].nombre}`, '🛒');
  }
  const marcados = $derived($estado.compra.marcados);
  const comprar = $derived(lista ? [...grupos.flatMap((g) => g.items), ...extras].filter((i) => !enCasa[i.id]) : []);
  const ticket = $derived(comprar.reduce((s, i) => s + i.coste, 0));
  const falta = $derived(comprar.filter((i) => !marcados[i.id]).reduce((s, i) => s + i.coste, 0));
  const progreso = $derived(comprar.length ? Math.round((comprar.filter((i) => marcados[i.id]).length / comprar.length) * 100) : 0);

  const alternar = (campo, id) => actualizar((e) => {
    e.compra[campo] ||= {};
    if (e.compra[campo][id]) delete e.compra[campo][id];
    else e.compra[campo][id] = true;
  });

  async function compartir() {
    const lineas = ['*Lista de la compra* (Mercadona)', ''];
    for (const g of [...grupos, { nombre: 'Añadido por ti', items: extras }]) {
      const items = g.items.filter((i) => !enCasa[i.id] && !marcados[i.id]);
      if (!items.length) continue;
      lineas.push(`*${g.nombre}*`);
      for (const it of items) lineas.push(`${it.producto?.nombre || it.nombre}: ${textoEnvases(it)}`);
      lineas.push('');
    }
    lineas.push(`Total estimado: ${euros(falta)}`);
    const texto = lineas.join('\n');
    try {
      if (navigator.share) await navigator.share({ text: texto });
      else { await navigator.clipboard.writeText(texto); avisar('Lista copiada: pégala en WhatsApp', '📋'); }
    } catch { /* cancelado */ }
  }
</script>

{#if !lista}
  <div class="tarjeta vacia"><Emoji e="🛒" tam={56} /><p>Crea un menú y te preparo la lista.</p></div>
{:else}
  <div class="tarjeta resumen">
    <div class="total"><span>Ticket estimado</span><b>{euros(ticket)}</b></div>
    <div class="barra"><div style="width:{progreso}%"></div></div>
    <div class="cifras">
      <div><span>Te falta coger</span><b>{euros(falta)}</b></div>
      <div><span>Coste real de lo que comes</span><b>{euros(lista.costeConsumo)}</b></div>
    </div>
    <label class="interruptor"><input type="checkbox" checked={$estado.compra.soloRestantes} onchange={(ev) => actualizar((e) => { e.compra.soloRestantes = ev.currentTarget.checked; })} />
      <span><b>Solo lo que queda de semana</b><small>Desde hoy hasta el final del menú</small></span></label>
    <div class="acciones-fila">
      <button class="boton boton-peq" onclick={compartir}><Icono e="📤" tam={18} /> Compartir por WhatsApp</button>
      <button class="boton boton-sec boton-peq" onclick={() => actualizar((e) => { e.compra.marcados = {}; })}>Desmarcar todo</button>
    </div>
    <p class="pie-nota">Toca <Icono n="house" tam={14} /> en lo que ya tengas en casa y no se sumará al ticket. Precios de Mercadona online del {new Date(PRECIOS_INFO.actualizado).toLocaleDateString('es-ES')}.</p>
  </div>

  {#each [...grupos, ...(extras.length ? [{ nombre: 'Añadido por ti', items: extras }] : []), ...(lista.despensa.length ? [{ nombre: 'Despensa · revisa si te queda', items: lista.despensa }] : [])] as g (g.nombre)}
    <h2 class="pasillo">{g.nombre}</h2>
    <ul class="lista-compra">
      {#each g.items as it (it.id)}
        {@const casa = !!enCasa[it.id]}
        {@const cogido = !!marcados[it.id]}
        <li class="item" class:cogido class:casa>
          <button class="check" class:activo={cogido} aria-pressed={cogido} aria-label="Cogido: {it.producto?.nombre || it.nombre}" onclick={() => alternar('marcados', it.id)} disabled={casa}>
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
          </button>
          {#if it.producto?.imagen}<img src={it.producto.imagen} alt="" loading="lazy" />{:else}<span class="img"><Emoji e="🛒" tam={24} /></span>{/if}
          <button class="info" aria-expanded={abierto === it.id} onclick={() => (abierto = abierto === it.id ? null : it.id)}>
            <b>{it.producto?.nombre || it.nombre}</b>
            <small>{casa ? 'Lo tienes en casa' : textoEnvases(it)}{#if it.extra} · fuera del menú{:else} · usas {Math.round(it.gramos)} {ALIMENTOS[it.id].medida || 'g'}{/if}{#if it.cambiado} · cantidad tuya{/if}</small>
            {#if it.corto && !casa}<small class="corto">No te llega para el menú</small>{/if}
          </button>
          <span class="precio">{casa ? '—' : euros(it.coste)}</span>
          <button class="casa-btn" class:activo={casa} aria-pressed={casa} aria-label="Lo tengo en casa" onclick={() => alternar('enCasa', it.id)}><Icono e="🏠" tam={18} /></button>
        </li>
        {#if abierto === it.id && !casa}
          <li class="editor" transition:slide={{ duration: 160 }}>
            {#if it.producto}
              <div class="envases">
                <span>Cuántos coges <small>({formatoEnvase(it.producto)})</small></span>
                <div class="paso">
                  <button aria-label="Uno menos" onclick={() => (it.extra ? añadirACompra(it.id, -1) : cambiarEnvases(it.id, it.envases - 1))}><Icono n="minus" tam={16} /></button>
                  <b>{it.envases}</b>
                  <button aria-label="Uno más" onclick={() => (it.extra ? añadirACompra(it.id) : cambiarEnvases(it.id, it.envases + 1))}><Icono n="plus" tam={16} /></button>
                </div>
              </div>
            {/if}
            {#if it.extra}
              <button class="enlace" onclick={() => quitarExtra(it.id)}>Quitar de la lista</button>
            {:else}
              {#if it.cambiado}<button class="enlace" onclick={() => cambiarEnvases(it.id, null)}>Volver a lo que pide el menú</button>{/if}
              <button class="boton boton-sec boton-peq ancho" onclick={() => quitar(it)}><Icono n="trash" tam={16} /> No lo voy a comprar: cambia el menú</button>
              <p class="pie-nota">Las comidas que quedan con este alimento se cambian por otras que cuadran igual tus macros.</p>
            {/if}
          </li>
        {/if}
      {/each}
    </ul>
  {/each}
  {#if Object.keys(quitados).length}
    <p class="pie-nota">Has quitado: {#each Object.keys(quitados) as id, i (id)}{i ? ', ' : ''}<button class="enlace" onclick={() => devolverACompra(id)}>{ALIMENTOS[id]?.nombre || id} (volver a poner)</button>{/each}</p>
  {/if}
  {#if añadiendo}
    <div class="tarjeta anadir" transition:slide={{ duration: 160 }}>
      <ElegirAlimento onelegir={añadir} max={40} />
      <button class="enlace" onclick={() => (añadiendo = false)}>Cerrar</button>
    </div>
  {:else}
    <button class="boton boton-sec ancho" onclick={() => (añadiendo = true)}><Icono n="plus" tam={18} /> Añadir algo a la lista</button>
  {/if}
  {#if lista.especias.length}
    <h2 class="pasillo">Especias y condimentos</h2>
    <div class="chips-lista">{#each lista.especias as e (e.id)}<span class="chip-sup">{e.nombre}</span>{/each}</div>
  {/if}
{/if}

<style>
  .total { display: flex; justify-content: space-between; align-items: baseline; }
  .total span { font-weight: 800; color: var(--texto-2); }
  .total b { font-size: 2rem; font-weight: 800; color: var(--primario-fuerte); }
  .barra { height: 8px; border-radius: 999px; background: var(--superficie-2); overflow: hidden; margin: 8px 0 12px; }
  .barra div { height: 100%; background: var(--hero); border-radius: 999px; transition: width 0.3s; }
  .item { display: flex; align-items: center; gap: 10px; padding: 9px 10px 9px 12px; }
  .item + .item { border-top: 1px solid var(--superficie-2); }
  .check { position: relative; width: 30px; height: 30px; border-radius: 50%; border: 2px solid var(--borde); background: var(--superficie); color: transparent; display: grid; place-items: center; cursor: pointer; flex-shrink: 0; }
  .check::after, .casa-btn::after { content: ""; position: absolute; inset: -7px; }
  .check.activo { background: var(--primario); border-color: var(--primario); color: #fff; }
  .check:disabled { opacity: 0.3; }
  .item img, .img { width: 48px; height: 48px; border-radius: 12px; object-fit: contain; background: #fff; padding: 3px; flex-shrink: 0; display: grid; place-items: center; }
  .info { flex: 1; min-width: 0; display: grid; padding: 0; border: 0; background: none; color: var(--texto); text-align: left; font: inherit; cursor: pointer; }
  .corto { color: var(--aviso-texto, var(--amarillo)) !important; }
  .editor { display: grid; gap: 8px; padding: 10px 12px 14px; background: var(--superficie-2); border-radius: 0 0 14px 14px; }
  .envases { display: flex; justify-content: space-between; align-items: center; gap: 10px; font-weight: 700; font-size: 0.86rem; }
  .envases small { color: var(--texto-2); font-weight: 600; }
  .paso { display: flex; align-items: center; gap: 10px; }
  .paso button { width: 44px; height: 44px; border-radius: 50%; border: 0; background: var(--superficie); color: var(--texto); display: grid; place-items: center; cursor: pointer; }
  .paso b { min-width: 24px; text-align: center; font-size: 1.1rem; }
  .ancho { width: 100%; margin-top: 12px; }
  .anadir { margin-top: 12px; max-height: 480px; overflow-y: auto; }
  .info b { font-size: 0.9rem; line-height: 1.25; }
  .info small { color: var(--texto-2); font-weight: 600; font-size: 0.76rem; }
  .precio { font-weight: 800; font-size: 0.9rem; white-space: nowrap; }
  .casa-btn { position: relative; width: 34px; height: 34px; border-radius: 10px; border: 0; background: var(--superficie-2); cursor: pointer; filter: grayscale(1); opacity: 0.6; flex-shrink: 0; }
  .casa-btn.activo { filter: none; opacity: 1; background: var(--amarillo-claro); }
  .cogido b { text-decoration: line-through; color: var(--texto-2); }
  .cogido img, .casa img { opacity: 0.4; }
  .casa { background: color-mix(in srgb, var(--superficie) 60%, var(--fondo)); }
  .vacia { text-align: center; }
</style>
