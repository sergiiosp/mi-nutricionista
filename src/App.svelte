<script>
  import { fly } from 'svelte/transition';
  import Hoja from './components/Hoja.svelte';
  import Emoji from './components/Emoji.svelte';
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
  import { hoja, cerrarHoja, abrirHoja, aviso, avisar } from './stores/ui.js';
  import { calcularObjetivos } from './lib/nutricion.js';
  import { crearPlan, reajustarPlan } from './lib/acciones.js';
  import { hoyISO } from './lib/planificador.js';

  let editando = $state(false);

  // Tema claro / oscuro / automático
  $effect(() => {
    const t = $estado.tema;
    if (t === 'claro') document.documentElement.dataset.theme = 'light';
    else if (t === 'oscuro') document.documentElement.dataset.theme = 'dark';
    else delete document.documentElement.dataset.theme;
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
    { id: 'hoy', nombre: 'Hoy', emoji: '🏠' },
    { id: 'entreno', nombre: 'Entreno', emoji: '🏋️' },
    { id: 'registrar', nombre: '', emoji: '➕' },
    { id: 'comida', nombre: 'Comida', emoji: '🥗' },
    { id: 'progreso', nombre: 'Progreso', emoji: '📈' },
  ];
  const TITULOS = { receta: '', alternativas: 'Cambiar plato', registrar: 'Registrar comida', sesion: '', registrarSesion: '¿Qué tal la sesión?', estacion: '' };
</script>

{#if !$estado.perfil || editando}
  <Cuestionario perfil={editando ? $estado.perfil : null} onterminar={terminarCuestionario} oncancelar={() => (editando = false)} />
{:else}
  <header class="cabecera">
    <a href="#hoy" class="marca"><img src="icons/icon.svg" alt="" width="30" height="30" /> Mi Nutricionista</a>
    <a href="#ajustes" class="boton-plan" class:activo={$ruta.pagina === 'ajustes'} aria-label="Mi plan y ajustes"><Emoji e="⚙️" tam={20} /> Mi plan</a>
  </header>

  <main class="contenido">
    {#key $ruta.pagina}
      <div in:fly={{ y: 10, duration: 220 }}>
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
          <span>+</span>
        </button>
      {:else}
        <a href="#{p.id}" class:activo={$ruta.pagina === p.id || ($ruta.pagina === 'ajustes' && false)} aria-current={$ruta.pagina === p.id ? 'page' : undefined}>
          <Emoji e={p.emoji} tam={26} />
          <span>{p.nombre}</span>
        </a>
      {/if}
    {/each}
  </nav>

  {#if $hoja}
    {#key $hoja.clave}
      <Hoja titulo={TITULOS[$hoja.tipo] ?? ''} onclose={cerrarHoja}>
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
    <div class="toast-nuevo" role="status" in:fly={{ y: 20, duration: 200 }} out:fly={{ y: 20, duration: 200 }}>
      <Emoji e={$aviso.emoji} tam={22} /> {$aviso.texto}
    </div>
  {/key}
{/if}
<Confeti />
