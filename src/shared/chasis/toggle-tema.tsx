'use client'

import { useEffect, useState } from 'react'
import { CLAVE_TEMA, type Tema } from './tema'
import { IconoLuna, IconoSol } from './iconos'

export function ToggleTema() {
  // Arranca en `null` y no en el tema real: en el servidor no se sabe qué eligió
  // el usuario, y pintar un icono distinto al del cliente sería un error de
  // hidratación. Se resuelve después del primer render.
  const [oscuro, setOscuro] = useState<boolean | null>(null)

  useEffect(() => {
    const guardado = document.documentElement.dataset.theme as Tema | undefined
    setOscuro(guardado ? guardado === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches)
  }, [])

  function alternar() {
    const nuevo: Tema = oscuro ? 'light' : 'dark'
    document.documentElement.dataset.theme = nuevo
    try { localStorage.setItem(CLAVE_TEMA, nuevo) } catch { /* modo privado: el tema no persiste y ya */ }
    setOscuro(!oscuro)
  }

  return (
    <button
      className="icon-btn" onClick={alternar} type="button"
      aria-label={oscuro ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
      title="Cambiar tema"
    >
      {oscuro === null ? null : oscuro ? <IconoSol /> : <IconoLuna />}
    </button>
  )
}
