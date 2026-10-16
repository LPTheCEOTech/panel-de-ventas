/**
 * Las piezas de una llamada que se dibujan igual en dos pantallas: la lista de
 * Post Llamada y el Día por día del Panel. Una sola versión de cada una, para
 * que «asistió» o el closer no se vean distinto según dónde se mire.
 */
import { IconoPersona } from '@/shared/chasis/iconos'
import type { Llamada, OrigenLead } from '@/shared/tipos'

/** 🔴 Sesión 3 · el enum de BD/Zod vive en minúscula sin tildes; los labels
 *  bonitos se resuelven acá. Es la única fuente para los tres textos. */
export function etiquetaOrigen(v: OrigenLead | ''): string {
  if (v === 'organico') return 'Orgánico'
  if (v === 'anuncios') return 'Anuncios'
  if (v === 'referidos') return 'Referidos'
  return ''
}

/** Asistió / reagendada / origen / cerró, en ese orden. */
export function Pastillas({ l }: { l: Llamada }) {
  return (
    <div className="ll-badges">
      <span className={`pill ${l.asistio ? 'set' : 'no'}`}>{l.asistio ? 'asistió' : 'no asistió'}</span>
      {l.reagendada && <span className="pill clo">reagendada</span>}
      {l.origenLead && (
        <span className={`pill org-${l.origenLead}`}>{etiquetaOrigen(l.origenLead).toLowerCase()}</span>
      )}
      {l.cerro && <span className="pill amb">cerró</span>}
    </div>
  )
}

/** De quién es la llamada. Un id que no está en el mapa no rompe: dice «—». */
export function Quien({ nombre }: { nombre: string | undefined }) {
  return (
    <span className="ll-quien">
      <IconoPersona size={12} />
      <span>{nombre ?? '—'}</span>
    </span>
  )
}
