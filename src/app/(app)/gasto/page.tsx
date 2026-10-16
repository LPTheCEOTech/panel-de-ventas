import { hoyEn, ventana } from '@/shared/calculo/periodo'
import { exigirPagina } from '@/shared/datos/guardias'
import { datos } from '@/shared/datos/indice'
import { FormGasto } from '@/features/gasto/form'

export default async function Gasto() {
  // 🔴 Fase C · el gasto es del negocio: lo cargan el dueño y el manager. Al
  // vendedor se le redirige a /panel (nunca al gasto).
  await exigirPagina('cargar-gasto')
  const capa = datos()
  const config = await capa.leerConfiguracion()
  const hoy = hoyEn(config.zonaHoraria)
  // El historial arranca en el mes en curso; los otros meses los pide el cliente.
  const delMes = await capa.leerGastos(ventana('mes', hoy))

  return (
    /* .hoja cierra en 1080 igual que setter/closer: es un formulario, no un tablero. */
    <div className="hoja">
      <div className="page-head">
        <div>
          <h1>Gasto en publicidad</h1>
          <div className="sub">
            cuánto se invirtió en anuncios · uno por día
          </div>
        </div>
      </div>

      <FormGasto hoy={hoy} simbolo={config.simbolo} iniciales={delMes} />
    </div>
  )
}
