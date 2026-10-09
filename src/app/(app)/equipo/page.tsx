import { agregarLlamadas, rankingClosers, rankingSetters } from '@/shared/calculo/metricas'
import { hoyEn, ventana } from '@/shared/calculo/periodo'
import { IconoEquipo } from '@/shared/chasis/iconos'
import { exigirPagina } from '@/shared/datos/guardias'
import { datos } from '@/shared/datos/indice'
import { CONFIGURACION_POR_DEFECTO } from '@/shared/datos/interfaz'
import { nivelDelObjetivo, puede, puedeSerManager, puedeTocar } from '@/shared/datos/permisos'
import { dinero, numero, plural } from '@/shared/formato'
import type { Yo } from '@/features/equipo/fila-yo'
import { ListaEquipo, type FilaEquipo } from '@/features/equipo/lista'

export default async function Equipo() {
  const capa = datos()
  // Equipo es del dueño y del manager. Qué puede tocar cada uno se decide
  // fila por fila, más abajo.
  const { sesion, nivel } = await exigirPagina('gestionar-equipo')
  const config = await capa.leerConfiguracion()
  const v = ventana('semana', hoyEn(config.zonaHoraria), config.inicioSemana)

  // 🔴 Los closers cargan una fila por llamada (Post Llamada), igual que en el
  // Panel. Leer el reporte diario viejo dejaba a todos en «sin reportes».
  const [personas, setters, llamadas, accesos] = await Promise.all([
    capa.leerPersonas(),
    capa.leerReportesSetter(v),
    capa.leerLlamadas(v),
    capa.leerAccesos(),
  ])
  const closers = agregarLlamadas(llamadas)

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
      unidad: `· ${plural(f.detalle.cierres ?? 0, 'cierre')}`,
    }
  }

  // 🔴 Lo que se puede hacer con cada fila lo decide el SERVIDOR con
  // `permisos.ts`; la lista solo dibuja. Así el manager ve quietas las filas
  // del dueño y de otros managers, y la ruta igual le respondería 403.
  const porPersona = new Map(accesos.flatMap((a) => (a.personaId ? [[a.personaId, a] as const] : [])))
  const filas: Record<string, FilaEquipo> = {}
  for (const p of personas) {
    const a = porPersona.get(p.id)
    const objetivo = a ? { ...a, esYo: a.authUserId === sesion?.authUserId } : null
    filas[p.id] = {
      quien: nivelDelObjetivo(objetivo),
      tocable: puedeTocar(nivel, objetivo),
      conManager: puede(nivel, 'marcar-manager') && puedeSerManager(objetivo),
    }
  }

  // 🔴 La fila «Tú»: quien mira, venda o no. Sale de la sesión, no de la lista
  // de personas. El dueño la edita; el manager la ve quieta (su rol lo cambia
  // el dueño, y su contraseña también). En modo demo no hay sesión ni fila.
  const yo: Yo | null = sesion ? {
    correo: sesion.correo,
    persona: sesion.persona,
    nombreSugerido: config.usuarioNombre === CONFIGURACION_POR_DEFECTO.usuarioNombre ? '' : config.usuarioNombre,
    fija: puede(nivel, 'sumarse-al-equipo') ? undefined : 'Manager',
  } : null

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
        <span>Los nombres que cargues aquí son los que aparecen en los dos formularios y en el ranking.</span>
        <span className="badge-w">Se carga a mano</span>
      </div>

      <ListaEquipo
        personas={personas} resumen={resumen} yo={yo} filas={filas}
        puedeDarDeBaja={puede(nivel, 'dar-de-baja')} puedeCrearManager={puede(nivel, 'marcar-manager')}
      />
    </div>
  )
}
