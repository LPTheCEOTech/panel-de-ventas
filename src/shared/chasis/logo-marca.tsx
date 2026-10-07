'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * El logo del negocio en el topbar, o sus iniciales si no hay logo o no carga.
 *
 * 🔴 Vive en su propio archivo con `'use client'` y NO dentro de `Topbar`.
 * `Topbar` es un Server Component, y un `onError` en un Server Component no es
 * un warning: Next se niega a renderizar («Event handlers cannot be passed to
 * Client Component props») y TODA pantalla de (app) da 500 con el «This page
 * couldn't load» genérico. Solo pasaba con logo cargado, así que en un panel
 * sin logo no se veía nunca: el primer alumno que subió el suyo se quedó sin
 * panel, y sin forma de entrar a Ajustes a sacarlo.
 */
export function LogoMarca({
  logoUrl, nombre, iniciales,
}: {
  logoUrl: string | null
  nombre: string
  iniciales: string
}) {
  // bucket caído o URL rota: caen las iniciales en vez de un ícono roto
  const [roto, setRoto] = useState(false)
  const img = useRef<HTMLImageElement>(null)

  // 🔴 El `onError` solo no alcanza: el <img> viene en el HTML del servidor y,
  // si falla ANTES de que React hidrate, el evento ya pasó y nadie lo escucha.
  // Por eso al montar, si ya terminó de cargar, se le pregunta si sirvió.
  // `decode()` y no `naturalWidth === 0`: un SVG sin tamaño propio da 0 aunque
  // haya cargado perfecto.
  useEffect(() => {
    const el = img.current
    if (el?.complete) el.decode().catch(() => setRoto(true))
  }, [logoUrl])

  if (logoUrl && !roto) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img ref={img} src={logoUrl} alt={nombre} className="brand-logo" onError={() => setRoto(true)} />
    )
  }
  return <span className="brand-tile">{iniciales}</span>
}
