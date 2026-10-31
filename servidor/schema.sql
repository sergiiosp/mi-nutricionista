-- Tablas del servidor (Cloudflare D1). Los datos de la app llegan cifrados: el servidor no puede leerlos.
CREATE TABLE IF NOT EXISTS cuentas (id TEXT PRIMARY KEY, rev INTEGER NOT NULL DEFAULT 0, datos BLOB, tam INTEGER, actualizado INTEGER, creado INTEGER);
CREATE TABLE IF NOT EXISTS copias (cuenta TEXT NOT NULL, fecha TEXT NOT NULL, rev INTEGER, datos BLOB, tam INTEGER, PRIMARY KEY (cuenta, fecha));
CREATE TABLE IF NOT EXISTS emparejamientos (codigo TEXT PRIMARY KEY, sobre TEXT NOT NULL, expira INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS suscripciones (endpoint TEXT PRIMARY KEY, cuenta TEXT NOT NULL, datos TEXT NOT NULL, creado INTEGER);
CREATE TABLE IF NOT EXISTS avisos (endpoint TEXT NOT NULL, t INTEGER NOT NULL, titulo TEXT, cuerpo TEXT, url TEXT, etiqueta TEXT);
CREATE INDEX IF NOT EXISTS avisos_t ON avisos (t);
CREATE INDEX IF NOT EXISTS avisos_endpoint ON avisos (endpoint);
CREATE TABLE IF NOT EXISTS ajustes (clave TEXT PRIMARY KEY, valor TEXT NOT NULL);
-- Buzón: notas desde la app (sin cifrar, para poder leerlas y contestarlas desde el ordenador)
CREATE TABLE IF NOT EXISTS buzon (id TEXT PRIMARY KEY, creada INTEGER NOT NULL, tipo TEXT, tema TEXT, texto TEXT NOT NULL, contexto TEXT, foto TEXT, estado TEXT NOT NULL DEFAULT 'enviada', respuesta TEXT, actualizada INTEGER);
CREATE INDEX IF NOT EXISTS buzon_creada ON buzon (creada);
