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
    <html lang="es">
      <head>
        {/* corre antes del primer pintado: sin esto parpadea en blanco */}
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }} />
      </head>
      <body>{children}</body>
    </html>
  )
}
