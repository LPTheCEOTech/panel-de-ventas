/**
 * El aviso de lead repetido en Post Llamada.
 *
 * 🔴 Es un AVISO, no una barrera: puede haber dos llamadas reales con el mismo
 * lead el mismo día (se cortó y volvieron a llamar). Lo que se quiere evitar
 * es el caso común: el closer cargó su llamada y el manager se la vuelve a
 * cargar por él.
 */
import type { Llamada } from '@/shared/tipos'

/** `  Sofía   RAMÍREZ ` → `sofia ramirez`. Sin tildes, minúsculas y un solo espacio. */
export function normalizarLead(nombre: string): string {
  return nombre
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * La primera llamada activa de ese día con el mismo lead, o `null`. Con menos
 * de dos letras no se compara: mientras se escribe «s» todo coincidiría.
 */
export function leadRepetido(nombre: string, llamadas: readonly Llamada[], fecha: string): Llamada | null {
  const buscado = normalizarLead(nombre)
  if (buscado.length < 2) return null
  return llamadas.find((l) => l.activa && l.fecha === fecha && normalizarLead(l.leadNombre) === buscado) ?? null
}
