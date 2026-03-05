/**
 * Types partagés — serveur Express + Riot API
 */

// Extension Express Request pour req.pseudo (assigné par le middleware requirePseudo)
declare global {
  namespace Express {
    interface Request {
      pseudo?: string
    }
  }
}

// ─── Riot API ─────────────────────────────────────────────────────────────────

export interface RiotResponse<T = unknown> {
  ok: boolean
  status: number
  data: T
}

/** Résultat de la résolution PUUID — succès ou erreur */
export type PuuidResult =
  | { puuid: string }
  | { error: string; status: number }

export interface Participant {
  puuid: string
  championId: number
  championName: string
  win: boolean
  kills: number
  deaths: number
  assists: number
  teamId: number
  teamPosition?: string
  individualPosition?: string
}

export interface MatchInfo {
  participants?: Participant[]
  queueId?: number
  gameDuration?: number
  gameCreation?: number
}

export interface MatchDetail {
  info?: MatchInfo
}

/** Données extraites d'un participant pour le stockage en base */
export interface ParticipantData {
  championId: number
  championName: string
  opponentChampionName?: string
  win: boolean
  kills: number
  deaths: number
  assists: number
  gameDuration: number
  gameCreation: number
}

export interface ChampionAggregate {
  name: string
  games: number
  wins: number
  kills: number
  deaths: number
  assists: number
}

export interface ChampionStats {
  name: string
  games: number
  wins: number
  winrate: number
  kda: number
  kills: number
  deaths: number
  assists: number
}

export interface RankEntry {
  tier: string
  rank: string
  leaguePoints: number
  queueType: string
}

// ─── Cache ────────────────────────────────────────────────────────────────────

export interface CacheEntry {
  at: number
  [key: string]: unknown
}

// ─── Oracle's Elixir (CSV) ────────────────────────────────────────────────────

export type CSVRow = Record<string, string | number | null>
