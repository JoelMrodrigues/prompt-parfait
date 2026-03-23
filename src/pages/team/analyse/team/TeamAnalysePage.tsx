/**
 * Page Analyse Team — Stats collectives scrims/tournois
 * Même layout que SoloQPage : config gauche + 3 onglets résultat
 */
import { useState, useEffect } from 'react'
import {
  ArrowLeft, PanelLeftOpen, PanelLeftClose,
  Loader2, Search, AlertCircle, Trophy, Swords, Coins,
  TrendingUp, FileText, Brain, ClipboardList, Shield, Target,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useTeam } from '../../hooks/useTeam'
import { useLayout } from '../../../../contexts/LayoutContext'
import { supabase } from '../../../../lib/supabase'
import { SEASON_16_START_MS } from '../../../../lib/constants'
import { getChampionImage, getChampionDisplayName } from '../../../../lib/championImages'
import { computeAnalyse, computeRapport } from './teamAnalyseAlgo'
import type {
  TeamAnalysisResult, TeamSplitStats, TeamRoleStats, TeamChampionStat,
} from './teamTypes'

// ─── Constantes ───────────────────────────────────────────────────────────────

const SEASON_START = new Date(SEASON_16_START_MS).toISOString().split('T')[0]
const TODAY        = new Date().toISOString().split('T')[0]
const REMAKE_THRESHOLD = 180

const DATE_PRESETS = [
  { id: '7d',     label: '7 jours'      },
  { id: '30d',    label: '30 jours'     },
  { id: 'season', label: 'Saison'       },
  { id: 'custom', label: 'Personnalisé' },
] as const
type DatePresetId = typeof DATE_PRESETS[number]['id']

type MatchTypeFilter = 'all' | 'scrim' | 'tournament'
type ResultTab = 'resume' | 'analyse' | 'rapport'
type AnalysisStatus = 'idle' | 'loading' | 'done' | 'error' | 'empty'

const ROLE_LABEL: Record<string, string> = {
  TOP: 'Top', JUNGLE: 'Jungle', JUG: 'Jungle', MID: 'Mid',
  BOTTOM: 'Bot', BOT: 'Bot', UTILITY: 'Support', SUPPORT: 'Support', SUP: 'Support',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function f(n: number | null, d = 1) { return n != null ? n.toFixed(d) : '—' }
function fmtK(n: number) { return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(Math.round(n)) }
function pct(n: number) { return `${Math.round(n * 100)}%` }
function fMin(sec: number | null) {
  if (sec == null) return '—'
  return `${Math.floor(sec / 60)}m${Math.round(sec % 60).toString().padStart(2, '0')}s`
}

function winRateColor(wr: number) {
  if (wr >= 0.55) return 'text-emerald-400'
  if (wr >= 0.45) return 'text-yellow-400'
  return 'text-red-400'
}
function kdaColor(kda: number) {
  if (kda >= 4)  return 'text-accent-blue'
  if (kda >= 3)  return 'text-emerald-400'
  if (kda >= 2)  return 'text-yellow-400'
  return 'text-orange-400'
}

function normalizeRole(role: string | null): string {
  if (!role) return 'UNKNOWN'
  const r = role.toUpperCase()
  if (r === 'UTILITY') return 'SUPPORT'
  if (r === 'SUP')     return 'SUPPORT'
  if (r === 'BOTTOM')  return 'BOT'
  if (r === 'JUG')     return 'JUNGLE'
  return r
}

// ─── Markdown renderer ────────────────────────────────────────────────────────

function MarkdownBlock({ text }: { text: string }) {
  const lines = text.split('\n')
  return (
    <div className="space-y-1.5 text-sm leading-relaxed">
      {lines.map((line, i) => {
        if (line.startsWith('## ')) {
          return <h3 key={i} className="font-display font-bold text-white text-base mt-5 mb-2 first:mt-0">{line.slice(3)}</h3>
        }
        if (line.startsWith('**') && line.endsWith('**')) {
          return <p key={i} className="font-semibold text-gray-300">{line.slice(2, -2)}</p>
        }
        if (line.includes('**')) {
          const parts = line.split(/(\*\*[^*]+\*\*)/)
          return (
            <p key={i} className="text-gray-400">
              {parts.map((part, j) =>
                part.startsWith('**') && part.endsWith('**')
                  ? <strong key={j} className="text-gray-200 font-semibold">{part.slice(2, -2)}</strong>
                  : part
              )}
            </p>
          )
        }
        if (line.startsWith('- ') || line.startsWith('• ')) {
          return (
            <p key={i} className="text-gray-400 pl-3 flex gap-2">
              <span className="text-accent-blue/60 shrink-0">·</span>
              <span>{line.slice(2)}</span>
            </p>
          )
        }
        if (line.trim() === '') return <div key={i} className="h-1" />
        return <p key={i} className="text-gray-400">{line}</p>
      })}
    </div>
  )
}

// ─── Metric card ──────────────────────────────────────────────────────────────

function MetricCard({ icon: Icon, label, value, valueClass = 'text-white', sub }: {
  icon: React.ElementType; label: string; value: string; valueClass?: string; sub?: string
}) {
  return (
    <div className="bg-dark-card border border-dark-border rounded-xl p-4 flex flex-col gap-1">
      <div className="flex items-center gap-2 mb-1">
        <Icon size={13} className="text-gray-600 shrink-0" />
        <p className="text-[10px] font-bold tracking-widest uppercase text-gray-600">{label}</p>
      </div>
      <p className={`text-2xl font-bold font-display ${valueClass}`}>{value}</p>
      {sub && <p className="text-[11px] text-gray-600">{sub}</p>}
    </div>
  )
}

// ─── Onglet Résumé ────────────────────────────────────────────────────────────

function TabResume({ result }: { result: TeamAnalysisResult }) {
  const dateLabel = `${new Date(result.dateFrom).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })} → ${new Date(result.dateTo).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}`

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="font-display text-xl font-bold text-white">Équipe</h2>
          <p className="text-sm text-gray-500 mt-0.5">{dateLabel}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold font-display text-white">{result.totalGames}</p>
          <p className="text-xs text-gray-600">parties analysées</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
        <MetricCard icon={Trophy}    label="Winrate"    value={pct(result.winRate)}   valueClass={winRateColor(result.winRate)}  sub={`${result.wins}V / ${result.totalGames - result.wins}D`} />
        <MetricCard icon={Swords}    label="KDA global" value={f(result.avgKda)}       valueClass={kdaColor(result.avgKda)}        sub={`${f(result.avgKills)} / ${f(result.avgDeaths)} / ${f(result.avgAssists)}`} />
        {result.avgGameDuration != null && (
          <MetricCard icon={TrendingUp} label="Durée moy." value={fMin(result.avgGameDuration)} sub={`V: ${fMin(result.winsStats.avgGameDuration)} · D: ${fMin(result.lossesStats.avgGameDuration)}`} />
        )}
        {result.avgDragonKills != null && (
          <MetricCard icon={Shield}  label="Dragons/partie" value={f(result.avgDragonKills)} sub={`V: ${f(result.winsStats.avgDragonKills)} · D: ${f(result.lossesStats.avgDragonKills)}`} />
        )}
        {result.avgBaronKills != null && (
          <MetricCard icon={Target}  label="Barons/partie"  value={f(result.avgBaronKills)}  sub={`V: ${f(result.winsStats.avgBaronKills)} · D: ${f(result.lossesStats.avgBaronKills)}`} />
        )}
        {result.firstBloodRate != null && (
          <MetricCard icon={Coins}   label="1er sang"       value={pct(result.firstBloodRate)} sub={`V: ${pct(result.winsStats.firstBloodRate ?? 0)} · D: ${pct(result.lossesStats.firstBloodRate ?? 0)}`} />
        )}
      </div>

      {/* Objectifs V vs D */}
      {result.hasObjectives && (
        <div>
          <p className="text-[10px] font-bold tracking-widest uppercase text-gray-600 mb-3">Objectifs — Victoires vs Défaites</p>
          <div className="bg-dark-card border border-dark-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-dark-border/60">
                  <th className="text-left px-4 py-2.5 text-[10px] font-bold tracking-widest uppercase text-gray-600"></th>
                  <th className="text-center px-3 py-2.5 text-[10px] font-bold tracking-widest uppercase text-emerald-700">Victoires</th>
                  <th className="text-center px-3 py-2.5 text-[10px] font-bold tracking-widest uppercase text-red-800">Défaites</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { label: 'KDA', vW: f(result.winsStats.avgKda), vL: f(result.lossesStats.avgKda) },
                  ...(result.winsStats.avgDragonKills != null ? [{ label: 'Dragons', vW: f(result.winsStats.avgDragonKills), vL: f(result.lossesStats.avgDragonKills) }] : []),
                  ...(result.winsStats.avgBaronKills != null ? [{ label: 'Barons', vW: f(result.winsStats.avgBaronKills), vL: f(result.lossesStats.avgBaronKills) }] : []),
                  ...(result.winsStats.avgTowerKills != null ? [{ label: 'Tours', vW: f(result.winsStats.avgTowerKills), vL: f(result.lossesStats.avgTowerKills) }] : []),
                  ...(result.winsStats.firstBloodRate != null ? [{ label: '1er sang', vW: pct(result.winsStats.firstBloodRate), vL: pct(result.lossesStats.firstBloodRate ?? 0) }] : []),
                  ...(result.winsStats.firstDragonRate != null ? [{ label: '1er dragon', vW: pct(result.winsStats.firstDragonRate), vL: pct(result.lossesStats.firstDragonRate ?? 0) }] : []),
                  ...(result.winsStats.firstTowerRate != null ? [{ label: '1ère tour', vW: pct(result.winsStats.firstTowerRate), vL: pct(result.lossesStats.firstTowerRate ?? 0) }] : []),
                  ...(result.winsStats.avgGameDuration != null ? [{ label: 'Durée moy.', vW: fMin(result.winsStats.avgGameDuration), vL: fMin(result.lossesStats.avgGameDuration) }] : []),
                ].map((row, i) => (
                  <tr key={row.label} className={`border-b border-dark-border/30 last:border-0 ${i % 2 === 0 ? '' : 'bg-dark-bg/30'}`}>
                    <td className="px-4 py-2.5 text-gray-500 text-xs">{row.label}</td>
                    <td className="text-center px-3 py-2.5 text-emerald-400 font-semibold">{row.vW}</td>
                    <td className="text-center px-3 py-2.5 text-red-400 font-semibold">{row.vL}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Stats par rôle */}
      {result.roleStats.length > 0 && (
        <div>
          <p className="text-[10px] font-bold tracking-widest uppercase text-gray-600 mb-3">Performance par rôle</p>
          <div className="bg-dark-card border border-dark-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-dark-border/60">
                  <th className="text-left px-4 py-2.5 text-[10px] font-bold tracking-widest uppercase text-gray-600">Rôle</th>
                  <th className="text-center px-3 py-2.5 text-[10px] font-bold tracking-widest uppercase text-gray-600">KDA</th>
                  <th className="text-center px-3 py-2.5 text-[10px] font-bold tracking-widest uppercase text-gray-600">K/D/A</th>
                  {result.roleStats[0]?.avgDamage != null && <th className="text-center px-3 py-2.5 text-[10px] font-bold tracking-widest uppercase text-gray-600">Dégâts</th>}
                  <th className="text-left px-3 py-2.5 text-[10px] font-bold tracking-widest uppercase text-gray-600">Champions</th>
                </tr>
              </thead>
              <tbody>
                {result.roleStats.map((r, i) => (
                  <tr key={r.role} className={`border-b border-dark-border/30 last:border-0 ${i % 2 === 0 ? '' : 'bg-dark-bg/30'}`}>
                    <td className="px-4 py-2.5 text-white font-semibold text-xs">{ROLE_LABEL[r.role] ?? r.role}</td>
                    <td className={`text-center px-3 py-2.5 font-semibold ${kdaColor(r.avgKda)}`}>{r.avgKda.toFixed(1)}</td>
                    <td className="text-center px-3 py-2.5 text-gray-500 text-xs">{r.avgKills.toFixed(1)}/{r.avgDeaths.toFixed(1)}/{r.avgAssists.toFixed(1)}</td>
                    {result.roleStats[0]?.avgDamage != null && <td className="text-center px-3 py-2.5 text-gray-400">{r.avgDamage != null ? fmtK(r.avgDamage) : '—'}</td>}
                    <td className="px-3 py-2.5">
                      <div className="flex gap-1.5 items-center">
                        {r.topChampions.slice(0, 3).map(c => (
                          <img key={c} src={getChampionImage(c)} alt={c} title={getChampionDisplayName(c)}
                            className="w-6 h-6 rounded object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Top champions */}
      {result.topChampions.length > 0 && (
        <div>
          <p className="text-[10px] font-bold tracking-widest uppercase text-gray-600 mb-3">Champions les + joués</p>
          <div className="bg-dark-card border border-dark-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-dark-border/60">
                  <th className="text-left px-4 py-2.5 text-[10px] font-bold tracking-widest uppercase text-gray-600">Champion</th>
                  <th className="text-center px-3 py-2.5 text-[10px] font-bold tracking-widest uppercase text-gray-600">Rôle</th>
                  <th className="text-center px-3 py-2.5 text-[10px] font-bold tracking-widest uppercase text-gray-600">P</th>
                  <th className="text-center px-3 py-2.5 text-[10px] font-bold tracking-widest uppercase text-gray-600">WR</th>
                  <th className="text-center px-3 py-2.5 text-[10px] font-bold tracking-widest uppercase text-gray-600">KDA</th>
                </tr>
              </thead>
              <tbody>
                {result.topChampions.slice(0, 10).map((c, i) => (
                  <tr key={`${c.name}-${c.role}`} className={`border-b border-dark-border/30 last:border-0 ${i % 2 === 0 ? '' : 'bg-dark-bg/30'}`}>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <img src={getChampionImage(c.name)} alt={c.name} className="w-7 h-7 rounded-lg object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                        <span className="text-white font-medium text-sm">{getChampionDisplayName(c.name)}</span>
                      </div>
                    </td>
                    <td className="text-center px-3 py-2.5 text-gray-500 text-xs">{ROLE_LABEL[c.role] ?? c.role}</td>
                    <td className="text-center px-3 py-2.5 text-gray-400">{c.games}</td>
                    <td className={`text-center px-3 py-2.5 font-semibold ${winRateColor(c.winRate)}`}>{pct(c.winRate)}</td>
                    <td className={`text-center px-3 py-2.5 font-semibold ${kdaColor(c.kda)}`}>{c.kda.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Onglet Algo ──────────────────────────────────────────────────────────────

function TabAlgo({
  result, type, cachedText, onCache,
}: {
  result: TeamAnalysisResult
  type: 'analyse' | 'rapport'
  cachedText: string
  onCache: (text: string) => void
}) {
  const [loading, setLoading] = useState(false)

  const handleGenerate = () => {
    setLoading(true)
    onCache('')
    setTimeout(() => {
      const text = type === 'analyse' ? computeAnalyse(result) : computeRapport(result)
      onCache(text)
      setLoading(false)
    }, 400)
  }

  const content     = cachedText
  const isAnalyse   = type === 'analyse'
  const Icon        = isAnalyse ? Brain : ClipboardList
  const title       = isAnalyse ? 'Analyse collective' : 'Rapport de coaching'
  const description = isAnalyse
    ? 'Patterns victoires/défaites · Objectifs · Synergies par rôle'
    : 'Priorités d\'entraînement · Actions concrètes · Métriques cibles'

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={36} className="animate-spin text-accent-blue mx-auto mb-4" />
          <p className="text-gray-500 font-medium">{isAnalyse ? 'Analyse en cours…' : 'Génération du rapport…'}</p>
        </div>
      </div>
    )
  }

  if (!content) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-accent-blue/10 border border-accent-blue/20 flex items-center justify-center mx-auto mb-4">
            <Icon size={28} className="text-accent-blue/60" />
          </div>
          <h3 className="font-display font-bold text-white text-lg mb-2">{title}</h3>
          <p className="text-sm text-gray-500 mb-6">{description}</p>
          <button
            onClick={handleGenerate}
            className="px-6 py-2.5 bg-accent-blue hover:bg-accent-blue/90 text-white rounded-xl font-semibold text-sm transition-colors shadow-lg shadow-accent-blue/20"
          >
            {isAnalyse ? 'Générer l\'analyse →' : 'Générer le rapport →'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <Icon size={16} className="text-accent-blue" />
          <h3 className="font-display font-bold text-white">{title}</h3>
        </div>
        <button onClick={handleGenerate} className="text-xs text-gray-600 hover:text-gray-400 transition-colors">
          Regénérer
        </button>
      </div>
      <MarkdownBlock text={content} />
    </motion.div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export const TeamAnalysePage = () => {
  const { team } = useTeam()
  const { sidebarOpen, setSidebarOpen } = useLayout()
  const navigate = useNavigate()

  useEffect(() => {
    setSidebarOpen(false)
    return () => setSidebarOpen(true)
  }, [setSidebarOpen])

  const [datePreset, setDatePreset]     = useState<DatePresetId>('season')
  const [dateFrom, setDateFrom]         = useState(SEASON_START)
  const [dateTo, setDateTo]             = useState(TODAY)
  const [matchType, setMatchType]       = useState<MatchTypeFilter>('all')
  const [analysisStatus, setAnalysisStatus] = useState<AnalysisStatus>('idle')
  const [analysisResult, setAnalysisResult] = useState<TeamAnalysisResult | null>(null)
  const [activeTab, setActiveTab]       = useState<ResultTab>('resume')
  const [cachedContent, setCachedContent] = useState<Record<string, string>>({})

  const applyPreset = (id: DatePresetId) => {
    setDatePreset(id)
    if (id === 'season') {
      setDateFrom(SEASON_START); setDateTo(TODAY)
    } else if (id === '30d') {
      const d = new Date(); d.setDate(d.getDate() - 30)
      setDateFrom(d.toISOString().split('T')[0]); setDateTo(TODAY)
    } else if (id === '7d') {
      const d = new Date(); d.setDate(d.getDate() - 7)
      setDateFrom(d.toISOString().split('T')[0]); setDateTo(TODAY)
    }
  }

  const handleLaunch = async () => {
    if (!team) return
    setAnalysisStatus('loading')
    setAnalysisResult(null)
    setActiveTab('resume')
    setCachedContent({})

    const fromMs = new Date(dateFrom).getTime()
    const toMs   = new Date(dateTo).getTime() + 86_400_000

    let query = supabase
      .from('team_matches')
      .select(`
        id, game_creation, game_duration, our_win, our_team_id, match_type, objectives,
        team_match_participants (
          player_id, role, team_side, kills, deaths, assists,
          total_damage_dealt_to_champions, gold_earned, cs, vision_score, champion_name, win
        )
      `)
      .eq('team_id', team.id)
      .gte('game_creation', fromMs)
      .lte('game_creation', toMs)
      .gte('game_duration', REMAKE_THRESHOLD)
      .order('game_creation', { ascending: false })

    if (matchType !== 'all') {
      query = query.eq('match_type', matchType)
    }

    const { data, error } = await query

    if (error) { setAnalysisStatus('error'); return }

    const matches = (data ?? []) as {
      id: string
      game_creation: number
      game_duration: number
      our_win: boolean
      our_team_id: number | null
      match_type: string | null
      objectives: Record<string, Record<string, number | boolean>> | null
      team_match_participants: {
        player_id: string | null
        role: string | null
        team_side: string | null
        kills: number
        deaths: number
        assists: number
        total_damage_dealt_to_champions: number | null
        gold_earned: number | null
        cs: number | null
        vision_score: number | null
        champion_name: string | null
        win: boolean
      }[]
    }[]

    if (matches.length === 0) { setAnalysisStatus('empty'); return }

    const n     = matches.length
    const wins  = matches.filter(m => m.our_win)
    const losses = matches.filter(m => !m.our_win)

    // Participants de notre côté uniquement
    const ourParticipants = (list: typeof matches) =>
      list.flatMap(m => m.team_match_participants.filter(p => p.team_side === 'our' || p.win === m.our_win))

    // Durée
    const durAll = matches.filter(m => m.game_duration > 0)
    const avgGameDuration = durAll.length ? durAll.reduce((s, m) => s + m.game_duration, 0) / durAll.length : null

    // KDA global (nos joueurs)
    const allOur = ourParticipants(matches)
    const avgKills   = allOur.length ? allOur.reduce((s, p) => s + (p.kills ?? 0), 0) / allOur.length : 0
    const avgDeaths  = allOur.length ? allOur.reduce((s, p) => s + (p.deaths ?? 0), 0) / allOur.length : 0
    const avgAssists = allOur.length ? allOur.reduce((s, p) => s + (p.assists ?? 0), 0) / allOur.length : 0
    const avgKda     = (avgKills + avgAssists) / Math.max(avgDeaths, 1)

    // Objectifs
    const objAll = matches.filter(m => m.objectives != null && m.our_team_id != null)
    const getObj = (match: typeof matches[0]) => {
      if (!match.objectives || !match.our_team_id) return null
      return match.objectives[String(match.our_team_id)] ?? null
    }

    const objAvg = (list: typeof matches, key: string): number | null => {
      const withObj = list.filter(m => getObj(m)?.[key] != null)
      return withObj.length ? withObj.reduce((s, m) => s + (Number(getObj(m)![key]) || 0), 0) / withObj.length : null
    }
    const firstRate = (list: typeof matches, key: string): number | null => {
      const withObj = list.filter(m => getObj(m)?.[key] != null)
      return withObj.length ? withObj.filter(m => getObj(m)![key] === true || Number(getObj(m)![key]) === 1).length / withObj.length : null
    }

    const hasObjectives = objAll.length > 0

    const avgDragonKills = objAvg(matches, 'dragonKills')
    const avgBaronKills  = objAvg(matches, 'baronKills')
    const avgTowerKills  = objAvg(matches, 'towerKills')
    const firstBloodRate = firstRate(matches, 'firstBlood')
    const firstDragonRate = firstRate(matches, 'firstDragon')
    const firstBaronRate = firstRate(matches, 'firstBaron')
    const firstTowerRate = firstRate(matches, 'firstTower')

    // Calcul split stats (V/D)
    const calcSplit = (list: typeof matches): TeamSplitStats => {
      if (list.length === 0) return {
        games: 0, avgKda: 0, avgKills: 0, avgDeaths: 0, avgAssists: 0,
        avgDragonKills: null, avgBaronKills: null, avgTowerKills: null, avgGameDuration: null,
        firstBloodRate: null, firstDragonRate: null, firstBaronRate: null, firstTowerRate: null,
      }
      const parts = ourParticipants(list)
      const k = parts.length ? parts.reduce((s, p) => s + (p.kills ?? 0), 0) / parts.length : 0
      const d = parts.length ? parts.reduce((s, p) => s + (p.deaths ?? 0), 0) / parts.length : 0
      const a = parts.length ? parts.reduce((s, p) => s + (p.assists ?? 0), 0) / parts.length : 0
      const durL = list.filter(m => m.game_duration > 0)
      return {
        games: list.length,
        avgKda: (k + a) / Math.max(d, 1),
        avgKills: k, avgDeaths: d, avgAssists: a,
        avgDragonKills:  objAvg(list, 'dragonKills'),
        avgBaronKills:   objAvg(list, 'baronKills'),
        avgTowerKills:   objAvg(list, 'towerKills'),
        avgGameDuration: durL.length ? durL.reduce((s, m) => s + m.game_duration, 0) / durL.length : null,
        firstBloodRate:  firstRate(list, 'firstBlood'),
        firstDragonRate: firstRate(list, 'firstDragon'),
        firstBaronRate:  firstRate(list, 'firstBaron'),
        firstTowerRate:  firstRate(list, 'firstTower'),
      }
    }

    // Stats par rôle
    const ROLES = ['TOP', 'JUNGLE', 'MID', 'BOT', 'SUPPORT']
    const roleMap = new Map<string, { kills: number; deaths: number; assists: number; dmg: number; dmgG: number; gold: number; goldG: number; cs: number; csG: number; vision: number; visG: number; dur: number; durG: number; games: number; champs: Map<string, number> }>()

    for (const m of matches) {
      for (const p of m.team_match_participants) {
        if (p.team_side !== 'our' && p.win !== m.our_win) continue
        const role = normalizeRole(p.role)
        if (!ROLES.includes(role)) continue
        const r = roleMap.get(role) ?? { kills: 0, deaths: 0, assists: 0, dmg: 0, dmgG: 0, gold: 0, goldG: 0, cs: 0, csG: 0, vision: 0, visG: 0, dur: 0, durG: 0, games: 0, champs: new Map() }
        r.games++
        r.kills += p.kills ?? 0
        r.deaths += p.deaths ?? 0
        r.assists += p.assists ?? 0
        if (p.total_damage_dealt_to_champions != null) { r.dmg += p.total_damage_dealt_to_champions; r.dmgG++ }
        if (p.gold_earned != null) { r.gold += p.gold_earned; r.goldG++ }
        if (p.cs != null && m.game_duration > 0) { r.cs += p.cs; r.csG++ }
        if (p.vision_score != null) { r.vision += p.vision_score; r.visG++ }
        if (m.game_duration > 0) { r.dur += m.game_duration; r.durG++ }
        if (p.champion_name) r.champs.set(p.champion_name, (r.champs.get(p.champion_name) ?? 0) + 1)
        roleMap.set(role, r)
      }
    }

    const roleStats: TeamRoleStats[] = ROLES
      .filter(role => roleMap.has(role))
      .map(role => {
        const r = roleMap.get(role)!
        const k = r.kills / r.games
        const d = r.deaths / r.games
        const a = r.assists / r.games
        const topChamps = [...r.champs.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([c]) => c)
        return {
          role,
          games: r.games,
          avgKda: (k + a) / Math.max(d, 1),
          avgKills: k, avgDeaths: d, avgAssists: a,
          avgDamage: r.dmgG > 0 ? r.dmg / r.dmgG : null,
          avgGold:   r.goldG > 0 ? r.gold / r.goldG : null,
          avgCsPerMin: r.csG > 0 && r.durG > 0 ? (r.cs / r.csG) / ((r.dur / r.durG) / 60) : null,
          avgVision: r.visG > 0 ? r.vision / r.visG : null,
          topChampions: topChamps,
        }
      })

    // Top champions équipe
    const champMap = new Map<string, { role: string; games: number; wins: number; kills: number; deaths: number; assists: number }>()
    for (const m of matches) {
      for (const p of m.team_match_participants) {
        if (!p.champion_name) continue
        if (p.team_side !== 'our' && p.win !== m.our_win) continue
        const key = `${p.champion_name}|${normalizeRole(p.role)}`
        const c = champMap.get(key) ?? { role: normalizeRole(p.role), games: 0, wins: 0, kills: 0, deaths: 0, assists: 0 }
        c.games++
        if (p.win) c.wins++
        c.kills += p.kills ?? 0; c.deaths += p.deaths ?? 0; c.assists += p.assists ?? 0
        champMap.set(key, c)
      }
    }
    const topChampions: TeamChampionStat[] = [...champMap.entries()]
      .map(([key, s]) => ({
        name: key.split('|')[0],
        role: s.role,
        games: s.games,
        wins: s.wins,
        winRate: s.wins / s.games,
        kda: (s.kills / s.games + s.assists / s.games) / Math.max(s.deaths / s.games, 1),
      }))
      .sort((a, b) => b.games - a.games)
      .slice(0, 15)

    setAnalysisResult({
      totalGames: n, wins: wins.length, winRate: wins.length / n,
      avgGameDuration, avgKda, avgKills, avgDeaths, avgAssists,
      avgDragonKills, avgBaronKills, avgTowerKills,
      firstBloodRate, firstDragonRate, firstBaronRate, firstTowerRate,
      hasObjectives,
      winsStats:   calcSplit(wins),
      lossesStats: calcSplit(losses),
      roleStats,
      topChampions,
      dateFrom, dateTo,
      matchType,
    })
    setAnalysisStatus('done')
  }

  const TABS: { id: ResultTab; label: string; icon: React.ElementType }[] = [
    { id: 'resume',  label: 'Résumé',   icon: FileText     },
    { id: 'analyse', label: 'Analyse',  icon: Brain        },
    { id: 'rapport', label: 'Rapport',  icon: ClipboardList },
  ]

  return (
    <div className="-m-6 flex overflow-hidden" style={{ height: 'calc(100vh - 5rem)' }}>

      {/* ── Panneau config ──────────────────────────────────────────────── */}
      <div className="w-72 shrink-0 bg-dark-card border-r border-dark-border flex flex-col">
        <div className="px-4 pt-4 pb-3 border-b border-dark-border shrink-0">
          <div className="flex items-center justify-between mb-3">
            <button onClick={() => navigate('/team/analyse')} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-white transition-colors">
              <ArrowLeft size={13} /> Retour
            </button>
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1.5 rounded-lg text-gray-600 hover:text-white hover:bg-dark-bg/60 transition-colors" title={sidebarOpen ? 'Replier' : 'Afficher la navigation'}>
              {sidebarOpen ? <PanelLeftClose size={14} /> : <PanelLeftOpen size={14} />}
            </button>
          </div>
          <h2 className="font-display text-sm font-bold text-white">Configuration</h2>
          <p className="text-[11px] text-gray-500 mt-0.5">Analyse collective · Matchs d'équipe</p>
        </div>

        <div className="flex-1 flex flex-col overflow-y-auto">
          {/* Période */}
          <div className="px-4 py-4">
            <p className="text-[10px] font-bold tracking-widest uppercase text-gray-600 mb-3">Période</p>
            <div className="grid grid-cols-2 gap-1.5 mb-3">
              {DATE_PRESETS.filter(p => p.id !== 'custom').map((p) => (
                <button key={p.id} onClick={() => applyPreset(p.id)} className={`px-2 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                  datePreset === p.id ? 'bg-accent-blue/15 border-accent-blue/40 text-accent-blue' : 'border-dark-border text-gray-500 hover:text-white hover:border-gray-600'
                }`}>{p.label}</button>
              ))}
            </div>
            <p className="text-[11px] text-gray-600">
              {new Date(dateFrom).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
              {' – '}
              {new Date(dateTo).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
            </p>
          </div>

          <div className="border-t border-dark-border/40 mx-4" />

          {/* Type de match */}
          <div className="px-4 py-4">
            <p className="text-[10px] font-bold tracking-widest uppercase text-gray-600 mb-3">Type de match</p>
            <div className="space-y-1.5">
              {([
                { id: 'all',        label: 'Tous les matchs' },
                { id: 'scrim',      label: 'Scrims uniquement' },
                { id: 'tournament', label: 'Tournois uniquement' },
              ] as { id: MatchTypeFilter; label: string }[]).map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setMatchType(opt.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm border transition-colors text-left ${
                    matchType === opt.id ? 'border-accent-blue/40 bg-accent-blue/8 text-white' : 'border-dark-border text-gray-500 hover:text-gray-300'
                  }`}
                >
                  <div className={`w-3.5 h-3.5 rounded-full border-2 transition-colors shrink-0 ${matchType === opt.id ? 'border-accent-blue bg-accent-blue' : 'border-gray-600'}`} />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="shrink-0 px-4 py-3 border-t border-dark-border">
          <button
            onClick={handleLaunch}
            disabled={!team || analysisStatus === 'loading'}
            className={`w-full py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
              team && analysisStatus !== 'loading'
                ? 'bg-accent-blue hover:bg-accent-blue/90 text-white shadow-lg shadow-accent-blue/20'
                : 'bg-dark-bg border border-dark-border text-gray-600 cursor-not-allowed'
            }`}
          >
            {analysisStatus === 'loading' ? (
              <><Loader2 size={15} className="animate-spin" /> Chargement…</>
            ) : team ? 'Lancer l\'analyse →' : 'Aucune équipe'}
          </button>
        </div>
      </div>

      {/* ── Zone résultat ────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden bg-dark-bg">

        {analysisStatus === 'done' && analysisResult && (
          <div className="shrink-0 border-b border-dark-border bg-dark-card px-6 flex items-center gap-1 pt-3">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-t-xl border-b-2 transition-colors ${
                  activeTab === id
                    ? 'text-accent-blue border-accent-blue bg-accent-blue/5'
                    : 'text-gray-500 border-transparent hover:text-gray-300'
                }`}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            {analysisStatus === 'idle' && (
              <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full flex items-center justify-center">
                <div className="text-center">
                  <div className="w-20 h-20 rounded-3xl bg-dark-card border border-dark-border flex items-center justify-center mx-auto mb-5">
                    <Search size={32} className="text-gray-700" />
                  </div>
                  <p className="text-gray-500 font-medium">Configurez et lancez l'analyse</p>
                  <p className="text-gray-700 text-sm mt-1">Les stats d'équipe apparaîtront ici</p>
                </div>
              </motion.div>
            )}
            {analysisStatus === 'loading' && (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full flex items-center justify-center">
                <div className="text-center">
                  <Loader2 size={40} className="animate-spin text-accent-blue mx-auto mb-4" />
                  <p className="text-gray-500 font-medium">Récupération des données…</p>
                </div>
              </motion.div>
            )}
            {analysisStatus === 'empty' && (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full flex items-center justify-center">
                <div className="text-center">
                  <div className="w-20 h-20 rounded-3xl bg-dark-card border border-dark-border flex items-center justify-center mx-auto mb-5">
                    <Search size={32} className="text-gray-700" />
                  </div>
                  <p className="text-gray-500 font-medium">Aucune partie trouvée</p>
                  <p className="text-gray-700 text-sm mt-1">Essayez une plage de dates plus large</p>
                </div>
              </motion.div>
            )}
            {analysisStatus === 'error' && (
              <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full flex items-center justify-center">
                <div className="text-center">
                  <AlertCircle size={40} className="text-red-500 mx-auto mb-4" />
                  <p className="text-gray-400 font-medium">Erreur lors de l'analyse</p>
                </div>
              </motion.div>
            )}
            {analysisStatus === 'done' && analysisResult && (
              <motion.div key={`done-${activeTab}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                {activeTab === 'resume'  && <TabResume  result={analysisResult} />}
                {activeTab === 'analyse' && <TabAlgo result={analysisResult} type="analyse" cachedText={cachedContent['analyse'] ?? ''} onCache={(t) => setCachedContent(p => ({ ...p, analyse: t }))} />}
                {activeTab === 'rapport' && <TabAlgo result={analysisResult} type="rapport" cachedText={cachedContent['rapport'] ?? ''} onCache={(t) => setCachedContent(p => ({ ...p, rapport: t }))} />}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
