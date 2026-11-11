<script>
  // Apuntar el peso y los datos de la báscula (FitDays): en Progreso → Cuerpo y en el repaso del domingo
  import Icono from './Icono.svelte';
  import Emoji from './Emoji.svelte';
  import { estado } from '../stores/estado.js';
  import { avisar } from '../stores/ui.js';
  import { hoyISO } from '../lib/planificador.js';
  import { guardarPeso } from '../lib/acciones.js';
  import { num } from '../lib/formato.js';
  import { ultimaComposicion, CAMPOS } from '../lib/cuerpo.js';

  let { onguardado = () => {}, titulo = 'Registrar peso' } = $props();
  const hoy = hoyISO();
  let fecha = $state(hoy);
  let peso = $state('');
  // De la báscula (todos opcionales, en el orden de FitDays)
  let bascula = $state({});
  const pesos = $derived([...$estado.pesos].sort((a, b) => a.fecha.localeCompare(b.fecha)));
  const actual = $derived(pesos.at(-1)?.peso);
  const cuerpo = $derived(ultimaComposicion(pesos, $estado.perfil.altura));

  const numero = (v) => (String(v).trim() === '' ? null : Number(String(v).replace(',', '.')));
  function guardar(ev) {
    ev.preventDefault();
    const p = numero(peso);
    if (!(p >= 35 && p <= 250)) return avisar('Revisa el peso', '⚠️');
    const extra = {};
    for (const c of CAMPOS) {
      const v = numero(bascula[c.k] ?? '');
      if (v == null) continue;
      if (!(v >= c.r[0] && v <= c.r[1])) return avisar(`Revisa: ${c.n.toLowerCase()}`, '⚠️');
      extra[c.k] = v;
    }
    avisar(guardarPeso(fecha, p, extra), '⚖️');
    peso = '';
    bascula = {};
    onguardado();
  }
</script>

<form class="tarjeta form" onsubmit={guardar}>
  <b class="tit"><Emoji e="⚖️" tam={24} /> {titulo}</b>
  <label class="campo"><span>Fecha</span><input type="date" bind:value={fecha} max={hoy} required /></label>
  <label class="campo"><span>Peso</span><input enterkeyhint="next" type="number" step="0.1" min="35" max="250" inputmode="decimal" bind:value={peso} placeholder={actual ? num(actual, 1) : ''} required /><small>kg</small></label>
  <p class="bascula"><Icono n="activity" tam={15} grosor={2.2} /> De tu báscula <small>opcional · en el orden de FitDays</small></p>
  <div class="campos-bascula">
    {#each CAMPOS as c, i (c.k)}
      <label class="campo"><span>{c.n}</span><input enterkeyhint={i === CAMPOS.length - 1 ? 'done' : 'next'} type="number" step={c.paso || 0.1} min={c.r[0]} max={c.r[1]} inputmode={c.paso ? 'numeric' : 'decimal'} bind:value={bascula[c.k]} placeholder={cuerpo?.[c.k] != null ? num(cuerpo[c.k], c.paso ? 0 : 1) : ''} /><small>{c.u}</small></label>
    {/each}
  </div>
  <p class="pie-nota consejo-bascula">IMC, masa grasa, peso sin grasa, agua y proteína en kg y % de músculo se calculan solos. El número gris es tu última medición.</p>
  <p class="pie-nota consejo-bascula">Mismo momento siempre: en ayunas, tras ir al baño y descalzo. La grasa cambia con lo que bebas, por eso uso la media de tus últimas mediciones.</p>
  <button class="boton" type="submit">Guardar</button>
</form>

<style>
  .form { display: grid; grid-template-columns: 1fr 1fr; gap: 0 10px; align-items: end; }
  .tit { grid-column: 1 / -1; display: flex; gap: 8px; align-items: center; }
  .form .campo { margin: 10px 0; }
  .form .boton { grid-column: 1 / -1; }
  .bascula { grid-column: 1 / -1; display: flex; align-items: center; gap: 6px; margin: 12px 0 0; font-weight: 600; font-size: 0.86rem; color: var(--primario-fuerte); }
  .bascula small { color: var(--texto-3); font-weight: 500; }
  .campos-bascula { grid-column: 1 / -1; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 10px; }
  .campos-bascula .campo { margin: 6px 0; }
  .consejo-bascula { grid-column: 1 / -1; margin: 0 0 10px; }
</style>
