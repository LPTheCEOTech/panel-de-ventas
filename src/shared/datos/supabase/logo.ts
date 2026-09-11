import 'server-only'

import { clienteServidor } from './cliente'

/**
 * Subir/borrar el logo en el bucket público `logos` de Supabase Storage.
 *
 * 🔴 Bucket PÚBLICO. Un `<img>` en el navegador no puede autenticarse contra
 * Storage; requeriría URL firmada, complejidad enorme para algo que se ve a
 * cualquiera que abra el panel. Y el logo es exactamente eso: público.
 *
 * 🔴 Nombre del archivo con timestamp (`logo-<millis>.<ext>`) para bustear el
 * cache del navegador: si el usuario sube otro logo, la nueva URL cambia y
 * `<img>` la recarga sin que haya que forzar nada.
 */
const BUCKET = 'logos'

const EXT_POR_TIPO: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/svg+xml': 'svg',
  'image/webp': 'webp',
}

function sb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const servicio = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !servicio) {
    throw new Error('Falta NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el entorno.')
  }
  return clienteServidor(url, servicio)
}

export async function subirLogo(file: File): Promise<string> {
  const ext = EXT_POR_TIPO[file.type] ?? 'bin'
  const nombre = `logo-${Date.now()}.${ext}`
  const c = sb()

  const buf = new Uint8Array(await file.arrayBuffer())
  const { error } = await c.storage
    .from(BUCKET)
    .upload(nombre, buf, { contentType: file.type, upsert: false })

  if (error) {
    // 🔴 el mensaje de Supabase cuando el bucket no existe es "Bucket not
    // found" — se lo traducimos a instrucciones porque el instalador debería
    // haberlo creado y, si no, la persona necesita saber qué hacer.
    if (/not found|does not exist/i.test(error.message)) {
      throw new Error(
        'El bucket "logos" no existe. Creálo en Supabase Storage (Public) y volvé a intentar.'
      )
    }
    throw new Error(error.message)
  }

  const { data } = c.storage.from(BUCKET).getPublicUrl(nombre)
  return data.publicUrl
}

/**
 * Borrar un archivo del bucket. Extrae el nombre de la URL pública: los últimos
 * segmentos después de `/object/public/logos/` son la ruta dentro del bucket.
 */
export async function borrarLogo(urlPublica: string): Promise<void> {
  const marca = `/object/public/${BUCKET}/`
  const i = urlPublica.indexOf(marca)
  if (i < 0) return   // no parece nuestra URL: no borramos algo ajeno
  const ruta = urlPublica.slice(i + marca.length).split('?')[0]
  if (!ruta) return
  const { error } = await sb().storage.from(BUCKET).remove([ruta])
  if (error) throw new Error(error.message)
}
