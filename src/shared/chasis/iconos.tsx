/**
 * Los iconos, en SVG inline — los mismos trazos que el mockup.
 *
 * 🔴 Cero emoji en la interfaz. En un navegador sin fuente de emoji salen
 * cuadraditos, y eso le puede pasar a un alumno en cualquier máquina. Lo
 * encontró el gate de fotos del mockup.
 */
const base = {
  fill: 'none', stroke: 'currentColor', strokeWidth: 2,
  strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
  viewBox: '0 0 24 24',
}

type P = { size?: number; className?: string }
const svg = (d: React.ReactNode, def = 16) =>
  function Icono({ size = def, className }: P) {
    return <svg width={size} height={size} className={className} aria-hidden {...base}>{d}</svg>
  }

export const IconoCash = svg(<><rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="2.5" /><path d="M6 12h.01M18 12h.01" /></>, 15)
export const IconoDoc = svg(<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6M9 13h6M9 17h6" /></>, 15)
export const IconoCalendario = svg(<><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M8 2v4M16 2v4M3 10h18" /></>)
export const IconoTelefono = svg(<path d="M22 16.92V21a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2 5.2 2 2 0 0 1 4 3h4.1a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L9 11a16 16 0 0 0 6 6l1.4-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z" />)
export const IconoCheck = svg(<path d="M20 6 9 17l-5-5" />)
export const IconoTrofeo = svg(<><path d="M6 3h12v5a6 6 0 0 1-12 0Z" /><path d="M6 5H4a2 2 0 0 0 0 4h2M18 5h2a2 2 0 0 1 0 4h-2M9 21h6M12 14v7" /></>)
export const IconoMedalla = svg(<><circle cx="12" cy="15" r="6" /><path d="m9 9-3-7M15 9l3-7M12 13v4M10.5 15h3" /></>)
export const IconoEquipo = svg(<><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.9" /></>)
export const IconoInfo = svg(<><circle cx="12" cy="12" r="9" /><path d="M12 16v-5M12 8h.01" /></>, 15)
export const IconoAviso = svg(<path d="M12 9v4M12 17h.01M10.3 3.9 2 18a2 2 0 0 0 1.7 3h16.6A2 2 0 0 0 22 18L13.7 3.9a2 2 0 0 0-3.4 0Z" />, 15)
export const IconoLapiz = svg(<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />, 15)
export const IconoTendencia = svg(<path d="m3 17 6-6 4 4 8-8" />, 15)
export const IconoEngranaje = svg(<><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2 2 2 0 1 1-4 0 1.7 1.7 0 0 0-2.9-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 3 15a2 2 0 1 1 0-4 1.7 1.7 0 0 0 1.2-2.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 10 4.1a2 2 0 1 1 4 0 1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1A1.7 1.7 0 0 0 21 11a2 2 0 1 1 0 4Z" /></>, 15)
export const IconoEquis = svg(<path d="M18 6 6 18M6 6l12 12" />, 13)
export const IconoDeshacer = svg(<><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /></>, 13)
export const IconoSol = svg(<><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>, 15)
export const IconoLuna = svg(<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />, 15)
export const IconoSalir = svg(<><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5M21 12H9" /></>, 15)
