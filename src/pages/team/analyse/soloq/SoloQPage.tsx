/**
 * Page Analyse SoloQ — Configuration + Résumé / Analyse / Rapport
 */
import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  ChevronDown, Calendar, Check, X, Search, Settings2,
  ArrowLeft, PanelLeftOpen, PanelLeftClose,
  Loader2, AlertCircle, Trophy, Swords, Eye, Coins,
  TrendingUp, BarChart2, FileText, Brain, ClipboardList,
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

type ResultTab = 'resume' | 'analyse' | 'rapport'
type AnalysisStatus = 'idle' | 'loading' | 'done' | 'error' | 'empty'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtK(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(Math.round(n))
}

function winRateColor(wr: number) {
  if (wr >= 0.55) return 'text-emerald-400'
  if (wr >= 0.45) return 'text-yellow-400'
  return 'text-red-400'
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

// ─── Markdown renderer (simple) ───────────────────────────────────────────────

function MarkdownBlock({ text }: { text: string }) {
  const lines = text.split('\n')
  return (
    <div className="space-y-1.5 text-sm leading-relaxed">
      {lines.map((line, i) => {
        if (line.startsWith('## ')) {
          return (
            <h3 key={i} className="font-display font-bold text-white text-base mt-5 mb-2 first:mt-0">
              {line.slice(3)}
            </h3>
          )
        }
        if (line.startsWith('**') && line.endsWith('**')) {
          return <p key={i} className="font-semibold text-gray-300">{line.slice(2, -2)}</p>
        }
        // Inline bold **...**
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

function MetricCard({ icon: Icon, label, value, valueClass = 'text-white', sub }: {
  icon: React.ElementType
  label: string
  value: string
  valueClass?: string
  sub?: string
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

function TabResume({ result, axes }: { result: AnalysisResult; axes: Set<string> }) {
  const f = (n: number | null, d = 1) => n != null ? n.toFixed(d) : '—'
  const pendingAxes = ALL_AXES.filter(a => !a.computable && axes.has(a.id))
  const dateLabel = `${new Date(result.dateFrom).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })} → ${new Date(result.dateTo).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}`

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="font-display text-xl font-bold text-white">{result.playerName}</h2>
          <p className="text-sm text-gray-500 mt-0.5">{dateLabel}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold font-display text-white">{result.totalGames}</p>
          <p className="text-xs text-gray-600">parties analysées</p>
        </div>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
        {axes.has('consistency') && (
          <MetricCard icon={Trophy} label="Winrate" value={`${Math.round(result.winRate * 100)}%`} valueClass={winRateColor(result.winRate)} sub={`${result.wins}V / ${result.totalGames - result.wins}D`} />
        )}
        {axes.has('trading') && (
          <MetricCard icon={Swords} label="KDA" value={f(result.kda)} valueClass={kdaColor(result.kda)} sub={`${f(result.avgKills)} / ${f(result.avgDeaths)} / ${f(result.avgAssists)}`} />
        )}
        {axes.has('deaths') && (
          <MetricCard icon={AlertCircle} label="Morts / partie" value={f(result.avgDeaths)} valueClass={result.avgDeaths <= 3 ? 'text-emerald-400' : result.avgDeaths <= 5 ? 'text-yellow-400' : 'text-red-400'} sub={`KDA global : ${f(result.kda)}`} />
        )}
        {axes.has('cs') && result.avgCsPerMin != null && (
          <MetricCard icon={BarChart2} label="CS / min" value={f(result.avgCsPerMin)} valueClass={result.avgCsPerMin >= 8 ? 'text-emerald-400' : result.avgCsPerMin >= 6 ? 'text-yellow-400' : 'text-orange-400'} sub={`${f(result.avgCs)} CS moy. / partie`} />
        )}
        {axes.has('vision') && result.avgVision != null && (
          <MetricCard icon={Eye} label="Vision score" value={f(result.avgVision, 0)} sub="score moy. / partie" />
        )}
        {axes.has('gold') && result.avgGold != null && (
          <MetricCard icon={Coins} label="Or / partie" value={fmtK(result.avgGold)} sub={result.avgDamage != null ? `${fmtK(result.avgDamage)} dégâts moy.` : undefined} />
        )}
        {!axes.has('gold') && result.avgDamage != null && axes.has('trading') && (
          <MetricCard icon={TrendingUp} label="Dégâts / partie" value={fmtK(result.avgDamage)} />
        )}
      </div>

      {/* Victoires vs Défaites */}
      <div>
        <p className="text-[10px] font-bold tracking-widest uppercase text-gray-600 mb-3">Victoires vs Défaites</p>
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
                { label: 'KDA', vW: f(result.winsStats.avgKDA), vL: f(result.lossesStats.avgKDA) },
                { label: 'Morts moy.', vW: f(result.winsStats.avgDeaths), vL: f(result.lossesStats.avgDeaths) },
                ...(result.avgCsPerMin != null ? [{ label: 'CS / min', vW: f(result.winsStats.avgCsPerMin), vL: f(result.lossesStats.avgCsPerMin) }] : []),
                ...(result.avgVision != null ? [{ label: 'Vision', vW: f(result.winsStats.avgVision, 0), vL: f(result.lossesStats.avgVision, 0) }] : []),
                ...(result.avgDamage != null ? [{ label: 'Dégâts', vW: result.winsStats.avgDamage != null ? fmtK(result.winsStats.avgDamage) : '—', vL: result.lossesStats.avgDamage != null ? fmtK(result.lossesStats.avgDamage) : '—' }] : []),
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

      {/* Champions */}
      {axes.has('champion') && result.champions.length > 0 && (
        <div>
          <p className="text-[10px] font-bold tracking-widest uppercase text-gray-600 mb-3">Pool de champions</p>
          <div className="bg-dark-card border border-dark-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-dark-border/60">
                  <th className="text-left px-4 py-2.5 text-[10px] font-bold tracking-widest uppercase text-gray-600">Champion</th>
                  <th className="text-center px-3 py-2.5 text-[10px] font-bold tracking-widest uppercase text-gray-600">P</th>
                  <th className="text-center px-3 py-2.5 text-[10px] font-bold tracking-widest uppercase text-gray-600">WR</th>
                  <th className="text-center px-3 py-2.5 text-[10px] font-bold tracking-widest uppercase text-gray-600">KDA</th>
                  {result.champions[0]?.avgCs != null && <th className="text-center px-3 py-2.5 text-[10px] font-bold tracking-widest uppercase text-gray-600">CS</th>}
                </tr>
              </thead>
              <tbody>
                {result.champions.slice(0, 10).map((c, i) => (
                  <tr key={c.name} className={`border-b border-dark-border/30 last:border-0 ${i % 2 === 0 ? '' : 'bg-dark-bg/30'}`}>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <img src={getChampionImage(c.name)} alt={c.name} className="w-7 h-7 rounded-lg object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                        <span className="text-white font-medium text-sm">{getChampionDisplayName(c.name)}</span>
                      </div>
                    </td>
                    <td className="text-center px-3 py-2.5 text-gray-400">{c.games}</td>
                    <td className={`text-center px-3 py-2.5 font-semibold ${winRateColor(c.winRate)}`}>{Math.round(c.winRate * 100)}%</td>
                    <td className={`text-center px-3 py-2.5 font-semibold ${kdaColor(c.kda)}`}>{c.kda.toFixed(1)}</td>
                    {result.champions[0]?.avgCs != null && <td className="text-center px-3 py-2.5 text-gray-400">{c.avgCs != null ? c.avgCs.toFixed(0) : '—'}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {pendingAxes.length > 0 && (
        <div className="border border-dashed border-dark-border rounded-xl p-4 flex items-start gap-3">
          <AlertCircle size={15} className="text-gray-700 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-1">Axes disponibles en V2</p>
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
  const [loading, setLoading] = useState(false)

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
        <button onClick={handleGenerate} className="text-xs text-gray-600 hover:text-gray-400 transition-colors">
          Regénérer
        </button>
      </div>
      <MarkdownBlock text={content} />
    </motion.div>
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
    { id: 'resume',  label: 'Résumé',   icon: FileText    },
    { id: 'analyse', label: 'Analyse',  icon: Brain       },
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
      <div className="flex-1 flex flex-col overflow-hidden bg-dark-bg">

        {/* Tab bar — visible uniquement quand analyse faite */}
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
                {activeTab === 'resume'  && <TabResume  result={analysisResult} axes={axes} />}
                {activeTab === 'analyse' && <TabAlgo result={analysisResult} axes={axes} type="analyse" cachedText={cachedContent['analyse'] ?? ''} onCache={(t) => setCachedContent(p => ({ ...p, analyse: t }))} />}
                {activeTab === 'rapport' && <TabAlgo result={analysisResult} axes={axes} type="rapport" cachedText={cachedContent['rapport'] ?? ''} onCache={(t) => setCachedContent(p => ({ ...p, rapport: t }))} />}
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
