'use client'

import { useCallback, useSyncExternalStore } from 'react'

import { CLAVE_TEMA, type Tema } from './tema'
import { IconoLuna, IconoSol } from './iconos'

/**
 * ¿Está oscuro AHORA? La respuesta vive en el navegador (el atributo del `<html>`
 * o la preferencia del sistema), no en React.
 *
 * 🔴 Por eso se lee con `useSyncExternalStore` y no con `useState` + `useEffect`.
 * El servidor no puede saber qué tema eligió la persona: si el primer render del
 * cliente dijera algo distinto al del servidor, habría un error de hidratación.
 * `useSyncExternalStore` toma un valor distinto en el servidor (el tercer
 * argumento) a propósito, y además vuelve a renderizar si el sistema cambia de
 * tema mientras la pestaña está abierta.
 */
function suscribir(avisar: () => void): () => void {
  const mq = window.matchMedia('(prefers-color-scheme: dark)')
  mq.addEventListener('change', avisar)
  const observador = new MutationObserver(avisar)
  observador.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  return () => {
    mq.removeEventListener('change', avisar)
    observador.disconnect()
  }
}

function leerEnCliente(): boolean {
  const elegido = document.documentElement.dataset.theme as Tema | undefined
  if (elegido) return elegido === 'dark'
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function ToggleTema() {
  // En el servidor devuelve `null`: no se dibuja icono hasta saber cuál va.
  const oscuro = useSyncExternalStore(suscribir, leerEnCliente, () => null)

  const alternar = useCallback(() => {
    const nuevo: Tema = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'
    document.documentElement.dataset.theme = nuevo
    try {
      localStorage.setItem(CLAVE_TEMA, nuevo)
    } catch {
      // en modo privado `localStorage` puede tirar: el tema no persiste y ya.
      // No es motivo para que el botón deje de funcionar.
    }
  }, [])

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
