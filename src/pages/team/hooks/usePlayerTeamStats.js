/**
 * Hook pour récupérer les stats en équipe d'un joueur + totaux équipe par match (KP%, gold%, dmg%)
 */
import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'

export const usePlayerTeamStats = (playerId) => {
  const [stats, setStats] = useState([])
  const [teamTotalsByMatch, setTeamTotalsByMatch] = useState({})
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
        const { data, error } = await supabase
          .from('team_match_participants')
          .select(`
            *,
            team_matches (
              game_id,
              game_duration,
              our_win,
              our_team_id
            )
          `)
          .eq('player_id', playerId)
          .order('created_at', { ascending: false })
          .limit(50)

        if (error || cancelled) {
          if (!cancelled) {
            setStats(data ? [] : [])
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

        const { data: totalsRows, error: totalsErr } = await supabase
          .from('team_match_participants')
          .select('match_id, kills, gold_earned, total_damage_dealt_to_champions')
          .in('match_id', matchIds)
          .eq('team_side', 'our')

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
        if (!cancelled) setStats([])
        if (!cancelled) setTeamTotalsByMatch({})
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchStats()
    return () => { cancelled = true }
  }, [playerId])

  return { stats, teamTotalsByMatch, loading }
}
