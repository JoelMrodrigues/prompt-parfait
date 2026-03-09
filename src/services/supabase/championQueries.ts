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

// Supprime toutes les lignes sauf Training (utilisé par le save de la Pool Champ)
export async function clearPlayerPoolExcludingTraining(playerId) {
  const { error } = await supabase
    .from('champion_pools')
    .delete()
    .eq('player_id', playerId)
    .neq('tier', 'Training')
  return { error }
}

export async function insertChampionPoolRows(rows) {
  const { error } = await supabase.from('champion_pools').insert(rows)
  return { error }
}

// ─── Training pool (depuis coaching) ──────────────────────────────────────────

export async function fetchTrainingPool(playerId: string) {
  const { data, error } = await supabase
    .from('champion_pools')
    .select('id, champion_id')
    .eq('player_id', playerId)
    .eq('tier', 'Training')
  return { data, error }
}

export async function addToTrainingPool(playerId: string, championId: string) {
  // Vérifie qu'il n'existe pas déjà (évite les doublons)
  const { data: existing } = await supabase
    .from('champion_pools')
    .select('id')
    .eq('player_id', playerId)
    .eq('champion_id', championId)
    .eq('tier', 'Training')
    .maybeSingle()
  if (existing) return { data: existing, error: null }

  const { data, error } = await supabase
    .from('champion_pools')
    .insert([{ player_id: playerId, champion_id: championId, tier: 'Training', mastery_level: 0 }])
    .select()
    .single()
  return { data, error }
}

export async function removeFromTrainingPool(playerId: string, championId: string) {
  const { error } = await supabase
    .from('champion_pools')
    .delete()
    .eq('player_id', playerId)
    .eq('champion_id', championId)
    .eq('tier', 'Training')
  return { error }
}
