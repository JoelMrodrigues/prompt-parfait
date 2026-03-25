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

export async function createTeam(userId: string, teamName: string, teamType = 'scrim') {
  const { data, error } = await supabase
    .from('teams')
    .insert([{ user_id: userId, team_name: teamName, team_type: teamType }])
    .select()
    .single()
  return { data, error }
}

export async function updateTeam(teamId: string, updates: Record<string, unknown>) {
  const { data, error } = await supabase
    .from('teams')
    .update(updates)
    .eq('id', teamId)
    .select()
    .single()
  return { data, error }
}

export async function getOrCreateInviteToken(teamId: string) {
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

export async function deleteTeam(teamId: string) {
  const { error } = await supabase
    .from('teams')
    .delete()
    .eq('id', teamId)
  return { error }
}

export async function joinTeamByToken(
  token: string,
  role = 'member',
  position: string | null = null,
  playerId: string | null = null
) {
  const { data, error } = await supabase.rpc('join_team_by_token', {
    p_token: token,
    p_role: role,
    p_position: position,
    p_player_id: playerId,
  })
  return { data, error }
}

export async function fetchTeamByInviteToken(token: string) {
  const { data, error } = await supabase
    .from('teams')
    .select('id, team_name, logo_url')
    .eq('invite_token', token)
    .maybeSingle()
  return { data, error }
}

export interface TeamPreview {
  id: string
  team_name: string
  logo_url?: string | null
  players: { id: string; player_name: string; position: string; top_champion?: string | null }[]
}

export async function getTeamPreviewByToken(token: string): Promise<TeamPreview | null> {
  const { data, error } = await supabase.rpc('get_team_preview_by_token', { p_token: token })
  if (error || !data) return null
  return data as TeamPreview
}

export interface TeamMemberWithEmail {
  id: string
  user_id: string
  email: string
  role: string
  position: string | null
  player_id: string | null
  created_at: string
}

export async function getTeamMembersWithEmail(teamId: string): Promise<TeamMemberWithEmail[]> {
  const { data, error } = await supabase.rpc('get_team_members_with_email', { p_team_id: teamId })
  if (error || !data) return []
  return data as TeamMemberWithEmail[]
}

export async function removeTeamMember(teamId: string, userId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('remove_team_member', { p_team_id: teamId, p_user_id: userId })
  if (error) return false
  return !!data
}

export async function updateTeamMemberRole(
  teamId: string,
  userId: string,
  role: string,
  position?: string | null
) {
  const updates: Record<string, unknown> = { role }
  if (position !== undefined) updates.position = position
  const { error } = await supabase
    .from('team_members')
    .update(updates)
    .eq('team_id', teamId)
    .eq('user_id', userId)
  return { error }
}
