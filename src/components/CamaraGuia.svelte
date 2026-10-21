<script>
  // Foto de progreso con guía: la cámara con tu última foto de esa pose en transparencia (calco),
  // líneas para cabeza y pies y cuenta atrás, para que todas salgan desde el mismo sitio y la misma pose.
  import { onMount, onDestroy } from 'svelte';
  import Icono from './Icono.svelte';
  import { estado, actualizar, nuevoId } from '../stores/estado.js';
  import { avisar, cerrarHoja, abrirHoja } from '../stores/ui.js';
  import { guardarFoto, urlFoto } from '../lib/fotos.js';
  import { hoyISO } from '../lib/planificador.js';

  let { pose = 'frente', volver = null } = $props(); // volver: hoja a la que regresar (la revisión del mes)
  const NOMBRE = { frente: 'de frente', lado: 'de lado', espalda: 'de espaldas' };
  let video = $state();
  let stream = null;
  let error = $state('');
  let frontal = $state(true);
  let calco = $state('');
  let opacidad = $state(35);
  let cuenta = $state(0);

  const anterior = [...($estado.fotosProgreso || [])].filter((f) => (f.pose || 'frente') === pose).sort((a, b) => a.fecha.localeCompare(b.fecha)).at(-1);
  if (anterior) urlFoto(anterior.id).then((u) => (calco = u || ''));

  async function arrancar() {
    parar();
    error = '';
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: frontal ? 'user' : 'environment', width: { ideal: 1280 }, height: { ideal: 1706 } }, audio: false });
      video.srcObject = stream;
      await video.play();
    } catch {
      error = 'No puedo abrir la cámara. Dale permiso en los ajustes del móvil o sube la foto desde la galería.';
    }
  }
  function parar() { stream?.getTracks().forEach((t) => t.stop()); stream = null; }
  onMount(() => { if (navigator.mediaDevices?.getUserMedia) arrancar(); else error = 'Este navegador no deja usar la cámara desde la app: sube la foto desde la galería.'; });
  onDestroy(parar);

  function disparar() {
    if (cuenta) return;
    cuenta = 5;
    const t = setInterval(async () => {
      cuenta -= 1;
      if (cuenta > 0) return;
      clearInterval(t);
      await capturar();
    }, 1000);
  }
  async function capturar() {
    // Recorte 3:4 del centro del vídeo (igual que se ve en pantalla)
    const w = video.videoWidth, h = video.videoHeight;
    const ancho = Math.min(w, (h * 3) / 4), alto = (ancho * 4) / 3;
    const lienzo = document.createElement('canvas');
    lienzo.width = ancho; lienzo.height = alto;
    const ctx = lienzo.getContext('2d');
    if (frontal) { ctx.translate(ancho, 0); ctx.scale(-1, 1); } // como en un espejo, igual que la vista previa
    ctx.drawImage(video, (w - ancho) / 2, (h - alto) / 2, ancho, alto, 0, 0, ancho, alto);
    const blob = await new Promise((ok) => lienzo.toBlob(ok, 'image/jpeg', 0.9));
    const id = nuevoId();
    await guardarFoto(id, blob);
    actualizar((e) => { (e.fotosProgreso ||= []).push({ id, fecha: hoyISO(), pose }); });
    avisar(`Foto ${NOMBRE[pose]} guardada solo en este dispositivo`, '📸');
    parar();
    if (volver) abrirHoja(volver.tipo, volver.props); else cerrarHoja();
  }
</script>

<div class="camara">
  <p class="intro">Foto <b>{NOMBRE[pose]}</b>. {anterior ? 'Encaja tu silueta con la de la última foto.' : 'Pies en la línea de abajo y cabeza en la de arriba.'}</p>
  <div class="visor">
    <!-- svelte-ignore a11y_media_has_caption -->
    <video bind:this={video} playsinline muted class:espejo={frontal}></video>
    {#if calco}<img class="calco" src={calco} alt="" style="opacity:{opacidad / 100}" />{/if}
    <span class="guia cabeza" aria-hidden="true"></span><span class="guia pies" aria-hidden="true"></span><span class="guia centro" aria-hidden="true"></span>
    {#if cuenta}<b class="cuenta cifra cifra-xl">{cuenta}</b>{/if}
    {#if error}<p class="error">{error}</p>{/if}
  </div>
  {#if calco}
    <label class="opac"><span>Calco de la última foto</span><input type="range" min="0" max="70" bind:value={opacidad} aria-label="Transparencia del calco" /></label>
  {/if}
  <div class="acciones-cam">
    <button class="boton boton-sec giro" aria-label="Cambiar de cámara" onclick={() => { frontal = !frontal; arrancar(); }}><Icono n="refresh-cw" tam={18} /></button>
    <button class="boton disparo" disabled={!!error || !!cuenta} onclick={disparar}><Icono n="camera" tam={20} /> {cuenta ? `En ${cuenta}…` : 'Hacer foto en 5 s'}</button>
  </div>
  <p class="pie-nota">Deja el móvil apoyado a la altura del pecho, a unos 2 m. Misma luz y misma ropa cada vez.</p>
</div>

<style>
  .intro { margin: 0 0 10px; color: var(--texto-2); font-size: 0.9rem; }
  .intro b { color: var(--texto); }
  .visor { position: relative; aspect-ratio: 3 / 4; border-radius: var(--r-l); overflow: hidden; background: #000; }
  video, .calco { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
  .espejo { transform: scaleX(-1); }
  .calco { pointer-events: none; mix-blend-mode: screen; filter: grayscale(1) contrast(1.2); }
  .guia { position: absolute; left: 8%; right: 8%; border-top: 2px dashed rgb(255 255 255 / 0.55); pointer-events: none; }
  .cabeza { top: 8%; } .pies { top: 94%; }
  .centro { left: 50%; right: auto; top: 6%; bottom: 4%; border-top: 0; border-left: 2px dashed rgb(255 255 255 / 0.3); }
  .cuenta { position: absolute; inset: 0; display: grid; place-items: center; font-size: 6rem; color: #fff; text-shadow: 0 4px 30px rgb(0 0 0 / 0.6); }
  .error { position: absolute; inset: auto 16px 16px; margin: 0; padding: 12px; border-radius: var(--r-s); background: rgb(0 0 0 / 0.7); color: #fff; font-size: 0.86rem; }
  .opac { display: grid; gap: 4px; margin-top: 10px; font-size: 0.8rem; font-weight: 700; color: var(--texto-2); }
  .opac input { accent-color: var(--primario); }
  .acciones-cam { display: flex; gap: 8px; margin-top: 12px; }
  .giro { width: 56px; padding: 0; flex-shrink: 0; }
  .disparo { flex: 1; }
</style>
