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

/**
 * Un gasto diario de captación, en centavos. Uno por fecha (PK).
 *
 * 🔴 Es del NEGOCIO, no de una persona: no hay `personaId`. Si un día se gastó
 * en dos plataformas, la app pide la suma con la nota como ayuda-memoria
 * («$8k Meta, $6k Google»). Varias filas por día convertirían al panel en un
 * mini-libro contable, y no es lo que se pidió.
 */
export interface Gasto {
  fecha: string       // ISO YYYY-MM-DD
  montoCents: number
  nota?: string | null
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
