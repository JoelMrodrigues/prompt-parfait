/**
 * Requêtes Supabase — table lol_runes (Data Dragon)
 */
import { supabase } from '../../lib/supabase'

export async function fetchAllRunes() {
  const { data, error } = await supabase
    .from('lol_runes')
    .select('id, key, name, icon, tree_name, slot_index')
    .order('tree_id')
    .order('slot_index')
  return { data, error }
}

export async function fetchRunesByIds(ids: number[]) {
  if (!ids?.length) return { data: [], error: null }
  const uniq = [...new Set(ids)].filter((x) => x != null && Number.isInteger(x))
  if (!uniq.length) return { data: [], error: null }
  const { data, error } = await supabase
    .from('lol_runes')
    .select('id, key, name, icon, tree_name')
    .in('id', uniq)
  return { data: data || [], error }
}
