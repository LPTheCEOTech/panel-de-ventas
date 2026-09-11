import 'server-only'

import type { Configuracion, Gasto, Persona, ReporteCloser, ReporteSetter, Rol, Ventana } from '@/shared/tipos'
import { CONFIGURACION_POR_DEFECTO, type CapaDeDatos } from '../interfaz'
import { clienteServidor } from './cliente'

/**
 * La capa real. Cada método hace UNA consulta y traduce las columnas de la base
 * (snake_case) a los nombres del dominio (camelCase). La traducción vive solo
 * acá: ninguna pantalla sabe cómo se llaman las columnas.
 *
 * 🔴 Ninguna consulta pagina, y es a propósito: el techo natural de esta app es
 * `personas × días del mes`, que con 20 vendedores son 620 filas. Si alguna vez
 * un negocio pasara las 1.000, PostgREST cortaría en silencio — por eso
 * `verificar.mjs` cuenta filas contra un número esperado, que es lo único que
 * delata un corte silencioso.
 */
const F_SETTER = 'fecha, persona_id, conversaciones, agendas'
const F_CLOSER = 'fecha, persona_id, llamadas, asistieron, reagendadas, cierres, revenue_cents, cash_cents'

type FilaSetter = { fecha: string; persona_id: string; conversaciones: number; agendas: number }
type FilaCloser = {
  fecha: string; persona_id: string; llamadas: number; asistieron: number
  reagendadas: number; cierres: number; revenue_cents: number; cash_cents: number
}

const aSetter = (f: FilaSetter): ReporteSetter => ({
  fecha: f.fecha, personaId: f.persona_id,
  conversaciones: f.conversaciones, agendas: f.agendas,
})

const aCloser = (f: FilaCloser): ReporteCloser => ({
  fecha: f.fecha, personaId: f.persona_id,
  llamadas: f.llamadas, asistieron: f.asistieron, reagendadas: f.reagendadas,
  cierres: f.cierres, revenueCents: f.revenue_cents, cashCents: f.cash_cents,
})

function reventar(donde: string, error: { message: string } | null): void {
  if (error) throw new Error(`[datos] ${donde}: ${error.message}`)
}

export function capaSupabase(url: string, servicio: string): CapaDeDatos {
  const sb = clienteServidor(url, servicio)

  return {
    motor: 'supabase',

    async leerConfiguracion(): Promise<Configuracion> {
      const { data, error } = await sb.from('configuracion').select('*').eq('id', 1).maybeSingle()
      reventar('leerConfiguracion', error)
      if (!data) {
        throw new Error(
          'La tabla `configuracion` está vacía. Corré `npm run instalar` — es el paso que ' +
            'crea el esquema, la configuración y el primer usuario.'
        )
      }
      return {
        nombreNegocio: data.nombre_negocio, iniciales: data.iniciales,
        usuarioNombre: data.usuario_nombre, usuarioRol: data.usuario_rol,
        marca: data.marca, moneda: data.moneda, simbolo: data.simbolo,
        zonaHoraria: data.zona_horaria, inicioSemana: data.inicio_semana as 0 | 1,
        rankingVisible: data.ranking_visible,
      }
    },

    async guardarConfiguracion(c: Partial<Configuracion>): Promise<void> {
      const fila: Record<string, unknown> = { actualizado_en: new Date().toISOString() }
      const mapa: Record<keyof Configuracion, string> = {
        nombreNegocio: 'nombre_negocio', iniciales: 'iniciales',
        usuarioNombre: 'usuario_nombre', usuarioRol: 'usuario_rol', marca: 'marca',
        moneda: 'moneda', simbolo: 'simbolo', zonaHoraria: 'zona_horaria',
        inicioSemana: 'inicio_semana', rankingVisible: 'ranking_visible',
      }
      for (const [k, v] of Object.entries(c)) {
        const col = mapa[k as keyof Configuracion]
        if (col && v !== undefined) fila[col] = v
      }
      const { error } = await sb.from('configuracion').update(fila).eq('id', 1)
      reventar('guardarConfiguracion', error)
    },

    async leerPersonas(): Promise<Persona[]> {
      const { data, error } = await sb
        .from('personas').select('id, nombre, rol, activo, orden').order('orden')
      reventar('leerPersonas', error)
      return (data ?? []).map((p) => ({
        id: p.id, nombre: p.nombre, rol: p.rol as Rol, activo: p.activo, orden: p.orden,
      }))
    },

    async crearPersona(nombre: string, rol: Rol): Promise<Persona> {
      const { data, error } = await sb
        .from('personas').insert({ nombre: nombre.trim(), rol }).select().single()
      reventar('crearPersona', error)
      return { id: data!.id, nombre: data!.nombre, rol: data!.rol as Rol, activo: data!.activo, orden: data!.orden }
    },

    async cambiarActivo(id: string, activo: boolean): Promise<void> {
      // 🔴 Baja LÓGICA. No hay DELETE de personas en ninguna parte de la app:
      // borrar a alguien dejaría sin dueño los reportes que ya cargó.
      const { error } = await sb.from('personas').update({ activo }).eq('id', id)
      reventar('cambiarActivo', error)
    },

    async leerReportesSetter(v: Ventana): Promise<ReporteSetter[]> {
      const { data, error } = await sb
        .from('reportes_setter').select(F_SETTER)
        .gte('fecha', v.desde).lte('fecha', v.hasta).order('fecha')
      reventar('leerReportesSetter', error)
      return (data ?? []).map(aSetter)
    },

    async leerReportesCloser(v: Ventana): Promise<ReporteCloser[]> {
      const { data, error } = await sb
        .from('reportes_closer').select(F_CLOSER)
        .gte('fecha', v.desde).lte('fecha', v.hasta).order('fecha')
      reventar('leerReportesCloser', error)
      return (data ?? []).map(aCloser)
    },

    async buscarReporteSetter(fecha: string, personaId: string) {
      const { data, error } = await sb
        .from('reportes_setter').select(F_SETTER)
        .eq('fecha', fecha).eq('persona_id', personaId).maybeSingle()
      reventar('buscarReporteSetter', error)
      return data ? aSetter(data) : null
    },

    async buscarReporteCloser(fecha: string, personaId: string) {
      const { data, error } = await sb
        .from('reportes_closer').select(F_CLOSER)
        .eq('fecha', fecha).eq('persona_id', personaId).maybeSingle()
      reventar('buscarReporteCloser', error)
      return data ? aCloser(data) : null
    },

    async guardarReporteSetter(r: ReporteSetter): Promise<void> {
      // `onConflict` nombra la restricción única: si el día ya existe, se
      // REEMPLAZA. Un insert sin esto duplicaría el día y el panel sumaría dos
      // veces sin que nadie lo note.
      const { error } = await sb.from('reportes_setter').upsert(
        {
          fecha: r.fecha, persona_id: r.personaId,
          conversaciones: r.conversaciones, agendas: r.agendas,
          actualizado_en: new Date().toISOString(),
        },
        { onConflict: 'fecha,persona_id' }
      )
      reventar('guardarReporteSetter', error)
    },

    async guardarReporteCloser(r: ReporteCloser): Promise<void> {
      const { error } = await sb.from('reportes_closer').upsert(
        {
          fecha: r.fecha, persona_id: r.personaId,
          llamadas: r.llamadas, asistieron: r.asistieron, reagendadas: r.reagendadas,
          cierres: r.cierres, revenue_cents: r.revenueCents, cash_cents: r.cashCents,
          actualizado_en: new Date().toISOString(),
        },
        { onConflict: 'fecha,persona_id' }
      )
      reventar('guardarReporteCloser', error)
    },

    async buscarGasto(fecha: string): Promise<Gasto | null> {
      const { data, error } = await sb
        .from('gastos').select('fecha, monto_cents, nota')
        .eq('fecha', fecha).maybeSingle()
      reventar('buscarGasto', error)
      return data ? { fecha: data.fecha, montoCents: data.monto_cents, nota: data.nota } : null
    },

    async sumaGastos(v: Ventana): Promise<number> {
      // 🔴 Suma en JS. Un `.select('sum(...)')` de PostgREST requiere una vista
      // o RPC; la ventana natural son ≤ 31 filas y traerlas y sumar es más
      // simple, con la misma restricción de fila (unique fecha) que garantiza
      // que no hay duplicados. Igual patrón que `leerReportes*`.
      const { data, error } = await sb
        .from('gastos').select('monto_cents')
        .gte('fecha', v.desde).lte('fecha', v.hasta)
      reventar('sumaGastos', error)
      return (data ?? []).reduce((s, f) => s + Number(f.monto_cents), 0)
    },

    async guardarGasto(g: Gasto): Promise<void> {
      const { error } = await sb.from('gastos').upsert(
        {
          fecha: g.fecha,
          monto_cents: g.montoCents,
          nota: g.nota ?? null,
          actualizado_en: new Date().toISOString(),
        },
        { onConflict: 'fecha' }
      )
      reventar('guardarGasto', error)
    },
  }
}

export { CONFIGURACION_POR_DEFECTO }
