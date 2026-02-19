/**
 * Requêtes Supabase — table `teams`
 */
import { supabase } from '../../lib/supabase'

export async function fetchFirstTeam() {
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .order('created_at', { ascending: true })
    .limit(1)
  return { data: Array.isArray(data) ? data[0] : data, error }
}

export async function createTeam(userId, teamName) {
  const { data, error } = await supabase
    .from('teams')
    .insert([{ user_id: userId, team_name: teamName }])
    .select()
    .single()
  return { data, error }
}

export async function updateTeam(teamId, updates) {
  const { data, error } = await supabase
    .from('teams')
    .update(updates)
    .eq('id', teamId)
    .select()
    .single()
  return { data, error }
}

export async function getOrCreateInviteToken(teamId) {
  const { data: teamRow } = await supabase
    .from('teams')
    .select('invite_token')
    .eq('id', teamId)
    .single()

  if (teamRow?.invite_token) return teamRow.invite_token

  const { data: updated } = await supabase
    .from('teams')
    .update({ invite_token: crypto.randomUUID() })
    .eq('id', teamId)
    .select('invite_token')
    .single()

  return updated?.invite_token || null
}

export async function joinTeamByToken(token) {
  const { data, error } = await supabase.rpc('join_team_by_token', { p_token: token })
  return { data, error }
}
