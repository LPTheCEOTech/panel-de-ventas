/**
 * Aplica las actualizaciones de base de datos desde el propio panel.
 *
 * El alumno no copia ni pega nada: el panel detecta lo que falta, le muestra
 * un aviso, y al apretar el botón llama a la función `aplicar_migracion` que
 * dejó instalada el SQL de instalación.
 *
 * 🔴 Solo servidor: usa la `service_role`, que es la única que puede llamar
 * a esa función.
 */
import 'server-only'

import { createClient } from '@supabase/supabase-js'

import { calcularPendientes, type Migracion } from './migraciones'

export type EstadoBase =
  /** Está todo al día. */
  | { estado: 'al-dia' }
  /** Faltan actualizaciones y el panel puede aplicarlas solo. */
  | { estado: 'pendientes'; migraciones: Migracion[] }
  /** La base es vieja: se instaló antes de que existiera el actualizador. */
  | { estado: 'sin-actualizador'; migraciones: Migracion[] }
  /** No hay Supabase configurado (modo demo local). */
  | { estado: 'sin-base' }

function cliente() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const clave = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !clave) return null
  return createClient(url, clave, { auth: { persistSession: false } })
}

/**
 * Qué le falta a esta base. Nunca tira: si algo sale mal, el panel tiene que
 * abrirse igual — un aviso de actualización jamás puede dejar a nadie afuera.
 */
export async function estadoDeLaBase(): Promise<EstadoBase> {
  const sb = cliente()
  if (!sb) return { estado: 'sin-base' }

  const { data, error } = await sb.from('migraciones_aplicadas').select('id')

  if (error) {
    // La tabla no existe → la base se instaló antes del actualizador.
    const pendientes = calcularPendientes([])
    if (pendientes.length === 0) return { estado: 'al-dia' }
    return { estado: 'sin-actualizador', migraciones: pendientes }
  }

  const pendientes = calcularPendientes((data ?? []).map((f) => f.id as string))
  return pendientes.length === 0 ? { estado: 'al-dia' } : { estado: 'pendientes', migraciones: pendientes }
}

export type ResultadoAplicar =
  | { ok: true; aplicadas: string[] }
  | { ok: false; error: string; enMigracion?: string }

/**
 * Aplica en orden las que falten. Se corta en la primera que falle: si la 010
 * depende de la 009, seguir sería peor que parar.
 */
export async function aplicarPendientes(): Promise<ResultadoAplicar> {
  const sb = cliente()
  if (!sb) return { ok: false, error: 'No hay base de datos configurada.' }

  const estado = await estadoDeLaBase()
  if (estado.estado === 'al-dia') return { ok: true, aplicadas: [] }
  if (estado.estado === 'sin-base') return { ok: false, error: 'No hay base de datos configurada.' }
  if (estado.estado === 'sin-actualizador') {
    return {
      ok: false,
      error: 'Tu base se instaló con una versión vieja del instalador y no tiene el actualizador. Volvé a correr el SQL de instalación una vez y este botón va a funcionar para siempre.',
    }
  }

  const aplicadas: string[] = []
  for (const m of estado.migraciones) {
    const { error } = await sb.rpc('aplicar_migracion', { id_migracion: m.id, sql_migracion: m.sql })
    if (error) {
      console.error('[migrador]', m.id, error.message)
      return { ok: false, error: error.message, enMigracion: m.id }
    }
    aplicadas.push(m.id)
  }
  return { ok: true, aplicadas }
}
