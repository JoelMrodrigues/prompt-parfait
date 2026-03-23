export interface SplitStats {
  games: number
  winRate: number
  avgKDA: number
  avgDeaths: number
  avgCsPerMin: number | null
  avgVision: number | null
  avgDamage: number | null
  avgGold: number | null
}

export interface ChampionStat {
  name: string
  games: number
  wins: number
  winRate: number
  kda: number
  avgCs: number | null
  avgDamage: number | null
}

export interface AnalysisResult {
  totalGames: number
  wins: number
  winRate: number
  avgKills: number
  avgDeaths: number
  avgAssists: number
  kda: number
  avgCs: number | null
  avgCsPerMin: number | null
  avgVision: number | null
  avgGold: number | null
  avgDamage: number | null
  winsStats: SplitStats
  lossesStats: SplitStats
  champions: ChampionStat[]
  playerName: string
  playerPosition?: string
  playerRank?: string
  dateFrom: string
  dateTo: string
}
