/**
 * Sync rank via API Riot (PUUID + league by-puuid).
 * Pseudo au format GameName#TagLine ou GameName/TagLine.
 */
const getBackendUrl = () => import.meta.env.VITE_DPM_API_URL || 'http://localhost:3001'

export async function fetchSyncRank(pseudo) {
  if (!pseudo || typeof pseudo !== 'string') {
    throw new Error('Pseudo requis (format GameName#TagLine ou GameName/TagLine)')
  }
  const base = getBackendUrl().replace(/\/$/, '')
  const url = `${base}/api/riot/sync-rank?pseudo=${encodeURIComponent(pseudo.trim())}`
  const res = await fetch(url)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.error || `Erreur ${res.status}`)
  }
  if (!data.success) {
    throw new Error(data.error || 'Erreur sync')
  }
  return { rank: data.rank ?? null }
}
