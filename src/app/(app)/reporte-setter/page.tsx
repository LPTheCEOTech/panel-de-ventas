import Link from 'next/link'
import { redirect } from 'next/navigation'

import { pagina } from '@/shared/calculo/listas'
import { hoyEn } from '@/shared/calculo/periodo'
import { resolverRango } from '@/shared/calculo/rango'
import { IconoAviso } from '@/shared/chasis/iconos'
import { exigirPagina } from '@/shared/datos/guardias'
import { datos } from '@/shared/datos/indice'
import { puede } from '@/shared/datos/permisos'
import { FormSetter } from '@/features/reportes/form-setter'

export default async function ReporteSetter() {
  const capa = datos()
  const [config, { sesion, nivel }] = await Promise.all([capa.leerConfiguracion(), exigirPagina()])
  const equipo = await capa.leerPersonas()
  const todas = equipo.filter(
    (p) => p.activo && (p.rol === 'setter' || p.rol === 'ambos')
  )
  // 🔴 Fase C · un vendedor solo puede cargar como sí mismo. Si es setter (o
  // ambos), va con su persona bloqueada; si no lo es, no tiene nada que
  // reportar acá → /panel. El dueño y el manager cargan por cualquiera.
  const esMiembro = !puede(nivel, 'cargar-por-otros')
  const propia = esMiembro ? todas.find((p) => p.id === sesion?.usuario.personaId) ?? null : null
  if (esMiembro && !propia) redirect('/panel')
  const personas = esMiembro && propia ? [propia] : todas
  // 🔴 El dueño y el manager arrancan con el select VACÍO, aunque también
  // vendan: si arrancaba con su nombre y cargaban por otro sin tocarlo, el
  // reporte quedaba a su nombre.
  const bloqueadoA = propia?.id ?? undefined

  // «Reportes cargados» abre en Esta semana. El vendedor ve solo lo suyo y no
  // tiene filtro de persona; el dueño y el manager filtran entre los setters,
  // también los de baja (tienen historia).
  const hoy = hoyEn(config.zonaHoraria)
  const semana = resolverRango({ atajo: 'semana' }, hoy, config.inicioSemana)
  const [filas, conCalificadas] = await Promise.all([
    capa.leerReportesSetter(semana, propia?.id),
    capa.tieneCalificadas(),
  ])
  const lista = pagina(semana, filas)
  const setters = esMiembro ? undefined : equipo
    .filter((p) => p.rol === 'setter' || p.rol === 'ambos')
    .map(({ id, nombre, activo }) => ({ id, nombre, activo }))
  const nombres = Object.fromEntries(
    equipo.filter((p) => !esMiembro || p.id === propia?.id).map((p) => [p.id, p.nombre])
  )

  return (
    /* 🔴 `.hoja` cierra la pagina en 1080 px. Un formulario de cuatro campos
       en 1320 no queda "amplio": queda estirado, con un contador de dos
       digitos ocupando 400 px de ancho. El tablero es ancho porque muestra
       muchas cosas a la vez; esto no. */
    <div className="hoja">
      <div className="page-head">
        <div>
          <h1>Reporte del Setter</h1>
          <div className="sub">fin de día · uno por persona y por día</div>
        </div>
      </div>

      {personas.length === 0 ? (
        <SinPersonas rol="setters" />
      ) : (
        <FormSetter
          personas={personas} hoy={hoy} bloqueadoA={bloqueadoA}
          lista={lista} setters={setters} nombres={nombres} inicioSemana={config.inicioSemana}
          conCalificadas={conCalificadas}
        />
      )}
    </div>
  )
}

/** 🔴 Sin gente cargada, un `<select>` vacío deja a alguien mirando un
 *  formulario que no puede enviar y sin ninguna pista de por qué. */
function SinPersonas({ rol }: { rol: string }) {
  return (
    <div className="card">
      <div className="note warn" style={{ marginTop: 0 }}>
        <IconoAviso />
        <span>
          <b>Todavía no hay {rol} cargados.</b> Este formulario necesita saber quién lo está
          llenando, así que primero hay que dar de alta al equipo.
        </span>
      </div>
      <div className="form-actions">
        <Link className="btn-primary" href="/equipo" style={{ textDecoration: 'none' }}>
          Ir a Equipo
        </Link>
      </div>
    </div>
  )
}
