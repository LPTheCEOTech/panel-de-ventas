import {
  agregarLlamadas, barrasPorDia, barrasPorSemana, delta, embudo, metricas, metricasConCosto,
  rankingClosers, rankingSetters,
} from '@/shared/calculo/metricas'
import { dentro, hoyEn, sumarDias, ventana, ventanaAnterior } from '@/shared/calculo/periodo'
import { IconoInfo } from '@/shared/chasis/iconos'
import { datos } from '@/shared/datos/indice'
import { sesionActual } from '@/shared/datos/sesion-usuario'
import { tituloDeVentana } from '@/shared/formato'
import type { Periodo } from '@/shared/tipos'
import {
  CashPorDia, Costos, Embudo, LlamadaAEquipo, Plata, RankingClosers, RankingSetters, SinEquipo, Tasas,
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
  const [config, sesion] = await Promise.all([capa.leerConfiguracion(), sesionActual()])
  const { periodo, fecha, fechaExplicita } = leerParametros(await searchParams, config.zonaHoraria)

  const v = ventana(periodo, fecha, config.inicioSemana)
  const previa = ventanaAnterior(periodo, v)

  // 🔴 Fase C · si es miembro, todo se filtra por `personaId` propio. El admin
  // (o el modo dev sin sesión) sigue viendo todo. El filtro vive server-side,
  // en el `.eq('persona_id', …)` de la capa: la app usa service_role, RLS no
  // aplica, así que la barrera tiene que estar acá.
  const esMiembro = sesion?.usuario.rol === 'miembro'
  const filtro = esMiembro ? sesion?.usuario.personaId ?? undefined : undefined

  // 🔴 El gráfico NO usa la misma ventana que los números. En modo "Día" una
  // sola barra no es un gráfico: se muestran los últimos 7 días terminando en
  // el elegido, que es lo que deja ver si el día fue bueno o malo *comparado
  // con qué*. Los KPIs siguen siendo del día solo.
  const vGrafico = periodo === 'dia' ? { desde: sumarDias(v.hasta, -6), hasta: v.hasta } : v

  // 🔴 Fase D · el closer pasa a granularidad por llamada. El panel lee
  // `llamadas` (una fila por llamada) y las agrega con `agregarLlamadas()` al
  // shape que espera el kernel (`ReporteCloser[]`). Los números siguen dando
  // idéntico — la semilla nueva está calibrada para eso (ver ORO.filasLlamadas
  // y los tests de kernel para Fase D).
  const [personas, setters, llamadasV, settersPrevios, llamadasPrevias, llamadasGrafico, gastoCents] = await Promise.all([
    capa.leerPersonas(),
    capa.leerReportesSetter(v, filtro),
    capa.leerLlamadas(v, filtro),
    capa.leerReportesSetter(previa, filtro),
    capa.leerLlamadas(previa, filtro),
    periodo === 'dia' ? capa.leerLlamadas(vGrafico, filtro) : Promise.resolve([]),
    // 🔴 Fase A + C · gasto es del NEGOCIO: solo el admin lo ve. Al miembro
    // le va 0 (no oculta la pieza porque .plata no se rompe con $0, pero CAC
    // y costo/asistida se ocultan más abajo).
    esMiembro ? Promise.resolve(0) : capa.sumaGastos(v),
  ])
  const closers = agregarLlamadas(llamadasV)
  const closersPrevios = agregarLlamadas(llamadasPrevias)
  const closersGrafico = agregarLlamadas(llamadasGrafico)

  const m = metricasConCosto(setters, closers, gastoCents)
  const mPrevia = metricas(settersPrevios, closersPrevios)
  const deltas: [number | null, number | null, number | null] = [
    delta(m.tasaAgenda, mPrevia.tasaAgenda),
    delta(m.tasaAsistencia, mPrevia.tasaAsistencia),
    delta(m.tasaCierre, mPrevia.tasaCierre),
  ]

  const deQue = { dia: 'del día', semana: 'de la semana', mes: 'del mes' }[periodo]
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
          <SelectorPeriodo
            actual={periodo} fecha={fechaExplicita} ventanaActual={v}
            inicioSemana={config.inicioSemana} esHoy={dentro(hoyEn(config.zonaHoraria), v)}
          />
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

      {/* 🔴 Una sola banda arriba, no tres. La plata manda y las tasas la
          acompañan; los cuatro contadores que había sueltos (leads, agendas,
          llamadas, cierres) viven ahora en el contexto de cada tasa y en el
          embudo — estaban dos veces en la misma pantalla. */}
      <div className="resumen">
        <Plata m={m} simbolo={config.simbolo} />
        <Tasas m={m} deltas={deltas} />
      </div>

      {/* 🔴 Fase A · CAC y Costo por asistida en su propia banda. AOV ya vive
          en `.plata` (es una vista del dinero). Con gasto = 0 los dos dan $0;
          con cierres/asistidos = 0 dan —.
          🔴 Fase C · esta banda es solo para admin. CAC y costo/asistida son
          datos del NEGOCIO (dependen del gasto), no del vendedor. AOV se le
          oculta al miembro por el mismo motivo aunque no dependa del gasto:
          es una vista comercial que no le suma al vendedor. */}
      {hayEquipo && !esMiembro && (
        <Costos m={m} simbolo={config.simbolo} />
      )}

      {!hayDatos ? (
        <LlamadaAEquipo />
      ) : (
        <>
          <div className="grid2">
            <Embudo
              /* Fase C · el paso «Gasto» solo si es admin (o dev sin sesión).
                 Sin arg, el kernel devuelve 6 pasos y el embudo no muestra la
                 franja gris de arriba. */
              pasos={esMiembro ? embudo(m) : embudo(m, gastoCents)} simbolo={config.simbolo}
              avisoAgendas={m.agendas !== m.llamadas}
              deQue={deQue}
            />
            <CashPorDia
              barras={
                periodo === 'mes'
                  ? barrasPorSemana(v, closers, config.inicioSemana)
                  : barrasPorDia(vGrafico, periodo === 'dia' ? closersGrafico : closers)
              }
              simbolo={config.simbolo}
              unidad={periodo === 'mes' ? 'semana' : 'día'}
              subtitulo={
                periodo === 'semana'
                  ? (config.inicioSemana === 1 ? 'lunes a domingo' : 'domingo a sábado')
                  : periodo === 'dia' ? 'los últimos 7 días' : 'semana por semana'
              }
            />
          </div>
          {/* 🔴 Fase C · el ranking existe para comparar entre personas. Al
              miembro le mostraría datos ajenos (compañeros); se oculta. Es la
              decisión recomendada por el PRP; el admin la puede revertir a
              «ranking recortado con solo la fila propia» si lo pide Jack. */}
          {config.rankingVisible && !esMiembro && (
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
