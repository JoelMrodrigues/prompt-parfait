/**
 * Charge les données d'une partie Solo Q spécifique :
 * - matchData : depuis player_soloq_matches (Supabase)
 * - timelineData : depuis /api/riot/match-timeline (backend)
 */
import { useState, useEffect } from 'react'
import { supabase } from '../../../../lib/supabase'
import { apiFetch } from '../../../../lib/apiFetch'

export function useSoloqMatchDetail(playerId: string | undefined, riotMatchId: string | undefined) {
  const [matchData, setMatchData] = useState<any>(null)
  const [timelineData, setTimelineData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [timelineLoading, setTimelineLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!playerId || !riotMatchId) return
    let cancelled = false
    setLoading(true)
    setError(null)
    setMatchData(null)
    setTimelineData(null)

    supabase
      .from('player_soloq_matches')
      .select('*')
      .eq('player_id', playerId)
      .eq('riot_match_id', riotMatchId)
      .single()
      .then(({ data, error: err }) => {
        if (cancelled) return
        if (err || !data) {
          setError(err?.message || 'Partie introuvable en base')
        } else {
          setMatchData(data)
        }
        setLoading(false)
      })

    return () => { cancelled = true }
  }, [playerId, riotMatchId])

  useEffect(() => {
    if (!riotMatchId || loading) return
    let cancelled = false
    setTimelineLoading(true)

    apiFetch(`/api/riot/match-timeline?matchId=${encodeURIComponent(riotMatchId)}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return
        if (data.success && data.timeline) {
          setTimelineData(data.timeline)
        }
      })
      .catch(() => { /* timeline optionnel — pas d'erreur bloquante */ })
      .finally(() => { if (!cancelled) setTimelineLoading(false) })

    return () => { cancelled = true }
  }, [riotMatchId, loading])

  return { matchData, timelineData, loading, timelineLoading, error }
}
