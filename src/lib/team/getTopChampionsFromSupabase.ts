/**
 * Récupère le top 5 champions les plus joués en Solo Q à partir des matchs déjà en base.
 * 0 requête API Riot — utilise uniquement player_soloq_matches (Supabase).
 */
import { supabase } from '../supabase'
import { fetchSoloqTopChampions } from '../../services/supabase/playerQueries'

const SEASON_16_START_MS = 1767830400000

export async function getTopChampionsFromSupabase(playerId, accountSource = 'primary') {
  if (!playerId || !supabase) return []

  const { data: rows, error } = await fetchSoloqTopChampions(
    playerId,
    accountSource,
    SEASON_16_START_MS
  )
  if (error) {
    console.error('[getTopChampionsFromSupabase]', error)
    return []
  }

  const byChamp = new Map()
  for (const row of rows || []) {
    const name = row.champion_name || 'Unknown'
    if (!byChamp.has(name)) byChamp.set(name, { games: 0, wins: 0 })
    const stat = byChamp.get(name)
    stat.games += 1
    if (row.win) stat.wins += 1
  }

  return Array.from(byChamp.entries())
    .map(([name, s]) => ({
      name,
      games: s.games,
      wins: s.wins,
      winrate: s.games > 0 ? Math.round((s.wins / s.games) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.games - a.games)
    .slice(0, 5)
}
