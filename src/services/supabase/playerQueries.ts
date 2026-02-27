/**
 * Requêtes Supabase — tables `players` et `player_soloq_matches`
 */
import { supabase } from '../../lib/supabase'

// ─── PLAYERS ─────────────────────────────────────────────────────────────────

export async function fetchPlayersByTeam(teamId) {
  const { data, error } = await supabase
    .from('players')
    .select('*, champion_pools(*)')
    .eq('team_id', teamId)
    .order('player_order')
  return { data, error }
}

export async function createPlayer(playerData) {
  const { data, error } = await supabase.from('players').insert([playerData]).select().single()
  return { data, error }
}

export async function updatePlayer(playerId, updates) {
  const { data, error } = await supabase.from('players').update(updates).eq('id', playerId).select()
  return { data, error }
}

export async function updatePlayerSilent(playerId, updates) {
  const { error } = await supabase.from('players').update(updates).eq('id', playerId)
  return { error }
}

export async function deletePlayer(playerId) {
  const { error } = await supabase.from('players').delete().eq('id', playerId)
  return { error }
}

// ─── PLAYER SOLOQ MATCHES ────────────────────────────────────────────────────

export async function fetchSoloqMatches({
  playerId,
  accountSource,
  seasonStart,
  offset = 0,
  limit = 20,
  withCount = false,
}) {
  const query = supabase
    .from('player_soloq_matches')
    .select('*', withCount ? { count: 'exact' } : undefined)
    .eq('player_id', playerId)
    .eq('account_source', accountSource)
    .gte('game_creation', seasonStart)
    .order('game_creation', { ascending: false })
    .range(offset, offset + limit - 1)

  const { data, error, count } = await query
  return { data, error, count }
}

/** Liste des riot_match_id déjà en base (S16) pour un joueur — pour diff avec Riot */
export async function fetchSoloqMatchIds(playerId: string, accountSource: string, seasonStart: number) {
  const { data, error } = await supabase
    .from('player_soloq_matches')
    .select('riot_match_id')
    .eq('player_id', playerId)
    .eq('account_source', accountSource)
    .gte('game_creation', seasonStart)
  if (error) return { data: [], error }
  const ids = (data || []).map((r: { riot_match_id: string }) => r.riot_match_id).filter(Boolean)
  return { data: ids, error: null }
}

export async function fetchSoloqChampionStats({
  playerId,
  accountSource,
  seasonStart,
  minDuration = undefined,
}) {
  let query = supabase
    .from('player_soloq_matches')
    .select('champion_name, win, kills, deaths, assists')
    .eq('player_id', playerId)
    .eq('account_source', accountSource)
    .gte('game_creation', seasonStart)

  if (minDuration) query = query.gte('game_duration', minDuration)

  const { data, error } = await query
  return { data, error }
}

export async function fetchSoloqMatchesByChampion({
  playerId,
  accountSource,
  championName,
  minDuration,
}) {
  let query = supabase
    .from('player_soloq_matches')
    .select('*')
    .eq('player_id', playerId)
    .eq('account_source', accountSource)
    .eq('champion_name', championName)
    .order('game_creation', { ascending: false })

  if (minDuration) query = query.gte('game_duration', minDuration)

  const { data, error } = await query
  return { data, error }
}

export async function fetchSoloqTopChampions(playerId, accountSource, seasonStart) {
  const { data, error } = await supabase
    .from('player_soloq_matches')
    .select('champion_name, win')
    .eq('player_id', playerId)
    .eq('account_source', accountSource)
    .gte('game_creation', seasonStart)
  return { data, error }
}

export async function upsertSoloqMatches(rows) {
  const { error } = await supabase
    .from('player_soloq_matches')
    .upsert(rows, { onConflict: 'player_id,riot_match_id' })
  return { error }
}
