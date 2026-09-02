/** Los tipos del dominio. Uno solo por concepto, para que no haya dos verdades. */

export type Rol = 'setter' | 'closer' | 'ambos'

export interface Persona {
  id: string
  nombre: string
  rol: Rol
  activo: boolean
  orden: number
}

/** Un reporte de fin de día de un setter. Uno por persona y por fecha. */
export interface ReporteSetter {
  fecha: string // ISO YYYY-MM-DD, en la zona horaria del negocio
  personaId: string
  conversaciones: number
  agendas: number
}

/** Un reporte de fin de día de un closer. Uno por persona y por fecha. */
export interface ReporteCloser {
  fecha: string
  personaId: string
  llamadas: number
  asistieron: number
  reagendadas: number
  cierres: number
  /** 🔴 En CENTAVOS, siempre. Nunca un float: 0.1 + 0.2 no da 0.3. */
  revenueCents: number
  cashCents: number
}

export type Periodo = 'dia' | 'semana' | 'mes'

export interface Ventana {
  desde: string // inclusive
  hasta: string // inclusive
}

export interface Configuracion {
  nombreNegocio: string
  iniciales: string
  usuarioNombre: string
  usuarioRol: string
  marca: string
  moneda: string
  simbolo: string
  zonaHoraria: string
  /** 1 = lunes, 0 = domingo */
  inicioSemana: 0 | 1
  rankingVisible: boolean
}
