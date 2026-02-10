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

      let matchRow
      if (existing) {
        matchRow = { id: existing.id }
        await supabase
          .from('team_match_participants')
          .delete()
          .eq('match_id', existing.id)
        const { error: updateErr } = await supabase
          .from('team_matches')
          .update({
            game_creation: parsed.match.gameCreation,
            game_duration: parsed.match.gameDuration,
            game_mode: parsed.match.gameMode,
            game_type: parsed.match.gameType,
            our_team_id: parsed.match.ourTeamId,
            our_win: parsed.match.ourWin,
            objectives: parsed.match.objectives ?? null,
          })
          .eq('id', existing.id)
        if (updateErr) {
          results.errors.push(`${parsed.match.gameId}: ${updateErr.message}`)
          continue
        }
      } else {
        const { data: inserted, error: matchError } = await supabase
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
            objectives: parsed.match.objectives ?? null,
          })
          .select('id')
          .single()

        if (matchError) {
          results.errors.push(`${parsed.match.gameId}: ${matchError.message}`)
          continue
        }
        matchRow = inserted
      }

      const int = (v) => (v != null && !Number.isNaN(Number(v)) ? Math.floor(Number(v)) : 0)
      const intOrNull = (v) => (v != null && !Number.isNaN(Number(v)) ? Math.floor(Number(v)) : null)
      const num = (v) => (v != null && !Number.isNaN(Number(v)) ? Number(v) : 0)
      const numOrNull = (v) => (v != null && !Number.isNaN(Number(v)) ? Number(v) : null)

      const buildRow = (withTeamSideAndItems = true) => (p) => {
        const base = {
          match_id: matchRow.id,
          player_id: p.playerId ?? null,
          pseudo: p.pseudo ?? null,
          champion_id: int(p.championId) || null,
          champion_name: p.championName ?? null,
          role: p.role ?? null,
          participant_id: int(p.participantId) || null,
          kills: int(p.stats.kills),
          deaths: int(p.stats.deaths),
          assists: int(p.stats.assists),
          kda: numOrNull(p.stats.kda),
          total_damage_dealt_to_champions: int(p.stats.totalDamageDealtToChampions),
          gold_earned: int(p.stats.goldEarned),
          cs: int(p.stats.cs),
          win: Boolean(p.stats.win),
          vision_score: int(p.stats.visionScore),
          vision_wards_bought: int(p.stats.visionWardsBoughtInGame),
          wards_placed: int(p.stats.wardsPlaced),
          wards_killed: int(p.stats.wardsKilled),
        }
        if (withTeamSideAndItems) {
          base.team_side = p.teamSide === 'enemy' ? 'enemy' : 'our'
          base.item0 = int(p.stats.item0)
          base.item1 = int(p.stats.item1)
          base.item2 = int(p.stats.item2)
          base.item3 = int(p.stats.item3)
          base.item4 = int(p.stats.item4)
          base.item5 = int(p.stats.item5)
        }
        return base
      }

      let insertFailed = false
      let useMinimalRow = false
      for (const p of parsed.participants) {
        const row = buildRow(!useMinimalRow)(p)
        const { error: insertErr } = await supabase.from('team_match_participants').insert(row)
        if (insertErr) {
          if (import.meta.env?.DEV) {
            console.error('[import] team_match_participants insert error:', insertErr.code, insertErr.message, insertErr.details, row)
          }
          const colMissing = !useMinimalRow && (String(insertErr.code) === '42703' || /column.*does not exist|undefined_column/i.test(insertErr.message || ''))
          if (colMissing) {
            useMinimalRow = true
            const rowMin = buildRow(false)(p)
            const { error: retryErr } = await supabase.from('team_match_participants').insert(rowMin)
            if (retryErr) {
              results.errors.push(`${parsed.match.gameId} participant: ${retryErr.message}${retryErr.details ? ` (${retryErr.details})` : ''}`)
              insertFailed = true
              break
            }
            continue
          }
          results.errors.push(`${parsed.match.gameId} participant: ${insertErr.message}${insertErr.details ? ` (${insertErr.details})` : ''}`)
          insertFailed = true
          break
        }
      }

      if (!insertFailed) results.imported++
    } catch (e) {
      results.errors.push(e.message || String(e))
    }
  }

  return results
}
