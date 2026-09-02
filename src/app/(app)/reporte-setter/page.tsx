import Link from 'next/link'

import { hoyEn } from '@/shared/calculo/periodo'
import { IconoAviso } from '@/shared/chasis/iconos'
import { datos } from '@/shared/datos/indice'
import { FormSetter } from '@/features/reportes/form-setter'

export default async function ReporteSetter() {
  const capa = datos()
  const config = await capa.leerConfiguracion()
  const personas = (await capa.leerPersonas()).filter(
    (p) => p.activo && (p.rol === 'setter' || p.rol === 'ambos')
  )

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Reporte del Setter</h1>
          <div className="sub">fin de día · uno por persona y por día</div>
        </div>
      </div>

      {personas.length === 0 ? (
        <SinPersonas rol="setters" />
      ) : (
        <FormSetter personas={personas} hoy={hoyEn(config.zonaHoraria)} />
      )}
    </>
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
