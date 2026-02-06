/**
 * Hook pour synchroniser les données des joueurs depuis dpm.lol
 */
import { fetchDpmData } from '../../../lib/dpmScraper'

export const usePlayerSync = () => {
  const syncPlayerData = async (playerData) => {
    // Préserver toutes les données du formulaire (dont secondary_account)
    let result = { ...playerData }
    // Si un pseudo est disponible, récupérer depuis dpm.lol
    if (playerData.pseudo) {
      try {
        const dpmData = await fetchDpmData(playerData.pseudo)
        if (dpmData) {
          result = {
            ...result,
            rank: dpmData.rank || playerData.rank,
            top_champions: dpmData.topChampions || playerData.top_champions,
          }
        }
      } catch (error) {
        console.error('Erreur récupération dpm.lol:', error)
      }
    }
    return result
  }

  const syncExistingPlayer = async (player) => {
    if (!player.pseudo) {
      throw new Error('Pseudo requis pour synchroniser')
    }

    const dpmData = await fetchDpmData(player.pseudo)
    if (!dpmData) {
      throw new Error('Impossible de récupérer les données depuis dpm.lol')
    }

    const updateData = {}
    
    if (dpmData.rank) {
      updateData.rank = dpmData.rank
    }

    if (dpmData.topChampions && dpmData.topChampions.length > 0) {
      updateData.top_champions = dpmData.topChampions
    }

    return updateData
  }

  return {
    syncPlayerData,
    syncExistingPlayer,
  }
}
