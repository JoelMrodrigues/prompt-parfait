/**
 * Charge les données d'une partie Solo Q spécifique :
 * - matchData : depuis player_soloq_matches (Supabase)
 * - Si match_json manquant → fetch /api/riot/match-detail → sauvegarde Supabase
 * - timelineData : depuis timeline_json en Supabase, ou /api/riot/match-timeline en fallback → sauvegarde Supabase
 */
import { useState, useEffect } from 'react'
import { supabase } from '../../../../lib/supabase'
import { apiFetch } from '../../../../lib/apiFetch'
import { updateSoloqMatchEnrichment } from '../../../../services/supabase/playerQueries'

export function useSoloqMatchDetail(playerId: string | undefined, riotMatchId: string | undefined) {
  const [matchData, setMatchData] = useState<any>(null)
  const [timelineData, setTimelineData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [timelineLoading, setTimelineLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ─── Load match + auto-enrich match_json if missing ──────────────────────
  useEffect(() => {
    if (!playerId || !riotMatchId) return
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      setMatchData(null)
      setTimelineData(null)

      const { data, error: err } = await supabase
        .from('player_soloq_matches')
        .select('*')
        .eq('player_id', playerId!)
        .eq('riot_match_id', riotMatchId!)
        .single()

      if (cancelled) return

      if (err || !data) {
        setError(err?.message || 'Partie introuvable en base')
        setLoading(false)
        return
      }

      let enriched = data

      // Auto-enrich : fetch match_json depuis Riot si absent
      if (!data.match_json) {
        try {
          const res = await apiFetch(
            `/api/riot/match-detail?matchId=${encodeURIComponent(riotMatchId!)}`,
          )
          const detail = await res.json()
          if (!cancelled && detail.success && Array.isArray(detail.info?.participants)) {
            const participant = (detail.info.participants as any[]).find(
              (p: any) =>
                p.championName?.toLowerCase() === data.champion_name?.toLowerCase(),
            ) ?? null
            if (participant) {
              const updates: Record<string, any> = { match_json: participant }
              if (!data.total_damage && participant.totalDamageDealtToChampions != null)
                updates.total_damage = participant.totalDamageDealtToChampions
              if (!data.cs && participant.totalMinionsKilled != null)
                updates.cs =
                  (participant.totalMinionsKilled ?? 0) + (participant.neutralMinionsKilled ?? 0)
              if (!data.vision_score && participant.visionScore != null)
                updates.vision_score = participant.visionScore
              if (!data.gold_earned && participant.goldEarned != null)
                updates.gold_earned = participant.goldEarned
              enriched = { ...data, ...updates }
              // Sauvegarde en Supabase (fire & forget)
              updateSoloqMatchEnrichment(playerId!, riotMatchId!, updates).catch(() => {})
            }
          }
        } catch {
          // Silencieux — les stats restent visibles depuis les colonnes existantes
        }
      }

      if (!cancelled) {
        setMatchData(enriched)
        setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [playerId, riotMatchId])

  // ─── Timeline : Supabase d'abord, puis Riot API en fallback ──────────────
  useEffect(() => {
    if (loading || !matchData || !riotMatchId) return

    // Utiliser le cache Supabase si disponible
    if (matchData.timeline_json) {
      setTimelineData(matchData.timeline_json)
      return
    }

    let cancelled = false
    setTimelineLoading(true)

    apiFetch(`/api/riot/match-timeline?matchId=${encodeURIComponent(riotMatchId)}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return
        if (data.success && data.timeline) {
          setTimelineData(data.timeline)
          // Sauvegarder en Supabase pour éviter les futurs appels API
          if (playerId) {
            updateSoloqMatchEnrichment(playerId, riotMatchId, {
              timeline_json: data.timeline,
            }).catch(() => {})
          }
        }
      })
      .catch(() => { /* timeline optionnel */ })
      .finally(() => { if (!cancelled) setTimelineLoading(false) })

    return () => { cancelled = true }
  }, [riotMatchId, loading])

  return { matchData, timelineData, loading, timelineLoading, error }
}
