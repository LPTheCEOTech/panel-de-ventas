import { pagina } from '@/shared/calculo/listas'
import { hoyEn } from '@/shared/calculo/periodo'
import { resolverRango } from '@/shared/calculo/rango'
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
  // El historial abre en «Este mes»; los otros períodos los pide su filtro.
  const mes = resolverRango({ atajo: 'mes' }, hoy, config.inicioSemana)
  const lista = pagina(mes, await capa.leerGastos(mes))

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

      <FormGasto hoy={hoy} simbolo={config.simbolo} lista={lista} inicioSemana={config.inicioSemana} />
    </div>
  )
}
