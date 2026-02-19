import { fetchSyncRank } from '../../../lib/riotSync'
import { getTopChampionsFromSupabase } from '../../../lib/team/getTopChampionsFromSupabase'

/**
 * Sync = 1 requête API (rang uniquement) + top 5 depuis Supabase (déjà chargé via Solo Q).
 * Évite les 100+ appels Riot pour les champions.
 */
export function usePlayerSync() {
  const syncExistingPlayer = async (player) => {
    const pseudo = (player?.pseudo || '').trim()
    if (!pseudo) throw new Error('Pseudo du joueur requis')

    // 1 seule requête API : rank uniquement (2 appels Riot : Account + League)
    const { rank } = await fetchSyncRank(pseudo)

    // Top 5 depuis Supabase (0 appel Riot — données déjà chargées via "Charger 20 parties" Solo Q)
    const topChampions = await getTopChampionsFromSupabase(player.id, 'primary')

    return {
      rank: rank ?? undefined,
      top_champions: topChampions?.length > 0 ? topChampions : undefined,
    }
  }

  const syncPlayerData = async (playerData) => {
    const pseudo = (playerData?.pseudo || '').trim()
    if (!pseudo) return playerData
    try {
      const { rank } = await fetchSyncRank(pseudo)
      const topChampions = playerData?.id
        ? await getTopChampionsFromSupabase(playerData.id, 'primary')
        : []
      return {
        ...playerData,
        rank: rank ?? playerData.rank,
        top_champions: topChampions?.length > 0 ? topChampions : playerData.top_champions,
      }
    } catch {
      return playerData
    }
  }

  return { syncExistingPlayer, syncPlayerData }
}
