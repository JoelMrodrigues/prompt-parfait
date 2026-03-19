/**
 * Construit une ligne Supabase `player_soloq_matches` depuis une réponse API Riot.
 * Source unique partagée par useTeamAutoSync, usePlayerSoloqData, etc.
 */

export interface SoloqMatchRow {
  player_id: string
  riot_match_id: string
  account_source: string
  champion_id: number | null
  champion_name: string | null
  opponent_champion: string | null
  win: boolean
  kills: number
  deaths: number
  assists: number
  game_duration: number
  game_creation: number
  total_damage: number | null
  gold_earned: number | null
  cs: number | null
  vision_score: number | null
  items: unknown | null
  runes: unknown | null
  match_json: unknown | null
}

export function buildSoloqMatchRow(
  m: any,
  playerId: string,
  accountSource: string
): SoloqMatchRow {
  return {
    player_id: playerId,
    riot_match_id: m.matchId,
    account_source: accountSource,
    champion_id: m.championId ?? null,
    champion_name: m.championName ?? null,
    opponent_champion: m.opponentChampionName ?? null,
    win: !!m.win,
    kills: m.kills ?? 0,
    deaths: m.deaths ?? 0,
    assists: m.assists ?? 0,
    game_duration: m.gameDuration ?? 0,
    game_creation: m.gameCreation ?? 0,
    total_damage: m.totalDamage ?? null,
    gold_earned: m.goldEarned ?? null,
    cs: m.cs ?? null,
    vision_score: m.visionScore ?? null,
    items: m.items ?? null,
    runes: m.runes ?? null,
    match_json: m.matchJson ?? null,
  }
}
