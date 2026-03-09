/**
 * Requêtes Supabase — tables `team_matches`, `team_match_participants`, `team_match_timeline`
 */
import { supabase } from '../../lib/supabase'
import { perf } from '../../lib/logger'

// ─── TEAM MATCHES ────────────────────────────────────────────────────────────

// Requête légère — pour la liste des matchs (MatchsPage, ImportPage)
// Split en 2 requêtes pour éviter le JSON aggregation PostgREST (embedded join lent)
export async function fetchTeamMatchesList(teamId) {
  perf.start('fetchTeamMatchesList')

  // Étape 1 : matchs seulement (pas de join)
  const { data: matches, error } = await supabase
    .from('team_matches')
    .select('*')
    .eq('team_id', teamId)
    .order('game_creation', { ascending: false })
    .limit(50)

  if (error || !matches?.length) {
    perf.end('fetchTeamMatchesList')
    return { data: matches ?? [], error }
  }

  // Étape 2 : participants pour ces matchs (1 seule requête .in)
  const matchIds = matches.map((m) => m.id)
  const { data: participants } = await supabase
    .from('team_match_participants')
    .select('id, match_id, player_id, champion_name, role, team_side, win, kills, deaths, assists')
    .in('match_id', matchIds)

  // Fusion en mémoire
  const partsByMatch: Record<string, any[]> = {}
  for (const p of participants ?? []) {
    if (!partsByMatch[p.match_id]) partsByMatch[p.match_id] = []
    partsByMatch[p.match_id].push(p)
  }
  const data = matches.map((m) => ({ ...m, team_match_participants: partsByMatch[m.id] ?? [] }))

  perf.end('fetchTeamMatchesList')
  return { data, error: null }
}

// Requête complète — pour les stats (TeamStatsPage, DraftsPage)
export async function fetchTeamMatches(teamId) {
  const { data, error } = await supabase
    .from('team_matches')
    .select(
      `
      id, game_id, game_creation, game_duration, our_win, our_team_id, match_type,
      team_match_participants (
        id, player_id, participant_id, pseudo, champion_name, role, team_side,
        kills, deaths, assists, kda, total_damage_dealt_to_champions,
        gold_earned, cs, win, vision_score
      )
    `
    )
    .eq('team_id', teamId)
    .order('game_creation', { ascending: false })
  return { data, error }
}

export async function fetchMatchById(matchId) {
  const { data, error } = await supabase.from('team_matches').select('*').eq('id', matchId).single()
  return { data, error }
}

// ─── PARTICIPANTS ─────────────────────────────────────────────────────────────

export async function fetchParticipantsByMatch(matchId) {
  const { data, error } = await supabase
    .from('team_match_participants')
    .select('*')
    .eq('match_id', matchId)
  return { data, error }
}

export async function fetchPlayerMatchStats(playerId) {
  // Étape 1 : récupérer les participations du joueur
  const { data: parts, error } = await supabase
    .from('team_match_participants')
    .select('*')
    .eq('player_id', playerId)
    .limit(50)
  if (error || !parts?.length) return { data: parts ?? [], error }

  // Étape 2 : récupérer les matches correspondants
  const matchIds = [...new Set(parts.map((p) => p.match_id).filter(Boolean))]
  const { data: matches } = await supabase
    .from('team_matches')
    .select('id, game_id, game_duration, our_win, our_team_id, game_creation, match_type')
    .in('id', matchIds)
  const matchMap = Object.fromEntries((matches ?? []).map((m) => [m.id, m]))

  // Fusionner manuellement
  const merged = parts
    .map((p) => ({ ...p, team_matches: matchMap[p.match_id] ?? null }))
    .sort((a, b) => {
      const tA = a.team_matches?.game_creation ?? 0
      const tB = b.team_matches?.game_creation ?? 0
      return tB - tA
    })

  return { data: merged, error: null }
}

export async function fetchTeamTotalsByMatchIds(matchIds) {
  const { data, error } = await supabase
    .from('team_match_participants')
    .select('match_id, kills, gold_earned, total_damage_dealt_to_champions')
    .in('match_id', matchIds)
    .eq('team_side', 'our')
  return { data, error }
}

export async function updateParticipantRole(participantId, role) {
  const { error } = await supabase
    .from('team_match_participants')
    .update({ role })
    .eq('id', participantId)
  return { error }
}

// ─── TIMELINE ─────────────────────────────────────────────────────────────────

export async function fetchTimelineByMatch(matchId) {
  const { data, error } = await supabase
    .from('team_match_timeline')
    .select('snapshot')
    .eq('match_id', matchId)
    .maybeSingle()
  return { data, error }
}

export async function fetchTimelinesByMatchIds(matchIds) {
  const { data, error } = await supabase
    .from('team_match_timeline')
    .select('match_id, snapshot')
    .in('match_id', matchIds)
  return { data, error }
}
