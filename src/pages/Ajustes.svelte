<script>
  import Icono from '../components/Icono.svelte';
  import Emoji from '../components/Emoji.svelte';
  import Segmentos from '../components/Segmentos.svelte';
  import Conectar from './ajustes/Conectar.svelte';
  import { ir } from '../stores/ruta.js';
  import { estado, actualizar, exportar, importar, reiniciar } from '../stores/estado.js';
  import { avisar, abrirHoja } from '../stores/ui.js';
  import { rutinaSuelo } from '../lib/suelo.js';
  import { calcularObjetivos, OBJETIVOS, DIETAS, TRABAJO, DEPORTES } from '../lib/nutricion.js';
  import { horarioDia } from '../lib/horario.js';
  import { recomendaciones, CONDICIONES } from '../lib/salud.js';
  import { resumenObjetivos } from '../lib/cuestionario.js';
  import { hoyISO } from '../lib/planificador.js';
  import { FOTOS_RECETAS, FOTOS_SESIONES, FOTOS_ESTACIONES } from '../data/fotos.js';
  import { RECETAS } from '../data/recetas.js';
  import { ALERGENOS } from '../data/alimentos.js';
  import { num, fechaLarga, capital } from '../lib/formato.js';
  import { listarCopiasLocales, restaurarCopiaLocal, guardarCopiaFuera, restaurarArchivo } from '../lib/copias.js';

  let { oneditar, sub = '' } = $props();
  const PESTAÑAS = [{ id: 'plan', nombre: 'Objetivos', emoji: '🎯' }, { id: 'salud', nombre: 'Salud', emoji: '💊' }, { id: 'conectar', nombre: 'Conectar', emoji: '🔗' }, { id: 'ajustes', nombre: 'Ajustes', emoji: '⚙️' }];
  let pestaña = $state(PESTAÑAS.some((x) => x.id === sub) ? sub : 'plan');
  $effect(() => { if (PESTAÑAS.some((x) => x.id === sub)) pestaña = sub; });
  const p = $derived($estado.perfil);
  const o = $derived(calcularObjetivos(p));
  const recs = $derived(recomendaciones(p, o));
  const entrena = $derived(p.entrena && o.diasEntreno);
  const NIVEL = { alta: 'Evidencia alta', moderada: 'Evidencia moderada', baja: 'Evidencia limitada' };
  const ETQ = { pre: 'Pre-entreno', post: 'Post-entreno' };
  const horario = (e) => {
    const h = horarioDia(p, e);
    const items = h.franjas.map((f) => ({ hora: f.horaTexto, texto: f.nombre, etq: f.etiqueta }));
    if (h.entreno) items.push({ hora: h.entreno.inicio, texto: `Entreno hasta las ${h.entreno.fin}`, entreno: true });
    return { items: items.sort((a, b) => a.hora.localeCompare(b.hora)), consejos: h.consejos };
  };
  const nombreReceta = (id) => RECETAS.find((r) => r.id === id)?.nombre || id;

  async function descargar() {
    try { if (await guardarCopiaFuera()) avisar('Copia guardada (con tus fotos)', '💾'); } catch (e) { avisar(`No se pudo guardar: ${e.message}`, '⚠️'); }
  }
  async function restaurar(ev) {
    const f = ev.currentTarget.files?.[0];
    if (!f) return;
    try { await restaurarArchivo(await f.text()); avisar('Copia restaurada', '💾'); } catch (e) { avisar(`No se pudo restaurar: ${e.message}`, '⚠️'); }
  }
  // Copias automáticas de cada día en este móvil
  let copias = $state([]);
  $effect(() => { if (pestaña === 'ajustes') listarCopiasLocales().then((l) => (copias = l)); });
  const nombreCopia = (c) => (c.fecha === 'antes-de-restaurar' ? 'Justo antes de tu última restauración' : c.fecha === hoyISO() ? 'Hoy, al abrir la app' : capital(fechaLarga(c.fecha)));
  async function volverA(c) {
    if (!confirm(`¿Volver a como estaba todo: ${nombreCopia(c).toLowerCase()}? Lo que hayas hecho después se sustituye (se guarda antes una copia de cómo está ahora).`)) return;
    try { await restaurarCopiaLocal(c.fecha); avisar('Datos recuperados', '💾'); copias = await listarCopiasLocales(); } catch (e) { avisar(`No se pudo recuperar: ${e.message}`, '⚠️'); }
  }

  function borrarTodo() {
    if (confirm('Se borrarán tu perfil, menús, registros y medidas de este dispositivo. ¿Seguro?')) { reiniciar(); location.hash = '#hoy'; }
  }
</script>

<h1 class="titulo">Tu perfil</h1>
<Segmentos opciones={PESTAÑAS} bind:valor={pestaña} onchange={(id) => ir('ajustes', id)} />

{#if pestaña === 'plan'}
  {#if !p.trabajo}
    <div class="tarjeta destacada"><b><Icono e="✨" tam={18} /> Completa tu perfil</b><p>Añade tu horario, tus entrenos y tu salud para afinar calorías, horas de comida y suplementos.</p><button class="boton" onclick={oneditar}>Completar mis datos</button></div>
  {/if}
  {@html resumenObjetivos(p)}
  <h2 class="seccion"><Icono e="🗓️" tam={18} /> Tu horario</h2>
  <div class="tarjeta">
    {#each entrena ? [true, false] : [false] as e (e)}
      {@const h = horario(e)}
      <div class="h-cab"><b>{e ? 'Día de entreno' : entrena ? 'Día de descanso' : 'Tu día'}</b></div>
      <ul class="horario-mini">
        {#each h.items as it (it.hora + it.texto)}
          <li class:hm-entreno={it.entreno}><b>{it.hora}</b> {it.texto}{#if it.etq}<span class="etq etq-{it.etq}">{ETQ[it.etq]}</span>{/if}</li>
        {/each}
      </ul>
      {#each h.consejos as c (c)}<p class="nota-dia"><Icono e="💡" tam={18} /> {c}</p>{/each}
    {/each}
  </div>
  <button class="boton ancho" onclick={oneditar}><Icono e="✏️" tam={18} /> Editar mis datos</button>
{:else if pestaña === 'salud'}
  {#each recs.avisos as a (a.texto)}<p class="alerta {a.nivel === 'importante' ? 'alerta-fuerte' : ''}">{a.texto}</p>{/each}
  <button class="tarjeta suelo" onclick={() => abrirHoja('suelo')}>
    <span class="suelo-ic"><Icono n="activity" tam={20} /></span>
    <span class="suelo-txt"><b>Suelo pélvico</b><small>{p.sueloPelvico ? `Fase ${rutinaSuelo(p.sueloPelvico.inicio, hoyISO()).fase.nombre.toLowerCase()} · semana ${rutinaSuelo(p.sueloPelvico.inicio, hoyISO()).semana} · 5 min cada noche` : '5 minutos al día, por fases. Sin empezar'}</small></span>
    <Icono n="chevron-right" tam={18} />
  </button>
  {#if recs.suplementos.length}
    <h2 class="seccion"><Icono e="💊" tam={18} /> Suplementos para ti</h2>
    <p class="pie-nota">Solo los que tienen sentido en tu caso. Dosis orientativas para adultos sanos: si tomas medicación o tienes alguna patología, consúltalo antes.</p>
    <div class="lista">
      {#each recs.suplementos as s (s.id)}
        <details class="tarjeta sup">
          <summary><span class="sup-ic"><Emoji e={s.emoji} tam={30} /></span><span class="sup-t"><b>{s.nombre}</b><small>{s.dosis}</small></span><span class="evid evid-{s.evidencia}">{NIVEL[s.evidencia]}</span></summary>
          <dl><dt>Cuándo</dt><dd>{s.momento}</dd><dt>Por qué</dt><dd>{s.porque}</dd><dt>Precaución</dt><dd>{s.precauciones}</dd></dl>
        </details>
      {/each}
    </div>
  {/if}
  {#if recs.alimentacion.length}
    <h2 class="seccion"><Icono e="🥦" tam={18} /> Tu alimentación</h2>
    {#each recs.alimentacion as a (a.titulo)}<div class="tarjeta consejo-item"><Emoji e={a.emoji} tam={32} /><div><b>{a.titulo}</b><p>{a.texto}</p></div></div>{/each}
  {/if}
  <h2 class="seccion"><Icono e="🌿" tam={18} /> Hábitos</h2>
  {#each recs.habitos as a (a.titulo)}<div class="tarjeta consejo-item"><Emoji e={a.emoji} tam={32} /><div><b>{a.titulo}</b><p>{a.texto}</p></div></div>{/each}
{:else if pestaña === 'conectar'}
  <Conectar />
{:else}
  <h2 class="seccion"><Icono e="👤" tam={18} /> Tus datos</h2>
  <div class="tarjeta">
    <dl class="datos-perfil">
      <dt>Persona</dt><dd>{p.sexo === 'h' ? 'Hombre' : 'Mujer'}, {p.edad} años, {p.altura} cm, {num(p.peso, 1)} kg</dd>
      {#if p.trabajo}<dt>Día a día</dt><dd>{TRABAJO[p.trabajo]?.nombre} · {p.despertar}–{p.dormir}</dd>{/if}
      {#if p.trabajo}<dt>Entreno</dt><dd>{p.entrena ? `${(p.deportes || []).map((x) => DEPORTES[x]?.nombre).join(', ')} · ${(p.diasEntreno || []).length} días · ${p.horaEntreno}` : 'No entreno'}</dd>{/if}
      <dt>Objetivo</dt><dd>{OBJETIVOS[p.objetivo].nombre}{p.pesoObjetivo ? ` (hasta ${num(p.pesoObjetivo, 1)} kg)` : ''}</dd>
      <dt>Alimentación</dt><dd>{DIETAS[p.dieta]} · {p.comidas} comidas{p.sobras ? ' · táper' : ''}</dd>
      <dt>Alergias</dt><dd>{p.alergias.length ? p.alergias.map((a) => ALERGENOS[a]).join(', ') : 'Ninguna'}</dd>
      {#if p.condiciones?.length}<dt>Salud</dt><dd>{p.condiciones.map((c) => CONDICIONES[c]?.nombre).join(', ')}</dd>{/if}
    </dl>
    <button class="boton ancho" onclick={oneditar}><Icono e="✏️" tam={18} /> Editar mis datos</button>
  </div>

  <h2 class="seccion"><Icono e="🎨" tam={18} /> Apariencia</h2>
  <Segmentos opciones={[{ id: 'oscuro', nombre: 'Oscuro', emoji: '🌙' }, { id: 'claro', nombre: 'Claro', emoji: '☀️' }, { id: 'sistema', nombre: 'Como el móvil', emoji: '🌗' }]}
    valor={$estado.tema} onchange={(t) => actualizar((e) => { e.tema = t; })} />
  <p class="sub-apariencia">Letra</p>
  <Segmentos opciones={[{ id: 'sistema', nombre: 'SF Pro', icono: 'smartphone' }, { id: 'manrope', nombre: 'Manrope', icono: 'pencil' }, { id: 'geist', nombre: 'Geist', icono: 'pencil' }]}
    valor={$estado.fuente || 'sistema'} onchange={(f) => actualizar((e) => { e.fuente = f; })} />
  <p class="pie-nota">SF Pro es la letra del iPhone (la de Apple Salud o Fitness). En otros dispositivos se usa la de su sistema.</p>
  <label class="interruptor"><input type="checkbox" checked={!!$estado.textoSistema} onchange={(ev) => actualizar((e) => { e.textoSistema = ev.currentTarget.checked; })} />
    <span><b>Tamaño de texto del iPhone</b><small>La letra sigue lo que tengas en Ajustes → Pantalla y brillo → Tamaño del texto. Algo más grande que el normal.</small></span></label>

  <h2 class="seccion"><Icono e="💾" tam={18} /> Copia de seguridad</h2>
  <div class="tarjeta">
    <p class="pie-nota">Tus datos se guardan en este dispositivo (y, si activas la sincronización en Conectar, cifrados en tu servidor con copia diaria). También puedes guardar una copia completa, con tus fotos, en iCloud Drive o Archivos.</p>
    <div class="acciones-fila">
      <button class="boton boton-sec boton-peq" onclick={descargar}>Guardar copia</button>
      <label class="boton boton-sec boton-peq">Restaurar copia<input type="file" accept="application/json" hidden onchange={restaurar} /></label>
      <button class="boton boton-peligro boton-peq" onclick={borrarTodo}>Borrar todo</button>
    </div>
  </div>

  {#if copias.length}
    <details class="tarjeta copias">
      <summary><b>Copias en este móvil</b><small>Una por día, al abrir la app. Si algo desaparece, vuelve a una de ellas.</small></summary>
      <ul>
        {#each copias as c (c.fecha)}
          <li>
            <span><b>{nombreCopia(c)}</b><small>{c.resumen?.comidas ?? 0} comidas · {c.resumen?.sesiones ?? 0} sesiones · {c.resumen?.pesos ?? 0} pesos</small></span>
            <button class="boton boton-sec boton-peq" onclick={() => volverA(c)}>Volver aquí</button>
          </li>
        {/each}
      </ul>
    </details>
  {/if}

  <details class="tarjeta creditos">
    <summary><Icono e="📜" tam={18} /> Créditos e información</summary>
    <p>Precios y productos: tienda online de Mercadona (datos públicos). Productos envasados: <a href="https://world.openfoodfacts.org" target="_blank" rel="noopener">Open Food Facts</a> (ODbL). Iconos: Lucide (ISC). Tipografía: Manrope (OFL).</p>
    <p>Fotos de recetas de Wikimedia Commons:</p>
    <ul>
      {#each Object.entries(FOTOS_RECETAS) as [id, c] (id)}
        <li><a href={c.fuente} target="_blank" rel="noopener">{nombreReceta(id)}</a> — {c.autor} ({c.licencia})</li>
      {/each}
    </ul>
    <p>Fotos de entreno y estaciones de Wikimedia Commons:</p>
    <ul>
      {#each [...Object.entries(FOTOS_SESIONES), ...Object.entries(FOTOS_ESTACIONES)] as [id, c] (id)}
        <li><a href={c.fuente} target="_blank" rel="noopener">{id}</a> — {c.autor} ({c.licencia})</li>
      {/each}
    </ul>
  </details>
  <p class="pie-nota aviso-legal">Esta app hace cálculos orientativos basados en fórmulas y guías validadas y no sustituye el consejo de un dietista-nutricionista o un médico.</p>
{/if}

<style>
  /* Nivel de evidencia de cada suplemento (antes en app.css) */
  .evid { flex-shrink: 0; padding: 3px 9px; border-radius: 999px; font-size: 0.7rem; font-weight: 700; }
  .evid-alta { background: var(--primario-claro); color: var(--primario-fuerte); }
  .evid-moderada { background: var(--amarillo-claro); color: color-mix(in srgb, var(--amarillo) 70%, var(--texto)); }
  .evid-baja { background: var(--superficie-2); color: var(--texto-2); }
  .aviso-legal { margin-top: 22px; }
  .ancho { width: 100%; margin-top: 10px; }
  .sub-apariencia { margin: 14px 0 6px; font-size: 0.82rem; font-weight: 600; color: var(--texto-2); }
  .h-cab { margin: 6px 0 4px; }
  .horario-mini .etq { margin-left: auto; }
  .lista { display: grid; gap: 8px; }
  .suelo { display: flex; align-items: center; gap: 12px; width: 100%; margin-bottom: 12px; border: 0; color: var(--texto); font: inherit; text-align: left; cursor: pointer; }
  .suelo-ic { display: grid; place-items: center; width: 40px; height: 40px; border-radius: var(--r-s); background: var(--primario-claro); color: var(--primario-fuerte); flex-shrink: 0; }
  .suelo-txt { flex: 1; min-width: 0; display: grid; }
  .suelo-txt small { font-size: 0.8rem; color: var(--texto-2); }
  .suelo > :global(svg:last-child) { color: var(--texto-3); flex-shrink: 0; }
  .sup { margin: 0; padding: 0; }
  .sup summary { display: flex; align-items: center; gap: 12px; padding: 14px; list-style: none; cursor: pointer; }
  .sup summary::-webkit-details-marker { display: none; }
  .sup-ic { width: 46px; height: 46px; border-radius: var(--r-m); display: grid; place-items: center; background: var(--lila-claro); flex-shrink: 0; }
  .sup-t { flex: 1; min-width: 0; display: grid; }
  .sup-t small { color: var(--texto-2); font-weight: 700; }
  .sup dl { display: grid; grid-template-columns: auto 1fr; gap: 6px 12px; margin: 0; padding: 0 14px 14px; font-size: 0.9rem; }
  .sup dt { font-weight: 700; color: var(--texto-2); }
  .sup dd { margin: 0; }
  .consejo-item { display: flex; gap: 12px; align-items: flex-start; margin: 8px 0; }
  .consejo-item p { margin: 3px 0 0; font-size: 0.92rem; }
  .copias summary { display: grid; gap: 2px; cursor: pointer; }
  .copias summary small { color: var(--texto-2); font-weight: 600; font-size: 0.8rem; }
  .copias ul { list-style: none; margin: 10px 0 0; padding: 0; }
  .copias li { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 10px 0; border-top: 1px solid var(--linea); }
  .copias li span { display: grid; min-width: 0; }
  .copias li small { color: var(--texto-2); font-weight: 600; font-size: 0.78rem; }
  .copias li .boton { flex-shrink: 0; }
  .creditos { font-size: 0.85rem; }
  .creditos ul { padding-left: 18px; color: var(--texto-2); }
  .creditos li { margin: 2px 0; }
</style>
