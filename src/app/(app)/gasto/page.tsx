import { hoyEn } from '@/shared/calculo/periodo'
import { datos } from '@/shared/datos/indice'
import { FormGasto } from '@/features/gasto/form'

export default async function Gasto() {
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
