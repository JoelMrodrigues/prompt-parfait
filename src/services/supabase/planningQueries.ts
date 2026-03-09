/**
 * Requêtes Supabase — tables Planning
 * Migrations requises :
 *
 * CREATE TABLE IF NOT EXISTS scrim_sessions (
 *   id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 *   team_id       uuid REFERENCES teams(id) ON DELETE CASCADE,
 *   date          date NOT NULL,
 *   time          time,
 *   opponent_team text,
 *   notes         text,
 *   result        text,         -- 'win' | 'loss' | 'draw' | null
 *   created_at    timestamptz DEFAULT now()
 * );
 *
 * CREATE TABLE IF NOT EXISTS player_availability (
 *   id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 *   player_id   uuid REFERENCES players(id) ON DELETE CASCADE,
 *   team_id     uuid REFERENCES teams(id) ON DELETE CASCADE,
 *   day_of_week int NOT NULL,   -- 0=Lun, 1=Mar, ..., 6=Dim
 *   slot        text NOT NULL,  -- 'matin' | 'apres-midi' | 'soiree'
 *   available   boolean NOT NULL DEFAULT true,
 *   UNIQUE(player_id, day_of_week, slot)
 * );
 */
import { supabase } from '../../lib/supabase'

// ─── Scrim Sessions ────────────────────────────────────────────────────────────

export type SessionResult = 'win' | 'loss' | 'draw' | null

export interface ScrimSession {
  id: string
  team_id: string
  date: string
  time: string | null
  opponent_team: string | null
  notes: string | null
  result: SessionResult
  created_at: string
}

export async function fetchSessions(teamId: string, year: number, month: number) {
  const from = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const to = `${year}-${String(month).padStart(2, '0')}-${lastDay}`
  const { data, error } = await supabase
    .from('scrim_sessions')
    .select('*')
    .eq('team_id', teamId)
    .gte('date', from)
    .lte('date', to)
    .order('date')
    .order('time')
  return { data: data as ScrimSession[] | null, error }
}

export async function addSession(
  teamId: string,
  date: string,
  opponent: string,
  time: string,
  notes: string
) {
  const row: any = { team_id: teamId, date }
  if (opponent) row.opponent_team = opponent
  if (time) row.time = time
  if (notes) row.notes = notes
  const { data, error } = await supabase.from('scrim_sessions').insert([row]).select().single()
  return { data: data as ScrimSession | null, error }
}

export async function updateSessionResult(id: string, result: SessionResult) {
  const { data, error } = await supabase
    .from('scrim_sessions')
    .update({ result })
    .eq('id', id)
    .select()
    .single()
  return { data: data as ScrimSession | null, error }
}

export async function updateSessionNotes(id: string, notes: string) {
  const { data, error } = await supabase
    .from('scrim_sessions')
    .update({ notes })
    .eq('id', id)
    .select()
    .single()
  return { data: data as ScrimSession | null, error }
}

export async function deleteSession(id: string) {
  const { error } = await supabase.from('scrim_sessions').delete().eq('id', id)
  return { error }
}

// ─── Player Availability ───────────────────────────────────────────────────────

export async function fetchAvailability(teamId: string) {
  const { data, error } = await supabase
    .from('player_availability')
    .select('*')
    .eq('team_id', teamId)
  return { data, error }
}

export async function upsertAvailability(
  teamId: string,
  playerId: string,
  dayOfWeek: number,
  slot: string,
  available: boolean
) {
  const { data, error } = await supabase
    .from('player_availability')
    .upsert(
      { team_id: teamId, player_id: playerId, day_of_week: dayOfWeek, slot, available },
      { onConflict: 'player_id,day_of_week,slot' }
    )
    .select()
    .single()
  return { data, error }
}
