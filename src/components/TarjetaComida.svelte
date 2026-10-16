<script>
  import { slide } from 'svelte/transition';
  import FotoReceta from './FotoReceta.svelte';
  import Macros from './Macros.svelte';
  import Icono from './Icono.svelte';
  import { recetaPorId } from '../lib/planificador.js';
  import { macrosComida, costeComida, cantidadTexto, alimento } from '../lib/nutricion.js';
  import { marcarHecha, alternarSaltada } from '../lib/acciones.js';
  import { abrirHoja } from '../stores/ui.js';
  import { borrarRegistro, editarRegistro } from '../stores/estado.js';
  import { avisar } from '../stores/ui.js';
  import { euros } from '../lib/formato.js';

  /** comida: elemento de estadoDia().comidas (o del plan si editable=false) */
  let { comida, fecha, diaIdx, franjaNombre, nota = '', editable = true } = $props();

  const receta = $derived(recetaPorId[comida.recetaId]);
  const situacion = $derived(comida.situacion || 'pendiente');
  // Si ya la comiste, se muestra lo que registraste (puedes haber cambiado cantidades)
  const comidos = $derived(situacion === 'hecha' && comida.registro?.ingredientes ? comida.registro.ingredientes : comida.ingredientes);
  const m = $derived(macrosComida(comidos));
  let abierta = $state(false);

  // Ajustar lo que comiste de verdad, alimento a alimento
  let editando = $state(null); // { a: gramos }
  const PASO = (a) => (alimento(a).unidad?.g && alimento(a).redondeo === 'unidad' ? alimento(a).unidad.g : alimento(a).medida === 'ml' ? 25 : 5);
  function empezarEdicion() {
    editando = Object.fromEntries(comidos.map((i) => [i.a, i.g]));
  }
  function cambiar(a, delta) {
    editando = { ...editando, [a]: Math.max(0, Math.round((editando[a] || 0) + delta)) };
  }
  function guardarEdicion() {
    editarRegistro(fecha, comida.registro.id, Object.entries(editando).map(([a, g]) => ({ a, g })));
    editando = null;
    avisar('Cantidades guardadas: el día se recalcula', '✅');
  }
  const mEdit = $derived(editando ? macrosComida(Object.entries(editando).map(([a, g]) => ({ a, g }))) : null);
  const ETQ = { pre: 'Pre-entreno', post: 'Post-entreno' };

  function verReceta() {
    abrirHoja('receta', { recetaId: comida.recetaId, ingredientes: comida.ingredientes, titulo: [comida.hora, franjaNombre].filter(Boolean).join(' · '), diaIdx, franja: comida.franja });
  }
</script>

<article class="comida-card s-{situacion}" class:ajustada={comida.ajustada}>
  <div class="fila">
    <button class="miniatura" onclick={verReceta} aria-label="Ver receta">
      <FotoReceta {receta} alto={84} redondeo={16} tamEmoji={44} />
    </button>
    <div class="cuerpo">
      <div class="franja">
        <span>{franjaNombre}</span>
        {#if comida.etiqueta}<span class="etq etq-{comida.etiqueta}">{ETQ[comida.etiqueta]}</span>{/if}
        {#if comida.ajustada && situacion === 'pendiente'}<span class="etq etq-ajuste">Ajustada</span>{/if}
        {#if nota}<span class="etq etq-nota">{nota}</span>{/if}
      </div>
      <button class="titulo" onclick={verReceta}>{receta?.nombre}</button>
      <Macros {m} peque />
      <div class="meta"><span><Icono n="clock" tam={13} /> {receta?.tiempo} min</span><span><Icono n="euro" tam={13} /> {euros(costeComida(comida.ingredientes))}</span></div>
    </div>
    {#if editable && fecha && situacion !== 'saltada' && situacion !== 'sustituida'}
      <button class="check" class:activo={situacion === 'hecha'} aria-pressed={situacion === 'hecha'}
        aria-label={situacion === 'hecha' ? 'Desmarcar' : 'Marcar como comida'} onclick={() => marcarHecha(fecha, comida)}>
        <Icono n="check" tam={18} grosor={3} />
      </button>
    {/if}
  </div>

  {#if comida.pasada && editable && fecha}
    <div class="pasada"><Icono n="clock" tam={15} /> <span>¿Ya la has comido?</span> <button onclick={() => marcarHecha(fecha, comida)}>Sí</button><button onclick={() => alternarSaltada(fecha, comida.franja)}>Me la salté</button></div>
  {/if}
  {#if situacion === 'saltada'}
    <div class="estado-linea"><Icono n="skip-forward" tam={15} /> Saltada <button class="enlace" onclick={() => alternarSaltada(fecha, comida.franja)}>Deshacer</button></div>
  {:else if situacion === 'sustituida'}
    <div class="estado-linea"><Icono n="repeat" tam={15} /> Comiste otra cosa</div>
    {#each comida.otros as r (r.id)}
      <div class="otro">
        <Icono n="utensils" tam={16} />
        <span class="otro-nombre">{r.nombre}{#if r.cantidad?.texto}<small>{' · '}{r.cantidad.texto}</small>{/if}</span>
        <span class="otro-kcal">{Math.round(r.macros.kcal)} kcal</span>
        <button class="borrar" aria-label="Borrar" onclick={() => borrarRegistro(fecha, r.id)}><Icono n="x" tam={15} /></button>
      </div>
    {/each}
  {/if}

  {#if editando}
    <div class="editor" transition:slide={{ duration: 180 }}>
      <p class="editor-cab">¿Cuánto comiste de cada cosa?</p>
      {#each Object.entries(editando) as [a, g] (a)}
        <div class="editor-fila">
          <span class="editor-nombre">{alimento(a).nombre}<small>{g > 0 ? cantidadTexto(a, g) : 'nada'}</small></span>
          <button aria-label="Menos {alimento(a).nombre}" onclick={() => cambiar(a, -PASO(a))}><Icono n="minus" tam={16} /></button>
          <input type="number" inputmode="decimal" min="0" value={g} aria-label="Gramos de {alimento(a).nombre}"
            onchange={(ev) => (editando = { ...editando, [a]: Math.max(0, Number(ev.currentTarget.value) || 0) })} />
          <button aria-label="Más {alimento(a).nombre}" onclick={() => cambiar(a, PASO(a))}><Icono n="plus" tam={16} /></button>
        </div>
      {/each}
      <p class="editor-total">{Math.round(mEdit.kcal)} kcal, {Math.round(mEdit.p)} g de proteína</p>
      <div class="editor-acciones">
        <button class="boton boton-peq" onclick={guardarEdicion}>Guardar</button>
        <button class="boton boton-sec boton-peq" onclick={() => (editando = null)}>Cancelar</button>
      </div>
    </div>
  {:else if abierta}
    <ul class="ingredientes" transition:slide={{ duration: 180 }}>
      {#each comidos as i (i.a)}
        <li>
          <span class="ing-cant">{cantidadTexto(i.a, i.g)}</span>
          <span>{alimento(i.a).nombre}
            {#if comida.ajustada && comida.ingredientesOriginales}
              {@const antes = comida.ingredientesOriginales.find((x) => x.a === i.a)?.g}
              {#if antes && Math.abs(antes - i.g) >= 5}<small class="antes">antes {cantidadTexto(i.a, antes)}</small>{/if}
            {/if}
          </span>
        </li>
      {/each}
    </ul>
  {/if}

  {#if editable && fecha && situacion === 'pendiente'}
    <footer class="acciones">
      <button class:activo={abierta} onclick={() => (abierta = !abierta)}><Icono n="list" tam={15} /> {abierta ? 'Ocultar' : 'Cantidades'}</button>
      <button onclick={() => abrirHoja('alternativas', { diaIdx, franja: comida.franja })}><Icono n="shuffle" tam={15} /> Cambiar</button>
      <button onclick={() => abrirHoja('registrar', { fecha, franja: comida.franja })}><Icono n="repeat" tam={15} /> Otra cosa</button>
      <button onclick={() => alternarSaltada(fecha, comida.franja)}><Icono n="skip-forward" tam={15} /> Saltar</button>
    </footer>
  {:else if editable && fecha && situacion === 'hecha' && comida.registro && !editando}
    <footer class="acciones">
      <button class:activo={abierta} onclick={() => (abierta = !abierta)}><Icono n="list" tam={15} /> {abierta ? 'Ocultar' : 'Cantidades'}</button>
      <button onclick={empezarEdicion}><Icono n="pencil" tam={15} /> Ajustar lo que comí</button>
    </footer>
  {:else if !editable || !fecha}
    <footer class="acciones">
      <button class:activo={abierta} onclick={() => (abierta = !abierta)}><Icono n="list" tam={15} /> Cantidades</button>
      {#if diaIdx !== undefined}<button onclick={() => abrirHoja('alternativas', { diaIdx, franja: comida.franja })}><Icono n="shuffle" tam={15} /> Cambiar</button>{/if}
    </footer>
  {/if}
</article>

<style>
  .comida-card { padding: 10px 0 14px; border-bottom: 1px solid var(--linea); transition: opacity 0.25s; }
  .fila { position: relative; display: flex; gap: 12px; align-items: flex-start; }
  .miniatura { padding: 0; border: 0; background: none; cursor: pointer; width: 84px; flex-shrink: 0; }
  .cuerpo { flex: 1; min-width: 0; padding-right: 42px; display: grid; gap: 1px; }
  .franja { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; font-size: 0.74rem; font-weight: 700; color: var(--texto-3); }
  .etq { padding: 2px 7px; border-radius: 999px; font-size: 0.6rem; letter-spacing: 0.06em; }
  .etq-pre, .etq-post { background: var(--primario-claro); color: var(--primario-fuerte); }
  .etq-ajuste { background: var(--lila-claro); color: var(--lila); }
  .ajustada.s-pendiente .titulo { color: var(--texto); }
  .etq-nota { background: var(--superficie-2); color: var(--texto-2); }
  .titulo { padding: 0; border: 0; background: none; text-align: left; font-weight: 600; font-size: 0.97rem; line-height: 1.3; cursor: pointer; color: var(--texto); margin-top: 2px; }
  .meta { display: flex; flex-wrap: wrap; gap: 4px 14px; margin-top: 5px; font-size: 0.76rem; color: var(--texto-3); }
  .meta span { display: inline-flex; align-items: center; gap: 4px; }
  .check { position: absolute; right: 0; top: 0; width: 36px; height: 36px; border-radius: 50%; border: 1.5px solid var(--borde); background: transparent; color: transparent; display: grid; place-items: center; cursor: pointer; transition: all 0.25s cubic-bezier(.3,1.5,.5,1); }
  .check:hover { border-color: var(--primario); color: var(--primario); }
  .check.activo { background: var(--primario); border-color: var(--primario); color: var(--sobre-primario); transform: scale(1.06); box-shadow: 0 0 16px rgb(255 91 31 / 0.5); }
  .s-hecha .titulo { color: var(--texto-2); }
  .s-saltada .fila, .s-sustituida .fila { opacity: 0.45; }
  .pasada { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; margin-top: 10px; padding: 8px 10px; border-radius: 12px; background: var(--amarillo-claro); color: var(--aviso-texto); font-size: 0.8rem; font-weight: 600; }
  .pasada span { flex: 1; }
  .pasada button { padding: 5px 10px; border-radius: 999px; border: 0; background: rgb(255 255 255 / 0.08); color: var(--texto); font-weight: 600; font-size: 0.76rem; cursor: pointer; }
  .estado-linea { display: flex; align-items: center; gap: 6px; margin-top: 10px; font-size: 0.8rem; font-weight: 600; color: var(--texto-2); }
  .otro { display: flex; align-items: center; gap: 8px; margin-top: 6px; padding: 8px 10px; border-radius: 12px; background: var(--superficie-2); font-size: 0.84rem; font-weight: 600; color: var(--texto-2); }
  .otro-nombre { flex: 1; min-width: 0; color: var(--texto); }
  .otro-nombre small { color: var(--texto-2); font-weight: 500; }
  .otro-kcal { white-space: nowrap; }
  .borrar { display: grid; place-items: center; border: 0; background: none; color: var(--texto-3); cursor: pointer; padding: 4px; }
  .ingredientes { margin-top: 12px; padding-top: 10px; border-top: 1px solid var(--linea); }
  .editor { margin-top: 12px; padding: 12px; border-radius: 16px; background: var(--superficie); box-shadow: var(--sombra); }
  .editor-cab { margin: 0 0 8px; font-weight: 600; font-size: 0.88rem; }
  .editor-fila { display: grid; grid-template-columns: 1fr 34px 70px 34px; gap: 6px; align-items: center; padding: 6px 0; border-top: 1px solid var(--linea); }
  .editor-nombre { display: grid; font-size: 0.82rem; line-height: 1.25; min-width: 0; }
  .editor-nombre small { color: var(--texto-3); }
  .editor-fila button { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 50%; border: 0; background: var(--superficie-2); color: var(--texto); cursor: pointer; }
  .editor-fila input { width: 100%; min-height: 34px; padding: 4px 6px; border-radius: 10px; border: 1px solid var(--borde); background: var(--superficie-2); color: var(--texto); text-align: center; font-weight: 700; font-variant-numeric: tabular-nums; }
  .editor-total { margin: 10px 0 0; font-size: 0.82rem; color: var(--texto-2); }
  .editor-acciones { display: flex; gap: 8px; margin-top: 10px; }
  .antes { display: block; color: var(--lila); font-weight: 600; font-size: 0.78rem; }
  .acciones { display: flex; gap: 6px; margin-top: 10px; overflow-x: auto; scrollbar-width: none; }
  .acciones::-webkit-scrollbar { display: none; }
  .acciones button { flex-shrink: 0; display: inline-flex; align-items: center; gap: 5px; padding: 7px 10px; border-radius: 10px; border: 0; background: var(--superficie-2); font-weight: 600; font-size: 0.74rem; cursor: pointer; color: var(--texto-2); transition: background 0.15s, color 0.15s; }
  .acciones button:hover, .acciones button.activo { background: var(--primario-claro); color: var(--primario-fuerte); }
</style>
