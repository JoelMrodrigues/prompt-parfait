/**
 * Section Solo Q dans la page Statistiques équipe
 * Affiche les stats SoloQ depuis player_soloq_matches (Supabase)
 * Mode ALL : vue agrégée par joueur
 * Mode joueur : stats détaillées + champions
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
      .select('win, kills, deaths, assists, game_duration, total_damage, cs, vision_score, gold_earned, champion_name, match_json')
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
      .select('player_id, win, kills, deaths, assists, game_duration, champion_name')
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

// ─── Helper : compute stats from rows ────────────────────────────────────────

function computeStats(rows: any[]) {
  const n = rows.length
  if (!n) return null
  const wins = rows.filter((r) => r.win).length
  const sumK = rows.reduce((a, r) => a + (r.kills ?? 0), 0)
  const sumD = rows.reduce((a, r) => a + (r.deaths ?? 0), 0)
  const sumA = rows.reduce((a, r) => a + (r.assists ?? 0), 0)
  const kda = sumD > 0 ? (sumK + sumA) / sumD : sumK + sumA
  const csPerMin = rows
    .filter((r) => r.cs != null && r.game_duration > 0)
    .map((r) => r.cs / (r.game_duration / 60))
  const avgCsMin = csPerMin.length ? csPerMin.reduce((a, b) => a + b, 0) / csPerMin.length : 0
  return {
    n, wins, winrate: (wins / n) * 100,
    avgK: sumK / n, avgD: sumD / n, avgA: sumA / n, kda,
    avgCsMin,
  }
}

function computeChampions(rows: any[]) {
  const byChamp: Record<string, { games: number; wins: number; kills: number; deaths: number; assists: number }> = {}
  for (const r of rows) {
    const name = r.champion_name || 'Unknown'
    if (!byChamp[name]) byChamp[name] = { games: 0, wins: 0, kills: 0, deaths: 0, assists: 0 }
    const c = byChamp[name]
    c.games++
    if (r.win) c.wins++
    c.kills += r.kills ?? 0
    c.deaths += r.deaths ?? 0
    c.assists += r.assists ?? 0
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
    }))
    .sort((a, b) => b.games - a.games)
}

// ─── Vue joueur individuel ────────────────────────────────────────────────────

function PlayerSoloQStats({ playerId }: { playerId: string }) {
  const { rows, loading } = useSoloqStats(playerId)

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

  const s = computeStats(rows)!
  const champions = computeChampions(rows).slice(0, 8)

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
                    <p className="text-gray-500">Winrate</p>
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

// ─── Vue ALL — tableau agrégé ────────────────────────────────────────────────

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
    return { player: p, s, matches }
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
              <p className="text-sm font-medium text-white">
                {player.player_name || player.pseudo || 'Joueur'}
              </p>
              <p className="text-xs text-gray-500">{st!.n} partie{st!.n > 1 ? 's' : ''}</p>
            </div>
            <div className="flex items-center gap-6 text-xs">
              <div className="text-right">
                <p className="text-gray-500">WR</p>
                <p className={`font-bold tabular-nums ${st!.winrate >= 50 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {st!.winrate.toFixed(0)}%
                </p>
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
                <p className="text-white tabular-nums">{st!.avgCsMin.toFixed(1)}</p>
              </div>
              <div className="w-16">
                <div className="h-1.5 rounded-full bg-dark-bg overflow-hidden">
                  <div
                    className={`h-full rounded-full ${st!.winrate >= 50 ? 'bg-emerald-500' : 'bg-rose-500'}`}
                    style={{ width: `${st!.winrate}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Export principal ─────────────────────────────────────────────────────────

export function SoloQStatsSection({
  selectedId,
  players,
}: {
  selectedId: string
  players: any[]
}) {
  if (selectedId === ALL_ID) {
    return <AllPlayersSoloQStats players={players} />
  }
  return <PlayerSoloQStats playerId={selectedId} />
}
