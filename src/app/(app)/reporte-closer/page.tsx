import { redirect } from 'next/navigation'

/**
 * 🔴 Fase D · el reporte diario agregado del closer se reemplaza por
 * `/llamada` (una fila por llamada). Esta ruta queda como redirect por 1-2
 * semanas para no romper marcadores; en la migración 007 se elimina.
 */
export default function ReporteCloser() {
  redirect('/llamada')
}
