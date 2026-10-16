<script>
  import Icono from '../components/Icono.svelte';
  // Centro de registro (botón ➕): escanear, buscar, comer fuera, mis comidas, foto y recientes
  import { get } from 'svelte/store';
  import { fly } from 'svelte/transition';
  import Emoji from '../components/Emoji.svelte';
  import Cantidad from './Cantidad.svelte';
  import Escaner from './Escaner.svelte';
  import Buscar from './Buscar.svelte';
  import Fuera from './Fuera.svelte';
  import MisComidas from './MisComidas.svelte';
  import { estado, añadirRegistro, nuevoId, horaActual } from '../stores/estado.js';
  import { cerrarHoja, avisar } from '../stores/ui.js';
  import { crearRegistro } from '../lib/registro.js';
  import { guardarFoto } from '../lib/fotos.js';
  import { objetivosActuales } from '../lib/acciones.js';
  import { hoyISO } from '../lib/planificador.js';
  import { franjaPorHora } from '../lib/formato.js';

  let { fecha = hoyISO(), franja: franjaInicial = null } = $props();
  const e = get(estado);
  const objetivos = objetivosActuales();
  const dia = e.plan?.dias.find((d) => d.fecha === fecha);
  const NOMBRES = { desayuno: 'Desayuno', media: 'Media mañana', comida: 'Comida', merienda: 'Merienda', cena: 'Cena' };
  const nombreDe = (c) => (['media', 'merienda'].includes(c.franja) && c.hora ? (c.hora < '14:00' ? 'Media mañana' : 'Merienda') : NOMBRES[c.franja]);
  const franjas = [...(dia?.comidas || Object.keys(NOMBRES).map((f) => ({ franja: f }))).map((c) => ({ id: c.franja, nombre: nombreDe(c), hora: c.hora })), { id: null, nombre: 'Picoteo', hora: null }];

  let franja = $state(franjaInicial ?? franjaPorHora(dia?.comidas));
  let vista = $state('inicio');
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

  function añadir(cantidad) {
    const hora = franjaSel?.hora && franjaSel.hora < horaActual() ? franjaSel.hora : horaActual();
    const r = crearRegistro({ item, cantidad, fecha, franja, hora, foto, ctx });
    añadirRegistro(fecha, r);
    avisar(`${r.nombre} · ${Math.round(r.macros.kcal)} kcal`, '✅');
    cerrarHoja();
  }

  function repetir(rec) {
    const r = { ...rec, id: nuevoId(), fecha, franja, hora: horaActual(), foto: undefined };
    delete r.clave;
    añadirRegistro(fecha, r);
    avisar(`${r.nombre} · ${Math.round(r.macros.kcal)} kcal`, '🔁');
    cerrarHoja();
  }

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

        <div class="opciones-grandes">
          <button class="op op-escanear" onclick={() => (vista = 'escanear')}><Icono n="scan-barcode" tam={28} /><b>Escanear</b><small>Código de barras</small></button>
          <button class="op op-buscar" onclick={() => (vista = 'buscar')}><Icono n="search" tam={28} /><b>Buscar</b><small>Alimento o producto</small></button>
          <button class="op op-fuera" onclick={() => (vista = 'fuera')}><Icono n="utensils" tam={28} /><b>Comer fuera</b><small>Bar, restaurante…</small></button>
          <button class="op op-mias" onclick={() => (vista = 'propias')}><Icono n="chef-hat" tam={28} /><b>Mis comidas</b><small>Las tuyas</small></button>
          <button class="op op-foto" onclick={() => inputFoto.click()}><Icono n="camera" tam={28} /><b>Foto</b><small>Guárdala en tu diario</small></button>
        </div>
        <input bind:this={inputFoto} type="file" accept="image/*" capture="environment" hidden onchange={alFoto} />

        {#if e.recientes.length}
          <h3 class="grupo">Repetir con un toque</h3>
          <ul class="recientes">
            {#each e.recientes.slice(0, 8) as r (r.clave)}
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
        <Fuera onelegir={elegir} />
      {:else if vista === 'propias'}
        <MisComidas onelegir={elegir} />
      {:else if vista === 'cantidad' && item}
        <Cantidad {item} {ctx} franjaNombre={franjaSel.nombre} onañadir={añadir} />
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
  .op { display: grid; justify-items: start; gap: 2px; padding: 16px; border: 0; border-radius: 20px; cursor: pointer; text-align: left; color: var(--texto); background: var(--superficie); box-shadow: var(--sombra); transition: transform 0.15s, background 0.2s; }
  .op:active { transform: scale(0.97); }
  .op :global(.icono) { color: var(--primario); }
  .op b { font-size: 0.98rem; margin-top: 8px; }
  .op small { color: var(--texto-2); font-weight: 500; font-size: 0.76rem; }
  .op-escanear { background: radial-gradient(120% 100% at 0% 0%, rgb(255 91 31 / 0.2), transparent 65%), var(--superficie); }
  .op-foto { grid-column: 1 / -1; grid-template-columns: auto 1fr; column-gap: 14px; align-items: center; }
  .op-foto :global(.icono) { grid-row: span 2; }
  .op-foto b { margin-top: 0; }
  .grupo { font-size: 0.7rem; font-weight: 700; color: var(--texto-3); margin: 18px 4px 8px; }
  .recientes { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
  .recientes button { width: 100%; display: flex; align-items: center; gap: 12px; padding: 8px 12px 8px 8px; border: 0; border-radius: 16px; background: var(--superficie); box-shadow: var(--sombra); text-align: left; cursor: pointer; color: var(--texto); }
  .recientes img, .ic { width: 42px; height: 42px; border-radius: 12px; object-fit: contain; background: var(--superficie-2); display: grid; place-items: center; flex-shrink: 0; }
  .txt { flex: 1; min-width: 0; display: grid; }
  .txt b { font-size: 0.92rem; }
  .txt small { color: var(--texto-2); font-weight: 600; font-size: 0.78rem; }
  .mas { width: 30px; height: 30px; border-radius: 50%; display: grid; place-items: center; background: var(--primario-claro); color: var(--primario-fuerte); font-weight: 800; }
  .foto-adjunta { display: flex; align-items: center; gap: 10px; padding: 8px; border-radius: 16px; background: var(--primario-claro); margin-bottom: 10px; font-weight: 600; font-size: 0.84rem; }
  .foto-adjunta img { width: 52px; height: 52px; border-radius: 12px; object-fit: cover; }
</style>
