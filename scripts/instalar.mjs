/**
 * EL INSTALADOR. Un solo comando, contra una base vacía:
 *
 *   npm run instalar
 *
 * Aplica el esquema, pregunta lo que hace que el panel sea TUYO, y crea el
 * primer y único usuario.
 *
 * 🔴 NO planta ni una persona ni un reporte. Una instalación nueva arranca
 * vacía a propósito: si trajera datos de ejemplo, el primer día verías los
 * vendedores de otro y no sabrías cuáles borrar.
 *
 * 🔴 Es idempotente: correrlo dos veces no duplica nada ni pisa lo que cargaste.
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createInterface } from 'node:readline'
import pg from 'pg'

import { conectar, morir, preguntar } from './comun.mjs'

const RAIZ = dirname(dirname(fileURLToPath(import.meta.url)))
const MIGRACIONES = ['001_esquema.sql', '002_permisos.sql']
const MINIMO_CONTRASENA = 12

console.log('\n📦 Instalador del Panel de Ventas\n')

// ---------- 1. las variables tienen que RESPONDER, no solo existir ----------
const sb = await conectar()
console.log('✅ Supabase responde.')

// ---------- 2. el esquema ----------
// Se aplica por conexión directa: la API REST de Supabase no ejecuta DDL.
const cadena = process.env.SUPABASE_DB_URL
if (!cadena) {
  console.log(
    '\n⚠️  Falta SUPABASE_DB_URL (la cadena de conexión de Postgres).\n' +
      '   Está en Supabase → Project Settings → Database → Connection string (URI).\n' +
      '   Sin ella no puedo crear las tablas solo. Podés pegar estos dos archivos\n' +
      '   en el SQL Editor de Supabase y volver a correr el instalador:\n'
  )
  for (const m of MIGRACIONES) console.log(`      supabase/migraciones/${m}`)
  console.log('')
} else {
  const cliente = new pg.Client({ connectionString: cadena, ssl: { rejectUnauthorized: false } })
  await cliente.connect().catch((e) => morir(`No pude conectar a Postgres: ${e.message}`))
  for (const m of MIGRACIONES) {
    const sql = readFileSync(join(RAIZ, 'supabase', 'migraciones', m), 'utf8')
    // las migraciones usan `if not exists` en todo: correrlas de nuevo no rompe
    await cliente.query(sql).catch((e) => morir(`Falló ${m}: ${e.message}`))
    console.log(`✅ ${m}`)
  }
  await cliente.end()
}

// ---------- 3. la configuración ----------
const { data: yaHay } = await sb.from('configuracion').select('id').eq('id', 1).maybeSingle()

const rl = createInterface({ input: process.stdin, output: process.stdout })

if (yaHay) {
  console.log('\n✅ Ya había configuración. No se toca (el instalador no pisa lo que cargaste).')
} else {
  console.log('\nAhora lo que hace que el panel sea tuyo. Enter para dejar lo de la izquierda.\n')
  const nombreNegocio = await preguntar(rl, 'Nombre del panel', 'Mi Panel de Ventas')
  const iniciales = (await preguntar(rl, 'Dos letras para el logo', nombreNegocio.slice(0, 2).toUpperCase())).slice(0, 2).toUpperCase()
  const usuarioNombre = await preguntar(rl, 'Tu nombre', 'Yo')
  const marca = await preguntar(rl, 'Color de tu marca (#RRGGBB)', '#00D97E')
  const simbolo = await preguntar(rl, 'Símbolo de la moneda', '$')
  const moneda = await preguntar(rl, 'Código de la moneda', 'USD')
  const zonaHoraria = await preguntar(rl, 'Zona horaria', 'America/New_York')
  const inicioSemana = (await preguntar(rl, '¿La semana empieza el lunes? (s/n)', 's')).toLowerCase().startsWith('s') ? 1 : 0

  if (!/^#[0-9a-fA-F]{6}$/.test(marca)) morir(`"${marca}" no es un color #RRGGBB.`)
  try { new Intl.DateTimeFormat('en-CA', { timeZone: zonaHoraria }) }
  catch { morir(`"${zonaHoraria}" no es una zona horaria válida. Ej: America/New_York`) }

  const { error } = await sb.from('configuracion').insert({
    id: 1, nombre_negocio: nombreNegocio, iniciales, usuario_nombre: usuarioNombre,
    marca, moneda, simbolo, zona_horaria: zonaHoraria, inicio_semana: inicioSemana,
  })
  if (error) morir(`No se pudo guardar la configuración: ${error.message}`)
  console.log('\n✅ Configuración guardada.')
}

// ---------- 4. el usuario ----------
const { data: usuarios, error: errUsuarios } = await sb.auth.admin.listUsers({ perPage: 1000 })
if (errUsuarios) morir(`No se pudo consultar los usuarios: ${errUsuarios.message}`)

if (usuarios.users.length > 0) {
  console.log(`✅ Ya hay ${usuarios.users.length} usuario(s). No se crea otro.`)
} else {
  console.log('\nY el usuario con el que vas a entrar.\n')
  const correo = await preguntar(rl, 'Tu correo')
  if (!correo.includes('@')) morir('Eso no parece un correo.')
  const contrasena = await preguntar(rl, `Contraseña (mínimo ${MINIMO_CONTRASENA})`)
  if (contrasena.length < MINIMO_CONTRASENA) morir(`La contraseña necesita al menos ${MINIMO_CONTRASENA} caracteres.`)

  const { error } = await sb.auth.admin.createUser({ email: correo, password: contrasena, email_confirm: true })
  if (error) morir(`No se pudo crear el usuario: ${error.message}`)
  console.log(`\n✅ Usuario ${correo} creado y confirmado (sin mandar ningún correo).`)
}

rl.close()

console.log(`
────────────────────────────────────────────────
🎉 Listo.

   1. npm run dev  →  http://localhost:3110
   2. Entrá con tu correo y contraseña
   3. Andá a Equipo y cargá a tus setters y closers

El panel va a estar vacío hasta que alguien mande su primer reporte de
fin de día. Es así a propósito: no trae datos de ejemplo de nadie.
────────────────────────────────────────────────
`)
