/**
 * Sync automatique du mood Team : 5 dernières parties (depuis Matchs) depuis Supabase.
 * Aucune requête API — données team_matches + team_match_participants.
 */
import { useEffect, useRef } from 'react'
import { useTeam } from './useTeam'
import { fetchTeamMatches } from '../../../services/supabase/matchQueries'
import { MOOD_SYNC_INTERVAL_MS } from '../../../lib/constants'

const INTERVAL_MS = MOOD_SYNC_INTERVAL_MS
const DELAY_BEFORE_FIRST_MS = 6000 // après le soloq mood pour étaler
const LOG_PREFIX = '[TeamMoodSync]'

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

export function useTeamMoodSync() {
  const { team, players, updatePlayer } = useTeam()
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const updatePlayerRef = useRef(updatePlayer)
  const playersRef = useRef(players)
  const teamRef = useRef(team)
  updatePlayerRef.current = updatePlayer
  playersRef.current = players
  teamRef.current = team

  useEffect(() => {
    const teamId = team?.id
    if (!teamId || !players?.length) return

    const run = async () => {
      const list = playersRef.current || []
      const updatePlayerFn = updatePlayerRef.current
      const tid = teamRef.current?.id
      if (!tid || list.length === 0) return

      try {
        const { data: teamMatchesList } = await fetchTeamMatches(tid)
        const sortedTeam = (teamMatchesList || []).slice().sort((a: any, b: any) => {
          const ta = new Date(a.created_at || 0).getTime()
          const tb = new Date(b.created_at || 0).getTime()
          return tb - ta
        })
        for (const player of list) {
          try {
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
            await updatePlayerFn(player.id, {
              team_mood_last_5: { wins, losses, kda, count: participations.length },
            })
          } catch (e) {
            console.warn(LOG_PREFIX, 'Erreur mood Team', player.player_name, e)
          }
          await delay(80)
        }
      } catch (e) {
        console.warn(LOG_PREFIX, 'Erreur', e)
      }
    }

    const schedule = async () => {
      await run()
      timeoutRef.current = setTimeout(schedule, INTERVAL_MS)
    }

    const t = setTimeout(schedule, DELAY_BEFORE_FIRST_MS)
    console.log(LOG_PREFIX, 'Démarré (premier run dans', DELAY_BEFORE_FIRST_MS / 1000, 's)')

    return () => {
      clearTimeout(t)
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }
  }, [team?.id, players?.length])
}
