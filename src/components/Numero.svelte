<script>
  // Número que rueda cifra a cifra cuando cambia (con NumberFlow: cada cifra gira pasando por las de en medio).
  // Con `desde`, al aparecer cuenta desde ese valor (p. ej. 0) hasta el suyo. Si el móvil pide reducir
  // movimiento, cambia sin animación.
  import NumberFlow, { continuous } from '@number-flow/svelte';
  import { onMount } from 'svelte';

  let { valor = 0, decimales = 0, prefijo = '', sufijo = '', desde = null } = $props();
  const PLUGINS = [continuous];
  let montado = $state(false);
  onMount(() => {
    // Un fotograma con el valor de partida y luego el de verdad, para que se vea rodar
    const id = requestAnimationFrame(() => requestAnimationFrame(() => (montado = true)));
    return () => cancelAnimationFrame(id);
  });
  const mostrado = $derived(montado || desde == null ? Number(valor) || 0 : desde);
  const formato = $derived({ minimumFractionDigits: decimales, maximumFractionDigits: decimales });
</script>

<NumberFlow value={mostrado} locales="es-ES" format={formato} prefix={prefijo || undefined} suffix={sufijo || undefined} plugins={PLUGINS} />
