/**
 * Lo que comparten los scripts: leer las variables, hablar con la base y
 * fallar de forma que se entienda qué pasó.
 */
import { createClient } from '@supabase/supabase-js'

export function morir(mensaje) {
  console.error(`\n🔴 ${mensaje}\n`)
  process.exit(1)
}

/**
 * 🔴 No alcanza con que las variables ESTÉN: tienen que RESPONDER.
 *
 * El fallo más caro que tuvimos fue una clave guardada con los caracteres del
 * valor enmascarado que muestra la pantalla de Vercel. La variable estaba, no
 * era vacía, y `fetch` no podía ni armar la cabecera. Comprobar la presencia
 * habría dado verde.
 */
export async function conectar() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const servicio = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !servicio) {
    morir(
      'Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.\n' +
        '   Copiá .env.local.example a .env.local y pegá los valores de tu proyecto de Supabase.\n' +
        '   Ojo: copialos con el botón Reveal/Copy, nunca seleccionando el texto con puntitos.'
    )
  }
  for (const [nombre, valor] of [['NEXT_PUBLIC_SUPABASE_URL', url], ['SUPABASE_SERVICE_ROLE_KEY', servicio]]) {
    // U+2022 es el punto del valor enmascarado. Si está, se copió lo que se ve.
    if (/[•·…]/.test(valor)) {
      morir(
        `${nombre} tiene caracteres del valor ENMASCARADO (los puntitos).\n` +
          '   Se copió lo que se ve en pantalla, no el valor. Borrala y pegala de nuevo\n' +
          '   con el botón Reveal/Copy.'
      )
    }
  }

  // 🔴 El mismo `transport` que la app: `createClient()` construye un
  // RealtimeClient en su constructor y Node 20 no trae `WebSocket` global, así
  // que sin esto TIRA al crear el cliente — antes de leer una sola fila, y
  // aunque nada de esto use Realtime. En Vercel no se ve (Node 24 sí lo trae).
  const SIN_REALTIME = class {
    constructor() {
      throw new Error('Estos scripts no usan Realtime.')
    }
  }
  const sb = createClient(url, servicio, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { transport: SIN_REALTIME },
  })

  const { error } = await sb.from('configuracion').select('id').limit(1)
  if (error && !/does not exist|schema cache/i.test(error.message)) {
    morir(
      `Las variables están pero Supabase no responde bien: ${error.message}\n` +
        '   Si el proyecto es del plan gratuito y estuvo una semana sin uso, puede estar\n' +
        '   PAUSADO: entrá al panel de Supabase y despertálo. Se comprueba desde afuera con\n' +
        `   dig +short ${new URL(url).hostname} @1.1.1.1`
    )
  }
  return sb
}

/**
 * El que hace las preguntas del instalador.
 *
 * 🔴 Hay DOS modos, y hace falta que sean dos.
 *
 * Con una persona escribiendo (una terminal de verdad), `readline` va bien.
 * Pero con la entrada por tubería —`printf ... | npm run instalar`, que es como
 * se prueba y como lo haría cualquier automatización— todas las líneas llegan
 * de golpe: `readline` emite un evento por cada una, y **las que llegan mientras
 * no hay ninguna pregunta esperando se pierden**. A partir de la tercera
 * pregunta nadie contesta, el `await` se queda colgado, y Node termina con
 * código 13 sin decir una palabra.
 *
 * El estado en el que deja eso es el peor posible: las tablas creadas y NADA de
 * configuración. Parece instalado y no lo está.
 *
 * Por eso, si la entrada no es una terminal, se lee ENTERA primero y las
 * respuestas se van sacando de una fila.
 */
export async function abrirPreguntas() {
  if (process.stdin.isTTY) {
    const { createInterface } = await import('node:readline/promises')
    const rl = createInterface({ input: process.stdin, output: process.stdout })
    return {
      preguntar: async (texto, porDefecto) => {
        const r = await rl.question(`${texto}${porDefecto ? ` [${porDefecto}]` : ''}: `)
        return r.trim() || porDefecto || ''
      },
      // en una terminal de verdad la contraseña ya no se ve reflejada de más:
      // la escribe la persona y no la imprime nadie
      cerrar: () => rl.close(),
    }
  }

  let crudo = ''
  for await (const trozo of process.stdin) crudo += trozo
  const fila = crudo.split('\n')
  return {
    // 🔴 `secreto` existe porque en este modo el eco lo imprime ESTE código.
    // Sin él, una contraseña tecleada por tubería queda escrita en la salida —
    // y de ahí a un log, a una captura o al historial de la terminal.
    preguntar: async (texto, porDefecto, secreto = false) => {
      const r = (fila.shift() ?? '').trim()
      const eco = secreto ? '••••••••' : r || porDefecto || ''
      console.log(`${texto}${porDefecto ? ` [${porDefecto}]` : ''}: ${eco}`)
      return r || porDefecto || ''
    },
    cerrar: () => {},
  }
}
