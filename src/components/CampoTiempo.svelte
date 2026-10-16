<script>
  // Tiempo en casillas separadas (h) : min : seg, con teclado numérico y salto automático.
  // value es texto «mm:ss» o «h:mm:ss» (vacío si no hay tiempo), como lo entiende aSegundos().
  let { value = $bindable(''), etiqueta = '', ejemplo = '25:00', horas = false } = $props();

  const trozos = (v) => {
    const p = String(v || '').split(':').map((x) => x.trim());
    if (!v) return ['', '', ''];
    if (p.length === 3) return p;
    if (p.length === 2) return ['', p[0], p[1]];
    return ['', p[0], ''];
  };
  const ej = $derived(trozos(ejemplo));
  const inicial = trozos(value);
  let h = $state(inicial[0]);
  let m = $state(inicial[1]);
  let s = $state(inicial[2]);
  let campoM = $state();
  let campoS = $state();

  function componer() {
    const solo = (x) => String(x || '').replace(/\D/g, '');
    const hh = solo(h); const mm = solo(m); const ss = solo(s);
    if (!hh && !mm && !ss) return (value = '');
    const seg = String(Math.min(59, Number(ss) || 0)).padStart(2, '0');
    value = hh && Number(hh) > 0 ? `${Number(hh)}:${String(Number(mm) || 0).padStart(2, '0')}:${seg}` : `${Number(mm) || 0}:${seg}`;
  }
  function escribir(cual, ev) {
    const v = ev.currentTarget.value.replace(/\D/g, '').slice(0, cual === 'h' ? 1 : 2);
    ev.currentTarget.value = v;
    if (cual === 'h') { h = v; if (v.length === 1) campoM?.focus(); }
    if (cual === 'm') { m = v; if (v.length === 2) campoS?.focus(); }
    if (cual === 's') s = v;
    componer();
  }
  // Escribir «:» o «.» en los minutos salta a los segundos
  function tecla(ev) {
    if ([':', '.', ',', "'"].includes(ev.key)) { ev.preventDefault(); campoS?.focus(); }
  }
</script>

<div class="campo-tiempo" role="group" aria-label={etiqueta || 'Tiempo'}>
  {#if etiqueta}<span class="et">{etiqueta}</span>{/if}
  <div class="casillas">
    {#if horas}
      <input class="h" value={h} inputmode="numeric" placeholder={ej[0] || '0'} aria-label="Horas" oninput={(ev) => escribir('h', ev)} />
      <i>h</i>
    {/if}
    <input bind:this={campoM} value={m} inputmode="numeric" placeholder={ej[1] || '00'} aria-label="Minutos" oninput={(ev) => escribir('m', ev)} onkeydown={tecla} />
    <i>:</i>
    <input bind:this={campoS} value={s} inputmode="numeric" placeholder={ej[2] || '00'} aria-label="Segundos" oninput={(ev) => escribir('s', ev)} />
  </div>
</div>

<style>
  .campo-tiempo { display: grid; gap: 6px; margin: 12px 0; }
  .et { font-weight: 600; font-size: 0.84rem; color: var(--texto-2); }
  .casillas { display: flex; align-items: center; gap: 4px; }
  .casillas input {
    flex: 1 1 0; min-width: 0; max-width: 4.2em; min-height: 48px; padding: 8px 4px; border-radius: 14px; border: 1px solid var(--borde); background: var(--superficie);
    color: var(--texto); font: inherit; font-size: 1.15rem; font-weight: 700; text-align: center; font-variant-numeric: tabular-nums;
  }
  .casillas input.h { max-width: 3em; }
  .casillas input::placeholder { color: var(--texto-3); font-weight: 500; }
  .casillas input:focus { outline: none; border-color: var(--primario); box-shadow: 0 0 0 3px color-mix(in srgb, var(--primario) 25%, transparent); }
  .casillas i { font-style: normal; font-weight: 800; color: var(--texto-2); }
</style>
