<script>
  import Icono from '../../components/Icono.svelte';
  import Emoji from '../../components/Emoji.svelte';
  import { PRECIOS_INFO } from '../../data/precios.js';
  import { ALIMENTOS } from '../../data/alimentos.js';
  import { estado, actualizar } from '../../stores/estado.js';
  import { avisar } from '../../stores/ui.js';
  import { hoyISO } from '../../lib/planificador.js';
  import { listaCompra, textoEnvases } from '../../lib/compra.js';
  import { euros } from '../../lib/formato.js';

  const hoy = hoyISO();
  const lista = $derived.by(() => {
    const plan = $estado.plan;
    if (!plan) return null;
    const dias = $estado.compra.soloRestantes ? plan.dias.map((d, i) => (d.fecha >= hoy ? i : -1)).filter((i) => i >= 0) : null;
    return listaCompra(plan, dias);
  });
  const enCasa = $derived($estado.compra.enCasa || {});
  const marcados = $derived($estado.compra.marcados);
  const comprar = $derived(lista ? lista.grupos.flatMap((g) => g.items).filter((i) => !enCasa[i.id]) : []);
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
    for (const g of lista.grupos) {
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

  {#each [...lista.grupos, ...(lista.despensa.length ? [{ nombre: 'Despensa · revisa si te queda', items: lista.despensa }] : [])] as g (g.nombre)}
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
          <span class="info">
            <b>{it.producto?.nombre || it.nombre}</b>
            <small>{casa ? 'Lo tienes en casa' : textoEnvases(it)} · usas {Math.round(it.gramos)} {ALIMENTOS[it.id].medida || 'g'}</small>
          </span>
          <span class="precio">{casa ? '—' : euros(it.coste)}</span>
          <button class="casa-btn" class:activo={casa} aria-pressed={casa} aria-label="Lo tengo en casa" onclick={() => alternar('enCasa', it.id)}><Icono e="🏠" tam={18} /></button>
        </li>
      {/each}
    </ul>
  {/each}
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
  .check { width: 30px; height: 30px; border-radius: 50%; border: 2px solid var(--borde); background: var(--superficie); color: transparent; display: grid; place-items: center; cursor: pointer; flex-shrink: 0; }
  .check.activo { background: var(--primario); border-color: var(--primario); color: #fff; }
  .check:disabled { opacity: 0.3; }
  .item img, .img { width: 48px; height: 48px; border-radius: 12px; object-fit: contain; background: #fff; padding: 3px; flex-shrink: 0; display: grid; place-items: center; }
  .info { flex: 1; min-width: 0; display: grid; }
  .info b { font-size: 0.9rem; line-height: 1.25; }
  .info small { color: var(--texto-2); font-weight: 600; font-size: 0.76rem; }
  .precio { font-weight: 800; font-size: 0.9rem; white-space: nowrap; }
  .casa-btn { width: 34px; height: 34px; border-radius: 10px; border: 0; background: var(--superficie-2); cursor: pointer; filter: grayscale(1); opacity: 0.6; flex-shrink: 0; }
  .casa-btn.activo { filter: none; opacity: 1; background: var(--amarillo-claro); }
  .cogido b { text-decoration: line-through; color: var(--texto-2); }
  .cogido img, .casa img { opacity: 0.4; }
  .casa { background: color-mix(in srgb, var(--superficie) 60%, var(--fondo)); }
  .vacia { text-align: center; }
</style>
