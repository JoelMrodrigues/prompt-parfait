export interface TeamRoleStats {
  role: string
  games: number
  avgKda: number
  avgKills: number
  avgDeaths: number
  avgAssists: number
  avgDamage: number | null
  avgGold: number | null
  avgCsPerMin: number | null
  avgVision: number | null
  topChampions: string[] // 2-3 champs les + joués sur ce rôle
}

export interface TeamChampionStat {
  name: string
  role: string
  games: number
  wins: number
  winRate: number
  kda: number
}

export interface TeamSplitStats {
  games: number
  avgKda: number
  avgKills: number
  avgDeaths: number
  avgAssists: number
  avgDragonKills: number | null
  avgBaronKills: number | null
  avgTowerKills: number | null
  avgGameDuration: number | null
  firstBloodRate: number | null
  firstDragonRate: number | null
  firstBaronRate: number | null
  firstTowerRate: number | null
}

export interface TeamAnalysisResult {
  totalGames: number
  wins: number
  winRate: number
  avgGameDuration: number | null
  // KDA global (tous joueurs côté notre équipe agrégés)
  avgKda: number
  avgKills: number
  avgDeaths: number
  avgAssists: number
  // Objectifs globaux
  avgDragonKills: number | null
  avgBaronKills: number | null
  avgTowerKills: number | null
  firstBloodRate: number | null
  firstDragonRate: number | null
  firstBaronRate: number | null
  firstTowerRate: number | null
  hasObjectives: boolean
  // Split V/D
  winsStats: TeamSplitStats
  lossesStats: TeamSplitStats
  // Stats par rôle
  roleStats: TeamRoleStats[]
  // Top champions de l'équipe
  topChampions: TeamChampionStat[]
  dateFrom: string
  dateTo: string
  matchType: 'all' | 'scrim' | 'tournament'
}
