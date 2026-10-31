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

  let editando = $state(false);

  // Tema claro / oscuro / automático
  $effect(() => {
    const t = $estado.tema;
    document.documentElement.dataset.theme = t === 'claro' ? 'light' : t === 'sistema' ? 'system' : 'dark';
    const claro = t === 'claro' || (t === 'sistema' && matchMedia('(prefers-color-scheme: light)').matches);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', claro ? '#f2f2f5' : '#0a0a0c');
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
  const SECCION_HOJA = { suelo: 'entreno', preparar: 'comida', revision: 'progreso', diaCarrera: 'entreno', test: 'entreno', tuPlan: 'hoy', cocina: 'comida', camara: 'progreso', informe: 'progreso', diaLibre: 'comida', guiaFuera: 'comida', receta: 'comida', alternativas: 'comida', registrar: 'comida', sesion: 'entreno', registrarSesion: 'entreno', estacion: 'entreno' };
  const TITULOS = { buzon: 'Buzón', suelo: '', preparar: 'Preparar de una vez', revision: '', diaCarrera: '', test: 'Apuntar un test', tuPlan: '', cocina: 'Modo cocina', camara: 'Foto de progreso', informe: 'Informe del mes', diaLibre: 'Día libre', guiaFuera: '', receta: '', alternativas: 'Elegir comida', registrar: 'Registrar comida', sesion: '', registrarSesion: '¿Qué tal la sesión?', estacion: '' };
</script>

{#if !$estado.perfil || editando}
  {@const Cuestionario = vista('cuestionario')}
  {#if Cuestionario}<Cuestionario perfil={editando ? $estado.perfil : null} onterminar={terminarCuestionario} oncancelar={() => (editando = false)} />{/if}
{:else}
  <header class="cabecera">
    <a href="#hoy" class="marca"><img src="icons/icon.svg" alt="" width="32" height="32" /> Pulso</a>
    <div class="cab-botones">
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

  <nav class="navegacion" aria-label="Secciones">
    {#each PESTAÑAS as p (p.id)}
      {#if p.id === 'registrar'}
        <button class="nav-mas" aria-label="Registrar comida" onclick={() => abrirHoja('registrar', { fecha: hoyISO() })}>
          <Icono n="plus" tam={28} grosor={2.4} />
        </button>
      {:else}
        <a href="#{p.id}" class="s-{p.id}" class:activo={$ruta.pagina === p.id} aria-current={$ruta.pagina === p.id ? 'page' : undefined}>
          <Icono n={p.icono} tam={23} grosor={$ruta.pagina === p.id ? 2.2 : 1.8} />
          <span>{p.nombre}</span>
        </a>
      {/if}
    {/each}
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
