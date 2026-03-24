/**
 * Page Analyse SoloQ — Configuration + Résumé / Analyse / Rapport
 */
import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  ChevronDown, Calendar, Check, X, Search, Settings2,
  ArrowLeft, PanelLeftOpen, PanelLeftClose,
  Loader2, AlertCircle, Eye, Coins,
  TrendingUp, BarChart2, FileText, Brain, ClipboardList,
  Copy, Download,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useTeam } from '../../hooks/useTeam'
import { getRankColorText } from '../../joueurs/utils/playerDetailHelpers'
import { SEASON_16_START_MS } from '../../../../lib/constants'
import { useLayout } from '../../../../contexts/LayoutContext'
import { supabase } from '../../../../lib/supabase'
import { getChampionImage, getChampionDisplayName } from '../../../../lib/championImages'
import { computeAnalyse, computeRapport } from './analyseAlgo'
import type { Player } from '../../../../contexts/TeamContext'
import type { SplitStats, ChampionStat, AnalysisResult } from './types'

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

const ALL_AXES = [
  { id: 'deaths',      label: 'Réduire mes morts',     group: 'Combat',     computable: true  },
  { id: 'trading',     label: 'Trades / duels',         group: 'Combat',     computable: true  },
  { id: 'positioning', label: 'Positionnement',         group: 'Combat',     computable: false },
  { id: 'early',       label: 'Early game',             group: 'Macro',      computable: false },
  { id: 'objectives',  label: 'Gestion des objectifs',  group: 'Macro',      computable: false },
  { id: 'macro',       label: 'Macro / décisions',      group: 'Macro',      computable: false },
  { id: 'roaming',     label: 'Roaming',                group: 'Macro',      computable: false },
  { id: 'cs',          label: 'CS / Farm',              group: 'Ressources', computable: true  },
  { id: 'gold',        label: "Gestion de l'or",        group: 'Ressources', computable: true  },
  { id: 'champion',    label: 'Pool de champions',      group: 'Ressources', computable: true  },
  { id: 'consistency', label: 'Consistance',            group: 'Mental',     computable: true  },
  { id: 'vision',      label: 'Vision / wards',         group: 'Mental',     computable: true  },
]

const POSITION_ORDER = ['TOP', 'JUNGLE', 'MID', 'BOT', 'SUPPORT', 'SUP']
const POSITION_LABEL: Record<string, string> = {
  TOP: 'Top', JUNGLE: 'Jungle', MID: 'Mid', BOT: 'Bot', SUPPORT: 'Support', SUP: 'Support',
}

type ResultTab = 'resume' | 'analyse' | 'rapport' | 'evolution'

type RawMatch = {
  win: boolean; kills: number; deaths: number; assists: number
  cs: number | null; vision_score: number | null; total_damage: number | null
  game_duration: number; game_creation: number; champion_name: string | null
}

type MetricId = 'kda' | 'wr' | 'cs' | 'vision'
type AnalysisStatus = 'idle' | 'loading' | 'done' | 'error' | 'empty'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtK(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(Math.round(n))
}

function kdaColor(kda: number) {
  if (kda >= 4)   return 'text-accent-blue'
  if (kda >= 3)   return 'text-emerald-400'
  if (kda >= 2)   return 'text-yellow-400'
  return 'text-orange-400'
}

function splitAvg(matches: { win: boolean }[], key: string, filter?: (m: Record<string, unknown>) => boolean) {
  const arr = matches as Record<string, unknown>[]
  const wins   = arr.filter(m => m.win && (filter ? filter(m) : true))
  const losses = arr.filter(m => !m.win && (filter ? filter(m) : true))
  const avg = (list: Record<string, unknown>[]) =>
    list.length > 0 ? list.reduce((s, m) => s + ((m[key] as number) ?? 0), 0) / list.length : null
  return { wins: avg(wins), losses: avg(losses) }
}

// ─── Markdown renderer redesigned ─────────────────────────────────────────────

function MarkdownBlock({ text }: { text: string }) {
  const SECTION_COLORS = ['#60a5fa', '#a78bfa', '#34d399', '#f59e0b', '#fb923c']
  let colorIdx = -1

  const lines = text.split('\n')
  return (
    <div className="space-y-0.5 text-sm leading-relaxed">
      {lines.map((line, i) => {
        if (line.startsWith('## ')) {
          colorIdx++
          const c = SECTION_COLORS[colorIdx % SECTION_COLORS.length]
          return (
            <div key={i} className="flex items-center gap-3 pt-6 pb-2 first:pt-0">
              <div className="w-0.5 h-5 rounded-full shrink-0" style={{ background: c, boxShadow: `0 0 8px ${c}` }} />
              <h3 className="font-display font-black text-white text-sm uppercase tracking-[0.12em]"
                  style={{ textShadow: `0 0 20px ${c}50` }}>
                {line.slice(3)}
              </h3>
            </div>
          )
        }
        if (line.startsWith('**') && line.endsWith('**')) {
          return <p key={i} className="font-bold text-white/90 mt-2 mb-1">{line.slice(2, -2)}</p>
        }
        if (line.includes('**')) {
          const c = SECTION_COLORS[Math.max(colorIdx, 0) % SECTION_COLORS.length]
          const parts = line.split(/(\*\*[^*]+\*\*)/)
          return (
            <p key={i} className="text-gray-400">
              {parts.map((part, j) =>
                part.startsWith('**') && part.endsWith('**')
                  ? <strong key={j} className="font-semibold" style={{ color: c }}>{part.slice(2, -2)}</strong>
                  : part
              )}
            </p>
          )
        }
        if (line.startsWith('- ') || line.startsWith('• ')) {
          const c = SECTION_COLORS[Math.max(colorIdx, 0) % SECTION_COLORS.length]
          return (
            <div key={i} className="flex items-start gap-2.5 text-gray-400 py-0.5 pl-1">
              <span className="w-1.5 h-1.5 rounded-full mt-[5px] shrink-0 flex-none"
                    style={{ background: c + 'aa', boxShadow: `0 0 5px ${c}` }} />
              <span>{line.slice(2)}</span>
            </div>
          )
        }
        if (line.trim() === '') return <div key={i} className="h-1" />
        return <p key={i} className="text-gray-500 text-xs">{line}</p>
      })}
    </div>
  )
}

// ─── Modal axes ───────────────────────────────────────────────────────────────

function AxesModal({ axes, onClose, onApply }: {
  axes: Set<string>
  onClose: () => void
  onApply: (next: Set<string>) => void
}) {
  const [local, setLocal] = useState(() => new Set(axes))

  const toggle = (id: string) => setLocal((prev) => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  const allSelected = local.size === ALL_AXES.length
  const toggleAll   = () => setLocal(allSelected ? new Set() : new Set(ALL_AXES.map(a => a.id)))
  const groups      = [...new Set(ALL_AXES.map(a => a.group))]

  const modal = (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.15 }}
        className="bg-dark-card border border-dark-border rounded-2xl w-full max-w-lg flex flex-col"
        style={{ maxHeight: 'calc(100vh - 2rem)' }}
      >
        <div className="shrink-0 flex items-center justify-between p-5 border-b border-dark-border">
          <div>
            <h3 className="font-display text-lg font-bold">Axes d'analyse</h3>
            <p className="text-xs text-gray-500 mt-0.5">{local.size} / {ALL_AXES.length} sélectionnés</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleAll}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                allSelected ? 'bg-accent-blue/15 border-accent-blue/40 text-accent-blue' : 'border-dark-border text-gray-400 hover:text-white'
              }`}
            >TOUT</button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-dark-bg transition-colors"><X size={16} /></button>
          </div>
        </div>
        <div className="overflow-y-auto flex-1 min-h-0 p-5 space-y-5">
          {groups.map((group) => (
            <div key={group}>
              <p className="text-[10px] font-bold tracking-widest uppercase text-gray-600 mb-2">{group}</p>
              <div className="space-y-1.5">
                {ALL_AXES.filter(a => a.group === group).map((ax) => (
                  <button
                    key={ax.id}
                    onClick={() => toggle(ax.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-colors ${
                      local.has(ax.id) ? 'border-accent-blue/30 bg-accent-blue/8 text-white' : 'border-dark-border text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                      local.has(ax.id) ? 'bg-accent-blue border-accent-blue' : 'border-gray-600'
                    }`}>
                      {local.has(ax.id) && <Check size={10} className="text-white" strokeWidth={3} />}
                    </div>
                    <span className="text-sm flex-1">{ax.label}</span>
                    {!ax.computable && (
                      <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-dark-bg border border-dark-border text-gray-600">V2</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="shrink-0 flex items-center justify-between p-5 border-t border-dark-border">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white rounded-xl border border-dark-border hover:border-gray-600 transition-colors">
            Annuler
          </button>
          <button
            onClick={() => { onApply(local); onClose() }}
            className="flex items-center gap-2 px-5 py-2 bg-accent-blue hover:bg-accent-blue/90 text-white rounded-xl text-sm font-medium transition-colors"
          >
            <Check size={14} /> Appliquer
          </button>
        </div>
      </motion.div>
    </div>
  )
  return createPortal(modal, document.body)
}

// ─── Player selector ──────────────────────────────────────────────────────────

function PlayerSelector({ players, selected, onSelect }: {
  players: Player[]
  selected: Player | null
  onSelect: (p: Player) => void
}) {
  const [open, setOpen] = useState(false)
  const sorted = [...players].sort((a, b) => {
    const ia = POSITION_ORDER.indexOf(a.position?.toUpperCase() ?? '')
    const ib = POSITION_ORDER.indexOf(b.position?.toUpperCase() ?? '')
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
  })
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors text-left ${
          open ? 'border-accent-blue/50 bg-dark-bg' : 'border-dark-border bg-dark-bg hover:border-accent-blue/30'
        }`}
      >
        {selected ? (
          <>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{selected.player_name}</p>
              <p className="text-[11px] text-gray-500 truncate">{selected.pseudo}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {selected.position && <span className="text-[10px] text-gray-500 uppercase">{POSITION_LABEL[selected.position.toUpperCase()] ?? selected.position}</span>}
              {selected.rank && <span className="text-xs font-bold" style={{ color: getRankColorText(selected.rank) }}>{selected.rank}</span>}
            </div>
          </>
        ) : (
          <span className="text-sm text-gray-500 flex-1">Sélectionner un joueur…</span>
        )}
        <ChevronDown size={15} className={`text-gray-500 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute top-full mt-1.5 left-0 right-0 z-50 bg-dark-card border border-dark-border rounded-xl shadow-2xl overflow-hidden">
          {sorted.length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-4">Aucun joueur dans l'équipe</p>
          ) : (
            <ul className="py-1.5">
              {sorted.map((p) => (
                <li key={p.id}>
                  <button
                    onClick={() => { onSelect(p); setOpen(false) }}
                    className={`w-full flex items-center gap-3 px-3 py-2 hover:bg-dark-bg/60 transition-colors text-left ${selected?.id === p.id ? 'bg-accent-blue/5' : ''}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${selected?.id === p.id ? 'text-accent-blue' : 'text-white'}`}>{p.player_name}</p>
                      <p className="text-[11px] text-gray-600 truncate">{p.pseudo}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {p.position && <span className="text-[10px] text-gray-500 uppercase">{POSITION_LABEL[p.position.toUpperCase()] ?? p.position}</span>}
                      {p.rank && <span className="text-xs font-bold" style={{ color: getRankColorText(p.rank) }}>{p.rank}</span>}
                      {selected?.id === p.id && <Check size={13} className="text-accent-blue" />}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Metric card ──────────────────────────────────────────────────────────────

function MetricCard({ icon: Icon, label, value, valueClass = 'text-white', sub, accent }: {
  icon: React.ElementType
  label: string
  value: string
  valueClass?: string
  sub?: string
  accent?: string
}) {
  return (
    <div className="relative rounded-xl p-4 flex flex-col gap-1 overflow-hidden"
      style={{
        background: 'rgba(255,255,255,0.025)',
        border: `1px solid ${accent ? accent + '28' : 'rgba(255,255,255,0.07)'}`,
      }}>
      {accent && (
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: `radial-gradient(ellipse at 0% 0%, ${accent}0f 0%, transparent 65%)` }} />
      )}
      <div className="flex items-center gap-2 mb-1 relative">
        <Icon size={13} className="text-gray-600 shrink-0" />
        <p className="text-[10px] font-bold tracking-widest uppercase text-gray-600">{label}</p>
      </div>
      <p className={`text-2xl font-bold font-display relative ${valueClass}`}
         style={accent ? { textShadow: `0 0 20px ${accent}55` } : undefined}>
        {value}
      </p>
      {sub && <p className="text-[11px] text-gray-600 relative">{sub}</p>}
      {accent && (
        <div className="absolute bottom-0 left-0 right-0 h-px"
             style={{ background: `linear-gradient(to right, transparent, ${accent}55, transparent)` }} />
      )}
    </div>
  )
}

// ─── Radial gauge SVG ─────────────────────────────────────────────────────────

function RadialGauge({ pct, wins, losses, color = '#60a5fa', size = 112 }: {
  pct: number; wins: number; losses: number; color?: string; size?: number
}) {
  const r = 38
  const circ = 2 * Math.PI * r
  const dash = Math.min(Math.max(pct, 0), 1) * circ

  return (
    <div className="flex flex-col items-center gap-2 shrink-0">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox="0 0 100 100" style={{ overflow: 'visible' }}>
          <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="7" />
          <circle
            cx="50" cy="50" r={r}
            fill="none"
            stroke={color}
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circ}`}
            transform="rotate(-90 50 50)"
            style={{ filter: `drop-shadow(0 0 5px ${color})` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display font-black text-white leading-none"
                style={{ fontSize: size * 0.21, textShadow: `0 0 18px ${color}60` }}>
            {Math.round(pct * 100)}%
          </span>
          <span className="text-gray-600 uppercase tracking-widest leading-none mt-0.5"
                style={{ fontSize: size * 0.087 }}>
            WR
          </span>
        </div>
      </div>
      <div className="flex items-center gap-3 text-xs font-bold">
        <span className="text-emerald-400">{wins}V</span>
        <span className="text-gray-700">/</span>
        <span className="text-red-400">{losses}D</span>
      </div>
    </div>
  )
}

// ─── Compare bar (V vs D) ─────────────────────────────────────────────────────

function CompareBar({ label, winVal, lossVal, format }: {
  label: string; winVal: number | null; lossVal: number | null; format: (n: number) => string
}) {
  if (winVal == null && lossVal == null) return null
  const wn = winVal ?? 0
  const ln = lossVal ?? 0
  const maxVal = Math.max(wn, ln, 0.001)
  const wPct = (wn / maxVal) * 100
  const lPct = (ln / maxVal) * 100

  return (
    <div className="py-1">
      <div className="flex items-center gap-2">
        <span className="w-16 text-[9px] uppercase tracking-widest text-gray-600 shrink-0 text-right">{label}</span>
        <span className="w-9 text-right text-[11px] font-semibold text-emerald-400 shrink-0">
          {winVal != null ? format(winVal) : '—'}
        </span>
        <div className="flex-1 flex items-center gap-0.5">
          <div className="flex-1 h-1.5 flex justify-end" style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '999px 0 0 999px' }}>
            <div className="h-full rounded-l-full transition-all duration-500"
                 style={{ width: `${wPct}%`, background: 'rgba(34,197,94,0.55)', boxShadow: '0 0 6px rgba(34,197,94,0.3)' }} />
          </div>
          <div className="w-px h-3 bg-white/10 shrink-0" />
          <div className="flex-1 h-1.5" style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '0 999px 999px 0' }}>
            <div className="h-full rounded-r-full transition-all duration-500"
                 style={{ width: `${lPct}%`, background: 'rgba(239,68,68,0.55)', boxShadow: '0 0 6px rgba(239,68,68,0.3)' }} />
          </div>
        </div>
        <span className="w-9 text-[11px] font-semibold text-red-400 shrink-0">
          {lossVal != null ? format(lossVal) : '—'}
        </span>
      </div>
    </div>
  )
}

// ─── Champion card ────────────────────────────────────────────────────────────

function ChampCard({ c }: { c: ChampionStat }) {
  const wr = Math.round(c.winRate * 100)
  const col = wr >= 55 ? '#22c55e' : wr >= 45 ? '#f59e0b' : '#ef4444'
  return (
    <div className="relative rounded-xl p-3 flex flex-col items-center gap-2 overflow-hidden cursor-default"
         style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="absolute inset-0 pointer-events-none"
           style={{ background: `radial-gradient(ellipse at 50% 0%, ${col}0c 0%, transparent 70%)` }} />
      <div className="relative">
        <img src={getChampionImage(c.name)} alt={c.name}
             className="w-10 h-10 rounded-lg object-cover"
             onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
        <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 text-[8px] font-black px-1.5 py-0.5 rounded-full leading-none whitespace-nowrap"
             style={{ background: col, color: col === '#f59e0b' ? '#000' : '#fff', boxShadow: `0 0 6px ${col}80` }}>
          {wr}%
        </div>
      </div>
      <p className="text-[10px] text-white font-semibold truncate w-full text-center mt-1">
        {getChampionDisplayName(c.name)}
      </p>
      <p className="text-[9px] text-gray-600">{c.games}P · {c.kda.toFixed(1)} KDA</p>
    </div>
  )
}

// ─── Onglet Résumé ────────────────────────────────────────────────────────────

function TabResume({ result, axes }: { result: AnalysisResult; axes: Set<string> }) {
  const fv = (n: number | null, d = 1) => n != null ? n.toFixed(d) : '—'
  const pendingAxes = ALL_AXES.filter(a => !a.computable && axes.has(a.id))
  const dateLabel = `${new Date(result.dateFrom).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })} → ${new Date(result.dateTo).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}`
  const losses = result.totalGames - result.wins
  const wrColor = result.winRate >= 0.55 ? '#22c55e' : result.winRate >= 0.45 ? '#f59e0b' : '#ef4444'

  return (
    <div className="p-6 space-y-7">

      {/* ── Hero section ── */}
      <div className="flex items-start justify-between gap-6">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            {result.playerPosition && (
              <span className="text-[9px] font-black tracking-widest uppercase px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(96,165,250,0.12)', border: '1px solid rgba(96,165,250,0.3)', color: '#60a5fa' }}>
                {POSITION_LABEL[result.playerPosition?.toUpperCase() ?? ''] ?? result.playerPosition}
              </span>
            )}
            {result.playerRank && (
              <span className="text-[9px] font-black tracking-widest uppercase px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(167,139,250,0.10)', border: '1px solid rgba(167,139,250,0.25)', color: '#a78bfa' }}>
                {result.playerRank}
              </span>
            )}
          </div>
          <h2 className="font-display text-2xl font-black text-white"
              style={{ textShadow: '0 0 30px rgba(96,165,250,0.25)' }}>
            {result.playerName}
          </h2>
          <p className="text-xs text-gray-600 mt-0.5">{dateLabel} · {result.totalGames} parties</p>

          {/* KDA hero numbers */}
          {axes.has('trading') && (
            <div className="mt-4 flex items-baseline gap-1.5">
              <span className="font-display font-black text-3xl leading-none" style={{ color: '#60a5fa', textShadow: '0 0 20px rgba(96,165,250,0.4)' }}>
                {fv(result.avgKills)}
              </span>
              <span className="text-gray-700 text-xl">/</span>
              <span className="font-display font-black text-3xl leading-none text-red-400" style={{ textShadow: '0 0 20px rgba(239,68,68,0.3)' }}>
                {fv(result.avgDeaths)}
              </span>
              <span className="text-gray-700 text-xl">/</span>
              <span className="font-display font-black text-3xl leading-none text-emerald-400" style={{ textShadow: '0 0 20px rgba(34,197,94,0.3)' }}>
                {fv(result.avgAssists)}
              </span>
              <div className="ml-3 flex flex-col justify-center">
                <span className={`font-display font-black text-xl leading-none ${kdaColor(result.kda)}`}
                      style={{ textShadow: '0 0 12px currentColor' }}>
                  {fv(result.kda)}
                </span>
                <span className="text-[8px] uppercase tracking-widest text-gray-600 mt-0.5">KDA</span>
              </div>
            </div>
          )}
        </div>

        {/* WR radial gauge */}
        {axes.has('consistency') && (
          <RadialGauge pct={result.winRate} wins={result.wins} losses={losses} color={wrColor} />
        )}
      </div>

      {/* ── Metric cards ── */}
      <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
        {axes.has('cs') && result.avgCsPerMin != null && (
          <MetricCard icon={BarChart2} label="CS / min" value={fv(result.avgCsPerMin)} accent="#34d399"
            valueClass={result.avgCsPerMin >= 8 ? 'text-emerald-400' : result.avgCsPerMin >= 6 ? 'text-yellow-400' : 'text-orange-400'}
            sub={`${fv(result.avgCs)} CS moy. / partie`} />
        )}
        {axes.has('vision') && result.avgVision != null && (
          <MetricCard icon={Eye} label="Vision" value={fv(result.avgVision, 0)} accent="#a78bfa" sub="score moy. / partie" />
        )}
        {axes.has('gold') && result.avgGold != null && (
          <MetricCard icon={Coins} label="Or / partie" value={fmtK(result.avgGold)} accent="#f59e0b"
            sub={result.avgDamage != null ? `${fmtK(result.avgDamage)} dégâts moy.` : undefined} />
        )}
        {!axes.has('gold') && result.avgDamage != null && axes.has('trading') && (
          <MetricCard icon={TrendingUp} label="Dégâts / partie" value={fmtK(result.avgDamage)} accent="#fb923c" />
        )}
        {axes.has('deaths') && (
          <MetricCard icon={AlertCircle} label="Morts / partie" value={fv(result.avgDeaths)} accent="#ef4444"
            valueClass={result.avgDeaths <= 3 ? 'text-emerald-400' : result.avgDeaths <= 5 ? 'text-yellow-400' : 'text-red-400'}
            sub={`KDA : ${fv(result.kda)}`} />
        )}
      </div>

      {/* ── V/D Comparison bars ── */}
      {(result.winsStats.games > 0 || result.lossesStats.games > 0) && (
        <div>
          <div className="flex items-center gap-3 mb-3">
            <p className="text-[10px] font-bold tracking-widest uppercase text-gray-600 shrink-0">Victoires vs Défaites</p>
            <div className="flex-1 h-px" style={{ background: 'linear-gradient(to right, rgba(255,255,255,0.06), transparent)' }} />
            <div className="flex items-center gap-2 text-[10px] font-bold shrink-0">
              <span className="text-emerald-500">{result.wins}V</span>
              <span className="text-gray-700">/</span>
              <span className="text-red-500">{losses}D</span>
            </div>
          </div>
          <div className="rounded-xl px-4 py-2" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <CompareBar label="KDA" winVal={result.winsStats.avgKDA} lossVal={result.lossesStats.avgKDA} format={n => n.toFixed(2)} />
            <CompareBar label="Morts" winVal={result.winsStats.avgDeaths} lossVal={result.lossesStats.avgDeaths} format={n => n.toFixed(1)} />
            {result.avgCsPerMin != null && <CompareBar label="CS/min" winVal={result.winsStats.avgCsPerMin} lossVal={result.lossesStats.avgCsPerMin} format={n => n.toFixed(1)} />}
            {result.avgVision != null && <CompareBar label="Vision" winVal={result.winsStats.avgVision} lossVal={result.lossesStats.avgVision} format={n => n.toFixed(0)} />}
            {result.avgDamage != null && <CompareBar label="Dégâts" winVal={result.winsStats.avgDamage} lossVal={result.lossesStats.avgDamage} format={n => fmtK(n)} />}
          </div>
        </div>
      )}

      {/* ── Champion cards ── */}
      {axes.has('champion') && result.champions.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-3">
            <p className="text-[10px] font-bold tracking-widest uppercase text-gray-600 shrink-0">Pool de champions</p>
            <div className="flex-1 h-px" style={{ background: 'linear-gradient(to right, rgba(255,255,255,0.06), transparent)' }} />
          </div>
          <div className="grid grid-cols-3 xl:grid-cols-4 gap-2">
            {result.champions.slice(0, 8).map((c) => <ChampCard key={c.name} c={c} />)}
          </div>
        </div>
      )}

      {pendingAxes.length > 0 && (
        <div className="rounded-xl p-4 flex items-start gap-3"
             style={{ border: '1px dashed rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.015)' }}>
          <AlertCircle size={14} className="text-gray-700 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-1">Axes disponibles en V2</p>
            <p className="text-xs text-gray-700">{pendingAxes.map(a => a.label).join(' · ')}</p>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Onglet Algo (Analyse / Rapport) ─────────────────────────────────────────

function TabAlgo({
  result, axes, type, cachedText, onCache,
}: {
  result: AnalysisResult
  axes: Set<string>
  type: 'analyse' | 'rapport'
  cachedText: string
  onCache: (text: string) => void
}) {
  const [loading, setLoading]   = useState(false)
  const [copied, setCopied]     = useState(false)

  const handleGenerate = () => {
    setLoading(true)
    onCache('')
    // Petit délai pour l'UX (calcul instantané mais on montre un loader bref)
    setTimeout(() => {
      const text = type === 'analyse'
        ? computeAnalyse(result, axes)
        : computeRapport(result, axes)
      onCache(text)
      setLoading(false)
    }, 400)
  }

  const content = cachedText

  const handleCopy = () => {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `${result.playerName}_${type}_${result.dateFrom}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const isAnalyse   = type === 'analyse'
  const Icon        = isAnalyse ? Brain : ClipboardList
  const title       = isAnalyse ? 'Analyse' : 'Rapport de coaching'
  const description = isAnalyse
    ? 'Patterns victoires/défaites · Points forts & faibles · Corrélations clés'
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
        <div className="flex items-center gap-1">
          <button
            onClick={handleCopy}
            title="Copier"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-gray-500 hover:text-white hover:bg-dark-card border border-transparent hover:border-dark-border transition-all"
          >
            {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
            {copied ? 'Copié !' : 'Copier'}
          </button>
          <button
            onClick={handleDownload}
            title="Télécharger"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-gray-500 hover:text-white hover:bg-dark-card border border-transparent hover:border-dark-border transition-all"
          >
            <Download size={12} />
            .txt
          </button>
          <div className="w-px h-3.5 bg-dark-border mx-1" />
          <button onClick={handleGenerate} className="text-xs text-gray-600 hover:text-gray-400 transition-colors px-1">
            Regénérer
          </button>
        </div>
      </div>
      <MarkdownBlock text={content} />
    </motion.div>
  )
}

// ─── Onglet Évolution ────────────────────────────────────────────────────────

const METRICS: { id: MetricId; label: string; format: (n: number) => string; color: string }[] = [
  { id: 'kda',    label: 'KDA',      format: n => n.toFixed(2),                       color: '#60a5fa' },
  { id: 'wr',     label: 'WR%',      format: n => `${Math.round(n * 100)}%`,           color: '#a78bfa' },
  { id: 'cs',     label: 'CS/min',   format: n => n.toFixed(1),                       color: '#34d399' },
  { id: 'vision', label: 'Vision',   format: n => Math.round(n).toString(),            color: '#fbbf24' },
]

function getMatchValue(m: RawMatch, metric: MetricId): number | null {
  switch (metric) {
    case 'kda':    return (m.kills + m.assists) / Math.max(m.deaths, 1)
    case 'wr':     return m.win ? 1 : 0
    case 'cs':     return m.cs != null && m.game_duration > 0 ? m.cs / (m.game_duration / 60) : null
    case 'vision': return m.vision_score
  }
}

function rollingAvg(values: (number | null)[], window: number, i: number): number | null {
  const slice = values.slice(Math.max(0, i - window + 1), i + 1).filter(v => v != null) as number[]
  return slice.length > 0 ? slice.reduce((s, v) => s + v, 0) / slice.length : null
}

function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return ''
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`
  for (let i = 0; i < pts.length - 1; i++) {
    const cpX = ((pts[i].x + pts[i + 1].x) / 2).toFixed(1)
    d += ` C ${cpX} ${pts[i].y.toFixed(1)}, ${cpX} ${pts[i + 1].y.toFixed(1)}, ${pts[i + 1].x.toFixed(1)} ${pts[i + 1].y.toFixed(1)}`
  }
  return d
}

function TrendChart({ matches, metric, window: W }: { matches: RawMatch[]; metric: MetricId; window: number }) {
  const cfg = METRICS.find(m => m.id === metric)!

  const values = matches.map(m => getMatchValue(m, metric))
  const rolling = values.map((_, i) => rollingAvg(values, W, i))

  // Filtrer les valeurs nulles pour les bornes Y
  const allVals = [...values, ...rolling].filter(v => v != null) as number[]
  if (allVals.length < 2) return <div className="h-40 flex items-center justify-center text-gray-700 text-sm">Pas assez de données</div>

  const yMin = Math.max(0, Math.min(...allVals) * 0.85)
  const yMax = Math.max(...allVals) * 1.1

  const PAD = { top: 20, right: 16, bottom: 36, left: 44 }
  const VW = 680; const VH = 180
  const IW = VW - PAD.left - PAD.right
  const IH = VH - PAD.top - PAD.bottom

  const toX = (i: number) => PAD.left + (i / Math.max(matches.length - 1, 1)) * IW
  const toY = (v: number) => PAD.top + IH - ((v - yMin) / Math.max(yMax - yMin, 0.001)) * IH

  // Points de la courbe moyenne mobile (sans null)
  const trendPts = rolling
    .map((v, i) => v != null ? { x: toX(i), y: toY(v) } : null)
    .filter(Boolean) as { x: number; y: number }[]

  // Graduations Y (4 niveaux)
  const yTicks = Array.from({ length: 4 }, (_, i) => yMin + (yMax - yMin) * (i / 3))

  // Graduations X (dates — tous les ~5 points)
  const step = Math.max(1, Math.ceil(matches.length / 6))
  const xTicks = matches
    .map((m, i) => i % step === 0 || i === matches.length - 1 ? { i, label: new Date(m.game_creation).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) } : null)
    .filter(Boolean) as { i: number; label: string }[]

  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} width="100%" className="overflow-visible">
      {/* Grille horizontale */}
      {yTicks.map((v, i) => (
        <g key={i}>
          <line x1={PAD.left} x2={PAD.left + IW} y1={toY(v)} y2={toY(v)} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
          <text x={PAD.left - 6} y={toY(v)} textAnchor="end" dominantBaseline="middle" fontSize={10} fill="#6b7280">
            {cfg.format(v)}
          </text>
        </g>
      ))}

      {/* Axe X labels */}
      {xTicks.map(({ i, label }) => (
        <text key={i} x={toX(i)} y={VH - 6} textAnchor="middle" fontSize={9} fill="#6b7280">{label}</text>
      ))}

      {/* Zone remplie sous la courbe tendance */}
      {trendPts.length >= 2 && (
        <path
          d={`${smoothPath(trendPts)} L ${trendPts[trendPts.length - 1].x} ${PAD.top + IH} L ${trendPts[0].x} ${PAD.top + IH} Z`}
          fill={cfg.color} fillOpacity={0.06}
        />
      )}

      {/* Courbe tendance */}
      {trendPts.length >= 2 && (
        <path d={smoothPath(trendPts)} fill="none" stroke={cfg.color} strokeWidth={2} strokeLinecap="round" />
      )}

      {/* Points par partie */}
      {matches.map((m, i) => {
        const v = values[i]
        if (v == null) return null
        return (
          <circle key={i} cx={toX(i)} cy={toY(v)} r={3.5}
            fill={m.win ? '#22c55e' : '#ef4444'}
            stroke="rgba(0,0,0,0.4)" strokeWidth={1}
          >
            <title>{`${new Date(m.game_creation).toLocaleDateString('fr-FR')} — ${m.champion_name ?? '?'}\n${cfg.label}: ${cfg.format(v)}\n${m.win ? 'Victoire' : 'Défaite'}`}</title>
          </circle>
        )
      })}
    </svg>
  )
}

function TabEvolution({ matches, playerName }: { matches: RawMatch[]; playerName: string }) {
  const [metric, setMetric]   = useState<MetricId>('kda')
  const [window, setWindow]   = useState(10)

  const cfg = METRICS.find(m => m.id === metric)!

  // Résumé : moyenne des N dernières parties vs N premières
  const recent = matches.slice(-10)
  const early  = matches.slice(0, 10)

  const avg = (list: RawMatch[], m: MetricId) => {
    const vals = list.map(x => getMatchValue(x, m)).filter(v => v != null) as number[]
    return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null
  }

  const recentAvg = avg(recent, metric)
  const earlyAvg  = avg(early,  metric)
  const trend = recentAvg != null && earlyAvg != null && earlyAvg > 0
    ? ((recentAvg - earlyAvg) / earlyAvg) * 100
    : null

  if (matches.length < 3) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="text-center">
          <TrendingUp size={40} className="text-gray-700 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">Pas assez de parties</p>
          <p className="text-gray-700 text-sm mt-1">Il faut au moins 3 parties pour afficher une évolution</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-display text-base font-bold text-white">{playerName} — Évolution</h2>
          <p className="text-xs text-gray-500 mt-0.5">{matches.length} parties · chronologique</p>
        </div>
        {/* Fenêtre */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] text-gray-600 font-bold tracking-widest uppercase mr-1">Fenêtre</span>
          {[5, 10, 20].map(w => (
            <button key={w} onClick={() => setWindow(w)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors ${window === w ? 'bg-accent-blue/15 border-accent-blue/40 text-accent-blue' : 'border-dark-border text-gray-500 hover:text-white'}`}
            >{w}</button>
          ))}
        </div>
      </div>

      {/* Sélecteur métrique */}
      <div className="flex gap-1.5 flex-wrap">
        {METRICS.map(m => (
          <button key={m.id} onClick={() => setMetric(m.id)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${metric === m.id ? 'text-white border-transparent' : 'border-dark-border text-gray-500 hover:text-gray-300'}`}
            style={metric === m.id ? { background: m.color + '33', borderColor: m.color + '66', color: m.color } : {}}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Graphique */}
      <div className="bg-dark-card border border-dark-border rounded-xl p-4">
        <TrendChart matches={matches} metric={metric} window={window} />
        <div className="flex items-center gap-4 mt-3 text-[11px] text-gray-600">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Victoire</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" /> Défaite</span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-6 h-0.5 rounded-full" style={{ background: cfg.color }} />
            Moy. mobile ({window} parties)
          </span>
        </div>
      </div>

      {/* Tendance résumée */}
      {matches.length >= 10 && recentAvg != null && earlyAvg != null && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-dark-card border border-dark-border rounded-xl p-3 text-center">
            <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-1">10 premières</p>
            <p className="text-lg font-bold font-display text-white">{cfg.format(earlyAvg)}</p>
          </div>
          <div className="bg-dark-card border border-dark-border rounded-xl p-3 text-center">
            <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-1">10 dernières</p>
            <p className="text-lg font-bold font-display text-white">{cfg.format(recentAvg)}</p>
          </div>
          <div className={`border rounded-xl p-3 text-center ${trend == null ? 'bg-dark-card border-dark-border' : trend >= 5 ? 'bg-emerald-500/10 border-emerald-500/30' : trend <= -5 ? 'bg-red-500/10 border-red-500/30' : 'bg-dark-card border-dark-border'}`}>
            <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-1">Tendance</p>
            <p className={`text-lg font-bold font-display ${trend == null ? 'text-gray-500' : trend >= 5 ? 'text-emerald-400' : trend <= -5 ? 'text-red-400' : 'text-gray-400'}`}>
              {trend == null ? '—' : `${trend >= 0 ? '+' : ''}${trend.toFixed(0)}%`}
            </p>
          </div>
        </div>
      )}

      {/* 5 dernières parties */}
      <div>
        <p className="text-[10px] font-bold tracking-widest uppercase text-gray-600 mb-3">5 dernières parties</p>
        <div className="space-y-1.5">
          {[...matches].slice(-5).reverse().map((m, i) => {
            const v = getMatchValue(m, metric)
            return (
              <div key={i} className={`flex items-center gap-3 px-3 py-2 rounded-xl border text-sm ${m.win ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-red-500/15 bg-red-500/5'}`}>
                <span className={`text-xs font-bold w-4 ${m.win ? 'text-emerald-400' : 'text-red-400'}`}>{m.win ? 'V' : 'D'}</span>
                <span className="text-gray-500 text-xs flex-1">
                  {m.champion_name ?? '?'} · {new Date(m.game_creation).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                </span>
                <span className="font-semibold text-white text-xs">{v != null ? cfg.format(v) : '—'}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export const SoloQPage = () => {
  const { players } = useTeam()
  const { sidebarOpen, setSidebarOpen } = useLayout()
  const navigate = useNavigate()

  useEffect(() => {
    setSidebarOpen(false)
    return () => setSidebarOpen(true)
  }, [setSidebarOpen])

  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)
  const [datePreset, setDatePreset]         = useState<DatePresetId>('season')
  const [dateFrom, setDateFrom]             = useState(SEASON_START)
  const [dateTo, setDateTo]                 = useState(TODAY)
  const [axes, setAxes]                     = useState<Set<string>>(() => new Set(ALL_AXES.map(a => a.id)))
  const [axesModalOpen, setAxesModalOpen]   = useState(false)
  const [analysisStatus, setAnalysisStatus] = useState<AnalysisStatus>('idle')
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [rawMatches, setRawMatches]         = useState<RawMatch[]>([])
  const [activeTab, setActiveTab]           = useState<ResultTab>('resume')
  const [cachedContent, setCachedContent]   = useState<Record<string, string>>({})

  const dateFromRef = useRef<HTMLInputElement>(null)
  const dateToRef   = useRef<HTMLInputElement>(null)

  const canLaunch = !!selectedPlayer

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
    } else {
      setTimeout(() => dateFromRef.current?.showPicker?.(), 50)
    }
  }

  const allAxesSelected = axes.size === ALL_AXES.length
  const toggleAll = () => setAxes(allAxesSelected ? new Set() : new Set(ALL_AXES.map(a => a.id)))

  const handleLaunch = async () => {
    if (!selectedPlayer) return
    setAnalysisStatus('loading')
    setAnalysisResult(null)
    setRawMatches([])
    setActiveTab('resume')
    setCachedContent({})

    const fromMs = new Date(dateFrom).getTime()
    const toMs   = new Date(dateTo).getTime() + 86_400_000

    const { data, error } = await supabase
      .from('player_soloq_matches')
      .select('win, kills, deaths, assists, cs, gold_earned, vision_score, total_damage, game_duration, game_creation, champion_name')
      .eq('player_id', selectedPlayer.id)
      .gte('game_creation', fromMs)
      .lte('game_creation', toMs)
      .gte('game_duration', REMAKE_THRESHOLD)
      .order('game_creation', { ascending: false })

    if (error) { setAnalysisStatus('error'); return }

    const matches = (data ?? []) as {
      win: boolean; kills: number; deaths: number; assists: number
      cs: number | null; gold_earned: number | null; vision_score: number | null
      total_damage: number | null; game_duration: number; game_creation: number
      champion_name: string | null
    }[]

    if (matches.length === 0) { setAnalysisStatus('empty'); return }

    const n     = matches.length
    const wins  = matches.filter(m => m.win)
    const losses = matches.filter(m => !m.win)
    const sumAll = (key: keyof typeof matches[0]) =>
      matches.reduce((s, m) => s + ((m[key] as number) ?? 0), 0) / n

    const avgKills   = sumAll('kills')
    const avgDeaths  = sumAll('deaths')
    const avgAssists = sumAll('assists')
    const kda        = (avgKills + avgAssists) / Math.max(avgDeaths, 1)

    const csAll     = matches.filter(m => m.cs != null && m.game_duration > 0)
    const avgCs     = csAll.length ? csAll.reduce((s, m) => s + m.cs!, 0) / csAll.length : null
    const avgCsPerMin = csAll.length ? csAll.reduce((s, m) => s + m.cs! / (m.game_duration / 60), 0) / csAll.length : null

    const visAll   = matches.filter(m => m.vision_score != null)
    const avgVision = visAll.length ? visAll.reduce((s, m) => s + m.vision_score!, 0) / visAll.length : null

    const goldAll  = matches.filter(m => m.gold_earned != null)
    const avgGold  = goldAll.length ? goldAll.reduce((s, m) => s + m.gold_earned!, 0) / goldAll.length : null

    const dmgAll   = matches.filter(m => m.total_damage != null)
    const avgDamage = dmgAll.length ? dmgAll.reduce((s, m) => s + m.total_damage!, 0) / dmgAll.length : null

    const durAll  = matches.filter(m => m.game_duration > 0)
    const avgGameDuration = durAll.length ? durAll.reduce((s, m) => s + m.game_duration, 0) / durAll.length : null

    // Breakdown victoires / défaites
    const calcSplit = (list: typeof matches): SplitStats => {
      if (list.length === 0) return {
        games: 0, winRate: 0, avgKDA: 0, avgDeaths: 0,
        avgCsPerMin: null, avgVision: null, avgVisionPerMin: null,
        avgDamage: null, avgDmgPerMin: null, avgGold: null, avgGoldPerMin: null, avgGameDuration: null,
      }
      const k = list.reduce((s, m) => s + m.kills, 0) / list.length
      const d = list.reduce((s, m) => s + m.deaths, 0) / list.length
      const a = list.reduce((s, m) => s + m.assists, 0) / list.length
      const csL    = list.filter(m => m.cs != null && m.game_duration > 0)
      const visL   = list.filter(m => m.vision_score != null)
      const visMinL = list.filter(m => m.vision_score != null && m.game_duration > 0)
      const dmgL   = list.filter(m => m.total_damage != null)
      const dmgMinL = list.filter(m => m.total_damage != null && m.game_duration > 0)
      const goldL  = list.filter(m => m.gold_earned != null)
      const goldMinL = list.filter(m => m.gold_earned != null && m.game_duration > 0)
      const durL   = list.filter(m => m.game_duration > 0)
      return {
        games: list.length,
        winRate: list.filter(m => m.win).length / list.length,
        avgKDA: (k + a) / Math.max(d, 1),
        avgDeaths: d,
        avgCsPerMin:    csL.length    ? csL.reduce((s, m)    => s + m.cs!            / (m.game_duration / 60), 0) / csL.length    : null,
        avgVision:      visL.length   ? visL.reduce((s, m)   => s + m.vision_score!, 0)                          / visL.length    : null,
        avgVisionPerMin:visMinL.length? visMinL.reduce((s, m)=> s + m.vision_score!  / (m.game_duration / 60), 0)/ visMinL.length : null,
        avgDamage:      dmgL.length   ? dmgL.reduce((s, m)   => s + m.total_damage!, 0)                          / dmgL.length    : null,
        avgDmgPerMin:   dmgMinL.length? dmgMinL.reduce((s, m)=> s + m.total_damage!  / (m.game_duration / 60), 0)/ dmgMinL.length : null,
        avgGold:        goldL.length  ? goldL.reduce((s, m)  => s + m.gold_earned!, 0)                           / goldL.length   : null,
        avgGoldPerMin:  goldMinL.length? goldMinL.reduce((s, m)=> s + m.gold_earned! / (m.game_duration / 60), 0)/ goldMinL.length: null,
        avgGameDuration:durL.length   ? durL.reduce((s, m)   => s + m.game_duration, 0)                          / durL.length    : null,
      }
    }

    // Champions
    const champMap = new Map<string, { games: number; wins: number; kills: number; deaths: number; assists: number; cs: number; csGames: number; dmg: number; dmgGames: number }>()
    for (const m of matches) {
      if (!m.champion_name) continue
      const c = champMap.get(m.champion_name) ?? { games: 0, wins: 0, kills: 0, deaths: 0, assists: 0, cs: 0, csGames: 0, dmg: 0, dmgGames: 0 }
      c.games++
      if (m.win) c.wins++
      c.kills += m.kills ?? 0; c.deaths += m.deaths ?? 0; c.assists += m.assists ?? 0
      if (m.cs != null)           { c.cs  += m.cs;          c.csGames++  }
      if (m.total_damage != null) { c.dmg += m.total_damage; c.dmgGames++ }
      champMap.set(m.champion_name, c)
    }

    const champions: ChampionStat[] = [...champMap.entries()]
      .map(([name, s]) => ({
        name, games: s.games, wins: s.wins, winRate: s.wins / s.games,
        kda: (s.kills / s.games + s.assists / s.games) / Math.max(s.deaths / s.games, 1),
        avgCs:     s.csGames  > 0 ? s.cs  / s.csGames  : null,
        avgDamage: s.dmgGames > 0 ? s.dmg / s.dmgGames : null,
      }))
      .sort((a, b) => b.games - a.games)

    // Force TS to treat splitAvg return as expected (unused helper, clean unused import)
    void splitAvg

    // Stocke les matchs bruts en ordre chronologique (pour le graphe évolution)
    setRawMatches([...matches].reverse())

    setAnalysisResult({
      totalGames: n, wins: wins.length, winRate: wins.length / n,
      avgKills, avgDeaths, avgAssists, kda,
      avgCs, avgCsPerMin, avgVision, avgGold, avgDamage, avgGameDuration,
      winsStats:   calcSplit(wins),
      lossesStats: calcSplit(losses),
      champions,
      playerName:     selectedPlayer.player_name,
      playerPosition: selectedPlayer.position ?? undefined,
      playerRank:     selectedPlayer.rank ?? undefined,
      dateFrom, dateTo,
    })
    setAnalysisStatus('done')
  }

  const TABS: { id: ResultTab; label: string; icon: React.ElementType }[] = [
    { id: 'resume',    label: 'Résumé',    icon: FileText     },
    { id: 'analyse',   label: 'Analyse',   icon: Brain        },
    { id: 'rapport',   label: 'Rapport',   icon: ClipboardList },
    { id: 'evolution', label: 'Évolution', icon: TrendingUp   },
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
          <p className="text-[11px] text-gray-500 mt-0.5">Solo Queue · Analyse individuelle</p>
        </div>

        <div className="flex-1 flex flex-col overflow-y-auto">
          <div className="px-4 py-4">
            <p className="text-[10px] font-bold tracking-widest uppercase text-gray-600 mb-3">Joueur</p>
            <PlayerSelector players={players} selected={selectedPlayer} onSelect={(p) => { setSelectedPlayer(p); setAnalysisStatus('idle') }} />
          </div>
          <div className="border-t border-dark-border/40 mx-4" />
          <div className="px-4 py-4">
            <p className="text-[10px] font-bold tracking-widest uppercase text-gray-600 mb-3">Période</p>
            <div className="grid grid-cols-2 gap-1.5 mb-3">
              {DATE_PRESETS.map((p) => (
                <button key={p.id} onClick={() => applyPreset(p.id)} className={`px-2 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                  datePreset === p.id ? 'bg-accent-blue/15 border-accent-blue/40 text-accent-blue' : 'border-dark-border text-gray-500 hover:text-white hover:border-gray-600'
                }`}>{p.label}</button>
              ))}
            </div>
            {datePreset === 'custom' ? (
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <p className="text-[10px] text-gray-600 mb-1">Du</p>
                  <div className="relative">
                    <Calendar size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" />
                    <input ref={dateFromRef} type="date" value={dateFrom} min={SEASON_START} max={dateTo} onChange={(e) => setDateFrom(e.target.value)} className="w-full pl-7 pr-2 py-1.5 bg-dark-bg border border-dark-border rounded-lg text-xs text-gray-300 focus:outline-none focus:border-accent-blue/50 cursor-pointer" />
                  </div>
                </div>
                <div className="text-gray-700 mt-4 text-xs shrink-0">→</div>
                <div className="flex-1">
                  <p className="text-[10px] text-gray-600 mb-1">Au</p>
                  <div className="relative">
                    <Calendar size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" />
                    <input ref={dateToRef} type="date" value={dateTo} min={dateFrom} max={TODAY} onChange={(e) => setDateTo(e.target.value)} className="w-full pl-7 pr-2 py-1.5 bg-dark-bg border border-dark-border rounded-lg text-xs text-gray-300 focus:outline-none focus:border-accent-blue/50 cursor-pointer" />
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-gray-600">
                {new Date(dateFrom).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                {' – '}
                {new Date(dateTo).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
              </p>
            )}
          </div>
          <div className="border-t border-dark-border/40 mx-4" />
          <div className="px-4 py-4">
            <p className="text-[10px] font-bold tracking-widest uppercase text-gray-600 mb-3">Axes à analyser</p>
            <div className="flex items-center gap-2">
              <button onClick={toggleAll} className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${allAxesSelected ? 'bg-accent-blue/15 border-accent-blue/40 text-accent-blue' : 'border-dark-border text-gray-500 hover:text-white'}`}>
                TOUT ({ALL_AXES.length})
              </button>
              <button onClick={() => setAxesModalOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-dark-border text-gray-500 hover:text-white hover:border-gray-600 transition-colors">
                <Settings2 size={12} /> Personnaliser
              </button>
              <span className="ml-auto text-[11px] text-gray-600">{axes.size}/{ALL_AXES.length}</span>
            </div>
          </div>
        </div>

        <div className="shrink-0 px-4 py-3 border-t border-dark-border">
          <button
            onClick={handleLaunch}
            disabled={!canLaunch || analysisStatus === 'loading'}
            className={`w-full py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
              canLaunch && analysisStatus !== 'loading'
                ? 'bg-accent-blue hover:bg-accent-blue/90 text-white shadow-lg shadow-accent-blue/20'
                : 'bg-dark-bg border border-dark-border text-gray-600 cursor-not-allowed'
            }`}
          >
            {analysisStatus === 'loading' ? (
              <><Loader2 size={15} className="animate-spin" /> Chargement…</>
            ) : canLaunch ? 'Lancer l\'analyse →' : 'Sélectionnez un joueur'}
          </button>
        </div>
      </div>

      {/* ── Zone résultat ────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden"
           style={{
             background: '#0b0b14',
             backgroundImage: 'radial-gradient(rgba(255,255,255,0.025) 1px, transparent 1px)',
             backgroundSize: '28px 28px',
           }}>

        {/* Tab bar — visible uniquement quand analyse faite */}
        {analysisStatus === 'done' && analysisResult && (
          <div className="shrink-0 border-b border-white/5 px-6 flex items-end gap-0.5 pt-4 shrink-0"
               style={{ background: 'rgba(255,255,255,0.02)', backdropFilter: 'blur(8px)' }}>
            {TABS.map(({ id, label, icon: Icon }) => {
              const active = activeTab === id
              return (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className="relative flex items-center gap-2 px-4 py-2.5 transition-colors"
                  style={{
                    color: active ? '#60a5fa' : '#6b7280',
                    fontSize: '11px',
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                  }}
                >
                  <Icon size={12} />
                  {label}
                  {active && (
                    <motion.div
                      layoutId="sq-tab-indicator"
                      className="absolute bottom-0 left-2 right-2 h-0.5 rounded-t-full"
                      style={{ background: '#60a5fa', boxShadow: '0 0 8px #60a5fa, 0 0 20px rgba(96,165,250,0.3)' }}
                      transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                    />
                  )}
                </button>
              )
            })}
          </div>
        )}

        {/* Contenu */}
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            {(analysisStatus === 'idle') && (
              <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full flex items-center justify-center">
                <div className="text-center">
                  <div className="w-20 h-20 rounded-3xl bg-dark-card border border-dark-border flex items-center justify-center mx-auto mb-5">
                    <Search size={32} className="text-gray-700" />
                  </div>
                  <p className="text-gray-500 font-medium">Configurez et lancez l'analyse</p>
                  <p className="text-gray-700 text-sm mt-1">Le rapport apparaîtra ici</p>
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
                {activeTab === 'resume'    && <TabResume result={analysisResult} axes={axes} />}
                {activeTab === 'analyse'   && <TabAlgo result={analysisResult} axes={axes} type="analyse" cachedText={cachedContent['analyse'] ?? ''} onCache={(t) => setCachedContent(p => ({ ...p, analyse: t }))} />}
                {activeTab === 'rapport'   && <TabAlgo result={analysisResult} axes={axes} type="rapport" cachedText={cachedContent['rapport'] ?? ''} onCache={(t) => setCachedContent(p => ({ ...p, rapport: t }))} />}
                {activeTab === 'evolution' && <TabEvolution matches={rawMatches} playerName={analysisResult.playerName} />}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {axesModalOpen && (
        <AxesModal axes={axes} onClose={() => setAxesModalOpen(false)} onApply={(next) => setAxes(next)} />
      )}
    </div>
  )
}
