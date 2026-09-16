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
 * 🔴 Fase D · Una llamada del closer.
 *
 * Reemplaza a `ReporteCloser` como fuente de verdad: el reporte diario del
 * closer pasa de un agregado por (fecha, persona) a UNA fila por llamada. Los
 * totales del panel (`llamadas`, `asistieron`, `cierres`, `revenue`, `cash`)
 * salen de sumar `llamadas` con `activa=true` — el kernel sigue esperando el
 * shape agregado, así que un puente (`agregarLlamadas`) las convierte.
 *
 * 🔴 UNA llamada cuenta como 1 en el conteo `llamadas`, asista o no. El
 * closer registra igual las que no asistieron: sin eso, la agenda del día
 * dejaría de figurar cuando alguien no vino.
 *
 * 🔴 `activa` es BAJA LÓGICA. El closer se equivoca y borra; el histórico no
 * se toca.
 */
/** 🔴 Sesión 3 · categorías del origen del lead. `''` es el estado
 *  transitorio de las filas creadas antes de la migración 008; el
 *  form obliga a elegir una de las tres al crear una llamada nueva. */
export type OrigenLead = 'organico' | 'anuncios' | 'referidos'

export interface Llamada {
  id: string
  personaId: string
  fecha: string
  asistio: boolean
  reagendada: boolean
  cerro: boolean
  revenueCents: number
  cashCents: number
  nota?: string | null
  activa: boolean
  /** 🔴 Fase D (sesion 2) · nombre del lead que atendió la llamada.
   *  Obligatorio en el form (Zod exige >= 2). En filas viejas puede ser
   *  '' hasta que se editen (el front lo pinta como «(sin nombre)»). */
  leadNombre: string
  /** 🔴 Sesión 3 · de dónde vino el lead. Obligatorio en llamadas nuevas
   *  (Zod exige uno del enum). `''` solo aparece en filas viejas pre-008;
   *  el front omite la pill cuando el valor es ''. */
  origenLead: OrigenLead | ''
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

/**
 * 🔴 Fase C · rol de la APP (no del vendedor).
 *  - `admin`: ve todo (panel completo, gasto, ajustes, equipo). El instalador
 *    lo crea con `persona_id = null` — no es un vendedor.
 *  - `miembro`: ligado a una fila de `personas`. Ve solo sus propios reportes,
 *    sin ranking, sin gasto/CAC (datos del negocio), sin ajustes.
 */
export type RolUsuario = 'admin' | 'miembro'

/** La fila de `usuarios`: liga un auth.users → persona → rol de app. */
export interface Usuario {
  authUserId: string
  personaId: string | null
  rol: RolUsuario
}

/** El usuario actual resuelto desde el proxy o desde el layout. */
export interface Sesion {
  authUserId: string
  correo: string
  usuario: Usuario
  persona: Persona | null
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
  /** 🔴 Fase B · URL pública del logo, o null si no hay. Puede fallar la carga
   *  del `<img>` (bucket caído, URL rota): el topbar cae a `.brand-tile` con
   *  las iniciales, sin console.error, sin pantalla rota. */
  logoUrl: string | null
}
