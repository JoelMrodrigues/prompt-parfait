import { fetchSyncRank } from '../../../lib/riotSync'

/**
 * Sync rank uniquement via API Riot (PUUID + league by-puuid).
 * Pseudo au format GameName#TagLine ou GameName/TagLine.
 */
export function usePlayerSync() {
  const syncExistingPlayer = async (player) => {
    const pseudo = (player?.pseudo || '').trim()
    if (!pseudo) throw new Error('Pseudo du joueur requis')
    const { rank } = await fetchSyncRank(pseudo)
    return { rank: rank ?? undefined }
  }

  const syncPlayerData = async (playerData) => {
    const pseudo = (playerData?.pseudo || '').trim()
    if (!pseudo) return playerData
    try {
      const { rank } = await fetchSyncRank(pseudo)
      return { ...playerData, rank: rank ?? playerData.rank }
    } catch {
      return playerData
    }
  }

  return { syncExistingPlayer, syncPlayerData }
}
