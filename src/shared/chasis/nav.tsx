'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

/** Las cinco pantallas, en el orden del mockup. */
export const PANTALLAS = [
  { href: '/panel', texto: 'Panel' },
  { href: '/reporte-setter', texto: 'Reporte Setter' },
  { href: '/reporte-closer', texto: 'Reporte Closer' },
  { href: '/equipo', texto: 'Equipo' },
  { href: '/ajustes', texto: 'Ajustes' },
] as const

export function Nav() {
  const ruta = usePathname()
  return (
    <nav className="nav" aria-label="Secciones">
      {PANTALLAS.map((p) => (
        <Link
          key={p.href} href={p.href}
          // el mockup usa <button>; acá va un Link, que es navegable y anda
          // sin JavaScript. El selector `.nav a` del mockup le da la misma pinta.
          aria-current={ruta.startsWith(p.href) ? 'page' : undefined}
        >
          {p.texto}
        </Link>
      ))}
    </nav>
  )
}
