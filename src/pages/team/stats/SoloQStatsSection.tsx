/**
 * Section Solo Q dans la page Statistiques équipe
 * Tabs joueur individuel: Stats | Résumé | Historiques | Timeline (en travaux)
 */
import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../../lib/supabase'
import { SEASON_16_START_MS, REMAKE_THRESHOLD_SEC } from '../../../lib/constants'
import { getChampionImage, getChampionDisplayName } from '../../../lib/championImages'
import { aggregateChampionStats } from '../../../lib/team/statsAggregation'
import { getRankImage } from '../joueurs/utils/playerDetailHelpers'
import { ALL_ID } from '../champion-pool/components/PlayerFilterSidebar'
import { EmptyStats, StatTooltip } from './TeamStatsPage'

// ─── Hook : charge les matches SoloQ d'un joueur ─────────────────────────────

function useSoloqStats(playerId: string | null) {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!playerId || playerId === ALL_ID) { setRows([]); return undefined }
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
    if (!players.length) return undefined
    let cancelled = false
    setLoading(true)
    const ids = players.map((p) => p.id)
    supabase
      .from('player_soloq_matches')
      .select('player_id, win, kills, deaths, assists, game_duration, cs, champion_name, total_damage, vision_score, gold_earned')
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

  const withDuration = rows.filter((r) => (r.game_duration ?? 0) > 0)
  const avgDurationMin = withDuration.length
    ? withDuration.reduce((a, r) => a + r.game_duration, 0) / withDuration.length / 60
    : 0

  const csPerMinList = withDuration
    .filter((r) => r.cs != null)
    .map((r) => r.cs / (r.game_duration / 60))
  const avgCsMin = csPerMinList.length ? csPerMinList.reduce((a, b) => a + b, 0) / csPerMinList.length : 0

  const dpmList = withDuration
    .filter((r) => r.total_damage != null)
    .map((r) => r.total_damage / (r.game_duration / 60))
  const avgDpm = dpmList.length ? dpmList.reduce((a, b) => a + b, 0) / dpmList.length : 0

  const goldMinList = withDuration
    .filter((r) => r.gold_earned != null)
    .map((r) => r.gold_earned / (r.game_duration / 60))
  const avgGoldMin = goldMinList.length ? goldMinList.reduce((a, b) => a + b, 0) / goldMinList.length : 0

  const sumDmg = rows.reduce((a, r) => a + (r.total_damage ?? 0), 0)
  const sumVision = rows.reduce((a, r) => a + (r.vision_score ?? 0), 0)
  const sumGold = rows.reduce((a, r) => a + (r.gold_earned ?? 0), 0)
  const sumCs = rows.reduce((a, r) => a + (r.cs ?? 0), 0)

  return {
    n, wins, winrate: (wins / n) * 100,
    avgK: sumK / n, avgD: sumD / n, avgA: sumA / n,
    totalK: sumK, totalD: sumD, totalA: sumA,
    kda, avgCsMin, avgDurationMin,
    avgDamage: sumDmg / n, avgVision: sumVision / n, avgGold: sumGold / n,
    avgCs: sumCs / n, avgDpm, avgGoldMin,
  }
}

function computeChampions(rows: any[]) {
  const base = aggregateChampionStats(
    rows,
    (r: any) => r.champion_name || 'Unknown',
    (r: any) => !!r.win,
  )

  const csMinByChamp: Record<string, { sum: number; count: number }> = {}
  for (const r of rows) {
    const name = r.champion_name || 'Unknown'
    if (r.cs != null && (r.game_duration ?? 0) > 0) {
      if (!csMinByChamp[name]) csMinByChamp[name] = { sum: 0, count: 0 }
      csMinByChamp[name].sum += r.cs / (r.game_duration / 60)
      csMinByChamp[name].count++
    }
  }

  return base.map((s) => ({
    ...s,
    wr: s.winrate,
    kda: s.kdaRatio,
    avgCsMin: csMinByChamp[s.name]?.count ? csMinByChamp[s.name].sum / csMinByChamp[s.name].count : 0,
  }))
}

// ─── Composant helpers ────────────────────────────────────────────────────────

function StatRow({ label, value, valueColor = 'text-white', hint, tooltip }: {
  label: string; value: string; valueColor?: string; hint?: string; tooltip?: string
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-dark-border/30 last:border-0">
      <span className="text-sm text-gray-400 flex items-center">
        {label}
        {tooltip && <StatTooltip text={tooltip} />}
      </span>
      <div className="flex items-center gap-1.5">
        <span className={`text-sm font-semibold tabular-nums ${valueColor}`}>{value}</span>
        {hint && <span className="text-xs text-gray-600">{hint}</span>}
      </div>
    </div>
  )
}

function StatBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dark-border bg-dark-card/60 p-5">
      <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-3">{title}</p>
      {children}
    </div>
  )
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
        {[0, 25, 50, 75, 100].map((pct) => (
          <g key={pct}>
            <line x1={PAD.left} x2={PAD.left + IW} y1={toY(pct)} y2={toY(pct)} stroke="#1e2035" strokeWidth="1" />
            <text x={PAD.left - 4} y={toY(pct) + 4} textAnchor="end" fontSize="9" fill="#6b7280">{pct}%</text>
          </g>
        ))}
        <line x1={PAD.left} x2={PAD.left + IW} y1={midY} y2={midY} stroke="#374151" strokeWidth="1" strokeDasharray="4 3" />
        <path d={areaD} fill="url(#sqGrad)" opacity="0.3" />
        <path d={pathD} fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinejoin="round" />
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

// ─── Tab : Stats (vue détaillée comme TeamStatistiquesSection) ────────────────

function PlayerSoloQStatsDetailed({ rows }: { rows: any[] }) {
  const s = useMemo(() => computeStats(rows), [rows])
  if (!s) return <EmptyStats type="player-soloq" compact />

  return (
    <div className="space-y-3">
      {/* Hero — 3 KPI */}
      <div className="grid grid-cols-3 gap-3">
        <div className={`rounded-2xl border bg-dark-card/60 p-5 flex flex-col gap-1 ${s.winrate >= 50 ? 'border-emerald-500/40' : 'border-rose-500/40'}`}>
          <p className="text-[10px] uppercase tracking-widest text-gray-500">Winrate</p>
          <p className={`text-3xl font-bold tabular-nums ${s.winrate >= 50 ? 'text-emerald-400' : 'text-rose-400'}`}>{s.winrate.toFixed(0)}%</p>
          <p className="text-xs text-gray-500">{s.wins}V · {s.n - s.wins}D</p>
          <div className="h-1 rounded-full bg-dark-bg overflow-hidden mt-1">
            <div className={`h-full rounded-full ${s.winrate >= 50 ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{ width: `${s.winrate}%` }} />
          </div>
        </div>
        <div className="rounded-2xl border border-dark-border bg-dark-card/60 p-5 flex flex-col gap-1">
          <p className="text-[10px] uppercase tracking-widest text-gray-500">KDA Moyen</p>
          <p className="text-3xl font-bold text-white tabular-nums">{s.kda.toFixed(2)}</p>
          <p className="text-xs text-gray-500 tabular-nums">{s.avgK.toFixed(1)} / {s.avgD.toFixed(1)} / {s.avgA.toFixed(1)}</p>
        </div>
        <div className="rounded-2xl border border-dark-border bg-dark-card/60 p-5 flex flex-col gap-1">
          <p className="text-[10px] uppercase tracking-widest text-gray-500">Parties</p>
          <p className="text-3xl font-bold text-white tabular-nums">{s.n}</p>
          <p className="text-xs text-gray-500">Durée moy. {s.avgDurationMin.toFixed(0)} min</p>
        </div>
      </div>

      {/* Blocs détaillés */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Combat */}
        <StatBlock title="Combat">
          <StatRow label="Kills / partie" value={s.avgK.toFixed(1)} />
          <StatRow label="Morts / partie" value={s.avgD.toFixed(1)} valueColor="text-rose-400" />
          <StatRow label="Assists / partie" value={s.avgA.toFixed(1)} valueColor="text-blue-400" />
          <StatRow label="Dégâts / partie" value={Math.round(s.avgDamage).toLocaleString('fr-FR')} />
          <StatRow label="Dégâts / min (DPM)" value={Math.round(s.avgDpm).toLocaleString('fr-FR')} valueColor="text-amber-400" tooltip="Dégâts par Minute — total des dégâts infligés aux champions divisé par la durée de la partie." />
        </StatBlock>

        {/* Économie */}
        <StatBlock title="Économie">
          <StatRow label="Or / partie" value={`${(s.avgGold / 1000).toFixed(1)}k`} valueColor="text-amber-400" />
          <StatRow label="Or / min" value={Math.round(s.avgGoldMin).toLocaleString('fr-FR')} valueColor="text-amber-400" tooltip="Or généré par Minute — indicateur d'efficacité économique sur la durée de la partie." />
          <StatRow label="CS / min" value={s.avgCsMin.toFixed(1)} tooltip="CS par Minute — indicateur de régularité au farm. En ranked EUW, un bon joueur vise 8+ CS/min." />
          <StatRow label="CS / partie" value={Math.round(s.avgCs).toLocaleString('fr-FR')} tooltip="Creep Score — nombre de sbires et monstres de jungle tués." />
        </StatBlock>

        {/* Vision */}
        <StatBlock title="Vision">
          <StatRow label="Score de vision" value={s.avgVision.toFixed(1)} valueColor="text-emerald-400" tooltip="Score calculé par Riot mesurant l'impact sur la vision (wards posées, wards annulées, zones éclairées)." />
          <StatRow
            label="Vision / min"
            value={s.avgDurationMin > 0 ? (s.avgVision / s.avgDurationMin).toFixed(2) : '—'}
            tooltip="Score de vision divisé par la durée de la partie — utile pour comparer des joueurs sur des parties de durées différentes."
          />
        </StatBlock>

        {/* Performance détaillée */}
        <StatBlock title="Performance Détaillée">
          <StatRow label="KDA ratio" value={s.kda.toFixed(2)} tooltip="(Kills + Assists) / Deaths — mesure l'impact en combat. Un KDA > 3 est excellent." />
          <StatRow label="K / M / A par partie" value={`${s.avgK.toFixed(1)} / ${s.avgD.toFixed(1)} / ${s.avgA.toFixed(1)}`} />
          <StatRow label="Total Kills / Morts / Assists" value={`${s.totalK} / ${s.totalD} / ${s.totalA}`} />
          <StatRow
            label="Winrate global"
            value={`${s.winrate.toFixed(0)}%`}
            valueColor={s.winrate >= 50 ? 'text-emerald-400' : 'text-rose-400'}
            hint={`${s.wins}V · ${s.n - s.wins}D`}
          />
        </StatBlock>
      </div>
    </div>
  )
}

// ─── Tab : Résumé (KPI cards + champions) ────────────────────────────────────

function PlayerSoloQResume({ rows }: { rows: any[] }) {
  const s = useMemo(() => computeStats(rows), [rows])
  const champions = useMemo(() => computeChampions(rows).slice(0, 8), [rows])

  if (!s) return <EmptyStats type="player-soloq" compact />

  return (
    <div className="space-y-3">
      {/* 3 KPI + 4 chips */}
      <div className="grid grid-cols-3 gap-3">
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
          <p className="text-xs text-gray-500 tabular-nums">{s.avgK.toFixed(1)} / {s.avgD.toFixed(1)} / {s.avgA.toFixed(1)}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'CS / min', value: s.avgCsMin.toFixed(1) },
          { label: 'Dégâts / game', value: Math.round(s.avgDamage).toLocaleString('fr-FR') },
          { label: 'Vision / game', value: s.avgVision.toFixed(1) },
          { label: 'Or / game', value: `${(s.avgGold / 1000).toFixed(1)}k` },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl border border-dark-border bg-dark-card/40 px-4 py-3 flex flex-col gap-0.5">
            <p className="text-[10px] uppercase tracking-widest text-gray-500">{label}</p>
            <p className="text-lg font-bold text-white tabular-nums">{value}</p>
          </div>
        ))}
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

// ─── Tab : Historiques (rolling stats + streak + périodes) ───────────────────

function PlayerSoloQHistoriques({ rows }: { rows: any[] }) {
  if (!rows.length) return <EmptyStats type="player-soloq" compact />

  return (
    <div className="space-y-3">
      <RollingStats rows={rows} />

      {rows.length >= 10 && (
        <div className="rounded-2xl border border-dark-border bg-dark-card/60 p-5">
          <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-4">WR glissant (fenêtre 10 parties)</p>
          <RollingWrChart rows={rows} />
        </div>
      )}

      <div className="rounded-2xl border border-dark-border bg-dark-card/60 p-5">
        <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-3">30 dernières parties (→ plus récente)</p>
        <GameStreak rows={rows} />
      </div>

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
              <StatRow label="Winrate" value={`${s.winrate.toFixed(0)}%`} valueColor={s.winrate >= 50 ? 'text-emerald-400' : 'text-rose-400'} />
              <StatRow label="KDA" value={s.kda.toFixed(2)} />
              <StatRow label="CS/min" value={s.avgCsMin.toFixed(1)} />
              <StatRow label="Dégâts / game" value={Math.round(s.avgDamage).toLocaleString('fr-FR')} />
              <StatRow label="Or / game" value={`${(s.avgGold / 1000).toFixed(1)}k`} />
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Tab : Timeline (en travaux) ─────────────────────────────────────────────

function PlayerSoloQTimeline() {
  return (
    <div className="rounded-2xl border border-dark-border bg-dark-card/50 p-16 flex flex-col items-center justify-center text-center gap-3">
      <div className="text-4xl">🚧</div>
      <p className="text-white font-semibold text-lg">En travaux</p>
      <p className="text-gray-500 text-sm max-w-xs">
        La section Timeline Solo Q sera disponible prochainement.
      </p>
    </div>
  )
}

// ─── Vue joueur individuel (4 tabs) ──────────────────────────────────────────

type SoloqTab = 'stats' | 'resume' | 'historiques' | 'timeline'

const SOLOQ_TABS: { id: SoloqTab; label: string }[] = [
  { id: 'stats', label: 'Stats' },
  { id: 'resume', label: 'Résumé' },
  { id: 'historiques', label: 'Historiques' },
  { id: 'timeline', label: 'Timeline' },
]

function PlayerSoloQStats({ playerId }: { playerId: string }) {
  const { rows, loading } = useSoloqStats(playerId)
  const [tab, setTab] = useState<SoloqTab>('stats')

  if (loading) {
    return (
      <div className="rounded-2xl border border-dark-border bg-dark-card/50 p-12 text-center">
        <p className="text-gray-500 text-sm">Chargement…</p>
      </div>
    )
  }

  if (!rows.length) {
    return <EmptyStats type="player-soloq" />
  }

  return (
    <div className="space-y-3">
      {/* Tabs */}
      <div className="flex gap-0 border-b border-dark-border">
        {SOLOQ_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.id
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'stats' && <PlayerSoloQStatsDetailed rows={rows} />}
      {tab === 'resume' && <PlayerSoloQResume rows={rows} />}
      {tab === 'historiques' && <PlayerSoloQHistoriques rows={rows} />}
      {tab === 'timeline' && <PlayerSoloQTimeline />}
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
    return <EmptyStats type="soloq" />
  }

  return (
    <div className="rounded-2xl border border-dark-border bg-dark-card/60 overflow-hidden">
      <div className="px-5 pt-5 pb-3">
        <p className="text-[10px] uppercase tracking-widest text-gray-500">Performances Solo Q · Saison 16</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-dark-bg/60 border-b border-dark-border text-gray-500 text-[10px] uppercase tracking-wider">
              <th className="px-5 py-3 text-left">Joueur</th>
              <th className="px-4 py-3 text-center">Parties</th>
              <th className="px-4 py-3 text-center">WR</th>
              <th className="px-4 py-3 text-center">KDA</th>
              <th className="px-4 py-3 text-center hidden sm:table-cell">K/D/A</th>
              <th className="px-4 py-3 text-center hidden md:table-cell">CS/min</th>
              <th className="px-4 py-3 text-center hidden lg:table-cell">Dégâts</th>
              <th className="px-4 py-3 text-center hidden lg:table-cell">Vision</th>
              <th className="px-4 py-3 text-center hidden xl:table-cell">Or</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dark-border">
            {rows.map(({ player, s: st }) => {
              const rankImg = getRankImage(player.rank)
              return (
                <tr key={player.id} className="hover:bg-dark-bg/30 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      {rankImg && (
                        <img src={rankImg} alt="" aria-hidden className="w-8 h-8 object-contain shrink-0 opacity-80" />
                      )}
                      <div className="min-w-0">
                        <p className="font-medium text-white truncate">{player.player_name || player.pseudo || 'Joueur'}</p>
                        {player.rank && (
                          <p className="text-[10px] text-gray-500 truncate">{player.rank}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <p className="text-white font-semibold">{st!.n}</p>
                    <p className="text-[10px] text-gray-500">{st!.wins}V · {st!.n - st!.wins}D</p>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <p className={`font-bold tabular-nums text-base ${st!.winrate >= 50 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {st!.winrate.toFixed(0)}%
                    </p>
                    <div className="w-16 mx-auto mt-1">
                      <div className="h-1 rounded-full bg-dark-bg overflow-hidden">
                        <div className={`h-full rounded-full ${st!.winrate >= 50 ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{ width: `${st!.winrate}%` }} />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <p className={`font-semibold tabular-nums ${st!.kda >= 3 ? 'text-emerald-400' : st!.kda >= 2 ? 'text-white' : 'text-gray-400'}`}>
                      {st!.kda.toFixed(1)}
                    </p>
                  </td>
                  <td className="px-4 py-4 text-center text-xs text-gray-300 tabular-nums hidden sm:table-cell">
                    {st!.avgK.toFixed(1)} / {st!.avgD.toFixed(1)} / {st!.avgA.toFixed(1)}
                  </td>
                  <td className="px-4 py-4 text-center hidden md:table-cell">
                    <p className="text-white tabular-nums">{st!.avgCsMin > 0 ? st!.avgCsMin.toFixed(1) : '—'}</p>
                  </td>
                  <td className="px-4 py-4 text-center hidden lg:table-cell">
                    <p className="text-white tabular-nums">{st!.avgDamage > 0 ? Math.round(st!.avgDamage).toLocaleString('fr-FR') : '—'}</p>
                  </td>
                  <td className="px-4 py-4 text-center hidden lg:table-cell">
                    <p className="text-white tabular-nums">{st!.avgVision > 0 ? st!.avgVision.toFixed(1) : '—'}</p>
                  </td>
                  <td className="px-4 py-4 text-center hidden xl:table-cell">
                    <p className="text-amber-400 tabular-nums">{st!.avgGold > 0 ? `${(st!.avgGold / 1000).toFixed(1)}k` : '—'}</p>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Export ───────────────────────────────────────────────────────────────────

export function SoloQStatsSection({ selectedId, players }: { selectedId: string; players: any[] }) {
  if (selectedId === ALL_ID) return <AllPlayersSoloQStats players={players} />
  return <PlayerSoloQStats playerId={selectedId} />
}
