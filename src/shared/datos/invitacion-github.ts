/**
 * Invitar a un alumno a la organización de GitHub que es dueña del repo.
 *
 * Vercel solo deja importar un repo de una organización si el usuario es
 * Member con acceso de escritura. Un alumno recién llegado no lo es. Este
 * módulo lo invita por correo al team de alumnos usando un token de un
 * Owner de la org; GitHub le manda el mail, el alumno acepta y ya puede
 * importar el repo en su Vercel sin que nadie del lado nuestro haga nada.
 *
 * 🔴 Solo corre en el servidor: el token da poder de admin sobre la org.
 */
import 'server-only'

import { interpretarRespuestaGitHub, type ResultadoInvitacion } from './invitacion-github-reglas'

interface ConfigInvitacion {
  token: string
  org: string
  teamSlug: string
}

/**
 * Las tres variables viven solo en el Vercel del panel que reparte accesos
 * (el del dueño del curso). En el panel de cada alumno no están, y la
 * página se muestra deshabilitada.
 */
export function configInvitacion(): ConfigInvitacion | null {
  const token = process.env.GITHUB_INVITE_TOKEN
  const org = process.env.GITHUB_INVITE_ORG
  if (!token || !org) return null
  return { token, org, teamSlug: process.env.GITHUB_INVITE_TEAM ?? 'alumnos' }
}

const API = 'https://api.github.com'

function cabeceras(token: string): HeadersInit {
  return {
    accept: 'application/vnd.github+json',
    authorization: `Bearer ${token}`,
    'x-github-api-version': '2022-11-28',
    'content-type': 'application/json',
  }
}

// El id numérico del team no cambia; se pide una vez por instancia.
let teamIdCache: { clave: string; id: number } | null = null

async function idDelTeam(cfg: ConfigInvitacion): Promise<number> {
  const clave = `${cfg.org}/${cfg.teamSlug}`
  if (teamIdCache?.clave === clave) return teamIdCache.id
  const r = await fetch(`${API}/orgs/${cfg.org}/teams/${cfg.teamSlug}`, { headers: cabeceras(cfg.token) })
  if (!r.ok) throw new Error(`team ${clave}: HTTP ${r.status}`)
  const j = (await r.json()) as { id: number }
  teamIdCache = { clave, id: j.id }
  return j.id
}

export async function invitarAlumno(correo: string): Promise<ResultadoInvitacion> {
  const cfg = configInvitacion()
  if (!cfg) return { estado: 'no-configurado' }

  let teamId: number
  try {
    teamId = await idDelTeam(cfg)
  } catch (e) {
    return { estado: 'error', detalle: e instanceof Error ? e.message : 'team' }
  }

  const r = await fetch(`${API}/orgs/${cfg.org}/invitations`, {
    method: 'POST',
    headers: cabeceras(cfg.token),
    body: JSON.stringify({ email: correo, role: 'direct_member', team_ids: [teamId] }),
  })
  const cuerpo = await r.text().catch(() => '')
  return interpretarRespuestaGitHub(r.status, cuerpo)
}
