/**
 * Sync rank et top 5 champions via API Riot.
 * Pseudo au format GameName#TagLine ou GameName/TagLine.
 */
const getBackendUrl = () => import.meta.env.VITE_DPM_API_URL || 'http://localhost:3001'

/**
 * Sync rank uniquement (Account API + League API = 2 appels Riot).
 */
export async function fetchSyncRank(pseudo) {
  if (!pseudo || typeof pseudo !== 'string') {
    throw new Error('Pseudo requis (format GameName#TagLine ou GameName/TagLine)')
  }
  const base = getBackendUrl().replace(/\/$/, '')
  const url = `${base}/api/riot/sync-rank?pseudo=${encodeURIComponent(pseudo.trim())}`
  let res, data
  try {
    res = await fetch(url)
    data = await res.json().catch(() => ({}))
  } catch (e) {
    const err = e as Error
    throw new Error(
      err.message?.includes('fetch') || err.message?.includes('Network')
        ? `API inaccessible (${base}). Vérifie VITE_DPM_API_URL et que l'API est déployée.`
        : err.message || 'Erreur réseau'
    )
  }
  if (!res.ok) {
    const msg = data.error || `Erreur ${res.status}`
    if (msg.includes('timeout') || msg.includes('ECONNABORTED')) {
      throw new Error(
        'API Riot lente ou injoignable. Réessaie dans quelques secondes. Si ça persiste, régénère ta clé sur developer.riotgames.com (elles expirent toutes les 24h).'
      )
    }
    throw new Error(msg)
  }
  if (!data.success) {
    throw new Error(data.error || 'Erreur sync (réponse invalide)')
  }
  return { rank: data.rank ?? null }
}

/**
 * Récupère le nombre de games ranked soloq jouées dans les 7 derniers jours.
 * Retourne null en cas d'erreur (pas de pseudo, API down, etc.)
 */
export async function fetchWeeklyGames(pseudo: string): Promise<number | null> {
  if (!pseudo || typeof pseudo !== 'string') return null
  const base = getBackendUrl().replace(/\/$/, '')
  try {
    const res = await fetch(`${base}/api/riot/weekly-games?pseudo=${encodeURIComponent(pseudo.trim())}`)
    const data = await res.json().catch(() => ({}))
    if (!res.ok || !data.success) return null
    return typeof data.count === 'number' ? data.count : null
  } catch {
    return null
  }
}
