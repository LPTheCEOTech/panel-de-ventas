import { redirect } from 'next/navigation'

import { IconoEngranaje } from '@/shared/chasis/iconos'
import { datos } from '@/shared/datos/indice'
import { sesionActual } from '@/shared/datos/sesion-usuario'
import { PanelAjustes } from '@/features/ajustes/panel'

export default async function Ajustes() {
  // 🔴 Fase C · Ajustes toca datos del negocio (nombre, moneda, logo, marca).
  // Solo admin. Un miembro que llegue por URL directa va a /panel.
  const sesion = await sesionActual()
  if (sesion && sesion.usuario.rol !== 'admin') redirect('/panel')
  const config = await datos().leerConfiguracion()
  return (
    <div className="hoja">
      <div className="page-head">
        <div>
          <h1>Ajustes</h1>
          <div className="sub">cómo se llama y cómo cuenta</div>
        </div>
      </div>

      <div className="what read">
        <IconoEngranaje />
        <span>
          Esto es lo único que hay que tocar para que el panel sea <b>tuyo</b> y no de otro.
          Nada de esto está escrito en el código.
        </span>
        <span className="badge-w">Se carga a mano</span>
      </div>

      <PanelAjustes inicial={config} />
    </div>
  )
}
