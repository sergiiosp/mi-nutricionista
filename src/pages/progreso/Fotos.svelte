<script>
  import Icono from '../../components/Icono.svelte';
  import Emoji from '../../components/Emoji.svelte';
  import { estado, actualizar, nuevoId } from '../../stores/estado.js';
  import { avisar } from '../../stores/ui.js';
  import { hoyISO, sumarDias } from '../../lib/planificador.js';
  import { guardarFoto, urlFoto, borrarFoto } from '../../lib/fotos.js';
  import { fechaCorta } from '../../lib/formato.js';
  import { abrirHoja } from '../../stores/ui.js';

  let entrada;
  let pose = $state('frente');
  const POSES = [['frente', 'De frente'], ['lado', 'De lado'], ['espalda', 'De espaldas']];
  let corte = $state(50); // posición del deslizador antes/ahora
  let idAntes = $state(null);
  let idAhora = $state(null);
  let urls = $state({});
  const fotos = $derived([...($estado.fotosProgreso || [])].sort((a, b) => a.fecha.localeCompare(b.fecha)));
  // Se comparan fotos de la misma pose (las antiguas sin pose cuentan como «de frente»)
  const dePose = $derived(fotos.filter((f) => (f.pose || 'frente') === pose));
  const ultimaFecha = $derived(fotos.at(-1)?.fecha);
  const proxima = $derived(ultimaFecha ? sumarDias(ultimaFecha, 14) : null);

  $effect(() => {
    for (const f of fotos) {
      if (!urls[f.id]) urlFoto(f.id).then((u) => { if (u) urls = { ...urls, [f.id]: u }; });
    }
  });

  async function añadir(ev) {
    const archivo = ev.currentTarget.files?.[0];
    if (!archivo) return;
    const id = nuevoId();
    await guardarFoto(id, archivo);
    actualizar((e) => { (e.fotosProgreso ||= []).push({ id, fecha: hoyISO(), pose }); });
    avisar('Foto guardada solo en este dispositivo', '📸');
    ev.currentTarget.value = '';
  }

  async function borrar(id) {
    if (!confirm('¿Borrar esta foto?')) return;
    await borrarFoto(id);
    actualizar((e) => { e.fotosProgreso = e.fotosProgreso.filter((f) => f.id !== id); });
  }
</script>

<div class="tarjeta intro">
  <Emoji e="📸" tam={32} />
  <div>
    <p><b>Para qué sirve:</b> el espejo engaña porque te ves cada día. Con una foto cada 2 semanas, misma pose y misma luz, aquí comparas el antes y el ahora deslizando una sobre otra.</p>
    <p class="mini"><Icono n="lock" tam={13} /> Se guardan <b>solo en este dispositivo</b>; no se suben a ningún sitio ni se sincronizan.</p>
  </div>
</div>
<details class="tarjeta como" open={!fotos.length}>
  <summary><b>Cómo hacerlas bien</b></summary>
  <ul>
    <li>Por la mañana, en ayunas y con la misma ropa (bañador o ropa interior).</li>
    <li>Misma luz y mismo sitio: delante de una pared lisa, luz de frente (no a contraluz).</li>
    <li>Móvil a la altura del pecho, a unos 2 m, apoyado o con temporizador. Brazos relajados, sin apretar.</li>
    <li>Tres fotos: de frente, de lado y de espaldas. Elige la pose antes de hacerla.</li>
  </ul>
</details>
{#if proxima}<p class="pie-nota">Última foto el {fechaCorta(ultimaFecha)}. {proxima <= hoyISO() ? 'Ya toca la siguiente.' : `La siguiente, a partir del ${fechaCorta(proxima)}.`}</p>{/if}
<div class="poses" role="radiogroup" aria-label="Pose">
  {#each POSES as [v, n] (v)}<button role="radio" aria-checked={pose === v} class:activo={pose === v} onclick={() => (pose = v)}>{n}</button>{/each}
</div>
<button class="boton ancho" onclick={() => abrirHoja('camara', { pose })}><Icono n="camera" tam={18} /> Hacer foto {POSES.find(([v]) => v === pose)[1].toLowerCase()} con guía</button>
<button class="boton boton-sec ancho galeria-btn" onclick={() => entrada.click()}>Subir una de la galería</button>
<input bind:this={entrada} type="file" accept="image/*" capture="user" hidden onchange={añadir} />

{#if dePose.length >= 2}
  {@const antes = dePose.find((f) => f.id === idAntes) || dePose[0]}
  {@const ahora = dePose.find((f) => f.id === idAhora) || dePose.at(-1)}
  <h2 class="seccion">Antes y ahora</h2>
  <div class="deslizar">
    {#if urls[antes.id]}<img src={urls[antes.id]} alt="Antes, {fechaCorta(antes.fecha)}" />{/if}
    {#if urls[ahora.id]}<img class="encima" src={urls[ahora.id]} alt="Ahora, {fechaCorta(ahora.fecha)}" style="clip-path: inset(0 0 0 {corte}%)" />{/if}
    <span class="raya" style="left:{corte}%"></span>
    <span class="et izq">Antes · {fechaCorta(antes.fecha)}</span><span class="et der">Ahora · {fechaCorta(ahora.fecha)}</span>
  </div>
  <input class="corte" type="range" min="0" max="100" bind:value={corte} aria-label="Deslizar entre antes y ahora" />
  {#if dePose.length > 2}
    <div class="elegir-fechas">
      <label><span>Antes</span><select bind:value={idAntes}>{#each dePose as f (f.id)}<option value={f.id}>{fechaCorta(f.fecha)}</option>{/each}</select></label>
      <label><span>Ahora</span><select bind:value={idAhora}>{#each dePose as f (f.id)}<option value={f.id}>{fechaCorta(f.fecha)}</option>{/each}</select></label>
    </div>
  {/if}
{:else if fotos.length}
  <p class="pie-nota">Cuando tengas dos fotos {POSES.find(([v]) => v === pose)[1].toLowerCase()}, aquí las podrás comparar.</p>
{/if}

{#if fotos.length}
  <h2 class="seccion">Todas</h2>
  <div class="galeria">
    {#each [...fotos].reverse() as f (f.id)}
      <figure>
        {#if urls[f.id]}<img src={urls[f.id]} alt="Foto de progreso del {fechaCorta(f.fecha)}" />{/if}
        <figcaption>{fechaCorta(f.fecha)} <button aria-label="Borrar foto" onclick={() => borrar(f.id)}><Icono e="🗑️" tam={18} /></button></figcaption>
      </figure>
    {/each}
  </div>
{/if}

<style>
  .intro { display: flex; gap: 12px; align-items: flex-start; }
  .intro p { margin: 0 0 6px; font-size: 0.9rem; font-weight: 600; }
  .intro .mini { font-size: 0.78rem; color: var(--texto-2); display: flex; gap: 6px; align-items: center; }
  .como ul { margin: 8px 0 0; padding-left: 18px; display: grid; gap: 4px; font-size: 0.85rem; color: var(--texto-2); }
  .poses { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin: 4px 0 10px; }
  .poses button { min-height: 44px; border-radius: 12px; border: 1px solid var(--borde); background: var(--superficie); color: var(--texto); font-weight: 700; font-size: 0.84rem; cursor: pointer; }
  .poses button.activo { border-color: var(--primario); background: var(--primario-claro); color: var(--primario-fuerte); }
  .deslizar { position: relative; border-radius: 18px; overflow: hidden; aspect-ratio: 3 / 4; background: var(--superficie-2); }
  .deslizar img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
  .raya { position: absolute; top: 0; bottom: 0; width: 2px; background: #fff; box-shadow: 0 0 8px rgb(0 0 0 / 0.5); }
  .et { position: absolute; bottom: 8px; padding: 3px 8px; border-radius: 999px; background: rgb(0 0 0 / 0.55); color: #fff; font-size: 0.72rem; font-weight: 700; }
  .et.izq { left: 8px; } .et.der { right: 8px; }
  .corte { width: 100%; margin: 10px 0 0; accent-color: var(--primario); }
  .ancho { width: 100%; }
  .galeria-btn { margin-top: 8px; }
  .elegir-fechas { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 10px; }
  .elegir-fechas label { display: grid; gap: 4px; font-size: 0.76rem; font-weight: 700; color: var(--texto-2); }
  .elegir-fechas select { min-height: 44px; padding: 0 10px; border-radius: 12px; border: 1px solid var(--borde); background: var(--superficie); color: var(--texto); font: inherit; font-size: 16px; }
  .galeria { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
  figure { margin: 0; border-radius: 18px; overflow: hidden; background: var(--superficie); box-shadow: var(--sombra); }
  figure img { width: 100%; aspect-ratio: 3 / 4; object-fit: cover; display: block; background: var(--superficie-2); }
  figcaption { display: flex; justify-content: space-between; align-items: center; padding: 6px 10px; font-size: 0.78rem; font-weight: 700; color: var(--texto-2); }
  figcaption button { display: inline-grid; place-items: center; min-width: 44px; min-height: 44px; border: 0; background: none; cursor: pointer; padding: 0; }
</style>
