<script>
  import Icono from '../components/Icono.svelte';
  // Centro de registro (botón ➕): escanear, buscar, comer fuera, mis comidas, foto y recientes
  import { get } from 'svelte/store';
  import { fly, slide } from 'svelte/transition';
  import Emoji from '../components/Emoji.svelte';
  import Macros from '../components/Macros.svelte';
  import Cantidad from './Cantidad.svelte';
  import Escaner from './Escaner.svelte';
  import Buscar from './Buscar.svelte';
  import Fuera from './Fuera.svelte';
  import MisComidas from './MisComidas.svelte';
  import { estado, añadirRegistro, nuevoId, horaActual, actualizar } from '../stores/estado.js';
  import { cerrarHoja, avisar, abrirHoja } from '../stores/ui.js';
  import { crearRegistro } from '../lib/registro.js';
  import { guardarFoto } from '../lib/fotos.js';
  import { objetivosActuales } from '../lib/acciones.js';
  import { hoyISO, sumarDias } from '../lib/planificador.js';
  import { franjaPorHora } from '../lib/formato.js';

  let { fecha = hoyISO(), franja: franjaInicial = null, vista: vistaInicial = 'inicio' } = $props();
  const e = get(estado);
  const objetivos = objetivosActuales();
  const dia = e.plan?.dias.find((d) => d.fecha === fecha);
  const NOMBRES = { desayuno: 'Desayuno', media: 'Media mañana', comida: 'Comida', merienda: 'Merienda', cena: 'Cena', recena: 'Antes de dormir' };
  const nombreDe = (c) => (['media', 'merienda'].includes(c.franja) && c.hora ? (c.hora < '14:00' ? 'Media mañana' : 'Merienda') : NOMBRES[c.franja]);
  const franjas = [...(dia?.comidas || Object.keys(NOMBRES).map((f) => ({ franja: f }))).map((c) => ({ id: c.franja, nombre: nombreDe(c), hora: c.hora })), { id: null, nombre: 'Picoteo', hora: null }];

  let franja = $state(franjaInicial ?? franjaPorHora(dia?.comidas));
  let vista = $state(vistaInicial);
  let item = $state(null);
  let foto = $state(null);
  let fotoUrl = $state(null);
  let inputFoto = $state();

  const franjaSel = $derived(franjas.find((f) => f.id === franja) || franjas.at(-1));
  const ctx = $derived({ perfil: e.perfil, objetivos, franja });
  const TITULOS = { escanear: 'Escanear código', buscar: 'Buscar', fuera: 'Comer fuera', propias: 'Mis comidas', cantidad: '¿Cuánto?' };

  function elegir(nuevo) {
    item = nuevo;
    vista = 'cantidad';
  }

  // Tu plato: varias cosas sueltas (la sopa, la pasta, el pollo…) que se guardan juntas en la misma comida
  let plato = $state([]);
  let comoMia = $state(false);
  let nombreMia = $state('');
  const totalPlato = $derived(plato.reduce((t, r) => ({ kcal: t.kcal + r.macros.kcal, p: t.p + r.macros.p, c: t.c + r.macros.c, g: t.g + r.macros.g, f: t.f + (r.macros.f || 0) }), { kcal: 0, p: 0, c: 0, g: 0, f: 0 }));
  const horaComida = () => (franjaSel?.hora && franjaSel.hora < horaActual() ? franjaSel.hora : horaActual());

  function alPlato(cantidad) {
    plato = [...plato, crearRegistro({ item, cantidad, fecha, franja, hora: horaComida(), foto, ctx })];
    item = null;
    vista = 'buscar';
  }
  function quitarDelPlato(id) {
    plato = plato.filter((r) => r.id !== id);
  }

  function guardarPlato() {
    if (!plato.length) return;
    const hora = horaComida();
    for (const r of plato) añadirRegistro(fecha, { ...r, hora, franja, foto: foto || undefined });
    if (comoMia && plato.length > 1) {
      const ingredientes = plato.every((r) => r.tipo === 'alimento') ? plato.map((r) => ({ a: r.ref, g: Math.round(r.cantidad.valor) })) : null;
      const nombre = nombreMia.trim() || plato.map((r) => r.nombre).join(' + ');
      actualizar((x) => { x.propias.unshift({ id: nuevoId(), nombre, emoji: '🍲', macros: { ...totalPlato }, ingredientes }); });
    }
    avisar(plato.length > 1 ? `${plato.length} cosas · ${Math.round(totalPlato.kcal)} kcal` : `${plato[0].nombre} · ${Math.round(plato[0].macros.kcal)} kcal`, '✅');
    cerrarHoja();
  }

  function añadir(cantidad) {
    plato = [...plato, crearRegistro({ item, cantidad, fecha, franja, hora: horaComida(), foto, ctx })];
    guardarPlato();
  }

  function repetir(rec) {
    const r = { ...rec, id: nuevoId(), fecha, franja, hora: horaActual(), foto: undefined };
    delete r.clave;
    añadirRegistro(fecha, r);
    avisar(`${r.nombre} · ${Math.round(r.macros.kcal)} kcal`, '🔁');
    cerrarHoja();
  }

  // Ayer: repetir lo de esta comida o copiar el día entero (si hoy aún está vacío)
  const ayer = sumarDias(fecha, -1);
  const deAyer = e.registros[ayer] || [];
  const hoyLleva = e.registros[fecha] || [];
  const ayerFranja = $derived(deAyer.filter((r) => (r.franja ?? null) === franja));
  const franjaHecha = $derived(hoyLleva.some((r) => (r.franja ?? null) === franja));
  const kcalDe = (l) => Math.round(l.reduce((t, r) => t + (r.macros?.kcal || 0), 0));
  const nombresDe = (l) => l.map((r) => r.nombre).join(' + ');

  function copiar(lista, mismaFranja) {
    const ids = [];
    for (const r of lista) {
      const nuevo = { ...r, id: nuevoId(), fecha, foto: undefined, ...(mismaFranja ? {} : { franja, hora: horaComida() }) };
      delete nuevo.clave;
      añadirRegistro(fecha, nuevo);
      ids.push(nuevo.id);
    }
    return ids;
  }
  const deshacerCopia = (ids) => () => actualizar((x) => { x.registros[fecha] = (x.registros[fecha] || []).filter((r) => !ids.includes(r.id)); });
  function repetirAyer() {
    const ids = copiar(ayerFranja, false);
    avisar(`Como ayer · ${kcalDe(ayerFranja)} kcal`, '🔁', deshacerCopia(ids));
    cerrarHoja();
  }
  function copiarDia() {
    const ids = copiar(deAyer, true);
    avisar(`Día de ayer copiado · ${kcalDe(deAyer)} kcal`, '🔁', deshacerCopia(ids));
    cerrarHoja();
  }

  // Tus habituales: lo que más apuntas (últimos 30 días, con la misma cantidad), a un toque
  const habituales = (() => {
    const cuenta = new Map();
    const desde = sumarDias(fecha, -30);
    for (const [f, lista] of Object.entries(e.registros || {})) {
      if (f < desde || f > fecha) continue;
      for (const r of lista) {
        if (r.tipo === 'plan') continue;
        const k = `${r.tipo}|${r.ref || r.nombre}|${r.cantidad?.texto || ''}`;
        const c = cuenta.get(k) || { n: 0, r, k };
        c.n++;
        c.r = r;
        cuenta.set(k, c);
      }
    }
    return [...cuenta.values()].filter((c) => c.n >= 2).sort((a, b) => b.n - a.n).slice(0, 8);
  })();
  const enHabituales = new Set(habituales.map((c) => `${c.r.tipo}:${c.r.ref || c.r.nombre}`));

  async function alFoto(ev) {
    const archivo = ev.currentTarget.files?.[0];
    if (!archivo) return;
    const id = nuevoId();
    try {
      await guardarFoto(id, archivo);
      foto = id;
      fotoUrl = URL.createObjectURL(archivo);
      vista = 'buscar';
    } catch {
      avisar('No he podido guardar la foto', '⚠️');
    }
  }

  function atras() {
    vista = vista === 'cantidad' ? (item?.tipo === 'fuera' ? 'fuera' : item?.tipo === 'propia' ? 'propias' : 'buscar') : 'inicio';
  }
</script>

<div class="registrar">
  {#if vista !== 'inicio'}
    <div class="nav">
      <button class="atras" onclick={atras} aria-label="Atrás"><Icono n="arrow-left" tam={20} /></button>
      <b>{TITULOS[vista]}</b>
      <span class="franja-chip">{franjaSel.nombre}</span>
    </div>
  {/if}

  {#if fotoUrl}
    <div class="foto-adjunta"><img src={fotoUrl} alt="Foto del plato" /><span><Icono e="📸" tam={18} /> Foto adjunta: ahora dime qué es</span></div>
  {/if}

  {#if plato.length && vista !== 'cantidad'}
    <section class="plato" aria-label="Tu plato">
      <div class="plato-cab"><b>Tu plato</b><span class="cifra">{Math.round(totalPlato.kcal)} kcal</span></div>
      <ul>
        {#each plato as r (r.id)}
          <li transition:slide={{ duration: 200 }}>
            <span class="pl-n"><b>{r.nombre}</b><small>{r.cantidad?.texto || ''} · {Math.round(r.macros.kcal)} kcal</small></span>
            <button class="papelera" aria-label="Quitar {r.nombre}" onclick={() => quitarDelPlato(r.id)}><Icono n="trash" tam={17} /></button>
          </li>
        {/each}
      </ul>
      <Macros m={totalPlato} kcal={false} />
      {#if plato.length > 1}
        <label class="mia"><input type="checkbox" bind:checked={comoMia} /> Guardarlo también en Mis comidas para repetirlo</label>
        {#if comoMia}<input class="mia-nombre" bind:value={nombreMia} placeholder={plato.map((r) => r.nombre).join(' + ').slice(0, 60)} aria-label="Nombre del plato" />{/if}
      {/if}
      <button class="boton" onclick={guardarPlato}>Guardar en {franjaSel.nombre.toLowerCase()} ({plato.length})</button>
      <p class="pie-nota">O busca abajo lo siguiente que quieras añadir.</p>
    </section>
  {/if}

  {#key vista}
    <div in:fly={{ x: 30, duration: 180 }}>
      {#if vista === 'inicio'}
        <div class="franjas" role="radiogroup" aria-label="¿Qué comida es?">
          {#each franjas as f (f.id)}
            <button role="radio" aria-checked={franja === f.id} class:activa={franja === f.id} onclick={() => (franja = f.id)}>
              {f.nombre}{#if f.hora}<small>{f.hora}</small>{/if}
            </button>
          {/each}
        </div>

        {#if habituales.length}
          <h3 class="grupo">Tus habituales</h3>
          <div class="habituales">
            {#each habituales as { r, n, k } (k)}
              <button onclick={() => repetir(r)} aria-label="Añadir {r.nombre}, {r.cantidad?.texto || ''}">
                <span class="h-cab"><Icono n="plus" tam={14} grosor={2.6} /><small>{n} veces</small></span>
                <b>{r.nombre}</b>
                <small>{r.cantidad?.texto ? `${r.cantidad.texto} · ` : ''}{Math.round(r.macros.kcal)} kcal</small>
              </button>
            {/each}
          </div>
        {/if}

        {#if (ayerFranja.length && !franjaHecha) || (deAyer.length && !hoyLleva.length)}
          <div class="ayer">
            {#if ayerFranja.length && !franjaHecha}
              <button onclick={repetirAyer}>
                <span class="a-ic"><Icono n="repeat" tam={18} grosor={2.2} /></span>
                <span class="a-txt"><small>{franjaSel.nombre} como ayer · {kcalDe(ayerFranja)} kcal</small><b>{nombresDe(ayerFranja)}</b></span>
              </button>
            {/if}
            {#if deAyer.length && !hoyLleva.length}
              <button onclick={copiarDia}>
                <span class="a-ic"><Icono n="calendar-days" tam={18} grosor={2.2} /></span>
                <span class="a-txt"><small>Todo el día · {kcalDe(deAyer)} kcal</small><b>Copiar lo que comiste ayer ({deAyer.length})</b></span>
              </button>
            {/if}
          </div>
        {/if}

        <div class="opciones-grandes">
          <button class="op op-escanear" onclick={() => (vista = 'escanear')}><Icono n="scan-barcode" tam={28} /><b>Escanear</b><small>Código de barras</small></button>
          <button class="op op-buscar" onclick={() => (vista = 'buscar')}><Icono n="search" tam={28} /><b>Buscar</b><small>Alimento o producto</small></button>
          <button class="op op-fuera" onclick={() => (vista = 'fuera')}><Icono n="utensils" tam={28} /><b>Comer fuera</b><small>Bar, restaurante…</small></button>
          <button class="op op-mias" onclick={() => (vista = 'propias')}><Icono n="chef-hat" tam={28} /><b>Mis comidas</b><small>Las tuyas</small></button>
          <button class="op op-foto" onclick={() => inputFoto.click()}><Icono n="camera" tam={28} /><b>Foto</b><small>Guárdala en tu diario</small></button>
        </div>
        <input bind:this={inputFoto} type="file" accept="image/*" capture="environment" hidden onchange={alFoto} />

        {#if e.recientes.some((r) => !enHabituales.has(r.clave))}
          <h3 class="grupo">Lo último que apuntaste</h3>
          <ul class="recientes">
            {#each e.recientes.filter((r) => !enHabituales.has(r.clave)).slice(0, 8) as r (r.clave)}
              <li><button onclick={() => repetir(r)}>
                {#if r.imagen && r.tipo === 'producto'}<img src={r.imagen} alt="" />{:else}<span class="ic"><Emoji e={r.emoji || '🍽️'} tam={26} /></span>{/if}
                <span class="txt"><b>{r.nombre}</b><small>{r.cantidad?.texto} · {Math.round(r.macros.kcal)} kcal</small></span>
                <span class="mas">+</span>
              </button></li>
            {/each}
          </ul>
        {/if}
      {:else if vista === 'escanear'}
        <Escaner onproducto={(p) => elegir({ tipo: 'producto', producto: p })} />
      {:else if vista === 'buscar'}
        <Buscar onelegir={elegir} />
      {:else if vista === 'fuera'}
        <button class="a-guia" onclick={() => abrirHoja('guiaFuera')}><Icono n="lightbulb" tam={18} /> <span><b>¿No sabes qué pedir?</b> Guía por tipo de sitio</span> <Icono n="chevron-right" tam={18} /></button>
        <Fuera onelegir={elegir} />
      {:else if vista === 'propias'}
        <MisComidas onelegir={elegir} />
      {:else if vista === 'cantidad' && item}
        <Cantidad {item} {ctx} franjaNombre={franjaSel.nombre} onañadir={añadir} onmas={alPlato} enPlato={plato.length} />
      {/if}
    </div>
  {/key}
</div>

<style>
  .nav { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
  .nav b { flex: 1; font-size: 1.05rem; }
  .atras { display: grid; place-items: center; flex-shrink: 0; width: 44px; height: 44px; border-radius: 50%; border: 0; background: var(--superficie); box-shadow: var(--sombra); cursor: pointer; color: var(--texto); }
  .franja-chip { padding: 5px 11px; border-radius: 999px; background: var(--primario-claro); color: var(--primario-fuerte); font-weight: 800; font-size: 0.8rem; }
  .franjas { display: flex; gap: 6px; overflow-x: auto; scrollbar-width: none; padding: 2px 0 10px; }
  .franjas::-webkit-scrollbar { display: none; }
  .franjas button { flex-shrink: 0; display: grid; justify-items: center; padding: 8px 14px; border: 1.5px solid transparent; border-radius: 16px; background: var(--superficie); box-shadow: var(--sombra); font-weight: 800; font-size: 0.86rem; cursor: pointer; color: var(--texto); }
  .franjas small { font-size: 0.7rem; color: var(--texto-2); font-weight: 700; }
  .franjas button.activa { border-color: var(--primario); background: var(--primario-claro); }
  .opciones-grandes { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-top: 6px; }
  .op { display: grid; justify-items: start; gap: 2px; padding: 16px; border: 0; border-radius: 20px; cursor: pointer; text-align: left; color: var(--texto); background: var(--superficie); box-shadow: var(--sombra); transition: transform 0.15s var(--ease-out), background 0.2s var(--ease-out); }
  .op:active { transform: scale(0.97); }
  .op :global(.icono) { color: var(--primario); }
  .op b { font-size: 0.98rem; margin-top: 8px; }
  .op small { color: var(--texto-2); font-weight: 500; font-size: 0.76rem; }
  .op-escanear { background: radial-gradient(120% 100% at 0% 0%, rgb(255 91 31 / 0.2), transparent 65%), var(--superficie); }
  .op-foto { grid-column: 1 / -1; grid-template-columns: auto 1fr; column-gap: 14px; align-items: center; }
  .op-foto :global(.icono) { grid-row: span 2; }
  .op-foto b { margin-top: 0; }
  .habituales { display: flex; gap: 8px; overflow-x: auto; scrollbar-width: none; margin: 0 -16px; padding: 2px 16px 6px; scroll-snap-type: x mandatory; scroll-padding-left: 16px; }
  .habituales::-webkit-scrollbar { display: none; }
  .habituales button { flex: 0 0 auto; width: 148px; display: grid; align-content: start; gap: 2px; padding: 10px 12px 12px; border: 0; border-radius: 16px; background: var(--superficie); box-shadow: var(--sombra); text-align: left; color: var(--texto); cursor: pointer; scroll-snap-align: start; transition: transform 0.15s var(--ease-out); }
  .habituales button:active { transform: scale(0.96); }
  .h-cab { display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; }
  .h-cab :global(.icono) { width: 24px; height: 24px; padding: 5px; border-radius: 50%; background: var(--primario); color: var(--sobre-primario); box-sizing: border-box; }
  .h-cab small { color: var(--texto-3); }
  .habituales b { font-size: 0.86rem; line-height: 1.2; display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .habituales small { font-size: 0.72rem; font-weight: 600; color: var(--texto-2); }
  .ayer { display: grid; gap: 6px; margin: 12px 0 4px; }
  .ayer button { display: flex; align-items: center; gap: 12px; width: 100%; min-height: 56px; padding: 8px 12px 8px 8px; border: 1px dashed var(--borde); border-radius: 16px; background: none; color: var(--texto); text-align: left; cursor: pointer; }
  .a-ic { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 12px; background: var(--primario-claro); color: var(--primario-fuerte); flex-shrink: 0; }
  .a-txt { flex: 1; min-width: 0; display: grid; }
  .a-txt small { font-size: 0.74rem; font-weight: 700; color: var(--primario-fuerte); }
  .a-txt b { font-size: 0.88rem; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .a-guia { display: flex; align-items: center; gap: 10px; width: 100%; min-height: 52px; margin-bottom: 10px; padding: 8px 12px; border: 0; border-radius: 16px; background: var(--primario-claro); color: var(--texto-2); font: inherit; font-size: 0.86rem; text-align: left; cursor: pointer; }
  .a-guia span { flex: 1; }
  .a-guia b { color: var(--texto); font-weight: 700; }
  .a-guia :global(.icono) { color: var(--primario); flex-shrink: 0; }
  .grupo { font-size: 0.7rem; font-weight: 700; color: var(--texto-3); margin: 18px 4px 8px; }
  .recientes { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
  .recientes button { width: 100%; display: flex; align-items: center; gap: 12px; padding: 8px 12px 8px 8px; border: 0; border-radius: 16px; background: var(--superficie); box-shadow: var(--sombra); text-align: left; cursor: pointer; color: var(--texto); }
  .recientes img, .ic { width: 42px; height: 42px; border-radius: 12px; object-fit: contain; background: var(--superficie-2); display: grid; place-items: center; flex-shrink: 0; }
  .txt { flex: 1; min-width: 0; display: grid; }
  .txt b { font-size: 0.92rem; }
  .txt small { color: var(--texto-2); font-weight: 600; font-size: 0.78rem; }
  .mas { width: 30px; height: 30px; border-radius: 50%; display: grid; place-items: center; background: var(--primario-claro); color: var(--primario-fuerte); font-weight: 800; }
  .plato { margin: 0 0 14px; padding: 12px 14px; border-radius: 18px; background: var(--primario-claro); }
  .plato-cab { display: flex; justify-content: space-between; align-items: baseline; }
  .plato-cab .cifra { font-weight: 800; color: var(--primario-fuerte); }
  .plato ul { list-style: none; margin: 8px 0; padding: 0; }
  .plato li { display: flex; align-items: center; gap: 8px; padding: 6px 0; border-top: 1px solid var(--linea); }
  .pl-n { flex: 1; min-width: 0; display: grid; }
  .pl-n b { font-size: 0.88rem; line-height: 1.25; }
  .pl-n small { color: var(--texto-2); font-weight: 600; font-size: 0.76rem; }
  .papelera { flex-shrink: 0; display: grid; place-items: center; width: 40px; height: 40px; border: 0; border-radius: 12px; background: none; color: var(--texto-3); cursor: pointer; }
  .papelera:active { color: var(--peligro); background: var(--superficie); }
  .mia { display: flex; align-items: center; gap: 8px; margin: 10px 0 0; font-weight: 600; font-size: 0.84rem; }
  .mia-nombre { width: 100%; min-height: 44px; margin-top: 8px; padding: 8px 12px; border-radius: 12px; border: 1px solid var(--borde); background: var(--superficie); color: var(--texto); font: inherit; }
  .plato .boton { width: 100%; margin-top: 10px; }
  .plato .pie-nota { margin: 8px 0 0; text-align: center; }
  .foto-adjunta { display: flex; align-items: center; gap: 10px; padding: 8px; border-radius: 16px; background: var(--primario-claro); margin-bottom: 10px; font-weight: 600; font-size: 0.84rem; }
  .foto-adjunta img { width: 52px; height: 52px; border-radius: 12px; object-fit: cover; }
</style>
