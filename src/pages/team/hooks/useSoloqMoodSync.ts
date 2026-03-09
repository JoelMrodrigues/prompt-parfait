/**
 * Sync automatique du mood Solo Q : 5 dernières parties (hors remakes) depuis Supabase.
 * Aucune requête API Riot — données déjà en base (player_soloq_matches).
 */
import { useEffect, useRef } from 'react'
import { useTeam } from './useTeam'
import { fetchSoloqMatches } from '../../../services/supabase/playerQueries'
import { REMAKE_THRESHOLD_SEC, SEASON_16_START_MS, MOOD_SYNC_INTERVAL_MS } from '../../../lib/constants'
import { logger } from '../../../lib/logger'

const INTERVAL_MS = MOOD_SYNC_INTERVAL_MS
const DELAY_BEFORE_FIRST_MS = 5000
const LOG_PREFIX = '[SoloqMoodSync]'

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

export function useSoloqMoodSync() {
  const { team, players, batchUpdatePlayersSilent } = useTeam()
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const batchRef = useRef(batchUpdatePlayersSilent)
  const playersRef = useRef(players)
  batchRef.current = batchUpdatePlayersSilent
  playersRef.current = players

  useEffect(() => {
    if (!team?.id || !players?.length) return

    const run = async () => {
      const list = playersRef.current || []
      if (list.length === 0) return

      // Charger les matchs de tous les joueurs en parallèle
      const results = await Promise.allSettled(
        list.map(async (player) => {
          const { data: soloqMatches } = await fetchSoloqMatches({
            playerId: player.id,
            accountSource: 'primary',
            seasonStart: SEASON_16_START_MS,
            offset: 0,
            limit: 10,
          })
          const valid = (soloqMatches || []).filter(
            (m: any) => (m.game_duration || 0) >= REMAKE_THRESHOLD_SEC
          )
          const last5 = valid.slice(0, 5)
          const wins = last5.filter((m: any) => m.win).length
          const losses = last5.length - wins
          let kda = '—'
          if (last5.length > 0) {
            const tK = last5.reduce((s: number, m: any) => s + (m.kills ?? 0), 0)
            const tD = last5.reduce((s: number, m: any) => s + (m.deaths ?? 0), 0)
            const tA = last5.reduce((s: number, m: any) => s + (m.assists ?? 0), 0)
            kda = tD > 0 ? ((tK + tA) / tD).toFixed(1) : (tK + tA).toFixed(1)
          }
          return { id: player.id, data: { soloq_mood_last_5: { wins, losses, kda, count: last5.length } } }
        })
      )

      // Batch : 1 seul setPlayers au lieu de N
      const updates = results
        .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
        .map((r) => r.value)
      if (updates.length > 0) {
        try {
          await batchRef.current(updates)
        } catch (e) {
          logger.warn(LOG_PREFIX, 'Erreur batch update', e)
        }
      }
    }

    const schedule = async () => {
      await run()
      timeoutRef.current = setTimeout(schedule, INTERVAL_MS)
    }

    const t = setTimeout(schedule, DELAY_BEFORE_FIRST_MS)
    logger.debug(LOG_PREFIX, 'Démarré (premier run dans', DELAY_BEFORE_FIRST_MS / 1000, 's)')

    return () => {
      clearTimeout(t)
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }
  }, [team?.id, players?.length])
}
