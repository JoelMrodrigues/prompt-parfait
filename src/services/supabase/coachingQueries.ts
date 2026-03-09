/**
 * Requêtes Supabase — tables Coaching
 * Migrations requises :
 *
 * CREATE TABLE IF NOT EXISTS coaching_notes (
 *   id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 *   team_id    uuid REFERENCES teams(id) ON DELETE CASCADE,
 *   player_id  uuid REFERENCES players(id) ON DELETE CASCADE,
 *   content    text NOT NULL,
 *   created_at timestamptz DEFAULT now()
 * );
 *
 * CREATE TABLE IF NOT EXISTS coaching_objectives (
 *   id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 *   team_id    uuid REFERENCES teams(id) ON DELETE CASCADE,
 *   player_id  uuid REFERENCES players(id) ON DELETE CASCADE,
 *   title      text NOT NULL,
 *   status     text NOT NULL DEFAULT 'ongoing',
 *   due_date   date,
 *   created_at timestamptz DEFAULT now()
 * );
 *
 * CREATE TABLE IF NOT EXISTS coaching_vods (
 *   id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 *   team_id     uuid REFERENCES teams(id) ON DELETE CASCADE,
 *   player_id   uuid REFERENCES players(id) ON DELETE CASCADE,
 *   url         text NOT NULL,
 *   description text,
 *   created_at  timestamptz DEFAULT now()
 * );
 */
import { supabase } from '../../lib/supabase'

// ─── Notes ────────────────────────────────────────────────────────────────────

export async function fetchNotes(teamId: string, playerId: string | null) {
  let q = supabase
    .from('coaching_notes')
    .select('*')
    .eq('team_id', teamId)
    .order('created_at', { ascending: false })
  if (playerId) q = q.eq('player_id', playerId)
  else q = q.is('player_id', null)
  const { data, error } = await q
  return { data, error }
}

export async function addNote(teamId: string, playerId: string | null, content: string) {
  const row: any = { team_id: teamId, content }
  if (playerId) row.player_id = playerId
  const { data, error } = await supabase.from('coaching_notes').insert([row]).select().single()
  return { data, error }
}

export async function deleteNote(id: string) {
  const { error } = await supabase.from('coaching_notes').delete().eq('id', id)
  return { error }
}

// ─── Objectives ────────────────────────────────────────────────────────────────

export type ObjectiveStatus = 'ongoing' | 'achieved' | 'abandoned'

export async function fetchObjectives(teamId: string, playerId: string | null) {
  let q = supabase
    .from('coaching_objectives')
    .select('*')
    .eq('team_id', teamId)
    .order('created_at', { ascending: false })
  if (playerId) q = q.eq('player_id', playerId)
  else q = q.is('player_id', null)
  const { data, error } = await q
  return { data, error }
}

export async function addObjective(
  teamId: string,
  playerId: string | null,
  title: string,
  dueDate?: string | null
) {
  const row: any = { team_id: teamId, title, status: 'ongoing' }
  if (playerId) row.player_id = playerId
  if (dueDate) row.due_date = dueDate
  const { data, error } = await supabase.from('coaching_objectives').insert([row]).select().single()
  return { data, error }
}

export async function updateObjectiveStatus(id: string, status: ObjectiveStatus) {
  const { data, error } = await supabase
    .from('coaching_objectives')
    .update({ status })
    .eq('id', id)
    .select()
    .single()
  return { data, error }
}

export async function deleteObjective(id: string) {
  const { error } = await supabase.from('coaching_objectives').delete().eq('id', id)
  return { error }
}

// ─── VODs ─────────────────────────────────────────────────────────────────────

export async function fetchVods(teamId: string, playerId: string | null) {
  let q = supabase
    .from('coaching_vods')
    .select('*')
    .eq('team_id', teamId)
    .order('created_at', { ascending: false })
  if (playerId) q = q.eq('player_id', playerId)
  else q = q.is('player_id', null)
  const { data, error } = await q
  return { data, error }
}

export async function addVod(
  teamId: string,
  playerId: string | null,
  url: string,
  description: string
) {
  const row: any = { team_id: teamId, url, description }
  if (playerId) row.player_id = playerId
  const { data, error } = await supabase.from('coaching_vods').insert([row]).select().single()
  return { data, error }
}

export async function deleteVod(id: string) {
  const { error } = await supabase.from('coaching_vods').delete().eq('id', id)
  return { error }
}
