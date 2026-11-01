<script>
  // Portada: foto a sangre con el texto encima, pegado abajo. En Entreno la foto va en blanco y negro
  // teñida del color del tipo (duotono); en Comida, en su color (la comida tiene que apetecer).
  // En el tema claro (al estilo de Cal AI), siempre en su color real, sin tinte y con un velo neutro.
  let { foto = '', color = 'var(--lila)', alto = 300, etiqueta = '', duotono = true, children } = $props();
</script>

<section class="portada" class:color-real={!duotono} style="--c:{color};min-height:{alto}px" aria-label={etiqueta || undefined}>
  {#if foto}<img class="foto-fondo" src={foto} alt="" />{/if}
  {#if duotono}<span class="tinte" aria-hidden="true"></span>{/if}
  <span class="velo" aria-hidden="true"></span>
  <div class="dentro">{@render children?.()}</div>
</section>

<style>
  .portada {
    position: relative; overflow: hidden; isolation: isolate; display: flex; border-radius: var(--r-xl); color: #fff;
    background: linear-gradient(160deg, color-mix(in srgb, var(--c) 40%, #121218), #0b0b0e);
    box-shadow: 0 18px 40px color-mix(in srgb, var(--c) 20%, transparent), 0 0 0 1px color-mix(in srgb, var(--c) 28%, transparent);
  }
  .foto-fondo { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; z-index: 0; filter: grayscale(1) contrast(1.2) brightness(0.85); }
  .color-real .foto-fondo { filter: saturate(1.1) contrast(1.05); }
  .color-real { background: radial-gradient(120% 90% at 100% 0%, color-mix(in srgb, var(--c) 34%, #15171a), #0d0e10 70%); box-shadow: 0 18px 40px rgb(0 0 0 / 0.3), 0 0 0 1px color-mix(in srgb, var(--c) 22%, transparent); }
  .tinte { position: absolute; inset: 0; z-index: 1; background: var(--c); mix-blend-mode: color; opacity: 0.85; }
  .velo { position: absolute; inset: 0; z-index: 1; background: linear-gradient(180deg, rgb(8 8 12 / 0.3) 0%, rgb(8 8 12 / 0.1) 28%, rgb(8 8 12 / 0.8) 66%, rgb(8 8 12 / 0.94) 100%); }
  .color-real .velo { background: linear-gradient(180deg, rgb(8 8 12 / 0.35) 0%, rgb(8 8 12 / 0) 30%, rgb(8 8 12 / 0.7) 62%, rgb(8 8 12 / 0.92) 100%); }
  .dentro { position: relative; z-index: 2; flex: 1; min-width: 0; display: flex; flex-direction: column; padding: 18px; }
  :global(:root[data-theme="light"]) .tinte { display: none; }
  :global(:root[data-theme="light"]) .foto-fondo { filter: saturate(1.05) contrast(1.02); }

  /* Tema claro, al estilo de la ficha de Cal AI: la foto arriba y el contenido en una hoja blanca */
  :global(:root[data-theme="light"]) .portada { display: block; min-height: 0 !important; padding-top: 180px; color: var(--texto); background: var(--superficie); box-shadow: var(--sombra); border-radius: var(--r-l); }
  :global(:root[data-theme="light"]) .foto-fondo { inset: 0 0 auto 0; height: 204px; }
  :global(:root[data-theme="light"]) .velo { display: none; }
  :global(:root[data-theme="light"]) .dentro { padding: 16px; border-radius: var(--r-l) var(--r-l) 0 0; background: var(--superficie); gap: 10px; }
</style>
