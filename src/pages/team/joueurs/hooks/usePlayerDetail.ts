/**
 * Hook orchestrateur — page de détail joueur.
 * Gère les onglets, les données Team, et délègue le SoloQ à usePlayerSoloqData.
 */
import { useState, useEffect, useMemo } from 'react'
import { useTeam } from '../../hooks/useTeam'
import { useToast } from '../../../../contexts/ToastContext'
import { useTeamMatches } from '../../hooks/useTeamMatches'
import { useTeamTimelines } from '../../hooks/useTeamTimelines'
import { usePlayerTeamStats } from '../../hooks/usePlayerTeamStats'
import { fetchAllRunes } from '../../../../services/supabase/runeQueries'
import { usePlayerSoloqData } from './usePlayerSoloqData'

export function usePlayerDetail(playerId: string | undefined) {
  const { error: toastError, info: toastInfo } = useToast()
  const { players = [], team, updatePlayer, refetch } = useTeam()

  const { stats: teamStats, teamTotalsByMatch, loading: teamStatsLoading } = usePlayerTeamStats(playerId)

  // ─── Tab navigation ───────────────────────────────────────────────────────
  const [selectedCard, setSelectedCard] = useState('general')
  const [selectedSoloqSub, setSelectedSoloqSub] = useState('statistiques')
  const [selectedTeamSub, setSelectedTeamSub] = useState('statistiques')
  const [teamMatchTypeFilter, setTeamMatchTypeFilter] = useState<'all' | 'scrim' | 'tournament'>('all')
  const [teamStatsSubSub, setTeamStatsSubSub] = useState<'general' | 'timeline'>('general')
  const [teamChampSubSub, setTeamChampSubSub] = useState<'general' | 'detaille'>('general')
  const [expandedTeamChampion, setExpandedTeamChampion] = useState<string | null>(null)
  const [selectedSoloqAccount, setSelectedSoloqAccount] = useState(1)
  const [selectedAllStatsMatchId, setSelectedAllStatsMatchId] = useState<string | null>(null)
  const [allRunesCache, setAllRunesCache] = useState<Array<{ id: number; name: string; icon: string }>>([])

  // ─── Derived player values ────────────────────────────────────────────────
  const player = players.find((p) => p.id === playerId)
  const activeSoloqPseudo = selectedSoloqAccount === 1 ? (player?.pseudo ?? '') : (player?.secondary_account ?? '')
  const soloqAccountSource = selectedSoloqAccount === 1 ? 'primary' : 'secondary'
  const totalFromRiot = selectedSoloqAccount === 1
    ? (player?.soloq_total_match_ids ?? null)
    : (player?.soloq_total_match_ids_secondary ?? null)

  // ─── Team data ────────────────────────────────────────────────────────────
  const { matches: allTeamMatches } = useTeamMatches(team?.id)
  const allTeamMatchIds = useMemo(() => (allTeamMatches || []).map((m: any) => m.id), [allTeamMatches])
  const { timelines: allTeamTimelines } = useTeamTimelines(allTeamMatchIds)

  // ─── Filtered team stats ──────────────────────────────────────────────────
  const filteredTeamStats = useMemo(() => {
    if (!teamStats?.length) return []
    if (teamMatchTypeFilter === 'all') return teamStats
    return teamStats.filter((s) => (s.team_matches?.match_type || 'scrim') === teamMatchTypeFilter)
  }, [teamStats, teamMatchTypeFilter])

  // ─── Champion stats from team matches ────────────────────────────────────
  const championStatsFromTeam = useMemo(() => {
    if (!filteredTeamStats?.length) return []
    const byChamp = new Map<string, any>()
    for (const s of filteredTeamStats) {
      const name = s.champion_name
      if (!name) continue
      if (!byChamp.has(name))
        byChamp.set(name, { name, games: 0, wins: 0, kills: 0, deaths: 0, assists: 0, matchEntries: [] })
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
        kdaRatio: c.deaths > 0
          ? +((c.kills + c.assists) / c.deaths).toFixed(2)
          : +(c.kills + c.assists).toFixed(2),
      }))
      .sort((a, b) => b.games - a.games)
  }, [filteredTeamStats])

  // ─── Runes cache (chargé à la première ouverture de All Stats ou onglet Runes SoloQ) ──
  useEffect(() => {
    if ((selectedTeamSub !== 'allstats' && selectedSoloqSub !== 'runes') || allRunesCache.length > 0) return
    let cancelled = false
    fetchAllRunes().then(({ data, error }) => {
      if (cancelled || error || !data?.length) return
      setAllRunesCache(data.map((r: any) => ({ id: r.id, name: r.name || r.key || '', icon: r.icon || '' })))
    })
    return () => { cancelled = true }
  }, [selectedTeamSub, selectedSoloqSub, allRunesCache.length])

  // ─── SoloQ — délégué à usePlayerSoloqData ────────────────────────────────
  const soloq = usePlayerSoloqData({
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
  })

  const countInDb = soloq.matchHistoryCountInDb
  const toLoad = totalFromRiot != null && countInDb != null && totalFromRiot > countInDb
    ? totalFromRiot - countInDb
    : null

  const realGames = soloq.matchHistory.filter((m) => (m.gameDuration ?? 0) >= 180)
  const soloqWinrate = realGames.length > 0
    ? Math.round((realGames.filter((m) => m.win).length / realGames.length) * 100)
    : null

  return {
    // player
    player, team,
    // tab navigation
    selectedCard, setSelectedCard,
    selectedSoloqSub, setSelectedSoloqSub,
    selectedTeamSub, setSelectedTeamSub,
    teamStatsSubSub, setTeamStatsSubSub,
    teamChampSubSub, setTeamChampSubSub,
    expandedTeamChampion, setExpandedTeamChampion,
    selectedSoloqAccount, setSelectedSoloqAccount,
    // soloq (spread depuis usePlayerSoloqData)
    ...soloq,
    // team
    teamStats,
    filteredTeamStats,
    teamMatchTypeFilter, setTeamMatchTypeFilter,
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
  }
}
