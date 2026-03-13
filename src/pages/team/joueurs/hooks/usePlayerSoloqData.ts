/**
 * Hook SoloQ — état, chargements et handlers Riot pour l'onglet Solo Queue.
 * Extrait de usePlayerDetail.ts pour alléger le fichier principal.
 */
import { useState, useEffect, useRef, useMemo } from 'react'
import { supabase } from '../../../../lib/supabase'
import { aggregateChampionStats } from '../../../../lib/team/statsAggregation'
import {
  fetchSoloqMatches,
  fetchSoloqChampionStats,
  fetchSoloqMatchesByChampion,
  upsertSoloqMatches,
} from '../../../../services/supabase/playerQueries'
import { SEASON_16_START_MS, REMAKE_THRESHOLD_SEC, PAGE_SIZE } from '../../../../lib/constants'
import { apiFetch } from '../../../../lib/apiFetch'
import { rowToMatch, parseLpFromRank } from '../utils/playerDetailHelpers'

function mapMatchRow(m: any, playerId: string, accountSource: string) {
  return {
    player_id: playerId,
    riot_match_id: m.matchId,
    account_source: accountSource,
    champion_id: m.championId ?? null,
    champion_name: m.championName ?? null,
    opponent_champion: m.opponentChampionName ?? null,
    win: !!m.win,
    kills: m.kills ?? 0,
    deaths: m.deaths ?? 0,
    assists: m.assists ?? 0,
    game_duration: m.gameDuration ?? 0,
    game_creation: m.gameCreation ?? 0,
    total_damage: m.totalDamage ?? null,
    cs: m.cs ?? null,
    vision_score: m.visionScore ?? null,
    gold_earned: m.goldEarned ?? null,
    items: m.items ?? null,
    runes: m.runes ?? null,
    match_json: m.matchJson ?? null,
  }
}

interface Params {
  player: any
  selectedCard: string
  selectedSoloqAccount: number
  soloqAccountSource: string
  activeSoloqPseudo: string
  setSelectedSoloqSub: (s: string) => void
  updatePlayer: (id: string, updates: any) => Promise<any>
  refetch: () => Promise<void>
  toastError: (msg: string) => void
  toastInfo: (msg: string) => void
}

export function usePlayerSoloqData({
  player,
  selectedCard,
  selectedSoloqAccount,
  soloqAccountSource,
  activeSoloqPseudo,
  setSelectedSoloqSub,
  updatePlayer,
  refetch,
  toastError,
  toastInfo,
}: Params) {
  const [syncing, setSyncing] = useState(false)
  const [matchHistory, setMatchHistory] = useState<any[]>([])
  const [matchHistoryLoading, setMatchHistoryLoading] = useState(false)
  const [matchHistoryLoadMoreLoading, setMatchHistoryLoadMoreLoading] = useState(false)
  const [matchHistoryHasMore, setMatchHistoryHasMore] = useState(false)
  const [matchHistoryCountInDb, setMatchHistoryCountInDb] = useState<number | null>(null)
  const [loadAllFromRiotLoading, setLoadAllFromRiotLoading] = useState(false)
  const [rateLimitSeconds, setRateLimitSeconds] = useState<number | null>(null)
  const [refreshTotalLoading, setRefreshTotalLoading] = useState(false)
  const [soloqTopChampionsFromDb, setSoloqTopChampionsFromDb] = useState<any[]>([])
  const [allChampionsFromDb, setAllChampionsFromDb] = useState<any[]>([])
  const [soloqTopChampionsLoading, setSoloqTopChampionsLoading] = useState(false)
  const [championModalChampion, setChampionModalChampion] = useState<string | null>(null)
  const [championModalMatches, setChampionModalMatches] = useState<any[]>([])
  const [championModalMatchesLoading, setChampionModalMatchesLoading] = useState(false)
  const [gameDetailMatch, setGameDetailMatch] = useState<any>(null)
  const [lpGraphMatches, setLpGraphMatches] = useState<any[]>([])
  const [lpGraphLoading, setLpGraphLoading] = useState(false)

  const matchHistoryPlayerIdRef = useRef<string | null>(null)

  // ─── LP curve ─────────────────────────────────────────────────────────────
  const lpCurvePoints = useMemo(() => {
    const currentLp = parseLpFromRank(player?.rank)
    if (currentLp == null || !lpGraphMatches.length) return []
    const sorted = [...lpGraphMatches].sort(
      (a: any, b: any) => (a.game_creation ?? 0) - (b.game_creation ?? 0)
    )
    let lp = currentLp
    for (const m of sorted) lp += m.win ? -25 : 25
    const points: { date: Date; lp: number; win?: boolean }[] = []
    for (const m of sorted) {
      points.push({ date: new Date(m.game_creation ?? 0), lp, win: !!m.win })
      lp += m.win ? 25 : -25
    }
    points.push({ date: new Date(), lp: currentLp })
    return points
  }, [player?.rank, lpGraphMatches])

  // ─── Rate limit countdown ─────────────────────────────────────────────────
  useEffect(() => {
    if (rateLimitSeconds == null || rateLimitSeconds <= 0) return
    const t = setInterval(
      () => setRateLimitSeconds((s) => (s != null && s > 0 ? s - 1 : null)),
      1000
    )
    return () => clearInterval(t)
  }, [rateLimitSeconds])

  // ─── Reset on player/account change ──────────────────────────────────────
  useEffect(() => {
    setMatchHistory([])
    setMatchHistoryHasMore(false)
    setMatchHistoryCountInDb(null)
    setSoloqTopChampionsFromDb([])
    setAllChampionsFromDb([])
    setRateLimitSeconds(null)
    setChampionModalChampion(null)
    setChampionModalMatches([])
    setGameDetailMatch(null)
    matchHistoryPlayerIdRef.current = null
    setLpGraphMatches([])
  }, [player?.id, soloqAccountSource])

  // ─── Load SoloQ data quand l'onglet devient actif ─────────────────────────
  useEffect(() => {
    if (selectedCard !== 'soloq' || !player?.id) return
    const refKey = `${player.id}:${soloqAccountSource}`
    if (matchHistoryPlayerIdRef.current === refKey) {
      loadSoloqTopChampionsFromDb()
      return
    }
    loadMatchHistoryFromSupabase(0, PAGE_SIZE, false)
    loadSoloqTopChampionsFromDb()
  }, [selectedCard, player?.id, soloqAccountSource])

  // ─── LP graph au montage + changement de compte ───────────────────────────
  useEffect(() => {
    if (!player?.id) return
    let cancelled = false
    setLpGraphLoading(true)
    fetchSoloqMatches({
      playerId: player.id,
      accountSource: soloqAccountSource,
      seasonStart: SEASON_16_START_MS,
      offset: 0,
      limit: 300,
    })
      .then(({ data }) => {
        if (!cancelled && Array.isArray(data))
          setLpGraphMatches(data.filter((m: any) => (m.game_duration ?? 0) >= REMAKE_THRESHOLD_SEC))
      })
      .catch(() => { if (!cancelled) setLpGraphMatches([]) })
      .finally(() => { if (!cancelled) setLpGraphLoading(false) })
    return () => { cancelled = true }
  }, [player?.id, soloqAccountSource])

  // ─── Load functions ───────────────────────────────────────────────────────

  async function loadMatchHistoryFromSupabase(offset: number, limit: number, append: boolean) {
    if (!player?.id || !supabase) return
    const setLoadingState = offset === 0 ? setMatchHistoryLoading : setMatchHistoryLoadMoreLoading
    setLoadingState(true)
    try {
      const { data: rows, error, count } = await fetchSoloqMatches({
        playerId: player.id,
        accountSource: soloqAccountSource,
        seasonStart: SEASON_16_START_MS,
        offset,
        limit,
        withCount: offset === 0,
      })
      if (error) throw error
      if (offset === 0 && count != null) setMatchHistoryCountInDb(count)
      const matches = (rows || [])
        .map(rowToMatch)
        .filter((m) => (m.gameCreation || 0) >= SEASON_16_START_MS)
      if (append) setMatchHistory((prev) => [...prev, ...matches])
      else {
        setMatchHistory(matches)
        matchHistoryPlayerIdRef.current = `${player.id}:${soloqAccountSource}`
      }
      setMatchHistoryHasMore(matches.length === limit)
    } catch (e: any) {
      console.error('loadMatchHistoryFromSupabase', e)
      if (!append) { setMatchHistory([]); setMatchHistoryHasMore(false); setMatchHistoryCountInDb(null) }
    } finally {
      setLoadingState(false)
    }
  }

  async function loadSoloqTopChampionsFromDb() {
    if (!player?.id || !supabase) return
    setSoloqTopChampionsLoading(true)
    try {
      const { data: rows, error } = await fetchSoloqChampionStats({
        playerId: player.id,
        accountSource: soloqAccountSource,
        seasonStart: SEASON_16_START_MS,
        minDuration: REMAKE_THRESHOLD_SEC,
      })
      if (error) throw error
      const list = aggregateChampionStats(
        rows || [],
        (r: any) => r.champion_name || 'Unknown',
        (r: any) => !!r.win,
      )
      setSoloqTopChampionsFromDb(list.slice(0, 5))
      setAllChampionsFromDb(list)
    } catch (e) {
      console.error('loadSoloqTopChampionsFromDb', e)
      setSoloqTopChampionsFromDb([])
      setAllChampionsFromDb([])
    } finally {
      setSoloqTopChampionsLoading(false)
    }
  }

  async function loadMatchesForChampion(championName: string) {
    if (!player?.id || !supabase || !championName) return
    setChampionModalMatchesLoading(true)
    setChampionModalChampion(championName)
    setChampionModalMatches([])
    try {
      const { data: rows, error } = await fetchSoloqMatchesByChampion({
        playerId: player.id,
        accountSource: soloqAccountSource,
        championName,
        minDuration: REMAKE_THRESHOLD_SEC,
      })
      if (error) throw error
      setChampionModalMatches((rows || []).map(rowToMatch))
    } catch (e) {
      console.error('loadMatchesForChampion', e)
      setChampionModalMatches([])
    } finally {
      setChampionModalMatchesLoading(false)
    }
  }

  function openChampionModal(champ: any) {
    if (!champ?.name) return
    loadMatchesForChampion(champ.name)
  }

  function closeChampionModal() {
    setChampionModalChampion(null)
    setChampionModalMatches([])
  }

  // ─── Riot API handlers ────────────────────────────────────────────────────

  async function handleLoadAllFromRiot() {
    if (!activeSoloqPseudo?.trim() || (!activeSoloqPseudo.includes('#') && !activeSoloqPseudo.includes('/'))) {
      toastInfo('Pseudo au format GameName#TagLine requis')
      return
    }
    if (rateLimitSeconds != null && rateLimitSeconds > 0) return
    setLoadAllFromRiotLoading(true)
    setRateLimitSeconds(null)
    try {
      let start = matchHistoryCountInDb ?? 0
      let totalLoaded = 0
      matchHistoryPlayerIdRef.current = null
      for (;;) {
        const res = await apiFetch(
          `/api/riot/match-history?pseudo=${encodeURIComponent(activeSoloqPseudo.trim())}&start=${start}&limit=${PAGE_SIZE}`
        )
        const data = await res.json().catch(() => ({}))
        if (res.status === 429 && (data.retryAfter ?? data.retry_after)) {
          const s16 = Array.isArray(data.matches)
            ? data.matches.filter((m: any) => (m.gameCreation || 0) >= SEASON_16_START_MS)
            : []
          if (s16.length > 0 && supabase) {
            await upsertSoloqMatches(s16.map((m: any) => mapMatchRow(m, player!.id, soloqAccountSource)))
            totalLoaded += s16.length
            await loadSoloqTopChampionsFromDb()
          }
          setRateLimitSeconds(Math.max(1, parseInt(data.retryAfter ?? data.retry_after, 10) || 120))
          break
        }
        if (!data.success || !Array.isArray(data.matches)) {
          if (data.error && !res.ok) throw new Error(data.error)
          break
        }
        const s16 = data.matches.filter((m: any) => (m.gameCreation || 0) >= SEASON_16_START_MS)
        if (s16.length > 0 && supabase) {
          await upsertSoloqMatches(s16.map((m: any) => mapMatchRow(m, player!.id, soloqAccountSource)))
          totalLoaded += s16.length
          await loadSoloqTopChampionsFromDb()
        }
        if (!data.hasMore) break
        start += PAGE_SIZE
      }
      await loadMatchHistoryFromSupabase(0, PAGE_SIZE, false)
      if (totalLoaded > 0) setSelectedSoloqSub('historiques')
    } catch (e: any) {
      toastError('Erreur: ' + (e.message || 'Impossible de charger'))
    } finally {
      setLoadAllFromRiotLoading(false)
    }
  }

  async function handleRefreshTotal() {
    if (!activeSoloqPseudo?.trim() || (!activeSoloqPseudo.includes('#') && !activeSoloqPseudo.includes('/'))) return
    setRefreshTotalLoading(true)
    try {
      const res = await apiFetch(`/api/riot/match-count?pseudo=${encodeURIComponent(activeSoloqPseudo.trim())}`)
      const data = await res.json().catch(() => ({}))
      if (!data.success) throw new Error(data.error || 'Erreur API')
      const field = selectedSoloqAccount === 1 ? 'soloq_total_match_ids' : 'soloq_total_match_ids_secondary'
      await updatePlayer(player!.id, { [field]: data.total })
      await refetch()
    } catch (e: any) {
      toastError(`Erreur: ${e.message}`)
    } finally {
      setRefreshTotalLoading(false)
    }
  }

  async function handleRefreshData() {
    if (!player?.pseudo || (!player.pseudo.includes('#') && !player.pseudo.includes('/'))) {
      toastInfo('Pseudo GameName#TagLine requis')
      return
    }
    setSyncing(true)
    try {
      const res = await apiFetch(`/api/riot/sync-rank-and-matches?pseudo=${encodeURIComponent(player.pseudo.trim())}`)
      const data = await res.json().catch(() => ({}))
      if (!data.success) {
        if (data.rateLimitSeconds != null) setRateLimitSeconds(Math.max(1, data.rateLimitSeconds))
        throw new Error(data.error || 'Erreur API')
      }
      const updates: Record<string, unknown> = {}
      if (data.rank != null) { updates.rank = data.rank; updates.rank_updated_at = new Date().toISOString() }
      if (typeof data.totalMatchIds === 'number') updates.soloq_total_match_ids = data.totalMatchIds
      if (Object.keys(updates).length > 0) {
        try {
          await updatePlayer(player.id, updates)
          await refetch()
        } catch (err: any) {
          if (err?.code === 'PGRST204' && updates.soloq_total_match_ids != null) {
            const { soloq_total_match_ids: _, ...rest } = updates
            if (Object.keys(rest).length > 0) { await updatePlayer(player.id, rest); await refetch() }
          } else throw err
        }
      }
      const s16 = Array.isArray(data.matches)
        ? data.matches.filter((m: any) => (m.gameCreation || 0) >= SEASON_16_START_MS)
        : []
      if (s16.length > 0 && supabase) {
        await upsertSoloqMatches(s16.map((m: any) => mapMatchRow(m, player.id, 'primary')))
        if (selectedCard === 'soloq') {
          matchHistoryPlayerIdRef.current = null
          await loadMatchHistoryFromSupabase(0, PAGE_SIZE, false)
          await loadSoloqTopChampionsFromDb()
        }
        if (selectedCard === 'general' && player?.id) {
          const { data: freshData } = await fetchSoloqMatches({
            playerId: player.id,
            accountSource: selectedSoloqAccount === 1 ? 'primary' : 'secondary',
            seasonStart: SEASON_16_START_MS,
            offset: 0,
            limit: 300,
          })
          if (Array.isArray(freshData))
            setLpGraphMatches(freshData.filter((m: any) => (m.game_duration ?? 0) >= REMAKE_THRESHOLD_SEC))
        }
      }
    } catch (e: any) {
      toastError('Erreur: ' + (e.message || 'Erreur inconnue'))
    } finally {
      setSyncing(false)
    }
  }

  return {
    syncing,
    matchHistory, matchHistoryLoading, matchHistoryLoadMoreLoading,
    matchHistoryHasMore, matchHistoryCountInDb,
    loadAllFromRiotLoading, rateLimitSeconds, refreshTotalLoading,
    soloqTopChampionsFromDb, allChampionsFromDb, soloqTopChampionsLoading,
    championModalChampion, championModalMatches, championModalMatchesLoading,
    gameDetailMatch, setGameDetailMatch,
    lpGraphMatches, lpGraphLoading, lpCurvePoints,
    loadMatchHistoryFromSupabase,
    loadSoloqTopChampionsFromDb,
    openChampionModal,
    closeChampionModal,
    handleLoadAllFromRiot,
    handleRefreshTotal,
    handleRefreshData,
  }
}
