<script>
  import Emoji from '../../components/Emoji.svelte';
  import { estado, actualizar } from '../../stores/estado.js';
  import { avisar } from '../../stores/ui.js';
  import { hoyISO } from '../../lib/planificador.js';
  import { fechaCorta, num } from '../../lib/formato.js';

  const CAMPOS = [
    { id: 'cintura', nombre: 'Cintura', emoji: '📏', ayuda: 'Justo a la altura del ombligo. Abdomen relajado, sin meter tripa, al final de soltar el aire.' },
    { id: 'cadera', nombre: 'Cadera', emoji: '🍑', ayuda: 'Pies juntos, por la parte más saliente del glúteo. Mírate de lado en el espejo para que la cinta vaya recta.' },
    { id: 'pecho', nombre: 'Pecho', emoji: '🫁', ayuda: 'A la altura de los pezones, brazos caídos y sin coger aire.' },
    { id: 'brazo', nombre: 'Brazo', emoji: '💪', ayuda: 'Brazo derecho relajado y colgando, en el punto más ancho del bíceps. Con la mano izquierda se hace bien.' },
    { id: 'muslo', nombre: 'Muslo', emoji: '🦵', ayuda: 'Pierna derecha, a mitad entre la ingle y la rodilla. Apunta a cuántos cm de la rodilla mides para repetirlo igual.' },
  ];
  let fecha = $state(hoyISO());
  let valores = $state({});
  const medidas = $derived([...($estado.medidas || [])].sort((a, b) => a.fecha.localeCompare(b.fecha)));
  const primera = $derived(medidas[0]);
  const ultima = $derived(medidas.at(-1));

  let guia = $state(false);
  // Qué dicen tus medidas: cintura (grasa) frente a brazo y pecho (músculo)
  const lectura = $derived.by(() => {
    if (medidas.length < 2) return null;
    const dif = (k) => { const ini = medidas.find((m) => m[k])?.[k]; return ini && ultima[k] ? ultima[k] - ini : null; };
    const c = dif('cintura'); const b = dif('brazo'); const p = dif('pecho');
    if (c === null) return null;
    if (c <= -1 && (b ?? 0) >= -0.3 && (p ?? 0) >= -0.5) return { ok: true, texto: 'Recomposición en marcha: pierdes cintura y mantienes o ganas brazo y pecho. Es grasa lo que se va, no músculo.' };
    if (c <= -1) return { ok: true, texto: 'Pierdes cintura: buena señal. Si el brazo también baja mucho, sube un poco la proteína y no recortes más kcal.' };
    if (c >= 1 && (b ?? 0) > 0.5) return { ok: false, texto: 'Sube el brazo pero también la cintura: estás ganando algo de grasa. Si buscas recomposición, baja 100 kcal.' };
    if (c >= 1) return { ok: false, texto: 'La cintura sube: revisa el picoteo y las comidas fuera, o baja 100 kcal.' };
    return { ok: true, texto: 'Cintura estable. Si además subes de peso en los ejercicios, vas bien.' };
  });

  function guardar(ev) {
    ev.preventDefault();
    const datos = Object.fromEntries(Object.entries(valores).filter(([, v]) => Number(v) > 0).map(([k, v]) => [k, Number(v)]));
    if (!Object.keys(datos).length) return avisar('Rellena al menos una medida', '📏');
    actualizar((e) => {
      e.medidas = (e.medidas || []).filter((m) => m.fecha !== fecha).concat([{ fecha, ...datos }]);
    });
    valores = {};
    avisar('Medidas guardadas', '📏');
  }
</script>

<div class="tarjeta intro">
  <Emoji e="📏" tam={36} />
  <div>
    <p>La báscula no lo dice todo: si pierdes cintura y mantienes brazo, estás perdiendo grasa y no músculo. Mídete cada 2-4 semanas.</p>
    <button class="enlace" onclick={() => (guia = !guia)} aria-expanded={guia}>{guia ? 'Ocultar cómo medirte' : '¿Cómo me mido yo solo?'}</button>
  </div>
</div>
{#if guia}
  <div class="tarjeta guia">
    <b>Medirte tú solo, en 3 minutos</b>
    <ol>
      <li><b>Qué necesitas:</b> una cinta métrica de costura (cuesta 1-2 € en cualquier bazar). Sin cinta vale un cordón: marcas con el dedo y lo mides con un metro.</li>
      <li><b>Cuándo:</b> por la mañana, en ayunas, después de ir al baño y antes de entrenar. Siempre el mismo día de la semana.</li>
      <li><b>Cómo:</b> de pie, relajado, frente a un espejo. La cinta recta y paralela al suelo, pegada a la piel sin apretar (que no deje marca).</li>
      <li><b>Dos veces:</b> mide cada zona dos veces y apunta la media. Si te sale distinto por más de 1 cm, repite.</li>
      <li><b>No te obsesiones:</b> lo que cuenta es la tendencia de varias semanas, no un día suelto.</li>
    </ol>
    {#each CAMPOS as c (c.id)}<p class="zona"><Emoji e={c.emoji} tam={18} /> <span><b>{c.nombre}:</b> {c.ayuda}</span></p>{/each}
  </div>
{/if}

<form class="tarjeta" onsubmit={guardar}>
  <label class="campo"><span>Fecha</span><input type="date" bind:value={fecha} max={hoyISO()} /></label>
  <div class="campos">
    {#each CAMPOS as c (c.id)}
      <label class="campo"><span><Emoji e={c.emoji} tam={18} /> {c.nombre}</span>
        <input type="number" step="0.5" min="20" max="200" inputmode="decimal" bind:value={valores[c.id]} placeholder={ultima?.[c.id] ? num(ultima[c.id], 1) : ''} /><small>cm</small></label>
    {/each}
  </div>
  <button class="boton ancho" type="submit">Guardar medidas</button>
</form>

{#if medidas.length}
  <div class="tarjeta">
    <b>Evolución</b>
    <div class="evol">
      {#each CAMPOS.filter((c) => ultima?.[c.id]) as c (c.id)}
        {@const ini = medidas.find((m) => m[c.id])?.[c.id]}
        {@const dif = ultima[c.id] - ini}
        <div class="m">
          <Emoji e={c.emoji} tam={26} />
          <span class="n">{c.nombre}</span>
          <b>{num(ultima[c.id], 1)} cm</b>
          <span class="dif" class:baja={dif < 0} class:sube={dif > 0}>{dif === 0 ? '=' : `${dif > 0 ? '+' : ''}${num(dif, 1)}`}</span>
        </div>
      {/each}
    </div>
    {#if lectura}<p class="lectura" class:ok={lectura.ok}>{lectura.texto}</p>{/if}
    <p class="pie-nota">Desde el {fechaCorta(primera.fecha)} · {medidas.length} registros</p>
  </div>
{/if}

<style>
  .intro { display: flex; gap: 12px; align-items: flex-start; }
  .intro p { margin: 0 0 6px; font-weight: 600; font-size: 0.9rem; }
  .guia ol { margin: 8px 0; padding-left: 20px; display: grid; gap: 6px; font-size: 0.86rem; color: var(--texto-2); }
  .guia ol b, .zona b { color: var(--texto); }
  .zona { display: flex; gap: 8px; align-items: flex-start; margin: 6px 0 0; font-size: 0.84rem; color: var(--texto-2); }
  .lectura { margin: 10px 0 0; padding: 10px 12px; border-radius: 12px; background: var(--superficie-2); font-size: 0.86rem; font-weight: 600; }
  .lectura.ok { background: var(--exito-claro); color: var(--exito); }
  .campos { display: grid; grid-template-columns: 1fr 1fr; gap: 0 10px; }
  .campos .campo span { display: flex; gap: 6px; align-items: center; }
  .ancho { width: 100%; margin-top: 6px; }
  .evol { display: grid; gap: 6px; margin-top: 10px; }
  .m { display: flex; align-items: center; gap: 10px; padding: 8px 12px; border-radius: 14px; background: var(--superficie-2); }
  .n { flex: 1; font-weight: 700; }
  .dif { min-width: 56px; text-align: center; padding: 3px 8px; border-radius: 999px; font-weight: 800; font-size: 0.82rem; background: var(--superficie); }
  .dif.baja { background: var(--primario-claro); color: var(--primario-fuerte); }
  .dif.sube { background: var(--superficie-3); color: var(--texto); }
</style>
