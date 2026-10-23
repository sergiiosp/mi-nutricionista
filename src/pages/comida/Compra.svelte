<script>
  import Numero from '../../components/Numero.svelte';
  import Icono from '../../components/Icono.svelte';
  import Emoji from '../../components/Emoji.svelte';
  import { PRECIOS_INFO } from '../../data/precios.js';
  import { ALIMENTOS } from '../../data/alimentos.js';
  import { estado, actualizar } from '../../stores/estado.js';
  import { avisar } from '../../stores/ui.js';
  import { hoyISO } from '../../lib/planificador.js';
  import { listaCompra, textoEnvases, formatoEnvase } from '../../lib/compra.js';
  import { producto, gramosPorEnvase } from '../../lib/nutricion.js';
  import { quitarDeCompra, devolverACompra, cambiarEnvases, añadirACompra, quitarExtra, ajustarDespensa, quitarDeDespensa } from '../../lib/acciones.js';
  import { cantidadTexto } from '../../lib/nutricion.js';
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
  // Pasillos: se pliegan solos cuando ya lo tienes todo; tocando la cabecera, a tu gusto
  let plegados = $state({});
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

  // Lo que coges entra en tu despensa (y sale si lo desmarcas)
  function coger(it) {
    const ya = !!marcados[it.id];
    const g = it.envases && gramosPorEnvase(it.id) ? it.envases * gramosPorEnvase(it.id) : it.bruto || 0;
    alternar('marcados', it.id);
    if (g) ajustarDespensa(it.id, ya ? -g : g);
  }
  const despensa = $derived(Object.entries($estado.despensa || {}).filter(([id]) => ALIMENTOS[id]).sort((a, b) => ALIMENTOS[a[0]].nombre.localeCompare(ALIMENTOS[b[0]].nombre)));
  const diasDesde = (f) => Math.round((new Date(`${hoy}T12:00`) - new Date(`${f}T12:00`)) / 86400000);
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
  <!-- El ticket: una cifra, lo que llevas cogido y las dos acciones; lo demás, al tocar -->
  <section class="ticket">
    <div class="tk-cab">
      <span class="tk-lbl"><Icono n="receipt" tam={15} grosor={2.2} /> {progreso && progreso < 100 ? 'Te falta por coger' : 'Ticket estimado'}</span>
      <label class="tk-solo"><input type="checkbox" checked={$estado.compra.soloRestantes} onchange={(ev) => actualizar((e) => { e.compra.soloRestantes = ev.currentTarget.checked; })} /> Solo lo que queda</label>
    </div>
    <b class="tk-total cifra cifra-xl"><Numero valor={progreso && progreso < 100 ? falta : ticket} decimales={2} sufijo=" €" /></b>
    <div class="tk-pista" aria-hidden="true"><span style="--p:{progreso}%"></span></div>
    <p class="tk-sub"><span class="cifra">{comprar.filter((i) => marcados[i.id]).length}/{comprar.length}</span> cogidos{#if progreso && progreso < 100} · ticket {euros(ticket)}{/if} · comes <b class="cifra">{euros(lista.costeConsumo)}</b> esta semana</p>
    <div class="tk-acciones">
      <button class="boton" onclick={compartir}><Icono n="share" tam={17} /> Compartir lista</button>
      <button class="boton boton-sec tk-icono" aria-label="Desmarcar todo" onclick={() => actualizar((e) => { e.compra.marcados = {}; })}><Icono n="refresh-cw" tam={17} /></button>
    </div>
  </section>

  {#if despensa.length}
    <details class="tarjeta despensa">
      <summary><Icono n="package" tam={18} /> <span><b>En tu despensa</b><small>{despensa.length} {despensa.length === 1 ? 'alimento' : 'alimentos'}: el menú tira antes de ellos</small></span> <Icono n="chevron-down" tam={18} /></summary>
      <ul>
        {#each despensa as [id, d] (id)}
          <li><span><b>{ALIMENTOS[id].nombre}</b><small>{cantidadTexto(id, d.g)} · {diasDesde(d.fecha) === 0 ? 'de hoy' : `hace ${diasDesde(d.fecha)} ${diasDesde(d.fecha) === 1 ? 'día' : 'días'}`}</small></span>
            <button class="borrar-d" aria-label="Ya no tengo {ALIMENTOS[id].nombre}" onclick={() => quitarDeDespensa(id)}><Icono n="trash" tam={16} /></button></li>
        {/each}
      </ul>
      <p class="pie-nota">Entra lo que marcas como cogido y sale lo que comes del menú. Bórralo si se acaba antes.</p>
    </details>
  {/if}

  {#each [...grupos, ...(extras.length ? [{ nombre: 'Añadido por ti', items: extras }] : []), ...(lista.despensa.length ? [{ nombre: 'Despensa · revisa si te queda', items: lista.despensa }] : [])] as g (g.nombre)}
    {@const hechos = g.items.filter((i) => marcados[i.id] || enCasa[i.id]).length}
    {@const plegado = g.nombre in plegados ? plegados[g.nombre] : hechos === g.items.length}
    <button class="pasillo-cab" class:completo={hechos === g.items.length} aria-expanded={!plegado} onclick={() => (plegados = { ...plegados, [g.nombre]: !plegado })}>
      <span class="pc-nombre">{#if hechos === g.items.length}<Icono n="circle-check" tam={16} grosor={2.2} />{/if}{g.nombre}</span>
      <span class="pc-cuenta cifra">{hechos}/{g.items.length}</span>
      <Icono n={plegado ? 'chevron-down' : 'chevron-up'} tam={18} />
    </button>
    {#if !plegado}
    <ul class="lista-compra" transition:slide={{ duration: 180 }}>
      {#each g.items as it (it.id)}
        {@const casa = !!enCasa[it.id]}
        {@const cogido = !!marcados[it.id]}
        <li class="item" class:cogido class:casa>
          <button class="check" class:activo={cogido} aria-pressed={cogido} aria-label="Cogido: {it.producto?.nombre || it.nombre}" onclick={() => coger(it)} disabled={casa}>
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
    {/if}
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
  <p class="pie-nota fuente-precios">Toca <Icono n="house" tam={13} /> en lo que ya tengas y no suma al ticket · precios de Mercadona del {new Date(PRECIOS_INFO.actualizado).toLocaleDateString('es-ES')}</p>
{/if}

<style>
  /* Pasillos y lista (antes en app.css) */
  .pasillo { font-size: 0.8rem; color: var(--texto-2); margin: 22px 4px 8px; font-weight: 700; }
  .lista-compra { list-style: none; margin: 0; padding: 4px 0; background: var(--superficie); border-radius: var(--radio); box-shadow: var(--sombra); overflow: hidden; }
  /* Ticket */
  .ticket { padding: 16px; border-radius: var(--r-xl); background: radial-gradient(120% 100% at 100% 0%, var(--halo), transparent 65%), var(--superficie); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--primario) 20%, transparent); }
  .tk-cab { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
  .tk-lbl { display: inline-flex; align-items: center; gap: 6px; font-size: 0.8rem; font-weight: 700; color: var(--primario-fuerte); }
  .tk-solo { display: inline-flex; align-items: center; gap: 6px; min-height: 36px; font-size: 0.76rem; font-weight: 600; color: var(--texto-2); cursor: pointer; }
  .tk-solo input { width: 18px; height: 18px; accent-color: var(--primario); }
  .tk-total { display: block; margin: 2px 0 10px; font-size: 3rem; line-height: 1; font-weight: 700; letter-spacing: -0.05em; }
  .tk-pista { height: 8px; border-radius: 999px; background: var(--superficie-3); overflow: hidden; }
  .tk-pista span { display: block; width: 100%; height: 100%; border-radius: 999px; background: var(--hero); transform: translateX(calc(var(--p, 0%) - 100%)); transition: transform 0.6s var(--ease-out); }
  .tk-sub { margin: 8px 0 14px; font-size: 0.8rem; color: var(--texto-2); }
  .tk-sub b { color: var(--texto); font-weight: 700; }
  .tk-acciones { display: flex; gap: 8px; }
  .tk-acciones .boton:first-child { flex: 1; }
  .tk-icono { width: 52px; padding: 0; flex-shrink: 0; }
  .fuente-precios { margin-top: 18px; text-align: center; }
  .pasillo-cab { width: 100%; display: flex; align-items: center; gap: 10px; min-height: 48px; margin: 18px 0 6px; padding: 0 4px; border: 0; background: none; color: var(--texto); font: inherit; text-align: left; cursor: pointer; }
  .pc-nombre { flex: 1; display: inline-flex; align-items: center; gap: 6px; font-weight: 700; font-size: 0.95rem; }
  .pc-nombre :global(svg) { color: var(--primario); }
  .pc-cuenta { font-weight: 700; font-size: 0.82rem; color: var(--primario-fuerte); padding: 3px 9px; border-radius: 999px; background: var(--primario-claro); }
  .pasillo-cab > :global(svg:last-child) { color: var(--texto-3); }
  .pasillo-cab.completo .pc-nombre { color: var(--texto-2); }
  .item { display: flex; align-items: center; gap: 10px; padding: 9px 10px 9px 12px; }
  .item + .item { border-top: 1px solid var(--superficie-2); }
  .check { position: relative; width: 30px; height: 30px; border-radius: 50%; border: 2px solid var(--borde); background: var(--superficie); color: transparent; display: grid; place-items: center; cursor: pointer; flex-shrink: 0; }
  .check::after, .casa-btn::after { content: ""; position: absolute; inset: -7px; }
  .check.activo { background: var(--primario); border-color: var(--primario); color: #fff; }
  .check:disabled { opacity: 0.3; }
  .item img, .img { width: 48px; height: 48px; border-radius: var(--r-s); object-fit: contain; background: #fff; padding: 3px; flex-shrink: 0; display: grid; place-items: center; }
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
  .precio { font-weight: 700; font-size: 0.9rem; white-space: nowrap; }
  .casa-btn { position: relative; width: 34px; height: 34px; border-radius: var(--r-s); border: 0; background: var(--superficie-2); cursor: pointer; filter: grayscale(1); opacity: 0.6; flex-shrink: 0; }
  .casa-btn.activo { filter: none; opacity: 1; background: var(--amarillo-claro); }
  .cogido b { text-decoration: line-through; color: var(--texto-2); }
  .cogido img, .casa img { opacity: 0.4; }
  .casa { background: color-mix(in srgb, var(--superficie) 60%, var(--fondo)); }
  .vacia { text-align: center; }
  .despensa { margin-top: 12px; padding: 0; overflow: hidden; }
  .despensa summary { display: flex; align-items: center; gap: 10px; padding: 14px 16px; list-style: none; cursor: pointer; }
  .despensa summary::-webkit-details-marker { display: none; }
  .despensa summary > :global(svg:first-child) { color: var(--primario); flex-shrink: 0; }
  .despensa summary > :global(svg:last-child) { margin-left: auto; color: var(--texto-3); flex-shrink: 0; }
  .despensa summary span { display: grid; }
  .despensa summary small { font-size: 0.76rem; color: var(--texto-2); }
  .despensa ul { list-style: none; margin: 0; padding: 0 16px; }
  .despensa li { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-top: 1px solid var(--linea); }
  .despensa li span { flex: 1; min-width: 0; display: grid; }
  .despensa li b { font-size: 0.88rem; font-weight: 600; }
  .despensa li small { font-size: 0.74rem; color: var(--texto-2); }
  .despensa .pie-nota { padding: 0 16px 12px; margin: 4px 0 0; }
  .borrar-d { display: grid; place-items: center; width: 40px; height: 40px; border: 0; border-radius: var(--r-s); background: none; color: var(--texto-3); cursor: pointer; flex-shrink: 0; }
</style>
