<script>
  import Emoji from '../components/Emoji.svelte';
  import Segmentos from '../components/Segmentos.svelte';
  import { estado, actualizar, exportar, importar, reiniciar } from '../stores/estado.js';
  import { avisar } from '../stores/ui.js';
  import { calcularObjetivos, OBJETIVOS, DIETAS, TRABAJO, DEPORTES } from '../lib/nutricion.js';
  import { horarioDia } from '../lib/horario.js';
  import { recomendaciones, CONDICIONES } from '../lib/salud.js';
  import { resumenObjetivos } from '../lib/cuestionario.js';
  import { hoyISO } from '../lib/planificador.js';
  import { FOTOS_RECETAS } from '../data/fotos.js';
  import { RECETAS } from '../data/recetas.js';
  import { ALERGENOS } from '../data/alimentos.js';
  import { num } from '../lib/formato.js';

  let { oneditar } = $props();
  let pestaña = $state('plan');
  const p = $derived($estado.perfil);
  const o = $derived(calcularObjetivos(p));
  const recs = $derived(recomendaciones(p, o));
  const entrena = $derived(p.entrena && o.diasEntreno);
  const NIVEL = { alta: 'Evidencia alta', moderada: 'Evidencia moderada', baja: 'Evidencia limitada' };
  const ETQ = { pre: '⚡ Pre-entreno', post: '💪 Post-entreno' };
  const horario = (e) => {
    const h = horarioDia(p, e);
    const items = h.franjas.map((f) => ({ hora: f.horaTexto, texto: f.nombre, etq: f.etiqueta }));
    if (h.entreno) items.push({ hora: h.entreno.inicio, texto: `Entreno hasta las ${h.entreno.fin}`, entreno: true });
    return { items: items.sort((a, b) => a.hora.localeCompare(b.hora)), consejos: h.consejos };
  };
  const nombreReceta = (id) => RECETAS.find((r) => r.id === id)?.nombre || id;

  function descargar() {
    const blob = new Blob([exportar()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `mi-nutricionista-${hoyISO()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }
  async function restaurar(ev) {
    const f = ev.currentTarget.files?.[0];
    if (!f) return;
    try { importar(await f.text()); avisar('Copia restaurada', '💾'); } catch (e) { avisar(`No se pudo restaurar: ${e.message}`, '⚠️'); }
  }
  function borrarTodo() {
    if (confirm('Se borrarán tu perfil, menús, registros y medidas de este dispositivo. ¿Seguro?')) { reiniciar(); location.hash = '#hoy'; }
  }
</script>

<h1 class="titulo">Mi plan</h1>
<Segmentos opciones={[{ id: 'plan', nombre: 'Plan', emoji: '🎯' }, { id: 'salud', nombre: 'Salud', emoji: '💊' }, { id: 'ajustes', nombre: 'Ajustes', emoji: '⚙️' }]} bind:valor={pestaña} />

{#if pestaña === 'plan'}
  {#if !p.trabajo}
    <div class="tarjeta destacada"><b>✨ Completa tu perfil</b><p>Añade tu horario, tus entrenos y tu salud para afinar calorías, horas de comida y suplementos.</p><button class="boton" onclick={oneditar}>Completar mis datos</button></div>
  {/if}
  {@html resumenObjetivos(p)}
  <h2 class="seccion">🗓️ Tu horario</h2>
  <div class="tarjeta">
    {#each entrena ? [true, false] : [false] as e (e)}
      {@const h = horario(e)}
      <div class="h-cab"><b>{e ? '💪 Día de entreno' : entrena ? '😌 Día de descanso' : '🗓️ Tu día'}</b></div>
      <ul class="horario-mini">
        {#each h.items as it (it.hora + it.texto)}
          <li class:hm-entreno={it.entreno}><b>{it.hora}</b> {it.texto}{#if it.etq}<span class="etq etq-{it.etq}">{ETQ[it.etq]}</span>{/if}</li>
        {/each}
      </ul>
      {#each h.consejos as c (c)}<p class="nota-dia">💡 {c}</p>{/each}
    {/each}
  </div>
  <button class="boton ancho" onclick={oneditar}>✏️ Editar mis datos</button>
{:else if pestaña === 'salud'}
  {#each recs.avisos as a (a.texto)}<p class="alerta {a.nivel === 'importante' ? 'alerta-fuerte' : ''}">{a.texto}</p>{/each}
  {#if recs.suplementos.length}
    <h2 class="seccion">💊 Suplementos para ti</h2>
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
    <h2 class="seccion">🥦 Tu alimentación</h2>
    {#each recs.alimentacion as a (a.titulo)}<div class="tarjeta consejo-item"><Emoji e={a.emoji} tam={32} /><div><b>{a.titulo}</b><p>{a.texto}</p></div></div>{/each}
  {/if}
  <h2 class="seccion">🌿 Hábitos</h2>
  {#each recs.habitos as a (a.titulo)}<div class="tarjeta consejo-item"><Emoji e={a.emoji} tam={32} /><div><b>{a.titulo}</b><p>{a.texto}</p></div></div>{/each}
{:else}
  <h2 class="seccion">👤 Tus datos</h2>
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
    <button class="boton ancho" onclick={oneditar}>✏️ Editar mis datos</button>
  </div>

  <h2 class="seccion">🎨 Apariencia</h2>
  <Segmentos opciones={[{ id: 'auto', nombre: 'Automático', emoji: '🌗' }, { id: 'claro', nombre: 'Claro', emoji: '☀️' }, { id: 'oscuro', nombre: 'Oscuro', emoji: '🌙' }]}
    valor={$estado.tema} onchange={(t) => actualizar((e) => { e.tema = t; })} />

  <h2 class="seccion">💾 Copia de seguridad</h2>
  <div class="tarjeta">
    <p class="pie-nota">Tus datos se guardan en este dispositivo. Descarga una copia para pasarlos a otro móvil o navegador (las fotos no se incluyen).</p>
    <div class="acciones-fila">
      <button class="boton boton-sec boton-peq" onclick={descargar}>Descargar copia</button>
      <label class="boton boton-sec boton-peq">Restaurar copia<input type="file" accept="application/json" hidden onchange={restaurar} /></label>
      <button class="boton boton-peligro boton-peq" onclick={borrarTodo}>Borrar todo</button>
    </div>
  </div>

  <details class="tarjeta creditos">
    <summary>📜 Créditos e información</summary>
    <p>Precios y productos: tienda online de Mercadona (datos públicos). Productos envasados: <a href="https://world.openfoodfacts.org" target="_blank" rel="noopener">Open Food Facts</a> (ODbL). Iconos 3D: Fluent Emoji de Microsoft (MIT).</p>
    <p>Fotos de recetas de Wikimedia Commons:</p>
    <ul>
      {#each Object.entries(FOTOS_RECETAS) as [id, c] (id)}
        <li><a href={c.fuente} target="_blank" rel="noopener">{nombreReceta(id)}</a> — {c.autor} ({c.licencia})</li>
      {/each}
    </ul>
  </details>
  <p class="pie-nota aviso-legal">Esta app hace cálculos orientativos basados en fórmulas y guías validadas y no sustituye el consejo de un dietista-nutricionista o un médico.</p>
{/if}

<style>
  .ancho { width: 100%; margin-top: 10px; }
  .h-cab { margin: 6px 0 4px; }
  .horario-mini .etq { margin-left: auto; }
  .lista { display: grid; gap: 8px; }
  .sup { margin: 0; padding: 0; }
  .sup summary { display: flex; align-items: center; gap: 12px; padding: 14px; list-style: none; cursor: pointer; }
  .sup summary::-webkit-details-marker { display: none; }
  .sup-ic { width: 46px; height: 46px; border-radius: 14px; display: grid; place-items: center; background: var(--lila-claro); flex-shrink: 0; }
  .sup-t { flex: 1; min-width: 0; display: grid; }
  .sup-t small { color: var(--texto-2); font-weight: 700; }
  .sup dl { display: grid; grid-template-columns: auto 1fr; gap: 6px 12px; margin: 0; padding: 0 14px 14px; font-size: 0.9rem; }
  .sup dt { font-weight: 800; color: var(--texto-2); }
  .sup dd { margin: 0; }
  .consejo-item { display: flex; gap: 12px; align-items: flex-start; margin: 8px 0; }
  .consejo-item p { margin: 3px 0 0; font-size: 0.92rem; }
  .creditos { font-size: 0.85rem; }
  .creditos ul { padding-left: 18px; color: var(--texto-2); }
  .creditos li { margin: 2px 0; }
</style>
