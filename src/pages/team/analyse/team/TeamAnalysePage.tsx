/**
 * Page Analyse Team — Stats collectives scrims/tournois
 * Même layout que SoloQPage : config gauche + 3 onglets résultat
 */
import { useState, useEffect } from 'react'
import {
  ArrowLeft, PanelLeftOpen, PanelLeftClose,
  Loader2, Search, AlertCircle, Coins,
  TrendingUp, FileText, Brain, ClipboardList, Shield, Target,
  Copy, Download, Check,
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

function kdaColor(kda: number) {
  if (kda >= 4)  return 'text-accent-blue'
  if (kda >= 3)  return 'text-emerald-400'
  if (kda >= 2)  return 'text-yellow-400'
  return 'text-orange-400'
}

function normalizeRole(role: string | null): string {
  if (!role) return 'UNKNOWN'
  const r = role.toUpperCase()
  if (r === 'UTILITY' || r === 'SUP' || r === 'DUO_SUPPORT') return 'SUPPORT'
  if (r === 'BOTTOM' || r === 'ADC' || r === 'CARRY' || r === 'DUO_CARRY') return 'BOT'
  if (r === 'JUG')    return 'JUNGLE'
  if (r === 'MIDDLE') return 'MID'
  return r
}

const POSITION_ORDER = ['TOP', 'JUNGLE', 'MID', 'BOT', 'SUPPORT', 'ADC', 'BOTTOM', 'SUP']

// ─── Markdown renderer redesigned ─────────────────────────────────────────────

function MarkdownBlock({ text }: { text: string }) {
  const SECTION_COLORS = ['#a78bfa', '#60a5fa', '#34d399', '#f59e0b', '#fb923c']
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

// ─── Metric card ──────────────────────────────────────────────────────────────

function MetricCard({ icon: Icon, label, value, valueClass = 'text-white', sub, accent }: {
  icon: React.ElementType; label: string; value: string; valueClass?: string; sub?: string; accent?: string
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

function RadialGauge({ pct, wins, losses, color = '#a78bfa', size = 112 }: {
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
        <span className="w-20 text-[9px] uppercase tracking-widest text-gray-600 shrink-0 text-right">{label}</span>
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

// ─── Team champion card ───────────────────────────────────────────────────────

function TeamChampCard({ c }: { c: TeamChampionStat }) {
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
      <p className="text-[9px] text-gray-600">{c.games}P · {ROLE_LABEL[c.role] ?? c.role}</p>
    </div>
  )
}

// ─── Onglet Résumé ────────────────────────────────────────────────────────────

function TabResume({ result }: { result: TeamAnalysisResult }) {
  const dateLabel = `${new Date(result.dateFrom).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })} → ${new Date(result.dateTo).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}`
  const losses = result.totalGames - result.wins
  const wrColor = result.winRate >= 0.55 ? '#22c55e' : result.winRate >= 0.45 ? '#f59e0b' : '#ef4444'

  return (
    <div className="p-6 space-y-7">

      {/* ── Hero section ── */}
      <div className="flex items-start justify-between gap-6">
        <div className="flex-1 min-w-0">
          <h2 className="font-display text-2xl font-black text-white"
              style={{ textShadow: '0 0 30px rgba(167,139,250,0.25)' }}>
            Équipe
          </h2>
          <p className="text-xs text-gray-600 mt-0.5">{dateLabel} · {result.totalGames} parties</p>

          {/* KDA hero numbers */}
          <div className="mt-4 flex items-baseline gap-1.5">
            <span className="font-display font-black text-3xl leading-none" style={{ color: '#60a5fa', textShadow: '0 0 20px rgba(96,165,250,0.4)' }}>
              {f(result.avgKills)}
            </span>
            <span className="text-gray-700 text-xl">/</span>
            <span className="font-display font-black text-3xl leading-none text-red-400" style={{ textShadow: '0 0 20px rgba(239,68,68,0.3)' }}>
              {f(result.avgDeaths)}
            </span>
            <span className="text-gray-700 text-xl">/</span>
            <span className="font-display font-black text-3xl leading-none text-emerald-400" style={{ textShadow: '0 0 20px rgba(34,197,94,0.3)' }}>
              {f(result.avgAssists)}
            </span>
            <div className="ml-3 flex flex-col justify-center">
              <span className={`font-display font-black text-xl leading-none ${kdaColor(result.avgKda)}`}
                    style={{ textShadow: '0 0 12px currentColor' }}>
                {f(result.avgKda)}
              </span>
              <span className="text-[8px] uppercase tracking-widest text-gray-600 mt-0.5">KDA</span>
            </div>
          </div>
        </div>

        {/* WR radial gauge */}
        <RadialGauge pct={result.winRate} wins={result.wins} losses={losses} color={wrColor} />
      </div>

      {/* ── Metric cards ── */}
      <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
        {result.avgGameDuration != null && (
          <MetricCard icon={TrendingUp} label="Durée moy." value={fMin(result.avgGameDuration)} accent="#a78bfa"
            sub={`V: ${fMin(result.winsStats.avgGameDuration)} · D: ${fMin(result.lossesStats.avgGameDuration)}`} />
        )}
        {result.avgDragonKills != null && (
          <MetricCard icon={Shield} label="Dragons/partie" value={f(result.avgDragonKills)} accent="#f59e0b"
            sub={`V: ${f(result.winsStats.avgDragonKills)} · D: ${f(result.lossesStats.avgDragonKills)}`} />
        )}
        {result.avgBaronKills != null && (
          <MetricCard icon={Target} label="Barons/partie" value={f(result.avgBaronKills)} accent="#34d399"
            sub={`V: ${f(result.winsStats.avgBaronKills)} · D: ${f(result.lossesStats.avgBaronKills)}`} />
        )}
        {result.firstBloodRate != null && (
          <MetricCard icon={Coins} label="1er sang" value={pct(result.firstBloodRate)} accent="#fb923c"
            sub={`V: ${pct(result.winsStats.firstBloodRate ?? 0)} · D: ${pct(result.lossesStats.firstBloodRate ?? 0)}`} />
        )}
      </div>

      {/* ── Objectives V vs D ── */}
      {result.hasObjectives && (
        <div>
          <div className="flex items-center gap-3 mb-3">
            <p className="text-[10px] font-bold tracking-widest uppercase text-gray-600 shrink-0">Objectifs — Victoires vs Défaites</p>
            <div className="flex-1 h-px" style={{ background: 'linear-gradient(to right, rgba(255,255,255,0.06), transparent)' }} />
            <div className="flex items-center gap-2 text-[10px] font-bold shrink-0">
              <span className="text-emerald-500">{result.wins}V</span>
              <span className="text-gray-700">/</span>
              <span className="text-red-500">{losses}D</span>
            </div>
          </div>
          <div className="rounded-xl px-4 py-2" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <CompareBar label="KDA" winVal={result.winsStats.avgKda} lossVal={result.lossesStats.avgKda} format={n => n.toFixed(2)} />
            {result.winsStats.avgDragonKills != null && (
              <CompareBar label="Dragons" winVal={result.winsStats.avgDragonKills} lossVal={result.lossesStats.avgDragonKills} format={n => n.toFixed(1)} />
            )}
            {result.winsStats.avgBaronKills != null && (
              <CompareBar label="Barons" winVal={result.winsStats.avgBaronKills} lossVal={result.lossesStats.avgBaronKills} format={n => n.toFixed(1)} />
            )}
            {result.winsStats.avgTowerKills != null && (
              <CompareBar label="Tours" winVal={result.winsStats.avgTowerKills} lossVal={result.lossesStats.avgTowerKills} format={n => n.toFixed(1)} />
            )}
            {result.winsStats.firstBloodRate != null && (
              <CompareBar label="1er sang" winVal={result.winsStats.firstBloodRate} lossVal={result.lossesStats.firstBloodRate} format={n => `${Math.round(n * 100)}%`} />
            )}
            {result.winsStats.firstDragonRate != null && (
              <CompareBar label="1er dragon" winVal={result.winsStats.firstDragonRate} lossVal={result.lossesStats.firstDragonRate} format={n => `${Math.round(n * 100)}%`} />
            )}
            {result.winsStats.firstTowerRate != null && (
              <CompareBar label="1ère tour" winVal={result.winsStats.firstTowerRate} lossVal={result.lossesStats.firstTowerRate} format={n => `${Math.round(n * 100)}%`} />
            )}
          </div>
        </div>
      )}

      {/* ── Role cards ── */}
      {result.roleStats.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-3">
            <p className="text-[10px] font-bold tracking-widest uppercase text-gray-600 shrink-0">Performance par rôle</p>
            <div className="flex-1 h-px" style={{ background: 'linear-gradient(to right, rgba(255,255,255,0.06), transparent)' }} />
          </div>
          <div className="space-y-2">
            {result.roleStats.map((r) => {
              const kdaCol = r.avgKda >= 4 ? '#60a5fa' : r.avgKda >= 3 ? '#22c55e' : r.avgKda >= 2 ? '#f59e0b' : '#ef4444'
              return (
                <div key={r.role} className="flex items-center gap-4 rounded-xl px-4 py-3"
                     style={{ background: 'rgba(255,255,255,0.025)', border: `1px solid ${kdaCol}20` }}>
                  <div className="w-16 shrink-0">
                    <p className="text-xs font-black text-white uppercase tracking-wide">{ROLE_LABEL[r.role] ?? r.role}</p>
                    <p className="text-[9px] text-gray-600 mt-0.5">{r.avgKills.toFixed(1)}/{r.avgDeaths.toFixed(1)}/{r.avgAssists.toFixed(1)}</p>
                  </div>
                  <div className="flex flex-col justify-center">
                    <span className="font-display font-black text-xl leading-none" style={{ color: kdaCol, textShadow: `0 0 12px ${kdaCol}60` }}>
                      {r.avgKda.toFixed(1)}
                    </span>
                    <span className="text-[8px] uppercase tracking-widest text-gray-600">KDA</span>
                  </div>
                  {r.avgDamage != null && (
                    <div className="flex flex-col justify-center ml-2">
                      <span className="text-sm font-bold text-gray-400">{fmtK(r.avgDamage)}</span>
                      <span className="text-[8px] uppercase tracking-widest text-gray-600">Dégâts</span>
                    </div>
                  )}
                  <div className="ml-auto flex gap-1.5 items-center">
                    {r.topChampions.slice(0, 3).map(c => (
                      <div key={c} className="relative">
                        <img src={getChampionImage(c)} alt={c} title={getChampionDisplayName(c)}
                          className="w-7 h-7 rounded-lg object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Top champions ── */}
      {result.topChampions.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-3">
            <p className="text-[10px] font-bold tracking-widest uppercase text-gray-600 shrink-0">Champions les + joués</p>
            <div className="flex-1 h-px" style={{ background: 'linear-gradient(to right, rgba(255,255,255,0.06), transparent)' }} />
          </div>
          <div className="grid grid-cols-3 xl:grid-cols-4 gap-2">
            {result.topChampions.slice(0, 8).map((c) => <TeamChampCard key={`${c.name}-${c.role}`} c={c} />)}
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
  const [copied, setCopied]   = useState(false)

  const handleGenerate = () => {
    setLoading(true)
    onCache('')
    setTimeout(() => {
      const text = type === 'analyse' ? computeAnalyse(result) : computeRapport(result)
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
    a.download = `equipe_${type}_${result.dateFrom}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }
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
        <div className="flex items-center gap-1">
          <button
            onClick={handleCopy}
            title="Copier"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-gray-500 hover:text-white hover:bg-dark-bg border border-transparent hover:border-dark-border transition-all"
          >
            {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
            {copied ? 'Copié !' : 'Copier'}
          </button>
          <button
            onClick={handleDownload}
            title="Télécharger"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-gray-500 hover:text-white hover:bg-dark-bg border border-transparent hover:border-dark-border transition-all"
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export const TeamAnalysePage = () => {
  const { team, players } = useTeam()
  const { sidebarOpen, setSidebarOpen } = useLayout()
  const navigate = useNavigate()

  // Joueurs triés par position
  const sortedPlayers = [...players].sort((a, b) => {
    const ia = POSITION_ORDER.indexOf(a.position?.toUpperCase() ?? '')
    const ib = POSITION_ORDER.indexOf(b.position?.toUpperCase() ?? '')
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
  })

  useEffect(() => {
    setSidebarOpen(false)
    return () => setSidebarOpen(true)
  }, [setSidebarOpen])

  const [datePreset, setDatePreset]     = useState<DatePresetId>('season')
  const [dateFrom, setDateFrom]         = useState(SEASON_START)
  const [dateTo, setDateTo]             = useState(TODAY)
  const [matchType, setMatchType]         = useState<MatchTypeFilter>('all')
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null)
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

    // Si un joueur est sélectionné, ne garder que les matchs où il a joué
    const relevantMatches = selectedPlayerId
      ? matches.filter(m => m.team_match_participants.some(
          p => p.player_id === selectedPlayerId && (p.team_side === 'our' || p.win === m.our_win)
        ))
      : matches

    if (relevantMatches.length === 0) { setAnalysisStatus('empty'); return }

    const n      = relevantMatches.length
    const wins   = relevantMatches.filter(m => m.our_win)
    const losses = relevantMatches.filter(m => !m.our_win)

    // Participants de notre côté — filtrés par joueur si sélectionné
    const ourParticipants = (list: typeof matches) => {
      const base = list.flatMap(m => m.team_match_participants.filter(p => p.team_side === 'our' || p.win === m.our_win))
      return selectedPlayerId ? base.filter(p => p.player_id === selectedPlayerId) : base
    }

    // Durée
    const durAll = relevantMatches.filter(m => m.game_duration > 0)
    const avgGameDuration = durAll.length ? durAll.reduce((s, m) => s + m.game_duration, 0) / durAll.length : null

    // KDA global (nos joueurs)
    const allOur = ourParticipants(relevantMatches)
    const avgKills   = allOur.length ? allOur.reduce((s, p) => s + (p.kills ?? 0), 0) / allOur.length : 0
    const avgDeaths  = allOur.length ? allOur.reduce((s, p) => s + (p.deaths ?? 0), 0) / allOur.length : 0
    const avgAssists = allOur.length ? allOur.reduce((s, p) => s + (p.assists ?? 0), 0) / allOur.length : 0
    const avgKda     = (avgKills + avgAssists) / Math.max(avgDeaths, 1)

    // Objectifs
    const objAll = relevantMatches.filter(m => m.objectives != null && m.our_team_id != null)
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

    const avgDragonKills  = objAvg(relevantMatches, 'dragonKills')
    const avgBaronKills   = objAvg(relevantMatches, 'baronKills')
    const avgTowerKills   = objAvg(relevantMatches, 'towerKills')
    const firstBloodRate  = firstRate(relevantMatches, 'firstBlood')
    const firstDragonRate = firstRate(relevantMatches, 'firstDragon')
    const firstBaronRate  = firstRate(relevantMatches, 'firstBaron')
    const firstTowerRate  = firstRate(relevantMatches, 'firstTower')

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

    for (const m of relevantMatches) {
      for (const p of m.team_match_participants) {
        if (p.team_side !== 'our' && p.win !== m.our_win) continue
        if (selectedPlayerId && p.player_id !== selectedPlayerId) continue
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
    for (const m of relevantMatches) {
      for (const p of m.team_match_participants) {
        if (!p.champion_name) continue
        if (p.team_side !== 'our' && p.win !== m.our_win) continue
        if (selectedPlayerId && p.player_id !== selectedPlayerId) continue
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
          <p className="text-[11px] text-gray-500 mt-0.5">
            {selectedPlayerId
              ? `${sortedPlayers.find(p => p.id === selectedPlayerId)?.player_name ?? '—'} · Matchs d'équipe`
              : 'Analyse collective · Matchs d\'équipe'
            }
          </p>
        </div>

        <div className="flex-1 flex flex-col overflow-y-auto">
          {/* Joueur */}
          {sortedPlayers.length > 0 && (
            <>
              <div className="px-4 py-4">
                <p className="text-[10px] font-bold tracking-widest uppercase text-gray-600 mb-3">Joueur</p>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => setSelectedPlayerId(null)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                      selectedPlayerId === null
                        ? 'bg-accent-blue/15 border-accent-blue/40 text-accent-blue'
                        : 'border-dark-border text-gray-500 hover:text-white hover:border-gray-600'
                    }`}
                  >
                    ALL
                  </button>
                  {sortedPlayers.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setSelectedPlayerId(p.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                        selectedPlayerId === p.id
                          ? 'bg-accent-blue/15 border-accent-blue/40 text-accent-blue'
                          : 'border-dark-border text-gray-500 hover:text-white hover:border-gray-600'
                      }`}
                    >
                      {p.player_name}
                    </button>
                  ))}
                </div>
              </div>
              <div className="border-t border-dark-border/40 mx-4" />
            </>
          )}

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
      <div className="flex-1 flex flex-col overflow-hidden"
           style={{
             background: '#0b0b14',
             backgroundImage: 'radial-gradient(rgba(255,255,255,0.025) 1px, transparent 1px)',
             backgroundSize: '28px 28px',
           }}>

        {analysisStatus === 'done' && analysisResult && (
          <div className="shrink-0 border-b border-white/5 px-6 flex items-end gap-0.5 pt-4"
               style={{ background: 'rgba(255,255,255,0.02)', backdropFilter: 'blur(8px)' }}>
            {TABS.map(({ id, label, icon: Icon }) => {
              const active = activeTab === id
              return (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className="relative flex items-center gap-2 px-4 py-2.5 transition-colors"
                  style={{
                    color: active ? '#a78bfa' : '#6b7280',
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
                      layoutId="ta-tab-indicator"
                      className="absolute bottom-0 left-2 right-2 h-0.5 rounded-t-full"
                      style={{ background: '#a78bfa', boxShadow: '0 0 8px #a78bfa, 0 0 20px rgba(167,139,250,0.3)' }}
                      transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                    />
                  )}
                </button>
              )
            })}
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
