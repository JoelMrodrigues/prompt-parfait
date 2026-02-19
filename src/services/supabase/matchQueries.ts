/**
 * Requêtes Supabase — tables `team_matches`, `team_match_participants`, `team_match_timeline`
 */
import { supabase } from '../../lib/supabase'

// ─── TEAM MATCHES ────────────────────────────────────────────────────────────

export async function fetchTeamMatches(teamId) {
  const { data, error } = await supabase
    .from('team_matches')
    .select(
      `
      *,
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
  const { data, error } = await supabase
    .from('team_match_participants')
    .select(
      `
      *,
      team_matches (
        game_id, game_duration, our_win, our_team_id
      )
    `
    )
    .eq('player_id', playerId)
    .order('created_at', { ascending: false })
    .limit(50)
  return { data, error }
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
