import { redirect } from 'next/navigation'

import { agregarLlamadas, rankingClosers, rankingSetters } from '@/shared/calculo/metricas'
import { hoyEn, ventana } from '@/shared/calculo/periodo'
import { IconoEquipo } from '@/shared/chasis/iconos'
import { datos } from '@/shared/datos/indice'
import { CONFIGURACION_POR_DEFECTO } from '@/shared/datos/interfaz'
import { sesionActual } from '@/shared/datos/sesion-usuario'
import { dinero, numero, plural } from '@/shared/formato'
import type { Yo } from '@/features/equipo/fila-yo'
import { ListaEquipo } from '@/features/equipo/lista'

export default async function Equipo() {
  const capa = datos()
  // Fase C · Equipo es solo admin: invitar, dar de baja, etc.
  const sesion = await sesionActual()
  if (sesion && sesion.usuario.rol !== 'admin') redirect('/panel')
  const config = await capa.leerConfiguracion()
  const v = ventana('semana', hoyEn(config.zonaHoraria), config.inicioSemana)

  // 🔴 Los closers cargan una fila por llamada (Post Llamada), igual que en el
  // Panel. Leer el reporte diario viejo dejaba a todos en «sin reportes».
  const [personas, setters, llamadas] = await Promise.all([
    capa.leerPersonas(),
    capa.leerReportesSetter(v),
    capa.leerLlamadas(v),
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

  // 🔴 La fila «Tú»: el admin que mira, venda o no. Sale de la sesión, no de
  // la lista de personas. En modo demo no hay sesión y no hay fila.
  const yo: Yo | null = sesion ? {
    correo: sesion.correo,
    persona: sesion.persona,
    nombreSugerido: config.usuarioNombre === CONFIGURACION_POR_DEFECTO.usuarioNombre ? '' : config.usuarioNombre,
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

      <ListaEquipo personas={personas} resumen={resumen} yo={yo} />
    </div>
  )
}
