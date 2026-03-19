/**
 * Requêtes Supabase — table `team_match_blocks`
 */
import { supabase } from '../../lib/supabase'
import type { TeamMatchBlock, CreateBlockPayload } from '../../types/matchBlocks'

export async function fetchBlocksByTeam(teamId: string): Promise<{ data: TeamMatchBlock[]; error: unknown }> {
  const { data, error } = await supabase
    .from('team_match_blocks')
    .select('*')
    .eq('team_id', teamId)
    .order('played_at', { ascending: false, nullsFirst: false })
  return { data: (data as TeamMatchBlock[]) ?? [], error }
}

export async function createBlock(
  teamId: string,
  payload: CreateBlockPayload,
): Promise<{ data: TeamMatchBlock | null; error: unknown }> {
  const { data, error } = await supabase
    .from('team_match_blocks')
    .insert([{ team_id: teamId, ...payload }])
    .select()
    .single()
  return { data: data as TeamMatchBlock | null, error }
}

export async function updateBlock(
  blockId: string,
  payload: Partial<CreateBlockPayload>,
): Promise<{ error: unknown }> {
  const { error } = await supabase
    .from('team_match_blocks')
    .update(payload)
    .eq('id', blockId)
  return { error }
}

export async function deleteBlock(blockId: string): Promise<{ error: unknown }> {
  const { error } = await supabase
    .from('team_match_blocks')
    .delete()
    .eq('id', blockId)
  return { error }
}

/** Assigne (ou désassigne si blockId = null) un lot de parties à un bloc */
export async function assignMatchesToBlock(
  matchIds: string[],
  blockId: string | null,
): Promise<{ error: unknown }> {
  if (!matchIds.length) return { error: null }
  const { error } = await supabase
    .from('team_matches')
    .update({ block_id: blockId })
    .in('id', matchIds)
  return { error }
}
