import { hoyEn } from '@/shared/calculo/periodo'
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
