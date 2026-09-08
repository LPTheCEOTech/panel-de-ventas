import Link from 'next/link'

import { hoyEn } from '@/shared/calculo/periodo'
import { IconoAviso } from '@/shared/chasis/iconos'
import { datos } from '@/shared/datos/indice'
import { FormCloser } from '@/features/reportes/form-closer'

export default async function ReporteCloser() {
  const capa = datos()
  const config = await capa.leerConfiguracion()
  const personas = (await capa.leerPersonas()).filter(
    (p) => p.activo && (p.rol === 'closer' || p.rol === 'ambos')
  )

  return (
    /* 🔴 `.hoja` cierra la pagina en 1080 px. Un formulario de cuatro campos
       en 1320 no queda "amplio": queda estirado, con un contador de dos
       digitos ocupando 400 px de ancho. El tablero es ancho porque muestra
       muchas cosas a la vez; esto no. */
    <div className="hoja">
      <div className="page-head">
        <div>
          <h1>Reporte del Closer</h1>
          <div className="sub">fin de día · uno por persona y por día</div>
        </div>
      </div>

      {personas.length === 0 ? (
        <div className="card">
          <div className="note warn" style={{ marginTop: 0 }}>
            <IconoAviso />
            <span>
              <b>Todavía no hay closers cargados.</b> Este formulario necesita saber quién lo
              está llenando, así que primero hay que dar de alta al equipo.
            </span>
          </div>
          <div className="form-actions">
            <Link className="btn-primary" href="/equipo" style={{ textDecoration: 'none' }}>
              Ir a Equipo
            </Link>
          </div>
        </div>
      ) : (
        <FormCloser
          personas={personas}
          hoy={hoyEn(config.zonaHoraria)}
          simbolo={config.simbolo}
        />
      )}
    </div>
  )
}
