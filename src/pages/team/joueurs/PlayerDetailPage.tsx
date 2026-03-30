/**
 * Page détail joueur — 4 cartes : Général | Solo Q | Team | Pool Champ
 * Toute la logique est dans usePlayerDetail.
 */
import { useState, useMemo, useEffect, Fragment } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { createPortal } from 'react-dom'
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
  ChevronDown,
  TrendingUp,
  X,
  LayoutList,
  Target,
  Clock,
  FileText,
} from 'lucide-react'
import {
  getChampionImage,
  getBigChampionImage,
  getChampionDisplayName,
} from '../../../lib/championImages'
import { TIER_KEYS } from '../champion-pool/constants/tiers'
import { TierTable } from '../champion-pool/components/TierTable'
import { PlayerTimelineAdvantageSection } from './components/PlayerTimelineAdvantageSection'
import { CoachCard } from './components/CoachCard'
import { usePlayerDetail } from './hooks/usePlayerDetail'
import { getRankColor, getRankImage, getRankColorText, parseLpFromRank, generateDpmLink, ROLE_LABELS } from './utils/playerDetailHelpers'
import { SEASON_16_START_MS, REMAKE_THRESHOLD_SEC, PAGE_SIZE } from '../../../lib/constants'
import { RuneIcon, RunesRow, ItemImg } from './components/BuildsRunesSection'
import { TeamStatistiquesSection } from './components/TeamStatistiquesSection'
import { loadItems } from '../../../lib/items'
import { SoloqStatistiquesSection } from './components/SoloqStatistiquesSection'
import { fetchNotes, fetchObjectives } from '../../../services/supabase/coachingQueries'

const MAIN_CARDS = [
  { id: 'general', label: 'Général', icon: User },
  { id: 'soloq', label: 'Solo Q', icon: Swords },
  { id: 'team', label: 'Team', icon: Users },
  { id: 'pool-champ', label: 'Pool Champ', icon: Trophy },
  { id: 'coach', label: 'Coach', icon: Target },
]

const SOLOQ_SUB = [
  { id: 'statistiques', label: 'Statistiques', icon: BarChart3 },
  { id: 'champions', label: 'Champions', icon: Sparkles },
  { id: 'historiques', label: 'Historiques', icon: History },
]


const TEAM_SUB = [
  { id: 'statistiques', label: 'Statistiques', icon: BarChart3 },
  { id: 'champions', label: 'Champions', icon: Sparkles },
  { id: 'historiques', label: 'Historiques', icon: History },
]

// ─── Accordion champions Solo Q ────────────────────────────────────────────────
function SoloqChampionsAccordion({
  championsFromDb, lpGraphMatches, runesCache, loading, playerId,
}: {
  championsFromDb: any[]
  lpGraphMatches: any[]
  runesCache: Array<{ id: number; name: string; icon: string }>
  loading: boolean
  playerId: string | undefined
}) {
  const [expanded, setExpanded] = useState<string | null>(null)
  // limits[champName] = nb de parties à afficher (défaut 5)
  const [limits, setLimits] = useState<Record<string, number>>({})

  useEffect(() => { loadItems() }, [])

  const getGameRunes = (m: any) => {
    const runesData = m.runes ?? (m.match_json as any)?.perks ?? null
    const primary = runesData?.styles?.find((s: any) => s.description === 'primaryStyle')
    const sub = runesData?.styles?.find((s: any) => s.description === 'subStyle')
    return {
      ks: primary?.selections?.[0]?.perk ?? 0,
      p1: primary?.selections?.[1]?.perk ?? 0,
      p2: primary?.selections?.[2]?.perk ?? 0,
      p3: primary?.selections?.[3]?.perk ?? 0,
      s1: sub?.selections?.[0]?.perk ?? 0,
      s2: sub?.selections?.[1]?.perk ?? 0,
    }
  }
  const getGameItems = (m: any): number[] => {
    if (m.items) return (m.items as number[]).filter((id: number) => id > 0)
    const mj = m.match_json as any
    if (!mj) return []
    return [mj.item0, mj.item1, mj.item2, mj.item3, mj.item4, mj.item5, mj.item6].filter((id: number) => id > 0)
  }

  const buildData = useMemo(() => {
    const realGames = lpGraphMatches.filter((m: any) => (m.game_duration ?? 0) >= 180)
    type C = { runeCombos: Map<string, number>; itemFreq: Map<number, number>; games: any[] }
    const map = new Map<string, C>()
    for (const m of realGames) {
      const champ = m.champion_name
      if (!champ) continue
      const r = getGameRunes(m)
      const entry = map.get(champ) ?? { runeCombos: new Map(), itemFreq: new Map(), games: [] }
      if (r.ks) {
        const key = [r.ks, r.p1, r.p2, r.p3, r.s1, r.s2].join(',')
        entry.runeCombos.set(key, (entry.runeCombos.get(key) ?? 0) + 1)
      }
      for (const id of getGameItems(m)) entry.itemFreq.set(id, (entry.itemFreq.get(id) ?? 0) + 1)
      entry.games.push(m)
      map.set(champ, entry)
    }
    const result: Record<string, { ks: number; p1: number; p2: number; p3: number; s1: number; s2: number; topItems: number[]; games: any[] }> = {}
    for (const [name, v] of map.entries()) {
      const [bestRune] = [...v.runeCombos.entries()].sort((a, b) => b[1] - a[1])
      const [ks, p1, p2, p3, s1, s2] = (bestRune?.[0] ?? '').split(',').map(Number)
      const topItems = [...v.itemFreq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([id]) => id)
      result[name] = { ks, p1, p2, p3, s1, s2, topItems, games: [...v.games].sort((a, b) => (b.game_creation ?? 0) - (a.game_creation ?? 0)) }
    }
    return result
  }, [lpGraphMatches])

  if (loading) return <p className="text-gray-500 text-sm py-4">Chargement…</p>
  if (championsFromDb.length === 0)
    return <p className="text-gray-500 text-sm py-4">Aucune partie enregistrée. Chargez les parties dans Import.</p>

  return (
    <div className="rounded-xl border border-dark-border overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-dark-bg/80 text-gray-400 text-left">
            <th className="px-4 py-3 font-medium">Champion</th>
            <th className="px-3 py-3 font-medium text-center">Parties</th>
            <th className="px-3 py-3 font-medium text-center">Winrate</th>
            <th className="px-3 py-3 font-medium text-center">KDA</th>
            <th className="px-3 py-3 font-medium text-center hidden sm:table-cell">Moy.</th>
            <th className="px-3 py-3 w-8" />
          </tr>
        </thead>
        <tbody>
          {championsFromDb.map((champ: any) => {
            const name = champ.name
            const wr = champ.winrate ?? 0
            const isExpanded = expanded === name
            const build = buildData[name]
            const champGames = build?.games ?? []
            const limit = limits[name] ?? 5
            const hasMore = champGames.length > limit

            return (
              <Fragment key={name}>
                <tr
                  className="border-t border-dark-border/50 cursor-pointer hover:bg-dark-bg/40 transition-colors"
                  onClick={() => setExpanded(isExpanded ? null : name)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <img src={getChampionImage(name)} alt={name} className="w-9 h-9 rounded-lg object-cover border border-dark-border shrink-0" />
                      <span className="font-medium text-white">{getChampionDisplayName(name) || name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-center text-gray-300">{champ.games}</td>
                  <td className="px-3 py-3 text-center">
                    <span className={`font-semibold ${wr >= 50 ? 'text-emerald-400' : 'text-rose-400'}`}>{wr}%</span>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span className={champ.kdaRatio >= 3 ? 'text-emerald-400' : champ.kdaRatio >= 2 ? 'text-white' : 'text-gray-400'}>{champ.kdaRatio}</span>
                  </td>
                  <td className="px-3 py-3 text-center hidden sm:table-cell">
                    <span className="font-mono text-gray-300">{champ.avgK}/{champ.avgD}/{champ.avgA}</span>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <ChevronDown className={`w-4 h-4 text-gray-500 inline transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </td>
                </tr>
                {isExpanded && (
                  <tr key={`${name}-exp`} className="border-t border-dark-border/30">
                    <td colSpan={6} className="p-0">
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        transition={{ duration: 0.18 }}
                        className="overflow-hidden bg-dark-bg/30"
                      >
                        <div className="px-4 py-4 space-y-4">
                          {/* Résumé runes + items fréquents */}
                          {build && (build.ks || build.topItems.length > 0) && (
                            <div className="flex flex-wrap items-start gap-5">
                              {build.ks ? (
                                <div className="flex flex-col gap-1.5">
                                  <p className="text-xs text-gray-500 uppercase tracking-wider">Runes fréquentes</p>
                                  <RunesRow ks={build.ks} p1={build.p1} p2={build.p2} p3={build.p3} s1={build.s1} s2={build.s2} runesCache={runesCache} />
                                </div>
                              ) : null}
                              {build.topItems.length > 0 && (
                                <div className="flex flex-col gap-1.5">
                                  <p className="text-xs text-gray-500 uppercase tracking-wider">Items fréquents</p>
                                  <div className="flex items-center gap-1">
                                    {build.topItems.map((id, i) => <ItemImg key={`${id}-${i}`} id={id} />)}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Historique par partie */}
                          {champGames.length > 0 && (
                            <div>
                              <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Historique</p>
                              <div className="rounded-xl border border-dark-border/40 overflow-hidden divide-y divide-dark-border/30">
                                {champGames.slice(0, limit).map((g: any, i: number) => {
                                  const win = g.win
                                  const date = g.game_creation
                                    ? new Date(g.game_creation).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
                                    : null
                                  const dur = g.game_duration ? `${Math.round(g.game_duration / 60)} min` : null
                                  const opp = g.opponent_champion
                                  const gr = getGameRunes(g)
                                  const gi = getGameItems(g)
                                  const href = g.riot_match_id && playerId
                                    ? `/team/joueurs/${encodeURIComponent(playerId!)}/soloq/${g.riot_match_id}`
                                    : null
                                  const rowCls = `flex flex-col gap-1.5 px-4 py-2.5 text-sm transition-colors ${win ? 'bg-emerald-950/30 hover:bg-emerald-900/20' : 'bg-rose-950/20 hover:bg-rose-900/15'} ${href ? 'cursor-pointer' : ''}`
                                  const inner = (
                                    <>
                                      {/* Ligne 1 : V/D — opponent — KDA — date/durée */}
                                      <div className="flex items-center gap-2.5">
                                        <span className={`shrink-0 px-2 py-0.5 rounded-md text-xs font-bold ${win ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'}`}>
                                          {win ? 'V' : 'D'}
                                        </span>
                                        <div className="w-7 h-7 shrink-0 flex items-center justify-center">
                                          {opp
                                            ? <img src={getChampionImage(opp)} alt={opp} title={getChampionDisplayName(opp) || opp} className="w-7 h-7 rounded-md object-cover border border-dark-border/60" />
                                            : <div className="w-7 h-7 rounded-md bg-dark-border/20" />}
                                        </div>
                                        <span className="font-mono font-semibold text-white text-xs shrink-0">{g.kills}/{g.deaths}/{g.assists}</span>
                                        <span className="text-gray-500 text-xs shrink-0 tabular-nums">{date}</span>
                                        {dur && <span className="text-gray-600 text-xs shrink-0">· {dur}</span>}
                                      </div>
                                      {/* Ligne 2 : keystone + 6 slots items (positions fixes) */}
                                      <div className="flex items-center gap-0.5">
                                        {gr.ks ? <RuneIcon id={gr.ks} runesCache={runesCache} size="sm" /> : <div className="w-6 h-6 shrink-0" />}
                                        <div className="w-1.5 shrink-0" />
                                        {[0,1,2,3,4,5].map((idx) => {
                                          const id = gi[idx]
                                          return id
                                            ? <ItemImg key={`${id}-${idx}`} id={id} size="sm" />
                                            : <div key={idx} className="w-6 h-6 shrink-0 rounded bg-dark-border/20" />
                                        })}
                                      </div>
                                    </>
                                  )
                                  return href
                                    ? <Link key={i} to={href} className={rowCls}>{inner}</Link>
                                    : <div key={i} className={rowCls}>{inner}</div>
                                })}
                              </div>
                              {hasMore && (
                                <button
                                  type="button"
                                  className="mt-2 w-full py-2 text-xs text-accent-blue hover:opacity-80 transition-opacity"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setLimits((prev) => ({ ...prev, [name]: (prev[name] ?? 5) + 10 }))
                                  }}
                                >
                                  Voir plus ({Math.min(champGames.length - limit, 10)} parties supplémentaires)
                                </button>
                              )}
                            </div>
                          )}

                          {!build && (
                            <p className="text-xs text-gray-500 italic">Données de build non disponibles. Importez les parties avec le backend Riot.</p>
                          )}
                        </div>
                      </motion.div>
                    </td>
                  </tr>
                )}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ─── Accordion champions Team ────────────────────────────────────────────────
function TeamChampionsAccordion({
  championStats, runesCache, loading, playerId, allTeamMatches,
}: {
  championStats: any[]
  runesCache: Array<{ id: number; name: string; icon: string }>
  loading: boolean
  playerId: string | undefined
  allTeamMatches: any[]
}) {
  const [expanded, setExpanded] = useState<string | null>(null)
  const [limits, setLimits] = useState<Record<string, number>>({})

  useEffect(() => { loadItems() }, [])

  const buildData = useMemo(() => {
    const result: Record<string, { ks: number; p1: number; p2: number; p3: number; s1: number; s2: number; topItems: number[] }> = {}
    for (const champ of championStats) {
      const runeCombos = new Map<string, number>()
      const itemFreq = new Map<number, number>()
      for (const s of champ.matchEntries || []) {
        const ks = Number(s.perk0)
        if (ks) {
          const key = [ks, Number(s.perk1), Number(s.perk2), Number(s.perk3), Number(s.perk4), Number(s.perk5)].join(',')
          runeCombos.set(key, (runeCombos.get(key) ?? 0) + 1)
        }
        for (const id of [s.item0, s.item1, s.item2, s.item3, s.item4, s.item5].filter((id: number) => id > 0))
          itemFreq.set(id, (itemFreq.get(id) ?? 0) + 1)
      }
      const [bestRune] = [...runeCombos.entries()].sort((a, b) => b[1] - a[1])
      const [ks, p1, p2, p3, s1, s2] = (bestRune?.[0] ?? '').split(',').map(Number)
      const topItems = [...itemFreq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([id]) => id)
      result[champ.name] = { ks, p1, p2, p3, s1, s2, topItems }
    }
    return result
  }, [championStats])

  if (loading) return <p className="text-gray-500 text-sm py-4">Chargement…</p>
  if (championStats.length === 0)
    return <p className="text-gray-500 text-sm py-4">Aucune donnée. Ajoutez des parties depuis Matchs.</p>

  return (
    <div className="rounded-xl border border-dark-border overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-dark-bg/80 text-gray-400 text-left">
            <th className="px-4 py-3 font-medium">Champion</th>
            <th className="px-3 py-3 font-medium text-center">Parties</th>
            <th className="px-3 py-3 font-medium text-center">Winrate</th>
            <th className="px-3 py-3 font-medium text-center">KDA</th>
            <th className="px-3 py-3 font-medium text-center hidden sm:table-cell">Moy.</th>
            <th className="px-3 py-3 w-8" />
          </tr>
        </thead>
        <tbody>
          {championStats.map((champ: any) => {
            const name = champ.name
            const wr = champ.winrate ?? 0
            const isExpanded = expanded === name
            const build = buildData[name]
            const games = [...(champ.matchEntries || [])].sort((a: any, b: any) =>
              (b.team_matches?.game_creation ?? 0) - (a.team_matches?.game_creation ?? 0)
            )
            const limit = limits[name] ?? 5
            const hasMore = games.length > limit
            return (
              <Fragment key={name}>
                <tr
                  className="border-t border-dark-border/50 cursor-pointer hover:bg-dark-bg/40 transition-colors"
                  onClick={() => setExpanded(isExpanded ? null : name)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <img src={getChampionImage(name)} alt={name} className="w-9 h-9 rounded-lg object-cover border border-dark-border shrink-0" />
                      <span className="font-medium text-white">{getChampionDisplayName(name) || name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-center text-gray-300">{champ.games}</td>
                  <td className="px-3 py-3 text-center">
                    <span className={`font-semibold ${wr >= 50 ? 'text-emerald-400' : 'text-rose-400'}`}>{wr}%</span>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span className={champ.kdaRatio >= 3 ? 'text-emerald-400' : champ.kdaRatio >= 2 ? 'text-white' : 'text-gray-400'}>{champ.kdaRatio}</span>
                  </td>
                  <td className="px-3 py-3 text-center hidden sm:table-cell">
                    <span className="font-mono text-gray-300">{champ.avgK}/{champ.avgD}/{champ.avgA}</span>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <ChevronDown className={`w-4 h-4 text-gray-500 inline transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </td>
                </tr>
                {isExpanded && (
                  <tr key={`${name}-exp`} className="border-t border-dark-border/30">
                    <td colSpan={6} className="p-0">
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        transition={{ duration: 0.18 }}
                        className="overflow-hidden bg-dark-bg/30"
                      >
                        <div className="px-4 py-4 space-y-4">
                          {build && (build.ks || build.topItems.length > 0) && (
                            <div className="flex flex-wrap items-start gap-5">
                              {build.ks ? (
                                <div className="flex flex-col gap-1.5">
                                  <p className="text-xs text-gray-500 uppercase tracking-wider">Runes fréquentes</p>
                                  <RunesRow ks={build.ks} p1={build.p1} p2={build.p2} p3={build.p3} s1={build.s1} s2={build.s2} runesCache={runesCache} />
                                </div>
                              ) : null}
                              {build.topItems.length > 0 && (
                                <div className="flex flex-col gap-1.5">
                                  <p className="text-xs text-gray-500 uppercase tracking-wider">Items fréquents</p>
                                  <div className="flex items-center gap-1">
                                    {build.topItems.map((id, i) => <ItemImg key={`${id}-${i}`} id={id} />)}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                          {games.length > 0 && (
                            <div>
                              <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Historique</p>
                              <div className="rounded-xl border border-dark-border/40 overflow-hidden divide-y divide-dark-border/30">
                                {games.slice(0, limit).map((s: any, i: number) => {
                                  const m = s.team_matches
                                  const win = !!m?.our_win
                                  const date = m?.game_creation
                                    ? new Date(m.game_creation).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
                                    : null
                                  const dur = m?.game_duration ? `${Math.round(m.game_duration / 60)} min` : null
                                  const ks = Number(s.perk0)
                                  const gr = { ks, p1: Number(s.perk1), p2: Number(s.perk2), p3: Number(s.perk3), s1: Number(s.perk4), s2: Number(s.perk5) }
                                  const gi = [s.item0, s.item1, s.item2, s.item3, s.item4, s.item5].filter((id: number) => id > 0)
                                  // Opposant : cherche dans les participants ennemis du match
                                  const fullMatch = (allTeamMatches ?? []).find((m: any) => m.id === s.match_id)
                                  const enemyParts = (fullMatch?.team_match_participants ?? []).filter((p: any) => p.team_side !== 'our')
                                  const playerRole = s.role || s.position || null
                                  const oppPart = playerRole
                                    ? (enemyParts.find((p: any) => p.role === playerRole || p.position === playerRole) ?? enemyParts[0])
                                    : enemyParts[0]
                                  const oppChamp = oppPart?.champion_name ?? null
                                  const rowCls = `flex flex-col gap-1.5 px-4 py-2.5 text-sm transition-colors ${win ? 'bg-emerald-950/30 hover:bg-emerald-900/20' : 'bg-rose-950/20 hover:bg-rose-900/15'} cursor-pointer`
                                  const inner = (
                                    <>
                                      {/* Ligne 1 : V/D — opponent — KDA — date/durée */}
                                      <div className="flex items-center gap-2.5">
                                        <span className={`shrink-0 px-2 py-0.5 rounded-md text-xs font-bold ${win ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'}`}>
                                          {win ? 'V' : 'D'}
                                        </span>
                                        <div className="w-7 h-7 shrink-0 flex items-center justify-center">
                                          {oppChamp
                                            ? <img src={getChampionImage(oppChamp)} alt={oppChamp} title={getChampionDisplayName(oppChamp) || oppChamp} className="w-7 h-7 rounded-md object-cover border border-dark-border/60" />
                                            : <div className="w-7 h-7 rounded-md bg-dark-border/20" />}
                                        </div>
                                        <span className="font-mono font-semibold text-white text-xs shrink-0">{s.kills}/{s.deaths}/{s.assists}</span>
                                        <span className="text-gray-500 text-xs shrink-0 tabular-nums">{date}</span>
                                        {dur && <span className="text-gray-600 text-xs shrink-0">· {dur}</span>}
                                      </div>
                                      {/* Ligne 2 : keystone + 6 slots items (positions fixes) */}
                                      <div className="flex items-center gap-0.5">
                                        {gr.ks ? <RuneIcon id={gr.ks} runesCache={runesCache} size="sm" /> : <div className="w-6 h-6 shrink-0" />}
                                        <div className="w-1.5 shrink-0" />
                                        {[0,1,2,3,4,5].map((idx) => {
                                          const id = gi[idx]
                                          return id
                                            ? <ItemImg key={`${id}-${idx}`} id={id} size="sm" />
                                            : <div key={idx} className="w-6 h-6 shrink-0 rounded bg-dark-border/20" />
                                        })}
                                      </div>
                                    </>
                                  )
                                  return s.match_id
                                    ? <Link key={i} to={`/team/matchs/${s.match_id}`} state={{ fromPlayer: playerId }} className={rowCls}>{inner}</Link>
                                    : <div key={i} className={rowCls}>{inner}</div>
                                })}
                              </div>
                              {hasMore && (
                                <button
                                  type="button"
                                  className="mt-2 w-full py-2 text-xs text-accent-blue hover:opacity-80 transition-opacity"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setLimits((prev) => ({ ...prev, [name]: (prev[name] ?? 5) + 10 }))
                                  }}
                                >
                                  Voir plus ({Math.min(games.length - limit, 10)} parties supplémentaires)
                                </button>
                              )}
                            </div>
                          )}
                          {!build && (
                            <p className="text-xs text-gray-500 italic">Données de build non disponibles pour ce champion.</p>
                          )}
                        </div>
                      </motion.div>
                    </td>
                  </tr>
                )}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}


export const PlayerDetailPage = () => {
  const { playerId } = useParams()
  const navigate = useNavigate()

  const d = usePlayerDetail(playerId)

  if (!d.player) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center">
        <p className="text-gray-400 mb-4">Joueur introuvable</p>
        <button onClick={() => navigate('/team/joueurs')} className="text-accent-blue hover:underline">
          Retour aux joueurs
        </button>
      </div>
    )
  }

  const { player } = d
  const roleLabel = ROLE_LABELS[player.position] || player.position
  const dpmLink = player.pseudo ? generateDpmLink(player.pseudo) : null

  let topChampions = player.top_champions
  if (typeof topChampions === 'string') {
    try { topChampions = JSON.parse(topChampions) } catch { topChampions = [] }
  }
  if (!Array.isArray(topChampions)) topChampions = []
  const mostPlayedChamp = topChampions[0]
  const mostPlayedName = mostPlayedChamp ? (mostPlayedChamp as any).name || mostPlayedChamp : null
  const bigChampBg = mostPlayedName ? getBigChampionImage(mostPlayedName) : null

  const tiersRaw = (player.champion_pools || []).reduce((acc: any, cp: any) => {
    const tier = cp.tier || 'A'
    if (TIER_KEYS.includes(tier)) {
      if (!acc[tier]) acc[tier] = []
      acc[tier].push({ id: cp.champion_id, name: cp.champion_id })
    }
    return acc
  }, {})
  const tiersForTable = Object.fromEntries(TIER_KEYS.map((k) => [k, tiersRaw[k] || []])) as { S: any[]; A: any[]; B: any[]; C: any[] }

  return (
    <div className="space-y-8">
      {/* Header : retour + sélecteur compte */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={() => navigate('/team/joueurs')}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={18} />
          Retour aux joueurs
        </button>
        <div className="flex gap-2">
          {[
            { idx: 1, label: player.pseudo || 'Compte 1' },
            { idx: 2, label: player.secondary_account || 'Compte 2' },
          ].map(({ idx, label }) => (
            <button
              key={idx}
              type="button"
              onClick={() => d.setSelectedSoloqAccount(idx)}
              className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors truncate max-w-[180px] ${
                d.selectedSoloqAccount === idx
                  ? 'bg-accent-blue text-white border border-accent-blue'
                  : 'bg-dark-card/80 border border-dark-border text-gray-400 hover:text-white'
              }`}
              title={label}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Bloc identité */}
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
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-5">
              <img
                src={mostPlayedName ? getChampionImage(mostPlayedName) : '/resources/champions/icons/default.jpg'}
                alt=""
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl object-cover border-2 border-off-white/20 shrink-0"
              />
              <div>
                <h1 className="font-display text-2xl sm:text-3xl font-bold text-off-white">
                  {player.player_name || 'Joueur'}
                </h1>
                <p className="text-off-white/80 mt-1">{player.pseudo || '—'}</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className="px-3 py-1 bg-off-white/20 rounded-lg text-sm font-medium text-off-white">{roleLabel}</span>
                  {player.rank && (
                    <span className="px-3 py-1 bg-off-white/20 rounded-lg text-sm font-medium text-off-white">{player.rank}</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {player.opgg_link && (
                <a href={player.opgg_link} target="_blank" rel="noopener noreferrer" className="px-4 py-2.5 bg-off-white/10 border border-off-white/20 rounded-xl hover:bg-off-white/20 flex items-center gap-2 text-sm font-medium text-off-white transition-colors">
                  <ExternalLink size={16} /> OP.gg
                </a>
              )}
              {dpmLink && (
                <a href={dpmLink} target="_blank" rel="noopener noreferrer" className="px-4 py-2.5 bg-off-white/10 border border-off-white/20 rounded-xl hover:bg-off-white/20 flex items-center gap-2 text-sm font-medium text-off-white transition-colors">
                  <ExternalLink size={16} /> dpm.lol
                </a>
              )}
              {player.lolpro_link && (
                <a href={player.lolpro_link} target="_blank" rel="noopener noreferrer" className="px-4 py-2.5 bg-off-white/10 border border-off-white/20 rounded-xl hover:bg-off-white/20 flex items-center gap-2 text-sm font-medium text-off-white transition-colors">
                  <ExternalLink size={16} /> Lol Pro
                </a>
              )}
            </div>
          </div>
          {player.rank_updated_at != null && (
            <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-off-white/10">
              <span className="text-sm text-off-white/80">
                Dernière MAJ rang :{' '}
                {new Date(player.rank_updated_at).toLocaleDateString('fr-FR', {
                  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                })}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 5 cartes principales */}
      <div className="grid grid-cols-5 gap-3">
        {MAIN_CARDS.map((card) => {
          const Icon = card.icon
          const isActive = d.selectedCard === card.id
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => d.setSelectedCard(card.id)}
              className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 text-left ${
                isActive ? 'border-accent-blue bg-accent-blue/10' : 'border-dark-border bg-dark-card/50'
              }`}
            >
              <Icon size={22} className={isActive ? 'text-accent-blue' : 'text-gray-400'} />
              <span className={`font-display font-semibold text-sm ${isActive ? 'text-white' : 'text-gray-400'}`}>
                {card.label}
              </span>
            </button>
          )
        })}
      </div>

      {/* Sous-menu Solo Q */}
      {d.selectedCard === 'soloq' && (
        <div className="flex flex-wrap gap-2">
          {SOLOQ_SUB.map((sub) => {
            const SubIcon = sub.icon
            const isActive = d.selectedSoloqSub === sub.id
            return (
              <button
                key={sub.id}
                type="button"
                onClick={() => d.setSelectedSoloqSub(sub.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive ? 'bg-accent-blue text-white' : 'bg-dark-card/80 border border-dark-border text-gray-400 hover:text-white'
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
      {d.selectedCard === 'team' && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {TEAM_SUB.map((sub) => {
              const SubIcon = sub.icon
              const isActive = d.selectedTeamSub === sub.id
              return (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => d.setSelectedTeamSub(sub.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    isActive ? 'bg-accent-blue text-white' : 'bg-dark-card/80 border border-dark-border text-gray-400 hover:text-white'
                  }`}
                >
                  <SubIcon size={16} />
                  {sub.label}
                </button>
              )
            })}
          </div>
          {/* Filtre type de match */}
          <div className="flex items-center bg-dark-bg border border-dark-border rounded-xl p-1 gap-1">
            {([
              { id: 'all' as const,        label: 'Tous',     Icon: LayoutList },
              { id: 'scrim' as const,      label: 'Scrims',   Icon: Swords     },
              { id: 'tournament' as const, label: 'Tournois', Icon: Trophy     },
            ]).map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => d.setTeamMatchTypeFilter(id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  d.teamMatchTypeFilter === id
                    ? 'bg-accent-blue/20 text-accent-blue border border-accent-blue/30'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Icon size={12} />
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Zone de contenu */}
      <div className="rounded-2xl border border-dark-border bg-dark-card/30 p-6 min-h-[200px]">

        {/* ── Général ── */}
        {d.selectedCard === 'general' && (
          <GeneralSection player={player} teamId={d.team?.id ?? ''} teamStats={d.teamStats} teamStatsLoading={d.teamStatsLoading} allTeamMatches={d.allTeamMatches} playerId={player.id} onNavigate={d.setSelectedCard} />
        )}

        {/* ── Solo Q ── */}
        {d.selectedCard === 'soloq' && (
          <>
            {d.selectedSoloqSub === 'statistiques' && (
              <SoloqStatistiquesSection d={d} />
            )}

            {d.selectedSoloqSub === 'champions' && (
              <SoloqChampionsAccordion
                championsFromDb={d.allChampionsFromDb}
                lpGraphMatches={d.lpGraphMatches ?? []}
                runesCache={d.allRunesCache}
                loading={d.soloqTopChampionsLoading}
                playerId={player.id}
              />
            )}

            {d.selectedSoloqSub === 'historiques' && (
              <div>
                {(d.totalFromRiot != null || d.countInDb != null) && (
                  <p className="text-gray-400 text-sm mb-3">
                    {d.totalFromRiot != null && <span><span className="font-semibold text-white">{d.totalFromRiot}</span> parties au total</span>}
                    {d.totalFromRiot != null && d.countInDb != null && ' · '}
                    {d.countInDb != null && <span><span className="font-semibold text-white">{d.countInDb}</span> en base</span>}
                  </p>
                )}
                {d.matchHistoryLoading ? (
                  <p className="text-gray-500 text-sm py-6">Chargement…</p>
                ) : d.matchHistory.length > 0 ? (
                  <div className="space-y-2">
                    {d.matchHistory
                      .filter((m) => (m.gameCreation || 0) >= SEASON_16_START_MS)
                      .map((m, i) => {
                        const isRemake = (m.gameDuration ?? 0) < REMAKE_THRESHOLD_SEC
                        return (
                          <Link
                            key={m.matchId || i}
                            to={m.matchId ? `/team/joueurs/${encodeURIComponent(playerId!)}/soloq/${m.matchId}` : '#'}
                            className="w-full flex items-center gap-4 p-3 rounded-xl bg-dark-bg/50 border border-dark-border/50 hover:border-purple-500/50 hover:bg-dark-bg/70 transition-colors text-left"
                          >
                            <img src={getChampionImage(m.championName)} alt={m.championName} className="w-10 h-10 rounded-lg object-cover border border-dark-border shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-white">{getChampionDisplayName(m.championName) || m.championName}</p>
                              <p className="text-xs text-gray-500">
                                {m.gameCreation ? new Date(m.gameCreation).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                                {m.gameDuration ? ` · ${Math.round(m.gameDuration / 60)} min` : ''}
                              </p>
                            </div>
                            <div className="text-center shrink-0">
                              <p className="text-sm font-mono text-white">{m.kills}/{m.deaths}/{m.assists}</p>
                              <p className="text-xs text-gray-500">K/D/A</p>
                            </div>
                            {isRemake ? (
                              <span className="px-3 py-1 rounded-lg text-sm font-semibold shrink-0 bg-gray-500/20 text-gray-400 border border-gray-500/40">Remake</span>
                            ) : (
                              <span className={`px-3 py-1 rounded-lg text-sm font-semibold shrink-0 ${m.win ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'}`}>
                                {m.win ? 'Victoire' : 'Défaite'}
                              </span>
                            )}
                          </Link>
                        )
                      })}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">Aucune partie enregistrée. Chargez les parties dans Import.</p>
                )}
                {d.matchHistory.length > 0 && d.matchHistoryHasMore && (
                  <div className="mt-6">
                    <button
                      type="button"
                      onClick={() => d.loadMatchHistoryFromSupabase(d.matchHistory.length, PAGE_SIZE, true)}
                      disabled={d.matchHistoryLoadMoreLoading}
                      className="px-4 py-2.5 rounded-xl bg-dark-border/80 hover:bg-dark-border text-white text-sm font-medium disabled:opacity-50"
                    >
                      {d.matchHistoryLoadMoreLoading ? 'Chargement…' : 'Charger plus (20 parties)'}
                    </button>
                  </div>
                )}
              </div>
            )}

          </>
        )}

        {/* ── Team ── */}
        {d.selectedCard === 'team' && (
          <>
            {d.selectedTeamSub === 'statistiques' && (
              <div className="space-y-6">
                <div className="flex gap-2 border-b border-dark-border pb-4">
                  {([{ id: 'general', label: 'Général', icon: BarChart3 }, { id: 'timeline', label: 'Timeline', icon: TrendingUp }] as const).map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => d.setTeamStatsSubSub(id)}
                      className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        d.teamStatsSubSub === id
                          ? 'bg-accent-blue/20 text-accent-blue border border-accent-blue/40'
                          : 'text-gray-400 hover:text-white hover:bg-dark-bg/60'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {label}
                    </button>
                  ))}
                </div>
                {d.teamStatsSubSub === 'general' && (
                  <TeamStatistiquesSection d={d} />
                )}
                {d.teamStatsSubSub === 'timeline' && (
                  <PlayerTimelineAdvantageSection
                    playerId={player.id}
                    matches={d.allTeamMatches}
                    timelines={d.allTeamTimelines}
                  />
                )}
              </div>
            )}

            {d.selectedTeamSub === 'champions' && (
              <TeamChampionsAccordion
                championStats={d.championStatsFromTeam}
                runesCache={d.allRunesCache}
                loading={d.teamStatsLoading}
                playerId={player.id}
                allTeamMatches={d.allTeamMatches ?? []}
              />
            )}

            {d.selectedTeamSub === 'historiques' && (
              <div>
                {d.teamStatsLoading ? (
                  <p className="text-gray-500 text-sm py-6">Chargement...</p>
                ) : d.filteredTeamStats.length > 0 ? (
                  <div className="space-y-3">
                    {d.filteredTeamStats.map((s: any, i: number) => {
                      const m = s.team_matches
                      return (
                        <Link
                          key={s.id || i}
                          to={`/team/matchs/${s.match_id}`}
                          state={{ fromPlayer: playerId }}
                          className="block flex flex-wrap items-center gap-4 p-4 rounded-xl bg-dark-bg/50 border border-dark-border hover:border-accent-blue/50 hover:bg-dark-bg/70 transition-colors"
                        >
                          <img src={getChampionImage(s.champion_name)} alt={s.champion_name} className="w-12 h-12 rounded-lg object-cover border border-dark-border shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-white">{getChampionDisplayName(s.champion_name) || s.champion_name}</p>
                            <p className="text-sm text-gray-500">{m?.game_duration ? `${Math.round(m.game_duration / 60)} min` : '—'}</p>
                          </div>
                          <div className="flex flex-wrap gap-4 text-sm">
                            <div className="text-center"><p className="text-gray-500 text-xs">K/D/A</p><p className="font-mono text-white">{s.kills}/{s.deaths}/{s.assists}</p></div>
                            <div className="text-center"><p className="text-gray-500 text-xs">KDA</p><p className="text-white">{s.kda ?? '—'}</p></div>
                            <div className="text-center hidden sm:block"><p className="text-gray-500 text-xs">DMG</p><p className="text-white">{s.total_damage_dealt_to_champions?.toLocaleString() ?? '—'}</p></div>
                            <div className="text-center hidden sm:block"><p className="text-gray-500 text-xs">Gold</p><p className="text-amber-400">{s.gold_earned?.toLocaleString() ?? '—'}</p></div>
                            <div className="text-center"><p className="text-gray-500 text-xs">Vision</p><p className="text-violet-400">{s.vision_score ?? '—'}</p></div>
                          </div>
                          <span className={`px-3 py-1.5 rounded-lg text-sm font-semibold shrink-0 ${m?.our_win ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'}`}>
                            {m?.our_win ? 'Victoire' : 'Défaite'}
                          </span>
                        </Link>
                      )
                    })}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dark-border bg-dark-card/50 p-8 text-center">
                    <p className="text-gray-500 text-sm">Aucune donnée en équipe. Ajoutez des parties depuis <strong>Matchs</strong>.</p>
                  </div>
                )}
              </div>
            )}

          </>
        )}

        {/* ── Pool Champ ── */}
        {d.selectedCard === 'pool-champ' && (
          <div className="space-y-4">
            <p className="text-gray-400 text-sm">
              Pool et tier list pour <span className="text-white font-medium">{roleLabel}</span>. Classez vos champions par niveau de priorité (S, A, B, C).
            </p>
            <TierTable tiers={tiersForTable} activeTier={null} />
            {TIER_KEYS.every((k) => !(tiersForTable[k] || []).length) && (
              <p className="text-gray-500 text-sm mt-4">Aucun champion dans le pool. Rendez-vous dans Pool de Champions pour en ajouter.</p>
            )}
          </div>
        )}

        {/* ── Coach ── */}
        {d.selectedCard === 'coach' && (
          <CoachCard playerId={player.id} />
        )}

        {/* Modal Champion (matchups solo Q) */}
        {d.championModalChampion && createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70" onClick={d.closeChampionModal}>
            <div className="bg-dark-card border border-dark-border rounded-2xl shadow-xl max-w-2xl w-full max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between p-4 border-b border-dark-border">
                <div className="flex items-center gap-3">
                  <img src={getChampionImage(d.championModalChampion)} alt={d.championModalChampion} className="w-10 h-10 rounded-lg object-cover border border-dark-border" />
                  <h3 className="text-lg font-semibold text-white">{getChampionDisplayName(d.championModalChampion) || d.championModalChampion} — Parties</h3>
                </div>
                <button type="button" onClick={d.closeChampionModal} className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-dark-bg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="overflow-y-auto p-4">
                {d.championModalMatchesLoading ? (
                  <p className="text-gray-500 text-sm py-6">Chargement…</p>
                ) : d.championModalMatches.length === 0 ? (
                  <p className="text-gray-500 text-sm py-4">Aucune partie.</p>
                ) : (
                  <div className="space-y-2">
                    {d.championModalMatches.map((m: any, i: number) => (
                      <div key={m.matchId || i} className="w-full flex items-center gap-4 p-3 rounded-xl bg-dark-bg/50 border border-dark-border/50">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-gray-500">
                            {m.gameCreation ? new Date(m.gameCreation).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                            {m.gameDuration ? ` · ${Math.round(m.gameDuration / 60)} min` : ''}
                          </p>
                          {m.opponentChampionName && (
                            <p className="text-xs text-gray-400 mt-0.5">vs {getChampionDisplayName(m.opponentChampionName) || m.opponentChampionName}</p>
                          )}
                        </div>
                        <p className="text-sm font-mono text-white shrink-0">{m.kills}/{m.deaths}/{m.assists}</p>
                        <span className={`px-2 py-1 rounded text-xs font-semibold shrink-0 ${m.win ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                          {m.win ? 'V' : 'D'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}

      </div>
    </div>
  )
}

// ─── Général ──────────────────────────────────────────────────────────────────

function GeneralSection({ player, teamId, teamStats, teamStatsLoading, allTeamMatches, playerId, onNavigate }: {
  player: any
  teamId: string
  teamStats: any[]
  teamStatsLoading: boolean
  allTeamMatches: any[]
  playerId: string
  onNavigate: (tab: string) => void
}) {
  // ── Card 1 — Rang actuel ────────────────────────────────────────────────
  const currentLp = parseLpFromRank(player.rank)
  const rankImg = getRankImage(player.rank)
  const rankTextColor = getRankColorText(player.rank)
  const rankLabel = player.rank ? player.rank.replace(/\s*\d+\s*LP/i, '').trim() : null

  // ── Card 2 — Peak S16 (stocké en DB, mis à jour par l'auto-sync) ───────
  const peakLp: number | null = player.peak_lp_s16 ?? null
  const peakRankImg = getRankImage(player.peak_rank_s16 ?? player.rank)
  const peakRankTextColor = getRankColorText(player.peak_rank_s16 ?? player.rank)
  const peakRankLabel = player.peak_rank_s16
    ? player.peak_rank_s16.replace(/\s*\d+\s*LP/i, '').trim()
    : rankLabel

  return (
    <div className="space-y-6">
    <div className="flex gap-4">

      {/* Card 1 — Rang actuel */}
      <div className="flex-1 flex flex-col items-center gap-4 p-6 rounded-2xl bg-dark-bg border border-dark-border">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest self-start">Rang actuel</p>
        {rankImg ? (
          <img src={rankImg} alt={rankLabel ?? ''} className="w-24 h-24 object-contain drop-shadow-lg" />
        ) : (
          <div className="w-24 h-24 rounded-full bg-dark-card border border-dark-border flex items-center justify-center text-3xl">—</div>
        )}
        <div className="text-center">
          <p className={`text-2xl font-bold ${rankTextColor}`}>{rankLabel ?? '—'}</p>
          {currentLp != null && (
            <p className="text-sm text-gray-400 mt-1">{currentLp} LP</p>
          )}
        </div>
      </div>

      {/* Card 2 — Peak Elo S16 */}
      <div className="flex-1 flex flex-col items-center gap-4 p-6 rounded-2xl bg-dark-bg border border-dark-border">
        <div className="self-start">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Peak Elo — Saison 16</p>
          <p className="text-[10px] text-gray-600 mt-0.5">Comptabilisé depuis l'inscription sur le site</p>
        </div>
        {peakRankImg ? (
          <img src={peakRankImg} alt={peakRankLabel ?? ''} className="w-24 h-24 object-contain drop-shadow-lg opacity-90" />
        ) : (
          <div className="w-24 h-24 rounded-full bg-dark-card border border-dark-border flex items-center justify-center text-3xl">—</div>
        )}
        <div className="text-center">
          {peakLp != null ? (
            <>
              <p className={`text-2xl font-bold ${peakRankTextColor}`}>{peakRankLabel ?? '—'}</p>
              <p className="text-sm text-gray-400 mt-1">{peakLp} LP</p>
            </>
          ) : (
            <p className="text-sm text-gray-600 italic">Mis à jour au prochain sync</p>
          )}
        </div>
      </div>

      {/* Card 3 — placeholder */}
      <div className="flex-1 flex flex-col items-center justify-center gap-2 p-6 rounded-2xl bg-dark-bg border border-dashed border-dark-border/40">
        <p className="text-xs font-semibold text-gray-600 uppercase tracking-widest">Peak Elo — All Time</p>
        <p className="text-sm text-gray-700 italic">À venir</p>
      </div>

    </div>

    {/* Carrousel — dernier bloc de scrims */}
    <ScrimBlockCarousel teamStats={teamStats} loading={teamStatsLoading} allTeamMatches={allTeamMatches} playerId={playerId} />

    {/* Pool Champ + Coaching */}
    <div className="grid grid-cols-2 gap-4">
      <PoolChampSummary player={player} onNavigate={onNavigate} />
      <CoachSummary teamId={teamId} playerId={playerId} onNavigate={onNavigate} />
    </div>
    </div>
  )
}
// ─── Carrousel dernier bloc de scrims ─────────────────────────────────────────

function ScrimBlockCarousel({ teamStats, loading, allTeamMatches, playerId }: {
  teamStats: any[]
  loading: boolean
  allTeamMatches: any[]
  playerId: string
}) {
  const [idx, setIdx] = useState(0)

  const lastBlock = useMemo(() => {
    const scrims = (teamStats ?? []).filter(
      (s) => s.team_matches?.match_type === 'scrim' && s.team_matches?.game_creation
    )
    if (!scrims.length) return []
    const byDate: Record<string, any[]> = {}
    for (const s of scrims) {
      const key = new Date(s.team_matches.game_creation).toLocaleDateString('fr-FR')
      if (!byDate[key]) byDate[key] = []
      byDate[key].push(s)
    }
    const sorted = Object.entries(byDate).sort(([, a], [, b]) => {
      const aMax = Math.max(...a.map((s) => s.team_matches?.game_creation ?? 0))
      const bMax = Math.max(...b.map((s) => s.team_matches?.game_creation ?? 0))
      return bMax - aMax
    })
    return sorted[0]?.[1].slice(0, 3) ?? []
  }, [teamStats])

  // Auto-avance toutes les 5 secondes
  useEffect(() => {
    if (lastBlock.length <= 1) return undefined
    const timer = setInterval(() => setIdx((i) => (i + 1) % lastBlock.length), 5000)
    return () => clearInterval(timer)
  }, [lastBlock.length])

  const safeIdx = Math.min(idx, Math.max(0, lastBlock.length - 1))

  if (loading) return (
    <div className="h-32 rounded-2xl bg-dark-bg border border-dark-border flex items-center justify-center">
      <TrendingUp size={20} className="text-gray-600 animate-pulse" />
    </div>
  )

  if (!lastBlock.length) return (
    <div className="h-32 rounded-2xl bg-dark-bg border border-dark-border/40 flex items-center justify-center">
      <p className="text-sm text-gray-600 italic">Aucun scrim enregistré</p>
    </div>
  )

  const game = lastBlock[safeIdx]
  const win: boolean = !!game.team_matches?.our_win
  const rawDur: number = game.team_matches?.game_duration ?? 0
  const duration = rawDur ? `${Math.floor(rawDur / 60)}m${String(rawDur % 60).padStart(2, '0')}` : '—'
  const date = game.team_matches?.game_creation
    ? new Date(game.team_matches.game_creation).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
    : '—'
  const kdaNum = game.deaths === 0 ? null : ((game.kills + game.assists) / game.deaths)
  const kdaLabel = game.deaths === 0 ? 'Perfect' : kdaNum!.toFixed(2)
  const kdaColor = game.deaths === 0 || kdaNum! >= 3 ? 'text-emerald-400' : kdaNum! >= 2 ? 'text-yellow-400' : 'text-gray-400'

  // Match complet + participants
  const fullMatch = (allTeamMatches ?? []).find((m: any) => m.id === game.match_id)
  const allParts: any[] = fullMatch?.team_match_participants ?? []
  const ROLE_ORDER: Record<string, number> = { top: 0, jungle: 1, jng: 1, mid: 2, adc: 3, bot: 3, support: 4, sup: 4, utility: 4 }
  const sortByRole = (a: any, b: any) => {
    const ra = ROLE_ORDER[String(a.role || a.position || '').toLowerCase()] ?? 99
    const rb = ROLE_ORDER[String(b.role || b.position || '').toLowerCase()] ?? 99
    return ra - rb
  }
  const ourParts = allParts.filter((p: any) => p.team_side === 'our').sort(sortByRole)
  const enemyParts = allParts.filter((p: any) => p.team_side !== 'our').sort(sortByRole)

  // Côté bleu = teamId 100 (gauche), rouge = 200 (droite)
  // our_team_id 100 → notre équipe à gauche, sinon à droite
  const ourTeamId: number = fullMatch?.our_team_id ?? 100
  const ourIsBlue = ourTeamId === 100
  const leftTeam = ourIsBlue ? ourParts : enemyParts
  const rightTeam = ourIsBlue ? enemyParts : ourParts
  const leftIsOurs = ourIsBlue
  const rightIsOurs = !ourIsBlue

  const winGradient = win
    ? 'from-emerald-500/10 via-transparent to-transparent'
    : 'from-rose-500/10 via-transparent to-transparent'

  const ChampCard = ({ p, isOurs }: { p: any; isOurs: boolean }) => {
    const isMe = isOurs && p.player_id === playerId
    const img = p.champion_name ? getChampionImage(p.champion_name) : null
    return (
      <div className={`relative flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
        isMe
          ? 'bg-yellow-500/10 ring-1 ring-yellow-400/50 shadow-[0_0_12px_rgba(234,179,8,0.2)]'
          : 'bg-white/[0.03] hover:bg-white/[0.06]'
      }`}>
        <div className="relative">
          {img
            ? <img src={img} alt={p.champion_name} className={`w-12 h-12 rounded-xl object-cover ${isMe ? 'ring-2 ring-yellow-400 shadow-[0_0_8px_rgba(234,179,8,0.4)]' : 'ring-1 ring-white/10'}`} />
            : <div className={`w-12 h-12 rounded-xl bg-dark-card ${isMe ? 'ring-2 ring-yellow-400' : 'ring-1 ring-white/10'}`} />
          }
          {isMe && (
            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-yellow-400 border-2 border-dark-bg shadow-[0_0_6px_rgba(234,179,8,0.8)]" />
          )}
        </div>
        <p className={`text-[10px] truncate w-full text-center leading-tight font-medium ${isMe ? 'text-yellow-300' : 'text-gray-300'}`}>
          {p.pseudo || p.champion_name || '—'}
        </p>
        <p className={`text-[10px] font-mono leading-none ${isMe ? 'text-white font-semibold' : 'text-gray-400'}`}>
          {p.kills ?? 0}/{p.deaths ?? 0}/{p.assists ?? 0}
        </p>
        {p.cs != null && (
          <p className={`text-[10px] leading-none ${isMe ? 'text-gray-400' : 'text-gray-600'}`}>{p.cs} CS</p>
        )}
      </div>
    )
  }

  return (
    <div className={`rounded-2xl bg-dark-bg border overflow-hidden transition-colors duration-500 ${win ? 'border-emerald-500/20' : 'border-rose-500/20'}`}>

      {/* Header avec tint victoire/défaite */}
      <div className={`bg-gradient-to-r ${winGradient} border-b border-dark-border/40`}>
        <div className="flex items-center justify-between px-5 py-3">
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Dernier bloc de scrims</p>
            <span className="text-gray-700">·</span>
            <span className="text-xs text-gray-500">{date}</span>
          </div>
          <div className="flex items-center gap-1.5">
            {lastBlock.map((_: any, i: number) => {
              const g = lastBlock[i]
              const isWin = !!g.team_matches?.our_win
              const isActive = i === safeIdx
              return (
                <button
                  key={i}
                  onClick={() => setIdx(i)}
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all ${
                    isActive
                      ? isWin
                        ? 'bg-emerald-500/25 text-emerald-300 shadow-[0_0_8px_rgba(52,211,153,0.3)]'
                        : 'bg-rose-500/25 text-rose-300 shadow-[0_0_8px_rgba(248,113,113,0.3)]'
                      : 'text-gray-600 hover:text-gray-400'
                  }`}
                >
                  {isWin ? 'V' : 'D'}
                </button>
              )
            })}
          </div>
        </div>

        {/* Barre de progression auto-avance */}
        {lastBlock.length > 1 && (
          <div className="h-px bg-white/5 relative overflow-hidden">
            <motion.div
              key={safeIdx}
              className={`absolute inset-y-0 left-0 ${win ? 'bg-emerald-400/60' : 'bg-rose-400/60'}`}
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{ duration: 5, ease: 'linear' }}
            />
          </div>
        )}
      </div>

      {/* Corps avec animation de transition */}
      <div className="px-4 pt-4 pb-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={safeIdx}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="space-y-3"
          >
            {allParts.length > 0 ? (
              <>
                <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-start">
                  {/* Côté gauche */}
                  <div>
                    <div className="flex items-center gap-1.5 mb-2.5">
                      <span className="w-2 h-2 rounded-full bg-blue-400 shadow-[0_0_6px_rgba(96,165,250,0.6)]" />
                      <p className="text-[10px] font-bold uppercase tracking-widest text-blue-400">Côté bleu</p>
                      {leftIsOurs && (
                        <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-lg ${win ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
                          {win ? 'Victoire' : 'Défaite'}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-5 gap-1.5">
                      {leftTeam.map((p: any, i: number) => (
                        <ChampCard key={p.id ?? i} p={p} isOurs={leftIsOurs} />
                      ))}
                    </div>
                  </div>

                  {/* VS central */}
                  <div className="flex flex-col items-center justify-center gap-2 px-2 pt-8 self-center">
                    <div className={`text-xs font-black tracking-widest ${win ? 'text-emerald-500/60' : 'text-rose-500/60'}`}>VS</div>
                    <span className="text-[10px] font-mono text-gray-500">{duration}</span>
                  </div>

                  {/* Côté droit */}
                  <div>
                    <div className="flex items-center gap-1.5 mb-2.5">
                      <span className="w-2 h-2 rounded-full bg-rose-400 shadow-[0_0_6px_rgba(251,113,133,0.6)]" />
                      <p className="text-[10px] font-bold uppercase tracking-widest text-rose-400">Côté rouge</p>
                      {rightIsOurs && (
                        <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-lg ${win ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
                          {win ? 'Victoire' : 'Défaite'}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-5 gap-1.5">
                      {rightTeam.map((p: any, i: number) => (
                        <ChampCard key={p.id ?? i} p={p} isOurs={rightIsOurs} />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Footer stats joueur */}
                <div className={`flex items-center gap-3 pt-2.5 border-t text-xs ${win ? 'border-emerald-500/15' : 'border-rose-500/15'}`}>
                  <span className={`font-bold ${win ? 'text-emerald-400' : 'text-rose-400'}`}>{win ? 'Victoire' : 'Défaite'}</span>
                  <span className="text-gray-600">·</span>
                  <span className="font-mono text-white font-semibold">{game.kills}/{game.deaths}/{game.assists}</span>
                  <span className={`font-medium ${kdaColor}`}>{kdaLabel} KDA</span>
                  {game.cs != null && <><span className="text-gray-600">·</span><span className="text-gray-400">{game.cs} CS</span></>}
                </div>
              </>
            ) : (
              /* Fallback sans participants */
              <div className="flex items-center gap-5">
                <div className="relative shrink-0">
                  {game.champion_name
                    ? <img src={getChampionImage(game.champion_name)} alt={game.champion_name} className="w-16 h-16 rounded-xl object-cover ring-2 ring-yellow-400 shadow-[0_0_12px_rgba(234,179,8,0.3)]" />
                    : <div className="w-16 h-16 rounded-xl bg-dark-card ring-1 ring-white/10" />
                  }
                  <span className={`absolute -bottom-1.5 -right-1.5 text-xs font-bold px-1.5 py-0.5 rounded-md border ${win ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' : 'bg-rose-500/20 border-rose-500/40 text-rose-400'}`}>
                    {win ? 'V' : 'D'}
                  </span>
                </div>
                <div className="flex-1 space-y-1.5">
                  <p className="text-sm font-semibold text-white">{game.champion_name ?? '—'}</p>
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-white">{game.kills} / <span className="text-rose-400">{game.deaths}</span> / {game.assists}</span>
                    <span className={`text-sm font-medium ${kdaColor}`}>{kdaLabel} KDA</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span>⏱ {duration}</span>
                    {game.cs != null && <span>{game.cs} CS</span>}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

// ─── Pool Champ — résumé ──────────────────────────────────────────────────────

const TIER_ORDER = ['S', 'A', 'B', 'C', 'Training']
const TIER_CFG: Record<string, { text: string; bg: string; border: string }> = {
  S:        { text: 'text-amber-400',  bg: 'bg-amber-500/15',  border: 'border-amber-500/40' },
  A:        { text: 'text-emerald-400',bg: 'bg-emerald-500/15',border: 'border-emerald-500/40' },
  B:        { text: 'text-blue-400',   bg: 'bg-blue-500/15',   border: 'border-blue-500/40' },
  C:        { text: 'text-gray-400',   bg: 'bg-gray-500/10',   border: 'border-gray-500/20' },
  Training: { text: 'text-violet-400', bg: 'bg-violet-500/15', border: 'border-violet-500/40' },
}

function PoolChampSummary({ player, onNavigate }: { player: any; onNavigate: (tab: string) => void }) {
  const pools: any[] = player.champion_pools ?? []
  const sorted = [...pools].sort((a, b) =>
    TIER_ORDER.indexOf(a.tier ?? 'C') - TIER_ORDER.indexOf(b.tier ?? 'C')
  )
  const top = sorted.slice(0, 10)
  const total = pools.length

  // Compter par tier
  const byTier = pools.reduce((acc: Record<string, number>, cp: any) => {
    const t = cp.tier ?? 'C'
    acc[t] = (acc[t] ?? 0) + 1
    return acc
  }, {})

  return (
    <div className="rounded-2xl bg-dark-bg border border-dark-border p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy size={14} className="text-amber-400" />
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Pool Champion</p>
        </div>
        {total > 0 && (
          <button
            type="button"
            onClick={() => onNavigate('pool-champ')}
            className="text-[11px] text-accent-blue hover:text-white transition-colors"
          >
            Voir tout →
          </button>
        )}
      </div>

      {total === 0 ? (
        <p className="text-sm text-gray-600 italic text-center py-4 flex-1">Aucun champion dans le pool</p>
      ) : (
        <div className="space-y-3 flex-1">
          {/* Compteurs par tier */}
          <div className="flex gap-2">
            {TIER_ORDER.filter(t => byTier[t] > 0).map(t => {
              const cfg = TIER_CFG[t] ?? TIER_CFG.C
              return (
                <div key={t} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border ${cfg.bg} ${cfg.border}`}>
                  <span className={`text-xs font-black ${cfg.text}`}>{t}</span>
                  <span className="text-xs font-semibold text-white">{byTier[t]}</span>
                </div>
              )
            })}
          </div>

          {/* Icônes champions */}
          <div className="flex flex-wrap gap-2">
            {top.map((cp: any, i: number) => {
              const tier = cp.tier ?? 'C'
              const cfg = TIER_CFG[tier] ?? TIER_CFG.C
              return (
                <div key={cp.id ?? cp.champion_id ?? i} className="relative group">
                  <img
                    src={getChampionImage(cp.champion_id)}
                    alt={cp.champion_id}
                    className="w-11 h-11 rounded-xl object-cover border border-dark-border/60 group-hover:border-accent-blue/40 transition-colors"
                  />
                  <span className={`absolute -bottom-1 -right-1 text-[8px] font-black px-1 py-px rounded border leading-none ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                    {tier}
                  </span>
                </div>
              )
            })}
            {total > 10 && (
              <div className="w-11 h-11 rounded-xl bg-dark-card border border-dark-border/40 flex items-center justify-center">
                <span className="text-[10px] text-gray-600 font-medium">+{total - 10}</span>
              </div>
            )}
          </div>

          <p className="text-[10px] text-gray-600">{total} champion{total > 1 ? 's' : ''} enregistré{total > 1 ? 's' : ''}</p>
        </div>
      )}
    </div>
  )
}

// ─── Coaching — résumé ────────────────────────────────────────────────────────

function CoachSummary({ teamId, playerId, onNavigate }: {
  teamId: string
  playerId: string
  onNavigate: (tab: string) => void
}) {
  const [notes, setNotes] = useState<any[]>([])
  const [objectives, setObjectives] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!teamId || !playerId) { setLoading(false); return undefined }
    let cancelled = false
    Promise.all([
      fetchNotes(teamId, playerId),
      fetchObjectives(teamId, playerId),
    ]).then(([n, o]) => {
      if (cancelled) return
      setNotes(n.data ?? [])
      setObjectives(o.data ?? [])
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [teamId, playerId])

  const ongoing  = objectives.filter(o => o.status === 'ongoing')
  const achieved = objectives.filter(o => o.status === 'achieved')
  const lastOngoing = ongoing[0] ?? null
  const lastNote    = notes[0] ?? null
  const empty = notes.length === 0 && objectives.length === 0

  return (
    <div className="rounded-2xl bg-dark-bg border border-dark-border p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target size={14} className="text-violet-400" />
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Coaching</p>
        </div>
        {!empty && !loading && (
          <button
            type="button"
            onClick={() => onNavigate('coach')}
            className="text-[11px] text-accent-blue hover:text-white transition-colors"
          >
            Voir tout →
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center py-4">
          <p className="text-xs text-gray-600 animate-pulse">Chargement…</p>
        </div>
      ) : empty ? (
        <p className="text-sm text-gray-600 italic text-center py-4 flex-1">Aucune donnée de coaching</p>
      ) : (
        <div className="space-y-3 flex-1">
          {/* Compteurs */}
          <div className="flex gap-2">
            <div className="flex-1 flex flex-col items-center gap-0.5 p-2.5 rounded-xl bg-dark-card/60 border border-dark-border/40">
              <p className="text-xl font-bold text-white">{notes.length}</p>
              <p className="text-[10px] text-gray-500">Note{notes.length > 1 ? 's' : ''}</p>
            </div>
            <div className="flex-1 flex flex-col items-center gap-0.5 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <p className="text-xl font-bold text-amber-400">{ongoing.length}</p>
              <p className="text-[10px] text-gray-500">En cours</p>
            </div>
            <div className="flex-1 flex flex-col items-center gap-0.5 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <p className="text-xl font-bold text-emerald-400">{achieved.length}</p>
              <p className="text-[10px] text-gray-500">Atteint{achieved.length > 1 ? 's' : ''}</p>
            </div>
          </div>

          {/* Dernier objectif en cours */}
          {lastOngoing && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-amber-500/8 border border-amber-500/20">
              <Clock size={12} className="text-amber-400 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-100/80 leading-snug line-clamp-2">{lastOngoing.title}</p>
            </div>
          )}

          {/* Dernière note si pas d'objectif en cours */}
          {!lastOngoing && lastNote && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-dark-border/40">
              <FileText size={12} className="text-gray-500 mt-0.5 shrink-0" />
              <p className="text-xs text-gray-400 leading-snug line-clamp-2">{lastNote.content}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
