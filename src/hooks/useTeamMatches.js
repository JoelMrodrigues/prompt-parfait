/**
 * Hook pour récupérer les matchs de l'équipe
 * Source centralisée pour les données matchs (utilisée par Matchs page, Joueurs détail, etc.)
 */
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export const useTeamMatches = (teamId) => {
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchMatches = useCallback(async () => {
    if (!teamId) {
      setMatches([])
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('team_matches')
        .select(`
          *,
          team_match_participants (
            id,
            player_id,
            participant_id,
            pseudo,
            champion_name,
            role,
            team_side,
            kills,
            deaths,
            assists,
            kda,
            total_damage_dealt_to_champions,
            gold_earned,
            cs,
            win,
            vision_score
          )
        `)
        .eq('team_id', teamId)
        .order('game_creation', { ascending: false })

      if (error) {
        console.warn('useTeamMatches:', error.message)
        setMatches([])
      } else {
        setMatches(data || [])
      }
    } catch {
      setMatches([])
    } finally {
      setLoading(false)
    }
  }, [teamId])

  useEffect(() => {
    setLoading(true)
    fetchMatches()
  }, [fetchMatches])

  return { matches, loading, refetch: fetchMatches }
}
