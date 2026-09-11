import { redirect } from 'next/navigation'

import { hoyEn } from '@/shared/calculo/periodo'
import { datos } from '@/shared/datos/indice'
import { sesionActual } from '@/shared/datos/sesion-usuario'
import { FormGasto } from '@/features/gasto/form'

export default async function Gasto() {
  const [capa, sesion] = [datos(), await sesionActual()]
  // 🔴 Fase C · el gasto es del negocio: solo admin puede cargarlo. Al miembro
  // se le redirige a /panel (nunca al gasto). Sin sesión (dev/demo) sigue
  // pasando: la app se comporta como admin en ese modo.
  if (sesion && sesion.usuario.rol !== 'admin') redirect('/panel')
  const config = await capa.leerConfiguracion()
  const hoy = hoyEn(config.zonaHoraria)

  return (
    /* .hoja cierra en 1080 igual que setter/closer: es un formulario, no un tablero. */
    <div className="hoja">
      <div className="page-head">
        <div>
          <h1>Gasto del día</h1>
          <div className="sub">
            cuánto se gastó hoy en captación · uno por día
          </div>
        </div>
      </div>

      <FormGasto hoy={hoy} simbolo={config.simbolo} />
    </div>
  )
}
