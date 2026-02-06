/**
 * Import des matchs Exalty dans Supabase
 */
import { supabase } from '../supabase'
import { parseExaltyMatch } from './exaltyMatchParser'

/**
 * Importe un ou plusieurs matchs JSON dans Supabase
 * @param {Array<Object>} matchesJson - Liste des JSON de matchs
 * @param {string} teamId - ID de l'équipe
 * @param {Array} teamPlayers - Liste des joueurs (pseudo, secondary_account, position, id)
 * @returns {Promise<{ imported: number, skipped: number, errors: string[] }>}
 */
export async function importExaltyMatches(matchesJson, teamId, teamPlayers) {
  const results = { imported: 0, skipped: 0, errors: [] }
  if (!supabase || !teamId || !teamPlayers?.length) {
    results.errors.push('Team ou joueurs manquants')
    return results
  }

  const matchesArray = Array.isArray(matchesJson) ? matchesJson : [matchesJson]

  for (const matchJson of matchesArray) {
    try {
      const parsed = parseExaltyMatch(matchJson, teamPlayers)
      if (!parsed) {
        results.skipped++
        continue
      }

      const { data: existing } = await supabase
        .from('team_matches')
        .select('id')
        .eq('team_id', teamId)
        .eq('game_id', parsed.match.gameId)
        .maybeSingle()

      if (existing) {
        results.skipped++
        continue
      }

      const { data: matchRow, error: matchError } = await supabase
        .from('team_matches')
        .insert({
          team_id: teamId,
          game_id: parsed.match.gameId,
          game_creation: parsed.match.gameCreation,
          game_duration: parsed.match.gameDuration,
          game_mode: parsed.match.gameMode,
          game_type: parsed.match.gameType,
          our_team_id: parsed.match.ourTeamId,
          our_win: parsed.match.ourWin,
        })
        .select('id')
        .single()

      if (matchError) {
        results.errors.push(`${parsed.match.gameId}: ${matchError.message}`)
        continue
      }

      for (const p of parsed.participants) {
        await supabase.from('team_match_participants').insert({
          match_id: matchRow.id,
          player_id: p.playerId,
          pseudo: p.pseudo,
          champion_id: p.championId,
          champion_name: p.championName,
          role: p.role,
          kills: p.stats.kills,
          deaths: p.stats.deaths,
          assists: p.stats.assists,
          kda: p.stats.kda,
          total_damage_dealt_to_champions: p.stats.totalDamageDealtToChampions,
          gold_earned: p.stats.goldEarned,
          cs: p.stats.cs,
          win: p.stats.win,
          vision_score: p.stats.visionScore,
          vision_wards_bought: p.stats.visionWardsBoughtInGame,
          wards_placed: p.stats.wardsPlaced,
          wards_killed: p.stats.wardsKilled,
        })
      }

      results.imported++
    } catch (e) {
      results.errors.push(e.message || String(e))
    }
  }

  return results
}
