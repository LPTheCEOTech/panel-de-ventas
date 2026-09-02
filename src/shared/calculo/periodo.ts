/**
 * Las ventanas de tiempo. Todo se hace sobre cadenas `YYYY-MM-DD`, nunca sobre
 * `Date`.
 *
 * 🔴 Por qué no `Date`: `new Date('2026-07-20')` se interpreta como medianoche
 * UTC, y en cualquier zona al oeste de Greenwich eso es el 19 de julio. Un
 * reporte cargado un lunes caería en la semana anterior y el panel mostraría
 * números que no cuadran con lo que la gente cargó. Con cadenas y aritmética de
 * días no hay zona horaria que valga: la fecha del reporte YA viene resuelta en
 * la zona del negocio cuando se guarda.
 */
import type { Periodo, Ventana } from '@/shared/tipos'

const DIA_MS = 86_400_000

function aUTC(iso: string): number {
  const [a, m, d] = iso.split('-').map(Number)
  return Date.UTC(a, m - 1, d)
}

function aISO(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10)
}

export function sumarDias(iso: string, dias: number): string {
  return aISO(aUTC(iso) + dias * DIA_MS)
}

/** 0 = domingo … 6 = sábado */
export function diaDeLaSemana(iso: string): number {
  return new Date(aUTC(iso)).getUTCDay()
}

/**
 * La ventana del período que CONTIENE a `hoy`.
 *
 * `inicioSemana` es 1 (lunes) o 0 (domingo) y sale de Ajustes: no está clavado
 * en el código porque cambia el corte de "Semana" y no todos los negocios
 * cierran la semana el mismo día.
 */
export function ventana(periodo: Periodo, hoy: string, inicioSemana: 0 | 1 = 1): Ventana {
  if (periodo === 'dia') return { desde: hoy, hasta: hoy }

  if (periodo === 'semana') {
    const dow = diaDeLaSemana(hoy)
    const atras = (dow - inicioSemana + 7) % 7
    const desde = sumarDias(hoy, -atras)
    return { desde, hasta: sumarDias(desde, 6) }
  }

  const [a, m] = hoy.split('-').map(Number)
  const desde = `${a}-${String(m).padStart(2, '0')}-01`
  // día 0 del mes siguiente = último día de este mes, sin tabla de 30/31 ni bisiestos
  const ultimo = new Date(Date.UTC(a, m, 0)).getUTCDate()
  return { desde, hasta: `${a}-${String(m).padStart(2, '0')}-${String(ultimo).padStart(2, '0')}` }
}

/**
 * La ventana INMEDIATAMENTE anterior, de la misma longitud. Es contra ésta que
 * se calculan los chips de comparación (`▲ +2.1 pts`).
 */
export function ventanaAnterior(periodo: Periodo, v: Ventana): Ventana {
  if (periodo === 'mes') {
    const [a, m] = v.desde.split('-').map(Number)
    const anterior = m === 1 ? `${a - 1}-12-01` : `${a}-${String(m - 1).padStart(2, '0')}-01`
    return ventana('mes', anterior)
  }
  const largo = Math.round((aUTC(v.hasta) - aUTC(v.desde)) / DIA_MS) + 1
  return { desde: sumarDias(v.desde, -largo), hasta: sumarDias(v.desde, -1) }
}

/** Los días de la ventana, en orden. Los usa el gráfico de cash por día. */
export function diasDe(v: Ventana): string[] {
  const out: string[] = []
  for (let d = v.desde; d <= v.hasta; d = sumarDias(d, 1)) out.push(d)
  return out
}

export function dentro(fecha: string, v: Ventana): boolean {
  return fecha >= v.desde && fecha <= v.hasta
}

/**
 * Hoy, en la zona horaria del NEGOCIO, como `YYYY-MM-DD`.
 *
 * 🔴 No es `new Date().toISOString().slice(0,10)`: eso da la fecha UTC. Un
 * closer que carga su reporte a las 8 de la noche en Nueva York lo estaría
 * cargando al día siguiente, y su día aparecería en la semana equivocada.
 * `en-CA` se usa porque su formato de fecha ES `YYYY-MM-DD`.
 */
export function hoyEn(zonaHoraria: string): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: zonaHoraria, year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(new Date())
  } catch {
    // una zona horaria mal escrita en Ajustes no puede dejar la app sin fecha
    return new Intl.DateTimeFormat('en-CA', {
      year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(new Date())
  }
}
