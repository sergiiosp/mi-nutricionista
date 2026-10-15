<script>
  // Icono 3D (Fluent Emoji, MIT) con el emoji normal como alternativa si no hay imagen
  import { EMOJIS_3D } from '../data/emojis.js';

  let { e = '🍽️', tam = 24, clase = '' } = $props();
  const codigo = $derived([...e].map((c) => c.codePointAt(0).toString(16)).join('-').replace(/-fe0f/g, ''));
  let fallo = $state(false);
</script>

{#if EMOJIS_3D.has(codigo) && !fallo}
  <img class="emoji3d {clase}" src="emoji/{codigo}.webp" alt="" width={tam} height={tam} loading="lazy" draggable="false" onerror={() => (fallo = true)} />
{:else}
  <span class="emoji-txt {clase}" style="font-size:{tam * 0.85}px" aria-hidden="true">{e}</span>
{/if}

<style>
  .emoji3d { display: inline-block; vertical-align: middle; object-fit: contain; flex-shrink: 0; }
  .emoji-txt { display: inline-grid; place-items: center; line-height: 1; vertical-align: middle; }
</style>
