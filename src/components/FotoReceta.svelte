<script>
  // Foto real de la receta o, si no la hay, su «ficha de plato»: el ingrediente principal y las
  // proporciones de proteína, hidrato y verdura. En miniaturas, un plato en anillo con esas proporciones.
  import { FOTOS_RECETAS } from '../data/fotos.js';
  import { composicion } from '../lib/composicion.js';

  let { receta, alto = 140, redondeo = 18, tamEmoji = 64, clase = '' } = $props();
  // Si la receta se adaptó cambiando un fruto seco, la foto ya no es fiel (sale lo que no puedes comer)
  const tieneFoto = $derived(!!FOTOS_RECETAS[receta?.id] && !receta?.sinFoto);
  const c = $derived(composicion(receta));
  const pct = (x) => Math.round(x * 100);
  const etiqueta = $derived(`Plato: proteína ${pct(c.p)} %, hidratos ${pct(c.c)} %, verdura ${pct(c.v)} %`);
  const miniatura = $derived(alto < 100);
  const grande = $derived(alto >= 140);
  // Anillo: los tres tramos seguidos (proteína, hidrato, verdura)
  const anillo = $derived(`conic-gradient(from -90deg, var(--coral) 0 ${pct(c.p)}%, var(--amarillo) ${pct(c.p)}% ${pct(c.p + c.c)}%, var(--exito) ${pct(c.p + c.c)}% 100%)`);
  const palabra = $derived(c.titulo.split(' ')[0]);
</script>

<div class="foto {clase}" style="height:{alto}px;border-radius:{redondeo}px">
  {#if tieneFoto}
    <img src="img/recetas/{receta.id}.webp" alt={receta.nombre} loading="lazy" />
  {:else if miniatura}
    <div class="plato-mini" role="img" aria-label={etiqueta}>
      <span class="anillo" style="background:{anillo}; width:{Math.round(alto * 0.74)}px"></span>
      {#if alto >= 70}<b class="centro" style="font-size:{Math.max(10, Math.round(alto / 7))}px">{palabra}</b>{/if}
    </div>
  {:else}
    <div class="ficha" class:grande role="img" aria-label={etiqueta}>
      <b class="titulo">{c.titulo}</b>
      {#if c.sub}<span class="sub">{c.sub}</span>{/if}
      <span class="barra" aria-hidden="true">
        {#if c.p}<i class="bp" style="flex:{c.p}"></i>{/if}
        {#if c.c}<i class="bc" style="flex:{c.c}"></i>{/if}
        {#if c.v}<i class="bv" style="flex:{c.v}"></i>{/if}
      </span>
      {#if grande}
        <span class="leyenda" aria-hidden="true">
          <span><i class="bp"></i>Proteína {pct(c.p)} %</span>
          <span><i class="bc"></i>Hidratos {pct(c.c)} %</span>
          <span><i class="bv"></i>Verdura {pct(c.v)} %</span>
        </span>
      {/if}
    </div>
  {/if}
</div>

<style>
  .foto { position: relative; overflow: hidden; flex-shrink: 0; background: var(--superficie-2); }
  img { width: 100%; height: 100%; object-fit: cover; display: block; }

  /* Ficha de plato (tarjetas anchas y cabecera de receta) */
  .ficha {
    position: absolute; inset: 0; display: flex; flex-direction: column; justify-content: flex-end; gap: 3px;
    padding: 12px 14px 14px;
    background: linear-gradient(165deg, color-mix(in srgb, var(--primario) 16%, var(--superficie-2)) 0%, var(--superficie) 100%);
  }
  .titulo { font-size: 1.12rem; line-height: 1.15; font-weight: 700; letter-spacing: -0.02em; color: var(--texto); }
  .sub { font-size: 0.76rem; font-weight: 600; color: color-mix(in srgb, var(--primario-fuerte) 55%, var(--texto-2)); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .barra { display: flex; gap: 3px; height: 6px; margin-top: 8px; }
  .barra i { border-radius: 999px; min-width: 6px; }
  .bp { background: var(--coral); }
  .bc { background: var(--amarillo); }
  .bv { background: var(--exito); }
  .grande { padding: 16px 18px 16px; gap: 4px; }
  .grande .titulo { font-size: 1.5rem; }
  .grande .sub { font-size: 0.86rem; }
  .grande .barra { height: 8px; margin-top: 12px; }
  .leyenda { display: flex; flex-wrap: wrap; gap: 4px 14px; margin-top: 8px; font-size: 0.74rem; font-weight: 600; color: var(--texto-2); font-variant-numeric: tabular-nums; }
  .leyenda span { display: inline-flex; align-items: center; gap: 6px; }
  .leyenda i { width: 7px; height: 7px; border-radius: 50%; }

  /* Miniatura: el plato visto desde arriba, en anillo */
  .plato-mini {
    position: absolute; inset: 0; display: grid; place-items: center;
    background: linear-gradient(160deg, color-mix(in srgb, var(--primario) 14%, var(--superficie-2)), var(--superficie));
  }
  .anillo {
    grid-area: 1 / 1; aspect-ratio: 1; border-radius: 50%;
    -webkit-mask: radial-gradient(circle, transparent 54%, #000 55.5%);
    mask: radial-gradient(circle, transparent 54%, #000 55.5%);
  }
  .centro { grid-area: 1 / 1; max-width: 62%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 700; letter-spacing: -0.01em; color: var(--texto); text-align: center; }
</style>
