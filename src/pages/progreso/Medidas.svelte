<script>
  import Emoji from '../../components/Emoji.svelte';
  import { estado, actualizar } from '../../stores/estado.js';
  import { avisar } from '../../stores/ui.js';
  import { hoyISO } from '../../lib/planificador.js';
  import { fechaCorta, num } from '../../lib/formato.js';

  const CAMPOS = [
    { id: 'cintura', nombre: 'Cintura', emoji: '📏', ayuda: 'A la altura del ombligo, relajado' },
    { id: 'cadera', nombre: 'Cadera', emoji: '🍑', ayuda: 'Por la parte más ancha' },
    { id: 'pecho', nombre: 'Pecho', emoji: '🫁', ayuda: 'A la altura de los pezones' },
    { id: 'brazo', nombre: 'Brazo', emoji: '💪', ayuda: 'Bíceps relajado, en el punto más ancho' },
    { id: 'muslo', nombre: 'Muslo', emoji: '🦵', ayuda: 'Mitad del muslo' },
  ];
  let fecha = $state(hoyISO());
  let valores = $state({});
  const medidas = $derived([...($estado.medidas || [])].sort((a, b) => a.fecha.localeCompare(b.fecha)));
  const primera = $derived(medidas[0]);
  const ultima = $derived(medidas.at(-1));

  function guardar(ev) {
    ev.preventDefault();
    const datos = Object.fromEntries(Object.entries(valores).filter(([, v]) => Number(v) > 0).map(([k, v]) => [k, Number(v)]));
    if (!Object.keys(datos).length) return avisar('Rellena al menos una medida', '📏');
    actualizar((e) => {
      e.medidas = (e.medidas || []).filter((m) => m.fecha !== fecha).concat([{ fecha, ...datos }]);
    });
    valores = {};
    avisar('Medidas guardadas', '📏');
  }
</script>

<div class="tarjeta intro"><Emoji e="📏" tam={36} /><p>La báscula no lo dice todo: si pierdes cintura y mantienes brazo, estás perdiendo grasa y no músculo. Mídete cada 2-4 semanas, por la mañana y en ayunas.</p></div>

<form class="tarjeta" onsubmit={guardar}>
  <label class="campo"><span>Fecha</span><input type="date" bind:value={fecha} max={hoyISO()} /></label>
  <div class="campos">
    {#each CAMPOS as c (c.id)}
      <label class="campo"><span><Emoji e={c.emoji} tam={18} /> {c.nombre}</span>
        <input type="number" step="0.5" min="20" max="200" inputmode="decimal" bind:value={valores[c.id]} placeholder={ultima?.[c.id] ? num(ultima[c.id], 1) : ''} /><small>cm</small></label>
    {/each}
  </div>
  <button class="boton ancho" type="submit">Guardar medidas</button>
</form>

{#if medidas.length}
  <div class="tarjeta">
    <b>Evolución</b>
    <div class="evol">
      {#each CAMPOS.filter((c) => ultima?.[c.id]) as c (c.id)}
        {@const ini = medidas.find((m) => m[c.id])?.[c.id]}
        {@const dif = ultima[c.id] - ini}
        <div class="m">
          <Emoji e={c.emoji} tam={26} />
          <span class="n">{c.nombre}</span>
          <b>{num(ultima[c.id], 1)} cm</b>
          <span class="dif" class:baja={dif < 0} class:sube={dif > 0}>{dif === 0 ? '=' : `${dif > 0 ? '+' : ''}${num(dif, 1)}`}</span>
        </div>
      {/each}
    </div>
    <p class="pie-nota">Desde el {fechaCorta(primera.fecha)} · {medidas.length} registros</p>
  </div>
{/if}

<style>
  .intro { display: flex; gap: 12px; align-items: flex-start; }
  .intro p { margin: 0; font-weight: 600; font-size: 0.9rem; }
  .campos { display: grid; grid-template-columns: 1fr 1fr; gap: 0 10px; }
  .campos .campo span { display: flex; gap: 6px; align-items: center; }
  .ancho { width: 100%; margin-top: 6px; }
  .evol { display: grid; gap: 6px; margin-top: 10px; }
  .m { display: flex; align-items: center; gap: 10px; padding: 8px 12px; border-radius: 14px; background: var(--superficie-2); }
  .n { flex: 1; font-weight: 700; }
  .dif { min-width: 56px; text-align: center; padding: 3px 8px; border-radius: 999px; font-weight: 900; font-size: 0.82rem; background: var(--superficie); }
  .dif.baja { background: var(--primario-claro); color: var(--primario-fuerte); }
  .dif.sube { background: var(--coral-claro); color: var(--coral); }
</style>
