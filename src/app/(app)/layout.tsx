import { redirect } from 'next/navigation'

import { estiloDeMarca } from '@/shared/chasis/marca'
import { Topbar } from '@/shared/chasis/topbar'
import { datos } from '@/shared/datos/indice'
import { hayCredenciales } from '@/shared/datos/sesion'
import { sesionActual } from '@/shared/datos/sesion-usuario'

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
  const [config, sesion] = await Promise.all([
    datos().leerConfiguracion(),
    sesionActual(),
  ])

  // 🔴 Fase C · el auth user existe (el proxy nos dejó entrar) pero no tiene
  // fila en `usuarios` — no está vinculado a ninguna persona ni tiene rol.
  // Mandarlo a `/pendiente` (fuera de este layout) evita mostrarle datos
  // ajenos y evita el bucle infinito de redirigir dentro del mismo layout.
  // En modo dev/demo (sin credenciales de Supabase) `sesion` es null a
  // propósito y la app corre como si fuera admin — backwards compat con el
  // estado anterior a la Fase C.
  if (!sesion && hayCredenciales()) redirect('/pendiente')

  // 🔴 La rampa de la marca va PRIMERO y como <style>, no como estilos en línea.
  // Los siete peldaños los usan 60 reglas del CSS portado; pasarlos por
  // variables es lo único que hace que cambiar un hex en Ajustes cambie el
  // panel entero, que es lo que esa pantalla promete. Si el hex está a medio
  // escribir, no se inyecta nada y manda la rampa del mockup.
  const marca = estiloDeMarca(config.marca)
  return (
    <>
      {marca && <style dangerouslySetInnerHTML={{ __html: marca }} />}
      <Topbar config={config} sesion={sesion} />
      <main className="wrap">{children}</main>
    </>
  )
}
