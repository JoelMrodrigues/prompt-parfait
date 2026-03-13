export function rowToMatch(row: any) {
  return {
    matchId: row.riot_match_id,
    championId: row.champion_id,
    championName: row.champion_name,
    opponentChampionName: row.opponent_champion ?? null,
    win: !!row.win,
    kills: row.kills ?? 0,
    deaths: row.deaths ?? 0,
    assists: row.assists ?? 0,
    gameDuration: row.game_duration ?? 0,
    gameCreation: row.game_creation ?? 0,
  }
}

export const ROLE_LABELS: Record<string, string> = {
  TOP: 'Top',
  JNG: 'Jungle',
  MID: 'Mid',
  ADC: 'ADC',
  SUP: 'Support',
}

export function getRankColor(rank: string | null | undefined): string {
  if (!rank) return 'from-gray-500 to-gray-700'
  const r = rank.toLowerCase()
  if (r.includes('challenger')) return 'from-yellow-400 via-blue-500 to-yellow-400'
  if (r.includes('grandmaster')) return 'from-orange-500 to-orange-700'
  if (r.includes('master')) return 'from-purple-500 to-purple-700'
  if (r.includes('diamond')) return 'from-blue-500 to-blue-700'
  if (r.includes('emerald')) return 'from-emerald-500 to-emerald-700'
  if (r.includes('platinum')) return 'from-cyan-500 to-cyan-700'
  if (r.includes('gold')) return 'from-yellow-500 to-yellow-700'
  if (r.includes('silver')) return 'from-gray-400 to-gray-600'
  if (r.includes('bronze')) return 'from-orange-600 to-orange-800'
  if (r.includes('iron')) return 'from-gray-600 to-gray-800'
  return 'from-gray-500 to-gray-700'
}

export function getRankColorText(rank: string | null | undefined): string {
  if (!rank) return 'text-gray-500'
  const r = rank.toLowerCase()
  if (r.includes('challenger')) return 'text-yellow-300'
  if (r.includes('grandmaster')) return 'text-orange-400'
  if (r.includes('master')) return 'text-purple-400'
  if (r.includes('diamond')) return 'text-blue-400'
  if (r.includes('emerald')) return 'text-emerald-400'
  if (r.includes('platinum')) return 'text-cyan-400'
  if (r.includes('gold')) return 'text-yellow-400'
  if (r.includes('silver')) return 'text-gray-300'
  if (r.includes('bronze')) return 'text-orange-500'
  if (r.includes('iron')) return 'text-gray-500'
  return 'text-gray-400'
}

// Re-export from shared module for backward compatibility
export { generateDpmLink } from '../../../../lib/team/linkGenerators'

/** Extrait les LP du rang (ex. "Master 614 LP" → 614). Retourne null si non trouvé. */
export function parseLpFromRank(rank: string | null | undefined): number | null {
  if (!rank || typeof rank !== 'string') return null
  const m = rank.match(/(\d+)\s*LP/i)
  return m ? parseInt(m[1], 10) : null
}
