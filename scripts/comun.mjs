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

  const sb = createClient(url, servicio, { auth: { persistSession: false, autoRefreshToken: false } })

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

export function preguntar(rl, texto, porDefecto) {
  return new Promise((resolver) => {
    rl.question(`${texto}${porDefecto ? ` [${porDefecto}]` : ''}: `, (r) => {
      resolver(r.trim() || porDefecto || '')
    })
  })
}
