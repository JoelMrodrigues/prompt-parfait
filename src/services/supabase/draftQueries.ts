/**
 * Requêtes Supabase — table `drafts`
 * Migration requise :
 *   CREATE TABLE IF NOT EXISTS drafts (
 *     id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 *     team_id             uuid REFERENCES teams(id) ON DELETE CASCADE,
 *     title               text NOT NULL DEFAULT 'Nouvelle draft',
 *     champion_picks_json jsonb,
 *     created_at          timestamptz DEFAULT now(),
 *     updated_at          timestamptz DEFAULT now()
 *   );
 */
import { supabase } from '../../lib/supabase'

export interface DraftSlots {
  ourPicks: (string | null)[]
  ourBans: (string | null)[]
  enemyPicks: (string | null)[]
  enemyBans: (string | null)[]
}

export interface Draft {
  id: string
  team_id: string
  title: string
  champion_picks_json: DraftSlots | null
  created_at: string
  updated_at: string
}

const EMPTY_SLOTS = (): DraftSlots => ({
  ourPicks: [null, null, null, null, null],
  ourBans: [null, null, null, null, null],
  enemyPicks: [null, null, null, null, null],
  enemyBans: [null, null, null, null, null],
})

export { EMPTY_SLOTS }

export async function fetchDraftsByTeam(teamId: string) {
  const { data, error } = await supabase
    .from('drafts')
    .select('*')
    .eq('team_id', teamId)
    .order('updated_at', { ascending: false })
  return { data: data as Draft[] | null, error }
}

export async function createDraft(teamId: string, title = 'Nouvelle draft') {
  const { data, error } = await supabase
    .from('drafts')
    .insert([{ team_id: teamId, title, champion_picks_json: EMPTY_SLOTS() }])
    .select()
    .single()
  return { data: data as Draft | null, error }
}

export async function updateDraft(id: string, patch: Partial<Pick<Draft, 'title' | 'champion_picks_json'>>) {
  const { data, error } = await supabase
    .from('drafts')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  return { data: data as Draft | null, error }
}

export async function deleteDraft(id: string) {
  const { error } = await supabase.from('drafts').delete().eq('id', id)
  return { error }
}
