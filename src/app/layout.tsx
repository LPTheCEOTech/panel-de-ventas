import type { Metadata } from 'next'

import { SCRIPT_TEMA } from '@/shared/chasis/tema'
import { datos } from '@/shared/datos/indice'
import './globals.css'

/**
 * El título sale de la BASE, no de una constante: es el panel del negocio de
 * quien lo instaló, y en la pestaña del navegador tiene que decir su nombre.
 */
export async function generateMetadata(): Promise<Metadata> {
  try {
    const { nombreNegocio } = await datos().leerConfiguracion()
    return { title: nombreNegocio, description: 'Panel de métricas de ventas' }
  } catch {
    // sin base todavía (recién clonado), el layout igual tiene que renderizar
    return { title: 'Panel de Ventas' }
  }
}

export default function LayoutRaiz({ children }: { children: React.ReactNode }) {
  return (
    /* 🔴 `suppressHydrationWarning` va acá y no es opcional.
       El script del tema le estampa `data-theme` al <html> ANTES de que React
       hidrate. El servidor no puede saber qué tema eligió la persona, así que
       el atributo que ve React al hidratar no es el que renderizó: sin esto,
       cualquiera con el tema guardado abre la app y le salta el error rojo de
       hidratación en desarrollo. Suprime SOLO este nodo, no el árbol. */
    <html lang="es" suppressHydrationWarning>
      <head>
        {/* corre antes del primer pintado: sin esto parpadea en blanco */}
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }} />
      </head>
      <body>{children}</body>
    </html>
  )
}
