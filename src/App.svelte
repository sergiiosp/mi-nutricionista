<script>
  import { fly, fade } from 'svelte/transition';
  import { salida } from './lib/curvas.js';
  import Hoja from './components/Hoja.svelte';
  import Emoji from './components/Emoji.svelte';
  import Icono from './components/Icono.svelte';
  import Confeti from './components/Confeti.svelte';
  import DetalleReceta from './components/DetalleReceta.svelte';
  import Alternativas from './components/Alternativas.svelte';
  import Registrar from './registro/Registrar.svelte';
  import Hoy from './pages/Hoy.svelte';
  import { estado, actualizar, anotarDiario } from './stores/estado.js';
  import { ruta, ir } from './stores/ruta.js';
  import { hoja, cerrarHoja, abrirHoja, aviso, avisar, deshacerAviso } from './stores/ui.js';
  import { calcularObjetivos } from './lib/nutricion.js';
  import { crearPlan, reajustarPlan, completarMenu } from './lib/acciones.js';
  import { hoyISO } from './lib/planificador.js';
  import { avisosPendientes } from './lib/avisos.js';
  import { nube } from './lib/nube/sincro.js';
  import { cargar, precargarTodo } from './lib/perezosas.js';
  import { iniciarBuzon, sinLeer } from './lib/buzon.js';
  import { onMount } from 'svelte';

  // Pantallas que se cargan aparte (ver lib/perezosas.js): se pintan en cuanto llegan
  let vistas = $state({});
  function vista(k) {
    if (!vistas[k]) cargar(k).then((C) => (vistas[k] = C));
    return vistas[k];
  }
  onMount(precargarTodo);
  // Buzón: envía las notas que se quedaron sin conexión y trae las respuestas
  onMount(iniciarBuzon);
  const nuevasBuzon = $derived(sinLeer($estado));
  // La campana cuenta solo lo que te pide algo; la explicación de tu semana, si es nueva, enciende un punto
  const pendientesAvisos = $derived(avisosPendientes($estado, hoyISO(), $nube.activa));
  const avisos = $derived(pendientesAvisos.filter((a) => a.id !== 'semana-explicada').length);
  const semanaNueva = $derived(pendientesAvisos.some((a) => a.id === 'semana-explicada'));

  let editando = $state(false);

  // Tema claro / oscuro / automático
  // «Sistema» sigue al móvil y aplica el tema claro o el oscuro completos (con todos sus retoques)
  $effect(() => {
    const t = $estado.tema;
    const mq = matchMedia('(prefers-color-scheme: light)');
    const aplicar = () => {
      const claro = t === 'claro' || (t === 'sistema' && mq.matches);
      document.documentElement.dataset.theme = claro ? 'light' : 'dark';
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', claro ? '#fbfbfc' : '#0a0a0c');
    };
    aplicar();
    if (t !== 'sistema') return;
    mq.addEventListener('change', aplicar);
    return () => mq.removeEventListener('change', aplicar);
  });

  // Fuente: la del sistema (SF Pro en iPhone) o la que elijas en Ajustes → Apariencia
  const URL_FUENTE = {
    manrope: 'https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap',
    geist: 'https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&display=swap',
  };
  $effect(() => {
    const f = $estado.fuente || 'sistema';
    document.documentElement.dataset.fuente = f;
    if ($estado.textoSistema) document.documentElement.dataset.texto = 'sistema'; else delete document.documentElement.dataset.texto;
    if (URL_FUENTE[f] && !document.querySelector(`link[data-fuente="${f}"]`)) {
      const l = document.createElement('link');
      l.rel = 'stylesheet'; l.href = URL_FUENTE[f]; l.dataset.fuente = f;
      document.head.append(l);
    }
  });

  // Al cambiar de pantalla, arriba del todo y sin hojas abiertas
  $effect(() => {
    $ruta.pagina;
    cerrarHoja();
    window.scrollTo(0, 0);
  });

  const CLAVES_MENU = ['comidas', 'dieta', 'alergias', 'noMeGusta', 'tiempoMax', 'sobras', 'presupuesto', 'condiciones'];

  function terminarCuestionario(perfil, esEdicion) {
    const anterior = $estado.perfil;
    actualizar((e) => {
      e.perfil = perfil;
      if (!esEdicion) e.pesos = [{ fecha: hoyISO(), peso: perfil.peso }];
    });
    editando = false;
    if (esEdicion) anotarDiario('perfil', 'Actualizaste tus datos', 'Recalculo kcal, macros y horario con lo nuevo.');
    if (!esEdicion || !$estado.plan || CLAVES_MENU.some((k) => JSON.stringify(anterior?.[k]) !== JSON.stringify(perfil[k]))) {
      crearPlan();
      avisar(esEdicion ? 'Perfil guardado y menú nuevo creado' : '¡Tu plan está listo!', '🎉');
    } else {
      completarMenu(); // p. ej. si activas el lácteo de antes de dormir
      reajustarPlan();
      avisar('Perfil guardado: horario y raciones actualizados', '✅');
    }
    ir('hoy');
  }

  const PESTAÑAS = [
    { id: 'hoy', nombre: 'Hoy', icono: 'house' },
    { id: 'entreno', nombre: 'Entreno', icono: 'dumbbell' },
    { id: 'registrar', nombre: '', icono: 'plus' },
    { id: 'comida', nombre: 'Comida', icono: 'utensils' },
    { id: 'progreso', nombre: 'Progreso', icono: 'chart-column' },
  ];
  // Color de cada sección (Hoy naranja, Comida lima, Entreno violeta, Progreso azul)
  const seccion = $derived(['comida', 'entreno', 'progreso'].includes($ruta.pagina) ? $ruta.pagina : 'hoy');
  const SECCION_HOJA = { avisos: 'hoy', recuperacion: 'entreno', suelo: 'entreno', preparar: 'comida', revision: 'progreso', diaCarrera: 'entreno', test: 'entreno', tuPlan: 'hoy', cocina: 'comida', camara: 'progreso', informe: 'progreso', diaLibre: 'comida', guiaFuera: 'comida', receta: 'comida', alternativas: 'comida', registrar: 'comida', sesion: 'entreno', registrarSesion: 'entreno', estacion: 'entreno' };
  const TITULOS = { avisos: 'Avisos', buzon: 'Buzón', recuperacion: 'Recuperación y esfuerzo', suelo: '', preparar: 'Preparar de una vez', revision: '', diaCarrera: '', test: 'Apuntar un test', tuPlan: '', cocina: 'Modo cocina', camara: 'Foto de progreso', informe: 'Informe del mes', diaLibre: 'Día libre', guiaFuera: '', receta: '', alternativas: 'Elegir comida', registrar: 'Registrar comida', sesion: '', registrarSesion: '¿Qué tal la sesión?', estacion: '' };
</script>

{#if !$estado.perfil || editando}
  {@const Cuestionario = vista('cuestionario')}
  {#if Cuestionario}<Cuestionario perfil={editando ? $estado.perfil : null} onterminar={terminarCuestionario} oncancelar={() => (editando = false)} />{/if}
{:else}
  <header class="cabecera">
    <a href="#hoy" class="marca"><svg class="marca-p" width="30" height="30" viewBox="0 0 512 512" aria-hidden="true"><path d="M150 410V102H286C358 102 404 148 404 210C404 272 358 318 286 318H150" fill="none" stroke="currentColor" stroke-width="44" stroke-linecap="round" stroke-linejoin="round" /><path d="M150 210H218L246 156L282 266L310 210H352" fill="none" stroke="currentColor" stroke-width="30" stroke-linecap="round" stroke-linejoin="round" /></svg> Pulso</a>
    <div class="cab-botones">
      <button class="boton-plan" aria-label={avisos ? `Avisos: ${avisos} ${avisos === 1 ? 'pendiente' : 'pendientes'}` : semanaNueva ? 'Avisos: tu semana explicada, nueva' : 'Avisos: nada pendiente'} onclick={() => abrirHoja('avisos')}>
        <Icono n="bell" tam={20} />{#if avisos}<span class="num-avisos cifra" aria-hidden="true">{avisos}</span>{:else if semanaNueva}<span class="nuevo-buzon" aria-hidden="true"></span>{/if}
      </button>
      <button class="boton-plan" aria-label={nuevasBuzon ? `Buzón: ${nuevasBuzon} ${nuevasBuzon === 1 ? 'respuesta nueva' : 'respuestas nuevas'}` : 'Buzón: comenta la app, la dieta o los entrenos'}
        onclick={() => abrirHoja('buzon')}>
        <Icono n="message-square-text" tam={20} />{#if nuevasBuzon}<span class="nuevo-buzon" aria-hidden="true"></span>{/if}
      </button>
      <a href="#ajustes" class="boton-plan" class:activo={$ruta.pagina === 'ajustes'} aria-label="Tu perfil y ajustes"><Icono n="user" tam={20} /></a>
    </div>
  </header>

  <div class="halo-seccion s-{seccion}" aria-hidden="true"></div>
  <main class="contenido s-{seccion}">
    {#key $ruta.pagina}
      <div in:fade={{ duration: 160 }}>
        {#if $ruta.pagina === 'hoy' || !['entreno', 'comida', 'progreso', 'ajustes'].includes($ruta.pagina)}<Hoy />
        {:else}
          {@const Pagina = vista($ruta.pagina)}
          {#if Pagina}<Pagina sub={$ruta.sub} oneditar={() => (editando = true)} />{/if}
        {/if}
      </div>
    {/key}
  </main>

  <!-- Al estilo de Cal AI: las secciones en una pastilla flotante y el + negro aparte, a la derecha -->
  <nav class="navegacion" aria-label="Secciones">
    <div class="nav-pastilla">
      {#each PESTAÑAS.filter((p) => p.id !== 'registrar') as p (p.id)}
        <a href="#{p.id}" class="s-{p.id}" class:activo={$ruta.pagina === p.id} aria-current={$ruta.pagina === p.id ? 'page' : undefined}>
          <Icono n={p.icono} tam={22} grosor={$ruta.pagina === p.id ? 2.1 : 1.8} />
          <span>{p.nombre}</span>
        </a>
      {/each}
    </div>
    <button class="nav-mas" aria-label="Registrar comida" onclick={() => abrirHoja('registrar', { fecha: hoyISO() })}>
      <Icono n="plus" tam={28} grosor={2.4} />
    </button>
  </nav>

  {#if $hoja}
    {#key $hoja.clave}
      <Hoja titulo={$hoja.tipo === 'registrarSesion' && $hoja.props.entreno ? 'Tu entreno' : TITULOS[$hoja.tipo] ?? ''} onclose={cerrarHoja} seccion={SECCION_HOJA[$hoja.tipo] || seccion}>
        {#if $hoja.tipo === 'registrar'}<Registrar {...$hoja.props} />
        {:else if $hoja.tipo === 'receta'}<DetalleReceta {...$hoja.props} />
        {:else if $hoja.tipo === 'alternativas'}<Alternativas {...$hoja.props} />
        {:else}
          {@const Contenido = vista($hoja.tipo)}
          {#if Contenido}<Contenido {...$hoja.props} />{/if}
        {/if}
      </Hoja>
    {/key}
  {/if}
{/if}

{#if $aviso}
  {#key $aviso.clave}
    <div class="toast-nuevo" role="status" in:fly={{ y: 24, duration: 220, easing: salida }} out:fly={{ y: 16, duration: 140, easing: salida }}>
      <Emoji e={$aviso.emoji} tam={22} /> <span class="toast-texto">{$aviso.texto}</span>
      {#if $aviso.deshacer}<button class="toast-deshacer" onclick={deshacerAviso}>Deshacer</button>{/if}
    </div>
  {/key}
{/if}
<Confeti />
