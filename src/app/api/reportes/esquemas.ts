import { z } from 'zod'

import { esFecha } from '@/shared/calculo/rango'

/**
 * Lo que la API acepta. Se valida acá y no en el formulario: el formulario es
 * una comodidad, la API es la puerta. Un `fetch` a mano tiene que chocar con
 * las mismas reglas.
 */
const fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha tiene que ser AAAA-MM-DD')
const personaId = z.string().min(1).max(64)
// tope de cordura: nadie hace 10.000 llamadas en un día, y un número enorme
// pegado de más no puede quedar guardado como si fuera real
const entero = z.number().int().min(0).max(100_000)
// $10.000.000 en centavos
const dineroCents = z.number().int().min(0).max(1_000_000_000)

/**
 * 🔴 `calificadas` es opcional para la API: una base sin la 009 nunca la
 * manda, y un reporte viejo corregido puede seguir «sin medir». Que sea
 * obligatoria en un reporte nuevo lo decide el formulario, que sabe si la base
 * la tiene. Lo que la API sí garantiza: nunca más que las agendas.
 */
export const zSetter = z.object({
  fecha, personaId,
  conversaciones: entero,
  agendas: entero,
  calificadas: entero.nullable().optional(),
}).refine((r) => r.calificadas == null || r.calificadas <= r.agendas, {
  message: 'Las agendas calificadas no pueden ser más que las agendas.',
  path: ['calificadas'],
})

export const zCloser = z.object({
  fecha, personaId,
  llamadas: entero, asistieron: entero, reagendadas: entero, cierres: entero,
  revenueCents: dineroCents, cashCents: dineroCents,
})

export const zConsulta = z.object({ fecha, persona: personaId })

// Fase A · Gasto. No es un reporte por persona: es un gasto diario del negocio.
export const zGasto = z.object({
  fecha,
  montoCents: dineroCents,
  nota: z.string().trim().max(500).nullable().optional(),
})

/** Solo la fecha (para el GET /api/gasto?fecha=…). */
export const zConsultaGasto = z.object({ fecha })

/**
 * Las llamadas de UN día (GET /api/llamadas?fecha=…&persona=…). La fecha tiene
 * que existir de verdad: un `2026-02-30` llegaría a Postgres y reventaría en
 * un 500 en vez de un 400.
 */
export const zConsultaLlamadas = z.object({
  fecha: fecha.refine(esFecha, 'Esa fecha no existe'),
  persona: personaId.optional(),
})
