/**
 * Hook centralisant tout l'état et la logique de la page de détail joueur.
 * Le composant PlayerDetailPage ne fait qu'appeler ce hook et rendre l'UI.
 */
import { useState, useEffect, useRef, useMemo } from 'react'
import { useTeam } from '../../hooks/useTeam'
import { useToast } from '../../../../contexts/ToastContext'
import { useTeamMatches } from '../../hooks/useTeamMatches'
import { useTeamTimelines } from '../../hooks/useTeamTimelines'
import { usePlayerTeamStats } from '../../hooks/usePlayerTeamStats'
import { supabase } from '../../../../lib/supabase'
import {
  fetchSoloqMatches,
  fetchSoloqChampionStats,
  fetchSoloqMatchesByChampion,
  upsertSoloqMatches,
} from '../../../../services/supabase/playerQueries'
import { fetchAllRunes } from '../../../../services/supabase/runeQueries'
import {
  SEASON_16_START_MS,
  REMAKE_THRESHOLD_SEC,
  PAGE_SIZE,
} from '../../../../lib/constants'
import { apiFetch } from '../../../../lib/apiFetch'
import { rowToMatch, parseLpFromRank } from '../utils/playerDetailHelpers'

export function usePlayerDetail(playerId: string | undefined) {
  const { error: toastError, info: toastInfo } = useToast()
  const { players = [], team, updatePlayer, refetch } = useTeam()

  const {
    stats: teamStats,
    teamTotalsByMatch,
    loading: teamStatsLoading,
  } = usePlayerTeamStats(playerId)

  // ─── Tab navigation state ─────────────────────────────────────────────────
  const [selectedCard, setSelectedCard] = useState('general')
  const [selectedSoloqSub, setSelectedSoloqSub] = useState('statistiques')
  const [selectedTeamSub, setSelectedTeamSub] = useState('statistiques')
  const [teamStatsSubSub, setTeamStatsSubSub] = useState<'general' | 'timeline'>('general')
  const [teamChampSubSub, setTeamChampSubSub] = useState<'general' | 'detaille'>('general')
  const [expandedTeamChampion, setExpandedTeamChampion] = useState<string | null>(null)
  const [selectedSoloqAccount, setSelectedSoloqAccount] = useState(1)

  // ─── Solo Q state ─────────────────────────────────────────────────────────
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

  // ─── Team / All Stats state ───────────────────────────────────────────────
  const [selectedAllStatsMatchId, setSelectedAllStatsMatchId] = useState<string | null>(null)
  const [allRunesCache, setAllRunesCache] = useState<Array<{ id: number; name: string; icon: string }>>([])

  const matchHistoryPlayerIdRef = useRef<string | null>(null)

  // ─── Team data ────────────────────────────────────────────────────────────
  const { matches: allTeamMatches } = useTeamMatches(team?.id)
  const allTeamMatchIds = useMemo(
    () => (allTeamMatches || []).map((m: any) => m.id),
    [allTeamMatches],
  )
  const { timelines: allTeamTimelines } = useTeamTimelines(allTeamMatchIds)

  // ─── Derived values ───────────────────────────────────────────────────────
  const player = players.find((p) => p.id === playerId)
  const activeSoloqPseudo =
    selectedSoloqAccount === 1 ? (player?.pseudo ?? '') : (player?.secondary_account ?? '')
  const soloqAccountSource = selectedSoloqAccount === 1 ? 'primary' : 'secondary'
  const totalFromRiot =
    selectedSoloqAccount === 1
      ? (player?.soloq_total_match_ids ?? null)
      : (player?.soloq_total_match_ids_secondary ?? null)
  const countInDb = matchHistoryCountInDb
  const toLoad =
    totalFromRiot != null && countInDb != null && totalFromRiot > countInDb
      ? totalFromRiot - countInDb
      : null

  // ─── Champion stats from team matches ────────────────────────────────────
  const championStatsFromTeam = useMemo(() => {
    if (!teamStats?.length) return []
    const byChamp = new Map<string, any>()
    for (const s of teamStats) {
      const name = s.champion_name
      if (!name) continue
      if (!byChamp.has(name)) {
        byChamp.set(name, { name, games: 0, wins: 0, kills: 0, deaths: 0, assists: 0, matchEntries: [] })
      }
      const c = byChamp.get(name)
      c.games++
      if (s.team_matches?.our_win) c.wins++
      c.kills += s.kills ?? 0
      c.deaths += s.deaths ?? 0
      c.assists += s.assists ?? 0
      c.matchEntries.push(s)
    }
    return Array.from(byChamp.values())
      .map((c) => ({
        ...c,
        losses: c.games - c.wins,
        winrate: c.games > 0 ? Math.round((c.wins / c.games) * 100) : 0,
        avgK: c.games > 0 ? +(c.kills / c.games).toFixed(1) : 0,
        avgD: c.games > 0 ? +(c.deaths / c.games).toFixed(1) : 0,
        avgA: c.games > 0 ? +(c.assists / c.games).toFixed(1) : 0,
        kdaRatio:
          c.deaths > 0
            ? +((c.kills + c.assists) / c.deaths).toFixed(2)
            : +(c.kills + c.assists).toFixed(2),
      }))
      .sort((a, b) => b.games - a.games)
  }, [teamStats])

  // ─── LP curve ────────────────────────────────────────────────────────────
  const lpCurvePoints = useMemo(() => {
    const currentLp = parseLpFromRank(player?.rank)
    if (currentLp == null || !lpGraphMatches.length) return []
    const sorted = [...lpGraphMatches].sort(
      (a: any, b: any) => (a.game_creation ?? 0) - (b.game_creation ?? 0)
    )
    let lp = currentLp
    for (const m of sorted) {
      lp += m.win ? -25 : 25
    }
    const points: { date: Date; lp: number; win?: boolean }[] = []
    for (const m of sorted) {
      const ts = m.game_creation ?? 0
      points.push({ date: new Date(ts), lp, win: !!m.win })
      lp += m.win ? 25 : -25
    }
    points.push({ date: new Date(), lp: currentLp })
    return points
  }, [player?.rank, lpGraphMatches])

  // ─── Runes cache (chargé à la première ouverture de l'onglet All Stats) ──
  useEffect(() => {
    if (selectedTeamSub !== 'allstats' || allRunesCache.length > 0) return
    let cancelled = false
    fetchAllRunes().then(({ data, error }) => {
      if (cancelled || error || !data?.length) return
      setAllRunesCache(data.map((r: any) => ({ id: r.id, name: r.name || r.key || '', icon: r.icon || '' })))
    })
    return () => { cancelled = true }
  }, [selectedTeamSub, allRunesCache.length])

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
  }, [player?.id, selectedSoloqAccount])

  // ─── Load SoloQ data when tab becomes active ──────────────────────────────
  useEffect(() => {
    if (selectedCard !== 'soloq' || !player?.id) return
    const refKey = `${player.id}:${soloqAccountSource}`
    if (matchHistoryPlayerIdRef.current === refKey) {
      loadSoloqTopChampionsFromDb()
      return
    }
    loadMatchHistoryFromSupabase(0, PAGE_SIZE, false)
    loadSoloqTopChampionsFromDb()
  }, [selectedCard, player?.id, selectedSoloqAccount])

  // ─── Load LP graph when general tab active ────────────────────────────────
  useEffect(() => {
    if (selectedCard !== 'general' || !player?.id) return
    let cancelled = false
    setLpGraphLoading(true)
    const accountSource = selectedSoloqAccount === 1 ? 'primary' : 'secondary'
    fetchSoloqMatches({
      playerId: player.id,
      accountSource,
      seasonStart: SEASON_16_START_MS,
      offset: 0,
      limit: 300,
    })
      .then(({ data }) => {
        if (!cancelled && Array.isArray(data)) {
          setLpGraphMatches(data.filter((m: any) => (m.game_duration ?? 0) >= REMAKE_THRESHOLD_SEC))
        }
      })
      .catch(() => { if (!cancelled) setLpGraphMatches([]) })
      .finally(() => { if (!cancelled) setLpGraphLoading(false) })
    return () => { cancelled = true }
  }, [selectedCard, player?.id, selectedSoloqAccount])

  // ─── Handlers ─────────────────────────────────────────────────────────────

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
      if (!append) {
        setMatchHistory([])
        setMatchHistoryHasMore(false)
        setMatchHistoryCountInDb(null)
      }
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
      const byChamp = new Map()
      for (const row of rows || []) {
        const name = row.champion_name || 'Unknown'
        if (!byChamp.has(name))
          byChamp.set(name, { games: 0, wins: 0, kills: 0, deaths: 0, assists: 0 })
        const stat = byChamp.get(name)
        stat.games += 1
        if (row.win) stat.wins += 1
        stat.kills += row.kills ?? 0
        stat.deaths += row.deaths ?? 0
        stat.assists += row.assists ?? 0
      }
      const list = Array.from(byChamp.entries())
        .map(([name, s]) => {
          const kdaRatio =
            s.deaths > 0
              ? ((s.kills + s.assists) / s.deaths).toFixed(2)
              : (s.kills + s.assists).toFixed(2)
          return {
            name,
            games: s.games,
            wins: s.wins,
            winrate: s.games > 0 ? Math.round((s.wins / s.games) * 100) : 0,
            kills: s.kills,
            deaths: s.deaths,
            assists: s.assists,
            kdaRatio: parseFloat(kdaRatio),
            avgK: s.games > 0 ? (s.kills / s.games).toFixed(1) : '0',
            avgD: s.games > 0 ? (s.deaths / s.games).toFixed(1) : '0',
            avgA: s.games > 0 ? (s.assists / s.games).toFixed(1) : '0',
          }
        })
        .sort((a, b) => b.games - a.games)
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

  async function handleLoadAllFromRiot() {
    if (
      !activeSoloqPseudo?.trim() ||
      (!activeSoloqPseudo.includes('#') && !activeSoloqPseudo.includes('/'))
    ) {
      toastInfo('Pseudo au format GameName#TagLine requis')
      return
    }
    if (rateLimitSeconds != null && rateLimitSeconds > 0) return
    setLoadAllFromRiotLoading(true)
    setRateLimitSeconds(null)
    try {
      let start = countInDb ?? 0
      let totalLoaded = 0
      matchHistoryPlayerIdRef.current = null
      for (;;) {
        const res = await apiFetch(
          `/api/riot/match-history?pseudo=${encodeURIComponent(activeSoloqPseudo.trim())}&start=${start}&limit=${PAGE_SIZE}`
        )
        const data = await res.json().catch(() => ({}))
        if (res.status === 429 && (data.retryAfter ?? data.retry_after)) {
          const s16From429 = Array.isArray(data.matches)
            ? data.matches.filter((m: any) => (m.gameCreation || 0) >= SEASON_16_START_MS)
            : []
          if (s16From429.length > 0 && supabase) {
            const rows = s16From429.map((m: any) => ({
              player_id: player!.id,
              riot_match_id: m.matchId,
              account_source: soloqAccountSource,
              champion_id: m.championId ?? null,
              champion_name: m.championName ?? null,
              opponent_champion: m.opponentChampionName ?? null,
              win: !!m.win,
              kills: m.kills ?? 0,
              deaths: m.deaths ?? 0,
              assists: m.assists ?? 0,
              game_duration: m.gameDuration ?? 0,
              game_creation: m.gameCreation ?? 0,
            }))
            await upsertSoloqMatches(rows)
            totalLoaded += rows.length
            await loadSoloqTopChampionsFromDb()
          }
          setRateLimitSeconds(Math.max(1, parseInt(data.retryAfter ?? data.retry_after, 10) || 120))
          break
        }
        if (!data.success || !Array.isArray(data.matches)) {
          if (data.error && !res.ok) throw new Error(data.error)
          break
        }
        const s16Matches = (data.matches || []).filter(
          (m: any) => (m.gameCreation || 0) >= SEASON_16_START_MS
        )
        if (s16Matches.length > 0 && supabase) {
          const rows = s16Matches.map((m: any) => ({
            player_id: player!.id,
            riot_match_id: m.matchId,
            account_source: soloqAccountSource,
            champion_id: m.championId ?? null,
            champion_name: m.championName ?? null,
            opponent_champion: m.opponentChampionName ?? null,
            win: !!m.win,
            kills: m.kills ?? 0,
            deaths: m.deaths ?? 0,
            assists: m.assists ?? 0,
            game_duration: m.gameDuration ?? 0,
            game_creation: m.gameCreation ?? 0,
          }))
          await upsertSoloqMatches(rows)
          totalLoaded += rows.length
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
    if (
      !activeSoloqPseudo?.trim() ||
      (!activeSoloqPseudo.includes('#') && !activeSoloqPseudo.includes('/'))
    )
      return
    setRefreshTotalLoading(true)
    try {
      const res = await apiFetch(
        `/api/riot/match-count?pseudo=${encodeURIComponent(activeSoloqPseudo.trim())}`
      )
      const data = await res.json().catch(() => ({}))
      if (!data.success) throw new Error(data.error || 'Erreur API')
      const field =
        selectedSoloqAccount === 1 ? 'soloq_total_match_ids' : 'soloq_total_match_ids_secondary'
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
      const res = await apiFetch(
        `/api/riot/sync-rank-and-matches?pseudo=${encodeURIComponent(player.pseudo.trim())}`
      )
      const data = await res.json().catch(() => ({}))
      if (!data.success) {
        if (data.rateLimitSeconds != null) setRateLimitSeconds(Math.max(1, data.rateLimitSeconds))
        throw new Error(data.error || 'Erreur API')
      }
      const updates: Record<string, unknown> = {}
      if (data.rank != null) {
        updates.rank = data.rank
        updates.rank_updated_at = new Date().toISOString()
      }
      if (typeof data.totalMatchIds === 'number') updates.soloq_total_match_ids = data.totalMatchIds
      if (Object.keys(updates).length > 0) {
        try {
          await updatePlayer(player.id, updates)
          await refetch()
        } catch (err: any) {
          if (err?.code === 'PGRST204' && updates.soloq_total_match_ids != null) {
            const { soloq_total_match_ids: _, ...rest } = updates
            if (Object.keys(rest).length > 0) {
              await updatePlayer(player.id, rest)
              await refetch()
            }
          } else throw err
        }
      }
      const refreshS16Matches = Array.isArray(data.matches)
        ? data.matches.filter((m: any) => (m.gameCreation || 0) >= SEASON_16_START_MS)
        : []
      if (refreshS16Matches.length > 0 && supabase) {
        const rows = refreshS16Matches.map((m: any) => ({
          player_id: player.id,
          riot_match_id: m.matchId,
          account_source: 'primary',
          champion_id: m.championId ?? null,
          champion_name: m.championName ?? null,
          opponent_champion: m.opponentChampionName ?? null,
          win: !!m.win,
          kills: m.kills ?? 0,
          deaths: m.deaths ?? 0,
          assists: m.assists ?? 0,
          game_duration: m.gameDuration ?? 0,
          game_creation: m.gameCreation ?? 0,
        }))
        await upsertSoloqMatches(rows)
        if (selectedCard === 'soloq') {
          matchHistoryPlayerIdRef.current = null
          await loadMatchHistoryFromSupabase(0, PAGE_SIZE, false)
          await loadSoloqTopChampionsFromDb()
        }
        if (selectedCard === 'general' && player?.id) {
          const accountSource = selectedSoloqAccount === 1 ? 'primary' : 'secondary'
          const { data: freshData } = await fetchSoloqMatches({
            playerId: player.id,
            accountSource,
            seasonStart: SEASON_16_START_MS,
            offset: 0,
            limit: 300,
          })
          if (Array.isArray(freshData)) {
            setLpGraphMatches(freshData.filter((m: any) => (m.game_duration ?? 0) >= REMAKE_THRESHOLD_SEC))
          }
        }
      }
    } catch (e: any) {
      toastError('Erreur: ' + (e.message || 'Erreur inconnue'))
    } finally {
      setSyncing(false)
    }
  }

  const realGames = matchHistory.filter((m) => (m.gameDuration ?? 0) >= REMAKE_THRESHOLD_SEC)
  const soloqWinrate =
    realGames.length > 0
      ? Math.round((realGames.filter((m) => m.win).length / realGames.length) * 100)
      : null

  return {
    // player data
    player,
    team,
    // tab navigation
    selectedCard, setSelectedCard,
    selectedSoloqSub, setSelectedSoloqSub,
    selectedTeamSub, setSelectedTeamSub,
    teamStatsSubSub, setTeamStatsSubSub,
    teamChampSubSub, setTeamChampSubSub,
    expandedTeamChampion, setExpandedTeamChampion,
    selectedSoloqAccount, setSelectedSoloqAccount,
    // soloq state
    syncing,
    matchHistory,
    matchHistoryLoading,
    matchHistoryLoadMoreLoading,
    matchHistoryHasMore,
    matchHistoryCountInDb,
    loadAllFromRiotLoading,
    rateLimitSeconds,
    refreshTotalLoading,
    soloqTopChampionsFromDb,
    allChampionsFromDb,
    soloqTopChampionsLoading,
    championModalChampion,
    championModalMatches,
    championModalMatchesLoading,
    gameDetailMatch, setGameDetailMatch,
    lpCurvePoints,
    lpGraphLoading,
    // team state
    teamStats,
    teamTotalsByMatch,
    teamStatsLoading,
    championStatsFromTeam,
    selectedAllStatsMatchId, setSelectedAllStatsMatchId,
    allRunesCache,
    allTeamMatches,
    allTeamTimelines,
    // derived
    activeSoloqPseudo,
    soloqAccountSource,
    totalFromRiot,
    countInDb,
    toLoad,
    soloqWinrate,
    // handlers
    loadMatchHistoryFromSupabase,
    loadSoloqTopChampionsFromDb,
    openChampionModal,
    closeChampionModal,
    handleLoadAllFromRiot,
    handleRefreshTotal,
    handleRefreshData,
  }
}
