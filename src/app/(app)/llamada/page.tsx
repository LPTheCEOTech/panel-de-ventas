import Link from 'next/link'
import { redirect } from 'next/navigation'

import { pagina } from '@/shared/calculo/listas'
import { hoyEn } from '@/shared/calculo/periodo'
import { resolverRango } from '@/shared/calculo/rango'
import { IconoAviso } from '@/shared/chasis/iconos'
import { exigirPagina } from '@/shared/datos/guardias'
import { datos } from '@/shared/datos/indice'
import { puede } from '@/shared/datos/permisos'
import { PanelLlamada } from '@/features/llamadas/panel-llamada'

/**
 * 🔴 Fase D · reemplaza a `/reporte-closer`. El closer carga UNA fila por
 * llamada. El admin puede entrar también (backfill del primer mes) y cargar
 * «como» otro closer con el `<select>`.
 */
export default async function LlamadaPage() {
  const capa = datos()
  const [config, { sesion, nivel }] = await Promise.all([capa.leerConfiguracion(), exigirPagina()])
  const hoy = hoyEn(config.zonaHoraria)

  const equipo = await capa.leerPersonas()
  const todas = equipo.filter(
    (p) => p.activo && (p.rol === 'closer' || p.rol === 'ambos')
  )

  // Fase C · si el vendedor logueado no es closer, no tiene nada que cargar.
  // El dueño y el manager cargan por cualquier closer.
  const esMiembro = !puede(nivel, 'cargar-por-otros')
  const propia = esMiembro ? todas.find((p) => p.id === sesion?.usuario.personaId) ?? null : null
  if (esMiembro && !propia) redirect('/panel')

  const personas = esMiembro && propia ? [propia] : todas
  // 🔴 El dueño y el manager arrancan con el select VACÍO, aunque también
  // vendan: si arrancaba con su nombre y cargaban por otro sin tocarlo, la
  // llamada quedaba a su nombre.
  const bloqueadoA = propia?.id ?? undefined

  // De quién es cada llamada de la lista. Solo lo ve quien carga por otros
  // (al vendedor le sobra: siempre es él), y sale de TODAS las personas: una
  // llamada de alguien dado de baja tiene que seguir diciendo de quién es.
  const nombres = esMiembro ? undefined
    : Object.fromEntries(equipo.map((p) => [p.id, p.nombre]))

  // 🔴 La lista de abajo tiene SUS filtros y abre en «Esta semana»: hoy arriba
  // y los días anteriores debajo. Antes era solo hoy, y al pasar la medianoche
  // «se desaparecía» todo. La primera página llega con la pantalla; el resto
  // lo pide la lista. El vendedor ve solo lo suyo.
  const filtro = esMiembro ? propia?.id : undefined
  const semana = resolverRango({ atajo: 'semana' }, hoy, config.inicioSemana)
  const lista = pagina(semana, await capa.leerLlamadas(semana, filtro))
  // El formulario arranca en hoy: su card y el aviso de lead salen de las de hoy.
  const deHoy = lista.filas.filter((l) => l.fecha === hoy)
  // El filtro de persona de la lista: los closers, también los de baja (tienen historia).
  const closers = esMiembro ? undefined : equipo
    .filter((p) => p.rol === 'closer' || p.rol === 'ambos')
    .map(({ id, nombre, activo }) => ({ id, nombre, activo }))

  return (
    <div className="hoja">
      <div className="page-head">
        <div>
          <h1>Post Llamada</h1>
          <div className="sub">una fila por llamada · se carga al terminar</div>
        </div>
      </div>

      {personas.length === 0 ? (
        <div className="card">
          <div className="note warn" style={{ marginTop: 0 }}>
            <IconoAviso />
            <span>
              <b>Todavía no hay closers cargados.</b> Este formulario necesita
              saber quién lo está llenando, así que primero hay que dar de alta
              al equipo.
            </span>
          </div>
          <div className="form-actions">
            <Link className="btn-primary" href="/equipo" style={{ textDecoration: 'none' }}>
              Ir a Equipo
            </Link>
          </div>
        </div>
      ) : (
        <PanelLlamada
          personas={personas}
          hoy={hoy}
          simbolo={config.simbolo}
          deHoy={deHoy}
          bloqueadoA={bloqueadoA}
          nombres={nombres}
          lista={lista}
          closers={closers}
          inicioSemana={config.inicioSemana}
        />
      )}
    </div>
  )
}
