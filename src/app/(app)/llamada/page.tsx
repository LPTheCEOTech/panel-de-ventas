import Link from 'next/link'
import { redirect } from 'next/navigation'

import { hoyEn, ventana } from '@/shared/calculo/periodo'
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
  const v = ventana('dia', hoy, config.inicioSemana)

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

  // Fase D · las llamadas del día para el (miembro) o para todos (admin).
  // La lista arranca poblada — así el contador vivo tiene con qué contar
  // desde el primer render.
  const filtro = esMiembro ? propia?.id : undefined
  const iniciales = await capa.leerLlamadas(v, filtro)

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
          iniciales={iniciales}
          bloqueadoA={bloqueadoA}
          nombres={nombres}
        />
      )}
    </div>
  )
}
