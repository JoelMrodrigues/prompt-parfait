// ─── Auth ────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string
  email: string
}

// ─── Team Management ─────────────────────────────────────────────────────────

export interface Team {
  id: string
  name: string
  logo_url?: string | null
  invite_code?: string | null
  created_at?: string
}

export type Role = 'Top' | 'Jungle' | 'Mid' | 'Bot' | 'Support'

export interface Player {
  id: string
  team_id: string
  name: string
  role: Role | string
  opgg_url?: string | null
  rank?: string | null
  rank_lp?: number | null
  top_champions?: string[] | null
  created_at?: string
}

export interface ChampionPool {
  id: string
  player_id: string
  champion_name: string
  priority?: number | null
}

// ─── Team Matches ─────────────────────────────────────────────────────────────

export interface TeamMatch {
  id: string
  team_id: string
  gameid?: string | null
  date: string
  result: 0 | 1 | null
  blue_team_name?: string | null
  red_team_name?: string | null
  duration?: number | null
  tournament?: string | null
  patch?: string | null
  blue_side?: boolean | null
}

export interface MatchParticipant {
  id: string
  match_id: string
  player_id?: string | null
  player_name: string
  team_name: string
  side: 'blue' | 'red'
  role: string
  champion: string
  kills: number
  deaths: number
  assists: number
  total_gold?: number | null
  cs?: number | null
  damage_dealt?: number | null
  vision_score?: number | null
  items?: string[] | null
}

export interface MatchTimeline {
  id: string
  match_id: string
  minute: number
  blue_gold?: number | null
  red_gold?: number | null
  blue_xp?: number | null
  red_xp?: number | null
  blue_cs?: number | null
  red_cs?: number | null
}

// ─── Pro Stats (Oracle's Elixir) ─────────────────────────────────────────────

export interface ProMatchRow {
  gameid: string
  league: string
  split?: string | null
  season?: string | null
  patch?: string | null
  side: 'Blue' | 'Red'
  position: string
  playername: string
  teamname: string
  champion: string
  ban1?: string | null
  ban2?: string | null
  ban3?: string | null
  ban4?: string | null
  ban5?: string | null
  result: 0 | 1
  kills?: number | null
  deaths?: number | null
  assists?: number | null
  gamelength?: number | null
  cspm?: number | null
  dpm?: number | null
  earned_gpm?: number | null
  csdiffat15?: number | null
  golddiffat15?: number | null
  xpdiffat15?: number | null
  totalgold?: number | null
  towers?: number | null
  dragons?: number | null
  barons?: number | null
  inhibitors?: number | null
  heralds?: number | null
  void_grubs?: number | null
  participantid?: number | null
  firstpick?: number | null
  date?: string | null
  game?: string | null
  year?: number | null
}

export interface ChampionStats {
  champion: string
  picks: number
  bans: number
  prioScore: number
  wins: number
  losses: number
  winrate: number
  kda: number
  gt: string
  csm: number
  dpm: number
  gpm: number
  csd15: number
  gd15: number
}

export interface StatsFilters {
  year?: string
  season?: string
  role?: string
  league?: string
  side?: string
  split?: string
  leagues?: string[]
  tournament?: string
  patch?: string
}

export interface FilterOptions {
  leagues: string[]
  patches: string[]
  splits: string[]
  tournaments?: string[]
}

// ─── Draft ────────────────────────────────────────────────────────────────────

export interface DraftChampion {
  id: string
  name: string
  image: string
  tags?: string[]
}

export interface DraftTeamState {
  bans: (string | null)[]
  picks: (string | null)[]
}

export interface DraftState {
  blueTeam: DraftTeamState
  redTeam: DraftTeamState
  currentPhase: number
  currentSide: 'blue' | 'red'
  isComplete: boolean
}

// ─── Toast ────────────────────────────────────────────────────────────────────

export type ToastType = 'success' | 'error' | 'info'

export interface Toast {
  id: number
  message: string
  type: ToastType
}

// ─── API responses ────────────────────────────────────────────────────────────

export interface ApiResult<T> {
  data: T | null
  error: Error | null
}

export interface MatchDetailData {
  gameid: string
  date?: string | null
  league?: string | null
  split?: string | null
  season?: string | null
  patch?: string | null
  game?: string | null
  gamelength?: number | null
  blueTeam: { name: string; players: ProMatchRow[]; stats: TeamStats }
  redTeam: { name: string; players: ProMatchRow[]; stats: TeamStats }
  teamA: { name: string; players: ProMatchRow[]; stats: TeamStats }
  teamB: { name: string; players: ProMatchRow[]; stats: TeamStats }
  winner: 'blue' | 'red'
}

export interface TeamStats {
  kills: number
  deaths: number
  assists: number
  gold: number
  towers: number
  dragons: number
  barons: number
  inhibitors: number
  heralds: number
  void_grubs: number
}

// ─── Riot API ─────────────────────────────────────────────────────────────────

export interface RiotRank {
  tier: string
  rank: string
  lp: number
  wins: number
  losses: number
}

export interface SoloQMatch {
  champion: string
  kills: number
  deaths: number
  assists: number
  win: boolean
  date: string
}
