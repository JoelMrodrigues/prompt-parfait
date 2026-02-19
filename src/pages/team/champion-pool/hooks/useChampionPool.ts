/**
 * Hook pour sauvegarder et charger les pools de champions (tiers S/A/B/C) depuis Supabase
 */
import { useCallback } from 'react'
import { supabase } from '../../../../lib/supabase'
import { TIER_KEYS } from '../constants/tiers'
import {
  clearPlayerChampionPool,
  insertChampionPoolRows,
} from '../../../../services/supabase/championQueries'

export function useChampionPool() {
  const saveChampionPool = useCallback(async (playerId, tiers) => {
    if (!supabase) throw new Error('Supabase non configuré')

    await clearPlayerChampionPool(playerId)

    const rows = []
    TIER_KEYS.forEach((tier) => {
      ;(tiers[tier] || []).forEach((champ) => {
        rows.push({ player_id: playerId, champion_id: champ.id, tier, mastery_level: 0 })
      })
    })

    if (rows.length === 0) return { success: true }

    const { error } = await insertChampionPoolRows(rows)
    if (error) throw error
    return { success: true }
  }, [])

  const saveAllChampionPools = useCallback(
    async (tiersByPlayer) => {
      for (const [playerId, tiers] of Object.entries(tiersByPlayer)) {
        await saveChampionPool(playerId, tiers)
      }
      return { success: true }
    },
    [saveChampionPool]
  )

  const buildTiersFromPlayers = useCallback((players = [], champions = []) => {
    const champMap = Object.fromEntries(champions.map((c) => [c.id, c]))
    const tiersByPlayer = {}

    players.forEach((player) => {
      const pools = player.champion_pools || []
      tiersByPlayer[player.id] = Object.fromEntries(TIER_KEYS.map((k) => [k, []]))
      pools.forEach((pool) => {
        const tier = pool.tier || 'A'
        if (TIER_KEYS.includes(tier)) {
          const champ = champMap[pool.champion_id] || {
            id: pool.champion_id,
            name: pool.champion_id,
          }
          if (!tiersByPlayer[player.id][tier].some((c) => c.id === champ.id)) {
            tiersByPlayer[player.id][tier].push(champ)
          }
        }
      })
    })

    return tiersByPlayer
  }, [])

  return { saveChampionPool, saveAllChampionPools, buildTiersFromPlayers }
}
