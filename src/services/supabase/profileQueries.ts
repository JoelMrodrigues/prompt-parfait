/**
 * Requêtes Supabase — table `profiles` + `teams` (multi-équipes)
 */
import { supabase } from '../../lib/supabase'

export interface Profile {
  id: string
  display_name: string | null
  avatar_url: string | null
  active_team_id: string | null
  created_at: string
  updated_at: string
}

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()
  if (error) {
    console.error('fetchProfile error:', error)
    return null
  }
  return data
}

export async function upsertProfile(
  userId: string,
  updates: Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at'>>
): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .upsert({ id: userId, ...updates, updated_at: new Date().toISOString() })
    .select()
    .single()
  if (error) {
    console.error('upsertProfile error:', error)
    return null
  }
  return data
}

export async function fetchAllTeams(userId: string) {
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
  return { data: data || [], error }
}
