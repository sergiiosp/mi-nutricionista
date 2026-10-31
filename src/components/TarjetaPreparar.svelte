<script>
  // El día que toca preparar (el primero de cada tanda del menú), Hoy te lo dice: qué cocinar para tener hechos
  // los próximos días, cuánto se tarda y cuánto llevas. El detalle, paso a paso, en la hoja «Preparar de una vez».
  import Icono from './Icono.svelte';
  import { estado } from '../stores/estado.js';
  import { abrirHoja } from '../stores/ui.js';
  import { hoyISO } from '../lib/planificador.js';
  import { diaPreparar, planBatch } from '../lib/batch.js';
  import { ocultarPreparar } from '../lib/acciones.js';
  import { diaSemana } from '../lib/formato.js';

  const hoy = hoyISO();
  const toca = $derived(diaPreparar($estado.plan, hoy));
  const batch = $derived(toca ? planBatch($estado.plan, toca.desde, toca.dias, $estado.perfil?.aparatos) : null);
  const guardado = $derived($estado.preparar?.desde === hoy ? $estado.preparar : null);
  const hechas = $derived(batch ? batch.tareas.filter((t) => guardado?.hechas?.[t.titulo]).length : 0);
  const visible = $derived(!!batch?.tareas.length && !guardado?.oculto);
  const listo = $derived(visible && hechas === batch.tareas.length);
  const hasta = $derived(batch?.dias.length ? diaSemana(batch.dias.at(-1)) : '');
  const nombre = $derived($estado.perfil?.nombre);
  // «arroz y cuscús, carnes, verduras cocinadas y 1 más»
  const que = $derived.by(() => {
    const t = (batch?.tareas || []).map((x) => x.titulo.toLowerCase());
    const l = t.length > 3 ? [...t.slice(0, 3), `${t.length - 3} más`] : t;
    return l.length > 1 ? `${l.slice(0, -1).join(', ')} y ${l.at(-1)}` : l[0] || '';
  });
  const tiempo = (m) => (m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${String(Math.round((m % 60) / 5) * 5).padStart(2, '0')}`);
</script>

{#if visible}
  <section class="preparar s-comida" class:listo aria-label="Preparar la comida de los próximos días">
    <div class="pr-cab">
      <span class="pr-ic"><Icono n={listo ? 'check' : 'chef-hat'} tam={20} grosor={2.2} /></span>
      <div class="pr-txt">
        <small>{listo ? 'Preparado' : 'Hoy toca preparar'}</small>
        <b>{listo ? `Tienes la comida hecha hasta el ${hasta}` : `${nombre ? `${nombre}, prepara` : 'Prepara'} hoy y tendrás la comida hecha hasta el ${hasta}`}</b>
      </div>
      {#if listo}<button class="pr-cerrar" aria-label="Ocultar" onclick={() => ocultarPreparar(hoy)}><Icono n="x" tam={18} /></button>{/if}
    </div>
    {#if !listo}
      <p class="pr-que">{que}</p>
      <p class="pr-datos cifra">~{tiempo(batch.minutos)} de cocina · {batch.tapers.length} tápers{#if hechas} · {hechas} de {batch.tareas.length} hechos{/if}</p>
      {#if hechas}<div class="pr-pista" aria-hidden="true"><i style="width:{(hechas / batch.tareas.length) * 100}%"></i></div>{/if}
      <div class="pr-acciones">
        <button class="boton boton-peq" onclick={() => abrirHoja('preparar', { desde: toca.desde, dias: toca.dias })}><Icono n="chef-hat" tam={17} grosor={2.2} /> {hechas ? 'Seguir preparando' : 'Ver qué preparar'}</button>
        <button class="boton boton-sec boton-peq" onclick={() => ocultarPreparar(hoy)}>Hoy no</button>
      </div>
    {/if}
  </section>
{/if}

<style>
  .preparar { margin-top: 12px; padding: 14px; border-radius: var(--r-l); background: radial-gradient(120% 100% at 0% 0%, color-mix(in srgb, var(--primario) 14%, transparent), transparent 62%), var(--superficie); box-shadow: var(--sombra); }
  .pr-cab { display: flex; align-items: center; gap: 12px; }
  .pr-ic { display: grid; place-items: center; width: 40px; height: 40px; border-radius: var(--r-s); background: var(--primario-claro); color: var(--primario-fuerte); flex-shrink: 0; }
  .listo .pr-ic { background: var(--primario); color: var(--sobre-primario); }
  .pr-txt { flex: 1; min-width: 0; display: grid; gap: 1px; }
  .pr-txt small { font-size: 0.74rem; font-weight: 700; color: var(--primario-fuerte); }
  .pr-txt b { font-size: 0.98rem; line-height: 1.25; text-wrap: balance; }
  .pr-cerrar { display: grid; place-items: center; width: 44px; height: 44px; margin: -6px -6px -6px 0; border: 0; border-radius: 50%; background: none; color: var(--texto-3); cursor: pointer; }
  .pr-que { margin: 10px 0 0; font-size: 0.86rem; color: var(--texto-2); }
  .pr-que::first-letter { text-transform: uppercase; }
  .pr-datos { margin: 4px 0 0; font-size: 0.78rem; font-weight: 600; color: var(--texto-3); }
  .pr-pista { height: 5px; margin-top: 8px; border-radius: 999px; background: var(--superficie-3); overflow: hidden; }
  .pr-pista i { display: block; height: 100%; border-radius: 999px; background: var(--primario); transition: width 0.4s var(--ease-out); }
  .pr-acciones { display: flex; gap: 8px; margin-top: 12px; }
  .pr-acciones .boton:first-child { flex: 1; }
</style>
