<script>
  import { fly, fade } from 'svelte/transition';
  import { salida } from './lib/curvas.js';
  import Hoja from './components/Hoja.svelte';
  import Emoji from './components/Emoji.svelte';
  import Icono from './components/Icono.svelte';
  import Confeti from './components/Confeti.svelte';
  import DetalleReceta from './components/DetalleReceta.svelte';
  import Alternativas from './components/Alternativas.svelte';
  import DetalleSesion from './components/DetalleSesion.svelte';
  import RegistrarSesion from './components/RegistrarSesion.svelte';
  import FichaEstacion from './components/FichaEstacion.svelte';
  import Registrar from './registro/Registrar.svelte';
  import Cuestionario from './pages/Cuestionario.svelte';
  import Hoy from './pages/Hoy.svelte';
  import Entreno from './pages/Entreno.svelte';
  import Comida from './pages/Comida.svelte';
  import Progreso from './pages/Progreso.svelte';
  import Ajustes from './pages/Ajustes.svelte';
  import { estado, actualizar } from './stores/estado.js';
  import { ruta, ir } from './stores/ruta.js';
  import { hoja, cerrarHoja, abrirHoja, aviso, avisar, deshacerAviso } from './stores/ui.js';
  import { calcularObjetivos } from './lib/nutricion.js';
  import { crearPlan, reajustarPlan } from './lib/acciones.js';
  import { hoyISO } from './lib/planificador.js';

  let editando = $state(false);

  // Tema claro / oscuro / automático
  $effect(() => {
    const t = $estado.tema;
    document.documentElement.dataset.theme = t === 'claro' ? 'light' : t === 'sistema' ? 'system' : 'dark';
    const claro = t === 'claro' || (t === 'sistema' && matchMedia('(prefers-color-scheme: light)').matches);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', claro ? '#f2f2f5' : '#0a0a0c');
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
    if (!esEdicion || !$estado.plan || CLAVES_MENU.some((k) => JSON.stringify(anterior?.[k]) !== JSON.stringify(perfil[k]))) {
      crearPlan();
      avisar(esEdicion ? 'Perfil guardado y menú nuevo creado' : '¡Tu plan está listo!', '🎉');
    } else {
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
  const SECCION_HOJA = { receta: 'comida', alternativas: 'comida', registrar: 'comida', sesion: 'entreno', registrarSesion: 'entreno', estacion: 'entreno' };
  const TITULOS = { receta: '', alternativas: 'Elegir comida', registrar: 'Registrar comida', sesion: '', registrarSesion: '¿Qué tal la sesión?', estacion: '' };
</script>

{#if !$estado.perfil || editando}
  <Cuestionario perfil={editando ? $estado.perfil : null} onterminar={terminarCuestionario} oncancelar={() => (editando = false)} />
{:else}
  <header class="cabecera">
    <a href="#hoy" class="marca"><img src="icons/icon.svg" alt="" width="32" height="32" /> Pulso</a>
    <a href="#ajustes" class="boton-plan" class:activo={$ruta.pagina === 'ajustes'} aria-label="Mi plan y ajustes"><Icono n="user" tam={20} /></a>
  </header>

  <div class="halo-seccion s-{seccion}" aria-hidden="true"></div>
  <main class="contenido s-{seccion}">
    {#key $ruta.pagina}
      <div in:fade={{ duration: 160 }}>
        {#if $ruta.pagina === 'entreno'}<Entreno sub={$ruta.sub} />
        {:else if $ruta.pagina === 'comida'}<Comida sub={$ruta.sub} />
        {:else if $ruta.pagina === 'progreso'}<Progreso sub={$ruta.sub} />
        {:else if $ruta.pagina === 'ajustes'}<Ajustes sub={$ruta.sub} oneditar={() => (editando = true)} />
        {:else}<Hoy />{/if}
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
        {:else if $hoja.tipo === 'sesion'}<DetalleSesion {...$hoja.props} />
        {:else if $hoja.tipo === 'registrarSesion'}<RegistrarSesion {...$hoja.props} />
        {:else if $hoja.tipo === 'estacion'}<FichaEstacion {...$hoja.props} />{/if}
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
