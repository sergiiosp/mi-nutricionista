<script>
  import Icono from '../../components/Icono.svelte';
  // Mi plan → Conectar: sincronización entre dispositivos, copias de seguridad y recordatorios
  import { onMount } from 'svelte';
  import qrcode from 'qrcode-generator';
  import Emoji from '../../components/Emoji.svelte';
  import Vincular from '../../components/nube/Vincular.svelte';
  import { estado } from '../../stores/estado.js';
  import { avisar } from '../../stores/ui.js';
  import { nube, meta, sincronizar, crearCuenta, desvincular, borrarCuenta, enlaceVincular, crearCodigo, listarCopias, restaurarCopia } from '../../lib/nube/sincro.js';
  import { formatoCodigo } from '../../lib/nube/cripto.js';
  import { prefsAvisos, soporteAvisos, activarAvisos, desactivarAvisos, cambiarPrefsAvisos, probarAviso, calcularAvisos } from '../../lib/nube/avisos.js';
  import { fechaCorta, num } from '../../lib/formato.js';

  let vista = $state(null); // 'vincular' | 'añadir' | 'enlace'
  let claveEnlace = $state(null);
  let ocupado = $state('');
  let error = $state('');
  let codigo = $state(null);
  let ahora = $state(Date.now());
  let copias = $state(null);
  let prefs = $state(prefsAvisos());
  const soporte = soporteAvisos();

  onMount(() => {
    const c = sessionStorage.getItem('vincular');
    if (c) {
      sessionStorage.removeItem('vincular');
      if (c !== meta.clave) { claveEnlace = c; vista = 'enlace'; }
    }
    const reloj = setInterval(() => (ahora = Date.now()), 1000);
    return () => clearInterval(reloj);
  });


  async function hacer(id, fn, ok) {
    error = '';
    ocupado = id;
    try {
      await fn();
      if (ok) avisar(ok[0], ok[1]);
    } catch (e) {
      error = e.message;
    }
    ocupado = '';
  }

  const hace = (t) => {
    if (!t) return 'nunca';
    const s = Math.round((ahora - t) / 1000);
    if (s < 60) return 'ahora mismo';
    if (s < 3600) return `hace ${Math.round(s / 60)} min`;
    if (s < 86400) return `hace ${Math.round(s / 3600)} h`;
    return `hace ${Math.round(s / 86400)} días`;
  };

  // QR dibujado como SVG (se adapta al tema)
  const qr = $derived.by(() => {
    if (vista !== 'añadir' || !$nube.activa) return null;
    const q = qrcode(0, 'M');
    q.addData(enlaceVincular());
    q.make();
    const n = q.getModuleCount();
    let d = '';
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (q.isDark(y, x)) d += `M${x} ${y}h1v1h-1z`;
    return { n, d };
  });

  async function nuevoCodigo() {
    await hacer('codigo', async () => { codigo = await crearCodigo(); });
  }
  const restante = $derived(codigo ? Math.max(0, Math.round((codigo.expira - ahora) / 1000)) : 0);

  const proximos = $derived(prefs.activo ? calcularAvisos($estado, prefs).slice(0, 3) : []);
  const DIAS = [[1, 'lunes'], [2, 'martes'], [3, 'miércoles'], [4, 'jueves'], [5, 'viernes'], [6, 'sábado'], [0, 'domingo']];
  const horaDe = (t) => new Date(t).toLocaleString('es-ES', { weekday: 'short', hour: '2-digit', minute: '2-digit' });

  async function cambiarPref(cambios) {
    prefs = { ...prefs, ...cambios };
    await hacer('prefs', () => cambiarPrefsAvisos(cambios));
  }
</script>

{#if vista === 'enlace' || vista === 'vincular'}
  <div class="volver"><button class="boton-texto" onclick={() => (vista = null)}>‹ Volver</button></div>
  <Vincular clave={claveEnlace} onhecho={() => (vista = null)} />
{:else}
  {#if error}<p class="alerta">{error}</p>{/if}

  <!-- ── Sincronización ─────────────────────────────────────────────── -->
  <h2 class="seccion"><Emoji e="☁️" tam={24} /> Móvil y ordenador</h2>
  {#if !$nube.activa}
    <div class="tarjeta">
      <p class="intro">Usa la app en el móvil y en el ordenador con los mismos datos. Se guardan <b>cifrados de extremo a extremo</b> en tu servidor (solo tus dispositivos pueden leerlos) y cada día se hace una copia de seguridad.</p>
      <button class="boton ancho" disabled={!!ocupado} onclick={() => hacer('crear', crearCuenta, ['Sincronización activada', '☁️'])}>{ocupado === 'crear' ? 'Activando…' : 'Activar en este dispositivo'}</button>
      <button class="boton boton-sec ancho" onclick={() => (vista = 'vincular')}><Icono e="🔗" tam={18} /> Ya la uso en otro dispositivo</button>
    </div>
  {:else}
    <div class="tarjeta">
      <div class="estado-sync">
        <span class="punto e-{$nube.estado}"></span>
        <span class="txt">
          <b>{$nube.estado === 'sincronizando' ? 'Sincronizando…' : $nube.estado === 'error' ? 'No se pudo sincronizar' : $nube.estado === 'sin-conexion' ? 'Sin conexión' : 'Sincronizado'}</b>
          <small>{$nube.estado === 'error' ? $nube.error : `Última vez: ${hace($nube.ultima)}`}</small>
        </span>
        <button class="boton boton-sec boton-peq" disabled={$nube.estado === 'sincronizando'} onclick={() => sincronizar()}><Icono e="🔄" tam={18} /></button>
      </div>
      {#if vista === 'añadir' && qr}
        <div class="añadir">
          <p><b>En el otro dispositivo</b> abre Mi Nutricionista y, en la bienvenida o en Mi plan → Conectar, pulsa «Ya la uso en otro dispositivo». Después escanea este código:</p>
          <svg class="qr" viewBox="-2 -2 {qr.n + 4} {qr.n + 4}" role="img" aria-label="Código QR para vincular otro dispositivo">
            <rect x="-2" y="-2" width={qr.n + 4} height={qr.n + 4} fill="#fff" />
            <path d={qr.d} fill="#163a2c" />
          </svg>
          <p class="pie-nota"><Icono e="⚠️" tam={18} /> Este QR da acceso a todos tus datos: no lo compartas.</p>
          {#if codigo && restante > 0}
            <p class="codigo-grande">{formatoCodigo(codigo.codigo)}</p>
            <p class="pie-nota centro">Escríbelo en el otro dispositivo · caduca en {Math.floor(restante / 60)}:{String(restante % 60).padStart(2, '0')}</p>
          {:else}
            <button class="boton boton-sec ancho" disabled={ocupado === 'codigo'} onclick={nuevoCodigo}><Icono e="⌨️" tam={18} /> ¿Sin cámara? Ver código de 8 letras</button>
          {/if}
          <button class="boton-texto ancho" onclick={() => { vista = null; codigo = null; }}>Cerrar</button>
        </div>
      {:else}
        <button class="boton ancho" onclick={() => (vista = 'añadir')}><Icono e="📱" tam={18} /> Añadir otro dispositivo</button>
      {/if}
      <p class="pie-nota">Se sincroniza todo menos las fotos (se quedan en cada dispositivo).</p>
    </div>

    <!-- ── Copias ─────────────────────────────────────────────────── -->
    <h2 class="seccion"><Emoji e="💾" tam={24} /> Copias de seguridad</h2>
    <div class="tarjeta">
      <p class="intro">Cada día que usas la app se guarda una copia en el servidor. Se conservan las de los últimos 30 días.</p>
      {#if copias === null}
        <button class="boton boton-sec ancho" disabled={ocupado === 'copias'} onclick={() => hacer('copias', async () => { copias = await listarCopias(); })}>Ver copias</button>
      {:else if !copias.length}
        <p class="pie-nota">Aún no hay copias: la primera se crea al sincronizar.</p>
      {:else}
        <ul class="copias">
          {#each copias as c (c.fecha)}
            <li>
              <span><b>{fechaCorta(c.fecha)}</b><small>{num(c.tam / 1024, 0)} KB</small></span>
              <button class="boton boton-sec boton-peq" disabled={!!ocupado} onclick={() => {
                if (confirm(`¿Volver a como estaban tus datos el ${fechaCorta(c.fecha)}? Se aplicará también en tus otros dispositivos.`)) hacer('restaurar', () => restaurarCopia(c.fecha), ['Copia restaurada', '💾']);
              }}>Restaurar</button>
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  {/if}

  <!-- ── Recordatorios ──────────────────────────────────────────────── -->
  <h2 class="seccion"><Emoji e="🔔" tam={24} /> Recordatorios</h2>
  <div class="tarjeta">
    {#if !$nube.activa}
      <p class="intro">Avisos en este dispositivo a la hora de comer, antes de entrenar, para pesarte y para tus suplementos. Primero activa la sincronización.</p>
    {:else if !prefs.activo}
      <p class="intro">Te aviso en <b>este dispositivo</b> a la hora de cada comida, una hora antes de entrenar, el día de pesarte y para tus suplementos (como la creatina), aunque la app esté cerrada.</p>
      {#if soporte.ok}
        <button class="boton ancho" disabled={!!ocupado} onclick={() => hacer('avisos', async () => { await activarAvisos(); prefs = prefsAvisos(); await probarAviso().catch(() => {}); }, ['Recordatorios activados', '🔔'])}>{ocupado === 'avisos' ? 'Activando…' : 'Activar recordatorios'}</button>
      {:else}
        <p class="alerta">{soporte.motivo}</p>
      {/if}
    {:else}
      <label class="interruptor"><input type="checkbox" checked={prefs.comidas} onchange={(ev) => cambiarPref({ comidas: ev.currentTarget.checked })} />
        <span><b><Icono e="🍽️" tam={18} /> Comidas</b><small>A la hora de cada comida del menú (si no la has marcado)</small></span></label>
      <label class="interruptor"><input type="checkbox" checked={prefs.entreno} onchange={(ev) => cambiarPref({ entreno: ev.currentTarget.checked })} />
        <span><b><Icono e="💪" tam={18} /> Entreno</b><small>Una hora antes, con la sesión que toca</small></span></label>
      <label class="interruptor"><input type="checkbox" checked={prefs.suplementos} onchange={(ev) => cambiarPref({ suplementos: ev.currentTarget.checked })} />
        <span><b><Icono e="💊" tam={18} /> Suplementos</b><small>Creatina y el resto de tu plan, a su hora</small></span></label>
      <label class="interruptor"><input type="checkbox" checked={prefs.pesarse} onchange={(ev) => cambiarPref({ pesarse: ev.currentTarget.checked })} />
        <span><b><Icono e="⚖️" tam={18} /> Pesarse</b><small>Una vez a la semana</small></span></label>
      {#if prefs.pesarse}
        <div class="fila-peso">
          <select value={prefs.diaPeso} onchange={(ev) => cambiarPref({ diaPeso: Number(ev.currentTarget.value) })} aria-label="Día de pesarse">
            {#each DIAS as [n, d] (n)}<option value={n}>Los {d}</option>{/each}
          </select>
          <input type="time" value={prefs.horaPeso} onchange={(ev) => cambiarPref({ horaPeso: ev.currentTarget.value })} aria-label="Hora de pesarse" />
        </div>
      {/if}
      {#if proximos.length}
        <p class="pie-nota"><b>Próximos:</b> {proximos.map((a) => `${horaDe(a.t)} ${a.titulo}`).join(' · ')}</p>
      {/if}
      <div class="acciones-fila">
        <button class="boton boton-sec boton-peq" disabled={!!ocupado} onclick={() => hacer('prueba', probarAviso, ['Aviso de prueba enviado', '🔔'])}>Probar</button>
        <button class="boton boton-sec boton-peq" disabled={!!ocupado} onclick={() => hacer('quitar', async () => { await desactivarAvisos(); prefs = prefsAvisos(); }, ['Recordatorios desactivados', '🔕'])}>Desactivar</button>
      </div>
    {/if}
  </div>

  {#if $nube.activa}
    <details class="tarjeta zona-peligro">
      <summary>Desvincular o borrar</summary>
      <p class="pie-nota">Desvincular deja de sincronizar este dispositivo (tus datos se quedan aquí). Borrar elimina del servidor tus datos, copias y avisos.</p>
      <div class="acciones-fila">
        <button class="boton boton-sec boton-peq" onclick={() => { if (confirm('¿Dejar de sincronizar este dispositivo?')) { desvincular(); avisar('Dispositivo desvinculado', '👋'); } }}>Desvincular este dispositivo</button>
        <button class="boton boton-peligro boton-peq" onclick={() => { if (confirm('Se borrarán del servidor tus datos, copias y avisos. Tus dispositivos conservan lo que tienen. ¿Seguro?')) hacer('borrar', borrarCuenta, ['Datos borrados del servidor', '🗑️']); }}>Borrar del servidor</button>
      </div>
    </details>
  {/if}
{/if}

<style>
  .intro { margin: 0 0 10px; font-size: 0.93rem; }
  .ancho { width: 100%; margin-top: 8px; }
  .centro { text-align: center; }
  .volver { margin-bottom: 8px; }
  .estado-sync { display: flex; align-items: center; gap: 12px; }
  .estado-sync .txt { flex: 1; min-width: 0; display: grid; }
  .estado-sync small { color: var(--texto-2); font-weight: 600; font-size: 0.82rem; }
  .punto { width: 12px; height: 12px; border-radius: 50%; background: var(--primario); flex-shrink: 0; box-shadow: 0 0 0 4px var(--primario-claro); }
  .punto.e-sincronizando { background: var(--amarillo); box-shadow: 0 0 0 4px var(--amarillo-claro); animation: latido 1s infinite; }
  .punto.e-error { background: var(--coral); box-shadow: 0 0 0 4px var(--coral-claro); }
  .punto.e-sin-conexion { background: var(--texto-2); box-shadow: 0 0 0 4px var(--superficie-2); }
  @keyframes latido { 50% { opacity: 0.4; } }
  .añadir { margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--superficie-2); }
  .añadir p { font-size: 0.92rem; }
  .qr { display: block; width: min(240px, 70%); margin: 10px auto; border-radius: 14px; box-shadow: var(--sombra); }
  .codigo-grande { margin: 12px 0 0; text-align: center; font-size: 1.9rem; font-weight: 800; letter-spacing: 0.14em; font-variant-numeric: tabular-nums; }
  .copias { list-style: none; margin: 0; padding: 0; }
  .copias li { display: flex; align-items: center; justify-content: space-between; padding: 8px 0; border-top: 1px solid var(--superficie-2); }
  .copias li span { display: grid; }
  .copias small { color: var(--texto-2); font-weight: 600; }
  .fila-peso { display: flex; gap: 8px; margin: -4px 0 10px 60px; }
  .fila-peso select, .fila-peso input { min-height: 40px; padding: 6px 10px; border-radius: 12px; border: 1.5px solid var(--borde); background: var(--superficie); color: var(--texto); font-weight: 700; font-family: inherit; }
  .zona-peligro { margin-top: 18px; }
  .zona-peligro summary { font-weight: 800; cursor: pointer; color: var(--texto-2); }
</style>
