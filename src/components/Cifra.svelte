<script>
  // Número que cuenta hasta su valor cuando aparece o cambia
  import { Tween } from 'svelte/motion';
  import { cubicOut } from 'svelte/easing';

  let { valor = 0, decimales = 0, duracion = 800 } = $props();
  const t = new Tween(0, { duration: duracion, easing: cubicOut });
  $effect(() => { t.target = Number(valor) || 0; });
  const texto = $derived(t.current.toLocaleString('es-ES', { minimumFractionDigits: decimales, maximumFractionDigits: decimales }));
</script>

{texto}
