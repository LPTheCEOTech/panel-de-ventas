// Next 16 ELIMINÓ `next lint`, y `next build` ya no lintea: hay que llamar a
// ESLint directo y con flat config. El script es `npm run lint` → `eslint .`.
import next from 'eslint-config-next'

const config = [
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'next-env.d.ts',
      // 🔴 GENERADO por scripts/portar-css.py — no se lintea ni se edita a mano.
      'src/app/globals.css',
    ],
  },
  ...next,
]

export default config
