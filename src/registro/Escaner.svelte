<script>
  // Escáner de códigos de barras con la cámara + búsqueda en Open Food Facts
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import { porCodigo } from '../lib/off.js';
  import { estado, actualizar } from '../stores/estado.js';

  let { onproducto } = $props();
  let video = $state();
  let mensaje = $state('Apunta al código de barras del envase');
  let error = $state('');
  let buscando = $state(false);
  let manual = $state('');
  let corriendo = true;
  let flujo;

  async function detector() {
    const formatos = ['ean_13', 'ean_8', 'upc_a', 'upc_e'];
    if ('BarcodeDetector' in window) {
      try {
        const soportados = await window.BarcodeDetector.getSupportedFormats();
        if (formatos.some((f) => soportados.includes(f))) return new window.BarcodeDetector({ formats: formatos });
      } catch { /* se usa la alternativa */ }
    }
    const { BarcodeDetector } = await import('barcode-detector/ponyfill');
    return new BarcodeDetector({ formats: formatos });
  }

  async function buscarCodigo(codigo) {
    if (buscando) return;
    buscando = true;
    error = '';
    mensaje = `Código ${codigo}: buscando…`;
    try {
      const guardado = get(estado).productos[`off:${codigo}`];
      const p = guardado || (await porCodigo(codigo));
      if (!p) {
        error = `No encuentro el producto ${codigo} en Open Food Facts. Búscalo por nombre o añádelo como comida propia.`;
        buscando = false;
        mensaje = 'Prueba con otro código';
        return;
      }
      if (!p.completo) {
        error = 'El producto existe pero no tiene la información nutricional completa.';
        buscando = false;
        return;
      }
      actualizar((e) => { e.productos[p.id] = p; });
      corriendo = false;
      onproducto?.(p);
    } catch (e) {
      error = 'No he podido conectar con Open Food Facts. Revisa tu conexión.';
      buscando = false;
    }
  }

  onMount(() => {
    let cancelado = false;
    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        error = 'Este navegador no permite usar la cámara. Escribe el código a mano.';
        return;
      }
      try {
        flujo = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 } }, audio: false });
        if (cancelado) return flujo.getTracks().forEach((t) => t.stop());
        video.srcObject = flujo;
        await video.play();
        const d = await detector();
        const bucle = async () => {
          if (!corriendo || cancelado) return;
          try {
            if (!buscando && video.readyState >= 2) {
              const res = await d.detect(video);
              const codigo = res.find((r) => /^\d{8,14}$/.test(r.rawValue))?.rawValue;
              if (codigo) {
                navigator.vibrate?.(60);
                await buscarCodigo(codigo);
              }
            }
          } catch { /* fotograma ilegible */ }
          setTimeout(bucle, 250);
        };
        bucle();
      } catch (e) {
        error = e?.name === 'NotAllowedError'
          ? 'Necesito permiso para usar la cámara. Actívalo en los ajustes del navegador o escribe el código a mano.'
          : 'No he podido abrir la cámara. Escribe el código a mano.';
      }
    })();
    return () => {
      cancelado = true;
      corriendo = false;
      flujo?.getTracks().forEach((t) => t.stop());
    };
  });
</script>

<div class="visor">
  <!-- svelte-ignore a11y_media_has_caption -->
  <video bind:this={video} playsinline muted></video>
  <div class="marco" class:buscando></div>
  <p class="mensaje">{mensaje}</p>
</div>
{#if error}<p class="alerta">{error}</p>{/if}

<form class="manual" onsubmit={(ev) => { ev.preventDefault(); if (manual.trim()) buscarCodigo(manual.trim()); }}>
  <input inputmode="numeric" pattern="[0-9]*" placeholder="…o escribe el código (8-13 cifras)" bind:value={manual} aria-label="Código de barras" />
  <button class="boton boton-peq" type="submit">Buscar</button>
</form>
<p class="pie-nota">Datos de Open Food Facts, una base de datos abierta. Los productos Hacendado suelen estar; si alguno falla, búscalo por nombre.</p>

<style>
  .visor { position: relative; border-radius: 24px; overflow: hidden; background: #000; aspect-ratio: 4 / 3; }
  video { width: 100%; height: 100%; object-fit: cover; display: block; }
  .marco { position: absolute; left: 12%; right: 12%; top: 32%; bottom: 32%; border: 3px solid rgb(255 255 255 / 0.9); border-radius: 18px; box-shadow: 0 0 0 999px rgb(0 0 0 / 0.35); }
  .marco.buscando { border-color: var(--primario); animation: latido 0.9s infinite; }
  @keyframes latido { 50% { transform: scale(1.03); } }
  .mensaje { position: absolute; left: 0; right: 0; bottom: 10px; margin: 0; text-align: center; color: #fff; font-weight: 800; text-shadow: 0 1px 4px rgb(0 0 0 / 0.6); }
  .manual { display: flex; gap: 8px; margin-top: 12px; }
  .manual input { flex: 1; min-height: 44px; padding: 10px 14px; border-radius: 14px; border: 1.5px solid var(--borde); background: var(--superficie); font-weight: 700; color: var(--texto); }
</style>
