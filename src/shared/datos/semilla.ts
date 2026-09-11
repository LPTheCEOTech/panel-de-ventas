/**
 * EL BANCO DE PRUEBA. 42 filas que reproducen, al entero, los números del
 * mockup aprobado.
 *
 * 🔴 Por qué existe: un verificador que compara el total contra la suma de sus
 * partes da verde con la base vacía. Los números de oro tienen que venir de
 * AFUERA — y el mockup es un documento que ya no cambia. Se comprobó con
 * aritmética que sus números cierran hasta el nivel de persona:
 *
 *     119 + 120 + 103 = 342 leads          38 + 36 + 30 = 104 agendas
 *      39 +  34 +  23 =  96 llamadas       26 + 23 + 14 =  63 asistieron
 *      11 +   8 +   4 =  23 cierres        19.800 + 14.400 + 7.200 = 41.400
 *     y el % de cobro da 60% exacto en los tres closers.
 *
 * 🔴 Todo lo que planta esta semilla queda marcado `es_demo = true`, y
 * `npm run semilla -- limpiar` borra EXACTAMENTE eso. Nunca toca una fila real:
 * un seeder que estampa sobre datos de verdad ya nos costó caro antes.
 *
 * 🔴 El instalador NO corre esto. Una instalación nueva arranca vacía, y así
 * tiene que verse bien.
 */
import type { Gasto, Persona, ReporteCloser, ReporteSetter } from '@/shared/tipos'

/** Lunes 20 a domingo 26 de julio de 2026 — una semana real del calendario. */
export const SEMANA_ORO = ['2026-07-20','2026-07-21','2026-07-22','2026-07-23','2026-07-24','2026-07-25','2026-07-26'] as const
export const DIA_ORO = '2026-07-23' // el jueves, el día de más cash

export const PERSONAS_DEMO: Persona[] = [
  { id: 'demo-sofia',     nombre: 'Sofía Lara',    rol: 'setter', activo: true, orden: 1 },
  { id: 'demo-mateo',     nombre: 'Mateo Gil',     rol: 'setter', activo: true, orden: 2 },
  { id: 'demo-valentina', nombre: 'Valentina Paz', rol: 'setter', activo: true, orden: 3 },
  { id: 'demo-andrea',    nombre: 'Andrea Ríos',   rol: 'closer', activo: true, orden: 4 },
  { id: 'demo-diego',     nombre: 'Diego Torres',  rol: 'closer', activo: true, orden: 5 },
  { id: 'demo-carlos',    nombre: 'Carlos Méndez', rol: 'closer', activo: true, orden: 6 },
]

/** [conversaciones por día, agendas por día] — la suma es el total de la semana. */
const SETTERS: Record<string, [number[], number[]]> = {
  'demo-sofia':     [[20, 19, 18, 17, 16, 15, 14], [7, 6, 6, 5, 5, 5, 4]], // 119 / 38
  'demo-mateo':     [[18, 18, 18, 17, 17, 16, 16], [6, 6, 5, 5, 5, 5, 4]], // 120 / 36
  'demo-valentina': [[16, 16, 15, 15, 14, 14, 13], [5, 5, 5, 4, 4, 4, 3]], // 103 / 30
}

/** [llamadas, asistieron, reagendadas, cierres, cash en DÓLARES] por día. */
const CLOSERS: Record<string, [number[], number[], number[], number[], number[]]> = {
  'demo-andrea': [
    [6, 6, 6, 6, 5, 5, 5],            // 39 llamadas
    [4, 4, 4, 4, 4, 3, 3],            // 26 asistieron
    [1, 0, 1, 1, 0, 1, 0],            // reagendadas
    [2, 2, 1, 2, 2, 1, 1],            // 11 cierres
    [2500, 3500, 3000, 4200, 3200, 2200, 1200], // $19.800
  ],
  'demo-diego': [
    [5, 5, 5, 5, 5, 5, 4],            // 34
    [4, 3, 3, 4, 3, 3, 3],            // 23
    [0, 1, 1, 0, 1, 0, 1],
    [1, 1, 1, 2, 1, 1, 1],            // 8
    [1800, 2500, 2200, 3000, 2300, 1600, 1000], // $14.400
  ],
  'demo-carlos': [
    [4, 4, 3, 3, 3, 3, 3],            // 23
    [2, 2, 2, 2, 2, 2, 2],            // 14
    [1, 0, 0, 1, 1, 0, 0],
    [1, 1, 0, 1, 1, 0, 0],            // 4
    [900, 1200, 1100, 1500, 1100, 700, 700],   // $7.200
  ],
}

/**
 * El ticket es de $3.000 y el revenue del día sale de los cierres del día. Así
 * el revenue de cada closer da su `cierres × 3.000` y el total da $69.000, que
 * es justo lo que dice el mockup ("Ticket promedio $3,000 · 23 cierres").
 */
const TICKET_CENTS = 300_000

export const REPORTES_SETTER_DEMO: ReporteSetter[] = Object.entries(SETTERS).flatMap(
  ([personaId, [convs, agendas]]) =>
    SEMANA_ORO.map((fecha, i) => ({
      fecha,
      personaId,
      conversaciones: convs[i],
      agendas: agendas[i],
    }))
)

export const REPORTES_CLOSER_DEMO: ReporteCloser[] = Object.entries(CLOSERS).flatMap(
  ([personaId, [llamadas, asistieron, reagendadas, cierres, cash]]) =>
    SEMANA_ORO.map((fecha, i) => ({
      fecha,
      personaId,
      llamadas: llamadas[i],
      asistieron: asistieron[i],
      reagendadas: reagendadas[i],
      cierres: cierres[i],
      revenueCents: cierres[i] * TICKET_CENTS,
      cashCents: cash[i] * 100,
    }))
)

/**
 * Un gasto por día en la semana de oro. Suma $14.400 en la semana — el
 * verificador de la Fase A cuenta contra este total.
 *
 * 🔴 Los números NO están calzados a los del mockup (el mockup no dibuja gasto
 * todavía). Son un banco de prueba interno cuya suma es un número redondo y
 * simpático para que las tres derivadas caigan con centavos limpios:
 *   AOV      = 41.400 / 23 = 1.800 exacto
 *   CAC      = 14.400 / 23 = 626,08…
 *   c/asist. = 14.400 / 63 = 228,57…
 */
export const GASTOS_DEMO: Gasto[] = SEMANA_ORO.map((fecha, i) => ({
  fecha,
  montoCents: [200_000, 220_000, 210_000, 230_000, 220_000, 190_000, 170_000][i],
  nota: null,
}))

/**
 * Los números de oro, escritos a mano desde el mockup. NO se derivan de las
 * tablas de arriba: si se derivaran, el verificador estaría comparando la
 * semilla consigo misma y daría verde pase lo que pase.
 */
export const ORO = {
  filas: 42,
  leads: 342, agendas: 104, llamadas: 96, asistieron: 63, cierres: 23,
  revenue: 69_000_00, cash: 41_400_00,
  tasaAgenda: '30.4%', tasaAsistencia: '65.6%', tasaCierre: '36.5%',
  cobro: '60%', ticketPromedio: 3_000_00,
  llamadasSobreAgendas: '92%',
  closers: [
    { nombre: 'Andrea Ríos',   cash: 19_800_00, cierres: 11, tasaCierre: '42%' },
    { nombre: 'Diego Torres',  cash: 14_400_00, cierres: 8,  tasaCierre: '35%' },
    { nombre: 'Carlos Méndez', cash: 7_200_00,  cierres: 4,  tasaCierre: '29%' },
  ],
  setters: [
    { nombre: 'Sofía Lara',    agendas: 38, leads: 119, tasaAgenda: '32%' },
    { nombre: 'Mateo Gil',     agendas: 36, leads: 120, tasaAgenda: '30%' },
    { nombre: 'Valentina Paz', agendas: 30, leads: 103, tasaAgenda: '29%' },
  ],
  cashPorDia: [5_200_00, 7_200_00, 6_300_00, 8_700_00, 6_600_00, 4_500_00, 2_900_00],
  // Fase A · gasto y derivados. En centavos, como todo el resto de la plata.
  gastoSemana:    14_400_00,   // 1.440.000 c = $14.400
  cacSemana:         626_09,   // Math.round(1_440_000 / 23) = 62_609
  costoAsistida:     228_57,   // Math.round(1_440_000 / 63) = 22_857
  aovSemana:       1_800_00,   // Math.round(4_140_000 / 23) = 180_000 (exacto)
} as const
