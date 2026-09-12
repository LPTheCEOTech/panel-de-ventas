'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

import { IconoAviso } from '@/shared/chasis/iconos'
import type { Configuracion } from '@/shared/tipos'
import { ColorPicker } from './color-picker'

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

  /* 🔴 Un hex a medio escribir (`#00D9`) no puede pintar la muestra: el
     navegador lo ignora y queda el color anterior, que miente. Se pinta solo
     cuando está completo. */
  const colorValido = /^#[0-9a-fA-F]{6}$/.test(c.marca)

  return (
    <>
    <div className="grid2" style={{ alignItems: 'start', marginBottom: 0 }}>
      <div className="card formcard">
        <div className="card-head"><div><h3>Tu negocio</h3><p>lo que se ve arriba a la izquierda</p></div></div>

        <Fila titulo="Nombre del panel" explicacion="Aparece en la barra de arriba y en la pestaña del navegador.">
          <input value={c.nombreNegocio} maxLength={60} onChange={(e) => set('nombreNegocio', e.target.value)} />
        </Fila>
        <Fila titulo="Iniciales" explicacion="Las dos letras del cuadradito de color. Se muestran si no hay logo cargado.">
          <input value={c.iniciales} maxLength={2} onChange={(e) => set('iniciales', e.target.value.toUpperCase())} />
        </Fila>
        <Fila titulo="Logo" explicacion="Reemplaza al cuadradito de iniciales en la barra de arriba. Máx 256 KB, PNG · JPG · SVG · WebP.">
          <CampoLogo
            actual={c.logoUrl}
            onCambio={(url) => setC((x) => ({ ...x, logoUrl: url }))}
          />
        </Fila>
        <Fila titulo="Tu nombre" explicacion="Quién está usando el panel.">
          <input value={c.usuarioNombre} maxLength={60} onChange={(e) => set('usuarioNombre', e.target.value)} />
        </Fila>
        <Fila titulo="Color de tu marca" explicacion="Todo el color del panel sale de acá. Cambiálo y cambia todo.">
          <SelectorColor
            valor={c.marca} colorValido={colorValido}
            onCambio={(hex) => set('marca', hex)}
          />
        </Fila>
      </div>

      <div className="card formcard">
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
      </div>
    </div>

    {error && <div className="note warn"><IconoAviso /><span>{error}</span></div>}

    {/* 🔴 El botón guarda LAS DOS tarjetas, así que no puede vivir adentro de
        una. Estaba en la de la derecha: se editaba el nombre del negocio en la
        izquierda y la única forma de guardarlo era un botón que, mirándolo,
        parecía ser de la moneda y la zona horaria. */}
    <div className="barra-guardar">
      <span className="helper">{listo ? 'Guardado.' : 'Los cambios se aplican al guardar.'}</span>
      <button className="btn-primary" onClick={guardar} disabled={guardando} type="button">
        {guardando ? 'Guardando…' : 'Guardar ajustes'}
      </button>
    </div>
    </>
  )
}

/**
 * 🔴 Fase C (sesion 2) · el input hex de siempre + un trigger visual que abre
 * el popover del ColorPicker. Al abrir, guardamos el valor previo en un ref
 * para poder revertir con Esc. Al aplicar (Enter / click afuera), queda el
 * cambio en el estado del padre (que dispara el repintado y espera al botón
 * "Guardar ajustes" para persistir).
 */
function SelectorColor({
  valor, colorValido, onCambio,
}: {
  valor: string
  colorValido: boolean
  onCambio: (hex: string) => void
}) {
  const [abierto, setAbierto] = useState(false)
  const previo = useRef(valor)

  function abrir() {
    previo.current = valor
    setAbierto(true)
  }

  return (
    <span className="color-inp" style={{ position: 'relative' }}>
      <button
        type="button" className="muestra clic"
        style={colorValido ? { background: valor } : undefined}
        onClick={abrir}
        aria-label="Elegir color de tu marca"
      />
      <input
        value={valor} maxLength={7} placeholder="#00D97E" spellCheck={false}
        aria-label="Color de tu marca en hexadecimal"
        onChange={(e) => onCambio(e.target.value)}
      />
      {abierto && (
        <ColorPicker
          valor={colorValido ? valor : '#00D97E'}
          onCambio={onCambio}
          onCerrar={(aplicar) => {
            if (!aplicar) onCambio(previo.current)
            setAbierto(false)
          }}
        />
      )}
    </span>
  )
}

/**
 * 🔴 Fase B · sube o quita el logo. Vive fuera de la tarjeta padre porque el
 * archivo se sube al instante (endpoint aparte, `/api/logo`) y NO espera al
 * botón "Guardar ajustes" — la URL se persiste en `configuracion.logo_url` en
 * el mismo POST. El `onCambio` sincroniza el estado del padre para que el
 * preview y el botón "Quitar" reflejen el estado real sin recargar.
 */
function CampoLogo({
  actual, onCambio,
}: {
  actual: string | null
  onCambio: (url: string | null) => void
}) {
  const [subiendo, setSubiendo] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmar, setConfirmar] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  async function subir(file: File) {
    setSubiendo(true); setError(null); setConfirmar(false)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const r = await fetch('/api/logo', { method: 'POST', body: fd })
      const d = await r.json().catch(() => null)
      if (!r.ok) { setError(d?.error ?? 'No se pudo subir.'); return }
      onCambio(d.logoUrl)
      router.refresh()
    } catch {
      setError('No se pudo hablar con el servidor.')
    } finally {
      setSubiendo(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  async function quitar() {
    setSubiendo(true); setError(null)
    try {
      const r = await fetch('/api/logo', { method: 'DELETE' })
      if (!r.ok) {
        const d = await r.json().catch(() => null)
        setError(d?.error ?? 'No se pudo quitar.'); return
      }
      onCambio(null)
      setConfirmar(false)
      router.refresh()
    } catch {
      setError('No se pudo hablar con el servidor.')
    } finally {
      setSubiendo(false)
    }
  }

  return (
    <div className="campo-logo">
      <div className="campo-logo-fila">
        {actual ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={actual} alt="Logo actual" className="brand-logo" />
        ) : (
          <span className="brand-tile">·</span>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/svg+xml,image/webp"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) subir(f)
          }}
          disabled={subiendo}
        />
        {actual && !confirmar && (
          <button type="button" className="btn-ghost btn-sm" onClick={() => setConfirmar(true)} disabled={subiendo}>
            Quitar
          </button>
        )}
      </div>
      {confirmar && (
        <div className="note warn" style={{ marginTop: 8 }}>
          <IconoAviso />
          <span>
            ¿Quitar el logo? Vuelve al cuadradito con las iniciales.
            <button type="button" className="btn-ghost btn-sm" style={{ marginLeft: 10 }} onClick={quitar} disabled={subiendo}>
              Sí, quitar
            </button>
            <button type="button" className="btn-ghost btn-sm" onClick={() => setConfirmar(false)} disabled={subiendo}>
              Cancelar
            </button>
          </span>
        </div>
      )}
      {error && (
        <div className="note warn" style={{ marginTop: 8 }}>
          <IconoAviso /><span>{error}</span>
        </div>
      )}
    </div>
  )
}
