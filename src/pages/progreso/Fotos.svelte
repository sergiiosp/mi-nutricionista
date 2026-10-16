<script>
  import Icono from '../../components/Icono.svelte';
  import Emoji from '../../components/Emoji.svelte';
  import { estado, actualizar, nuevoId } from '../../stores/estado.js';
  import { avisar } from '../../stores/ui.js';
  import { hoyISO } from '../../lib/planificador.js';
  import { guardarFoto, urlFoto, borrarFoto } from '../../lib/fotos.js';
  import { fechaCorta } from '../../lib/formato.js';

  let entrada;
  let urls = $state({});
  const fotos = $derived([...($estado.fotosProgreso || [])].sort((a, b) => a.fecha.localeCompare(b.fecha)));

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
    actualizar((e) => { (e.fotosProgreso ||= []).push({ id, fecha: hoyISO() }); });
    avisar('Foto guardada solo en este dispositivo', '📸');
    ev.currentTarget.value = '';
  }

  async function borrar(id) {
    if (!confirm('¿Borrar esta foto?')) return;
    await borrarFoto(id);
    actualizar((e) => { e.fotosProgreso = e.fotosProgreso.filter((f) => f.id !== id); });
  }
</script>

<div class="tarjeta intro"><Emoji e="🔒" tam={32} /><p>Tus fotos se guardan <b>solo en este dispositivo</b>; no se suben a ningún sitio. Hazlas siempre con la misma luz, ropa y postura (de frente, de lado y de espaldas).</p></div>
<button class="boton ancho" onclick={() => entrada.click()}><Icono e="📸" tam={18} /> Añadir foto de hoy</button>
<input bind:this={entrada} type="file" accept="image/*" capture="user" hidden onchange={añadir} />

{#if fotos.length >= 2}
  <h2 class="seccion">Antes y ahora</h2>
  <div class="comparar">
    {#each [fotos[0], fotos.at(-1)] as f, i (f.id + i)}
      <figure>{#if urls[f.id]}<img src={urls[f.id]} alt="Foto de progreso del {fechaCorta(f.fecha)}" />{/if}<figcaption>{i ? 'Ahora' : 'Antes'} · {fechaCorta(f.fecha)}</figcaption></figure>
    {/each}
  </div>
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
  .intro p { margin: 0; font-size: 0.9rem; font-weight: 600; }
  .ancho { width: 100%; }
  .comparar { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .galeria { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
  figure { margin: 0; border-radius: 18px; overflow: hidden; background: var(--superficie); box-shadow: var(--sombra); }
  figure img { width: 100%; aspect-ratio: 3 / 4; object-fit: cover; display: block; background: var(--superficie-2); }
  figcaption { display: flex; justify-content: space-between; align-items: center; padding: 6px 10px; font-size: 0.78rem; font-weight: 800; color: var(--texto-2); }
  figcaption button { border: 0; background: none; cursor: pointer; padding: 0; }
</style>
