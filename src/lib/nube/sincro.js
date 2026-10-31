// Sincronización entre dispositivos: cada parte del estado lleva la hora de su último cambio
// y al juntar dos versiones gana la más reciente, parte a parte (un día de registros, una sesión…).
import { writable, get } from 'svelte/store';
import { estado, VACIO } from '../../stores/estado.js';
import { hoyISO } from '../planificador.js';
import { SERVIDOR } from './config.js';
import { derivar, cifrar, descifrar, nuevaClave, claveValida, nuevoCodigo, sobreDeCodigo, abrirSobre, idDeCodigo, limpiarCodigo } from './cripto.js';

const META = 'mi-nutricionista:nube';
const MAPAS = ['registros', 'saltadas', 'productos']; // se sincronizan clave a clave
const MAPAS_HYROX = ['registros', 'movidas'];
const LOCALES = ['fotosProgreso', 'version']; // las fotos viven solo en cada dispositivo
const DIA = 86400000;

// ── Estado plano: { ruta: valor } ────────────────────────────────────────

export function aplanar(e) {
  const p = {};
  for (const [k, v] of Object.entries(e)) {
    if (LOCALES.includes(k) || v === undefined) continue;
    if (MAPAS.includes(k)) {
      for (const [s, x] of Object.entries(v || {})) p[`${k}/${s}`] = x;
    } else if (k === 'hyrox') {
      if (!v) continue;
      for (const [s, x] of Object.entries(v)) {
        if (MAPAS_HYROX.includes(s)) for (const [i, y] of Object.entries(x || {})) p[`hyrox/${s}/${i}`] = y;
        else p[`hyrox/${s}`] = x;
      }
    } else p[k] = v;
  }
  return p;
}

export function desaplanar(p, base = null) {
  const e = VACIO();
  for (const k of LOCALES) if (base && k in base) e[k] = base[k];
  for (const k of MAPAS) e[k] = {};
  const hy = { registros: {}, movidas: {} };
  for (const [ruta, v] of Object.entries(p)) {
    const i = ruta.indexOf('/');
    if (i < 0) { e[ruta] = v; continue; }
    const k = ruta.slice(0, i);
    const resto = ruta.slice(i + 1);
    if (k === 'hyrox') {
      const j = resto.indexOf('/');
      if (j < 0) hy[resto] = v;
      else (hy[resto.slice(0, j)] ||= {})[resto.slice(j + 1)] = v;
    } else (e[k] ||= {})[resto] = v;
  }
  e.hyrox = hy.config ? hy : null;
  e.version = 2;
  return e;
}

/** Junta dos versiones { p, t }: por cada ruta gana la de cambio más reciente (los borrados también cuentan). */
export function fusionar(local, remoto, ahora = Date.now()) {
  const p = {};
  const t = {};
  let cambiaLocal = false;
  let cambiaRemoto = false;
  const rutas = new Set([...Object.keys(local.p), ...Object.keys(remoto.p), ...Object.keys(local.t), ...Object.keys(remoto.t)]);
  for (const r of rutas) {
    const tl = local.t[r] || 0;
    const tr = remoto.t[r] || 0;
    const enL = r in local.p;
    const enR = r in remoto.p;
    const ganaRemoto = tr > tl || (tr === tl && (tr > 0 || !enL));
    const [en, v, ts] = ganaRemoto ? [enR, remoto.p[r], tr] : [enL, local.p[r], tl];
    if (en) p[r] = v;
    // Los borrados se recuerdan 90 días para que no "resuciten" desde otro dispositivo
    if (ts && (en || ts > ahora - 90 * DIA)) t[r] = ts;
    const j = en ? JSON.stringify(v) : undefined;
    if (j !== (enL ? JSON.stringify(local.p[r]) : undefined)) cambiaLocal = true;
    if (j !== (enR ? JSON.stringify(remoto.p[r]) : undefined) || (t[r] || 0) !== tr) cambiaRemoto = true;
  }
  return { p, t, cambiaLocal, cambiaRemoto };
}

// ── Metadatos de este dispositivo ─────────────────────────────────────────

function leerMeta() {
  try { return JSON.parse(localStorage.getItem(META)) || {}; } catch { return {}; }
}
export const meta = { clave: null, rev: -1, t: {}, sucio: false, ultima: null, ...leerMeta() };
export function guardarMeta() {
  try { localStorage.setItem(META, JSON.stringify(meta)); } catch { /* sin almacenamiento */ }
}

/** Para la interfaz: activa, estado ('ok' | 'sincronizando' | 'error' | 'sin-conexion'), última vez y error. */
export const nube = writable({ activa: claveValida(meta.clave), estado: 'ok', ultima: meta.ultima, error: '' });
const ponerNube = (x) => nube.update((n) => ({ ...n, ...x }));

let ctx = null;
async function contexto() {
  if (!ctx) ctx = await derivar(meta.clave);
  return ctx;
}

const sinConexion = (e) => (e instanceof TypeError ? new Error('No se puede conectar con el servidor') : e);

export async function api(ruta, opciones = {}) {
  const { token } = await contexto();
  try {
    return await fetch(SERVIDOR + ruta, { ...opciones, headers: { Authorization: `Bearer ${token}`, ...(opciones.headers || {}) } });
  } catch (e) { throw sinConexion(e); }
}
export async function apiJSON(ruta, opciones = {}) {
  const { cuerpo, ...resto } = opciones;
  const r = await api(ruta, cuerpo ? { ...resto, method: resto.method || 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) } : resto);
  const datos = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(datos.error || `El servidor respondió ${r.status}`), { status: r.status });
  return datos;
}

// ── Detección de cambios locales ─────────────────────────────────────────

let huellas = new Map();
let versionLocal = 0;
let tDetectar;
let tSubir;

const huellasDe = (p) => new Map(Object.entries(p).map(([k, v]) => [k, JSON.stringify(v)]));

function detectarAhora() {
  clearTimeout(tDetectar);
  if (!meta.clave) return;
  const nuevas = huellasDe(aplanar(get(estado)));
  const ahora = Date.now();
  let cambios = false;
  for (const [k, j] of nuevas) if (huellas.get(k) !== j) { meta.t[k] = ahora; cambios = true; }
  for (const k of huellas.keys()) if (!nuevas.has(k)) { meta.t[k] = ahora; cambios = true; }
  huellas = nuevas;
  if (cambios) {
    versionLocal++;
    meta.sucio = true;
    guardarMeta();
    clearTimeout(tSubir);
    tSubir = setTimeout(sincronizar, 3000);
  }
}

function aplicar(p) {
  const nuevo = desaplanar(p, get(estado));
  huellas = huellasDe(aplanar(nuevo));
  estado.set(nuevo);
}

// ── Ciclo de sincronización ──────────────────────────────────────────────

let enCurso = null;
export function sincronizar() {
  if (!meta.clave) return Promise.resolve();
  enCurso ||= ciclo().finally(() => { enCurso = null; });
  return enCurso;
}

async function ciclo() {
  if (!navigator.onLine) return ponerNube({ estado: 'sin-conexion' });
  ponerNube({ estado: 'sincronizando' });
  try {
    const { llave } = await contexto();
    for (let intento = 0; intento < 4; intento++) {
      detectarAhora();
      const r = await api(`/datos?desde=${meta.rev}`);
      if (r.status === 401 || r.status === 404) {
        desvincular();
        throw new Error('La cuenta ya no existe en el servidor: este dispositivo se ha desvinculado.');
      }
      if (!r.ok) throw new Error(`El servidor respondió ${r.status}`);
      const rev = Number(r.headers.get('X-Rev'));
      if (r.status === 200) {
        const remoto = await descifrar(llave, await r.arrayBuffer());
        const m = fusionar({ p: aplanar(get(estado)), t: meta.t }, remoto);
        if (m.cambiaLocal) aplicar(m.p);
        meta.t = m.t;
        meta.sucio = m.cambiaRemoto;
      }
      meta.rev = rev;
      guardarMeta();
      if (!meta.sucio) break;

      detectarAhora();
      const v = versionLocal;
      const cuerpo = await cifrar(llave, { v: 1, p: aplanar(get(estado)), t: meta.t });
      const put = await api('/datos', { method: 'PUT', headers: { 'X-Base': String(meta.rev), 'X-Fecha': hoyISO(), 'Content-Type': 'application/octet-stream' }, body: cuerpo });
      if (put.status === 409) continue; // otro dispositivo subió algo justo antes: se vuelve a juntar
      if (!put.ok) throw new Error((await put.json().catch(() => ({}))).error || `El servidor respondió ${put.status}`);
      meta.rev = (await put.json()).rev;
      if (versionLocal === v) meta.sucio = false;
      guardarMeta();
      break;
    }
    meta.ultima = Date.now();
    guardarMeta();
    ponerNube({ estado: 'ok', ultima: meta.ultima, error: '' });
  } catch (e) {
    ponerNube({ estado: navigator.onLine ? 'error' : 'sin-conexion', error: e.message });
  }
}

// ── Arranque ─────────────────────────────────────────────────────────────

let arrancada = false;
let desuscribir = null;
let reloj = null;

function arrancar() {
  if (!meta.clave || arrancada) return;
  arrancada = true;
  huellas = huellasDe(aplanar(get(estado)));
  let primera = true;
  desuscribir = estado.subscribe(() => {
    if (primera) { primera = false; return; }
    clearTimeout(tDetectar);
    tDetectar = setTimeout(detectarAhora, 400);
  });
  reloj = setInterval(() => { if (document.visibilityState === 'visible') sincronizar(); }, 60_000);
  sincronizar();
}

/** Se llama una vez al abrir la app. */
export function iniciarNube() {
  document.addEventListener('visibilitychange', () => {
    if (!meta.clave) return;
    if (document.visibilityState === 'visible' || meta.sucio) sincronizar();
  });
  window.addEventListener('online', () => sincronizar());
  arrancar();
}

// ── Cuenta y dispositivos ────────────────────────────────────────────────

/** Activa la nube en este dispositivo con una cuenta nueva y sube tus datos. */
export async function crearCuenta() {
  Object.assign(meta, { clave: nuevaClave(), rev: -1, t: {}, sucio: true, ultima: null, recuperacion: null });
  ctx = null;
  try {
    await apiJSON('/cuenta', { cuerpo: {} });
  } catch (e) {
    meta.clave = null;
    ctx = null;
    throw e;
  }
  guardarMeta();
  ponerNube({ activa: true });
  arrancar();
  await sincronizar();
}

/** Usa la cuenta de otro dispositivo: los datos del servidor sustituyen a los de este. */
export async function unirse(clave) {
  if (!claveValida(clave)) throw new Error('El código QR no es válido');
  const previa = { ...meta };
  Object.assign(meta, { clave, rev: -1, t: {}, sucio: false, ultima: null });
  ctx = null;
  try {
    const r = await api('/datos?desde=-1');
    if (r.status === 401 || r.status === 404) throw new Error('No encuentro esa cuenta en el servidor');
    if (!r.ok) throw new Error(`El servidor respondió ${r.status}`);
    if (r.status === 200) {
      const remoto = await descifrar((await contexto()).llave, await r.arrayBuffer());
      aplicar(remoto.p);
      meta.t = remoto.t;
    } else meta.sucio = true; // cuenta vacía: se suben los datos de aquí
    meta.rev = Number(r.headers.get('X-Rev'));
  } catch (e) {
    Object.assign(meta, previa);
    ctx = null;
    throw e;
  }
  meta.ultima = Date.now();
  guardarMeta();
  ponerNube({ activa: true, estado: 'ok', ultima: meta.ultima, error: '' });
  arrancar();
  if (meta.sucio) await sincronizar();
}

/** Deja de sincronizar en este dispositivo (los datos locales se quedan). */
export function desvincular() {
  desuscribir?.();
  clearInterval(reloj);
  clearTimeout(tSubir);
  arrancada = false;
  Object.assign(meta, { clave: null, rev: -1, t: {}, sucio: false, ultima: null, recuperacion: null });
  ctx = null;
  guardarMeta();
  ponerNube({ activa: false, estado: 'ok', ultima: null, error: '' });
}

/** Borra todo del servidor (datos, copias y avisos) y desvincula este dispositivo. */
export async function borrarCuenta() {
  await apiJSON('/cuenta', { method: 'DELETE' });
  desvincular();
}

export const enlaceVincular = () => `${location.origin}${location.pathname}#vincular=${meta.clave}`;

/** Código de 8 letras para vincular un dispositivo sin cámara (válido 10 minutos, un solo uso). */
export async function crearCodigo() {
  const codigo = nuevoCodigo();
  const { id, sobre } = await sobreDeCodigo(codigo, meta.clave);
  const { expira } = await apiJSON('/emparejar', { cuerpo: { codigo: id, sobre } });
  return { codigo, expira };
}

export async function canjearCodigo(texto) {
  const codigo = limpiarCodigo(texto);
  if (codigo.length !== 8) throw new Error('El código tiene 8 letras y números');
  let r;
  try {
    r = await fetch(`${SERVIDOR}/emparejar/canjear`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ codigo: await idDeCodigo(codigo) }) });
  } catch (e) { throw sinConexion(e); }
  if (!r.ok) throw new Error('Código incorrecto o caducado: genera otro en tu otro dispositivo');
  await unirse(await abrirSobre(codigo, (await r.json()).sobre));
}

// ── Copias de seguridad ──────────────────────────────────────────────────

export const listarCopias = () => apiJSON('/copias');

/** Vuelve al estado de una copia diaria; el cambio se sincroniza al resto de dispositivos. */
export async function restaurarCopia(fecha) {
  const r = await api(`/copias/${fecha}`);
  if (!r.ok) throw new Error('No se pudo descargar la copia');
  const copia = await descifrar((await contexto()).llave, await r.arrayBuffer());
  const ahora = Date.now();
  const antes = aplanar(get(estado));
  aplicar(copia.p);
  for (const k of new Set([...Object.keys(antes), ...Object.keys(copia.p)])) meta.t[k] = ahora;
  meta.sucio = true;
  versionLocal++;
  guardarMeta();
  await sincronizar();
}
