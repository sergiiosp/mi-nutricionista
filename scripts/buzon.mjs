// Buzón de Pulso desde el ordenador: lee las notas que Sergio manda desde la app y las contesta.
//
//   node scripts/buzon.mjs                     → notas pendientes con su contexto (las nuevas pasan a «vista»)
//   node scripts/buzon.mjs --todas             → también las hechas y las descartadas
//   node scripts/buzon.mjs --aviso             → una línea si hay notas nuevas (aviso al empezar cada sesión)
//   node scripts/buzon.mjs estado <id> <vista|enmarcha|hecha|descartada> ["respuesta"]
//   node scripts/buzon.mjs nuevo-movil         → desliga el buzón del móvil (si cambia de móvil o borra los datos)
//   …con --local, contra la base de datos de `wrangler dev` (pruebas)
//
// Usa el wrangler de servidor/ con tu sesión de Cloudflare: las notas no salen de tu cuenta. Las capturas
// se guardan en buzon/ (fuera de git). Nada se cambia en la app sin el visto bueno de Sergio.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SERVIDOR = path.join(RAIZ, 'servidor');
const WRANGLER = path.join(SERVIDOR, 'node_modules', 'wrangler', 'bin', 'wrangler.js');
const FOTOS = path.join(RAIZ, 'buzon');
const args = process.argv.slice(2);
const local = args.includes('--local');
const [orden, ...resto] = args.filter((a) => !a.startsWith('--'));
const ESTADOS = ['vista', 'enmarcha', 'hecha', 'descartada'];
const TIPO = { fallo: 'Fallo', idea: 'Idea', nocuadra: 'No me cuadra', pregunta: 'Pregunta', nota: 'Nota' };

function sql(consulta, timeout = 90_000) {
  const r = spawnSync(process.execPath, [WRANGLER, 'd1', 'execute', 'mi-nutricionista', local ? '--local' : '--remote', '--json', '--command', consulta],
    { cwd: SERVIDOR, encoding: 'utf8', timeout, maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) throw new Error((r.stderr || r.stdout || r.error?.message || 'wrangler falló').trim().split('\n').slice(-3).join(' '));
  const datos = JSON.parse(r.stdout.slice(r.stdout.indexOf('[')));
  return datos[0]?.results || [];
}
const txt = (v) => `'${String(v).replace(/'/g, "''")}'`;
const fecha = (ms) => new Date(ms).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

// ── Aviso al empezar una sesión: callado si no hay nada o si no hay conexión ──
if (args.includes('--aviso')) {
  try {
    const [{ n }] = sql("SELECT COUNT(*) AS n FROM buzon WHERE estado = 'enviada'", 25_000);
    if (n > 0) console.log(`Buzón de Pulso: ${n === 1 ? 'hay 1 nota nueva' : `hay ${n} notas nuevas`} de Sergio. Léelas con «node scripts/buzon.mjs», díselo y propón qué hacer: no cambies nada sin su visto bueno.`);
  } catch { /* sin conexión o sin sesión de Cloudflare */ }
  process.exit(0);
}

if (orden === 'estado') {
  const [id, estado, respuesta] = resto;
  if (!/^[\w-]{8,64}$/.test(id || '') || !ESTADOS.includes(estado)) {
    console.error(`Uso: node scripts/buzon.mjs estado <id> <${ESTADOS.join('|')}> ["respuesta"]`);
    process.exit(1);
  }
  sql(`UPDATE buzon SET estado = ${txt(estado)}, ${respuesta ? `respuesta = ${txt(respuesta)}, ` : ''}actualizada = ${Date.now()} WHERE id = ${txt(id)}`);
  console.log(`✓ ${id} → ${estado}${respuesta ? `: «${respuesta}»` : ''}`);
  process.exit(0);
}

if (orden === 'nuevo-movil') {
  sql("DELETE FROM ajustes WHERE clave = 'buzon_dueno'");
  console.log('✓ Buzón desligado: el próximo móvil que escriba se lo queda.');
  process.exit(0);
}

// ── Lista de notas ──
const todas = args.includes('--todas');
const notas = sql(`SELECT id, creada, tipo, tema, texto, contexto, estado, respuesta, foto IS NOT NULL AS conFoto FROM buzon ${todas ? '' : "WHERE estado IN ('enviada', 'vista', 'enmarcha') "}ORDER BY creada`);
if (!notas.length) {
  console.log(todas ? 'El buzón está vacío.' : 'No hay notas pendientes en el buzón.');
  process.exit(0);
}
fs.mkdirSync(FOTOS, { recursive: true });
notas.forEach((n, i) => {
  console.log(`\n── ${i + 1}. ${TIPO[n.tipo] || n.tipo} · ${n.tema} · ${fecha(n.creada)} · ${n.estado} · id ${n.id}`);
  console.log(n.texto);
  if (n.respuesta) console.log(`  Respuesta: ${n.respuesta}`);
  if (n.contexto) console.log(`  Contexto: ${JSON.stringify(JSON.parse(n.contexto), null, 2).replace(/\n/g, '\n  ')}`);
  if (n.conFoto) {
    const archivo = path.join(FOTOS, `${new Date(n.creada).toISOString().slice(0, 10)}-${n.id}.jpg`);
    if (!fs.existsSync(archivo)) {
      const [{ foto }] = sql(`SELECT foto FROM buzon WHERE id = ${txt(n.id)}`);
      fs.writeFileSync(archivo, Buffer.from(foto.slice(foto.indexOf(',') + 1), 'base64'));
    }
    console.log(`  Captura: ${path.relative(RAIZ, archivo)}`);
  }
});
const nuevas = notas.filter((n) => n.estado === 'enviada').map((n) => txt(n.id));
if (nuevas.length) sql(`UPDATE buzon SET estado = 'vista', actualizada = ${Date.now()} WHERE id IN (${nuevas.join(', ')})`);
console.log(`\n${notas.length} ${notas.length === 1 ? 'nota' : 'notas'}${nuevas.length ? ` (${nuevas.length} ${nuevas.length === 1 ? 'nueva, ya marcada como vista' : 'nuevas, ya marcadas como vistas'})` : ''}.`);
