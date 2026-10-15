<script>
  // Lee un código QR con la cámara (BarcodeDetector nativo o la alternativa en WebAssembly)
  import { onMount } from 'svelte';

  let { onleido } = $props();
  let video = $state();
  let error = $state('');
  let flujo;

  async function detector() {
    if ('BarcodeDetector' in window) {
      try {
        if ((await window.BarcodeDetector.getSupportedFormats()).includes('qr_code')) return new window.BarcodeDetector({ formats: ['qr_code'] });
      } catch { /* se usa la alternativa */ }
    }
    const { BarcodeDetector } = await import('barcode-detector/ponyfill');
    return new BarcodeDetector({ formats: ['qr_code'] });
  }

  onMount(() => {
    let activo = true;
    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        error = 'Este navegador no permite usar la cámara: usa el código de 8 letras.';
        return;
      }
      try {
        flujo = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
        if (!activo) return flujo.getTracks().forEach((t) => t.stop());
        video.srcObject = flujo;
        await video.play();
        const d = await detector();
        const bucle = async () => {
          if (!activo) return;
          try {
            if (video.readyState >= 2) {
              const texto = (await d.detect(video))[0]?.rawValue;
              if (texto) {
                navigator.vibrate?.(60);
                activo = false;
                flujo.getTracks().forEach((t) => t.stop());
                onleido?.(texto);
                return;
              }
            }
          } catch { /* fotograma ilegible */ }
          setTimeout(bucle, 250);
        };
        bucle();
      } catch (e) {
        error = e?.name === 'NotAllowedError'
          ? 'Necesito permiso para usar la cámara. Actívalo en los ajustes o usa el código de 8 letras.'
          : 'No he podido abrir la cámara: usa el código de 8 letras.';
      }
    })();
    return () => {
      activo = false;
      flujo?.getTracks().forEach((t) => t.stop());
    };
  });
</script>

<div class="visor">
  <!-- svelte-ignore a11y_media_has_caption -->
  <video bind:this={video} playsinline muted></video>
  <div class="marco"></div>
  <p class="mensaje">Apunta al código QR de tu otro dispositivo</p>
</div>
{#if error}<p class="alerta">{error}</p>{/if}

<style>
  .visor { position: relative; border-radius: 24px; overflow: hidden; background: #000; aspect-ratio: 1; max-height: 360px; margin: 0 auto; }
  video { width: 100%; height: 100%; object-fit: cover; display: block; }
  .marco { position: absolute; inset: 18%; border: 3px solid rgb(255 255 255 / 0.9); border-radius: 22px; box-shadow: 0 0 0 999px rgb(0 0 0 / 0.35); }
  .mensaje { position: absolute; left: 0; right: 0; bottom: 10px; margin: 0; text-align: center; color: #fff; font-weight: 800; text-shadow: 0 1px 4px rgb(0 0 0 / 0.6); }
</style>
