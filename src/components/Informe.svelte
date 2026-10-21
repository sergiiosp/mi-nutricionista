<script>
  // Informe de los últimos 30 días para guardarlo en PDF o enseñárselo a un entrenador o nutricionista:
  // peso y composición, comida, entrenos, fuerza y fotos. «Guardar en PDF» usa el imprimir del móvil.
  import Icono from './Icono.svelte';
  import { estado } from '../stores/estado.js';
  import { calcularObjetivos } from '../lib/nutricion.js';
  import { hoyISO, sumarDias } from '../lib/planificador.js';
  import { resumenDia } from '../lib/logros.js';
  import { tendencia } from '../lib/progreso.js';
  import { cambioCuerpo, ultimaComposicion } from '../lib/cuerpo.js';
  import { historialFuerza } from '../lib/hyrox/fuerza.js';
  import { planDe } from '../lib/hyrox/index.js';
  import { urlFoto } from '../lib/fotos.js';
  import { EJERCICIOS } from '../data/hyrox.js';
  import { fechaCorta, entero, num } from '../lib/formato.js';

  const e = $estado;
  const hoy = hoyISO();
  const desde = sumarDias(hoy, -30);
  const o = calcularObjetivos(e.perfil);
  const fechas = Array.from({ length: 30 }, (_, i) => sumarDias(desde, i));
  const dias = fechas.map((f) => resumenDia(e, o, f)).filter(Boolean);
  const media = (k) => (dias.length ? dias.reduce((s, d) => s + d.m[k], 0) / dias.length : 0);
  const pesos = [...(e.pesos || [])].filter((p) => p.fecha >= desde).sort((a, b) => a.fecha.localeCompare(b.fecha));
  const t = tendencia(e.pesos || [], 30);
  const cuerpo = cambioCuerpo((e.pesos || []).filter((p) => p.fecha >= desde));
  const comp = ultimaComposicion(e.pesos || []);
  const plan = planDe(e);
  const regs = e.hyrox?.registros || {};
  const previstas = plan ? plan.sesiones.filter((s) => s.fecha >= desde && s.fecha <= hoy && s.tipo !== 'carrera') : [];
  const hechas = previstas.filter((s) => ['completa', 'parcial'].includes(regs[s.id]?.estado));
  const minutos = hechas.reduce((s, x) => s + (regs[x.id]?.duracion || x.duracion || 0), 0);
  // Fuerza: el cambio de 1RM estimado de cada ejercicio entre la primera y la última vez del mes
  const hist = historialFuerza(regs, plan);
  const fuerza = Object.entries(hist).map(([id, l]) => {
    const mes = l.filter((x) => x.fecha >= desde);
    if (mes.length < 2) return null;
    const a = mes[0].mejor, b = mes.at(-1).mejor;
    return { id, nombre: EJERCICIOS[id]?.nombre || id, antes: a, ahora: b, cambio: Math.round(((b - a) / a) * 100) };
  }).filter(Boolean).sort((a, b) => b.cambio - a.cambio).slice(0, 5);
  // Fotos de frente: la primera y la última del mes
  const fotos = (e.fotosProgreso || []).filter((f) => f.fecha >= desde && (f.pose || 'frente') === 'frente').sort((a, b) => a.fecha.localeCompare(b.fecha));
  const parFotos = fotos.length >= 2 ? [fotos[0], fotos.at(-1)] : [];
  let urls = $state({});
  for (const f of parFotos) urlFoto(f.id).then((u) => { if (u) urls = { ...urls, [f.id]: u }; });
  const signo = (x, d = 1) => `${x > 0 ? '+' : ''}${num(x, d)}`;
</script>

<div class="informe">
  <header class="i-cab">
    <img src="icons/icon.svg" alt="" width="40" height="40" />
    <div><b>Informe de progreso</b><small>{e.perfil.nombre ? `${e.perfil.nombre} · ` : ''}{fechaCorta(desde)} – {fechaCorta(hoy)}</small></div>
  </header>

  <section>
    <h3>Peso y composición</h3>
    <div class="i-datos">
      <div><small>Peso</small><b>{pesos.length ? `${num(pesos.at(-1).peso, 1)} kg` : '—'}</b><span>{pesos.length >= 2 ? `${signo(pesos.at(-1).peso - pesos[0].peso)} kg en el mes` : 'pocos pesajes'}</span></div>
      <div><small>Tendencia</small><b>{t ? `${signo(t.kgSemana, 2)}` : '—'}</b><span>kg por semana</span></div>
      {#if comp?.grasa}<div><small>Grasa</small><b>{num(comp.grasa, 1)} %</b><span>{cuerpo?.grasaKg != null ? `${signo(cuerpo.grasaKg)} kg de grasa` : 'última medición'}</span></div>{/if}
      {#if comp?.musculo}<div><small>Músculo</small><b>{num(comp.musculo, 1)} kg</b><span>{cuerpo?.musculo != null ? `${signo(cuerpo.musculo)} kg` : 'última medición'}</span></div>{/if}
      {#if comp?.visceral}<div><small>Grasa visceral</small><b>{comp.visceral}</b><span>{comp.visceral < 10 ? 'sana (menos de 10)' : 'alta'}</span></div>{/if}
      {#if comp?.edad}<div><small>Edad corporal</small><b>{comp.edad} años</b><span>tienes {e.perfil.edad}</span></div>{/if}
    </div>
  </section>

  <section>
    <h3>Comida</h3>
    <div class="i-datos">
      <div><small>Días apuntados</small><b>{dias.length}/30</b><span>{dias.filter((d) => d.kcalOk).length} dentro de kcal</span></div>
      <div><small>Kcal de media</small><b>{entero(media('kcal'))}</b><span>objetivo {entero(o.kcal)}</span></div>
      <div><small>Proteína de media</small><b>{Math.round(media('p'))} g</b><span>{dias.filter((d) => d.proteinaOk).length} días cumplida</span></div>
      {#if e.gasto?.listo}<div><small>Gasto real</small><b>{entero(e.gasto.tdee)}</b><span>kcal/día (fórmula {entero(e.gasto.formula)})</span></div>{/if}
    </div>
  </section>

  {#if plan}
    <section>
      <h3>Entreno</h3>
      <div class="i-datos">
        <div><small>Sesiones</small><b>{hechas.length}/{previstas.length}</b><span>{previstas.length ? Math.round((hechas.length / previstas.length) * 100) : 0} % del plan</span></div>
        <div><small>Tiempo</small><b>{Math.floor(minutos / 60)} h {minutos % 60} min</b><span>entrenando</span></div>
      </div>
      {#if fuerza.length}
        <table class="i-tabla">
          <thead><tr><th>Fuerza (1RM estimado)</th><th>Antes</th><th>Ahora</th><th></th></tr></thead>
          <tbody>{#each fuerza as f (f.id)}<tr><td>{f.nombre}</td><td>{num(f.antes, 1)} kg</td><td>{num(f.ahora, 1)} kg</td><td class:sube={f.cambio > 0}>{f.cambio > 0 ? '+' : ''}{f.cambio} %</td></tr>{/each}</tbody>
        </table>
      {/if}
    </section>
  {/if}

  {#if parFotos.length}
    <section>
      <h3>Fotos (de frente)</h3>
      <div class="i-fotos">
        {#each parFotos as f (f.id)}<figure>{#if urls[f.id]}<img src={urls[f.id]} alt="Foto del {fechaCorta(f.fecha)}" />{/if}<figcaption>{fechaCorta(f.fecha)}</figcaption></figure>{/each}
      </div>
    </section>
  {/if}

  <p class="i-pie">Generado con Pulso. Cálculos orientativos: no sustituyen el consejo de un profesional.</p>
</div>

<button class="boton ancho no-imprimir" onclick={() => window.print()}><Icono n="share" tam={18} /> Guardar en PDF o compartir</button>
<p class="pie-nota no-imprimir">En el iPhone: «Imprimir» y luego, en la vista previa, Compartir → Guardar en Archivos.</p>

<style>
  .informe { padding: 18px; border-radius: 20px; background: #fff; color: #16161a; font-size: 0.86rem; }
  .i-cab { display: flex; align-items: center; gap: 12px; padding-bottom: 12px; border-bottom: 2px solid #ff5b1f; }
  .i-cab img { border-radius: 10px; }
  .i-cab div { display: grid; }
  .i-cab b { font-size: 1.2rem; }
  .i-cab small { color: #5f5f68; font-weight: 600; }
  h3 { margin: 16px 0 8px; font-size: 0.95rem; color: #16161a; }
  .i-datos { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
  .i-datos div { display: grid; padding: 10px; border-radius: 12px; background: #f3f3f6; }
  .i-datos small { font-size: 0.72rem; font-weight: 700; color: #5f5f68; }
  .i-datos b { font-size: 1.2rem; font-variant-numeric: tabular-nums; }
  .i-datos span { font-size: 0.74rem; color: #5f5f68; }
  .i-tabla { width: 100%; margin-top: 10px; border-collapse: collapse; font-size: 0.78rem; font-variant-numeric: tabular-nums; }
  .i-tabla th { text-align: left; font-size: 0.7rem; color: #5f5f68; font-weight: 700; padding: 6px 4px; border-bottom: 1px solid #ddd; }
  .i-tabla td { padding: 6px 4px; border-bottom: 1px solid #eee; }
  .i-tabla td + td, .i-tabla th + th { white-space: nowrap; text-align: right; }
  .i-tabla td.sube { color: #2f8a3a; font-weight: 700; }
  .i-fotos { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .i-fotos figure { margin: 0; }
  .i-fotos img { width: 100%; aspect-ratio: 3 / 4; object-fit: cover; border-radius: 10px; display: block; }
  .i-fotos figcaption { margin-top: 4px; font-size: 0.74rem; font-weight: 700; color: #5f5f68; text-align: center; }
  .i-pie { margin: 16px 0 0; font-size: 0.7rem; color: #8a8a94; }
  .ancho { width: 100%; margin-top: 14px; }
  /* Al imprimir (o guardar en PDF) solo sale el informe, en blanco */
  @media print {
    :global(body *) { visibility: hidden !important; }
    .informe, .informe :global(*) { visibility: visible !important; }
    .informe { position: absolute; left: 0; top: 0; width: 100%; border-radius: 0; }
    :global(html), :global(body) { background: #fff !important; }
  }
</style>
