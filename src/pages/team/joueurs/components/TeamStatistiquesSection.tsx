/**
 * Section statistiques Team — même structure que Solo Q
 * Filtres type de match + 3 KPI + barre side + 4 blocs stats + breakdown champions
 */
import { useMemo, useState, useEffect } from 'react'
import { getChampionImage, getChampionDisplayName } from '../../../../lib/championImages'

function avg(arr: number[]): number | null {
  if (!arr.length) return null
  return arr.reduce((s, v) => s + v, 0) / arr.length
}
function fmt(n: number | null, decimals = 1): string {
  if (n == null) return '—'
  return n.toFixed(decimals)
}
function fmtK(n: number | null): string {
  if (n == null) return '—'
  return `${(n / 1000).toFixed(1)}k`
}

function StatRow({ label, value, valueColor = 'text-white', hint }: {
  label: string; value: string; valueColor?: string; hint?: string
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-dark-border/30 last:border-0">
      <span className="text-sm text-gray-400">{label}</span>
      <div className="text-right">
        <span className={`text-sm font-semibold ${valueColor}`}>{value}</span>
        {hint && <span className="text-xs text-gray-600 ml-1.5">{hint}</span>}
      </div>
    </div>
  )
}

function StatCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dark-border bg-dark-bg/50 p-4">
      <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{title}</p>
      <div>{children}</div>
    </div>
  )
}

function KpiCard({ label, value, sub, bar, valueColor = 'text-white', barColor }: {
  label: string; value: string; sub?: string; bar?: number
  valueColor?: string; barColor?: string
}) {
  return (
    <div className="rounded-2xl border border-dark-border bg-dark-bg/50 p-5 flex flex-col gap-2.5">
      <p className="text-xs text-gray-500 uppercase tracking-wider">{label}</p>
      <p className={`text-4xl font-bold font-mono leading-none ${valueColor}`}>{value}</p>
      {sub && <p className="text-sm text-gray-400">{sub}</p>}
      {bar != null && barColor && (
        <div className="h-1.5 rounded-full bg-dark-border overflow-hidden mt-0.5">
          <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.min(bar, 100)}%` }} />
        </div>
      )}
    </div>
  )
}

// ─── Barre Blue / Red side animée ─────────────────────────────────────────────
function SideBar({ blueWR, redWR, blueGames, redGames }: {
  blueWR: number | null; redWR: number | null
  blueGames: number; redGames: number
}) {
  const [activeSide, setActiveSide] = useState<'blue' | 'red'>('blue')
  const [started, setStarted] = useState(false)

  // Lance le remplissage initial après le premier rendu
  useEffect(() => {
    const t = setTimeout(() => setStarted(true), 80)
    return () => clearTimeout(t)
  }, [])

  // Alterne toutes les 5 secondes
  useEffect(() => {
    const timer = setInterval(() => setActiveSide((s) => (s === 'blue' ? 'red' : 'blue')), 5000)
    return () => clearInterval(timer)
  }, [])

  const isBlue = activeSide === 'blue'
  const currentWR = isBlue ? (blueWR ?? 0) : (redWR ?? 0)
  const currentGames = isBlue ? blueGames : redGames

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        {/* Label gauche (Blue) */}
        <div className={`flex flex-col items-end w-20 shrink-0 transition-all duration-700 ${isBlue ? 'opacity-100' : 'opacity-30'}`}>
          <span className="text-xs font-semibold text-blue-400">{blueWR != null ? `${blueWR}%` : '—'}</span>
          <span className="text-[10px] text-gray-600">{blueGames}G Blue</span>
        </div>

        {/* Barre */}
        <div className="relative flex-1 h-2 bg-dark-border/40 rounded-full overflow-hidden">
          {/* Remplissage bleu — de gauche à droite */}
          <div
            className="absolute left-0 top-0 h-full bg-blue-500 rounded-l-full transition-all duration-1000 ease-out"
            style={{ width: isBlue && started ? `${blueWR ?? 0}%` : '0%' }}
          />
          {/* Remplissage rouge — de droite à gauche */}
          <div
            className="absolute right-0 top-0 h-full bg-rose-500 rounded-r-full transition-all duration-1000 ease-out"
            style={{ width: !isBlue && started ? `${redWR ?? 0}%` : '0%' }}
          />
        </div>

        {/* Label droite (Red) */}
        <div className={`flex flex-col items-start w-20 shrink-0 transition-all duration-700 ${!isBlue ? 'opacity-100' : 'opacity-30'}`}>
          <span className="text-xs font-semibold text-rose-400">{redWR != null ? `${redWR}%` : '—'}</span>
          <span className="text-[10px] text-gray-600">{redGames}G Rouge</span>
        </div>
      </div>

      {/* Indicateur actif */}
      <div className="flex items-center justify-center gap-3">
        <div className={`flex items-center gap-1.5 transition-all duration-500 ${isBlue ? 'opacity-100' : 'opacity-30'}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${isBlue ? 'bg-blue-400 shadow-[0_0_6px_rgba(96,165,250,0.8)]' : 'bg-blue-800'} transition-all duration-500`} />
          <span className="text-[10px] text-blue-400 font-medium">Côté Bleu · {currentWR > 0 && isBlue ? `${currentWR}% WR · ${currentGames}G` : ''}</span>
        </div>
        <div className={`flex items-center gap-1.5 transition-all duration-500 ${!isBlue ? 'opacity-100' : 'opacity-30'}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${!isBlue ? 'bg-rose-400 shadow-[0_0_6px_rgba(251,113,133,0.8)]' : 'bg-rose-900'} transition-all duration-500`} />
          <span className="text-[10px] text-rose-400 font-medium">Côté Rouge · {currentWR > 0 && !isBlue ? `${currentWR}% WR · ${currentGames}G` : ''}</span>
        </div>
      </div>
    </div>
  )
}

const MATCH_TYPE_FILTERS = [
  { id: 'all', label: 'Tous' },
  { id: 'scrim', label: 'Scrims' },
  { id: 'tournament', label: 'Tournois' },
] as const

export function TeamStatistiquesSection({ d }: { d: any }) {
  const { filteredTeamStats, teamStatsLoading, teamMatchTypeFilter, setTeamMatchTypeFilter } = d

  const real = useMemo(
    () => (filteredTeamStats ?? []).filter((s: any) => (s.team_matches?.game_duration ?? 0) >= 180),
    [filteredTeamStats]
  )
  const all = filteredTeamStats ?? []

  const total = all.length
  const wins = all.filter((s: any) => s.team_matches?.our_win).length
  const losses = total - wins
  const wr = total > 0 ? Math.round((wins / total) * 100) : null

  const n = real.length
  const totalK = real.reduce((s: number, m: any) => s + (m.kills ?? 0), 0)
  const totalD = real.reduce((s: number, m: any) => s + (m.deaths ?? 0), 0)
  const totalA = real.reduce((s: number, m: any) => s + (m.assists ?? 0), 0)
  const avgKda = n > 0 ? (totalD > 0 ? (totalK + totalA) / totalD : totalK + totalA) : null
  const avgK = n > 0 ? totalK / n : null
  const avgD = n > 0 ? totalD / n : null
  const avgA = n > 0 ? totalA / n : null

  const withDur = real.filter((s: any) => (s.team_matches?.game_duration ?? 0) > 0)
  const avgDurMin = avg(withDur.map((s: any) => s.team_matches.game_duration / 60))

  // Combat
  const withDmg = real.filter((s: any) => s.total_damage_dealt_to_champions != null && (s.team_matches?.game_duration ?? 0) > 0)
  const avgDmg = avg(withDmg.map((s: any) => s.total_damage_dealt_to_champions))
  const avgDPMin = avg(withDmg.map((s: any) => s.total_damage_dealt_to_champions / (s.team_matches.game_duration / 60)))

  // Gold & CS
  const withGold = real.filter((s: any) => s.gold_earned != null && (s.team_matches?.game_duration ?? 0) > 0)
  const avgGold = avg(withGold.map((s: any) => s.gold_earned))
  const avgGoldPMin = avg(withGold.map((s: any) => s.gold_earned / (s.team_matches.game_duration / 60)))

  const withCs = real.filter((s: any) => s.cs != null && (s.team_matches?.game_duration ?? 0) > 0)
  const avgCs = avg(withCs.map((s: any) => s.cs))
  const avgCsPMin = avg(withCs.map((s: any) => s.cs / (s.team_matches.game_duration / 60)))

  // Vision
  const withVision = real.filter((s: any) => s.vision_score != null)
  const avgVision = avg(withVision.map((s: any) => s.vision_score))
  const avgVPMin = avg(withVision.filter((s: any) => (s.team_matches?.game_duration ?? 0) > 0).map((s: any) => s.vision_score / (s.team_matches.game_duration / 60)))
  const withWards = real.filter((s: any) => (s.wards_placed ?? s.wardsPlaced) != null)
  const avgWardsPlaced = avg(withWards.map((s: any) => s.wards_placed ?? s.wardsPlaced))
  const withCtrl = real.filter((s: any) => (s.control_wards_purchased ?? s.visionWardsBoughtInGame) != null)
  const avgCtrlWards = avg(withCtrl.map((s: any) => s.control_wards_purchased ?? s.visionWardsBoughtInGame))
  const totalPinks = withCtrl.length > 0
    ? withCtrl.reduce((sum: number, s: any) => sum + (s.control_wards_purchased ?? s.visionWardsBoughtInGame ?? 0), 0)
    : null
  const withWardKill = real.filter((s: any) => (s.wards_killed ?? s.wardsKilled) != null)
  const avgWardsKilled = avg(withWardKill.map((s: any) => s.wards_killed ?? s.wardsKilled))

  // Turret plates (si disponible dans les données)
  const withPlates = real.filter((s: any) => (s.turret_plates ?? s.turretPlatesTaken) != null)
  const totalPlates = withPlates.length > 0
    ? withPlates.reduce((sum: number, s: any) => sum + (s.turret_plates ?? s.turretPlatesTaken ?? 0), 0)
    : null
  const avgPlates = avg(withPlates.map((s: any) => s.turret_plates ?? s.turretPlatesTaken))

  // Side breakdown (our_team_id: 100 = blue, 200 = red)
  const blueGames = all.filter((s: any) => s.team_matches?.our_team_id === 100)
  const redGames = all.filter((s: any) => s.team_matches?.our_team_id === 200)
  const blueWins = blueGames.filter((s: any) => s.team_matches?.our_win).length
  const redWins = redGames.filter((s: any) => s.team_matches?.our_win).length
  const blueWR = blueGames.length > 0 ? Math.round((blueWins / blueGames.length) * 100) : null
  const redWR = redGames.length > 0 ? Math.round((redWins / redGames.length) * 100) : null
  const hasSideData = blueGames.length > 0 || redGames.length > 0

  // Champion breakdown
  const champBreakdown = useMemo(() => {
    const map = new Map<string, { games: number; wins: number; k: number; d: number; a: number }>()
    for (const s of all) {
      const name = s.champion_name
      if (!name) continue
      const entry = map.get(name) ?? { games: 0, wins: 0, k: 0, d: 0, a: 0 }
      entry.games++
      if (s.team_matches?.our_win) entry.wins++
      entry.k += s.kills ?? 0
      entry.d += s.deaths ?? 0
      entry.a += s.assists ?? 0
      map.set(name, entry)
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1].games - a[1].games)
      .slice(0, 8)
      .map(([name, v]) => {
        const kda = v.d > 0 ? ((v.k + v.a) / v.d).toFixed(2) : (v.k + v.a).toFixed(2)
        return { name, games: v.games, wins: v.wins, wr: Math.round((v.wins / v.games) * 100), kda }
      })
  }, [all])

  const wrColor = wr != null ? (wr >= 50 ? 'text-emerald-400' : 'text-rose-400') : 'text-gray-400'
  const wrBarColor = wr != null ? (wr >= 50 ? 'bg-emerald-500' : 'bg-rose-500') : 'bg-gray-600'
  const kdaVal = avgKda ?? 0
  const kdaColor = n > 0 ? (kdaVal >= 3 ? 'text-emerald-400' : kdaVal >= 2 ? 'text-white' : 'text-rose-300') : 'text-gray-400'

  if (teamStatsLoading) return <p className="text-gray-500 text-sm">Chargement…</p>
  if (total === 0) return (
    <div className="rounded-2xl border border-dark-border bg-dark-card/50 p-8 text-center">
      <p className="text-gray-500 text-sm">Aucune donnée. Ajoutez des parties depuis <strong>Matchs</strong>.</p>
    </div>
  )

  return (
    <div className="space-y-5">
      {/* Filtre type de match */}
      <div className="flex items-center gap-1.5 justify-end">
        <span className="text-xs text-gray-500 shrink-0">Type :</span>
        {MATCH_TYPE_FILTERS.map(({ id, label }) => (
          <button key={id} type="button" onClick={() => setTeamMatchTypeFilter(id)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
              teamMatchTypeFilter === id
                ? 'bg-accent-blue/20 text-accent-blue border border-accent-blue/40'
                : 'bg-dark-bg/60 border border-dark-border text-gray-400 hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 3 KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          label="Winrate"
          value={wr != null ? `${wr}%` : '—'}
          sub={`${wins}V · ${losses}D`}
          bar={wr ?? 0}
          barColor={wrBarColor}
          valueColor={wrColor}
        />
        <KpiCard
          label="KDA moyen"
          value={avgKda != null ? fmt(avgKda, 2) : '—'}
          sub={avgK != null ? `${fmt(avgK)} / ${fmt(avgD)} / ${fmt(avgA)}` : undefined}
          valueColor={kdaColor}
        />
        <KpiCard
          label="Parties"
          value={String(total)}
          sub={avgDurMin != null ? `Durée moy. ${fmt(avgDurMin, 0)} min` : undefined}
          valueColor="text-white"
        />
      </div>

      {/* Barre Blue / Red side animée */}
      {hasSideData && (
        <SideBar
          blueWR={blueWR}
          redWR={redWR}
          blueGames={blueGames.length}
          redGames={redGames.length}
        />
      )}

      {n > 0 && (
        <>
          {/* 4 blocs de stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Combat */}
            <StatCard title="Combat">
              {avgK != null && (
                <StatRow label="Kills / partie" value={fmt(avgK)} valueColor={avgK >= 5 ? 'text-emerald-400' : 'text-white'} />
              )}
              {avgD != null && (
                <StatRow
                  label="Morts / partie"
                  value={fmt(avgD)}
                  valueColor={avgD <= 2 ? 'text-emerald-400' : avgD <= 4 ? 'text-white' : 'text-rose-400'}
                />
              )}
              {avgA != null && (
                <StatRow label="Assists / partie" value={fmt(avgA)} valueColor="text-blue-400" />
              )}
              {avgDmg != null && (
                <StatRow label="Dégâts / partie" value={Math.round(avgDmg).toLocaleString('fr-FR')} valueColor="text-white" />
              )}
              {avgDPMin != null && (
                <StatRow
                  label="Dégâts / min (DPM)"
                  value={Math.round(avgDPMin).toLocaleString('fr-FR')}
                  valueColor={avgDPMin >= 600 ? 'text-emerald-400' : avgDPMin >= 350 ? 'text-white' : 'text-rose-300'}
                />
              )}
            </StatCard>

            {/* Or & Économie */}
            <StatCard title="Économie">
              {avgGold != null && (
                <StatRow label="Or / partie" value={fmtK(avgGold)} valueColor="text-amber-400" />
              )}
              {avgGoldPMin != null && (
                <StatRow
                  label="Or / min"
                  value={fmt(avgGoldPMin, 0)}
                  valueColor={avgGoldPMin >= 400 ? 'text-emerald-400' : avgGoldPMin >= 300 ? 'text-white' : 'text-rose-300'}
                />
              )}
              {avgCsPMin != null && (
                <StatRow
                  label="CS / min"
                  value={fmt(avgCsPMin)}
                  valueColor={avgCsPMin >= 8 ? 'text-emerald-400' : avgCsPMin >= 6 ? 'text-white' : 'text-rose-300'}
                />
              )}
              {avgCs != null && (
                <StatRow
                  label="CS / partie"
                  value={fmt(avgCs, 0)}
                  valueColor="text-gray-300"
                />
              )}
              {avgPlates != null && (
                <StatRow
                  label="Plates / partie"
                  value={fmt(avgPlates, 1)}
                  hint={totalPlates != null ? `${totalPlates} total` : undefined}
                  valueColor={avgPlates >= 3 ? 'text-emerald-400' : avgPlates >= 1.5 ? 'text-white' : 'text-gray-300'}
                />
              )}
            </StatCard>

            {/* Vision */}
            <StatCard title="Vision &amp; Contrôle">
              {avgVision != null && (
                <StatRow
                  label="Score de vision"
                  value={fmt(avgVision, 0)}
                  valueColor={avgVision >= 30 ? 'text-emerald-400' : avgVision >= 20 ? 'text-white' : 'text-rose-300'}
                />
              )}
              {avgVPMin != null && (
                <StatRow label="Vision / min" value={fmt(avgVPMin, 2)} valueColor="text-gray-300" />
              )}
              {avgWardsPlaced != null && (
                <StatRow
                  label="Wards posées / partie"
                  value={fmt(avgWardsPlaced, 1)}
                  valueColor={avgWardsPlaced >= 8 ? 'text-emerald-400' : avgWardsPlaced >= 5 ? 'text-white' : 'text-rose-300'}
                />
              )}
              {avgCtrlWards != null && (
                <StatRow
                  label="Pinks achetés / partie"
                  value={fmt(avgCtrlWards, 1)}
                  hint={totalPinks != null ? `${totalPinks} total` : undefined}
                  valueColor={avgCtrlWards >= 2 ? 'text-emerald-400' : avgCtrlWards >= 1 ? 'text-white' : 'text-rose-300'}
                />
              )}
              {avgWardsKilled != null && (
                <StatRow label="Wards détruites / partie" value={fmt(avgWardsKilled, 1)} valueColor="text-gray-300" />
              )}
            </StatCard>

            {/* Performance détaillée */}
            <StatCard title="Performance détaillée">
              {avgKda != null && (
                <StatRow
                  label="KDA ratio"
                  value={fmt(avgKda, 2)}
                  valueColor={kdaColor}
                />
              )}
              {avgK != null && avgD != null && avgA != null && (
                <StatRow label="K / M / A par partie" value={`${fmt(avgK)} / ${fmt(avgD)} / ${fmt(avgA)}`} valueColor="text-gray-300" />
              )}
              {n > 0 && (
                <StatRow
                  label="Total Kills / Morts / Assists"
                  value={`${totalK} / ${totalD} / ${totalA}`}
                  valueColor="text-gray-300"
                />
              )}
              {wr != null && (
                <StatRow
                  label="Winrate global"
                  value={`${wr}%`}
                  hint={`${wins}V · ${losses}D`}
                  valueColor={wrColor}
                />
              )}
            </StatCard>
          </div>

          {/* Breakdown par champion */}
          {champBreakdown.length > 0 && (
            <div className="rounded-2xl border border-dark-border bg-dark-bg/50 overflow-hidden">
              <div className="px-4 py-3 border-b border-dark-border/50">
                <p className="text-xs text-gray-500 uppercase tracking-wider">Champions joués</p>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-500 text-left bg-dark-bg/40">
                    <th className="px-4 py-2.5 font-medium text-xs">Champion</th>
                    <th className="px-4 py-2.5 font-medium text-xs text-center">Parties</th>
                    <th className="px-4 py-2.5 font-medium text-xs text-center">Winrate</th>
                    <th className="px-4 py-2.5 font-medium text-xs text-center">KDA</th>
                    <th className="px-4 py-2.5 hidden sm:table-cell" />
                  </tr>
                </thead>
                <tbody>
                  {champBreakdown.map(({ name, games, wins: w, wr: cWr, kda }) => (
                    <tr key={name} className="border-t border-dark-border/30 hover:bg-dark-bg/30">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <img src={getChampionImage(name)} alt={name} className="w-7 h-7 rounded object-cover border border-dark-border/60 shrink-0" />
                          <span className="font-medium text-white">{getChampionDisplayName(name) || name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-center text-gray-400">{games}</td>
                      <td className="px-4 py-2.5 text-center">
                        <span className={`font-semibold ${cWr >= 50 ? 'text-emerald-400' : 'text-rose-400'}`}>{cWr}%</span>
                        <span className="text-gray-600 text-xs ml-1">({w}V/{games - w}D)</span>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <span className={parseFloat(kda) >= 3 ? 'text-emerald-400' : parseFloat(kda) >= 2 ? 'text-white' : 'text-rose-300'}>{kda}</span>
                      </td>
                      <td className="px-4 py-2.5 hidden sm:table-cell">
                        <div className="h-1.5 rounded-full bg-dark-border overflow-hidden">
                          <div className={`h-full rounded-full ${cWr >= 50 ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{ width: `${cWr}%` }} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
