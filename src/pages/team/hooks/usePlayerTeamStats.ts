/**
 * Stats en équipe d'un joueur + totaux équipe par match (KP%, gold%, dmg%)
 */
import { useState, useEffect } from 'react'
import {
  fetchPlayerMatchStats,
  fetchTeamTotalsByMatchIds,
} from '../../../services/supabase/matchQueries'

export const usePlayerTeamStats = (playerId: string | null | undefined) => {
  const [stats, setStats] = useState<any[]>([])
  const [teamTotalsByMatch, setTeamTotalsByMatch] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!playerId) {
      setStats([])
      setTeamTotalsByMatch({})
      setLoading(false)
      return
    }

    let cancelled = false

    const fetchStats = async () => {
      try {
        const { data, error } = await fetchPlayerMatchStats(playerId)

        if (error || cancelled) {
          if (!cancelled) {
            setStats([])
            setTeamTotalsByMatch({})
            if (error) console.warn('team_match_participants:', error.message)
          }
          setLoading(false)
          return
        }

        const list = data || []
        const matchIds = [...new Set(list.map((r) => r.match_id))]

        if (matchIds.length === 0 || cancelled) {
          if (!cancelled) {
            setStats(list)
            setTeamTotalsByMatch({})
          }
          setLoading(false)
          return
        }

        const { data: totalsRows, error: totalsErr } = await fetchTeamTotalsByMatchIds(matchIds)

        if (!cancelled) {
          setStats(list)
          const byMatch = {}
          if (!totalsErr && totalsRows) {
            for (const row of totalsRows) {
              const mid = row.match_id
              if (!byMatch[mid]) byMatch[mid] = { kills: 0, gold: 0, damage: 0 }
              byMatch[mid].kills += row.kills ?? 0
              byMatch[mid].gold += row.gold_earned ?? 0
              byMatch[mid].damage += row.total_damage_dealt_to_champions ?? 0
            }
          }
          setTeamTotalsByMatch(byMatch)
        }
      } catch {
        if (!cancelled) {
          setStats([])
          setTeamTotalsByMatch({})
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchStats()
    return () => {
      cancelled = true
    }
  }, [playerId])

  return { stats, teamTotalsByMatch, loading }
}
