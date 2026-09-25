import { redirect } from 'next/navigation'

import { AvisoActualizacion } from '@/shared/chasis/aviso-actualizacion'
import { estiloDeMarca } from '@/shared/chasis/marca'
import { PantallaDeFalla, motivoDe } from '@/shared/chasis/pantalla-falla'
import { Topbar } from '@/shared/chasis/topbar'
import { datos } from '@/shared/datos/indice'
import { estadoDeLaBase } from '@/shared/datos/migrador'
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

/**
 * Las tres lecturas que corren en TODAS las pantallas.
 *
 * 🔴 Van juntas y en una función aparte por dos razones. Una: si cualquiera
 * revienta —el SQL a medio correr, una env var mal pegada— Next mostraba «This
 * page couldn't load» y un número de ocho dígitos, que nadie puede arreglar ni
 * contar por WhatsApp; acá el motivo real llega a la pantalla. Dos: devolver un
 * resultado discriminado en vez de variables sueltas conserva los tipos exactos
 * de `estadoDeLaBase()`, que es una unión.
 *
 * El `redirect()` del cuerpo queda AFUERA de este try a propósito: funciona
 * lanzando una excepción, y atraparla lo rompería.
 */
async function cargar() {
  try {
    const [config, sesion, base] = await Promise.all([
      datos().leerConfiguracion(),
      sesionActual(),
      estadoDeLaBase(),
    ])
    return { ok: true as const, config, sesion, base }
  } catch (e) {
    console.error('[layout] no pude leer la configuración:', e)
    return { ok: false as const, motivo: motivoDe(e) }
  }
}

export default async function LayoutApp({ children }: { children: React.ReactNode }) {
  const carga = await cargar()
  if (!carga.ok) return <PantallaDeFalla donde="tu panel" motivo={carga.motivo} />
  const { config, sesion, base } = carga

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

  // 🔴 El aviso de actualización es SOLO para el admin: es el único que puede
  // aplicarla, y a un vendedor un cartel que no puede resolver solo lo asusta
  // sin darle nada. En modo dev/demo (`sesion === null`) también se muestra,
  // igual que el resto de la app, que ahí corre como admin.
  const esAdmin = !sesion || sesion.usuario.rol === 'admin'
  const hayQueActualizar = base.estado === 'pendientes' || base.estado === 'sin-actualizador'

  return (
    <>
      {marca && <style dangerouslySetInnerHTML={{ __html: marca }} />}
      <Topbar config={config} sesion={sesion} />
      {esAdmin && hayQueActualizar && (
        <AvisoActualizacion
          titulos={base.migraciones.map((m) => m.titulo)}
          sinActualizador={base.estado === 'sin-actualizador'}
        />
      )}
      <main className="wrap">{children}</main>
    </>
  )
}
