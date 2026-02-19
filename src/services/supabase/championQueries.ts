/**
 * Requêtes Supabase — table `champion_pools`
 */
import { supabase } from '../../lib/supabase'

export async function addChampionToPool(playerId, championId, masteryLevel) {
  const { data, error } = await supabase
    .from('champion_pools')
    .insert([{ player_id: playerId, champion_id: championId, mastery_level: masteryLevel }])
    .select()
    .single()
  return { data, error }
}

export async function removeChampionFromPool(poolId) {
  const { error } = await supabase.from('champion_pools').delete().eq('id', poolId)
  return { error }
}

export async function clearPlayerChampionPool(playerId) {
  const { error } = await supabase.from('champion_pools').delete().eq('player_id', playerId)
  return { error }
}

export async function insertChampionPoolRows(rows) {
  const { error } = await supabase.from('champion_pools').insert(rows)
  return { error }
}
