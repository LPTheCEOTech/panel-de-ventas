import { Topbar } from '@/shared/chasis/topbar'
import { datos } from '@/shared/datos/indice'

/**
 * 🔴 TODAS las pantallas se renderizan POR PETICIÓN.
 *
 * Sin esta línea, Next 16 prerenderiza en el build cualquier página que no use
 * `searchParams` ni `cookies()` — AUNQUE lea de la base. `/equipo` y `/ajustes`
 * son exactamente ese caso. El síntoma: se agrega a alguien al equipo, se ve
 * bien, se refresca, y vuelve la lista del build. Y en `next dev` NO se ve,
 * porque ahí todo es dinámico.
 *
 * No hay nada que cachear: es un panel de datos que cambian, detrás de login,
 * para un usuario.
 */
export const dynamic = 'force-dynamic'

export default async function LayoutApp({ children }: { children: React.ReactNode }) {
  const config = await datos().leerConfiguracion()
  return (
    <>
      <Topbar config={config} />
      <main className="wrap">{children}</main>
    </>
  )
}
