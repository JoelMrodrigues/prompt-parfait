/**
 * Carte de comparaison des stats moyennes par joueur (Team / Solo Q).
 */
import { useState, useMemo } from 'react'
import { BarChart2 } from 'lucide-react'
import { ROSTER_ROLES } from '../../constants/roles'

export type DetailedStats = Record<string, {
  k: number; d: number; a: number; wins: number; count: number
  dmg: number; gold: number; durationSec: number; pinks: number
}>

const ROLE_COLORS: Record<string, string> = {
  TOP: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
  JNG: 'text-green-400 bg-green-500/10 border-green-500/30',
  MID: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  ADC: 'text-red-400 bg-red-500/10 border-red-500/30',
  SUP: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
}

function sortByRole(players: any[]) {
  return [...players].sort((a, b) => {
    const norm = (p: string) => (p?.toUpperCase() === 'BOT' ? 'ADC' : p?.toUpperCase())
    const ra = ROSTER_ROLES.indexOf(norm(a.position) as never)
    const rb = ROSTER_ROLES.indexOf(norm(b.position) as never)
    return (ra === -1 ? 99 : ra) - (rb === -1 ? 99 : rb)
  })
}

function fmtDmg(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}

export function PlayerStatsComparisonCard({
  players,
  teamStats,
  soloqStats,
}: {
  players: any[]
  teamStats: DetailedStats
  soloqStats: DetailedStats
}) {
  const [mode, setMode] = useState<'team' | 'soloq'>('team')
  const stats = mode === 'team' ? teamStats : soloqStats

  const sorted = useMemo(() => sortByRole(players), [players])

  const rows = useMemo(
    () =>
      sorted.map((p) => {
        const s = stats[p.id]
        const count = s?.count ?? 0
        const totalK = s?.k ?? 0
        const totalD = s?.d ?? 0
        const totalA = s?.a ?? 0
        const avgK = count > 0 ? totalK / count : 0
        const avgD = count > 0 ? totalD / count : 0
        const avgA = count > 0 ? totalA / count : 0
        const kda = avgD > 0 ? (avgK + avgA) / avgD : avgK + avgA
        const winrate = count > 0 ? (s.wins / count) * 100 : 0
        const dmgPerMin = (s?.durationSec ?? 0) > 0 ? ((s?.dmg ?? 0) / (s.durationSec / 60)) : 0
        const goldPerMin = (s?.durationSec ?? 0) > 0 ? ((s?.gold ?? 0) / (s.durationSec / 60)) : 0
        const avgPinks = count > 0 ? (s?.pinks ?? 0) / count : 0
        return { player: p, totalK, totalD, totalA, kda, winrate, count, dmgPerMin, goldPerMin, avgPinks }
      }),
    [sorted, stats]
  )

  const active = rows.filter((r) => r.count > 0)
  const bestK    = active.length ? Math.max(...active.map((r) => r.totalK))    : null
  const bestD    = active.length ? Math.min(...active.map((r) => r.totalD))    : null
  const bestA    = active.length ? Math.max(...active.map((r) => r.totalA))    : null
  const bestKda  = active.length ? Math.max(...active.map((r) => r.kda))       : null
  const bestWr   = active.length ? Math.max(...active.map((r) => r.winrate))   : null
  const bestDmg  = active.length ? Math.max(...active.map((r) => r.dmgPerMin))  : null
  const bestGpm  = active.length ? Math.max(...active.map((r) => r.goldPerMin)): null
  const bestPink = active.length ? Math.max(...active.map((r) => r.avgPinks))  : null

  if (!players.length) return null

  const GRID = 'grid-cols-[140px_1fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr_52px]'

  return (
    <div className="bg-dark-card border border-dark-border rounded-2xl p-5">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <BarChart2 className="w-4 h-4 text-accent-blue" />
        <h3 className="font-semibold text-white text-sm uppercase tracking-wider">
          Comparaison des joueurs
        </h3>
      </div>

      {/* Toggle centré */}
      <div className="flex justify-center mb-5">
        <div className="flex items-center bg-dark-bg border border-dark-border rounded-xl p-1 gap-1">
          <button
            onClick={() => setMode('team')}
            className={`px-6 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              mode === 'team' ? 'bg-accent-blue !text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            Team
          </button>
          <button
            onClick={() => setMode('soloq')}
            className={`px-6 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              mode === 'soloq' ? 'bg-accent-blue !text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            Solo Q
          </button>
        </div>
      </div>

      {/* Colonnes header */}
      <div className={`grid ${GRID} gap-2 px-3 mb-2`}>
        <span className="text-[10px] text-gray-600 uppercase tracking-wider">Joueur</span>
        <span className="text-[10px] text-gray-600 uppercase tracking-wider text-center">KDA</span>
        <span className="text-[10px] text-gray-600 uppercase tracking-wider text-center">Kills</span>
        <span className="text-[10px] text-gray-600 uppercase tracking-wider text-center">Morts</span>
        <span className="text-[10px] text-gray-600 uppercase tracking-wider text-center">Assists</span>
        <span className="text-[10px] text-gray-600 uppercase tracking-wider text-center">Dég./min</span>
        <span className="text-[10px] text-gray-600 uppercase tracking-wider text-center">Or/min</span>
        <span className="text-[10px] text-gray-600 uppercase tracking-wider text-center">Pinks/p</span>
        <span className="text-[10px] text-gray-600 uppercase tracking-wider text-center">Win%</span>
        <span className="text-[10px] text-gray-600 uppercase tracking-wider text-center">P</span>
      </div>

      {/* Lignes */}
      <div className="space-y-1.5">
        {rows.map(({ player, totalK, totalD, totalA, kda, winrate, count, dmgPerMin, goldPerMin, avgPinks }) => {
          const pos = (player.position || '').toUpperCase() === 'BOT' ? 'ADC' : (player.position || '').toUpperCase()
          const roleColor = ROLE_COLORS[pos] ?? 'text-gray-400 bg-gray-500/10 border-gray-500/30'
          const noData = count === 0

          return (
            <div
              key={player.id}
              className={`grid ${GRID} gap-2 items-center px-3 py-2.5 rounded-xl bg-dark-bg/50 border border-dark-border/40`}
            >
              {/* Joueur */}
              <div className="flex items-center gap-2 min-w-0">
                <span className={`shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase ${roleColor}`}>
                  {pos || '—'}
                </span>
                <span className="text-sm font-medium text-white truncate">{player.player_name}</span>
              </div>

              {/* KDA */}
              <Stat highlight={!noData && kda === bestKda} color={!noData && kda === bestKda ? 'purple' : 'neutral'} noData={noData}>
                {kda.toFixed(2)}
              </Stat>

              {/* Kills */}
              <Stat highlight={!noData && totalK === bestK} color={!noData && totalK === bestK ? 'emerald' : 'neutral'} noData={noData}>
                {totalK}
              </Stat>

              {/* Deaths */}
              <Stat highlight={!noData && totalD === bestD} color={!noData && totalD === bestD ? 'emerald' : 'rose'} noData={noData}>
                {totalD}
              </Stat>

              {/* Assists */}
              <Stat highlight={!noData && totalA === bestA} color={!noData && totalA === bestA ? 'amber' : 'neutral'} noData={noData}>
                {totalA}
              </Stat>

              {/* Dégâts/min */}
              <Stat highlight={!noData && dmgPerMin === bestDmg} color={!noData && dmgPerMin === bestDmg ? 'amber' : 'neutral'} noData={noData}>
                {fmtDmg(Math.round(dmgPerMin))}
              </Stat>

              {/* Or/min */}
              <Stat highlight={!noData && goldPerMin === bestGpm} color={!noData && goldPerMin === bestGpm ? 'amber' : 'neutral'} noData={noData}>
                {Math.round(goldPerMin)}
              </Stat>

              {/* Pinks/partie */}
              <Stat highlight={!noData && avgPinks === bestPink} color={!noData && avgPinks === bestPink ? 'emerald' : 'neutral'} noData={noData}>
                {avgPinks.toFixed(1)}
              </Stat>

              {/* Winrate */}
              <Stat
                highlight={!noData && winrate === bestWr}
                color={!noData && winrate === bestWr ? 'emerald' : !noData && winrate >= 50 ? 'emerald-dim' : 'rose-dim'}
                noData={noData}
              >
                {winrate.toFixed(0)}%
              </Stat>

              {/* Parties */}
              <div className="text-center text-xs text-gray-500 tabular-nums">{noData ? '—' : count}</div>
            </div>
          )
        })}
      </div>

      {active.length === 0 && (
        <p className="text-center text-gray-600 text-sm py-4">
          {mode === 'team' ? 'Aucune partie team enregistrée' : 'Aucune donnée Solo Q disponible'}
        </p>
      )}

      <p className="text-[10px] text-gray-700 text-center mt-3">
        ★ = meilleur · Dég./min & Or/min = global sur la période · Pinks/p = contrôles par partie ·{' '}
        {mode === 'team' ? 'Toutes les parties team' : '5 dernières parties SoloQ'}
      </p>
    </div>
  )
}

type StatColor = 'emerald' | 'emerald-dim' | 'rose' | 'rose-dim' | 'amber' | 'purple' | 'neutral'

function Stat({ children, highlight, color, noData }: {
  children: React.ReactNode
  highlight: boolean
  color: StatColor
  noData: boolean
}) {
  const colorClass = noData ? 'text-gray-600' : {
    emerald: 'text-emerald-400',
    'emerald-dim': 'text-emerald-500/70',
    rose: 'text-rose-400/80',
    'rose-dim': 'text-rose-500/70',
    amber: 'text-amber-400',
    purple: 'text-purple-400',
    neutral: 'text-gray-300',
  }[color]

  return (
    <div className={`text-center text-sm font-semibold tabular-nums ${colorClass}`}>
      {noData ? '—' : children}
      {highlight && <span className="ml-0.5 text-[9px]">★</span>}
    </div>
  )
}
