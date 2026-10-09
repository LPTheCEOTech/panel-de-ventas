import {
  agregarLlamadas, barrasPorDia, barrasPorMes, barrasPorSemana, delta, embudo, metricas, metricasConCosto,
  rankingClosers, rankingSetters,
} from '@/shared/calculo/metricas'
import { hoyEn } from '@/shared/calculo/periodo'
import { deQueDe, graficoDe, leerPedido, rangoAnterior, resolverRango, tituloDeRango } from '@/shared/calculo/rango'
import { IconoInfo } from '@/shared/chasis/iconos'
import { exigirPagina } from '@/shared/datos/guardias'
import { datos } from '@/shared/datos/indice'
import { puede } from '@/shared/datos/permisos'
import {
  CashPorDia, Costos, Embudo, LlamadaAEquipo, Plata, RankingClosers, RankingSetters, SinEquipo, Tasas,
} from '@/features/panel/piezas'
import { SelectorFechas } from '@/features/panel/selector-fechas'

export default async function PanelDeVentas({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const capa = datos()
  const [config, { sesion, nivel }] = await Promise.all([capa.leerConfiguracion(), exigirPagina()])
  // 🔴 Fase C · el vendedor ve solo lo suyo: todo se filtra por su persona. El
  // dueño y el manager (o el modo dev sin sesión) ven todo. El filtro vive
  // server-side, en el `.eq('persona_id', …)` de la capa: la app usa
  // service_role, RLS no aplica, así que la barrera tiene que estar acá.
  const esMiembro = !puede(nivel, 'ver-negocio')
  const filtro = esMiembro ? sesion?.usuario.personaId ?? undefined : undefined

  // El período: `?r=` (atajo), `?desde&hasta` (rango libre) o el `?p&f` viejo;
  // sin nada, el mes en curso. «Todo» necesita saber dónde empiezan los datos
  // (del miembro, si es miembro): esa consulta se hace solo cuando se pide.
  const hoy = hoyEn(config.zonaHoraria)
  const pedido = leerPedido(await searchParams, config.inicioSemana)
  const primera = 'atajo' in pedido && pedido.atajo === 'todo' ? await capa.primeraFecha(filtro) : null
  const v = resolverRango(pedido, hoy, config.inicioSemana, primera)
  // «Todo» no tiene anterior: se compara contra nada y los chips no salen
  const previa = rangoAnterior(v)

  // 🔴 El gráfico NO siempre usa la misma ventana que los números. Un día solo
  // no es un gráfico: se muestran los últimos 7 días terminando en él, que es
  // lo que deja ver si fue bueno o malo *comparado con qué*. Los KPIs siguen
  // siendo del día solo. Los rangos largos se agrupan por semana o por mes.
  const grafico = graficoDe(v)
  const graficoAparte = grafico.ventana.desde !== v.desde

  // 🔴 Fase D · el closer pasa a granularidad por llamada. El panel lee
  // `llamadas` (una fila por llamada) y las agrega con `agregarLlamadas()` al
  // shape que espera el kernel (`ReporteCloser[]`). Los números siguen dando
  // idéntico — la semilla nueva está calibrada para eso (ver ORO.filasLlamadas
  // y los tests de kernel para Fase D).
  const [personas, setters, llamadasV, settersPrevios, llamadasPrevias, llamadasGrafico, gastoCents] = await Promise.all([
    capa.leerPersonas(),
    capa.leerReportesSetter(v, filtro),
    capa.leerLlamadas(v, filtro),
    previa ? capa.leerReportesSetter(previa, filtro) : Promise.resolve([]),
    previa ? capa.leerLlamadas(previa, filtro) : Promise.resolve([]),
    graficoAparte ? capa.leerLlamadas(grafico.ventana, filtro) : Promise.resolve([]),
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

  const deQue = deQueDe(v, config.inicioSemana)
  const hayEquipo = personas.some((p) => p.activo)
  const hayDatos = setters.length + closers.length > 0

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Panel de Ventas</h1>
          <div className="sub">{tituloDeRango(v, config.inicioSemana)}</div>
        </div>
        <div className="head-actions">
          {/* `key`: al cambiar de período el selector arranca de cero, con el
              borrador del calendario igual al rango nuevo */}
          <SelectorFechas key={`${v.desde}_${v.hasta}`} rango={v} hoy={hoy} inicioSemana={config.inicioSemana} />
        </div>
      </div>

      {!hayEquipo && <SinEquipo />}

      {hayEquipo && (
        <div className="what read">
          <IconoInfo />
          <span>
            Todo lo que ves aquí <b>se calcula</b> a partir de los reportes de fin de día del
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
                grafico.unidad === 'mes' ? barrasPorMes(v, closers)
                  : grafico.unidad === 'semana' ? barrasPorSemana(v, closers, config.inicioSemana)
                    : barrasPorDia(grafico.ventana, graficoAparte ? closersGrafico : closers)
              }
              simbolo={config.simbolo}
              unidad={grafico.unidad}
              subtitulo={
                deQue === 'de la semana'
                  ? (config.inicioSemana === 1 ? 'lunes a domingo' : 'domingo a sábado')
                  : grafico.subtitulo
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
