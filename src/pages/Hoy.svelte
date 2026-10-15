<script>
  import { fly } from 'svelte/transition';
  import Anillo from '../components/Anillo.svelte';
  import Emoji from '../components/Emoji.svelte';
  import TarjetaComida from '../components/TarjetaComida.svelte';
  import TarjetaSesion from '../components/TarjetaSesion.svelte';
  import { planDe, sesionesDia } from '../lib/hyrox/index.js';
  import { estado, añadirRegistro, borrarRegistro, horaActual } from '../stores/estado.js';
  import { abrirHoja, avisar } from '../stores/ui.js';
  import { calcularObjetivos, DEPORTES, cantidadTexto } from '../lib/nutricion.js';
  import { hoyISO } from '../lib/planificador.js';
  import { estadoDia, sugerencias } from '../lib/dia.js';
  import { recomendaciones, recordatoriosDia } from '../lib/salud.js';
  import { esDiaEntreno, horarioDia } from '../lib/horario.js';
  import { crearRegistro, emojiAlimento } from '../lib/registro.js';
  import { crearPlan } from '../lib/acciones.js';
  import { fechaLarga, saludo, capital, entero } from '../lib/formato.js';
  import { rachas } from '../lib/logros.js';

  const hoy = hoyISO();
  const objetivos = $derived(calcularObjetivos($estado.perfil));
  let ahora = $state(horaActual());
  $effect(() => { const t = setInterval(() => (ahora = horaActual()), 60000); return () => clearInterval(t); });
  const d = $derived(estadoDia($estado, objetivos, hoy, ahora));
  const diaIdx = $derived($estado.plan?.dias.findIndex((x) => x.fecha === hoy) ?? -1);
  const entreno = $derived(d.dia ? d.entreno : esDiaEntreno($estado.perfil, hoy));
  const sesion = $derived(d.dia?.sesion || (entreno ? horarioDia($estado.perfil, true).entreno : null));
  const deportes = $derived(($estado.perfil.deportes || []).map((x) => DEPORTES[x]).filter(Boolean));
  const hyroxActivo = $derived(!!planDe($estado));
  const sesionesHoy = $derived(sesionesDia($estado, hoy));
  const recs = $derived(recomendaciones($estado.perfil, objetivos));
  const opciones = $derived(sugerencias(d.huecoFinal, $estado.perfil));
  const r = $derived(rachas($estado, objetivos, hoy));
  const NOMBRES = { desayuno: 'Desayuno', media: 'Media mañana', comida: 'Comida', merienda: 'Merienda', cena: 'Cena' };
  const nombreFranja = (c) => (['media', 'merienda'].includes(c.franja) && c.hora ? (c.hora < '14:00' ? 'Media mañana' : 'Merienda') : NOMBRES[c.franja]);

  const linea = $derived.by(() => {
    const items = d.comidas.map((c) => ({ tipo: 'comida', hora: c.hora || '', c }));
    if (hyroxActivo) for (const s of sesionesHoy) items.push({ tipo: 'hyrox', hora: s.hora, s });
    else if (entreno && sesion) items.push({ tipo: 'entreno', hora: sesion.inicio });
    const franjas = d.comidas.map((c) => ({ id: c.franja, horaTexto: c.hora || '' }));
    for (const x of recordatoriosDia(recs, franjas, sesion)) items.push({ tipo: 'sup', hora: x.hora, x });
    for (const x of d.extras) items.push({ tipo: 'extra', hora: x.hora || '', x });
    const orden = { sup: 0, entreno: 1, hyrox: 1, extra: 2, comida: 3 };
    return items.sort((a, b) => a.hora.localeCompare(b.hora) || orden[a.tipo] - orden[b.tipo]);
  });

  const CONSEJOS = [
    'Llena medio plato de verdura: aporta volumen, fibra y casi nada de calorías.',
    'Si un día te sales del plan, no compenses al siguiente: vuelve al menú y listo.',
    'Reparte la proteína entre todas las comidas: tu músculo la aprovecha mejor.',
    'Mide el aceite con cuchara: es sano, pero muy calórico.',
    'Duerme 7-8 horas: dormir poco dispara el hambre y empeora la recuperación.',
    'Las verduras congeladas son tan nutritivas como las frescas y te ahorran tiempo.',
    'Camina: 8.000-10.000 pasos al día suman mucho gasto sin darte más hambre.',
  ];
  const consejo = CONSEJOS[new Date().getDate() % CONSEJOS.length];

  function añadirSugerencia(op) {
    for (const it of op.items) {
      añadirRegistro(hoy, crearRegistro({ item: { tipo: 'alimento', id: it.a }, cantidad: it.g, fecha: hoy, franja: null }));
    }
    avisar(`Añadido: ${op.nombre}`, '✅');
  }
</script>

<section class="hoy">
  <header class="saludo">
    <p>{capital(fechaLarga(hoy))}</p>
    <h1>{saludo()}{$estado.perfil.nombre ? `, ${$estado.perfil.nombre}` : ''} 👋</h1>
  </header>

  <div class="hero" in:fly={{ y: 16, duration: 300 }}>
    <div class="hero-top">
      <span class="badge">{#if hyroxActivo && sesionesHoy.length}{sesionesHoy[0].emoji} {sesionesHoy[0].titulo}{:else if entreno}💪 Día de entreno{#if sesion}{' · '}{sesion.inicio}{/if}{:else}😌 Día de descanso{/if}</span>
      {#if r.registro > 1}<span class="badge">🔥 {r.registro} días seguidos</span>{/if}
    </div>
    <div class="hero-cuerpo">
      <Anillo valor={d.consumido.kcal} max={d.objetivo.kcal} tam={132} grosor={12} color="#fff" pista="rgb(255 255 255 / 0.22)">
        {#if d.pasado}
          <span class="grande">+{entero(d.consumido.kcal - d.objetivo.kcal)}</span><span class="peq">kcal de más</span>
        {:else}
          <span class="grande">{entero(Math.max(0, d.faltan.kcal))}</span><span class="peq">kcal te quedan</span>
        {/if}
      </Anillo>
      <div class="barras">
        {#each [['Proteína', 'p', 'b-p'], ['Hidratos', 'c', 'b-c'], ['Grasa', 'g', 'b-g']] as [n, k, cl] (k)}
          {@const falta = d.objetivo[k] - d.consumido[k]}
          <div class="barra-macro {cl}">
            <div class="barra-cab"><span>{n}</span><span>{falta > 0 ? `faltan ${Math.round(falta)} g` : '✓ completo'}</span></div>
            <div class="barra-pista"><div class="barra-relleno" style="width:{Math.min(100, (d.consumido[k] / d.objetivo[k]) * 100)}%"></div></div>
          </div>
        {/each}
      </div>
    </div>
    <p class="hero-pie">{entero(d.consumido.kcal)} de {entero(d.objetivo.kcal)} kcal · {d.comidas.filter((c) => c.situacion === 'hecha').length}/{d.comidas.length} comidas del plan</p>
  </div>

  {#if !$estado.plan || diaIdx === -1}
    <div class="tarjeta vacia">
      <Emoji e="🥗" tam={56} />
      <p>{$estado.plan ? 'Tu menú semanal ha terminado.' : 'Todavía no tienes menú.'} ¿Preparamos uno?</p>
      <button class="boton" onclick={() => { crearPlan(); avisar('Menú de 7 días listo', '🥗'); }}>✨ Crear menú de 7 días</button>
    </div>
  {/if}

  {#if d.desviado && d.comidas.some((c) => c.ajustada && c.situacion === 'pendiente')}
    <div class="aviso aviso-lila">🔄 <span>He <b>reajustado tus próximas comidas</b> para que el día siga cuadrando con lo que ya has comido.</span></div>
  {/if}
  {#if d.strava.extraKcal > 0}
    <div class="aviso aviso-strava">⌚ <span>Entreno extra en Strava ({d.strava.extras.map((a) => a.nombre).join(', ')}): te sumo <b>{entero(d.strava.extraKcal)} kcal</b> a hoy, sobre todo en hidratos, repartidas en lo que te queda.</span></div>
  {/if}
  {#if d.pasado}
    <div class="aviso aviso-amarillo">🙌 <span>Hoy te has pasado un poco. No pasa nada: <b>no compenses mañana</b>, sigue el menú normal.</span></div>
  {/if}

  {#if opciones.length && d.huecoFinal.kcal > 120}
    <div class="tarjeta sugerencias">
      <div class="sug-cab"><Emoji e="💡" tam={28} /><div><b>Te faltarán ~{entero(d.huecoFinal.kcal)} kcal{#if d.huecoFinal.p > 8} y {Math.round(d.huecoFinal.p)} g de proteína{/if}</b><small>{d.pendientes.length ? 'aunque hagas las comidas que te quedan' : 'para cerrar el día'}. Ideas rápidas:</small></div></div>
      {#each opciones as op (op.nombre)}
        <div class="sug">
          <span class="sug-ic">{#each op.items as it (it.a)}<Emoji e={emojiAlimento(it.a)} tam={24} />{/each}</span>
          <span class="sug-txt"><b>{op.items.map((it) => `${cantidadTexto(it.a, it.g)}`).join(' + ')}</b><small>{op.nombre} · {entero(op.m.kcal)} kcal · P {Math.round(op.m.p)} g</small></span>
          <button class="sug-mas" aria-label="Añadir {op.nombre}" onclick={() => añadirSugerencia(op)}>+</button>
        </div>
      {/each}
    </div>
  {/if}

  {#if linea.length}
    <h2 class="seccion">Tu día</h2>
    <ol class="timeline">
      {#each linea as it, i (it.tipo + (it.c?.franja || it.s?.id || it.x?.id || it.x?.texto || i))}
        <li class="tl tl-{it.tipo}">
          <div class="tl-hora">{it.tipo === 'sup' ? '' : it.hora}</div>
          <div class="tl-linea"><span></span></div>
          <div class="tl-contenido">
            {#if it.tipo === 'comida'}
              <TarjetaComida comida={it.c} fecha={hoy} {diaIdx} franjaNombre={nombreFranja(it.c)} />
            {:else if it.tipo === 'hyrox'}
              <TarjetaSesion sesion={it.s} registro={$estado.hyrox?.registros?.[it.s.id]} />
            {:else if it.tipo === 'entreno'}
              <div class="bloque-entreno">
                <Emoji e={deportes[0]?.emoji || '🏋️'} tam={34} />
                <div><b>Entreno</b><small>{sesion.inicio} – {sesion.fin} · {deportes.map((x) => x.nombre).join(', ') || 'tu sesión'}</small></div>
              </div>
            {:else if it.tipo === 'sup'}
              <div class="recordatorio"><Emoji e={it.x.emoji} tam={18} /> {it.x.texto}</div>
            {:else if it.tipo === 'extra'}
              <div class="extra">
                {#if it.x.imagen && it.x.tipo === 'producto'}<img src={it.x.imagen} alt="" />{:else}<span class="ic"><Emoji e={it.x.emoji || '🍽️'} tam={26} /></span>{/if}
                <span class="txt"><small>{it.x.franja ? NOMBRES[it.x.franja] : 'Picoteo'}</small><b>{it.x.nombre}</b><small>{it.x.cantidad?.texto} · {entero(it.x.macros.kcal)} kcal · P {Math.round(it.x.macros.p)} g</small></span>
                <button class="borrar" aria-label="Borrar {it.x.nombre}" onclick={() => borrarRegistro(hoy, it.x.id)}>✕</button>
              </div>
            {/if}
          </div>
        </li>
      {/each}
    </ol>
    {#each d.dia?.consejos || [] as c (c)}<p class="nota-dia">💡 {c}</p>{/each}
  {/if}

  <button class="registrar-rapido" onclick={() => abrirHoja('registrar', { fecha: hoy })}><Emoji e="➕" tam={22} /> Registrar algo que he comido</button>

  <div class="tarjeta consejo-dia"><Emoji e="🧠" tam={32} /><div><b>Consejo del día</b><p>{consejo}</p></div></div>
</section>

<style>
  .saludo p { margin: 6px 0 0; color: var(--texto-2); font-weight: 700; font-size: 0.92rem; }
  .saludo h1 { margin: 2px 0 12px; }
  .hero { position: relative; overflow: hidden; padding: 16px 18px; border-radius: 28px; background: var(--hero); color: #fff; box-shadow: var(--sombra-fuerte); }
  .hero::before, .hero::after { content: ''; position: absolute; border-radius: 50%; background: rgb(255 255 255 / 0.09); pointer-events: none; }
  .hero::before { width: 220px; height: 220px; right: -70px; top: -90px; }
  .hero::after { width: 140px; height: 140px; left: -50px; bottom: -70px; }
  .hero-top { position: relative; display: flex; gap: 8px; flex-wrap: wrap; }
  .badge { display: inline-block; padding: 5px 12px; border-radius: 999px; background: rgb(255 255 255 / 0.2); font-weight: 800; font-size: 0.82rem; }
  .hero-cuerpo { position: relative; display: flex; align-items: center; gap: 16px; margin-top: 14px; }
  .grande { display: block; font-size: 1.8rem; font-weight: 900; line-height: 1; }
  .peq { display: block; font-size: 0.72rem; font-weight: 700; opacity: 0.9; margin-top: 4px; }
  .barras { flex: 1; min-width: 0; }
  .hero .barra-pista { background: rgb(255 255 255 / 0.22); }
  .hero .b-p .barra-relleno { background: #ffd2c9; }
  .hero .b-c .barra-relleno { background: #ffe7a8; }
  .hero .b-g .barra-relleno { background: #cfe0ff; }
  .hero-pie { position: relative; margin: 12px 0 0; font-size: 0.8rem; font-weight: 700; opacity: 0.88; }
  .aviso-strava { background: color-mix(in srgb, #fc4c02 14%, var(--superficie)); }
  .aviso { display: flex; gap: 10px; align-items: flex-start; padding: 12px 14px; border-radius: 18px; margin: 12px 0; font-weight: 600; font-size: 0.9rem; }
  .aviso-lila { background: var(--lila-claro); }
  .aviso-amarillo { background: var(--amarillo-claro); }
  .sugerencias { background: linear-gradient(135deg, var(--amarillo-claro), var(--superficie) 60%); }
  .sug-cab { display: flex; gap: 10px; align-items: flex-start; margin-bottom: 8px; }
  .sug-cab small { display: block; color: var(--texto-2); font-weight: 600; }
  .sug { display: flex; align-items: center; gap: 10px; padding: 8px 10px; margin-top: 6px; border-radius: 14px; background: var(--superficie); }
  .sug-ic { display: flex; gap: 2px; }
  .sug-txt { flex: 1; min-width: 0; display: grid; font-size: 0.88rem; }
  .sug-txt small { color: var(--texto-2); font-weight: 600; font-size: 0.76rem; }
  .sug-mas, .borrar { width: 32px; height: 32px; border-radius: 50%; border: 0; background: var(--primario); color: #fff; font-weight: 900; font-size: 1.1rem; cursor: pointer; flex-shrink: 0; }
  .borrar { background: var(--superficie-2); color: var(--texto-2); font-size: 0.85rem; }
  .bloque-entreno { display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-radius: 18px; background: linear-gradient(120deg, var(--coral-claro), var(--amarillo-claro)); font-weight: 700; }
  .bloque-entreno small { display: block; color: var(--texto-2); font-weight: 600; }
  .recordatorio { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 999px; background: var(--lila-claro); font-size: 0.82rem; font-weight: 700; margin-top: 6px; }
  .extra { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 18px; background: var(--superficie); box-shadow: var(--sombra); }
  .extra img, .ic { width: 44px; height: 44px; border-radius: 12px; object-fit: contain; background: var(--superficie-2); display: grid; place-items: center; flex-shrink: 0; }
  .txt { flex: 1; min-width: 0; display: grid; }
  .txt small { color: var(--texto-2); font-weight: 600; font-size: 0.76rem; }
  .txt small:first-child { text-transform: uppercase; letter-spacing: 0.05em; font-weight: 900; font-size: 0.68rem; }
  .registrar-rapido { width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; margin: 14px 0 4px; padding: 14px; border-radius: 18px; border: 2px dashed var(--borde); background: transparent; font-weight: 800; color: var(--texto-2); cursor: pointer; }
  .registrar-rapido:hover { border-color: var(--primario); color: var(--primario-fuerte); }
  .consejo-dia { display: flex; gap: 12px; align-items: flex-start; }
  .consejo-dia p { margin: 2px 0 0; }
  .vacia { text-align: center; }
  @media (max-width: 360px) { .hero-cuerpo { flex-direction: column; align-items: stretch; } .hero-cuerpo :global(.anillo) { align-self: center; } .barras { width: 100%; } }
</style>
