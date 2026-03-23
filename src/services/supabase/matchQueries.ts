/**
 * Requêtes Supabase — tables `team_matches`, `team_match_participants`, `team_match_timeline`
 */
import { supabase } from '../../lib/supabase'
import { perf } from '../../lib/logger'

// ─── TEAM MATCHES ────────────────────────────────────────────────────────────

// Requête légère — pour la liste des matchs (MatchsPage, ImportPage)
// Utilise un RPC SECURITY DEFINER pour éviter les évaluations RLS row-by-row
// et fusionner les participants en un seul round-trip.
export async function fetchTeamMatchesList(teamId: string) {
  perf.start('fetchTeamMatchesList')

  const { data, error } = await supabase.rpc('get_team_matches_list', {
    p_team_id: teamId,
    p_limit: 200,
  })

  if (error) {
    console.warn('[fetchTeamMatchesList] RPC failed, using fallback:', error.message)
    const result = await fetchTeamMatchesListFallback(teamId)
    perf.end('fetchTeamMatchesList')
    return result
  }

  perf.end('fetchTeamMatchesList')
  const parsed = typeof data === 'string' ? JSON.parse(data) : data
  return { data: parsed?.matches ?? [], error: null }
}

async function fetchTeamMatchesListFallback(teamId: string) {
  const { data: matches, error } = await supabase
    .from('team_matches')
    .select('*')
    .eq('team_id', teamId)
    .order('game_creation', { ascending: false })
    .limit(200)

  if (error || !matches?.length) return { data: matches ?? [], error }

  const matchIds = matches.map((m: Record<string, unknown>) => m.id)
  const { data: participants } = await supabase
    .from('team_match_participants')
    .select('id, match_id, player_id, champion_name, role, team_side, win, kills, deaths, assists')
    .in('match_id', matchIds)

  const partsByMatch: Record<string, Array<Record<string, unknown>>> = {}
  for (const p of participants ?? []) {
    const mid = p.match_id as string
    if (!partsByMatch[mid]) partsByMatch[mid] = []
    partsByMatch[mid].push(p)
  }
  const data = matches.map((m: Record<string, unknown>) => ({ ...m, team_match_participants: partsByMatch[m.id as string] ?? [] }))
  return { data, error: null }
}

// Requête complète — pour les stats (TeamStatsPage, DraftsPage)
export async function fetchTeamMatches(teamId: string) {
  const { data, error } = await supabase
    .from('team_matches')
    .select(
      `
      id, game_id, game_creation, game_duration, our_win, our_team_id, match_type,
      team_match_participants (
        id, player_id, participant_id, pseudo, champion_name, role, team_side,
        kills, deaths, assists, kda, total_damage_dealt_to_champions,
        gold_earned, cs, win, vision_score, vision_wards_bought
      )
    `
    )
    .eq('team_id', teamId)
    .order('game_creation', { ascending: false })
  return { data, error }
}

export async function fetchMatchById(matchId: string) {
  const { data, error } = await supabase.from('team_matches').select('*').eq('id', matchId).single()
  return { data, error }
}

export async function deleteMatch(matchId: string) {
  // Supprime dans l'ordre pour respecter les FK (si pas de CASCADE en base)
  await supabase.from('team_match_timeline').delete().eq('match_id', matchId)
  await supabase.from('team_match_participants').delete().eq('match_id', matchId)
  const { error } = await supabase.from('team_matches').delete().eq('id', matchId)
  return { error }
}

// ─── PARTICIPANTS ─────────────────────────────────────────────────────────────

export async function fetchParticipantsByMatch(matchId: string) {
  const { data, error } = await supabase
    .from('team_match_participants')
    .select('*')
    .eq('match_id', matchId)
  return { data, error }
}

export async function fetchPlayerMatchStats(playerId: string) {
  // Étape 1 : récupérer les participations du joueur
  const { data: parts, error } = await supabase
    .from('team_match_participants')
    .select('*')
    .eq('player_id', playerId)
    .limit(50)
  if (error || !parts?.length) return { data: parts ?? [], error }

  // Étape 2 : récupérer les matches correspondants
  const matchIds = [...new Set(parts.map((p: Record<string, unknown>) => p.match_id).filter(Boolean))]
  const { data: matches } = await supabase
    .from('team_matches')
    .select('id, game_id, game_duration, our_win, our_team_id, game_creation, match_type')
    .in('id', matchIds)
  const matchMap = Object.fromEntries((matches ?? []).map((m: Record<string, unknown>) => [m.id, m]))

  // Fusionner manuellement
  const merged = parts
    .map((p: Record<string, unknown>) => ({ ...p, team_matches: matchMap[p.match_id as string] ?? null }))
    .sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
      const tA = (a.team_matches as Record<string, unknown>)?.game_creation as number ?? 0
      const tB = (b.team_matches as Record<string, unknown>)?.game_creation as number ?? 0
      return tB - tA
    })

  return { data: merged, error: null }
}

export async function fetchTeamTotalsByMatchIds(matchIds: string[]) {
  const { data, error } = await supabase
    .from('team_match_participants')
    .select('match_id, kills, gold_earned, total_damage_dealt_to_champions')
    .in('match_id', matchIds)
    .eq('team_side', 'our')
  return { data, error }
}

export async function updateParticipantRole(participantId: string, role: string) {
  const { error } = await supabase
    .from('team_match_participants')
    .update({ role })
    .eq('id', participantId)
  return { error }
}

// ─── TIMELINE ─────────────────────────────────────────────────────────────────

export async function fetchTimelineByMatch(matchId: string) {
  const { data, error } = await supabase
    .from('team_match_timeline')
    .select('snapshot')
    .eq('match_id', matchId)
    .maybeSingle()
  return { data, error }
}

export async function fetchTimelinesByMatchIds(matchIds: string[]) {
  const { data, error } = await supabase
    .from('team_match_timeline')
    .select('match_id, snapshot')
    .in('match_id', matchIds)
  return { data, error }
}
