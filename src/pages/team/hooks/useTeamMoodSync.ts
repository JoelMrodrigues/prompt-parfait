/**
 * Sync automatique du mood Team : 5 dernières parties (depuis Matchs) depuis Supabase.
 * Aucune requête API — données team_matches + team_match_participants.
 */
import { useEffect, useRef } from 'react'
import { useTeam } from './useTeam'
import { fetchTeamMatchesList } from '../../../services/supabase/matchQueries'
import { getListCachedMatches } from './useTeamMatches'
import { MOOD_SYNC_INTERVAL_MS } from '../../../lib/constants'
import { logger } from '../../../lib/logger'

const INTERVAL_MS = MOOD_SYNC_INTERVAL_MS
const DELAY_BEFORE_FIRST_MS = 6000 // après le soloq mood pour étaler
const LOG_PREFIX = '[TeamMoodSync]'


export function useTeamMoodSync() {
  const { team, players, batchUpdatePlayersSilent } = useTeam()
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const batchRef = useRef(batchUpdatePlayersSilent)
  const playersRef = useRef(players)
  const teamRef = useRef(team)
  batchRef.current = batchUpdatePlayersSilent
  playersRef.current = players
  teamRef.current = team

  useEffect(() => {
    const teamId = team?.id
    if (!teamId || !players?.length) return

    const run = async () => {
      const list = playersRef.current || []
      const tid = teamRef.current?.id
      if (!tid || list.length === 0) return

      try {
        // Cache-first : 0 requête Supabase si MatchsPage déjà chargée
        let teamMatchesList = getListCachedMatches(tid)
        if (!teamMatchesList) {
          const { data } = await fetchTeamMatchesList(tid)
          teamMatchesList = data || []
        }
        const sortedTeam = (teamMatchesList || []).slice().sort((a: any, b: any) => {
          const ta = new Date(a.created_at || 0).getTime()
          const tb = new Date(b.created_at || 0).getTime()
          return tb - ta
        })

        // Calculer le mood pour tous les joueurs sans I/O
        const updates: Array<{ id: string; data: Record<string, unknown> }> = []
        for (const player of list) {
          const participations: { win: boolean; kills: number; deaths: number; assists: number }[] = []
          for (const match of sortedTeam) {
            const part = (match.team_match_participants || []).find(
              (x: any) => x.team_side === 'our' && x.player_id === player.id
            )
            if (part) {
              participations.push({
                win: !!part.win || !!match.our_win,
                kills: part.kills ?? 0,
                deaths: part.deaths ?? 0,
                assists: part.assists ?? 0,
              })
              if (participations.length >= 5) break
            }
          }
          if (participations.length === 0) continue
          const wins = participations.filter((x) => x.win).length
          const losses = participations.length - wins
          const tK = participations.reduce((s, x) => s + x.kills, 0)
          const tD = participations.reduce((s, x) => s + x.deaths, 0)
          const tA = participations.reduce((s, x) => s + x.assists, 0)
          const kda = tD > 0 ? ((tK + tA) / tD).toFixed(1) : (tK + tA).toFixed(1)
          updates.push({ id: player.id, data: { team_mood_last_5: { wins, losses, kda, count: participations.length } } })
        }

        // Batch : 1 seul setPlayers au lieu de N
        if (updates.length > 0) {
          await batchRef.current(updates)
        }
      } catch (e) {
        logger.warn(LOG_PREFIX, 'Erreur', e)
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
