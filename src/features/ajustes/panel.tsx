'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

import { IconoAviso } from '@/shared/chasis/iconos'
import type { Configuracion } from '@/shared/tipos'

const MONEDAS: [string, string, string][] = [
  ['USD', '$', 'USD — dólar ($)'],
  ['MXN', '$', 'MXN — peso mexicano ($)'],
  ['EUR', '€', 'EUR — euro (€)'],
  ['COP', '$', 'COP — peso colombiano ($)'],
  ['ARS', '$', 'ARS — peso argentino ($)'],
]

const ZONAS = [
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Mexico_City', 'America/Bogota', 'America/Lima', 'America/Santiago',
  'America/Argentina/Buenos_Aires', 'Europe/Madrid',
]

function Fila({ titulo, explicacion, children }: { titulo: string; explicacion: string; children: React.ReactNode }) {
  return (
    <div className="cfgrow">
      <div>
        <div className="cfg-n">{titulo}</div>
        <div className="cfg-src">{explicacion}</div>
      </div>
      <div className="field">{children}</div>
    </div>
  )
}

export function PanelAjustes({ inicial }: { inicial: Configuracion }) {
  const router = useRouter()
  const [c, setC] = useState(inicial)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [listo, setListo] = useState(false)

  function set<K extends keyof Configuracion>(k: K, v: Configuracion[K]) {
    setC((x) => ({ ...x, [k]: v }))
    setListo(false)
  }

  async function guardar() {
    setGuardando(true); setError(null)
    try {
      const r = await fetch('/api/ajustes', {
        method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(c),
      })
      if (!r.ok) {
        const d = await r.json().catch(() => null)
        setError(d?.error ?? 'No se pudo guardar.')
        return
      }
      setListo(true)
      // 🔴 refresh, no un setState local: el nombre y las iniciales viven en el
      // topbar, que lo renderiza el servidor. Sin esto se guarda bien y la barra
      // de arriba sigue diciendo lo viejo hasta que alguien recargue.
      router.refresh()
    } catch {
      setError('No se pudo hablar con el servidor.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <>
      <div className="card formcard">
        <div className="card-head"><div><h3>Tu negocio</h3><p>lo que se ve arriba a la izquierda</p></div></div>

        <Fila titulo="Nombre del panel" explicacion="Aparece en la barra de arriba y en la pestaña del navegador.">
          <input value={c.nombreNegocio} maxLength={60} onChange={(e) => set('nombreNegocio', e.target.value)} />
        </Fila>
        <Fila titulo="Iniciales" explicacion="Las dos letras del cuadradito de color.">
          <input value={c.iniciales} maxLength={2} onChange={(e) => set('iniciales', e.target.value.toUpperCase())} />
        </Fila>
        <Fila titulo="Tu nombre" explicacion="Quién está usando el panel.">
          <input value={c.usuarioNombre} maxLength={60} onChange={(e) => set('usuarioNombre', e.target.value)} />
        </Fila>
        <Fila titulo="Color de tu marca" explicacion="Todo el color del panel sale de acá. Cambiálo y cambia todo.">
          <input value={c.marca} maxLength={7} placeholder="#00D97E" onChange={(e) => set('marca', e.target.value)} />
        </Fila>
      </div>

      <div className="card formcard" style={{ marginTop: 12 }}>
        <div className="card-head"><div><h3>Cómo cuenta</h3><p>moneda, fechas y semanas</p></div></div>

        <Fila titulo="Moneda" explicacion="El símbolo que va delante de todos los montos.">
          <select
            value={c.moneda}
            onChange={(e) => {
              const m = MONEDAS.find((x) => x[0] === e.target.value)
              if (m) setC((x) => ({ ...x, moneda: m[0], simbolo: m[1] }))
            }}
          >
            {MONEDAS.map(([cod, , texto]) => <option key={cod} value={cod}>{texto}</option>)}
          </select>
        </Fila>
        <Fila titulo="Zona horaria" explicacion="Decide a qué día pertenece un reporte cargado de noche.">
          <select value={c.zonaHoraria} onChange={(e) => set('zonaHoraria', e.target.value)}>
            {ZONAS.map((z) => <option key={z} value={z}>{z}</option>)}
          </select>
        </Fila>
        <Fila titulo="La semana empieza el" explicacion="Cambia el corte de «Semana» en el panel y en el gráfico por día.">
          <select value={c.inicioSemana} onChange={(e) => set('inicioSemana', Number(e.target.value) as 0 | 1)}>
            <option value={1}>Lunes</option>
            <option value={0}>Domingo</option>
          </select>
        </Fila>
        <Fila titulo="Mostrar el ranking" explicacion="Si lo apagás, el panel no muestra los rankings de closers ni de setters.">
          <label className="sw">
            <input type="checkbox" checked={c.rankingVisible} onChange={(e) => set('rankingVisible', e.target.checked)} />
            {c.rankingVisible ? 'Visible' : 'Oculto'}
          </label>
        </Fila>

        {error && <div className="note warn"><IconoAviso /><span>{error}</span></div>}

        <div className="form-actions">
          <span className="helper">{listo ? 'Guardado.' : 'Los cambios se aplican al guardar.'}</span>
          <button className="btn-primary" onClick={guardar} disabled={guardando} type="button">
            {guardando ? 'Guardando…' : 'Guardar ajustes'}
          </button>
        </div>
      </div>
    </>
  )
}
