<script>
  import { slide } from 'svelte/transition';
  import FotoReceta from './FotoReceta.svelte';
  import Portada from './Portada.svelte';
  import Valorar from './Valorar.svelte';
  import { FOTOS_RECETAS } from '../data/fotos.js';
  import { composicion } from '../lib/composicion.js';
  import Macros from './Macros.svelte';
  import Icono from './Icono.svelte';
  import ListaIngredientes from './ListaIngredientes.svelte';
  import ElegirAlimento from './ElegirAlimento.svelte';
  import { racionTipica } from '../lib/raciones.js';
  import { recetaPorId } from '../lib/planificador.js';
  import { macrosComida, costeComida, cantidadTexto, alimento } from '../lib/nutricion.js';
  import { marcarHecha, alternarSaltada, quitarRegistro, tomarBatido, mantenerComida } from '../lib/acciones.js';
  import { estado } from '../stores/estado.js';
  import { abrirHoja, avisar } from '../stores/ui.js';
  import { editarRegistro } from '../stores/estado.js';
  import { euros } from '../lib/formato.js';

  /** comida: elemento de estadoDia().comidas (o del plan si editable=false) */
  /** destacada: es la próxima comida pendiente (su botón «Hecha» va en naranja) */
  /** plegable: si ya está hecha, se ve en una línea y se despliega al tocar (para no llenar Hoy) */
  /** portada: la comida que toca ahora, a lo grande con su foto (como la sesión de hoy en Entreno) */
  let { comida, fecha, diaIdx, franjaNombre, nota = '', editable = true, destacada = true, plegable = false, compacta = false, portada = false, porque = '' } = $props();
  let desplegada = $state(false);
  // Plegada: hecha (si es plegable) o siempre que se pida en línea (compacta), hasta que la toques
  const plegada = $derived(((plegable && situacion !== 'pendiente') || compacta) && !desplegada);

  const receta = $derived(recetaPorId[comida.recetaId]);
  const situacion = $derived(comida.situacion || 'pendiente');
  // Si ya la comiste, se muestra lo que registraste (puedes haber cambiado cantidades)
  const comidos = $derived(situacion === 'hecha' && comida.registro?.ingredientes ? comida.registro.ingredientes : comida.ingredientes);
  const m = $derived(macrosComida(comidos));
  let abierta = $state(false);
  let mas = $state(false); // fila de acciones secundarias (⋯)

  // Ajustar lo que comiste de verdad, alimento a alimento
  let editando = $state(null); // { a: gramos }
  const PASO = (a) => (alimento(a).unidad?.g && alimento(a).redondeo === 'unidad' ? alimento(a).unidad.g : alimento(a).medida === 'ml' ? 25 : 5);
  function empezarEdicion() {
    editando = Object.fromEntries(comidos.map((i) => [i.a, i.g]));
    mas = false;
  }
  let añadiendo = $state(false);
  function añadirAlimento(id) {
    editando = { ...editando, [id]: (editando[id] || 0) + racionTipica(id) };
    añadiendo = false;
  }
  function cambiar(a, delta) {
    editando = { ...editando, [a]: Math.max(0, Math.round((editando[a] || 0) + delta)) };
  }
  function quitarAlimento(a) {
    const { [a]: _, ...resto } = editando;
    editando = resto;
  }
  function guardarEdicion() {
    const lista = Object.entries(editando).map(([a, g]) => ({ a, g: Math.round(g) })).filter((i) => i.g > 0);
    if (!lista.length) { avisar('Deja al menos un alimento, o desmarca la comida', '⚠️'); return; }
    if (comida.registro) {
      editarRegistro(fecha, comida.registro.id, lista);
      avisar('Cantidades guardadas: el día se recalcula', '✅');
    } else {
      // Aún sin hacer: se registra ya con tus cambios
      marcarHecha(fecha, { ...comida, ingredientes: lista });
    }
    editando = null;
  }
  const mEdit = $derived(editando ? macrosComida(Object.entries(editando).map(([a, g]) => ({ a, g }))) : null);
  const ETQ = { pre: 'Pre-entreno', post: 'Post-entreno' };
  const tieneFoto = $derived(!!FOTOS_RECETAS[receta?.id] && !receta?.sinFoto);
  // Sin foto: el plato visto desde arriba, en anillo (proteína, hidrato, verdura)
  const anillo = $derived.by(() => {
    const c = composicion(receta);
    const p = Math.round(c.p * 100), pc = Math.round((c.p + c.c) * 100);
    return `conic-gradient(from -90deg, var(--coral) 0 ${p}%, var(--amarillo) ${p}% ${pc}%, var(--exito) ${pc}% 100%)`;
  });

  function verReceta() {
    abrirHoja('receta', { recetaId: comida.recetaId, ingredientes: comida.ingredientes, titulo: [comida.hora, franjaNombre].filter(Boolean).join(' · '), diaIdx, franja: comida.franja });
  }
</script>

<article class="comida-card s-{situacion}" class:ajustada={comida.ajustada} class:plegada class:con-portada={portada && !plegada}>
{#if plegada}
  <button class="fila-plegada" onclick={() => (desplegada = true)} aria-expanded="false">
    <span class="pl-ok" class:pendiente={situacion === 'pendiente'}><Icono n={situacion === 'hecha' ? 'check' : situacion === 'saltada' || situacion === 'sobra' ? 'skip-forward' : situacion === 'sustituida' ? 'repeat' : 'utensils'} tam={15} grosor={2.4} /></span>
    <span class="pl-txt"><small>{comida.hora && !compacta ? `${comida.hora} · ` : ''}{franjaNombre}{situacion === 'saltada' ? ' · saltada' : situacion === 'sobra' ? ' · hoy no hace falta' : situacion === 'sustituida' ? ' · comiste otra cosa' : ''}</small><b>{situacion === 'sustituida' ? comida.otros.map((r) => r.nombre).join(', ') : receta?.nombre}</b></span>
    {#if situacion !== 'saltada' && situacion !== 'sobra'}<span class="pl-kcal cifra">{Math.round(situacion === 'sustituida' ? comida.otros.reduce((t, r) => t + r.macros.kcal, 0) : m.kcal)}<small> kcal</small></span>{/if}
    <Icono n="chevron-down" tam={18} />
  </button>
{:else}
  {#if portada}
    <Portada foto={tieneFoto ? `img/recetas/${receta.id}.webp` : ''} color="var(--primario)" alto={tieneFoto ? 300 : 240} duotono={false} etiqueta="Comida que toca ahora">
      <div class="pc-sup">
        <span class="pc-tipo"><Icono n="utensils" tam={14} grosor={2.2} /> {franjaNombre}{comida.hora ? ` · ${comida.hora}` : ''}</span>
        {#if comida.etiqueta}<span class="pc-etq">{ETQ[comida.etiqueta]}</span>{/if}
        {#if comida.ajustada && situacion === 'pendiente'}<span class="pc-etq">Ajustada</span>{/if}
        {#if receta?.fuera || receta?.viaje}<button class="pc-guia" onclick={() => abrirHoja('guiaFuera', { sitio: receta.fuera ? 'menu' : 'super' })}><Icono n="lightbulb" tam={14} grosor={2.2} /> Qué pedir</button>{/if}
      </div>
      {#if !tieneFoto}<span class="pc-anillo" style="background:{anillo}" aria-hidden="true"></span>{/if}
      <button class="pc-titulo" onclick={verReceta}>{receta?.nombre}</button>
      {#if porque}<p class="pc-porque">{porque}</p>{/if}
      <div class="pc-cifras">
        <div><b class="cifra">{Math.round(m.kcal)}</b><small>kcal</small></div>
        <div><b class="cifra">{Math.round(m.p)}<span>g</span></b><small>proteína</small></div>
        {#if receta?.tiempo}<div><b class="cifra">{receta.tiempo}<span>min</span></b><small>preparar</small></div>{/if}
        <div><b class="cifra">{euros(costeComida(comida.ingredientes))}</b><small>coste</small></div>
      </div>
    </Portada>
  {:else}
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
        <div class="meta"><span><Icono n="clock" tam={13} /> {receta?.tiempo} min</span><span><Icono n="euro" tam={13} /> {euros(costeComida(comida.ingredientes))}</span>{#if receta?.fuera || receta?.viaje}<button class="meta-guia" onclick={() => abrirHoja('guiaFuera', { sitio: receta.fuera ? 'menu' : 'super' })}><Icono n="lightbulb" tam={13} /> Qué pedir</button>{/if}</div>
      </div>
    </div>
  {/if}

  {#if situacion === 'saltada'}
    <div class="estado-linea"><Icono n="skip-forward" tam={15} /> <span>Saltada</span> <button class="boton-linea" onclick={() => alternarSaltada(fecha, comida.franja)}>Deshacer</button></div>
    {#if $estado.perfil?.whey && editable}
      <button class="batido" onclick={() => tomarBatido(fecha, comida.franja)}><Icono n="cup-soda" tam={16} /> Me he tomado un batido de proteína</button>
    {/if}
  {:else if situacion === 'sobra'}
    <div class="estado-linea"><Icono n="sparkles" tam={15} /> <span>Hoy no hace falta: con lo que llevas, el resto del día ya cuadra</span></div>
    {#if editable}<button class="boton-linea" onclick={() => mantenerComida(fecha, comida.franja)}>Me la tomo igualmente</button>{/if}
  {:else if situacion === 'sustituida'}
    <div class="estado-linea"><Icono n="repeat" tam={15} /> <span>Comiste otra cosa</span></div>
    {#each comida.otros as r (r.id)}
      <div class="otro">
        <Icono n="utensils" tam={16} />
        <span class="otro-nombre">{r.nombre}{#if r.cantidad?.texto}<small>{' · '}{r.cantidad.texto}</small>{/if}</span>
        <span class="otro-kcal">{Math.round(r.macros.kcal)} kcal</span>
        <button class="borrar" aria-label="Borrar {r.nombre}" onclick={() => quitarRegistro(fecha, r.id)}><Icono n="trash" tam={16} /></button>
      </div>
    {/each}
  {/if}

  {#if editando}
    <div class="editor" transition:slide={{ duration: 180 }}>
      <p class="editor-cab">¿Cuánto comiste de cada cosa?</p>
      {#each Object.entries(editando) as [a, g] (a)}
        <div class="editor-fila" transition:slide={{ duration: 160 }}>
          <span class="editor-nombre">{alimento(a).nombre}<small>{g > 0 ? cantidadTexto(a, g) : 'nada'}</small></span>
          <button aria-label="Menos {alimento(a).nombre}" onclick={() => cambiar(a, -PASO(a))}><Icono n="minus" tam={16} /></button>
          <input enterkeyhint="done" type="number" inputmode="decimal" min="0" value={g} aria-label="Gramos de {alimento(a).nombre}"
            onchange={(ev) => (editando = { ...editando, [a]: Math.max(0, Number(ev.currentTarget.value) || 0) })} />
          <button aria-label="Más {alimento(a).nombre}" onclick={() => cambiar(a, PASO(a))}><Icono n="plus" tam={16} /></button>
          <button class="papelera" aria-label="Quitar {alimento(a).nombre}" onclick={() => quitarAlimento(a)}><Icono n="trash" tam={17} /></button>
        </div>
      {:else}
        <p class="pie-nota">No queda nada: añade un alimento o cancela.</p>
      {/each}
      {#if añadiendo}
        <div class="editor-anadir" transition:slide={{ duration: 160 }}>
          <ElegirAlimento excluir={Object.keys(editando)} onelegir={añadirAlimento} max={30} />
          <button class="enlace" onclick={() => (añadiendo = false)}>Cerrar</button>
        </div>
      {:else}
        <button class="editor-mas" onclick={() => (añadiendo = true)}><Icono n="plus" tam={16} /> Añadir otro alimento</button>
      {/if}
      <p class="editor-total">{Math.round(mEdit.kcal)} kcal, {Math.round(mEdit.p)} g de proteína</p>
      <div class="editor-acciones">
        <button class="boton boton-peq" onclick={guardarEdicion}>{comida.registro ? 'Guardar' : 'Guardar como hecha'}</button>
        <button class="boton boton-sec boton-peq" onclick={() => (editando = null)}>Cancelar</button>
      </div>
    </div>
  {:else if abierta}
    <div class="ing-caja" transition:slide={{ duration: 180 }}>
      <ListaIngredientes ingredientes={comidos} antes={comida.ajustada ? comida.ingredientesOriginales : null} />
    </div>
  {/if}

  {#snippet botonCantidades()}
    <button class:activo={abierta} aria-expanded={abierta} onclick={() => (abierta = !abierta)}><Icono n="list" tam={16} /> {abierta ? 'Ocultar cantidades' : 'Cantidades'}</button>
  {/snippet}
  {#snippet botonCambiar()}
    <button onclick={() => abrirHoja('alternativas', { diaIdx, franja: comida.franja })}><Icono n="shuffle" tam={16} /> Cambiar</button>
  {/snippet}
  {#snippet botonMas()}
    <button class="solo-icono" class:activo={mas} aria-expanded={mas} aria-label="Más opciones" onclick={() => (mas = !mas)}><Icono n="ellipsis" tam={18} /></button>
  {/snippet}

  <!-- Una acción principal por estado; el resto, tras «⋯» -->
  {#if editable && fecha && situacion === 'pendiente' && !editando}
    <footer class="acciones">
      {#if comida.pasada}<p class="pregunta"><Icono n="clock" tam={14} /> ¿Ya la has comido?</p>{/if}
      <button class="principal" class:suave={!destacada && !comida.pasada} aria-label="Marcar {franjaNombre.toLowerCase()} como comida" onclick={() => marcarHecha(fecha, comida)}>
        <Icono n="check" tam={17} grosor={2.6} /> {comida.pasada ? 'Sí' : 'Hecha'}
      </button>
      {#if comida.pasada}
        <button onclick={() => alternarSaltada(fecha, comida.franja)}><Icono n="skip-forward" tam={16} /> Me la salté</button>
      {:else}
        {@render botonCambiar()}
      {/if}
      {@render botonMas()}
    </footer>
    {#if mas}
      <div class="acciones secundarias" transition:slide={{ duration: 160 }}>
        {@render botonCantidades()}
        {#if comida.pasada}{@render botonCambiar()}{/if}
        <button onclick={empezarEdicion}><Icono n="pencil" tam={16} /> Ajustar o quitar algo</button>
        <button onclick={() => abrirHoja('registrar', { fecha, franja: comida.franja })}><Icono n="repeat" tam={16} /> Comí otra cosa</button>
        {#if !comida.pasada}<button onclick={() => alternarSaltada(fecha, comida.franja)}><Icono n="skip-forward" tam={16} /> Saltar</button>{/if}
      </div>
    {/if}
  {:else if editable && fecha && situacion === 'hecha' && !editando}
    <footer class="acciones">
      <button class="principal activo" aria-pressed="true" aria-label="Hecha. Toca para desmarcar" onclick={() => marcarHecha(fecha, comida)}>
        <Icono n="check" tam={17} grosor={2.6} /> Hecha
      </button>
      {#if comida.registro}<button onclick={empezarEdicion}><Icono n="pencil" tam={16} /> Ajustar o añadir</button>{/if}
      {@render botonMas()}
    </footer>
    {#if receta}<Valorar id={comida.recetaId} />{/if}
    {#if mas}
      <div class="acciones secundarias" transition:slide={{ duration: 160 }}>
        {@render botonCantidades()}
      </div>
    {/if}
  {:else if !editable || !fecha}
    <footer class="acciones">
      {@render botonCantidades()}
      {#if diaIdx !== undefined}{@render botonCambiar()}{/if}
    </footer>
  {/if}
{#if (plegable && situacion !== 'pendiente') || compacta}
  <button class="replegar" onclick={() => (desplegada = false)}><Icono n="chevron-up" tam={16} /> Plegar</button>
{/if}
{/if}
</article>

<style>
  /* Cada comida es su propio bloque, con el tinte de la sección */
  .comida-card { margin: 0 0 10px; padding: 12px; border-radius: 18px; background: radial-gradient(130% 90% at 0% 0%, color-mix(in srgb, var(--tinte, transparent) 70%, transparent), transparent 60%), var(--superficie); box-shadow: var(--sombra); transition: opacity 0.25s var(--ease-out); }
  .comida-card.plegada { padding: 0; background: none; box-shadow: none; }
  .comida-card.con-portada { padding: 0; background: none; box-shadow: none; }
  .con-portada > .acciones, .con-portada > .estado-linea, .con-portada > .ing-caja { padding: 0 4px; }

  /* Portada de la comida que toca */
  .pc-sup { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
  .pc-tipo { display: inline-flex; align-items: center; gap: 6px; padding: 6px 11px; border-radius: 999px; background: rgb(0 0 0 / 0.42); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); font-size: 0.78rem; font-weight: 700; }
  .pc-guia { display: inline-flex; align-items: center; gap: 5px; min-height: 32px; margin-left: auto; padding: 0 11px; border: 0; border-radius: 999px; background: rgb(255 255 255 / 0.16); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); color: #fff; font: inherit; font-size: 0.76rem; font-weight: 700; cursor: pointer; }
  .meta-guia { display: inline-flex; align-items: center; gap: 4px; padding: 0; border: 0; background: none; color: var(--primario); font: inherit; font-weight: 700; cursor: pointer; }
  .pc-etq { padding: 6px 10px; border-radius: 999px; background: var(--primario); color: var(--sobre-primario); font-size: 0.72rem; font-weight: 800; }
  /* Sin foto: el plato en anillo, grande y medio fuera por la derecha, de fondo (no compite con el título) */
  .pc-anillo { position: absolute; top: 50%; right: -78px; width: 210px; aspect-ratio: 1; border-radius: 50%; transform: translateY(-58%); opacity: 0.38; -webkit-mask: radial-gradient(circle, transparent 50%, #000 51.5%); mask: radial-gradient(circle, transparent 50%, #000 51.5%); }
  .pc-titulo { margin-top: auto; padding: 18px 0 0; border: 0; background: none; color: #fff; font: inherit; font-size: 1.6rem; font-weight: 800; line-height: 1.08; letter-spacing: -0.03em; text-align: left; text-wrap: balance; cursor: pointer; position: relative; }
  .pc-porque { margin: 6px 0 0; font-size: 0.84rem; font-weight: 600; color: color-mix(in srgb, var(--primario) 70%, #fff); }
  .pc-cifras { display: flex; gap: 18px; margin-top: 14px; padding-top: 12px; border-top: 1px solid rgb(255 255 255 / 0.16); }
  .pc-cifras div { display: grid; }
  .pc-cifras b { font-size: 1.3rem; line-height: 1.1; color: #fff; }
  .pc-cifras b span { font-size: 0.8rem; font-weight: 700; margin-left: 1px; color: rgb(255 255 255 / 0.7); }
  .pc-cifras small { font-size: 0.7rem; font-weight: 600; color: rgb(255 255 255 / 0.62); }
  .fila-plegada { width: 100%; display: flex; align-items: center; gap: 12px; min-height: 52px; padding: 6px 10px 6px 6px; border: 0; border-radius: 14px; background: var(--primario-claro); color: var(--texto); font: inherit; text-align: left; cursor: pointer; }
  .fila-plegada > :global(svg:last-child) { color: var(--texto-3); flex-shrink: 0; }
  .pl-ok { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 10px; background: var(--primario); color: var(--sobre-primario); flex-shrink: 0; }
  .s-saltada .pl-ok { background: var(--superficie-3); color: var(--texto-2); }
  .pl-ok.pendiente { background: var(--superficie-3); color: var(--primario); }
  .s-pendiente .fila-plegada { background: var(--superficie); box-shadow: var(--sombra); }
  .pl-txt { flex: 1; min-width: 0; display: grid; }
  .pl-txt small { font-size: 0.72rem; font-weight: 700; color: var(--primario-fuerte); }
  .pl-txt b { font-weight: 600; font-size: 0.9rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .pl-kcal { font-weight: 700; font-size: 0.9rem; white-space: nowrap; }
  .pl-kcal small { font-weight: 600; color: var(--texto-3); font-size: 0.72rem; }
  .replegar { display: inline-flex; align-items: center; gap: 4px; min-height: 40px; margin-top: 4px; padding: 0 10px; border: 0; border-radius: 10px; background: none; color: var(--texto-3); font-weight: 600; font-size: 0.78rem; cursor: pointer; }
  .fila { position: relative; display: flex; gap: 12px; align-items: flex-start; }
  .miniatura { padding: 0; border: 0; background: none; cursor: pointer; width: 84px; flex-shrink: 0; }
  .cuerpo { flex: 1; min-width: 0; display: grid; gap: 1px; }
  .franja { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; font-size: 0.74rem; font-weight: 700; color: var(--texto-3); }
  .etq { padding: 2px 7px; border-radius: 999px; font-size: 0.6rem; letter-spacing: 0.06em; }
  .etq-pre, .etq-post { background: var(--primario-claro); color: var(--primario-fuerte); }
  .etq-ajuste { background: var(--lila-claro); color: var(--lila); }
  .ajustada.s-pendiente .titulo { color: var(--texto); }
  .etq-nota { background: var(--superficie-2); color: var(--texto-2); }
  .titulo { padding: 0; border: 0; background: none; text-align: left; font-weight: 600; font-size: 0.97rem; line-height: 1.3; cursor: pointer; color: var(--texto); margin-top: 2px; }
  .meta { display: flex; flex-wrap: wrap; gap: 4px 14px; margin-top: 5px; font-size: 0.76rem; color: var(--texto-3); }
  .meta span { display: inline-flex; align-items: center; gap: 4px; }
  .s-hecha .titulo { color: var(--texto-2); }
  .s-saltada .fila, .s-sustituida .fila { opacity: 0.45; }
  .estado-linea { display: flex; align-items: center; gap: 6px; margin-top: 6px; font-size: 0.8rem; font-weight: 600; color: var(--texto-2); }
  .boton-linea { min-height: 44px; padding: 0 10px; border: 0; border-radius: 12px; background: none; color: var(--primario); font-weight: 700; font-size: 0.82rem; cursor: pointer; }
  @media (hover: hover) and (pointer: fine) { .boton-linea:hover { background: var(--primario-claro); } }
  .otro { display: flex; align-items: center; gap: 8px; margin-top: 6px; padding: 0 0 0 10px; min-height: 44px; border-radius: 12px; background: var(--superficie-2); font-size: 0.84rem; font-weight: 600; color: var(--texto-2); }
  .otro-nombre { flex: 1; min-width: 0; color: var(--texto); }
  .otro-nombre small { color: var(--texto-2); font-weight: 500; }
  .otro-kcal { white-space: nowrap; }
  .borrar { display: grid; place-items: center; flex-shrink: 0; width: 44px; height: 44px; border: 0; border-radius: 12px; background: none; color: var(--texto-2); cursor: pointer; }
  @media (hover: hover) and (pointer: fine) { .borrar:hover { color: var(--texto); } }
  .ing-caja { margin-top: 12px; padding-top: 4px; border-top: 1px solid var(--linea); }
  .editor { margin-top: 12px; padding: 12px; border-radius: 16px; background: var(--superficie); box-shadow: var(--sombra); }
  .editor-cab { margin: 0 0 8px; font-weight: 600; font-size: 0.88rem; }
  .editor-fila { display: grid; grid-template-columns: minmax(0, 1fr) 40px 58px 40px 40px; gap: 5px; align-items: center; padding: 6px 0; border-top: 1px solid var(--linea); }
  .editor-nombre { display: grid; font-size: 0.82rem; line-height: 1.25; min-width: 0; }
  .editor-nombre small { color: var(--texto-3); }
  .editor-fila button { display: grid; place-items: center; width: 40px; height: 44px; border-radius: 12px; border: 0; background: var(--superficie-2); color: var(--texto); cursor: pointer; }
  .editor-fila .papelera { background: none; color: var(--texto-3); }
  .editor-fila .papelera:active { color: var(--peligro, #ff6b5b); background: var(--superficie-2); }
  @media (hover: hover) and (pointer: fine) { .editor-fila .papelera:hover { color: var(--peligro, #ff6b5b); background: var(--superficie-2); } }
  .editor-fila input { width: 100%; min-height: 44px; padding: 4px 6px; border-radius: 10px; border: 1px solid var(--borde); background: var(--superficie-2); color: var(--texto); text-align: center; font-weight: 700; font-variant-numeric: tabular-nums; }
  .editor-mas { display: flex; align-items: center; gap: 6px; width: 100%; min-height: 44px; margin-top: 6px; padding: 0 10px; border: 1px dashed var(--borde); border-radius: 12px; background: none; color: var(--primario); font-weight: 700; font-size: 0.84rem; cursor: pointer; }
  .editor-anadir { margin-top: 8px; padding: 8px; border-radius: 14px; background: var(--fondo); max-height: 420px; overflow-y: auto; }
  .editor-total { margin: 10px 0 0; font-size: 0.82rem; color: var(--texto-2); }
  .editor-acciones { display: flex; gap: 8px; margin-top: 10px; }
  .antes { display: block; color: var(--lila); font-weight: 600; font-size: 0.78rem; }
  .acciones { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-top: 10px; }
  .acciones button {
    display: inline-flex; align-items: center; justify-content: center; gap: 6px; min-height: 44px; padding: 0 12px;
    border-radius: 12px; border: 0; background: var(--superficie-2); font-weight: 600; font-size: 0.8rem; cursor: pointer; color: var(--texto-2);
    transition: background 0.15s var(--ease-out), color 0.15s var(--ease-out), transform 0.12s var(--ease-out);
  }
  .acciones button.activo { background: var(--primario-claro); color: var(--primario-fuerte); }
  @media (hover: hover) and (pointer: fine) { .acciones button:hover { background: var(--primario-claro); color: var(--primario-fuerte); } }
  .acciones button:active { transform: scale(0.97); }
  .acciones .principal { min-width: 92px; background: var(--primario); color: var(--sobre-primario); font-weight: 700; }
  @media (hover: hover) and (pointer: fine) { .acciones .principal:hover { background: var(--primario-fuerte); color: var(--sobre-primario); } }
  .acciones .principal.suave { background: var(--superficie-2); color: var(--texto); }
  .acciones .principal.suave :global(.icono) { color: var(--primario); }
  @media (hover: hover) and (pointer: fine) { .acciones .principal.suave:hover { background: var(--primario-claro); color: var(--primario-fuerte); } }
  .acciones .principal.activo { background: var(--primario-claro); color: var(--primario-fuerte); box-shadow: inset 0 0 0 1.5px var(--primario); }
  .acciones .principal.activo :global(.icono) { animation: pop 260ms var(--ease-out); }
  .acciones .solo-icono { width: 44px; padding: 0; margin-left: auto; }
  .pregunta { flex-basis: 100%; display: flex; align-items: center; gap: 6px; margin: 0 0 2px; font-size: 0.8rem; font-weight: 600; color: var(--aviso-texto); }
  .secundarias { margin-top: 6px; }
  .batido { display: flex; align-items: center; gap: 8px; width: 100%; min-height: 44px; margin-top: 8px; padding: 0 12px; border: 1px dashed var(--borde); border-radius: 12px; background: none; color: var(--primario); font: inherit; font-weight: 700; font-size: 0.86rem; cursor: pointer; }
</style>
