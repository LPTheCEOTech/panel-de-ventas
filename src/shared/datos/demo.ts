/**
 * La capa de datos de DESARROLLO: la semilla del mockup, en memoria.
 *
 * 🔴 Existe por una sola razón: poder construir y validar por foto las
 * pantallas antes de que exista el proyecto de Supabase. Es de solo lectura en
 * la práctica — lo que se escribe vive hasta que se recarga el proceso.
 *
 * 🔴 Y NO puede correr en producción. Si alguna vez faltaran las variables de
 * entorno en Vercel, esta capa haría que la app se viera perfecta con los
 * datos de ejemplo de otra persona: el peor final posible. Por eso
 * `indice.ts` tira en producción en vez de caer acá.
 */
import type { Configuracion, Persona, ReporteCloser, ReporteSetter, Rol, Ventana } from '@/shared/tipos'
import { dentro } from '@/shared/calculo/periodo'
import { PERSONAS_DEMO, REPORTES_CLOSER_DEMO, REPORTES_SETTER_DEMO } from './semilla'
import { CONFIGURACION_POR_DEFECTO, type CapaDeDatos } from './interfaz'

const config: Configuracion = {
  ...CONFIGURACION_POR_DEFECTO,
  nombreNegocio: 'LP Ventas',
  iniciales: 'LP',
  usuarioNombre: 'Leandro P.',
}

const personas: Persona[] = PERSONAS_DEMO.map((p) => ({ ...p }))
const setter: ReporteSetter[] = REPORTES_SETTER_DEMO.map((r) => ({ ...r }))
const closer: ReporteCloser[] = REPORTES_CLOSER_DEMO.map((r) => ({ ...r }))

function upsert<T extends { fecha: string; personaId: string }>(lista: T[], fila: T) {
  const i = lista.findIndex((r) => r.fecha === fila.fecha && r.personaId === fila.personaId)
  if (i >= 0) lista[i] = fila
  else lista.push(fila)
}

export function capaDemo(vacia = false): CapaDeDatos {
  const P = vacia ? [] : personas
  const S = vacia ? [] : setter
  const C = vacia ? [] : closer
  return {
    motor: 'demo',
    async leerConfiguracion() { return { ...config } },
    async guardarConfiguracion(c) { Object.assign(config, c) },
    async leerPersonas() { return P.map((p) => ({ ...p })) },
    async crearPersona(nombre, rol: Rol) {
      const p: Persona = { id: `demo-${Date.now()}`, nombre, rol, activo: true, orden: P.length + 1 }
      P.push(p)
      return p
    },
    async cambiarActivo(id, activo) {
      const p = P.find((x) => x.id === id)
      if (p) p.activo = activo
    },
    async leerReportesSetter(v: Ventana) { return S.filter((r) => dentro(r.fecha, v)).map((r) => ({ ...r })) },
    async leerReportesCloser(v: Ventana) { return C.filter((r) => dentro(r.fecha, v)).map((r) => ({ ...r })) },
    async buscarReporteSetter(fecha, personaId) {
      return S.find((r) => r.fecha === fecha && r.personaId === personaId) ?? null
    },
    async buscarReporteCloser(fecha, personaId) {
      return C.find((r) => r.fecha === fecha && r.personaId === personaId) ?? null
    },
    async guardarReporteSetter(r) { upsert(S, r) },
    async guardarReporteCloser(r) { upsert(C, r) },
  }
}
