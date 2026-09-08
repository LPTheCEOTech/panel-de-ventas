import { rankingClosers, rankingSetters } from '@/shared/calculo/metricas'
import { hoyEn, ventana } from '@/shared/calculo/periodo'
import { IconoEquipo } from '@/shared/chasis/iconos'
import { datos } from '@/shared/datos/indice'
import { dinero, numero } from '@/shared/formato'
import { ListaEquipo } from '@/features/equipo/lista'

export default async function Equipo() {
  const capa = datos()
  const config = await capa.leerConfiguracion()
  const v = ventana('semana', hoyEn(config.zonaHoraria), config.inicioSemana)

  const [personas, setters, closers] = await Promise.all([
    capa.leerPersonas(),
    capa.leerReportesSetter(v),
    capa.leerReportesCloser(v),
  ])

  // Lo que hizo cada uno esta semana, partido en dos: el número que manda y
  // lo que lo acompaña. La columna es angosta y el número tiene que poder
  // pintarse más grande que su unidad.
  //
  // 🔴 A quien hace las dos cosas se le muestra su número de CLOSER. No es que
  // se pierda lo de setter: el dinero es el titular del negocio y el detalle
  // completo está en los dos rankings del panel. Meter los dos números en una
  // columna de 150 px los deja ilegibles a los dos.
  const resumen: Record<string, { valor: string; unidad: string }> = {}
  for (const f of rankingSetters(personas, setters)) {
    resumen[f.persona.id] = { valor: numero(f.valor), unidad: 'agendas' }
  }
  for (const f of rankingClosers(personas, closers)) {
    resumen[f.persona.id] = {
      valor: dinero(f.valor, config.simbolo),
      unidad: `· ${f.detalle.cierres} ${f.detalle.cierres === 1 ? 'cierre' : 'cierres'}`,
    }
  }

  return (
    <div className="hoja">
      <div className="page-head">
        <div>
          <h1>Equipo</h1>
          <div className="sub">quiénes pueden mandar reporte</div>
        </div>
      </div>

      <div className="what write">
        <IconoEquipo size={15} />
        <span>Los nombres que cargues acá son los que aparecen en los dos formularios y en el ranking.</span>
        <span className="badge-w">Se carga a mano</span>
      </div>

      <ListaEquipo personas={personas} resumen={resumen} />
    </div>
  )
}
