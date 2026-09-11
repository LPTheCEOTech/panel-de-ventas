import Link from 'next/link'
import { redirect } from 'next/navigation'

import { hoyEn } from '@/shared/calculo/periodo'
import { IconoAviso } from '@/shared/chasis/iconos'
import { datos } from '@/shared/datos/indice'
import { sesionActual } from '@/shared/datos/sesion-usuario'
import { FormSetter } from '@/features/reportes/form-setter'

export default async function ReporteSetter() {
  const capa = datos()
  const [config, sesion] = await Promise.all([capa.leerConfiguracion(), sesionActual()])
  const todas = (await capa.leerPersonas()).filter(
    (p) => p.activo && (p.rol === 'setter' || p.rol === 'ambos')
  )
  // 🔴 Fase C · un miembro solo puede cargar como sí mismo. Si es setter (o
  // ambos), va con su persona bloqueada; si no lo es, no tiene nada que
  // reportar acá → /panel.
  const esMiembro = sesion?.usuario.rol === 'miembro'
  const propia = esMiembro ? todas.find((p) => p.id === sesion?.usuario.personaId) ?? null : null
  if (esMiembro && !propia) redirect('/panel')
  const personas = esMiembro && propia ? [propia] : todas
  const bloqueadoA = propia?.id ?? undefined

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
        <FormSetter personas={personas} hoy={hoyEn(config.zonaHoraria)} bloqueadoA={bloqueadoA} />
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
