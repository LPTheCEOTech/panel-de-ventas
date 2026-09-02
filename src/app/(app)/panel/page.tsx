import {
  barrasPorDia, barrasPorSemana, delta, embudo, metricas, rankingClosers, rankingSetters,
} from '@/shared/calculo/metricas'
import { hoyEn, sumarDias, ventana, ventanaAnterior } from '@/shared/calculo/periodo'
import { IconoInfo } from '@/shared/chasis/iconos'
import { datos } from '@/shared/datos/indice'
import { tituloDeVentana } from '@/shared/formato'
import type { Periodo } from '@/shared/tipos'
import {
  CashPorDia, Dinero, Embudo, Kpis, LlamadaAEquipo, RankingClosers, RankingSetters, SinEquipo, Totales,
} from '@/features/panel/piezas'
import { SelectorPeriodo } from '@/features/panel/selector-periodo'

const PERIODOS: Periodo[] = ['dia', 'semana', 'mes']

/** `?p=dia|semana|mes` y `?f=YYYY-MM-DD` (la fecha de referencia). */
function leerParametros(sp: Record<string, string | string[] | undefined>, zona: string) {
  const p = Array.isArray(sp.p) ? sp.p[0] : sp.p
  const f = Array.isArray(sp.f) ? sp.f[0] : sp.f
  return {
    periodo: PERIODOS.includes(p as Periodo) ? (p as Periodo) : 'semana',
    // 🔴 se valida la forma: un `?f=` cualquiera no puede reventar la página
    fecha: typeof f === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(f) ? f : hoyEn(zona),
    fechaExplicita: typeof f === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(f) ? f : undefined,
  }
}

export default async function PanelDeVentas({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const capa = datos()
  const config = await capa.leerConfiguracion()
  const { periodo, fecha, fechaExplicita } = leerParametros(await searchParams, config.zonaHoraria)

  const v = ventana(periodo, fecha, config.inicioSemana)
  const previa = ventanaAnterior(periodo, v)

  // 🔴 El gráfico NO usa la misma ventana que los números. En modo "Día" una
  // sola barra no es un gráfico: se muestran los últimos 7 días terminando en
  // el elegido, que es lo que deja ver si el día fue bueno o malo *comparado
  // con qué*. Los KPIs siguen siendo del día solo.
  const vGrafico = periodo === 'dia' ? { desde: sumarDias(v.hasta, -6), hasta: v.hasta } : v

  const [personas, setters, closers, settersPrevios, closersPrevios, closersGrafico] = await Promise.all([
    capa.leerPersonas(),
    capa.leerReportesSetter(v),
    capa.leerReportesCloser(v),
    capa.leerReportesSetter(previa),
    capa.leerReportesCloser(previa),
    periodo === 'dia' ? capa.leerReportesCloser(vGrafico) : Promise.resolve([]),
  ])

  const m = metricas(setters, closers)
  const mPrevia = metricas(settersPrevios, closersPrevios)
  const deltas: [number | null, number | null, number | null] = [
    delta(m.tasaAgenda, mPrevia.tasaAgenda),
    delta(m.tasaAsistencia, mPrevia.tasaAsistencia),
    delta(m.tasaCierre, mPrevia.tasaCierre),
  ]

  const hayEquipo = personas.some((p) => p.activo)
  const hayDatos = setters.length + closers.length > 0

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Panel de Ventas</h1>
          <div className="sub">{tituloDeVentana(periodo, v.desde, v.hasta)}</div>
        </div>
        <div className="head-actions">
          <SelectorPeriodo actual={periodo} fecha={fechaExplicita} />
        </div>
      </div>

      {!hayEquipo && <SinEquipo />}

      {hayEquipo && (
        <div className="what read">
          <IconoInfo />
          <span>
            Todo lo que ves acá <b>se calcula</b> a partir de los reportes de fin de día del
            equipo. Ningún número se teclea dos veces.
          </span>
          <span className="badge-w">Solo lectura</span>
        </div>
      )}

      <Dinero m={m} simbolo={config.simbolo} />
      <Kpis m={m} deltas={deltas} />
      <Totales m={m} />

      {!hayDatos ? (
        <LlamadaAEquipo />
      ) : (
        <>
          <div className="grid2">
            <Embudo
              pasos={embudo(m)} simbolo={config.simbolo}
              avisoAgendas={m.agendas !== m.llamadas}
              deQue={{ dia: 'del día', semana: 'de la semana', mes: 'del mes' }[periodo]}
            />
            <CashPorDia
              barras={
                periodo === 'mes'
                  ? barrasPorSemana(v, closers, config.inicioSemana)
                  : barrasPorDia(vGrafico, periodo === 'dia' ? closersGrafico : closers)
              }
              simbolo={config.simbolo}
              total={m.cashCents}
              subtitulo={
                periodo === 'semana'
                  ? (config.inicioSemana === 1 ? 'lunes a domingo' : 'domingo a sábado')
                  : periodo === 'dia' ? 'los últimos 7 días' : 'semana por semana'
              }
            />
          </div>
          {config.rankingVisible && (
            <div className="grid2">
              <RankingClosers filas={rankingClosers(personas, closers)} simbolo={config.simbolo} />
              <RankingSetters filas={rankingSetters(personas, setters)} />
            </div>
          )}
        </>
      )}
    </>
  )
}
