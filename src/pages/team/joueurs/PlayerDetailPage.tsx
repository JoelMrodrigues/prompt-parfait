/**
 * Page détail joueur — Layout par 4 cartes : Général | Solo Q | Team | Pool Champ
 * Sous-menus pour Solo Q et Team : Statistiques | Champions | Historiques
 */
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft,
  ExternalLink,
  User,
  Swords,
  Users,
  Trophy,
  BarChart3,
  Sparkles,
  History,
  Download,
  ChevronDown,
  TrendingUp,
  X,
} from 'lucide-react'
import { useTeam } from '../hooks/useTeam'
import { useToast } from '../../../contexts/ToastContext'
import {
  getChampionImage,
  getBigChampionImage,
  getChampionDisplayName,
} from '../../../lib/championImages'
import { TIER_KEYS } from '../champion-pool/constants/tiers'
import { TierTable } from '../champion-pool/components/TierTable'
import { PlayerTeamStatsSection } from './components/PlayerTeamStatsSection'
import { usePlayerTeamStats } from '../hooks/usePlayerTeamStats'
import { useState, useEffect, useRef, useMemo } from 'react'
import { supabase } from '../../../lib/supabase'
import { useTeamMatches } from '../hooks/useTeamMatches'
import { useTeamTimelines, TIMELINE_MINUTES } from '../hooks/useTeamTimelines'
import {
  fetchSoloqMatches,
  fetchSoloqChampionStats,
  fetchSoloqMatchesByChampion,
  upsertSoloqMatches,
} from '../../../services/supabase/playerQueries'

const getBackendUrl = () =>
  (import.meta.env.VITE_DPM_API_URL || 'http://localhost:3001').replace(/\/$/, '')
const PAGE_SIZE = 20
const SEASON_16_START_MS = 1767830400000
/** Parties < 3 min (remake / AFK) : ne comptent pas pour les stats ni les LP */
const REMAKE_THRESHOLD_SEC = 180

const MAIN_CARDS = [
  { id: 'general', label: 'Général', icon: User },
  { id: 'soloq', label: 'Solo Q', icon: Swords },
  { id: 'team', label: 'Team', icon: Users },
  { id: 'pool-champ', label: 'Pool Champ', icon: Trophy },
]

const SOLOQ_SUB = [
  { id: 'statistiques', label: 'Statistiques', icon: BarChart3 },
  { id: 'champions', label: 'Champions', icon: Sparkles },
  { id: 'historiques', label: 'Historiques', icon: History },
  { id: 'import', label: 'Import', icon: Download },
]

const TEAM_SUB = [
  { id: 'statistiques', label: 'Statistiques', icon: BarChart3 },
  { id: 'champions', label: 'Champions', icon: Sparkles },
  { id: 'historiques', label: 'Historiques', icon: History },
]

function rowToMatch(row) {
  return {
    matchId: row.riot_match_id,
    championId: row.champion_id,
    championName: row.champion_name,
    opponentChampionName: row.opponent_champion ?? null,
    win: !!row.win,
    kills: row.kills ?? 0,
    deaths: row.deaths ?? 0,
    assists: row.assists ?? 0,
    gameDuration: row.game_duration ?? 0,
    gameCreation: row.game_creation ?? 0,
  }
}

const ROLE_LABELS = { TOP: 'Top', JNG: 'Jungle', MID: 'Mid', ADC: 'ADC', SUP: 'Support' }

function getRankColor(rank) {
  if (!rank) return 'from-gray-500 to-gray-700'
  const r = rank.toLowerCase()
  if (r.includes('challenger')) return 'from-yellow-400 via-blue-500 to-yellow-400'
  if (r.includes('grandmaster')) return 'from-orange-500 to-orange-700'
  if (r.includes('master')) return 'from-purple-500 to-purple-700'
  if (r.includes('diamond')) return 'from-blue-500 to-blue-700'
  if (r.includes('emerald')) return 'from-emerald-500 to-emerald-700'
  if (r.includes('platinum')) return 'from-cyan-500 to-cyan-700'
  if (r.includes('gold')) return 'from-yellow-500 to-yellow-700'
  if (r.includes('silver')) return 'from-gray-400 to-gray-600'
  if (r.includes('bronze')) return 'from-orange-600 to-orange-800'
  if (r.includes('iron')) return 'from-gray-600 to-gray-800'
  return 'from-gray-500 to-gray-700'
}

function generateDpmLink(pseudo) {
  if (!pseudo) return ''
  return `https://dpm.lol/${encodeURIComponent(pseudo.replace(/#/g, '-'))}?queue=solo`
}

/** Extrait les LP du rang (ex. "Master 614 LP" → 614). Retourne null si non trouvé. */
function parseLpFromRank(rank: string | null | undefined): number | null {
  if (!rank || typeof rank !== 'string') return null
  const m = rank.match(/(\d+)\s*LP/i)
  return m ? parseInt(m[1], 10) : null
}

const LP_CHART_PADDING = { top: 32, right: 24, bottom: 40, left: 48 }
const LP_LINE_COLOR = '#22d3ee' // cyan type lol pro

function LpCurveChart({
  points,
}: {
  points: { date: Date; lp: number; win?: boolean }[]
}) {
  if (points.length < 2) return null
  const width = 640
  const height = 280
  const p = LP_CHART_PADDING
  const innerW = width - p.left - p.right
  const innerH = height - p.top - p.bottom
  const minLp = Math.min(...points.map((x) => x.lp))
  const maxLp = Math.max(...points.map((x) => x.lp))
  const lpRange = Math.max(maxLp - minLp, 50)
  const minT = points[0].date.getTime()
  const maxT = points[points.length - 1].date.getTime()
  const tRange = Math.max(maxT - minT, 1)
  const toX = (d: Date) => p.left + ((d.getTime() - minT) / tRange) * innerW
  const toY = (lp: number) => p.top + innerH - ((lp - minLp) / lpRange) * innerH
  const pathD = points
    .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${toX(pt.date)} ${toY(pt.lp)}`)
    .join(' ')
  // Points clés pour les labels (début, ~1/3, ~2/3, fin)
  const labelIndices =
    points.length <= 4
      ? points.map((_, i) => i)
      : [0, Math.floor(points.length / 3), Math.floor((2 * points.length) / 3), points.length - 1]
  const uniq = Array.from(new Set(labelIndices)).sort((a, b) => a - b)

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-full"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Grille horizontale */}
      {[0, 0.25, 0.5, 0.75, 1].map((q) => {
        const lp = minLp + q * lpRange
        const y = toY(lp)
        return (
          <line
            key={q}
            x1={p.left}
            y1={y}
            x2={width - p.right}
            y2={y}
            stroke="rgba(255,255,255,0.06)"
            strokeDasharray="4 4"
          />
        )
      })}
      {/* Courbe cyan */}
      <path
        d={pathD}
        fill="none"
        stroke={LP_LINE_COLOR}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Cercles aux points */}
      {points.map((pt, i) => (
        <circle
          key={i}
          cx={toX(pt.date)}
          cy={toY(pt.lp)}
          r="3"
          fill={LP_LINE_COLOR}
          stroke="rgba(0,0,0,0.3)"
          strokeWidth="1"
        />
      ))}
      {/* Labels sur la courbe (milestones) */}
      {uniq.map((i) => {
        const pt = points[i]
        const x = toX(pt.date)
        const y = toY(pt.lp)
        const label = `${pt.lp} LP`
        return (
          <g key={i}>
            <rect
              x={x - 28}
              y={y - 22}
              width={56}
              height={18}
              rx="4"
              fill="rgba(0,0,0,0.75)"
              stroke="rgba(255,255,255,0.2)"
            />
            <text
              x={x}
              y={y - 9}
              textAnchor="middle"
              className="fill-white text-[10px] font-semibold font-mono"
            >
              {label}
            </text>
          </g>
        )
      })}
      {/* Axe Y (LP) */}
      {[0, 0.25, 0.5, 0.75, 1].map((q) => {
        const lp = Math.round(minLp + q * lpRange)
        const y = toY(lp)
        return (
          <text
            key={q}
            x={p.left - 8}
            y={y + 4}
            textAnchor="end"
            className="fill-gray-400 text-[11px] font-mono"
          >
            {lp}
          </text>
        )
      })}
      {/* Axe X (dates DD/MM) */}
      {(() => {
        const step = Math.max(1, Math.floor(points.length / 10))
        const indices = []
        for (let i = 0; i < points.length; i += step) indices.push(i)
        if (points.length - 1 - (indices[indices.length - 1] ?? 0) > step / 2) indices.push(points.length - 1)
        return indices.map((i) => {
          const pt = points[i]
          const x = toX(pt.date)
          const label = `${String(pt.date.getDate()).padStart(2, '0')}/${String(pt.date.getMonth() + 1).padStart(2, '0')}`
          return (
            <text
              key={i}
              x={x}
              y={height - 12}
              textAnchor="middle"
              className="fill-gray-500 text-[10px] font-mono"
            >
              {label}
            </text>
          )
        })
      })()}
    </svg>
  )
}

// ─── Timeline helpers (Team) ──────────────────────────────────────────────────

const ROLE_ORDER_TEAM = ['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT']

function getOurAndEnemySortedTeam(match: any) {
  const parts = match?.team_match_participants || []
  const our = parts.filter((p: any) => p.team_side === 'our' || !p.team_side)
  const enemy = parts.filter((p: any) => p.team_side === 'enemy')
  const sortByRole = (a: any, b: any) =>
    ROLE_ORDER_TEAM.indexOf(a.role || '') - ROLE_ORDER_TEAM.indexOf(b.role || '')
  return { our: [...our].sort(sortByRole), enemy: [...enemy].sort(sortByRole) }
}

function PlayerTimelineAdvantageSection({
  playerId,
  matches,
  timelines,
}: {
  playerId: string
  matches: any[]
  timelines: any[]
}) {
  const advantageByMinute = useMemo(() => {
    if (!playerId || !matches?.length || !timelines?.length) return null
    const timelineByMatchId = new Map<string, any>(timelines.map((t: any) => [t.match_id, t]))
    const getCs = (s: any) => (s?.minions ?? 0) + (s?.jungle ?? 0) || (s?.cs ?? 0)

    return TIMELINE_MINUTES.map((min) => {
      const goldDiffs: number[] = []
      const xpDiffs: number[] = []
      const csDiffs: number[] = []
      for (const m of matches) {
        const { our, enemy } = getOurAndEnemySortedTeam(m)
        const playerIndex = our.findIndex((p: any) => p.player_id === playerId)
        if (playerIndex < 0) continue
        const ourPart = our[playerIndex]
        const enemyPart = enemy[playerIndex]
        if (!enemyPart) continue
        const ourPid = ourPart?.participant_id ?? playerIndex + 1
        const enemyPid = enemyPart?.participant_id ?? 6 + playerIndex
        const t = timelineByMatchId.get(m.id)
        const snapshot = t?.snapshot && typeof t.snapshot === 'object' ? t.snapshot : null
        const snap = snapshot?.[String(min)]?.participants
        if (!snap) continue
        const ourSnap = snap[String(ourPid)]
        const enemySnap = snap[String(enemyPid)]
        goldDiffs.push((ourSnap?.gold ?? 0) - (enemySnap?.gold ?? 0))
        xpDiffs.push((ourSnap?.xp ?? 0) - (enemySnap?.xp ?? 0))
        csDiffs.push(getCs(ourSnap) - getCs(enemySnap))
      }
      const count = goldDiffs.length
      const avg = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0)
      return { min, avgGold: avg(goldDiffs), avgXp: avg(xpDiffs), avgCs: avg(csDiffs), count }
    })
  }, [playerId, matches, timelines])

  if (!advantageByMinute?.length || advantageByMinute.every((r) => r.count === 0)) {
    return (
      <div className="bg-dark-card border border-dark-border rounded-lg p-6">
        <h3 className="font-display text-base font-semibold text-white mb-2">
          Avantage vs vis-à-vis
        </h3>
        <p className="text-gray-500 text-sm">
          Aucune timeline disponible. Importez des timelines depuis la page Import et associez-les à
          vos matchs pour afficher l&apos;avantage or / XP / CS à 5, 10, 15, 20, 25 min.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-dark-card border border-dark-border rounded-lg overflow-hidden">
      <h3 className="font-display text-base font-semibold text-white px-4 py-3 border-b border-dark-border">
        Avantage vs vis-à-vis en fonction du temps
      </h3>
      <p className="text-gray-500 text-sm px-4 pt-2 pb-1">
        Moyenne de l&apos;avantage or / XP / CS face au vis-à-vis à chaque palier.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-400 border-b border-dark-border bg-dark-bg/50">
              <th className="py-3 px-4">Minute</th>
              <th className="py-3 px-4 text-right">Or (moy.)</th>
              <th className="py-3 px-4 text-right">XP (moy.)</th>
              <th className="py-3 px-4 text-right">CS (moy.)</th>
              <th className="py-3 px-4 text-right">Parties</th>
            </tr>
          </thead>
          <tbody>
            {advantageByMinute
              .filter((r) => r.count > 0)
              .map((r) => (
                <tr key={r.min} className="border-b border-dark-border/50">
                  <td className="py-3 px-4 font-medium text-gray-300">{r.min} min</td>
                  <td
                    className={`py-3 px-4 text-right font-medium ${r.avgGold >= 0 ? 'text-green-400' : 'text-red-400'}`}
                  >
                    {r.avgGold >= 0 ? '+' : ''}
                    {Math.round(r.avgGold).toLocaleString()}
                  </td>
                  <td
                    className={`py-3 px-4 text-right font-medium ${r.avgXp >= 0 ? 'text-green-400' : 'text-red-400'}`}
                  >
                    {r.avgXp >= 0 ? '+' : ''}
                    {Math.round(r.avgXp).toLocaleString()}
                  </td>
                  <td
                    className={`py-3 px-4 text-right font-medium ${r.avgCs >= 0 ? 'text-green-400' : 'text-red-400'}`}
                  >
                    {r.avgCs >= 0 ? '+' : ''}
                    {Math.round(r.avgCs).toFixed(1)}
                  </td>
                  <td className="py-3 px-4 text-right text-gray-400">{r.count}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export const PlayerDetailPage = () => {
  const { error: toastError, info: toastInfo } = useToast()
  const { playerId } = useParams()
  const navigate = useNavigate()
  const { players = [], team, updatePlayer, refetch } = useTeam()
  const {
    stats: teamStats,
    teamTotalsByMatch,
    loading: teamStatsLoading,
  } = usePlayerTeamStats(playerId)
  const [selectedCard, setSelectedCard] = useState('general')
  const [selectedSoloqSub, setSelectedSoloqSub] = useState('statistiques')
  const [selectedTeamSub, setSelectedTeamSub] = useState('statistiques')
  const [teamStatsSubSub, setTeamStatsSubSub] = useState<'general' | 'timeline'>('general')
  const [teamChampSubSub, setTeamChampSubSub] = useState<'general' | 'detaille'>('general')
  const [expandedTeamChampion, setExpandedTeamChampion] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [matchHistory, setMatchHistory] = useState([])
  const [matchHistoryLoading, setMatchHistoryLoading] = useState(false)
  const [matchHistoryLoadMoreLoading, setMatchHistoryLoadMoreLoading] = useState(false)
  const [matchHistoryHasMore, setMatchHistoryHasMore] = useState(false)
  const [matchHistoryCountInDb, setMatchHistoryCountInDb] = useState(null)
  const [loadAllFromRiotLoading, setLoadAllFromRiotLoading] = useState(false)
  const [rateLimitSeconds, setRateLimitSeconds] = useState(null)
  const [refreshTotalLoading, setRefreshTotalLoading] = useState(false)
  const [soloqTopChampionsFromDb, setSoloqTopChampionsFromDb] = useState([])
  const [allChampionsFromDb, setAllChampionsFromDb] = useState([])
  const [soloqTopChampionsLoading, setSoloqTopChampionsLoading] = useState(false)
  const [selectedSoloqAccount, setSelectedSoloqAccount] = useState(1)
  const [championModalChampion, setChampionModalChampion] = useState(null)
  const [championModalMatches, setChampionModalMatches] = useState([])
  const [championModalMatchesLoading, setChampionModalMatchesLoading] = useState(false)
  const [gameDetailMatch, setGameDetailMatch] = useState(null)
  const matchHistoryPlayerIdRef = useRef(null)
  const [lpGraphMatches, setLpGraphMatches] = useState<any[]>([])
  const [lpGraphLoading, setLpGraphLoading] = useState(false)

  // ─── Team timeline data ───────────────────────────────────────────────────
  const { matches: allTeamMatches } = useTeamMatches(team?.id)
  const allTeamMatchIds = useMemo(
    () => (allTeamMatches || []).map((m: any) => m.id),
    [allTeamMatches],
  )
  const { timelines: allTeamTimelines } = useTeamTimelines(allTeamMatchIds)

  // ─── Champion stats from team matches (already loaded via usePlayerTeamStats) ──
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

  const loadMatchHistoryFromSupabase = async (offset, limit, append) => {
    if (!player?.id || !supabase) return
    const setLoadingState = offset === 0 ? setMatchHistoryLoading : setMatchHistoryLoadMoreLoading
    setLoadingState(true)
    try {
      const {
        data: rows,
        error,
        count,
      } = await fetchSoloqMatches({
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
    } catch (e) {
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

  const handleLoadAllFromRiot = async () => {
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
        const res = await fetch(
          `${getBackendUrl()}/api/riot/match-history?pseudo=${encodeURIComponent(activeSoloqPseudo.trim())}&start=${start}&limit=${PAGE_SIZE}`
        )
        const data = await res.json().catch(() => ({}))
        if (res.status === 429 && (data.retryAfter ?? data.retry_after)) {
          const s16From429 = Array.isArray(data.matches)
            ? data.matches.filter((m) => (m.gameCreation || 0) >= SEASON_16_START_MS)
            : []
          if (s16From429.length > 0 && supabase) {
            const rows = s16From429.map((m) => ({
              player_id: player.id,
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
          (m) => (m.gameCreation || 0) >= SEASON_16_START_MS
        )
        if (s16Matches.length > 0 && supabase) {
          const rows = s16Matches.map((m) => ({
            player_id: player.id,
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
    } catch (e) {
      toastError('Erreur: ' + (e.message || 'Impossible de charger'))
    } finally {
      setLoadAllFromRiotLoading(false)
    }
  }

  const handleRefreshTotal = async () => {
    if (
      !activeSoloqPseudo?.trim() ||
      (!activeSoloqPseudo.includes('#') && !activeSoloqPseudo.includes('/'))
    )
      return
    setRefreshTotalLoading(true)
    try {
      const res = await fetch(
        `${getBackendUrl()}/api/riot/match-count?pseudo=${encodeURIComponent(activeSoloqPseudo.trim())}`
      )
      const data = await res.json().catch(() => ({}))
      if (!data.success) throw new Error(data.error || 'Erreur API')
      const field =
        selectedSoloqAccount === 1 ? 'soloq_total_match_ids' : 'soloq_total_match_ids_secondary'
      await updatePlayer(player.id, { [field]: data.total })
      await refetch()
    } catch (e) {
      toastError(`Erreur: ${e.message}`)
    } finally {
      setRefreshTotalLoading(false)
    }
  }

  const loadSoloqTopChampionsFromDb = async () => {
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

  const loadMatchesForChampion = async (championName) => {
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

  const openChampionModal = (champ) => {
    if (!champ?.name) return
    loadMatchesForChampion(champ.name)
  }

  const closeChampionModal = () => {
    setChampionModalChampion(null)
    setChampionModalMatches([])
  }

  useEffect(() => {
    if (rateLimitSeconds == null || rateLimitSeconds <= 0) return
    const t = setInterval(
      () => setRateLimitSeconds((s) => (s != null && s > 0 ? s - 1 : null)),
      1000
    )
    return () => clearInterval(t)
  }, [rateLimitSeconds])

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

  // Charger les matchs pour le graphique LP (carte Général)
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

  // Courbe LP (doit être avant tout early return pour respecter l'ordre des Hooks)
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

  const handleRefreshData = async () => {
    if (!player?.pseudo || (!player.pseudo.includes('#') && !player.pseudo.includes('/'))) {
      toastInfo('Pseudo GameName#TagLine requis')
      return
    }
    setSyncing(true)
    try {
      const res = await fetch(
        `${getBackendUrl()}/api/riot/sync-rank-and-matches?pseudo=${encodeURIComponent(player.pseudo.trim())}`
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
        ? data.matches.filter((m) => (m.gameCreation || 0) >= SEASON_16_START_MS)
        : []
      if (refreshS16Matches.length > 0 && supabase) {
        const rows = refreshS16Matches.map((m) => ({
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
          const { data } = await fetchSoloqMatches({
            playerId: player.id,
            accountSource,
            seasonStart: SEASON_16_START_MS,
            offset: 0,
            limit: 300,
          })
          if (Array.isArray(data)) {
            setLpGraphMatches(data.filter((m: any) => (m.game_duration ?? 0) >= REMAKE_THRESHOLD_SEC))
          }
        }
      }
    } catch (e) {
      toastError('Erreur: ' + (e.message || 'Erreur inconnue'))
    } finally {
      setSyncing(false)
    }
  }

  if (!player) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center">
        <p className="text-gray-400 mb-4">Joueur introuvable</p>
        <button
          onClick={() => navigate('/team/joueurs')}
          className="text-accent-blue hover:underline"
        >
          Retour aux joueurs
        </button>
      </div>
    )
  }

  const roleLabel = ROLE_LABELS[player.position] || player.position
  const dpmLink = player.pseudo ? generateDpmLink(player.pseudo) : null
  let topChampions = player.top_champions
  if (typeof topChampions === 'string') {
    try {
      topChampions = JSON.parse(topChampions)
    } catch {
      topChampions = []
    }
  }
  if (!Array.isArray(topChampions)) topChampions = []
  const mostPlayedChamp = topChampions[0]
  const mostPlayedName = mostPlayedChamp ? mostPlayedChamp.name || mostPlayedChamp : null
  const bigChampBg = mostPlayedName ? getBigChampionImage(mostPlayedName) : null
  const tiersRaw = (player.champion_pools || []).reduce((acc, cp) => {
    const tier = cp.tier || 'A'
    if (TIER_KEYS.includes(tier)) {
      if (!acc[tier]) acc[tier] = []
      acc[tier].push({ id: cp.champion_id, name: cp.champion_id })
    }
    return acc
  }, {})
  const tiersForTable = Object.fromEntries(TIER_KEYS.map((k) => [k, tiersRaw[k] || []])) as { S: any[]; A: any[]; B: any[]; C: any[] }

  const realGames = matchHistory.filter((m) => (m.gameDuration ?? 0) >= REMAKE_THRESHOLD_SEC)
  const soloqWinrate =
    realGames.length > 0
      ? Math.round((realGames.filter((m) => m.win).length / realGames.length) * 100)
      : null

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={() => navigate('/team/joueurs')}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={18} />
          Retour aux joueurs
        </button>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setSelectedSoloqAccount(1)}
            className={`px-3 py-2 rounded-xl text-sm font-medium transition-all truncate max-w-[180px] ${selectedSoloqAccount === 1 ? 'bg-accent-blue text-white border border-accent-blue' : 'bg-dark-card/80 border border-dark-border text-gray-400 hover:text-white'}`}
            title={player.pseudo || 'Compte 1'}
          >
            {player.pseudo || 'Compte 1'}
          </button>
          <button
            type="button"
            onClick={() => setSelectedSoloqAccount(2)}
            className={`px-3 py-2 rounded-xl text-sm font-medium transition-all truncate max-w-[180px] ${selectedSoloqAccount === 2 ? 'bg-accent-blue text-white border border-accent-blue' : 'bg-dark-card/80 border border-dark-border text-gray-400 hover:text-white'}`}
            title={player.secondary_account || 'Compte 2'}
          >
            {player.secondary_account || 'Compte 2'}
          </button>
        </div>
      </div>

      {/* Bloc identité / liens / sync bien séparés */}
      <div
        className={`relative rounded-2xl overflow-hidden ${bigChampBg ? '' : `bg-gradient-to-r ${getRankColor(player.rank)}`}`}
        style={
          bigChampBg
            ? {
                backgroundImage: `linear-gradient(to right, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.7) 50%, transparent 100%), url(${bigChampBg})`,
                backgroundSize: 'cover',
                backgroundPosition: 'right center',
              }
            : undefined
        }
      >
        <div className="relative z-10 p-6 space-y-5">
          {/* Ligne 1 : Identité (gauche) + Liens externes (droite) */}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-5">
              <img
                src={
                  mostPlayedName
                    ? getChampionImage(mostPlayedName)
                    : 'https://ddragon.leagueoflegends.com/cdn/14.1.1/img/champion/Aatrox.png'
                }
                alt=""
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl object-cover border-2 border-white/20 shrink-0"
              />
              <div>
                <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">
                  {player.player_name || 'Joueur'}
                </h1>
                <p className="text-white/80 mt-1">{player.pseudo || '—'}</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className="px-3 py-1 bg-white/20 rounded-lg text-sm font-medium text-white">
                    {roleLabel}
                  </span>
                  {player.rank && (
                    <span className="px-3 py-1 bg-white/20 rounded-lg text-sm font-medium text-white">
                      {player.rank}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {player.opgg_link && (
                <a
                  href={player.opgg_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2.5 bg-white/10 border border-white/20 rounded-xl hover:bg-white/20 flex items-center gap-2 text-sm font-medium text-white transition-colors"
                >
                  <ExternalLink size={16} /> OP.gg
                </a>
              )}
              {dpmLink && (
                <a
                  href={dpmLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2.5 bg-white/10 border border-white/20 rounded-xl hover:bg-white/20 flex items-center gap-2 text-sm font-medium text-white transition-colors"
                >
                  <ExternalLink size={16} /> dpm.lol
                </a>
              )}
              {player.lolpro_link && (
                <a
                  href={player.lolpro_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2.5 bg-white/10 border border-white/20 rounded-xl hover:bg-white/20 flex items-center gap-2 text-sm font-medium text-white transition-colors"
                >
                  <ExternalLink size={16} /> Lol Pro
                </a>
              )}
            </div>
          </div>

          {/* Dernière MAJ rang (remontée auto ou Ranked Update page Joueurs) */}
          {player.rank_updated_at != null && (
            <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-white/10">
              <span className="text-sm text-white/80">
                Dernière MAJ rang :{' '}
                {new Date(player.rank_updated_at).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 4 cartes principales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {MAIN_CARDS.map((card) => {
          const Icon = card.icon
          const isActive = selectedCard === card.id
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => setSelectedCard(card.id)}
              className={`flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all text-left ${
                isActive
                  ? 'border-accent-blue bg-accent-blue/10 shadow-lg shadow-accent-blue/20'
                  : 'border-dark-border bg-dark-card/50 hover:border-dark-border/80 hover:bg-dark-card/70'
              }`}
            >
              <div className={`p-3 rounded-xl ${isActive ? 'bg-accent-blue/20' : 'bg-dark-bg/50'}`}>
                <Icon size={28} className={isActive ? 'text-accent-blue' : 'text-gray-400'} />
              </div>
              <span
                className={`font-display font-semibold ${isActive ? 'text-white' : 'text-gray-400'}`}
              >
                {card.label}
              </span>
            </button>
          )
        })}
      </div>

      {/* Sous-menu Solo Q */}
      {selectedCard === 'soloq' && (
        <div className="flex flex-wrap gap-2">
          {SOLOQ_SUB.map((sub) => {
            const SubIcon = sub.icon
            const isActive = selectedSoloqSub === sub.id
            return (
              <button
                key={sub.id}
                type="button"
                onClick={() => setSelectedSoloqSub(sub.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-accent-blue text-white'
                    : 'bg-dark-card/80 border border-dark-border text-gray-400 hover:text-white'
                }`}
              >
                <SubIcon size={16} />
                {sub.label}
              </button>
            )
          })}
        </div>
      )}

      {/* Sous-menu Team */}
      {selectedCard === 'team' && (
        <div className="flex flex-wrap gap-2">
          {TEAM_SUB.map((sub) => {
            const SubIcon = sub.icon
            const isActive = selectedTeamSub === sub.id
            return (
              <button
                key={sub.id}
                type="button"
                onClick={() => setSelectedTeamSub(sub.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-accent-blue text-white'
                    : 'bg-dark-card/80 border border-dark-border text-gray-400 hover:text-white'
                }`}
              >
                <SubIcon size={16} />
                {sub.label}
              </button>
            )
          })}
        </div>
      )}

      {/* Contenu selon carte + sous-menu */}
      <div className="rounded-2xl border border-dark-border bg-dark-card/30 p-6 min-h-[200px]">
        {selectedCard === 'general' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-1 h-6 rounded-full bg-cyan-400" />
              <div>
                <h3 className="font-display text-lg font-semibold text-white">
                  Rank History
                </h3>
                <p className="text-gray-500 text-sm mt-0.5">
                  {lpCurvePoints.length >= 2
                    ? `Historique du ${lpCurvePoints[0].date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })} au ${lpCurvePoints[lpCurvePoints.length - 1].date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}`
                    : 'Saison en cours'}
                </p>
              </div>
            </div>
            {lpGraphLoading ? (
              <p className="text-gray-500 text-sm">Chargement des parties…</p>
            ) : lpCurvePoints.length < 2 ? (
              <p className="text-gray-500 text-sm">
                {parseLpFromRank(player.rank) != null
                  ? 'Chargez des parties Solo Q (onglet Solo Q → Import) pour afficher la courbe des LP.'
                  : 'Rang sans LP affiché ou aucune partie. Faites une mise à jour du rang en haut de page.'}
              </p>
            ) : (
              <div className="w-full h-72 rounded-xl bg-dark-bg/80 border border-dark-border overflow-hidden">
                <LpCurveChart points={lpCurvePoints} />
              </div>
            )}
          </div>
        )}

        {selectedCard === 'soloq' && (
          <>
            {selectedSoloqSub === 'import' && (
              <div className="space-y-4">
                <p className="text-gray-500 text-sm">
                  Chargez les parties Solo Q depuis l&apos;API Riot (S16 uniquement).
                </p>
                {(totalFromRiot != null || countInDb != null) && (
                  <div className="flex flex-wrap gap-3">
                    {totalFromRiot != null && (
                      <span className="px-3 py-1.5 rounded-lg bg-dark-bg/60 text-sm">
                        <span className="text-white font-semibold">{totalFromRiot}</span>
                        <span className="text-gray-500 ml-1">parties S16</span>
                      </span>
                    )}
                    {countInDb != null && (
                      <span className="px-3 py-1.5 rounded-lg bg-accent-blue/10 text-sm border border-accent-blue/30">
                        <span className="text-accent-blue font-semibold">{countInDb}</span>
                        <span className="text-gray-400 ml-1">enregistrées</span>
                      </span>
                    )}
                    {toLoad != null && toLoad > 0 && (
                      <span className="px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 text-sm border border-amber-500/30">
                        {toLoad} à charger
                      </span>
                    )}
                  </div>
                )}
                {activeSoloqPseudo?.trim() && (
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={handleRefreshTotal}
                      disabled={refreshTotalLoading}
                      className="px-4 py-2.5 rounded-xl bg-dark-bg/60 border border-dark-border text-gray-300 text-sm font-medium disabled:opacity-50 hover:bg-dark-bg transition-colors"
                    >
                      {refreshTotalLoading ? 'Calcul…' : 'Actualiser le total'}
                    </button>
                    <div>
                      <button
                        type="button"
                        onClick={handleLoadAllFromRiot}
                        disabled={
                          loadAllFromRiotLoading ||
                          (rateLimitSeconds != null && rateLimitSeconds > 0)
                        }
                        className="px-4 py-2.5 rounded-xl bg-accent-blue/20 border border-accent-blue/50 text-accent-blue text-sm font-medium disabled:opacity-50 hover:bg-accent-blue/30 transition-colors"
                      >
                        {loadAllFromRiotLoading ? 'Chargement…' : 'Charger toutes les parties'}
                      </button>
                      {rateLimitSeconds != null && rateLimitSeconds > 0 && (
                        <p className="text-rose-400 text-sm mt-1.5 font-medium">
                          Plus de requêtes possible. Attendre{' '}
                          <span className="font-mono font-bold">{rateLimitSeconds}s</span>.
                        </p>
                      )}
                    </div>
                  </div>
                )}
                {!activeSoloqPseudo?.trim() && (
                  <p className="text-gray-500 text-sm">
                    Sélectionnez un pseudo (compte 1 ou 2) pour charger les parties.
                  </p>
                )}
              </div>
            )}

            {selectedSoloqSub === 'statistiques' && (
              <div className="space-y-6">
                {soloqWinrate != null && (
                  <p className="text-gray-400 text-sm">
                    Winrate <span className="font-semibold text-white">{soloqWinrate}%</span> sur les parties enregistrées.
                  </p>
                )}
                {soloqTopChampionsLoading ? (
                  <p className="text-gray-500 text-sm">Chargement du Top 5…</p>
                ) : soloqTopChampionsFromDb.length > 0 ? (
                  <div className="rounded-xl border border-dark-border bg-dark-bg/50 p-4">
                    <p className="text-gray-400 text-sm font-medium mb-3">Top 5 Champions</p>
                    <div className="grid grid-cols-5 gap-2 justify-items-center">
                      {soloqTopChampionsFromDb.slice(0, 5).map((champ: any, idx: number) => {
                        const name = champ.name
                        if (!name) return null
                        const wr = champ.winrate ?? 0
                        const wrColor =
                          wr >= 90 ? 'text-violet-300' : wr >= 60 ? 'text-green-400' : wr >= 40 ? 'text-orange-400' : 'text-red-700'
                        return (
                          <button
                            key={`${name}-${idx}`}
                            type="button"
                            onClick={() => openChampionModal(champ)}
                            className="flex flex-col items-center gap-1 min-w-0 w-full"
                          >
                            <span className="text-[12px] text-white font-medium">{champ.games ?? 0}</span>
                            <img
                              src={getChampionImage(name)}
                              alt={name}
                              className="w-12 h-12 rounded-lg object-cover border border-dark-border shrink-0"
                            />
                            <span className={`text-[12px] font-semibold ${wrColor}`}>{wr}%</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ) : (
                  soloqWinrate == null && (
                    <p className="text-gray-500 text-sm">
                      Chargez des parties dans Import pour voir les statistiques.
                    </p>
                  )
                )}
              </div>
            )}

            {selectedSoloqSub === 'champions' && (
              <div className="space-y-6">
                {soloqTopChampionsLoading ? (
                  <p className="text-gray-500 text-sm py-4">Chargement…</p>
                ) : soloqTopChampionsFromDb.length > 0 ? (
                  <>
                    <div>
                      <p className="text-gray-400 text-sm font-medium mb-3">
                        Top 5 des champions les plus joués
                      </p>
                      <div className="flex flex-wrap gap-3">
                        {soloqTopChampionsFromDb.map((champ, idx) => {
                          const name = champ.name
                          if (!name) return null
                          return (
                            <button
                              type="button"
                              key={`${name}-${idx}`}
                              onClick={() => openChampionModal(champ)}
                              className="flex items-center gap-3 p-3 rounded-xl bg-dark-bg/60 border border-dark-border hover:border-accent-blue/50 transition-colors text-left w-full max-w-[280px]"
                            >
                              <img
                                src={getChampionImage(name)}
                                alt={name}
                                className="w-12 h-12 rounded-lg object-cover border border-dark-border shrink-0"
                              />
                              <div className="min-w-0 flex-1">
                                <p className="font-medium text-white truncate">
                                  {getChampionDisplayName(name) || name}
                                </p>
                                <p className="text-sm text-gray-400">
                                  {champ.games} partie{champ.games > 1 ? 's' : ''} ·{' '}
                                  <span
                                    className={
                                      champ.winrate >= 50 ? 'text-emerald-400' : 'text-rose-400'
                                    }
                                  >
                                    {champ.winrate}%
                                  </span>
                                </p>
                              </div>
                              <ChevronDown className="w-5 h-5 text-gray-500 shrink-0" />
                            </button>
                          )
                        })}
                      </div>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm font-medium mb-3">
                        Tous les champions (du plus joué au moins joué)
                      </p>
                      <div className="rounded-xl border border-dark-border overflow-hidden">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-dark-bg/80 text-gray-400 text-left">
                              <th className="px-4 py-3 font-medium w-10">#</th>
                              <th className="px-4 py-3 font-medium">Champion</th>
                              <th className="px-4 py-3 font-medium text-center">Joué</th>
                              <th className="px-4 py-3 font-medium text-center">KDA</th>
                              <th className="w-10" />
                            </tr>
                          </thead>
                          <tbody>
                            {allChampionsFromDb.map((champ, idx) => {
                              const name = champ.name
                              if (!name) return null
                              return (
                                <tr
                                  key={`${name}-${idx}`}
                                  onClick={() => openChampionModal(champ)}
                                  className="border-t border-dark-border/50 hover:bg-dark-bg/60 cursor-pointer transition-colors"
                                >
                                  <td className="px-4 py-3 text-gray-500">{idx + 1}</td>
                                  <td className="px-4 py-3">
                                    <div className="flex items-center gap-3">
                                      <img
                                        src={getChampionImage(name)}
                                        alt={name}
                                        className="w-8 h-8 rounded object-cover border border-dark-border shrink-0"
                                      />
                                      <span className="font-medium text-white">
                                        {getChampionDisplayName(name) || name}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <span className="text-emerald-400 font-medium">
                                      {champ.wins}V
                                    </span>
                                    <span className="text-gray-500 mx-1">/</span>
                                    <span className="text-rose-400 font-medium">
                                      {champ.games - champ.wins}D
                                    </span>
                                    <span className="text-gray-400 ml-1">{champ.winrate}%</span>
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <span
                                      className={`font-semibold ${champ.kdaRatio >= 3 ? 'text-emerald-400' : champ.kdaRatio >= 2 ? 'text-white' : 'text-gray-400'}`}
                                    >
                                      {champ.kdaRatio}:1
                                    </span>
                                    <span className="text-gray-500 text-xs block">
                                      {champ.avgK}/{champ.avgD}/{champ.avgA}
                                    </span>
                                  </td>
                                  <td className="px-2 py-3">
                                    <ChevronDown className="w-4 h-4 text-gray-500" />
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-gray-500 text-sm py-4">
                    Aucune partie enregistrée. Chargez les parties dans Import.
                  </p>
                )}
              </div>
            )}

            {selectedSoloqSub === 'historiques' && (
              <div>
                {(totalFromRiot != null || countInDb != null) && (
                  <p className="text-gray-400 text-sm mb-3">
                    {totalFromRiot != null && (
                      <span>
                        <span className="font-semibold text-white">{totalFromRiot}</span> parties au
                        total
                      </span>
                    )}
                    {totalFromRiot != null && countInDb != null && ' · '}
                    {countInDb != null && (
                      <span>
                        <span className="font-semibold text-white">{countInDb}</span> en base
                      </span>
                    )}
                  </p>
                )}
                {matchHistoryLoading ? (
                  <p className="text-gray-500 text-sm py-6">Chargement…</p>
                ) : matchHistory.length > 0 ? (
                  <div className="space-y-2">
                    {matchHistory
                      .filter((m) => (m.gameCreation || 0) >= SEASON_16_START_MS)
                      .map((m, i) => {
                        const isRemake = (m.gameDuration ?? 0) < REMAKE_THRESHOLD_SEC
                        return (
                          <button
                            type="button"
                            key={m.matchId || i}
                            onClick={() => setGameDetailMatch(m)}
                            className="w-full flex items-center gap-4 p-3 rounded-xl bg-dark-bg/50 border border-dark-border/50 hover:border-accent-blue/50 hover:bg-dark-bg/70 transition-colors text-left"
                          >
                            <img
                              src={getChampionImage(m.championName)}
                              alt={m.championName}
                              className="w-10 h-10 rounded-lg object-cover border border-dark-border shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-white">
                                {getChampionDisplayName(m.championName) || m.championName}
                              </p>
                              <p className="text-xs text-gray-500">
                                {m.gameCreation
                                  ? new Date(m.gameCreation).toLocaleDateString('fr-FR', {
                                      day: 'numeric',
                                      month: 'short',
                                      year: 'numeric',
                                    })
                                  : '—'}
                                {m.gameDuration ? ` · ${Math.round(m.gameDuration / 60)} min` : ''}
                              </p>
                            </div>
                            <div className="text-center shrink-0">
                              <p className="text-sm font-mono text-white">
                                {m.kills}/{m.deaths}/{m.assists}
                              </p>
                              <p className="text-xs text-gray-500">K/D/A</p>
                            </div>
                            {isRemake ? (
                              <span className="px-3 py-1 rounded-lg text-sm font-semibold shrink-0 bg-gray-500/20 text-gray-400 border border-gray-500/40">
                                Remake
                              </span>
                            ) : (
                              <span
                                className={`px-3 py-1 rounded-lg text-sm font-semibold shrink-0 ${m.win ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'}`}
                              >
                                {m.win ? 'Victoire' : 'Défaite'}
                              </span>
                            )}
                          </button>
                        )
                      })}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">
                    Aucune partie enregistrée. Chargez les parties dans Import.
                  </p>
                )}
                {matchHistory.length > 0 && matchHistoryHasMore && (
                  <div className="mt-6">
                    <button
                      type="button"
                      onClick={() =>
                        loadMatchHistoryFromSupabase(matchHistory.length, PAGE_SIZE, true)
                      }
                      disabled={matchHistoryLoadMoreLoading}
                      className="px-4 py-2.5 rounded-xl bg-dark-border/80 hover:bg-dark-border text-white text-sm font-medium disabled:opacity-50"
                    >
                      {matchHistoryLoadMoreLoading ? 'Chargement…' : 'Charger plus (20 parties)'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {selectedCard === 'team' && (
          <>
            {/* ── Statistiques : Forme récente + Général | Timeline ── */}
            {selectedTeamSub === 'statistiques' && (
              <div className="space-y-6">
                {/* Forme récente : 5 derniers matchs team */}
                {!teamStatsLoading && (teamStats?.length ?? 0) > 0 && (
                  <div className="rounded-xl border border-dark-border bg-dark-bg/50 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-gray-400 text-sm font-medium">Forme récente (Team)</p>
                      <button
                        type="button"
                        onClick={() => setSelectedTeamSub('historiques')}
                        className="text-accent-blue text-sm font-medium hover:underline"
                      >
                        Voir l&apos;historique
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(teamStats ?? [])
                        .slice(0, 5)
                        .map((s: any, i: number) => {
                          const m = s.team_matches
                          const win = s.win ?? m?.our_win
                          const k = s.kills ?? 0
                          const d = s.deaths ?? 0
                          const a = s.assists ?? 0
                          const kda = d > 0 ? ((k + a) / d).toFixed(1) : (k + a).toFixed(1)
                          return (
                            <div
                              key={s.id || i}
                              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-dark-card/80 border border-dark-border/60"
                            >
                              <img
                                src={getChampionImage(s.champion_name)}
                                alt=""
                                className="w-8 h-8 rounded object-cover border border-dark-border shrink-0"
                              />
                              <span
                                className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold ${
                                  win ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                                }`}
                              >
                                {win ? 'V' : 'D'}
                              </span>
                              <span className="text-xs text-gray-400 font-mono">KDA {kda}</span>
                            </div>
                          )
                        })}
                    </div>
                  </div>
                )}
                <div className="flex gap-2 border-b border-dark-border pb-4">
                  {(
                    [
                      { id: 'general', label: 'Général', icon: BarChart3 },
                      { id: 'timeline', label: 'Timeline', icon: TrendingUp },
                    ] as const
                  ).map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setTeamStatsSubSub(id)}
                      className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        teamStatsSubSub === id
                          ? 'bg-accent-blue/20 text-accent-blue border border-accent-blue/40'
                          : 'text-gray-400 hover:text-white hover:bg-dark-bg/60'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {label}
                    </button>
                  ))}
                </div>
                {teamStatsSubSub === 'general' && (
              <PlayerTeamStatsSection playerId={playerId} mode="stats" />
            )}
                {teamStatsSubSub === 'timeline' && (
                  <PlayerTimelineAdvantageSection
                    playerId={playerId}
                    matches={allTeamMatches}
                    timelines={allTeamTimelines}
                  />
                )}
              </div>
            )}

            {/* ── Champions : Général | Détaillé ── */}
            {selectedTeamSub === 'champions' && (
              <div>
                <div className="flex gap-2 mb-5 border-b border-dark-border pb-4">
                  {(
                    [
                      { id: 'general', label: 'Général' },
                      { id: 'detaille', label: 'Détaillé' },
                    ] as const
                  ).map(({ id, label }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => {
                        setTeamChampSubSub(id)
                        setExpandedTeamChampion(null)
                      }}
                      className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        teamChampSubSub === id
                          ? 'bg-accent-blue/20 text-accent-blue border border-accent-blue/40'
                          : 'text-gray-400 hover:text-white hover:bg-dark-bg/60'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {teamStatsLoading ? (
                  <p className="text-gray-500 text-sm py-4">Chargement…</p>
                ) : championStatsFromTeam.length === 0 ? (
                  <p className="text-gray-500 text-sm">
                    Aucune donnée. Ajoutez des parties depuis Matchs.
                  </p>
                ) : teamChampSubSub === 'general' ? (
                  /* ── Général : liste ordonnée, tous les champions ── */
                  <div className="rounded-xl border border-dark-border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-dark-bg/80 text-gray-400 text-left">
                          <th className="px-4 py-3 font-medium w-10">#</th>
                          <th className="px-4 py-3 font-medium">Champion</th>
                          <th className="px-4 py-3 font-medium text-center">Parties</th>
                          <th className="px-4 py-3 font-medium text-center">Winrate</th>
                        </tr>
                      </thead>
                      <tbody>
                        {championStatsFromTeam.map((c, idx) => (
                          <tr key={c.name} className="border-t border-dark-border/50">
                            <td className="px-4 py-3 text-gray-500">{idx + 1}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <img
                                  src={getChampionImage(c.name)}
                                  alt={c.name}
                                  className="w-8 h-8 rounded object-cover border border-dark-border shrink-0"
                                />
                                <span className="font-medium text-white">
                                  {getChampionDisplayName(c.name) || c.name}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="text-emerald-400">{c.wins}V</span>
                              <span className="text-gray-500 mx-1">/</span>
                              <span className="text-rose-400">{c.losses}D</span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span
                                className={
                                  c.winrate >= 50
                                    ? 'text-emerald-400 font-semibold'
                                    : 'text-rose-400 font-semibold'
                                }
                              >
                                {c.winrate}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  /* ── Détaillé : accordion avec stats moy + games ── */
                  <div className="space-y-2">
                    {championStatsFromTeam.map((c) => {
                      const isOpen = expandedTeamChampion === c.name
                      return (
                        <div
                          key={c.name}
                          className="rounded-xl border border-dark-border overflow-hidden"
                        >
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedTeamChampion(isOpen ? null : c.name)
                            }
                            className="w-full flex items-center gap-3 p-4 bg-dark-bg/50 hover:bg-dark-bg/80 transition-colors text-left"
                          >
                            <img
                              src={getChampionImage(c.name)}
                              alt={c.name}
                              className="w-10 h-10 rounded-lg object-cover border border-dark-border shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-white">
                                {getChampionDisplayName(c.name) || c.name}
                              </p>
                              <p className="text-sm text-gray-400">
                                {c.games} partie{c.games > 1 ? 's' : ''} ·{' '}
                                <span
                                  className={
                                    c.winrate >= 50 ? 'text-emerald-400' : 'text-rose-400'
                                  }
                                >
                                  {c.winrate}%
                                </span>
                                {' · '}KDA{' '}
                                <span
                                  className={
                                    c.kdaRatio >= 3
                                      ? 'text-emerald-400'
                                      : c.kdaRatio >= 2
                                        ? 'text-white'
                                        : 'text-gray-400'
                                  }
                                >
                                  {c.kdaRatio}
                                </span>
                              </p>
                            </div>
                            <div className="text-right shrink-0 text-sm text-gray-400 hidden sm:block">
                              <p className="font-mono">
                                {c.avgK}/{c.avgD}/{c.avgA}
                              </p>
                              <p className="text-xs text-gray-500">Moy. K/D/A</p>
                            </div>
                            <ChevronDown
                              className={`w-5 h-5 text-gray-500 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                            />
                          </button>

                          {isOpen && (
                            <div className="border-t border-dark-border">
                              {/* Stats moyennes du champion */}
                              <div className="grid grid-cols-3 gap-px bg-dark-border">
                                <div className="bg-dark-bg/80 p-3 text-center">
                                  <p className="text-xs text-gray-500 mb-0.5">Winrate</p>
                                  <p
                                    className={`font-semibold ${c.winrate >= 50 ? 'text-emerald-400' : 'text-rose-400'}`}
                                  >
                                    {c.winrate}%
                                  </p>
                                </div>
                                <div className="bg-dark-bg/80 p-3 text-center">
                                  <p className="text-xs text-gray-500 mb-0.5">KDA ratio</p>
                                  <p
                                    className={`font-semibold ${c.kdaRatio >= 3 ? 'text-emerald-400' : c.kdaRatio >= 2 ? 'text-white' : 'text-gray-400'}`}
                                  >
                                    {c.kdaRatio}
                                  </p>
                                </div>
                                <div className="bg-dark-bg/80 p-3 text-center">
                                  <p className="text-xs text-gray-500 mb-0.5">Moy. K/D/A</p>
                                  <p className="font-mono text-white text-sm">
                                    {c.avgK}/{c.avgD}/{c.avgA}
                                  </p>
                                </div>
                              </div>
                              {/* Liste des games */}
                              <div className="divide-y divide-dark-border/50">
                                {c.matchEntries.map((s: any, i: number) => {
                                  const m = s.team_matches
                                  return (
                                    <Link
                                      key={s.id || i}
                                      to={`/team/matchs/${s.match_id}`}
                                      state={{ fromPlayer: playerId }}
                                      className="flex items-center gap-3 px-4 py-3 hover:bg-dark-bg/60 transition-colors"
                                    >
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm text-gray-300">
                                          {m?.created_at
                                            ? new Date(m.created_at).toLocaleDateString('fr-FR', {
                                                day: 'numeric',
                                                month: 'short',
                                                year: 'numeric',
                                              })
                                            : '—'}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                          {m?.game_duration
                                            ? `${Math.round(m.game_duration / 60)} min`
                                            : ''}
                                        </p>
                                      </div>
                                      <p className="font-mono text-sm text-white shrink-0">
                                        {s.kills}/{s.deaths}/{s.assists}
                                      </p>
                                      <span
                                        className={`px-2 py-1 rounded-lg text-xs font-semibold shrink-0 ${m?.our_win ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'}`}
                                      >
                                        {m?.our_win ? 'V' : 'D'}
                                      </span>
                                    </Link>
                                  )
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── Historiques ── */}
            {selectedTeamSub === 'historiques' && (
              <div>
                {teamStatsLoading ? (
                  <p className="text-gray-500 text-sm py-6">Chargement...</p>
                ) : teamStats.length > 0 ? (
                  <div className="space-y-3">
                    {teamStats.map((s, i) => {
                      const m = s.team_matches
                      return (
                        <Link
                          key={s.id || i}
                          to={`/team/matchs/${s.match_id}`}
                          state={{ fromPlayer: playerId }}
                          className="block flex flex-wrap items-center gap-4 p-4 rounded-xl bg-dark-bg/50 border border-dark-border hover:border-accent-blue/50 hover:bg-dark-bg/70 transition-colors"
                        >
                          <img
                            src={getChampionImage(s.champion_name)}
                            alt={s.champion_name}
                            className="w-12 h-12 rounded-lg object-cover border border-dark-border shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-white">
                              {getChampionDisplayName(s.champion_name) || s.champion_name}
                            </p>
                            <p className="text-sm text-gray-500">
                              {m?.game_duration ? `${Math.round(m.game_duration / 60)} min` : '—'}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-4 text-sm">
                            <div className="text-center">
                              <p className="text-gray-500 text-xs">K/D/A</p>
                              <p className="font-mono text-white">
                                {s.kills}/{s.deaths}/{s.assists}
                              </p>
                            </div>
                            <div className="text-center">
                              <p className="text-gray-500 text-xs">KDA</p>
                              <p className="text-white">{s.kda ?? '—'}</p>
                            </div>
                            <div className="text-center hidden sm:block">
                              <p className="text-gray-500 text-xs">DMG</p>
                              <p className="text-white">
                                {s.total_damage_dealt_to_champions?.toLocaleString() ?? '—'}
                              </p>
                            </div>
                            <div className="text-center hidden sm:block">
                              <p className="text-gray-500 text-xs">Gold</p>
                              <p className="text-amber-400">
                                {s.gold_earned?.toLocaleString() ?? '—'}
                              </p>
                            </div>
                            <div className="text-center">
                              <p className="text-gray-500 text-xs">Vision</p>
                              <p className="text-violet-400">{s.vision_score ?? '—'}</p>
                            </div>
                          </div>
                          <span
                            className={`px-3 py-1.5 rounded-lg text-sm font-semibold shrink-0 ${m?.our_win ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'}`}
                          >
                            {m?.our_win ? 'Victoire' : 'Défaite'}
                          </span>
                        </Link>
                      )
                    })}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dark-border bg-dark-card/50 p-8 text-center">
                    <p className="text-gray-500 text-sm">
                      Aucune donnée en équipe. Ajoutez des parties depuis <strong>Matchs</strong>.
                    </p>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {selectedCard === 'pool-champ' && (
          <div className="space-y-4">
            <p className="text-gray-400 text-sm">
              Pool et tier list pour <span className="text-white font-medium">{roleLabel}</span>. Classez vos champions par niveau de priorité (S, A, B, C).
            </p>
            <TierTable tiers={tiersForTable} activeTier={null} />
            {TIER_KEYS.every((k) => !(tiersForTable[k] || []).length) && (
              <p className="text-gray-500 text-sm mt-4">
                Aucun champion dans le pool. Rendez-vous dans Pool de Champions pour en ajouter.
              </p>
            )}
          </div>
        )}

        {/* Modal Champion : parties avec ce champion (match-ups) */}
        {championModalChampion && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
            onClick={closeChampionModal}
          >
            <div
              className="bg-dark-card border border-dark-border rounded-2xl shadow-xl max-w-2xl w-full max-h-[85vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b border-dark-border">
                <div className="flex items-center gap-3">
                  <img
                    src={getChampionImage(championModalChampion)}
                    alt={championModalChampion}
                    className="w-10 h-10 rounded-lg object-cover border border-dark-border"
                  />
                  <h3 className="text-lg font-semibold text-white">
                    {getChampionDisplayName(championModalChampion) || championModalChampion} —
                    Parties
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={closeChampionModal}
                  className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-dark-bg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="overflow-y-auto p-4">
                {championModalMatchesLoading ? (
                  <p className="text-gray-500 text-sm py-6">Chargement…</p>
                ) : championModalMatches.length === 0 ? (
                  <p className="text-gray-500 text-sm py-4">Aucune partie.</p>
                ) : (
                  <div className="space-y-2">
                    {championModalMatches.map((m, i) => (
                      <div
                        key={m.matchId || i}
                        className="w-full flex items-center gap-4 p-3 rounded-xl bg-dark-bg/50 border border-dark-border/50 transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-gray-500">
                            {m.gameCreation
                              ? new Date(m.gameCreation).toLocaleDateString('fr-FR', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                })
                              : '—'}
                            {m.gameDuration ? ` · ${Math.round(m.gameDuration / 60)} min` : ''}
                          </p>
                          {m.opponentChampionName && (
                            <p className="text-xs text-gray-400 mt-0.5">
                              vs{' '}
                              {getChampionDisplayName(m.opponentChampionName) ||
                                m.opponentChampionName}
                            </p>
                          )}
                        </div>
                        <p className="text-sm font-mono text-white shrink-0">
                          {m.kills}/{m.deaths}/{m.assists}
                        </p>
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold shrink-0 ${m.win ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}
                        >
                          {m.win ? 'V' : 'D'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modal détail Solo Q : uniquement Résumé + Stats globales (pas de timeline, pas de corriger les rôles) */}
        {gameDetailMatch && (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70"
            onClick={() => setGameDetailMatch(null)}
          >
            <div
              className="bg-dark-card border border-dark-border rounded-2xl shadow-xl max-w-md w-full p-5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
                  Partie Solo Q
                </h2>
                <button
                  type="button"
                  onClick={() => setGameDetailMatch(null)}
                  className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-dark-bg transition-colors"
                  aria-label="Fermer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              {/* Résumé */}
              <div className="mb-4">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                  Résumé
                </p>
                <div className="flex items-center gap-3">
                  <img
                    src={getChampionImage(gameDetailMatch.championName)}
                    alt=""
                    className="w-12 h-12 rounded-lg object-cover border border-dark-border"
                  />
                  <div>
                    <h3 className="font-semibold text-white">
                      {getChampionDisplayName(gameDetailMatch.championName) ||
                        gameDetailMatch.championName}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {gameDetailMatch.gameCreation
                        ? new Date(gameDetailMatch.gameCreation).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '—'}
                    </p>
                    {gameDetailMatch.opponentChampionName && (
                      <p className="text-sm text-gray-400 mt-0.5">
                        vs{' '}
                        <span className="text-white font-medium">
                          {getChampionDisplayName(gameDetailMatch.opponentChampionName) ||
                            gameDetailMatch.opponentChampionName}
                        </span>
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-3 mt-3">
                  <div className="flex-1 p-3 rounded-xl bg-dark-bg/50">
                    <p className="text-gray-500 text-xs">Résultat</p>
                    <p
                      className={
                        gameDetailMatch.win
                          ? 'text-emerald-400 font-semibold'
                          : 'text-rose-400 font-semibold'
                      }
                    >
                      {gameDetailMatch.win ? 'Victoire' : 'Défaite'}
                    </p>
                  </div>
                  <div className="flex-1 p-3 rounded-xl bg-dark-bg/50">
                    <p className="text-gray-500 text-xs">Durée</p>
                    <p className="text-white">
                      {gameDetailMatch.gameDuration
                        ? `${Math.round(gameDetailMatch.gameDuration / 60)} min`
                        : '—'}
                    </p>
                  </div>
                </div>
              </div>
              {/* Stats globales */}
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                  Stats globales
                </p>
                <div className="p-3 rounded-xl bg-dark-bg/50">
                  <p className="text-gray-500 text-xs">K/D/A</p>
                  <p className="font-mono text-white text-lg">
                    {gameDetailMatch.kills}/{gameDetailMatch.deaths}/{gameDetailMatch.assists}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
