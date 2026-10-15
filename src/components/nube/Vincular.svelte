<script>
  // Usar en este dispositivo la cuenta de otro: escaneando su QR o escribiendo su código
  import { get } from 'svelte/store';
  import Emoji from '../Emoji.svelte';
  import Segmentos from '../Segmentos.svelte';
  import EscanerQR from './EscanerQR.svelte';
  import { estado } from '../../stores/estado.js';
  import { avisar } from '../../stores/ui.js';
  import { unirse, canjearCodigo } from '../../lib/nube/sincro.js';

  let { clave = null, onhecho } = $props();
  const camara = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && matchMedia('(pointer: coarse)').matches;
  let modo = $state(clave ? 'enlace' : camara ? 'qr' : 'codigo');
  let codigo = $state('');
  let error = $state('');
  let ocupado = $state(false);

  const confirmar = () => !get(estado).perfil
    || confirm('Este dispositivo ya tiene datos. Al vincularlo se sustituirán por los de tu cuenta (perfil, menús, registros y entrenos). ¿Seguir?');

  async function hacer(fn) {
    if (!confirmar()) return;
    error = '';
    ocupado = true;
    try {
      await fn();
      avisar('¡Dispositivo vinculado! Tus datos ya están aquí', '🔗');
      onhecho?.();
    } catch (e) {
      error = e.message;
    }
    ocupado = false;
  }

  function leido(texto) {
    const m = String(texto).match(/#vincular=([\w-]{32})$/);
    if (!m) { error = 'Ese QR no es de Mi Nutricionista. Abre Mi plan → Conectar → «Añadir otro dispositivo» en el otro dispositivo.'; modo = 'codigo'; return; }
    hacer(() => unirse(m[1]));
  }
</script>

{#if modo === 'enlace'}
  <div class="tarjeta centro">
    <Emoji e="🔗" tam={56} />
    <p><b>Vas a vincular este dispositivo</b> con tu cuenta de Mi Nutricionista. Verás aquí tu perfil, menús, registros y entrenos, y todo se mantendrá sincronizado.</p>
    <button class="boton ancho" disabled={ocupado} onclick={() => hacer(() => unirse(clave))}>{ocupado ? 'Vinculando…' : 'Vincular este dispositivo'}</button>
  </div>
{:else}
  <Segmentos opciones={[{ id: 'qr', nombre: 'Escanear QR', emoji: '📷' }, { id: 'codigo', nombre: 'Escribir código', emoji: '⌨️' }]} bind:valor={modo} />
  {#if modo === 'qr'}
    {#if !ocupado}<EscanerQR onleido={leido} />{:else}<p class="centro">Vinculando…</p>{/if}
    <p class="pie-nota">En tu otro dispositivo: Mi plan → Conectar → «Añadir otro dispositivo».</p>
  {:else}
    <form class="tarjeta" onsubmit={(ev) => { ev.preventDefault(); hacer(() => canjearCodigo(codigo)); }}>
      <label class="campo"><span>Código de 8 letras</span>
        <input class="codigo" bind:value={codigo} placeholder="ABCD-2345" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="9" />
      </label>
      <button class="boton ancho" type="submit" disabled={ocupado}>{ocupado ? 'Vinculando…' : 'Vincular'}</button>
      <p class="pie-nota">Lo ves en tu otro dispositivo en Mi plan → Conectar → «Añadir otro dispositivo». Caduca a los 10 minutos.</p>
    </form>
  {/if}
{/if}
{#if error}<p class="alerta">{error}</p>{/if}

<style>
  .centro { text-align: center; }
  .ancho { width: 100%; margin-top: 8px; }
  .codigo { font-size: 1.4rem; font-weight: 900; letter-spacing: 0.18em; text-align: center; text-transform: uppercase; }
</style>
