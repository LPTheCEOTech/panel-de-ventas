import { IconoAviso, IconoSalir } from '@/shared/chasis/iconos'

// 🔴 Fase C · fuera de (app) a propósito. Si viviera dentro, el layout
// intentaría cargarla y —al no encontrar `usuarios`— rebotaría a /pendiente
// infinitamente. Acá no hay Topbar ni Nav: no hay panel que mostrar.
export const dynamic = 'force-dynamic'

export default function Pendiente() {
  return (
    <div style={{ maxWidth: 520, margin: '80px auto', padding: '0 20px' }}>
      <div className="card" style={{ padding: 28 }}>
        <div className="note warn" style={{ marginTop: 0, marginBottom: 18 }}>
          <IconoAviso />
          <span>
            <b>Tu correo está en la base pero todavía no lo vincularon con
            nadie del equipo.</b> Sin ese vínculo no podemos mostrarte tu panel
            —ni el ajeno—.
          </span>
        </div>
        <p style={{ fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.5, marginTop: 0 }}>
          Pedile a quien administra el panel que te vincule desde <b>Equipo</b>
          {' '}→ <b>Invitar por correo</b>. Cuando lo haga, la próxima vez que
          entres vas a ver directamente tu panel.
        </p>
        <form action="/api/auth/logout" method="post" style={{ marginTop: 20 }}>
          <button className="btn-ghost" type="submit" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <IconoSalir /> Salir
          </button>
        </form>
      </div>
    </div>
  )
}
