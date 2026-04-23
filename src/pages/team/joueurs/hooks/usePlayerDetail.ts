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
import { aggregateChampionStats } from '../../../../lib/team/statsAggregation'

export function usePlayerDetail(playerSlug: string | undefined) {
  const { error: toastError, info: toastInfo } = useToast()
  const { players = [], team, updatePlayer, refetch } = useTeam()

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

  // ─── Derived player values (lookup by player_name = URL slug) ────────────
  const player = players.find((p) => p.player_name === playerSlug)
  const playerId = player?.id  // UUID réel pour les requêtes Supabase

  const isFlexTeam = team?.team_type === 'flex'
  const isFunTeam  = team?.team_type === 'fun'

  const { stats: teamStats, teamTotalsByMatch, loading: teamStatsLoading } = usePlayerTeamStats(playerId)
  // 0 = combiné, 1 = primary, 2 = secondary
  const activeSoloqPseudo =
    selectedSoloqAccount === 1 ? (player?.pseudo ?? '') :
    selectedSoloqAccount === 2 ? (player?.secondary_account ?? '') :
    [player?.pseudo, player?.secondary_account].filter(Boolean).join(' + ')
  const soloqAccountSource =
    selectedSoloqAccount === 1 ? 'primary' :
    selectedSoloqAccount === 2 ? 'secondary' :
    'combined'
  const totalFromRiot =
    selectedSoloqAccount === 1 ? (isFlexTeam ? (player?.soloq_total_match_ids_flex ?? null) : (player?.soloq_total_match_ids ?? null)) :
    selectedSoloqAccount === 2 ? (player?.soloq_total_match_ids_secondary ?? null) :
    isFlexTeam
      ? ((player?.soloq_total_match_ids_flex ?? 0) + (player?.soloq_total_match_ids_secondary ?? 0)) || null
      : ((player?.soloq_total_match_ids ?? 0) + (player?.soloq_total_match_ids_secondary ?? 0)) || null

  // ─── Team data ────────────────────────────────────────────────────────────
  const { matches: allTeamMatches } = useTeamMatches(team?.id)
  const allTeamMatchIds = useMemo(() => (allTeamMatches || []).map((m: Record<string, unknown>) => m.id as string), [allTeamMatches])
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
    return aggregateChampionStats(
      filteredTeamStats,
      (s: any) => s.champion_name,
      (s: any) => !!s.team_matches?.our_win,
      { collectEntry: true },
    )
  }, [filteredTeamStats])

  // ─── Runes cache (chargé à la première ouverture de All Stats ou onglet Runes SoloQ) ──
  useEffect(() => {
    if ((selectedSoloqSub !== 'champions' && selectedSoloqSub !== 'builds-runes' && selectedTeamSub !== 'champions') || allRunesCache.length > 0) return undefined
    let cancelled = false
    fetchAllRunes().then(({ data, error }) => {
      if (cancelled || error || !data?.length) return
      setAllRunesCache(data.map((r: Record<string, unknown>) => ({ id: r.id as number, name: (r.name || r.key || '') as string, icon: (r.icon || '') as string })))
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
    updatePlayer,
    refetch,
    toastError,
    toastInfo,
    queueType: isFunTeam ? undefined : isFlexTeam ? 'flex' : 'soloq',
    isFlexTeam: isFlexTeam || isFunTeam,
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
    player, team, isFlexTeam, isFunTeam,
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
