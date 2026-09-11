'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import type { RolUsuario } from '@/shared/tipos'

interface Pantalla { href: string; texto: string; soloAdmin?: boolean }

/** 🔴 Fase C · Gasto, Equipo y Ajustes son solo-admin. El miembro ve Panel y
 *  los dos reportes (los formularios se filtran solos). */
export const PANTALLAS: readonly Pantalla[] = [
  { href: '/panel', texto: 'Panel' },
  { href: '/gasto', texto: 'Gasto', soloAdmin: true },
  { href: '/reporte-setter', texto: 'Reporte Setter' },
  // 🔴 Fase D · «Reporte Closer» pasa a «Post Llamada» y apunta a /llamada.
  // La ruta /reporte-closer redirige, así que un usuario con el link viejo
  // igual llega bien.
  { href: '/llamada', texto: 'Post Llamada' },
  { href: '/equipo', texto: 'Equipo', soloAdmin: true },
  { href: '/ajustes', texto: 'Ajustes', soloAdmin: true },
]

export function Nav({ rol }: { rol?: RolUsuario }) {
  const ruta = usePathname()
  // 🔴 Sin rol (dev/demo sin auth): la app corre como admin y se ven todas.
  const esMiembro = rol === 'miembro'
  const visibles = PANTALLAS.filter((p) => !(esMiembro && p.soloAdmin))
  return (
    <nav className="nav" aria-label="Secciones">
      {visibles.map((p) => (
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
