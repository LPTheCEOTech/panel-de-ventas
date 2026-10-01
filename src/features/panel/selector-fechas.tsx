'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, useTransition } from 'react'

import {
  ATAJOS, encabezadoSemana, etiquetaDeRango, grillaDelMes, nombreDelMes, queryDe, sumarMeses,
  type Atajo, type Rango,
} from '@/shared/calculo/rango'
import { IconoAbajo, IconoCalendario, IconoDerecha, IconoIzquierda } from '@/shared/chasis/iconos'

/**
 * El filtro de fechas del Panel: un botón que dice qué se está viendo y abre
 * atajos + calendario.
 *
 * 🔴 El período vive en la URL (`?r=` o `?desde&hasta`), no en un estado: así
 * se comparte, sobrevive a un refresco y mantiene la página dinámica. Este
 * componente solo arma el borrador del calendario y navega.
 *
 * 🔴 Cerrar (Escape, Cancelar o un toque afuera) DESCARTA el borrador. El
 * selector de color de Ajustes hace lo contrario —su clic afuera aplica—: de
 * ahí se toma la mecánica, no el comportamiento.
 */
export function SelectorFechas({
  rango, hoy, inicioSemana,
}: {
  rango: Rango
  /** Hoy en la zona del negocio. Lo manda el servidor: el navegador puede estar en otra. */
  hoy: string
  inicioSemana: 0 | 1
}) {
  const router = useRouter()
  const [pendiente, empezar] = useTransition()
  const [abierto, setAbierto] = useState(false)
  // el rango que se está marcando; `fin` null = falta el segundo toque
  const [ini, setIni] = useState<string | null>(rango.desde)
  const [fin, setFin] = useState<string | null>(rango.hasta)
  const [sobre, setSobre] = useState<string | null>(null)
  // el mes de la DERECHA; el de la izquierda es el anterior
  const [mes, setMes] = useState(mesDeVista(rango.hasta, hoy))
  // la etiqueta que se muestra mientras el servidor arma el período nuevo
  const [optimista, setOptimista] = useState<string | null>(null)
  const caja = useRef<HTMLDivElement>(null)
  const boton = useRef<HTMLButtonElement>(null)

  function abrir() {
    setIni(rango.desde)
    setFin(rango.hasta)
    setSobre(null)
    setMes(mesDeVista(rango.hasta, hoy))
    setAbierto(true)
  }

  function cerrar() {
    setAbierto(false)
    boton.current?.focus()
  }

  function ir(r: Pick<Rango, 'desde' | 'hasta' | 'atajo'>, etiqueta: string) {
    setAbierto(false)
    setOptimista(etiqueta)
    empezar(() => router.push(`/panel?${new URLSearchParams(queryDe(r))}`))
  }

  // Escape y toque afuera cierran sin aplicar. `pointerdown` y no `mousedown`:
  // en iOS un toque sobre algo que no es clickeable no siempre dispara mousedown.
  useEffect(() => {
    if (!abierto) return
    const afuera = (e: PointerEvent) => {
      if (caja.current && !caja.current.contains(e.target as Node)) setAbierto(false)
    }
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); setAbierto(false); boton.current?.focus() }
    }
    document.addEventListener('pointerdown', afuera)
    document.addEventListener('keydown', tecla)
    return () => {
      document.removeEventListener('pointerdown', afuera)
      document.removeEventListener('keydown', tecla)
    }
  }, [abierto])

  function tocarDia(d: string) {
    if (ini && !fin) {
      const [a, b] = d < ini ? [d, ini] : [ini, d]
      setIni(a)
      setFin(b)
    } else {
      setIni(d)
      setFin(null)
    }
    setSobre(null)
  }

  // el tramo que se pinta: el elegido, o el que se está por elegir con el mouse.
  // Con un solo toque y el mouse afuera (o en un celular) se pinta ese día solo.
  const punta = ini && !fin ? sobre ?? ini : null
  const tramo = ini && fin ? [ini, fin] : ini && punta ? (punta < ini ? [punta, ini] : [ini, punta]) : null
  const borrador = ini && fin ? { desde: ini, hasta: fin, atajo: null } : null
  const hoyMes = hoy.slice(0, 7)
  const etiqueta = optimista && pendiente ? optimista : etiquetaDeRango(rango, hoy)

  return (
    <div className="fechas" ref={caja}>
      <button
        ref={boton} type="button" className="fechas-btn"
        aria-haspopup="dialog" aria-expanded={abierto}
        data-pendiente={pendiente || undefined}
        onClick={() => (abierto ? cerrar() : abrir())}
      >
        <IconoCalendario />
        <span>{etiqueta}</span>
        <IconoAbajo />
      </button>

      {abierto && (
        <div className="fechas-pop" role="dialog" aria-label="Elegir período">
          <div className="atajos">
            {ATAJOS.map(({ valor, texto }) => (
              <button
                key={valor} type="button" aria-pressed={valor === rango.atajo}
                onClick={() => ir({ desde: '', hasta: '', atajo: valor as Atajo }, texto)}
              >
                {texto}
              </button>
            ))}
          </div>

          <div className="cal-meses">
            {[sumarMeses(mes, -1), mes].map((m) => (
              <div className="cal-mes" key={m}>
                <div className="cal-mes-h">
                  <button type="button" className="cal-flecha atras" aria-label="Mes anterior" onClick={() => setMes(sumarMeses(mes, -1))}>
                    <IconoIzquierda />
                  </button>
                  <b>{nombreDelMes(m)}</b>
                  <button
                    type="button" className="cal-flecha adelante" aria-label="Mes siguiente"
                    disabled={mes >= hoyMes} onClick={() => setMes(sumarMeses(mes, 1))}
                  >
                    <IconoDerecha />
                  </button>
                </div>
                <div className="cal-grilla" onMouseLeave={() => setSobre(null)}>
                  {encabezadoSemana(inicioSemana).map((d, i) => <span className="dow" key={i}>{d}</span>)}
                  {grillaDelMes(m, inicioSemana).flat().map((d, i) =>
                    d === null ? <span key={`v${i}`} /> : (
                      <button
                        key={d} type="button" disabled={d > hoy}
                        className={claseDia(d, hoy, tramo)}
                        aria-pressed={!!tramo && d >= tramo[0] && d <= tramo[1]}
                        aria-label={d}
                        onClick={() => tocarDia(d)}
                        onMouseEnter={() => setSobre(d)}
                      >
                        {Number(d.slice(8))}
                      </button>
                    )
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="cal-pie">
            <span className="helper">
              {borrador ? etiquetaDeRango(borrador, hoy) : 'Elige el día final'}
            </span>
            <button type="button" className="btn-ghost btn-sm" onClick={cerrar}>Cancelar</button>
            <button
              type="button" className="btn-primary btn-sm" disabled={!borrador}
              onClick={() => borrador && ir(borrador, etiquetaDeRango(borrador, hoy))}
            >
              Aplicar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/** El mes que se ve a la derecha al abrir: el del «hasta», pero nunca uno futuro. */
function mesDeVista(hasta: string, hoy: string): string {
  return (hasta < hoy ? hasta : hoy).slice(0, 7)
}

function claseDia(d: string, hoy: string, tramo: string[] | null): string {
  const c = ['cal-dia']
  if (d === hoy) c.push('hoy')
  if (tramo) {
    if (d === tramo[0]) c.push('ini')
    if (d === tramo[1]) c.push('fin')
    if (d > tramo[0] && d < tramo[1]) c.push('tramo')
  }
  return c.join(' ')
}
