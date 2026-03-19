export type BlockType = 'scrim' | 'tournament' | 'other'
export type BlockFormat = 'bo1' | 'bo3' | 'bo5' | 'custom'

export interface TeamMatchBlock {
  id: string
  team_id: string
  name: string
  block_type: BlockType
  opponent_name: string | null
  format: BlockFormat
  game_count: number | null
  notes: string | null
  played_at: string | null
  created_at: string
}

export interface CreateBlockPayload {
  name: string
  block_type: BlockType
  opponent_name: string | null
  format: BlockFormat
  game_count: number | null
  notes: string | null
  played_at?: string | null
}

/** Résultat de blockDetector — groupe de parties détectées automatiquement */
export interface DetectedBlock {
  suggestedName: string
  matchGameIds: number[]   // game_id (bigint Riot) pour lookup après import
  firstGameAt: number      // ms timestamp
  lastGameAt: number
}
