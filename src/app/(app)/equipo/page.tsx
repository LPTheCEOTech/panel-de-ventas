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

  // el renglón chico de cada persona: lo que hizo esta semana
  const resumen: Record<string, string> = {}
  for (const f of rankingSetters(personas, setters)) {
    resumen[f.persona.id] = `${numero(f.valor)} agendas esta semana`
  }
  for (const f of rankingClosers(personas, closers)) {
    const previo = resumen[f.persona.id]
    const propio = `${f.detalle.cierres} cierres · ${dinero(f.valor, config.simbolo)}`
    resumen[f.persona.id] = previo ? `${previo} · ${propio}` : propio
  }

  return (
    <>
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
    </>
  )
}
