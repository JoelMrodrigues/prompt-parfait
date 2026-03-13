/**
 * Requêtes Supabase — tables `players` et `player_soloq_matches`
 */
import { supabase } from '../../lib/supabase'

// ─── PLAYERS ─────────────────────────────────────────────────────────────────

export async function fetchPlayersByTeam(teamId: string) {
  const { data, error } = await supabase
    .from('players')
    .select('*, champion_pools(*)')
    .eq('team_id', teamId)
    .order('player_order')
  return { data, error }
}

export async function createPlayer(playerData: Record<string, unknown>) {
  const { data, error } = await supabase.from('players').insert([playerData]).select().single()
  return { data, error }
}

export async function updatePlayer(playerId: string, updates: Record<string, unknown>) {
  const { data, error } = await supabase.from('players').update(updates).eq('id', playerId).select()
  return { data, error }
}

export async function updatePlayerSilent(playerId: string, updates: Record<string, unknown>) {
  const { error } = await supabase.from('players').update(updates).eq('id', playerId)
  return { error }
}

export async function deletePlayer(playerId: string) {
  const { error } = await supabase.from('players').delete().eq('id', playerId)
  return { error }
}

// ─── PLAYER SOLOQ MATCHES ────────────────────────────────────────────────────

interface FetchSoloqMatchesParams {
  playerId: string
  accountSource: string
  seasonStart: number
  offset?: number
  limit?: number
  withCount?: boolean
}

export async function fetchSoloqMatches({
  playerId,
  accountSource,
  seasonStart,
  offset = 0,
  limit = 20,
  withCount = false,
}: FetchSoloqMatchesParams) {
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

interface FetchSoloqChampionStatsParams {
  playerId: string
  accountSource: string
  seasonStart: number
  minDuration?: number
}

export async function fetchSoloqChampionStats({
  playerId,
  accountSource,
  seasonStart,
  minDuration = undefined,
}: FetchSoloqChampionStatsParams) {
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

interface FetchSoloqMatchesByChampionParams {
  playerId: string
  accountSource: string
  championName: string
  minDuration?: number
}

export async function fetchSoloqMatchesByChampion({
  playerId,
  accountSource,
  championName,
  minDuration,
}: FetchSoloqMatchesByChampionParams) {
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

export async function fetchSoloqTopChampions(playerId: string, accountSource: string, seasonStart: number) {
  const { data, error } = await supabase
    .from('player_soloq_matches')
    .select('champion_name, win')
    .eq('player_id', playerId)
    .eq('account_source', accountSource)
    .gte('game_creation', seasonStart)
  return { data, error }
}

/**
 * Compte les parties SoloQ jouées depuis le lundi de la semaine courante.
 * Aucun appel API Riot — données déjà en base.
 */
export async function fetchWeeklySoloqCount(playerId: string): Promise<number> {
  const now = new Date()
  const dayOfWeek = now.getDay() // 0=dim, 1=lun, …
  const diffToMonday = (dayOfWeek === 0 ? -6 : 1 - dayOfWeek)
  const monday = new Date(now)
  monday.setDate(now.getDate() + diffToMonday)
  monday.setHours(0, 0, 0, 0)

  const { count, error } = await supabase
    .from('player_soloq_matches')
    .select('id', { count: 'exact', head: true })
    .eq('player_id', playerId)
    .gte('game_creation', monday.getTime())

  if (error || count == null) return 0
  return count
}

export async function upsertSoloqMatches(rows: Array<Record<string, unknown>>) {
  const { error } = await supabase
    .from('player_soloq_matches')
    .upsert(rows, { onConflict: 'player_id,riot_match_id' })
  return { error }
}

/** Met à jour match_json et/ou timeline_json pour une partie existante */
export async function updateSoloqMatchEnrichment(
  playerId: string,
  riotMatchId: string,
  updates: { match_json?: unknown; timeline_json?: unknown; total_damage?: number | null; cs?: number | null; vision_score?: number | null; gold_earned?: number | null },
) {
  const { error } = await supabase
    .from('player_soloq_matches')
    .update(updates)
    .eq('player_id', playerId)
    .eq('riot_match_id', riotMatchId)
  return { error }
}
