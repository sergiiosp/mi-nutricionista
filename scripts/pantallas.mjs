// Pruebas de pantallas: hace capturas de toda la app a tamaño iPhone (390 × 844) con datos de ejemplo,
// la fecha y la hora fijas y el azar con semilla (siempre sale lo mismo), y las compara con las de base.
//
//   node scripts/pantallas.mjs base     → guarda las capturas de referencia en pantallas/base/
//   node scripts/pantallas.mjs          → captura en pantallas/actual/ y compara con la base
//   node scripts/pantallas.mjs hoy      → solo las pantallas cuyo nombre empieza por «hoy»
//
// Las diferencias se pintan en rojo en pantallas/diferencias/ y salen en pantallas/informe.html.
// Usa Edge o Chrome sin ventana (sin dependencias nuevas) y arranca Vite él solo.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = process.argv[2] === 'base';
const FILTRO = BASE ? process.argv[3] : process.argv[2];
const DIR = path.join(RAIZ, 'pantallas');
const SALIDA = path.join(DIR, BASE ? 'base' : 'actual');
const UMBRAL = 0.002; // más de un 0,2 % de píxeles distintos = la pantalla ha cambiado
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
fs.rmSync(SALIDA, { recursive: true, force: true });
fs.mkdirSync(SALIDA, { recursive: true });

// ── Navegador sin ventana ────────────────────────────────────────────────
const NAVEGADORES = [
  process.env.NAVEGADOR,
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome', '/usr/bin/chromium',
].filter(Boolean);
const ejecutable = NAVEGADORES.find((p) => fs.existsSync(p));
if (!ejecutable) throw new Error('No encuentro Edge ni Chrome: indica la ruta en la variable NAVEGADOR');

const servidor = await createServer({ root: RAIZ, logLevel: 'error', server: { port: 8095, strictPort: false } });
await servidor.listen();
const URL_APP = servidor.resolvedUrls.local[0];
const PUERTO = 9340;
const perfil = fs.mkdtempSync(path.join(os.tmpdir(), 'pulso-pantallas-'));
const nav = spawn(ejecutable, ['--headless=new', `--remote-debugging-port=${PUERTO}`, `--user-data-dir=${perfil}`, '--hide-scrollbars', '--no-first-run', '--force-color-profile=srgb', '--font-render-hinting=none', 'about:blank'], { stdio: 'ignore' });

let lista;
for (let i = 0; i < 50 && !lista?.some((t) => t.type === 'page'); i++) {
  try { lista = await (await fetch(`http://127.0.0.1:${PUERTO}/json/list`)).json(); } catch { /* arrancando */ }
  await espera(300);
}
const ws = new WebSocket(lista.find((t) => t.type === 'page').webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r));
let n = 0;
const pendientes = new Map();
ws.addEventListener('message', (ev) => { const m = JSON.parse(ev.data); if (m.id && pendientes.has(m.id)) { pendientes.get(m.id)(m); pendientes.delete(m.id); } });
const cdp = (method, params = {}) => new Promise((r) => { const id = ++n; pendientes.set(id, r); ws.send(JSON.stringify({ id, method, params })); });
const js = async (codigo) => {
  const r = await cdp('Runtime.evaluate', { expression: `(async () => { ${codigo} })()`, awaitPromise: true, returnByValue: true });
  if (r.result?.exceptionDetails) console.error('JS:', r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text);
  return r.result?.result?.value;
};

// Martes 20 de octubre de 2026 a las 13:05, siempre; y Math.random con semilla
await cdp('Page.addScriptToEvaluateOnNewDocument', { source: `
  (() => {
    const FIJO = new Date(2026, 9, 20, 13, 5, 0).getTime();
    const D = Date;
    class Fija extends D { constructor(...a) { super(...(a.length ? a : [FIJO])); } static now() { return FIJO; } }
    globalThis.Date = Fija;
    let s = 20261020;
    Math.random = () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296);
  })();` });
await cdp('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
await cdp('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
await cdp('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }, { name: 'prefers-color-scheme', value: 'dark' }] });
await cdp('Page.enable');
await cdp('Page.navigate', { url: `${URL_APP}#hoy` });
await espera(2500);

// ── Datos de ejemplo (perfil parecido al de Sergio, plan HYROX, registros) ──
await js(`
  const perfil = { nombre: 'Sergio', sexo: 'h', edad: 30, altura: 178, peso: 80.1, grasa: 17.2, trabajo: 'sentado', trabajoInicio: '09:00', trabajoFin: '18:00', despertar: '07:00', dormir: '23:30', pasos: 'normal', entrena: true, deportes: ['fuerza', 'carrera', 'hiit'], diasEntreno: [1, 2, 4, 5], horaEntreno: '18:30', duracionEntreno: 60, intensidad: 'moderada', compite: true, objetivo: 'recomposicion', ritmo: 'moderado', comidas: 4, alergias: ['cacahuete', 'nueces', 'avellana', 'anacardo', 'verdura_cruda', 'fruta_piel'], noMeGusta: [], dieta: 'omnivora', condiciones: [], leche: 'avena', aparatos: ['microondas', 'airfryer', 'plancha'], whey: true };
  const pesos = ['2026-09-21:81.6:18.4:61.8:55.6', '2026-09-28:81.2:18.1:61.9:55.8', '2026-10-05:80.7:17.6:62.1:55.9', '2026-10-12:80.4:17.2:62.2:56.1', '2026-10-19:80.1:16.9:62.4:56'].map((x) => { const [f, p, g, m, a] = x.split(':'); return { fecha: f, peso: +p, grasa: +g, musculo: +m, agua: +a }; });
  localStorage.clear();
  const datos = JSON.stringify({ version: 2, perfil, plan: null, registros: {}, saltadas: {}, pesos, medidas: [{ fecha: '2026-09-21', cintura: 86 }, { fecha: '2026-10-12', cintura: 84.5 }],
    hyrox: { config: { inicio: '2026-09-22', fechaCarrera: '2027-02-20', categoria: 'open', nivel: 'intermedio', dias: [1, 2, 4, 5], hora: '18:30', material: {}, lesiones: [], marcas: { t5k: 1440 }, enfoque: 'equilibrado', exigencia: 'normal' }, registros: {}, movidas: {} },
    propuestasVistas: { 'media-2026-10-25': true } });
  // La app guarda su estado al salir de la página: los datos de ejemplo se escriben después
  localStorage.setItem('mi-nutricionista:v1', datos);
  addEventListener('pagehide', () => localStorage.setItem('mi-nutricionista:v1', datos));
  location.reload();`);
await espera(2500);
await js(`
  const a = await import('/src/lib/acciones.js'); a.crearPlan();
  await new Promise((r) => setTimeout(r, 300));
  const st = await import('/src/stores/estado.js'); const { planDe } = await import('/src/lib/hyrox/index.js'); const { crearRegistro } = await import('/src/lib/registro.js');
  const e = JSON.parse(localStorage.getItem('mi-nutricionista:v1'));
  const r = (id, g, f, franja) => crearRegistro({ item: { tipo: 'alimento', id }, cantidad: g, fecha: f, franja });
  st.actualizar((x) => {
    for (const f of ['2026-10-16', '2026-10-17', '2026-10-18']) x.registros[f] = [r('yogur_proteinas', 120, f, 'desayuno'), r('platano', 120, f, 'merienda')];
    x.registros['2026-10-19'] = [r('yogur_proteinas', 120, '2026-10-19', 'desayuno'), r('avena', 40, '2026-10-19', 'desayuno'), r('platano', 120, '2026-10-19', 'merienda')];
    x.registros['2026-10-20'] = [st.registroDePlan(e.plan.dias[0].comidas[0], '2026-10-20')];
    const plan = planDe(x);
    for (const s of plan.sesiones.filter((s) => s.fecha < '2026-10-20' && s.tipo !== 'carrera').slice(-9)) {
      x.hyrox.registros[s.id] = { estado: 'completa', rpe: 7, duracion: s.duracion, fecha: s.fecha, fechaRegistro: s.fecha,
        series: s.ejercicios?.length ? Object.fromEntries(s.ejercicios.slice(0, 3).map((ej, i) => [ej.id, [{ kg: 40 + i * 10, reps: 8 }, { kg: 42 + i * 10, reps: 8 }]])) : undefined };
    }
  });
  await new Promise((r) => setTimeout(r, 400));`);

// ── Capturas ─────────────────────────────────────────────────────────────
const hechas = [];
async function foto(nombre, trozos = 1) {
  if (FILTRO && !nombre.startsWith(FILTRO)) return;
  await espera(700);
  const enHoja = await js(`return !!document.querySelector('.hoja-cuerpo');`);
  const alto = await js(`const h = document.querySelector('.hoja-cuerpo'); return h ? h.scrollHeight : document.documentElement.scrollHeight;`);
  const total = Math.min(trozos, Math.max(1, Math.ceil(alto / 760)));
  for (let i = 0; i < total; i++) {
    await js(enHoja ? `document.querySelector('.hoja-cuerpo').scrollTo(0, ${i * 700});` : `window.scrollTo(0, ${i * 760});`);
    await espera(350);
    const r = await cdp('Page.captureScreenshot', { format: 'png' });
    const fichero = `${nombre}${total > 1 ? `-${i + 1}` : ''}.png`;
    fs.writeFileSync(path.join(SALIDA, fichero), Buffer.from(r.result.data, 'base64'));
    hechas.push(fichero);
  }
  await js(`window.scrollTo(0, 0);`);
}
const ir = (h) => js(`location.hash = '${h}'; await new Promise((r) => setTimeout(r, 400)); window.scrollTo(0, 0);`);
const hoja = (tipo, props) => js(`(await import('/src/stores/ui.js')).abrirHoja('${tipo}', ${props}); await new Promise((r) => setTimeout(r, 800));`);
const cerrar = () => js(`(await import('/src/stores/ui.js')).cerrarHoja(); await new Promise((r) => setTimeout(r, 400));`);
const pestaña = (texto) => js(`[...document.querySelectorAll('[role=tab]')].find((b) => b.textContent.trim().startsWith('${texto}'))?.click(); await new Promise((r) => setTimeout(r, 500));`);
const PLAN = `(await import('/src/lib/hyrox/index.js')).planDe(JSON.parse(localStorage.getItem('mi-nutricionista:v1')))`;

await ir('#hoy'); await foto('hoy', 4);
await ir('#entreno'); await foto('entreno-semana', 3);
await pestaña('Plan'); await foto('entreno-plan', 3);
await pestaña('Carrera'); await foto('entreno-carrera', 2);
await pestaña('Estaciones'); await foto('entreno-estaciones', 2);
await ir('#comida'); await foto('comida-semana', 3);
await pestaña('Recetas'); await foto('comida-recetas', 2);
await pestaña('Compra'); await foto('comida-compra', 2);
await pestaña('Batch'); await foto('comida-batch', 2);
await ir('#progreso'); await foto('progreso-resumen', 2);
await pestaña('Entreno'); await foto('progreso-entreno', 2);
await pestaña('Peso'); await foto('progreso-peso', 3);
await js(`[...document.querySelectorAll('button')].find((b) => b.textContent.includes('Apuntar peso'))?.click(); await new Promise((r) => setTimeout(r, 400));`); await foto('progreso-peso-form', 1);
await ir('#ajustes'); await foto('ajustes', 3);
await ir('#hoy');
await hoja('registrar', `{ fecha: '2026-10-20', franja: 'merienda' }`); await foto('hoja-registrar', 2); await cerrar();
await hoja('receta', `(() => { const e = JSON.parse(localStorage.getItem('mi-nutricionista:v1')); const c = e.plan.dias[0].comidas[1]; return { recetaId: c.recetaId, ingredientes: c.ingredientes, titulo: c.hora + ' · Comida', diaIdx: 0, franja: c.franja }; })()`); await foto('hoja-receta', 2); await cerrar();
await hoja('alternativas', `{ diaIdx: 0, franja: 'cena' }`); await foto('hoja-alternativas', 1); await cerrar();
await js(`(await import('/src/stores/estado.js')).actualizar((x) => { x.despensa = { pechuga_pollo: { g: 800, fecha: '2026-10-18' }, arroz: { g: 900, fecha: '2026-10-18' }, merluza: { g: 400, fecha: '2026-10-19' } }; }); await new Promise((r) => setTimeout(r, 200));`);
await hoja('alternativas', `{ diaIdx: 0, franja: 'cena', nevera: true }`); await foto('hoja-nevera', 1); await cerrar();
await hoja('sesion', `{ id: ${PLAN}.sesiones.find((s) => s.fecha >= '2026-10-20').id }`); await foto('hoja-sesion', 2); await cerrar();
await hoja('registrarSesion', `{ id: ${PLAN}.sesiones.find((s) => s.fecha >= '2026-10-20' && s.ejercicios?.length).id, entreno: true }`); await foto('hoja-entreno', 2); await cerrar();
await hoja('estacion', `{ id: 'push' }`); await foto('hoja-estacion', 1); await cerrar();
await hoja('guiaFuera', `{ sitio: 'asiatico' }`); await foto('hoja-guia-fuera', 2); await cerrar();
await hoja('informe', '{}'); await foto('hoja-informe', 3); await cerrar();
await hoja('camara', `{ pose: 'frente' }`); await foto('hoja-camara', 1); await cerrar();

// Día cerrado: todas las comidas de hoy hechas (al final, porque cambia los datos)
await cerrar();
await js(`const st = await import('/src/stores/estado.js'); const e = JSON.parse(localStorage.getItem('mi-nutricionista:v1'));
  const d = e.plan.dias.find((x) => x.fecha === '2026-10-20');
  st.actualizar((x) => { x.registros['2026-10-20'] = d.comidas.map((c) => st.registroDePlan(c, '2026-10-20')); x.tomas = { '2026-10-20': { creatina: true } }; });
  await new Promise((r) => setTimeout(r, 300));`);
await ir('#hoy'); await foto('hoy-cerrado', 3);

// ── Comparación con la base (en el propio navegador, con un canvas) ───────
let cambiadas = [];
if (!BASE) {
  const dirBase = path.join(DIR, 'base');
  const dirDif = path.join(DIR, 'diferencias');
  fs.rmSync(dirDif, { recursive: true, force: true });
  fs.mkdirSync(dirDif, { recursive: true });
  if (!fs.existsSync(dirBase)) throw new Error('Aún no hay capturas de base: ejecuta primero «node scripts/pantallas.mjs base»');
  await cdp('Page.navigate', { url: 'about:blank' });
  await espera(300);
  for (const f of hechas) {
    const fb = path.join(dirBase, f);
    if (!fs.existsSync(fb)) { cambiadas.push({ f, nueva: true }); continue; }
    const a = fs.readFileSync(fb).toString('base64');
    const b = fs.readFileSync(path.join(SALIDA, f)).toString('base64');
    const r = await js(`
      const carga = (d) => new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.src = 'data:image/png;base64,' + d; });
      const [ia, ib] = await Promise.all([carga('${a}'), carga('${b}')]);
      const w = Math.max(ia.width, ib.width), h = Math.max(ia.height, ib.height);
      const lienzo = (img) => { const c = new OffscreenCanvas(w, h); const x = c.getContext('2d'); x.drawImage(img, 0, 0); return x.getImageData(0, 0, w, h).data; };
      const da = lienzo(ia), db = lienzo(ib);
      const c = new OffscreenCanvas(w, h); const x = c.getContext('2d'); x.drawImage(ib, 0, 0); x.globalAlpha = 0.35; x.fillStyle = '#000'; x.fillRect(0, 0, w, h); x.globalAlpha = 1;
      const out = x.getImageData(0, 0, w, h); let dif = 0;
      for (let i = 0; i < da.length; i += 4) {
        if (Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) + Math.abs(da[i + 2] - db[i + 2]) > 30) { dif++; out.data[i] = 255; out.data[i + 1] = 40; out.data[i + 2] = 40; out.data[i + 3] = 255; }
      }
      x.putImageData(out, 0, 0);
      const blob = await c.convertToBlob({ type: 'image/png' });
      const buf = new Uint8Array(await blob.arrayBuffer()); let s = ''; for (let i = 0; i < buf.length; i += 8192) s += String.fromCharCode(...buf.subarray(i, i + 8192));
      return { ratio: dif / (w * h), png: btoa(s) };`);
    if (r.ratio > UMBRAL) {
      fs.writeFileSync(path.join(dirDif, f), Buffer.from(r.png, 'base64'));
      cambiadas.push({ f, ratio: r.ratio });
    }
  }
  const filas = cambiadas.map((c) => `<section><h2>${c.f} · ${c.nueva ? 'nueva' : `${(c.ratio * 100).toFixed(2)} % distinto`}</h2><div>${c.nueva ? '' : `<figure><img src="base/${c.f}"><figcaption>Antes</figcaption></figure>`}<figure><img src="actual/${c.f}"><figcaption>Ahora</figcaption></figure>${c.nueva ? '' : `<figure><img src="diferencias/${c.f}"><figcaption>Diferencias</figcaption></figure>`}</div></section>`).join('');
  fs.writeFileSync(path.join(DIR, 'informe.html'), `<!doctype html><meta charset="utf-8"><title>Pantallas</title><style>body{font:14px system-ui;background:#111;color:#eee;margin:20px}section{margin-bottom:32px}div{display:flex;gap:12px;flex-wrap:wrap}img{width:300px;border-radius:8px}figure{margin:0}</style><h1>${cambiadas.length ? `${cambiadas.length} pantallas han cambiado` : 'Todo igual'}</h1>${filas}`);
}

ws.close();
const cerrado = new Promise((r) => nav.once('exit', r));
nav.kill();
await Promise.race([cerrado, espera(5000)]);
await servidor.close();
try { fs.rmSync(perfil, { recursive: true, force: true, maxRetries: 8, retryDelay: 400 }); } catch { /* Edge aún suelta el perfil: lo limpia Windows */ }
if (BASE) console.log(`${hechas.length} capturas de base en pantallas/base/`);
else {
  console.log(`${hechas.length} capturas comparadas: ${cambiadas.length ? `${cambiadas.length} han cambiado → pantallas/informe.html` : 'todo igual'}`);
  for (const c of cambiadas) console.log(`  ${c.nueva ? '+' : '≠'} ${c.f}${c.ratio ? ` (${(c.ratio * 100).toFixed(2)} %)` : ''}`);
  process.exitCode = cambiadas.length ? 1 : 0;
}
