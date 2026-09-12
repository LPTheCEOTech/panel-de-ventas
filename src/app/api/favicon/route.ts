import { NextResponse } from 'next/server'

import { datos } from '@/shared/datos/indice'
import { hexAHsl } from '@/shared/chasis/marca'

/**
 * 🔴 Fase B (sesion 2) · favicon dinámico.
 *
 * SVG generado a demanda a partir de `configuracion.iniciales` +
 * `configuracion.marca`. Reemplaza al favicon default del navegador para que
 * la pestaña se vea del panel del negocio (no del template).
 *
 * 🔴 Decisión: siempre SVG (no el logo del bucket). Un logo puede ser un
 * wordmark horizontal que como cuadrado de 16×16 se ve mal; las iniciales
 * sobre el color de marca siempre se ven bien. El logo real vive en el
 * topbar (Fase B pasada), no acá.
 *
 * 🔴 Cache 60 s: cambio de iniciales o de marca desde Ajustes se ve en el
 * próximo refresh sin invalidar a mano.
 *
 * 🔴 Sin BD (dev / recién clonado): cae al fallback y devuelve un SVG con
 * `PV` verde default. Nunca 500.
 */
export const dynamic = 'force-dynamic'

// Escape mínimo para caracteres XML peligrosos dentro del <text>. Las iniciales
// vienen de <input maxLength=2 uppercase> pero curl a mano podría meter cualquier
// cosa a través del guardado; mejor conservador.
function escapar(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function contraste(hex: string): string {
  const h = hexAHsl(hex)
  if (!h) return '#0B0F14'
  // 🔴 Umbral igual al que usa `sobreMarca()` en marca.ts (l=45 al pie de la
  // rampa CLARA para m6). Con marcas claras devuelve tinte oscuro; con
  // marcas medias/oscuras devuelve blanco.
  return h.l < 55 ? '#FFFFFF' : `hsl(${Math.round(h.h)} ${Math.round(Math.min(60, h.s))}% 8%)`
}

export async function GET() {
  let iniciales = 'PV'
  let marca = '#00D97E'
  try {
    const c = await datos().leerConfiguracion()
    iniciales = (c.iniciales || 'PV').slice(0, 2).toUpperCase()
    marca = /^#[0-9a-fA-F]{6}$/.test(c.marca) ? c.marca : '#00D97E'
  } catch {
    // sin BD: fallback estático
  }
  const texto = contraste(marca)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192">
  <rect width="192" height="192" rx="42" fill="${marca}"/>
  <text x="96" y="118" text-anchor="middle"
    font-family="system-ui,-apple-system,'Segoe UI',Roboto,sans-serif"
    font-size="96" font-weight="800" letter-spacing="-4"
    fill="${texto}">${escapar(iniciales)}</text>
</svg>`
  return new NextResponse(svg, {
    headers: {
      'content-type': 'image/svg+xml; charset=utf-8',
      'cache-control': 'public, max-age=60, s-maxage=60',
    },
  })
}
