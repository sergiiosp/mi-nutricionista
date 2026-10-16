<script>
  // Compatibilidad: los datos usan emojis como clave y aquí se pintan como icono de línea
  import Icono from './Icono.svelte';

  let { e = '🍽️', tam = 24, clase = '' } = $props();
</script>

<Icono {e} tam={Math.round(tam * 0.85)} {clase} />
