/**
 * Section Solo Q dans la page Statistiques équipe
 * Tabs: Stats | Timeline
 */
import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../../lib/supabase'
import { SEASON_16_START_MS, REMAKE_THRESHOLD_SEC } from '../../../lib/constants'
import { getChampionImage, getChampionDisplayName } from '../../../lib/championImages'
import { ALL_ID } from '../champion-pool/components/PlayerFilterSidebar'

// ─── Hook : charge les matches SoloQ d'un joueur ─────────────────────────────

function useSoloqStats(playerId: string | null) {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!playerId || playerId === ALL_ID) { setRows([]); return }
    let cancelled = false
    setLoading(true)
    supabase
      .from('player_soloq_matches')
      .select('win, kills, deaths, assists, game_duration, total_damage, cs, vision_score, gold_earned, champion_name, game_creation')
      .eq('player_id', playerId)
      .eq('account_source', 'primary')
      .gte('game_creation', SEASON_16_START_MS)
      .gte('game_duration', REMAKE_THRESHOLD_SEC)
      .order('game_creation', { ascending: false })
      .then(({ data }) => {
        if (!cancelled) { setRows(data ?? []); setLoading(false) }
      })
    return () => { cancelled = true }
  }, [playerId])

  return { rows, loading }
}

function useSoloqAllPlayers(players: any[]) {
  const [statsByPlayer, setStatsByPlayer] = useState<Record<string, any[]>>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!players.length) return
    let cancelled = false
    setLoading(true)
    const ids = players.map((p) => p.id)
    supabase
      .from('player_soloq_matches')
      .select('player_id, win, kills, deaths, assists, game_duration, cs, champion_name')
      .in('player_id', ids)
      .eq('account_source', 'primary')
      .gte('game_creation', SEASON_16_START_MS)
      .gte('game_duration', REMAKE_THRESHOLD_SEC)
      .then(({ data }) => {
        if (cancelled) return
        const byPlayer: Record<string, any[]> = {}
        for (const r of data ?? []) {
          if (!byPlayer[r.player_id]) byPlayer[r.player_id] = []
          byPlayer[r.player_id].push(r)
        }
        setStatsByPlayer(byPlayer)
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [players.map((p) => p.id).join(',')])

  return { statsByPlayer, loading }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function computeStats(rows: any[]) {
  const n = rows.length
  if (!n) return null
  const wins = rows.filter((r) => r.win).length
  const sumK = rows.reduce((a, r) => a + (r.kills ?? 0), 0)
  const sumD = rows.reduce((a, r) => a + (r.deaths ?? 0), 0)
  const sumA = rows.reduce((a, r) => a + (r.assists ?? 0), 0)
  const kda = sumD > 0 ? (sumK + sumA) / sumD : sumK + sumA
  const csPerMinList = rows
    .filter((r) => r.cs != null && (r.game_duration ?? 0) > 0)
    .map((r) => r.cs / (r.game_duration / 60))
  const avgCsMin = csPerMinList.length ? csPerMinList.reduce((a, b) => a + b, 0) / csPerMinList.length : 0
  return { n, wins, winrate: (wins / n) * 100, avgK: sumK / n, avgD: sumD / n, avgA: sumA / n, kda, avgCsMin }
}

function computeChampions(rows: any[]) {
  const byChamp: Record<string, {
    games: number; wins: number; kills: number; deaths: number; assists: number
    csMinSum: number; csMinCount: number
  }> = {}
  for (const r of rows) {
    const name = r.champion_name || 'Unknown'
    if (!byChamp[name]) byChamp[name] = { games: 0, wins: 0, kills: 0, deaths: 0, assists: 0, csMinSum: 0, csMinCount: 0 }
    const c = byChamp[name]
    c.games++
    if (r.win) c.wins++
    c.kills += r.kills ?? 0
    c.deaths += r.deaths ?? 0
    c.assists += r.assists ?? 0
    if (r.cs != null && (r.game_duration ?? 0) > 0) {
      c.csMinSum += r.cs / (r.game_duration / 60)
      c.csMinCount++
    }
  }
  return Object.entries(byChamp)
    .map(([name, s]) => ({
      name,
      games: s.games,
      wins: s.wins,
      wr: s.games ? (s.wins / s.games) * 100 : 0,
      kda: s.deaths > 0 ? (s.kills + s.assists) / s.deaths : s.kills + s.assists,
      avgK: s.games ? s.kills / s.games : 0,
      avgD: s.games ? s.deaths / s.games : 0,
      avgA: s.games ? s.assists / s.games : 0,
      avgCsMin: s.csMinCount ? s.csMinSum / s.csMinCount : 0,
    }))
    .sort((a, b) => b.games - a.games)
}

// ─── Rolling WR chart (SVG natif) ─────────────────────────────────────────────

function RollingWrChart({ rows }: { rows: any[] }) {
  const WINDOW = 10
  const sorted = [...rows].sort((a, b) => (a.game_creation ?? 0) - (b.game_creation ?? 0))
  if (sorted.length < WINDOW) return null

  const points: { x: number; wr: number }[] = []
  for (let i = WINDOW - 1; i < sorted.length; i++) {
    const slice = sorted.slice(i - WINDOW + 1, i + 1)
    const wr = (slice.filter((r) => r.win).length / WINDOW) * 100
    points.push({ x: i, wr })
  }

  const W = 560, H = 120, PAD = { top: 12, right: 12, bottom: 24, left: 32 }
  const IW = W - PAD.left - PAD.right
  const IH = H - PAD.top - PAD.bottom
  const maxX = points.length - 1 || 1
  const toX = (i: number) => PAD.left + (i / maxX) * IW
  const toY = (wr: number) => PAD.top + IH - (wr / 100) * IH

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(i).toFixed(1)} ${toY(p.wr).toFixed(1)}`).join(' ')
  const areaD = `${pathD} L ${toX(points.length - 1).toFixed(1)} ${(PAD.top + IH).toFixed(1)} L ${PAD.left.toFixed(1)} ${(PAD.top + IH).toFixed(1)} Z`
  const midY = toY(50)

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 120 }}>
        {/* Grid */}
        {[0, 25, 50, 75, 100].map((pct) => (
          <g key={pct}>
            <line x1={PAD.left} x2={PAD.left + IW} y1={toY(pct)} y2={toY(pct)} stroke="#1e2035" strokeWidth="1" />
            <text x={PAD.left - 4} y={toY(pct) + 4} textAnchor="end" fontSize="9" fill="#6b7280">{pct}%</text>
          </g>
        ))}
        {/* 50% reference */}
        <line x1={PAD.left} x2={PAD.left + IW} y1={midY} y2={midY} stroke="#374151" strokeWidth="1" strokeDasharray="4 3" />
        {/* Area */}
        <path d={areaD} fill="url(#sqGrad)" opacity="0.3" />
        {/* Line */}
        <path d={pathD} fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinejoin="round" />
        {/* Gradient */}
        <defs>
          <linearGradient id="sqGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  )
}

// ─── Rolling stats cards ───────────────────────────────────────────────────────

function RollingStats({ rows }: { rows: any[] }) {
  const recent = [...rows].sort((a, b) => (b.game_creation ?? 0) - (a.game_creation ?? 0))
  const windows = [5, 10, 20]
  return (
    <div className="grid grid-cols-3 gap-3">
      {windows.map((w) => {
        const slice = recent.slice(0, w)
        if (slice.length < w) return null
        const wins = slice.filter((r) => r.win).length
        const wr = (wins / w) * 100
        return (
          <div key={w} className={`rounded-2xl border bg-dark-card/60 p-4 flex flex-col gap-1 ${wr >= 50 ? 'border-emerald-500/30' : 'border-rose-500/30'}`}>
            <p className="text-[10px] uppercase tracking-widest text-gray-500">Dernières {w}</p>
            <p className={`text-2xl font-bold tabular-nums ${wr >= 50 ? 'text-emerald-400' : 'text-rose-400'}`}>{wr.toFixed(0)}%</p>
            <p className="text-xs text-gray-500">{wins}V · {w - wins}D</p>
          </div>
        )
      })}
    </div>
  )
}

// ─── Streak de résultats ──────────────────────────────────────────────────────

function GameStreak({ rows }: { rows: any[] }) {
  const recent = [...rows]
    .sort((a, b) => (b.game_creation ?? 0) - (a.game_creation ?? 0))
    .slice(0, 30)
    .reverse()
  return (
    <div className="flex flex-wrap gap-1.5">
      {recent.map((r, i) => (
        <div
          key={i}
          title={r.win ? 'Victoire' : 'Défaite'}
          className={`w-5 h-5 rounded-sm text-[9px] font-bold flex items-center justify-center ${
            r.win ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
          }`}
        >
          {r.win ? 'V' : 'D'}
        </div>
      ))}
    </div>
  )
}

// ─── Vue joueur — Stats ───────────────────────────────────────────────────────

function PlayerSoloQStatsTab({ rows }: { rows: any[] }) {
  const s = useMemo(() => computeStats(rows), [rows])
  const champions = useMemo(() => computeChampions(rows).slice(0, 8), [rows])

  if (!s) return <p className="text-gray-500 text-sm">Aucune donnée.</p>

  return (
    <div className="space-y-3">
      {/* Hero row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-dark-border bg-dark-card/60 p-5 flex flex-col gap-1">
          <p className="text-[10px] uppercase tracking-widest text-gray-500">Parties</p>
          <p className="text-3xl font-bold text-white tabular-nums">{s.n}</p>
          <p className="text-xs text-gray-500">{s.wins}V · {s.n - s.wins}D</p>
        </div>
        <div className={`rounded-2xl border bg-dark-card/60 p-5 flex flex-col gap-1 ${s.winrate >= 50 ? 'border-emerald-500/40' : 'border-rose-500/40'}`}>
          <p className="text-[10px] uppercase tracking-widest text-gray-500">Winrate</p>
          <p className={`text-3xl font-bold tabular-nums ${s.winrate >= 50 ? 'text-emerald-400' : 'text-rose-400'}`}>{s.winrate.toFixed(1)}%</p>
          <div className="h-1 rounded-full bg-dark-bg overflow-hidden mt-1">
            <div className={`h-full rounded-full ${s.winrate >= 50 ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{ width: `${s.winrate}%` }} />
          </div>
        </div>
        <div className="rounded-2xl border border-dark-border bg-dark-card/60 p-5 flex flex-col gap-1">
          <p className="text-[10px] uppercase tracking-widest text-gray-500">KDA</p>
          <p className="text-3xl font-bold text-white tabular-nums">{s.kda.toFixed(2)}</p>
          <p className="text-xs text-gray-500 tabular-nums">{s.avgK.toFixed(1)} · {s.avgD.toFixed(1)} · {s.avgA.toFixed(1)}</p>
        </div>
        <div className="rounded-2xl border border-dark-border bg-dark-card/60 p-5 flex flex-col gap-1">
          <p className="text-[10px] uppercase tracking-widest text-gray-500">CS / min</p>
          <p className="text-3xl font-bold text-white tabular-nums">{s.avgCsMin.toFixed(1)}</p>
          <p className="text-xs text-gray-500">Minions par minute</p>
        </div>
      </div>

      {/* Champions */}
      {champions.length > 0 && (
        <div className="rounded-2xl border border-dark-border bg-dark-card/60 overflow-hidden">
          <div className="px-5 pt-5 pb-3">
            <p className="text-[10px] uppercase tracking-widest text-gray-500">Champions les plus joués</p>
          </div>
          <div className="divide-y divide-dark-border">
            {champions.map((c) => (
              <div key={c.name} className="flex items-center gap-4 px-5 py-3 hover:bg-dark-bg/30 transition-colors">
                <img
                  src={getChampionImage(c.name)}
                  alt={getChampionDisplayName(c.name) || c.name}
                  className="w-10 h-10 rounded-lg object-cover border border-dark-border shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white">{getChampionDisplayName(c.name) || c.name}</p>
                  <p className="text-xs text-gray-500">{c.games} partie{c.games > 1 ? 's' : ''}</p>
                </div>
                <div className="hidden sm:flex items-center gap-5 text-xs">
                  <div className="text-right">
                    <p className="text-gray-500">K/D/A</p>
                    <p className="text-white tabular-nums">{c.avgK.toFixed(1)} / {c.avgD.toFixed(1)} / {c.avgA.toFixed(1)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-500">KDA</p>
                    <p className="text-white tabular-nums">{c.kda.toFixed(1)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-500">CS/min</p>
                    <p className="text-white tabular-nums">{c.avgCsMin > 0 ? c.avgCsMin.toFixed(1) : '—'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-500">WR</p>
                    <p className={`font-bold tabular-nums ${c.wr >= 50 ? 'text-emerald-400' : 'text-rose-400'}`}>{c.wr.toFixed(0)}%</p>
                  </div>
                </div>
                <div className="sm:hidden text-right">
                  <p className={`text-xs font-bold ${c.wr >= 50 ? 'text-emerald-400' : 'text-rose-400'}`}>{c.wr.toFixed(0)}%</p>
                  <p className="text-xs text-gray-500">KDA {c.kda.toFixed(1)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Vue joueur — Timeline ────────────────────────────────────────────────────

function PlayerSoloQTimelineTab({ rows }: { rows: any[] }) {
  if (!rows.length) return <p className="text-gray-500 text-sm">Aucune donnée.</p>

  return (
    <div className="space-y-3">
      {/* Rolling WR */}
      <RollingStats rows={rows} />

      {/* Graphique WR glissant sur 10 parties */}
      {rows.length >= 10 && (
        <div className="rounded-2xl border border-dark-border bg-dark-card/60 p-5">
          <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-4">WR glissant (fenêtre 10 parties)</p>
          <RollingWrChart rows={rows} />
        </div>
      )}

      {/* Streak */}
      <div className="rounded-2xl border border-dark-border bg-dark-card/60 p-5">
        <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-3">30 dernières parties (→ plus récente)</p>
        <GameStreak rows={rows} />
      </div>

      {/* Stats par periode */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[
          { label: 'Cette semaine', days: 7 },
          { label: 'Ce mois', days: 30 },
        ].map(({ label, days }) => {
          const cutoff = Date.now() - days * 24 * 3600 * 1000
          const slice = rows.filter((r) => (r.game_creation ?? 0) >= cutoff)
          const s = computeStats(slice)
          if (!s) return (
            <div key={label} className="rounded-2xl border border-dark-border bg-dark-card/60 p-5">
              <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-2">{label}</p>
              <p className="text-xs text-gray-600">Aucune partie</p>
            </div>
          )
          return (
            <div key={label} className="rounded-2xl border border-dark-border bg-dark-card/60 p-5 space-y-2">
              <p className="text-[10px] uppercase tracking-widest text-gray-500">{label} · {s.n} partie{s.n > 1 ? 's' : ''}</p>
              <div className="flex justify-between items-center border-b border-dark-border pb-2">
                <span className="text-xs text-gray-400">Winrate</span>
                <span className={`text-sm font-bold tabular-nums ${s.winrate >= 50 ? 'text-emerald-400' : 'text-rose-400'}`}>{s.winrate.toFixed(0)}%</span>
              </div>
              <div className="flex justify-between items-center border-b border-dark-border pb-2">
                <span className="text-xs text-gray-400">KDA</span>
                <span className="text-sm font-bold text-white tabular-nums">{s.kda.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-400">CS/min</span>
                <span className="text-sm font-bold text-white tabular-nums">{s.avgCsMin.toFixed(1)}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Vue joueur individuel (avec tabs Stats / Timeline) ───────────────────────

function PlayerSoloQStats({ playerId }: { playerId: string }) {
  const { rows, loading } = useSoloqStats(playerId)
  const [tab, setTab] = useState<'stats' | 'timeline'>('stats')

  if (loading) {
    return (
      <div className="rounded-2xl border border-dark-border bg-dark-card/50 p-12 text-center">
        <p className="text-gray-500 text-sm">Chargement…</p>
      </div>
    )
  }

  if (!rows.length) {
    return (
      <div className="rounded-2xl border border-dark-border bg-dark-card/50 p-12 text-center">
        <p className="text-gray-500 text-sm">Aucune partie Solo Q (S16) enregistrée pour ce joueur.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Tabs */}
      <div className="flex gap-0 border-b border-dark-border">
        {(['stats', 'timeline'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors capitalize ${
              tab === t
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            {t === 'stats' ? 'Stats' : 'Timeline'}
          </button>
        ))}
      </div>

      {tab === 'stats' ? (
        <PlayerSoloQStatsTab rows={rows} />
      ) : (
        <PlayerSoloQTimelineTab rows={rows} />
      )}
    </div>
  )
}

// ─── Vue ALL ─────────────────────────────────────────────────────────────────

function AllPlayersSoloQStats({ players }: { players: any[] }) {
  const { statsByPlayer, loading } = useSoloqAllPlayers(players)

  if (loading) {
    return (
      <div className="rounded-2xl border border-dark-border bg-dark-card/50 p-12 text-center">
        <p className="text-gray-500 text-sm">Chargement…</p>
      </div>
    )
  }

  const rows = players.map((p) => {
    const matches = statsByPlayer[p.id] ?? []
    const s = computeStats(matches)
    return { player: p, s }
  }).filter((r) => r.s !== null)

  if (!rows.length) {
    return (
      <div className="rounded-2xl border border-dark-border bg-dark-card/50 p-12 text-center">
        <p className="text-gray-500 text-sm">Aucune donnée Solo Q (S16) pour les joueurs de l'équipe.</p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-dark-border bg-dark-card/60 overflow-hidden">
      <div className="px-5 pt-5 pb-3">
        <p className="text-[10px] uppercase tracking-widest text-gray-500">Performances Solo Q · Saison 16</p>
      </div>
      <div className="divide-y divide-dark-border">
        {rows.map(({ player, s: st }) => (
          <div key={player.id} className="flex items-center gap-4 px-5 py-4">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white">{player.player_name || player.pseudo || 'Joueur'}</p>
              <p className="text-xs text-gray-500">{st!.n} partie{st!.n > 1 ? 's' : ''}</p>
            </div>
            <div className="flex items-center gap-6 text-xs">
              <div className="text-right">
                <p className="text-gray-500">WR</p>
                <p className={`font-bold tabular-nums ${st!.winrate >= 50 ? 'text-emerald-400' : 'text-rose-400'}`}>{st!.winrate.toFixed(0)}%</p>
              </div>
              <div className="text-right hidden sm:block">
                <p className="text-gray-500">K/D/A</p>
                <p className="text-white tabular-nums">{st!.avgK.toFixed(1)} / {st!.avgD.toFixed(1)} / {st!.avgA.toFixed(1)}</p>
              </div>
              <div className="text-right">
                <p className="text-gray-500">KDA</p>
                <p className="text-white tabular-nums font-semibold">{st!.kda.toFixed(1)}</p>
              </div>
              <div className="text-right hidden sm:block">
                <p className="text-gray-500">CS/min</p>
                <p className="text-white tabular-nums">{st!.avgCsMin > 0 ? st!.avgCsMin.toFixed(1) : '—'}</p>
              </div>
              <div className="w-16">
                <div className="h-1.5 rounded-full bg-dark-bg overflow-hidden">
                  <div className={`h-full rounded-full ${st!.winrate >= 50 ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{ width: `${st!.winrate}%` }} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Export ───────────────────────────────────────────────────────────────────

export function SoloQStatsSection({ selectedId, players }: { selectedId: string; players: any[] }) {
  if (selectedId === ALL_ID) return <AllPlayersSoloQStats players={players} />
  return <PlayerSoloQStats playerId={selectedId} />
}
