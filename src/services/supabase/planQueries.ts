import { supabase } from '../../lib/supabase'
import type { PlanFolder, PlanFile, CanvasData } from '../../pages/team/plans/types'

export async function fetchPlanFolders(teamId: string): Promise<PlanFolder[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('plan_folders')
    .select('*, files:plan_files(*)')
    .eq('team_id', teamId)
    .order('position', { ascending: true })
    .order('created_at', { referencedTable: 'plan_files', ascending: true })
  if (error) { console.error('fetchPlanFolders', error); return [] }
  return (data ?? []) as PlanFolder[]
}

export async function createPlanFolder(teamId: string, name: string): Promise<PlanFolder | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('plan_folders')
    .insert({ team_id: teamId, name })
    .select()
    .single()
  if (error) { console.error('createPlanFolder', error); return null }
  return data as PlanFolder
}

export async function renamePlanFolder(folderId: string, name: string): Promise<void> {
  if (!supabase) return
  await supabase.from('plan_folders').update({ name, updated_at: new Date().toISOString() }).eq('id', folderId)
}

export async function deletePlanFolder(folderId: string): Promise<void> {
  if (!supabase) return
  await supabase.from('plan_folders').delete().eq('id', folderId)
}

export async function createPlanFile(
  folderId: string,
  teamId: string,
  name: string,
  canvasData: CanvasData,
): Promise<PlanFile | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('plan_files')
    .insert({ folder_id: folderId, team_id: teamId, name, canvas_data: canvasData })
    .select()
    .single()
  if (error) { console.error('createPlanFile', error); return null }
  return data as PlanFile
}

export async function renamePlanFile(fileId: string, name: string): Promise<void> {
  if (!supabase) return
  await supabase.from('plan_files').update({ name, updated_at: new Date().toISOString() }).eq('id', fileId)
}

export async function savePlanFile(fileId: string, canvasData: CanvasData): Promise<void> {
  if (!supabase) return
  await supabase
    .from('plan_files')
    .update({ canvas_data: canvasData, updated_at: new Date().toISOString() })
    .eq('id', fileId)
}

export async function deletePlanFile(fileId: string): Promise<void> {
  if (!supabase) return
  await supabase.from('plan_files').delete().eq('id', fileId)
}
