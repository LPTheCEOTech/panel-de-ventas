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
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

import type { Configuracion, Gasto, Llamada, Persona, ReporteCloser, ReporteSetter, Rol, RolUsuario, Usuario, Ventana } from '@/shared/tipos'
import { dentro } from '@/shared/calculo/periodo'
import { GASTOS_DEMO, LLAMADAS_DEMO, PERSONAS_DEMO, REPORTES_CLOSER_DEMO, REPORTES_SETTER_DEMO } from './semilla'
import { CONFIGURACION_POR_DEFECTO, type CapaDeDatos } from './interfaz'

interface EstadoDemo {
  config: Configuracion
  personas: Persona[]
  setter: ReporteSetter[]
  closer: ReporteCloser[]
  gastos: Gasto[]
  usuarios: Usuario[]
  llamadas: Llamada[]
}

/**
 * 🔴 El estado se guarda en un ARCHIVO, no en memoria.
 *
 * Se intentó primero con variables del módulo y después con `globalThis`, y las
 * dos fallaron igual: en `next dev` la ruta de API y el render del servidor no
 * comparten proceso, así que cada lado tiene su propia memoria. El síntoma
 * engaña de manual — agregar a alguien devuelve **200 OK**, el refresco corre,
 * y la lista sigue vacía. El POST escribió donde la página no lee.
 *
 * Un archivo es lo único que ven los dos procesos. Vive en el directorio
 * temporal del sistema: no ensucia el repo y se lo lleva el reinicio.
 *
 * Con Supabase nada de esto existe (los dos lados hablan con la misma base).
 */
function archivo(vacia: boolean): string {
  return join(tmpdir(), 'panel-de-ventas-demo', vacia ? 'vacia.json' : 'semilla.json')
}

function inicial(vacia: boolean): EstadoDemo {
  if (vacia) {
    return {
      config: { ...CONFIGURACION_POR_DEFECTO, nombreNegocio: 'Mi Negocio', iniciales: 'MN', usuarioNombre: 'Yo' },
      personas: [], setter: [], closer: [], gastos: [], usuarios: [], llamadas: [],
    }
  }
  return {
    config: { ...CONFIGURACION_POR_DEFECTO, nombreNegocio: 'LP Ventas', iniciales: 'LP', usuarioNombre: 'Leandro P.' },
    personas: PERSONAS_DEMO.map((p) => ({ ...p })),
    setter: REPORTES_SETTER_DEMO.map((r) => ({ ...r })),
    closer: REPORTES_CLOSER_DEMO.map((r) => ({ ...r })),
    gastos: GASTOS_DEMO.map((g) => ({ ...g })),
    usuarios: [],
    llamadas: LLAMADAS_DEMO.map((l) => ({ ...l })),
  }
}

function leer(vacia: boolean): EstadoDemo {
  const f = archivo(vacia)
  if (existsSync(f)) {
    try {
      return JSON.parse(readFileSync(f, 'utf8')) as EstadoDemo
    } catch {
      // un archivo a medio escribir no puede dejar la app sin arrancar
    }
  }
  const e = inicial(vacia)
  escribir(vacia, e)
  return e
}

function escribir(vacia: boolean, e: EstadoDemo): void {
  const f = archivo(vacia)
  mkdirSync(dirname(f), { recursive: true })
  writeFileSync(f, JSON.stringify(e, null, 2))
}

/** Reemplaza la fila de esa persona y ese día, o la agrega. Es el mismo
 *  comportamiento que el `upsert` con `onConflict` de la capa real. */
function upsert<T extends { fecha: string; personaId: string }>(lista: T[], fila: T) {
  const i = lista.findIndex((r) => r.fecha === fila.fecha && r.personaId === fila.personaId)
  if (i >= 0) lista[i] = fila
  else lista.push(fila)
}

export function capaDemo(vacia = false): CapaDeDatos {
  // se relee en CADA operación: el otro proceso pudo haber escrito
  const con = <T,>(f: (e: EstadoDemo) => T): T => {
    const e = leer(vacia)
    const r = f(e)
    escribir(vacia, e)
    return r
  }
  return {
    motor: 'demo',
    async leerConfiguracion() { return { ...leer(vacia).config } },
    async guardarConfiguracion(c) { con((e) => Object.assign(e.config, c)) },
    async leerPersonas() { return leer(vacia).personas.map((p) => ({ ...p })) },
    async crearPersona(nombre, rol: Rol) {
      return con((e) => {
        if (e.personas.some((x) => x.nombre.trim().toLowerCase() === nombre.trim().toLowerCase())) {
          throw new Error('duplicate: ya hay alguien con ese nombre')
        }
        const p: Persona = { id: `demo-${Date.now()}`, nombre, rol, activo: true, orden: e.personas.length + 1 }
        e.personas.push(p)
        return p
      })
    },
    async cambiarActivo(id, activo) {
      con((e) => {
        const p = e.personas.find((x) => x.id === id)
        if (p) p.activo = activo
      })
    },
    async leerReportesSetter(v: Ventana, personaId?: string) {
      return leer(vacia).setter.filter((r) => dentro(r.fecha, v) && (!personaId || r.personaId === personaId))
    },
    async leerReportesCloser(v: Ventana, personaId?: string) {
      return leer(vacia).closer.filter((r) => dentro(r.fecha, v) && (!personaId || r.personaId === personaId))
    },
    async buscarReporteSetter(fecha, personaId) {
      return leer(vacia).setter.find((r) => r.fecha === fecha && r.personaId === personaId) ?? null
    },
    async buscarReporteCloser(fecha, personaId) {
      return leer(vacia).closer.find((r) => r.fecha === fecha && r.personaId === personaId) ?? null
    },
    async guardarReporteSetter(r) { con((e) => upsert(e.setter, r)) },
    async guardarReporteCloser(r) { con((e) => upsert(e.closer, r)) },

    async buscarGasto(fecha) {
      // el estado viejo (sin la clave `gastos`) puede quedar en disco de una
      // corrida previa a la Fase A. Se trata como si no hubiera gasto.
      return leer(vacia).gastos?.find((g) => g.fecha === fecha) ?? null
    },
    async sumaGastos(v: Ventana) {
      return (leer(vacia).gastos ?? [])
        .filter((g) => dentro(g.fecha, v))
        .reduce((s, g) => s + g.montoCents, 0)
    },
    async guardarGasto(g) {
      con((e) => {
        if (!e.gastos) e.gastos = []
        const i = e.gastos.findIndex((x) => x.fecha === g.fecha)
        if (i >= 0) e.gastos[i] = g
        else e.gastos.push(g)
      })
    },

    async buscarUsuario(authUserId) {
      return leer(vacia).usuarios?.find((u) => u.authUserId === authUserId) ?? null
    },
    async buscarUsuarioPorPersona(personaId) {
      return leer(vacia).usuarios?.find((u) => u.personaId === personaId) ?? null
    },
    async crearUsuario(authUserId, personaId, rol: RolUsuario) {
      return con((e) => {
        if (!e.usuarios) e.usuarios = []
        const u: Usuario = { authUserId, personaId, rol }
        e.usuarios.push(u)
        return u
      })
    },
    async borrarUsuario(authUserId) {
      con((e) => {
        if (!e.usuarios) e.usuarios = []
        e.usuarios = e.usuarios.filter((u) => u.authUserId !== authUserId)
      })
    },

    async leerLlamadas(v, personaId) {
      return (leer(vacia).llamadas ?? [])
        .filter((l) => l.activa && dentro(l.fecha, v) && (!personaId || l.personaId === personaId))
    },
    async crearLlamada(l) {
      return con((e) => {
        if (!e.llamadas) e.llamadas = []
        const nueva: Llamada = { ...l, id: `demo-l-${Date.now()}-${Math.floor(Math.random() * 1000)}`, activa: true }
        e.llamadas.push(nueva)
        return nueva
      })
    },
    async actualizarLlamada(id, cambios) {
      con((e) => {
        if (!e.llamadas) e.llamadas = []
        const i = e.llamadas.findIndex((l) => l.id === id)
        if (i >= 0) e.llamadas[i] = { ...e.llamadas[i], ...cambios }
      })
    },
    async bajaLogicaLlamada(id) {
      con((e) => {
        if (!e.llamadas) e.llamadas = []
        const i = e.llamadas.findIndex((l) => l.id === id)
        if (i >= 0) e.llamadas[i] = { ...e.llamadas[i], activa: false }
      })
    },
  }
}
