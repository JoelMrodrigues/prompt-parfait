/**
 * Hook pour récupérer les stats en équipe d'un joueur
 */
import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'

export const usePlayerTeamStats = (playerId) => {
  const [stats, setStats] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!playerId) {
      setStats([])
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
              our_win
            )
          `)
          .eq('player_id', playerId)
          .order('created_at', { ascending: false })
          .limit(50)

        if (!cancelled) {
          if (error) {
            console.warn('team_match_participants:', error.message)
            setStats([])
          } else {
            setStats(data || [])
          }
        }
      } catch {
        if (!cancelled) setStats([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchStats()
    return () => { cancelled = true }
  }, [playerId])

  return { stats, loading }
}
