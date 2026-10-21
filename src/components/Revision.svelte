<script>
  // Revisión del mes, paso a paso: báscula → medidas → fotos → test → qué ha cambiado. Cada paso se guarda
  // al momento; la cámara y el test vuelven aquí al terminar.
  import Icono from './Icono.svelte';
  import { estado } from '../stores/estado.js';
  import { abrirHoja, cerrarHoja, avisar, celebrar } from '../stores/ui.js';
  import { estadoRevision, pasosRevision, resumenRevision } from '../lib/revision.js';
  import { empezarRevision, guardarPeso, guardarMedidas, terminarRevision } from '../lib/acciones.js';
  import { guardarFoto } from '../lib/fotos.js';
  import { actualizar, nuevoId } from '../stores/estado.js';
  import { cambioCuerpo, veredicto } from '../lib/cuerpo.js';
  import { testPorId } from '../lib/hyrox/tests.js';
  import { mmss } from '../lib/hyrox/ritmos.js';
  import { hoyISO, sumarDias } from '../lib/planificador.js';
  import { fechaCorta, num } from '../lib/formato.js';

  const hoy = hoyISO();
  const est = $derived(estadoRevision($estado, hoy));
  let { paso: pasoInicial = null } = $props();
  let paso = $state(pasoInicial ?? ($estado.revision ? 1 : 0));
  const inicio = $derived($estado.revision?.inicio || hoy);
  const pasos = $derived(pasosRevision($estado, inicio));
  const hechos = $derived(pasos.filter((p) => p.hecho).length);
  const volver = (n) => ({ tipo: 'revision', props: { paso: n } });
  const numero = (v) => (String(v ?? '').trim() === '' ? null : Number(String(v).replace(',', '.')));
  const ordenar = (l) => [...(l || [])].sort((a, b) => a.fecha.localeCompare(b.fecha));

  function empezar() { empezarRevision(); paso = 1; }
  const siguiente = () => { paso = Math.min(5, paso + 1); document.querySelector('.hoja-cuerpo')?.scrollTo({ top: 0 }); };

  // 1 · Báscula: lo esencial (el resto, en Progreso → Cuerpo)
  const BASCULA = [
    { k: 'grasa', n: 'Grasa', u: '%', r: [3, 60] },
    { k: 'musculo', n: 'Músculo', u: 'kg', r: [15, 120] },
    { k: 'agua', n: 'Agua', u: '%', r: [30, 75] },
    { k: 'visceral', n: 'Visceral', u: 'nivel', r: [1, 30] },
  ];
  const ultimoPeso = $derived(ordenar($estado.pesos).at(-1));
  let peso = $state('');
  let bascula = $state({});
  function guardarBascula() {
    const p = numero(peso);
    if (!(p >= 35 && p <= 250)) return avisar('Pon tu peso', '⚠️');
    const extra = {};
    for (const c of BASCULA) {
      const v = numero(bascula[c.k]);
      if (v == null) continue;
      if (!(v >= c.r[0] && v <= c.r[1])) return avisar(`Revisa: ${c.n.toLowerCase()}`, '⚠️');
      extra[c.k] = v;
    }
    avisar(guardarPeso(hoy, p, extra), '⚖️');
    siguiente();
  }

  // 2 · Medidas
  const MEDIDAS = [
    { k: 'cintura', n: 'Cintura', ayuda: 'A la altura del ombligo, sin meter tripa, al soltar el aire' },
    { k: 'cadera', n: 'Cadera', ayuda: 'Pies juntos, por lo más saliente del glúteo' },
    { k: 'pecho', n: 'Pecho', ayuda: 'A la altura de los pezones, brazos caídos' },
    { k: 'brazo', n: 'Brazo', ayuda: 'Derecho, relajado, en lo más ancho del bíceps' },
    { k: 'muslo', n: 'Muslo', ayuda: 'Derecho, a mitad entre la ingle y la rodilla' },
  ];
  const ultimas = $derived(Object.fromEntries(MEDIDAS.map((m) => [m.k, ordenar($estado.medidas).filter((x) => x[m.k]).at(-1)?.[m.k]])));
  let medidas = $state({});
  function guardarLasMedidas() {
    const datos = Object.fromEntries(Object.entries(medidas).map(([k, v]) => [k, numero(v)]).filter(([, v]) => v > 0 && v < 250));
    if (!Object.keys(datos).length) return avisar('Apunta al menos la cintura', '📏');
    guardarMedidas(hoy, datos);
    avisar('Medidas guardadas', '📏');
    siguiente();
  }

  // 3 · Fotos
  const POSES = [['frente', 'De frente'], ['lado', 'De lado'], ['espalda', 'De espaldas']];
  async function subir(ev, pose) {
    const archivo = ev.currentTarget.files?.[0];
    if (!archivo) return;
    const id = nuevoId();
    await guardarFoto(id, archivo);
    actualizar((e) => { (e.fotosProgreso ||= []).push({ id, fecha: hoy, pose }); });
    avisar('Foto guardada solo en este dispositivo', '📸');
  }

  // 4 · Test
  const testReciente = $derived(ordenar($estado.tests).filter((t) => t.fecha >= sumarDias(inicio, -7)).at(-1));

  // 5 · Qué ha cambiado
  const res = $derived(resumenRevision($estado, inicio));
  const juicio = $derived(veredicto(cambioCuerpo($estado.pesos || []), $estado.perfil?.objetivo));
  const valor = (f, v) => (f.unidad === 'seg' ? mmss(v) : `${num(v, f.dec)}`);
  const dif = (f) => (f.unidad === 'seg' ? `${f.dif > 0 ? '+' : '−'}${mmss(Math.abs(f.dif))}` : `${f.dif > 0 ? '+' : '−'}${num(Math.abs(f.dif), f.dec)}`);
  function terminar(informe) {
    terminarRevision();
    celebrar();
    if (informe) abrirHoja('informe');
    else { cerrarHoja(); avisar('Revisión hecha: nos vemos en 4 semanas', '✅'); }
  }
</script>

<div class="rev">
  {#if paso === 0}
    <div class="portada">
      <span class="pt-ic"><Icono n="clipboard-list" tam={26} /></span>
      <h2>Tu revisión del mes</h2>
      <p>10 minutos para ver de verdad cómo vas: lo que la báscula sola no te cuenta. Mejor por la mañana, en ayunas y antes de entrenar.</p>
      {#if est.ultima}<small>Última revisión: {fechaCorta(est.ultima)}</small>{/if}
    </div>
    <ol class="lista-pasos">
      {#each pasos as p, i (p.id)}
        <li class:hecho={p.hecho}>
          <span class="lp-n">{#if p.hecho}<Icono n="check" tam={15} grosor={3} />{:else}{i + 1}{/if}</span>
          <span class="lp-txt"><b>{p.titulo}{#if p.opcional}<i>opcional</i>{/if}</b><small>{p.texto}</small></span>
          <Icono n={p.icono} tam={18} />
        </li>
      {/each}
    </ol>
    <button class="boton ancho" onclick={empezar}><Icono n="play" tam={17} /> {$estado.revision ? `Seguir (${hechos} de 4 hechos)` : 'Empezar'}</button>
  {:else}
    <!-- Barra de pasos -->
    <nav class="barra-pasos" aria-label="Pasos de la revisión">
      {#each pasos as p, i (p.id)}
        <button class:actual={paso === i + 1} class:hecho={p.hecho} onclick={() => (paso = i + 1)} aria-current={paso === i + 1 ? 'step' : undefined}>
          <span class="bp-pista"></span><small>{p.titulo}</small>
        </button>
      {/each}
      <button class:actual={paso === 5} onclick={() => (paso = 5)} aria-current={paso === 5 ? 'step' : undefined}><span class="bp-pista"></span><small>Resumen</small></button>
    </nav>

    {#if paso === 1}
      <header class="cab-paso"><span class="cp-ic"><Icono n="scale" tam={20} /></span><div><h3>Báscula</h3><p>Después del baño y antes de desayunar, descalzo y siempre a la misma hora.</p></div></header>
      <label class="campo grande"><span>Peso</span>
        <div class="con-unidad"><input inputmode="decimal" bind:value={peso} placeholder={ultimoPeso ? num(ultimoPeso.peso, 1) : '80,0'} /><em>kg</em></div>
      </label>
      <div class="rejilla">
        {#each BASCULA as c (c.k)}
          <label class="campo"><span>{c.n}</span>
            <div class="con-unidad"><input inputmode="decimal" bind:value={bascula[c.k]} placeholder={ultimoPeso?.[c.k] != null ? num(ultimoPeso[c.k], c.k === 'visceral' ? 0 : 1) : '—'} /><em>{c.u}</em></div>
          </label>
        {/each}
      </div>
      <p class="pie-nota">De tu báscula, lo que tengas. El resto de datos (BMR, edad corporal…) puedes añadirlos en Progreso → Cuerpo.</p>
      {#if pasos[0].hecho}<p class="ya"><Icono n="circle-check" tam={16} /> Ya te has pesado en esta revisión ({num(ultimoPeso.peso, 1)} kg)</p>{/if}
      <div class="acciones"><button class="boton boton-sec" onclick={siguiente}>{pasos[0].hecho ? 'Seguir' : 'Saltar'}</button><button class="boton" onclick={guardarBascula}>Guardar y seguir</button></div>

    {:else if paso === 2}
      <header class="cab-paso"><span class="cp-ic"><Icono n="ruler" tam={20} /></span><div><h3>Medidas</h3><p>Cinta métrica pegada a la piel pero sin apretar. En gris, tu medida anterior.</p></div></header>
      <div class="medidas">
        {#each MEDIDAS as m (m.k)}
          <label class="medida">
            <span class="md-txt"><b>{m.n}</b><small>{m.ayuda}</small></span>
            <span class="con-unidad corta"><input inputmode="decimal" bind:value={medidas[m.k]} placeholder={ultimas[m.k] ? num(ultimas[m.k], 1) : '—'} aria-label={`${m.n} en cm`} /><em>cm</em></span>
          </label>
        {/each}
      </div>
      {#if pasos[1].hecho}<p class="ya"><Icono n="circle-check" tam={16} /> Medidas de esta revisión guardadas</p>{/if}
      <div class="acciones"><button class="boton boton-sec" onclick={siguiente}>{pasos[1].hecho ? 'Seguir' : 'Saltar'}</button><button class="boton" onclick={guardarLasMedidas}>Guardar y seguir</button></div>

    {:else if paso === 3}
      <header class="cab-paso"><span class="cp-ic"><Icono n="camera" tam={20} /></span><div><h3>Fotos</h3><p>Misma luz, misma ropa y mismo sitio que la última vez: la cámara te pone la foto anterior en transparencia para que encajes.</p></div></header>
      <div class="poses">
        {#each POSES as [k, n] (k)}
          {@const hecha = pasos[2].poses.includes(k)}
          <div class="pose" class:hecha>
            <span class="ps-ic">{#if hecha}<Icono n="check" tam={20} grosor={2.6} />{:else}<Icono n="person-standing" tam={22} />{/if}</span>
            <b>{n}</b>
            <button class="boton boton-peq {hecha ? 'boton-sec' : ''}" onclick={() => abrirHoja('camara', { pose: k, volver: volver(3) })}>{hecha ? 'Repetir' : 'Hacer foto'}</button>
            <label class="galeria">o de la galería<input type="file" accept="image/*" onchange={(ev) => subir(ev, k)} /></label>
          </div>
        {/each}
      </div>
      <p class="pie-nota"><Icono n="lock" tam={13} /> Se guardan solo en este dispositivo.</p>
      <div class="acciones col"><button class="boton {pasos[2].hecho ? '' : 'boton-sec'}" onclick={siguiente}>{pasos[2].hecho ? 'Seguir' : 'Saltar este paso'}</button></div>

    {:else if paso === 4}
      <header class="cab-paso"><span class="cp-ic"><Icono n="timer" tam={20} /></span><div><h3>Test</h3><p>Un 5 km a tope (o 1.000 m de SkiErg o remo) dice si tu forma mejora y ajusta tus ritmos. Si hoy no te toca, hazlo esta semana: cuenta igual.</p></div></header>
      {#if pasos[3].hecho && testReciente}
        <div class="test-hecho"><Icono n="circle-check" tam={20} /><span><b>Test de {testPorId[testReciente.id]?.corto || testReciente.id}: {mmss(testReciente.seg)}</b><small>{fechaCorta(testReciente.fecha)}</small></span></div>
      {/if}
      <div class="acciones col">
        <button class="boton {pasos[3].hecho ? 'boton-sec' : ''}" onclick={() => abrirHoja('test', { volver: volver(4) })}><Icono n="timer" tam={17} /> {pasos[3].hecho ? 'Apuntar otro test' : 'Apuntar un test'}</button>
        <button class="boton {pasos[3].hecho ? '' : 'boton-sec'}" onclick={siguiente}>{pasos[3].hecho ? 'Ver el resumen' : 'Esta vez no'}</button>
      </div>

    {:else}
      <header class="cab-paso"><span class="cp-ic"><Icono n="trending-up" tam={20} /></span><div><h3>Qué ha cambiado</h3><p>Desde el {fechaCorta(res.desde)}</p></div></header>
      <p class="titular">{res.titular}</p>
      {#if res.filas.length}
        <ul class="filas">
          {#each res.filas as f (f.id)}
            <li>
              <span class="fl-n">{f.nombre}</span>
              <span class="fl-v cifra">{#if f.antes != null}<s>{valor(f, f.antes)}</s>&nbsp;→&nbsp;{/if}<b>{valor(f, f.ahora)}</b> <em>{f.unidad === 'seg' ? '' : f.unidad}</em></span>
              {#if f.dif != null}<span class="fl-d cifra" class:bien={f.bien === true} class:mal={f.bien === false}>{f.dif === 0 ? '=' : dif(f)}</span>{:else}<span class="fl-d">nuevo</span>{/if}
            </li>
          {/each}
        </ul>
      {/if}
      {#if juicio}<p class="juicio" class:mal={!juicio.bien}><Icono n={juicio.bien ? 'thumbs-up' : 'triangle-alert'} tam={16} /> {juicio.texto}</p>{/if}
      {#if hechos < 4}<p class="pie-nota">Te faltan {4 - hechos} {4 - hechos === 1 ? 'paso' : 'pasos'}: puedes terminar igual y la próxima vez lo completas.</p>{/if}
      <div class="acciones col">
        <button class="boton" onclick={() => terminar(true)}><Icono n="scroll-text" tam={17} /> Terminar y ver el informe del mes</button>
        <button class="boton boton-sec" onclick={() => terminar(false)}>Terminar</button>
      </div>
    {/if}
  {/if}
</div>

<style>
  .portada { display: grid; justify-items: start; gap: 6px; padding: 18px; border-radius: 24px; background: radial-gradient(120% 120% at 0% 0%, var(--primario-claro), transparent 70%), var(--superficie); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--primario) 20%, transparent); }
  .pt-ic { display: grid; place-items: center; width: 48px; height: 48px; border-radius: 15px; background: var(--primario); color: var(--sobre-primario); }
  .portada h2 { margin: 8px 0 0; font-size: 1.5rem; letter-spacing: -0.02em; }
  .portada p { margin: 0; font-size: 0.9rem; line-height: 1.45; color: var(--texto-2); }
  .portada small { font-size: 0.78rem; font-weight: 700; color: var(--primario-fuerte); }
  .lista-pasos { list-style: none; margin: 14px 0; padding: 0; display: grid; gap: 8px; }
  .lista-pasos li { display: grid; grid-template-columns: 30px minmax(0, 1fr) auto; align-items: center; gap: 12px; padding: 12px 14px; border-radius: 16px; background: var(--superficie); box-shadow: var(--sombra); color: var(--texto-3); }
  .lp-n { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 50%; background: var(--superficie-2); color: var(--texto-2); font-weight: 800; font-size: 0.86rem; }
  .hecho .lp-n { background: var(--primario); color: var(--sobre-primario); }
  .lp-txt { display: grid; }
  .lp-txt b { display: flex; align-items: center; gap: 8px; color: var(--texto); font-size: 0.95rem; }
  .lp-txt b i { font-style: normal; font-size: 0.68rem; font-weight: 700; padding: 1px 7px; border-radius: 999px; background: var(--superficie-2); color: var(--texto-3); }
  .lp-txt small { font-size: 0.78rem; color: var(--texto-2); }
  .ancho { width: 100%; }

  .barra-pasos { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; margin-bottom: 16px; }
  .barra-pasos button { display: grid; gap: 5px; padding: 0; border: 0; background: none; font: inherit; color: var(--texto-3); cursor: pointer; text-align: left; }
  .bp-pista { height: 5px; border-radius: 999px; background: var(--superficie-3); }
  .barra-pasos small { font-size: 0.68rem; font-weight: 700; }
  .barra-pasos .hecho .bp-pista { background: color-mix(in srgb, var(--primario) 45%, var(--superficie-3)); }
  .barra-pasos .actual .bp-pista { background: var(--primario); }
  .barra-pasos .actual small { color: var(--texto); }

  .cab-paso { display: flex; gap: 12px; align-items: flex-start; margin-bottom: 14px; }
  .cp-ic { display: grid; place-items: center; width: 42px; height: 42px; border-radius: 13px; background: var(--primario-claro); color: var(--primario); flex-shrink: 0; }
  .cab-paso h3 { margin: 0; font-size: 1.2rem; letter-spacing: -0.01em; }
  .cab-paso p { margin: 2px 0 0; font-size: 0.84rem; line-height: 1.4; color: var(--texto-2); }

  .con-unidad { display: flex; align-items: center; gap: 6px; }
  .con-unidad input { flex: 1; min-width: 0; }
  .con-unidad em { font-style: normal; font-size: 0.8rem; font-weight: 700; color: var(--texto-3); min-width: 22px; }
  .grande input { font-size: 1.6rem; font-weight: 700; height: 60px; }
  .rejilla { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 8px; }
  .medidas { display: grid; gap: 4px; }
  .medida { display: grid; grid-template-columns: minmax(0, 1fr) 118px; align-items: center; gap: 12px; padding: 10px 0; }
  .medida + .medida { border-top: 1px solid var(--linea); }
  .md-txt { display: grid; }
  .md-txt b { font-size: 0.95rem; }
  .md-txt small { font-size: 0.74rem; line-height: 1.3; color: var(--texto-2); }
  .corta input { height: 46px; text-align: right; font-size: 1.05rem; font-weight: 700; }

  .poses { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
  .pose { display: grid; justify-items: center; gap: 8px; padding: 14px 8px 10px; border-radius: 18px; background: var(--superficie); box-shadow: var(--sombra); text-align: center; }
  .ps-ic { display: grid; place-items: center; width: 52px; height: 52px; border-radius: 50%; background: var(--superficie-2); color: var(--texto-2); }
  .pose.hecha .ps-ic { background: var(--primario); color: var(--sobre-primario); }
  .pose b { font-size: 0.86rem; }
  .pose .boton { width: 100%; padding: 0 6px; }
  .galeria { position: relative; font-size: 0.72rem; font-weight: 600; color: var(--texto-3); text-decoration: underline; cursor: pointer; }
  .galeria input { position: absolute; inset: 0; opacity: 0; width: 100%; cursor: pointer; }

  .ya { display: flex; align-items: center; gap: 8px; margin: 12px 0 0; font-size: 0.84rem; font-weight: 700; color: var(--primario-fuerte); }
  .test-hecho { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; padding: 12px 14px; border-radius: 16px; background: var(--primario-claro); color: var(--primario-fuerte); }
  .test-hecho span { display: grid; }
  .test-hecho b { color: var(--texto); }
  .test-hecho small { font-size: 0.76rem; color: var(--texto-2); }

  .titular { margin: 0 0 12px; font-size: 1.05rem; font-weight: 700; line-height: 1.35; letter-spacing: -0.01em; }
  .filas { list-style: none; margin: 0; padding: 4px 14px; border-radius: 18px; background: var(--superficie); box-shadow: var(--sombra); }
  .filas li { display: grid; grid-template-columns: minmax(0, 1fr) auto 64px; align-items: center; gap: 10px; min-height: 48px; }
  .filas li + li { border-top: 1px solid var(--linea); }
  .fl-n { font-size: 0.9rem; font-weight: 700; }
  .fl-v { font-size: 0.86rem; color: var(--texto-2); }
  .fl-v s { color: var(--texto-3); }
  .fl-v b { color: var(--texto); font-size: 0.98rem; }
  .fl-v em { font-style: normal; font-size: 0.74rem; color: var(--texto-3); }
  .fl-d { justify-self: end; padding: 3px 9px; border-radius: 999px; background: var(--superficie-2); color: var(--texto-2); font-size: 0.78rem; font-weight: 800; }
  .fl-d.bien { background: var(--exito-claro, #dcf6ea); color: var(--exito, #12a46a); }
  .fl-d.mal { background: var(--coral-claro); color: var(--coral); }
  .juicio { display: flex; gap: 8px; align-items: flex-start; margin: 12px 0 0; padding: 12px 14px; border-radius: 16px; background: var(--exito-claro, #dcf6ea); color: var(--texto); font-size: 0.86rem; line-height: 1.4; }
  .juicio :global(svg) { flex-shrink: 0; margin-top: 1px; color: var(--exito, #12a46a); }
  .juicio.mal { background: var(--coral-claro); }
  .juicio.mal :global(svg) { color: var(--coral); }

  .acciones { display: grid; grid-template-columns: 1fr 1.6fr; gap: 8px; margin-top: 18px; }
  .acciones.col { grid-template-columns: 1fr; }
</style>
