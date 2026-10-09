'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { puede, type Accion } from '@/shared/datos/permisos'
import type { Nivel } from '@/shared/tipos'

/** `accion`: el permiso que hace falta para verla. Sin acción, la ven todos. */
interface Pantalla { href: string; texto: string; accion?: Accion }

/** 🔴 Gasto y Equipo son del dueño y del manager; Ajustes, solo del dueño. El
 *  vendedor ve Panel y los dos reportes (los formularios se filtran solos). */
export const PANTALLAS: readonly Pantalla[] = [
  { href: '/panel', texto: 'Panel' },
  { href: '/gasto', texto: 'Gasto', accion: 'cargar-gasto' },
  { href: '/reporte-setter', texto: 'Reporte Setter' },
  // 🔴 Fase D · «Reporte Closer» pasa a «Post Llamada» y apunta a /llamada.
  // La ruta /reporte-closer redirige, así que un usuario con el link viejo
  // igual llega bien.
  { href: '/llamada', texto: 'Post Llamada' },
  { href: '/equipo', texto: 'Equipo', accion: 'gestionar-equipo' },
  { href: '/ajustes', texto: 'Ajustes', accion: 'ajustes' },
]

export function Nav({ nivel }: { nivel?: Nivel }) {
  const ruta = usePathname()
  // 🔴 Sin nivel (dev/demo sin auth): la app corre como dueño y se ven todas.
  const visibles = PANTALLAS.filter((p) => !p.accion || puede(nivel ?? 'dueno', p.accion))
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
