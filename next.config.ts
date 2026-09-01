import type { NextConfig } from 'next'

/**
 * Esta app NO vive dentro de un iframe.
 *
 * La de anuncios (`LP-Command-Center`) se embebe en GoHighLevel y por eso lleva
 * `frame-ancestors` y una cookie `SameSite=None`. Ésta se abre en su propia
 * pestaña — el mockup la dibuja en su propia ventana — así que:
 *
 *   · no hay CSP de `frame-ancestors` que mantener,
 *   · la cookie queda `SameSite=Lax`, que es el default seguro,
 *   · y desaparece el riesgo abierto con Safari y las cookies de terceros.
 *
 * Si algún día hay que embeberla, se porta el bloque de la otra app. No antes:
 * un `frame-ancestors` de más es una puerta abierta sin motivo.
 */
const nextConfig: NextConfig = {
  headers: async () => [
    {
      source: '/:path*',
      headers: [
        // Nadie puede meter esta app en un iframe. Es lo contrario de la app
        // de anuncios, y es a propósito.
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      ],
    },
  ],
}

export default nextConfig
