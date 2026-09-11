import { NextResponse, type NextRequest } from 'next/server'

import { datos } from '@/shared/datos/indice'
import { soloAdmin } from '@/shared/datos/guardias'
import { subirLogo, borrarLogo } from '@/shared/datos/supabase/logo'

const MAX_BYTES = 256 * 1024   // 256 KB — un logo de topbar no necesita más
const TIPOS_OK = new Set(['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'])

/**
 * Sube un logo al bucket `logos` y guarda la URL pública en `configuracion.logo_url`.
 *
 * 🔴 Endpoint aparte del PATCH /api/ajustes: aquel es JSON, este es multipart.
 * Meter dos content-types en una ruta obligaría a un if(content-type) que se
 * lee peor que un archivo por caso.
 *
 * 🔴 En capa demo (sin Supabase real) devuelve 501 con un mensaje claro: no
 * hay Storage local; se prueba contra la base real.
 */
export async function POST(request: NextRequest) {
  const negado = await soloAdmin()
  if (negado) return negado
  const capa = datos()
  if (capa.motor !== 'supabase') {
    return NextResponse.json(
      { error: 'La subida de logo requiere Supabase Storage. Corré contra la base real.' },
      { status: 501 }
    )
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'El cuerpo no es multipart válido' }, { status: 400 })
  }

  const file = formData.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Falta el archivo en el campo `file`.' }, { status: 400 })
  }
  if (file.size === 0) {
    return NextResponse.json({ error: 'El archivo está vacío.' }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `Máximo 256 KB. Bajalo con squoosh.app o similar.` },
      { status: 400 }
    )
  }
  if (!TIPOS_OK.has(file.type)) {
    return NextResponse.json(
      { error: `Formato no soportado (${file.type || 'desconocido'}). Usá PNG, JPG, SVG o WebP.` },
      { status: 400 }
    )
  }

  // Fase B · borra el anterior en best-effort. Si falla (bucket privado, red),
  // se sigue: el nuevo se sube igual y la referencia se sobreescribe.
  const config = await capa.leerConfiguracion()
  if (config.logoUrl) {
    await borrarLogo(config.logoUrl).catch((e) => {
      console.warn('[api/logo] no pude borrar el anterior:', e)
    })
  }

  let url: string
  try {
    url = await subirLogo(file)
  } catch (e) {
    console.error('[api/logo]', e)
    const msg = e instanceof Error ? e.message : 'No se pudo subir'
    return NextResponse.json({ error: msg }, { status: 500 })
  }

  try {
    await capa.guardarConfiguracion({ logoUrl: url })
  } catch (e) {
    console.error('[api/logo] guardarConfiguracion:', e)
    return NextResponse.json({ error: 'Subido, pero no pude guardar la URL' }, { status: 500 })
  }

  return NextResponse.json({ logoUrl: url })
}

export async function DELETE() {
  const negado = await soloAdmin()
  if (negado) return negado
  const capa = datos()
  if (capa.motor !== 'supabase') {
    return NextResponse.json({ error: 'Solo contra la base real' }, { status: 501 })
  }

  const config = await capa.leerConfiguracion()
  if (config.logoUrl) {
    await borrarLogo(config.logoUrl).catch((e) => {
      // best-effort: si el borrado falla, no bloqueamos limpiar el puntero
      console.warn('[api/logo/DELETE] no pude borrar del bucket:', e)
    })
  }

  try {
    await capa.guardarConfiguracion({ logoUrl: null })
  } catch (e) {
    console.error('[api/logo/DELETE] guardarConfiguracion:', e)
    return NextResponse.json({ error: 'No pude limpiar la URL' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
