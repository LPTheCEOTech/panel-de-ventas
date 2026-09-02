/**
 * Administración de usuarios por la Admin API. Es la ÚNICA forma de crear un
 * usuario: no hay registro abierto.
 *
 *   npm run usuario -- listar
 *   npm run usuario -- crear    correo@ejemplo.com "una contraseña larga"
 *   npm run usuario -- resetear correo@ejemplo.com "otra contraseña larga"
 *   npm run usuario -- borrar   correo@ejemplo.com
 *
 * 🔴 `email_confirm: true` en el alta: marca el correo como confirmado SIN
 * mandar nada. No hay SMTP ni dominio verificado — quien espere un correo de
 * confirmación que no existe no puede entrar nunca, y el error que ve dice
 * "Email not confirmed", que no explica eso.
 */
import { conectar, morir } from './comun.mjs'

const MINIMO = 12
const [comando, ...resto] = process.argv.slice(2)

const AYUDA = `
Uso:
  npm run usuario -- listar
  npm run usuario -- crear    <correo> <contraseña>
  npm run usuario -- resetear <correo> <contraseña>
  npm run usuario -- borrar   <correo>

La contraseña necesita al menos ${MINIMO} caracteres.
`

const sb = await conectar()

/** La Admin API no tiene "buscar por correo": se lista y se filtra. Con un
 *  puñado de usuarios alcanza de sobra. */
async function todos() {
  const { data, error } = await sb.auth.admin.listUsers({ perPage: 1000 })
  if (error) morir(`No se pudo listar: ${error.message}`)
  return data.users
}

const buscar = async (correo) =>
  (await todos()).find((u) => u.email?.toLowerCase() === correo.toLowerCase())

function validar(c) {
  if (!c || c.length < MINIMO) {
    morir(`La contraseña necesita al menos ${MINIMO} caracteres. Llegaron ${c?.length ?? 0}.`)
  }
}

switch (comando) {
  case 'listar': {
    const us = await todos()
    if (us.length === 0) {
      console.log('\nNo hay usuarios. `npm run usuario -- crear <correo> "<contraseña>"`\n')
      break
    }
    console.table(us.map((u) => ({
      correo: u.email,
      confirmado: Boolean(u.email_confirmed_at),
      creado: u.created_at?.slice(0, 10),
      'último acceso': u.last_sign_in_at?.slice(0, 10) ?? '—',
    })))
    console.log(`\n${us.length} usuario(s).\n`)
    break
  }
  case 'crear': {
    const [correo, contrasena] = resto
    if (!correo) morir('Falta el correo.' + AYUDA)
    validar(contrasena)
    if (await buscar(correo)) {
      morir(`Ya existe ${correo}. Para cambiarle la contraseña: npm run usuario -- resetear ${correo} "<contraseña>"`)
    }
    const { error } = await sb.auth.admin.createUser({ email: correo, password: contrasena, email_confirm: true })
    if (error) morir(`No se pudo crear: ${error.message}`)
    console.log(`\n✅ Creado ${correo}, confirmado y sin mandar un solo correo.\n`)
    break
  }
  case 'resetear': {
    const [correo, contrasena] = resto
    if (!correo) morir('Falta el correo.' + AYUDA)
    validar(contrasena)
    const u = await buscar(correo)
    if (!u) morir(`No existe ${correo}. \`npm run usuario -- listar\` para ver quién hay.`)
    const { error } = await sb.auth.admin.updateUserById(u.id, { password: contrasena })
    if (error) morir(`No se pudo resetear: ${error.message}`)
    console.log(`\n✅ Contraseña nueva para ${correo}.\n`)
    break
  }
  case 'borrar': {
    const [correo] = resto
    if (!correo) morir('Falta el correo.' + AYUDA)
    const u = await buscar(correo)
    if (!u) morir(`No existe ${correo}.`)
    const { error } = await sb.auth.admin.deleteUser(u.id)
    if (error) morir(`No se pudo borrar: ${error.message}`)
    console.log(`\n✅ Borrado ${correo}.\n`)
    break
  }
  default:
    console.log(AYUDA)
    process.exit(comando ? 1 : 0)
}
