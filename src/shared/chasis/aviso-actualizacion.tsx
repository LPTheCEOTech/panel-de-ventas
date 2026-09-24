'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

import estilos from './aviso-actualizacion.module.css'

/**
 * La barra que le avisa al admin que su base necesita una actualización, con
 * el botón que la aplica. Un clic y listo: sin Supabase, sin copiar SQL.
 *
 * `sinActualizador` es el caso de una base instalada antes de que existiera
 * el actualizador: ahí el botón no puede hacer nada y hay que decirlo claro.
 */
export function AvisoActualizacion({
  titulos, sinActualizador,
}: {
  titulos: string[]
  sinActualizador: boolean
}) {
  const router = useRouter()
  const [estado, setEstado] = useState<'espera' | 'aplicando' | 'listo' | 'error'>('espera')
  const [error, setError] = useState('')

  async function aplicar() {
    setEstado('aplicando'); setError('')
    try {
      const r = await fetch('/api/actualizar-base', { method: 'POST' })
      const d = await r.json().catch(() => null)
      if (!r.ok) { setError(d?.error ?? 'No se pudo actualizar.'); setEstado('error'); return }
      setEstado('listo')
      // 🔴 El refresh espera dos segundos a propósito. Al refrescar, el
      // servidor ya no ve nada pendiente y deja de renderizar esta barra: si
      // se llamara al toque, el aviso se esfumaría sin que el alumno llegue a
      // leer que salió bien, y quedaría dudando si se aplicó o no.
      setTimeout(() => router.refresh(), 2000)
    } catch {
      setError('No se pudo hablar con el servidor.'); setEstado('error')
    }
  }

  if (estado === 'listo') {
    return (
      <div className={`${estilos.barra} ${estilos.ok}`}>
        <span className={estilos.texto}><b>Listo.</b> Tu panel ya está actualizado.</span>
      </div>
    )
  }

  return (
    <div className={estilos.barra}>
      <span className={estilos.texto}>
        <b>Hay una actualización para tu panel.</b>{' '}
        {titulos.length === 1 ? titulos[0] : `${titulos.length} mejoras nuevas.`}
        {sinActualizador && ' Para aplicarla tenés que volver a correr el SQL de instalación una vez.'}
        {estado === 'error' && <span className={estilos.error}> {error}</span>}
      </span>
      {!sinActualizador && (
        <button className={estilos.boton} onClick={aplicar} disabled={estado === 'aplicando'} type="button">
          {estado === 'aplicando' ? 'Actualizando…' : estado === 'error' ? 'Probar de nuevo' : 'Actualizar ahora'}
        </button>
      )}
    </div>
  )
}
