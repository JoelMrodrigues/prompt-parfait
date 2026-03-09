/**
 * apiFetch — wrapper fetch avec fallback automatique
 *
 * Si VITE_DPM_API_URL_FALLBACK est défini et que le primary URL est inaccessible
 * (timeout 6s, réseau bloqué au boulot), bascule automatiquement sur le fallback.
 * L'URL active est mémorisée pour toute la session (pas de retry inutile).
 *
 * Config .env.local :
 *   VITE_DPM_API_URL=http://localhost:3001              ← dev local
 *   VITE_DPM_API_URL_FALLBACK=https://app.railway.app  ← fallback si réseau bloqué
 */

const PRIMARY = (import.meta.env.VITE_DPM_API_URL || 'http://localhost:3001').replace(/\/$/, '')
const FALLBACK = (import.meta.env.VITE_DPM_API_URL_FALLBACK || '').replace(/\/$/, '')

/** Timeout avant bascule fallback : 2 secondes (réduit de 6s — évite le gel au démarrage) */
const PRIMARY_TIMEOUT_MS = 2000

/** URL backend active pour la session (primary → fallback si primary inaccessible) */
let activeUrl = PRIMARY

/** Renvoie l'URL backend actuellement utilisée (primary ou fallback) */
export function getActiveBackendUrl(): string {
  return activeUrl
}

/** Renvoie true si le fallback Railway est en cours d'utilisation */
export function isUsingFallback(): boolean {
  return !!FALLBACK && activeUrl === FALLBACK
}

async function fetchWithTimeout(url: string, timeoutMs: number, options?: RequestInit): Promise<Response> {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { ...options, signal: controller.signal })
    clearTimeout(id)
    return res
  } catch (err) {
    clearTimeout(id)
    throw err
  }
}

/**
 * Effectue un fetch vers le backend actif.
 *
 * - Si fallback non configuré ou déjà sur le fallback → appel direct
 * - Si le primary ne répond pas en 6s (réseau bloqué) → bascule sur fallback
 * - L'URL active est mémorisée : les appels suivants vont directement au fallback
 *
 * @param path    Chemin de l'API, ex: '/api/riot/match-count?pseudo=...'
 * @param options Options fetch standard (method, body, headers...)
 */
export async function apiFetch(path: string, options?: RequestInit): Promise<Response> {
  // Pas de fallback configuré ou déjà sur le fallback → appel direct sans timeout court
  if (!FALLBACK || activeUrl === FALLBACK) {
    return fetch(`${activeUrl}${path}`, options)
  }

  // Essai du primary avec timeout court
  try {
    const res = await fetchWithTimeout(`${activeUrl}${path}`, PRIMARY_TIMEOUT_MS, options)
    return res
  } catch (err) {
    const isNetworkError =
      err instanceof Error &&
      (err.name === 'AbortError' ||
        err.message.includes('Failed to fetch') ||
        err.message.includes('Network') ||
        err.message.includes('fetch') ||
        err.message.includes('ECONNREFUSED') ||
        err.message.includes('ECONNABORTED'))

    if (isNetworkError) {
      console.warn(`[API] ${PRIMARY} injoignable → bascule sur ${FALLBACK}`)
      activeUrl = FALLBACK
      return fetch(`${activeUrl}${path}`, options)
    }
    throw err
  }
}
