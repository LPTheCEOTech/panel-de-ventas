/**
 * El puerto de datos. Las pantallas hablan SOLO con esto y nunca con Supabase
 * directo: así el kernel de cálculo y los componentes se pueden probar sin una
 * base, y el día que cambie el motor no se toca ni una pantalla.
 */
import type {
  Configuracion, Gasto, Persona, ReporteCloser, ReporteSetter, Rol, Ventana,
} from '@/shared/tipos'

export interface CapaDeDatos {
  readonly motor: 'supabase' | 'demo'

  leerConfiguracion(): Promise<Configuracion>
  guardarConfiguracion(c: Partial<Configuracion>): Promise<void>

  /** TODAS las personas, activas y de baja. Filtrar es tarea de quien llama:
   *  los formularios quieren las activas, el ranking las quiere a todas. */
  leerPersonas(): Promise<Persona[]>
  crearPersona(nombre: string, rol: Rol): Promise<Persona>
  cambiarActivo(id: string, activo: boolean): Promise<void>

  leerReportesSetter(v: Ventana): Promise<ReporteSetter[]>
  leerReportesCloser(v: Ventana): Promise<ReporteCloser[]>

  /** Un reporte que ya existe para esa persona y esa fecha, o `null`. Es lo que
   *  alimenta el aviso de "ya cargaste este día, ¿reemplazar?". */
  buscarReporteSetter(fecha: string, personaId: string): Promise<ReporteSetter | null>
  buscarReporteCloser(fecha: string, personaId: string): Promise<ReporteCloser | null>

  /** 🔴 UPSERT, no INSERT. La restricción `unique (fecha, persona_id)` de la
   *  base es la que hace imposible el doble conteo; esto es su cara visible. */
  guardarReporteSetter(r: ReporteSetter): Promise<void>
  guardarReporteCloser(r: ReporteCloser): Promise<void>

  /** El gasto de un día, o `null` si no se cargó. */
  buscarGasto(fecha: string): Promise<Gasto | null>
  /** La suma en centavos de los gastos de una ventana inclusive. `0` si no hay. */
  sumaGastos(v: Ventana): Promise<number>
  /** UPSERT por fecha (PK). La misma cara visible que reportes. */
  guardarGasto(g: Gasto): Promise<void>
}

export const CONFIGURACION_POR_DEFECTO: Configuracion = {
  nombreNegocio: 'Panel de Ventas',
  iniciales: 'PV',
  usuarioNombre: 'Dueño',
  usuarioRol: 'Dueño',
  marca: '#00D97E',
  moneda: 'USD',
  simbolo: '$',
  zonaHoraria: 'America/New_York',
  inicioSemana: 1,
  rankingVisible: true,
  logoUrl: null,
}
