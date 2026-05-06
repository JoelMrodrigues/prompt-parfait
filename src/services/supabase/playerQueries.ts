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
  queueType?: string
}

export async function fetchSoloqMatches({
  playerId,
  accountSource,
  seasonStart,
  offset = 0,
  limit = 20,
  withCount = false,
  queueType,
}: FetchSoloqMatchesParams) {
  let query = supabase
    .from('player_soloq_matches')
    .select('*', withCount ? { count: 'exact' } : undefined)
    .eq('player_id', playerId)
    .gte('game_creation', seasonStart)
    .order('game_creation', { ascending: false })
    .range(offset, offset + limit - 1)

  // 'combined' = les deux comptes, pas de filtre account_source
  if (accountSource !== 'combined') {
    query = query.eq('account_source', accountSource)
  }
  if (queueType) query = query.eq('queue_type', queueType)

  const { data, error, count } = await query
  return { data, error, count }
}

/** Liste des riot_match_id déjà en base (S16) pour un joueur — pour diff avec Riot */
export async function fetchSoloqMatchIds(playerId: string, accountSource: string, seasonStart: number, queueType?: string) {
  let query = supabase
    .from('player_soloq_matches')
    .select('riot_match_id')
    .eq('player_id', playerId)
    .eq('account_source', accountSource)
    .gte('game_creation', seasonStart)
  if (queueType) query = query.eq('queue_type', queueType)
  const { data, error } = await query
  if (error) return { data: [], error }
  const ids = (data || []).map((r: { riot_match_id: string }) => r.riot_match_id).filter(Boolean)
  return { data: ids, error: null }
}

interface FetchSoloqChampionStatsParams {
  playerId: string
  accountSource: string
  seasonStart: number
  minDuration?: number
  queueType?: string
}

export async function fetchSoloqChampionStats({
  playerId,
  accountSource,
  seasonStart,
  minDuration = undefined,
  queueType,
}: FetchSoloqChampionStatsParams) {
  let query = supabase
    .from('player_soloq_matches')
    .select('champion_name, win, kills, deaths, assists')
    .eq('player_id', playerId)
    .gte('game_creation', seasonStart)

  if (accountSource !== 'combined') {
    query = query.eq('account_source', accountSource)
  }
  if (minDuration) query = query.gte('game_duration', minDuration)
  if (queueType) query = query.eq('queue_type', queueType)

  const { data, error } = await query
  return { data, error }
}

interface FetchSoloqMatchesByChampionParams {
  playerId: string
  accountSource: string
  championName: string
  minDuration?: number
  queueType?: string
}

export async function fetchSoloqMatchesByChampion({
  playerId,
  accountSource,
  championName,
  minDuration,
  queueType,
}: FetchSoloqMatchesByChampionParams) {
  let query = supabase
    .from('player_soloq_matches')
    .select('*')
    .eq('player_id', playerId)
    .eq('champion_name', championName)
    .order('game_creation', { ascending: false })
    .limit(50)

  if (accountSource !== 'combined') {
    query = query.eq('account_source', accountSource)
  }
  if (minDuration) query = query.gte('game_duration', minDuration)
  if (queueType) query = query.eq('queue_type', queueType)

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
  const counts = await fetchWeeklySoloqCounts([playerId])
  return counts[playerId] ?? 0
}

/** Retourne le nombre de parties SoloQ de la semaine pour plusieurs joueurs en 1 requête */
export async function fetchWeeklySoloqCounts(playerIds: string[]): Promise<Record<string, number>> {
  if (!playerIds.length) return {}

  const now = new Date()
  const dayOfWeek = now.getDay()
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const monday = new Date(now)
  monday.setDate(now.getDate() + diffToMonday)
  monday.setHours(0, 0, 0, 0)

  const { data, error } = await supabase
    .from('player_soloq_matches')
    .select('player_id')
    .in('player_id', playerIds)
    .gte('game_creation', monday.getTime())

  if (error || !data) return {}

  // Aggregation JS — 1 requête au lieu de N
  const counts: Record<string, number> = {}
  for (const row of data) {
    counts[row.player_id] = (counts[row.player_id] ?? 0) + 1
  }
  return counts
}

/** Retourne les riot_match_id des parties sans match_json (non enrichies) — max `limit` IDs */
export async function fetchUnenrichedMatchIds(
  playerId: string,
  accountSource: string,
  seasonStart: number,
  limit = 60,
  queueType?: string,
): Promise<{ data: string[]; error: unknown }> {
  let query = supabase
    .from('player_soloq_matches')
    .select('riot_match_id')
    .eq('player_id', playerId)
    .eq('account_source', accountSource)
    .gte('game_creation', seasonStart)
    .or('match_json.is.null,runes.is.null')
    .order('game_creation', { ascending: false })
    .limit(limit)
  if (queueType) query = query.eq('queue_type', queueType)
  const { data, error } = await query
  if (error) return { data: [], error }
  return { data: (data || []).map((r: { riot_match_id: string }) => r.riot_match_id).filter(Boolean), error: null }
}

/**
 * Récupère les parties SoloQ de plusieurs joueurs en une seule requête (évite N+1).
 */
export async function fetchMultiPlayerSoloqMatches({
  playerIds,
  accountSource,
  seasonStart,
  minDuration,
  columns = '*',
  queueType,
}: {
  playerIds: string[]
  accountSource: string
  seasonStart: number
  minDuration?: number
  columns?: string
  queueType?: string
}) {
  if (!playerIds.length) return { data: [] as any[], error: null }
  let query = supabase
    .from('player_soloq_matches')
    .select(columns)
    .in('player_id', playerIds)
    .gte('game_creation', seasonStart)
    .order('game_creation', { ascending: false })
  // 'combined' = pas de filtre account_source (primary + secondary)
  if (accountSource !== 'combined') query = query.eq('account_source', accountSource)
  if (minDuration) query = query.gte('game_duration', minDuration)
  if (queueType) query = query.eq('queue_type', queueType)
  query = query.limit(300)
  const { data, error } = await query
  return { data: data ?? [], error }
}

// Colonnes copiées lors du bootstrap — exclut match_json et timeline_json (trop volumineux)
// Ces champs seront re-fetched par l'étape de ré-enrichissement au prochain cycle.
const BOOTSTRAP_COLUMNS =
  'riot_match_id,account_source,queue_type,champion_id,champion_name,opponent_champion,' +
  'individual_position,win,kills,deaths,assists,game_duration,game_creation,' +
  'total_damage,cs,vision_score,gold_earned,items,runes'

/**
 * Copie les matchs SoloQ d'un autre joueur partageant le même PUUID vers targetPlayerId.
 * Évite de re-fetcher toute l'historique Riot quand un joueur est ajouté dans une nouvelle équipe.
 * Retourne le nombre de matchs copiés.
 */
export async function bootstrapMatchesFromPuuid(
  targetPlayerId: string,
  puuid: string,
  accountSource: string,
  seasonStart: number,
  queueType?: string,
  puuidField: 'puuid' | 'puuid_secondary' = 'puuid',
): Promise<number> {
  const { data: sourceData } = await supabase
    .from('players')
    .select('id')
    .eq(puuidField, puuid)
    .neq('id', targetPlayerId)
    .limit(1)

  if (!sourceData || sourceData.length === 0) return 0
  const sourcePlayerId = sourceData[0].id

  const BATCH = 200
  let offset = 0
  let totalCopied = 0

  while (true) {
    let query = supabase
      .from('player_soloq_matches')
      .select(BOOTSTRAP_COLUMNS)
      .eq('player_id', sourcePlayerId)
      .eq('account_source', accountSource)
      .gte('game_creation', seasonStart)
      .order('game_creation', { ascending: false })
      .range(offset, offset + BATCH - 1)

    if (queueType) query = query.eq('queue_type', queueType)

    const { data, error } = await query
    if (error || !data || data.length === 0) break

    const rows = (data as unknown as Record<string, unknown>[]).map((r) => ({ ...r, player_id: targetPlayerId }))
    const { error: upsertErr } = await supabase
      .from('player_soloq_matches')
      .upsert(rows, { onConflict: 'player_id,riot_match_id' })

    if (!upsertErr) totalCopied += rows.length
    if (data.length < BATCH) break
    offset += BATCH
  }

  return totalCopied
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
