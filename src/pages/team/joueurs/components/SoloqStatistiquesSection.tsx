/**
 * Section statistiques Solo Q avec filtres rôle/side
 * Extraite de PlayerDetailPage pour alléger le fichier principal.
 */
import { useState } from 'react'

const ROLE_ORDER_STATS = ['TOP', 'JUNGLE', 'MIDDLE', 'BOTTOM', 'UTILITY'] as const
const ROLE_DISPLAY_STATS: Record<string, string> = {
  TOP: 'Top', JUNGLE: 'Jungle', MIDDLE: 'Mid', BOTTOM: 'ADC', UTILITY: 'Support',
}

function parseTierFromRank(rank: string | null | undefined): string {
  if (!rank) return ''
  for (const t of ['Challenger', 'Grandmaster', 'Master', 'Diamond', 'Emerald', 'Platinum', 'Gold', 'Silver', 'Bronze', 'Iron']) {
    if (rank.toLowerCase().includes(t.toLowerCase())) return t
  }
  return ''
}

function rankCardColors(rank: string | null | undefined): string {
  const t = parseTierFromRank(rank).toLowerCase()
  if (t === 'challenger') return 'border-yellow-400/40 bg-yellow-400/5 text-yellow-300'
  if (t === 'grandmaster') return 'border-red-400/40 bg-red-400/5 text-red-400'
  if (t === 'master') return 'border-purple-400/40 bg-purple-400/5 text-purple-300'
  if (t === 'diamond') return 'border-blue-400/40 bg-blue-400/5 text-blue-300'
  if (t === 'emerald') return 'border-emerald-400/40 bg-emerald-400/5 text-emerald-300'
  if (t === 'platinum') return 'border-cyan-400/40 bg-cyan-400/5 text-cyan-300'
  if (t === 'gold') return 'border-amber-400/40 bg-amber-400/5 text-amber-300'
  if (t === 'silver') return 'border-gray-400/40 bg-gray-400/5 text-gray-300'
  if (t === 'bronze') return 'border-orange-500/40 bg-orange-500/5 text-orange-400'
  if (t === 'iron') return 'border-gray-600/40 bg-gray-600/5 text-gray-400'
  return 'border-dark-border bg-dark-bg/50 text-gray-300'
}

function StatBox({ label, value, sub, valueColor = 'text-white' }: { label: string; value: string; sub?: string; valueColor?: string }) {
  return (
    <div className="rounded-xl border border-dark-border bg-dark-bg/50 p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-xl font-bold font-mono ${valueColor}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

export function SoloqStatistiquesSection({ d, player }: { d: any; player: any }) {
  const [roleFilter, setRoleFilter] = useState('all')
  const [sideFilter, setSideFilter] = useState('all')

  const lpGraphMatches: any[] = d.lpGraphMatches ?? []

  const gamesWithMeta = lpGraphMatches.map((m: any) => {
    const json = m.match_json as any
    return {
      ...m,
      role: json?.teamPosition ?? null,
      side: json?.teamId === 100 ? 'blue' : json?.teamId === 200 ? 'red' : null,
    }
  })

  const hasRoleData = gamesWithMeta.some((g) => g.role != null)
  const hasSideData = gamesWithMeta.some((g) => g.side != null)
  const availableRoles = ROLE_ORDER_STATS.filter((r) => gamesWithMeta.some((g) => g.role === r))

  const filtered = gamesWithMeta.filter((g) => {
    if (roleFilter !== 'all' && g.role !== roleFilter) return false
    if (sideFilter !== 'all' && g.side !== sideFilter) return false
    return true
  })

  const total = filtered.length
  const wins = filtered.filter((g) => g.win).length
  const losses = total - wins
  const wr = total > 0 ? Math.round((wins / total) * 100) : null

  const totalK = filtered.reduce((s: number, m: any) => s + (m.kills ?? 0), 0)
  const totalD = filtered.reduce((s: number, m: any) => s + (m.deaths ?? 0), 0)
  const totalA = filtered.reduce((s: number, m: any) => s + (m.assists ?? 0), 0)
  const avgKda = total > 0
    ? (totalD > 0 ? ((totalK + totalA) / totalD).toFixed(2) : (totalK + totalA).toFixed(2))
    : null
  const avgK = total > 0 ? (totalK / total).toFixed(1) : null
  const avgD = total > 0 ? (totalD / total).toFixed(1) : null
  const avgA = total > 0 ? (totalA / total).toFixed(1) : null

  const withDmg = filtered.filter((m: any) => m.total_damage != null)
  const withCs = filtered.filter((m: any) => m.cs != null && m.game_duration > 0)
  const withVision = filtered.filter((m: any) => m.vision_score != null)
  const withGold = filtered.filter((m: any) => m.gold_earned != null)

  const avgDmg = withDmg.length > 0 ? Math.round(withDmg.reduce((s: number, m: any) => s + m.total_damage, 0) / withDmg.length) : null
  const avgCsPMin = withCs.length > 0
    ? (withCs.reduce((s: number, m: any) => s + m.cs / (m.game_duration / 60), 0) / withCs.length).toFixed(1)
    : null
  const avgVision = withVision.length > 0 ? Math.round(withVision.reduce((s: number, m: any) => s + m.vision_score, 0) / withVision.length) : null
  const avgGold = withGold.length > 0 ? Math.round(withGold.reduce((s: number, m: any) => s + m.gold_earned, 0) / withGold.length) : null

  const blueGames = gamesWithMeta.filter((g) => g.side === 'blue')
  const redGames = gamesWithMeta.filter((g) => g.side === 'red')
  const blueWins = blueGames.filter((g) => g.win).length
  const redWins = redGames.filter((g) => g.win).length
  const blueWR = blueGames.length > 0 ? Math.round((blueWins / blueGames.length) * 100) : null
  const redWR = redGames.length > 0 ? Math.round((redWins / redGames.length) * 100) : null

  const roleBreakdown = ROLE_ORDER_STATS
    .map((role) => {
      const games = gamesWithMeta.filter((g) => g.role === role)
      if (games.length === 0) return null
      const w = games.filter((g) => g.win).length
      const totalK2 = games.reduce((s: number, m: any) => s + (m.kills ?? 0), 0)
      const totalD2 = games.reduce((s: number, m: any) => s + (m.deaths ?? 0), 0)
      const totalA2 = games.reduce((s: number, m: any) => s + (m.assists ?? 0), 0)
      const kda = totalD2 > 0 ? ((totalK2 + totalA2) / totalD2).toFixed(2) : (totalK2 + totalA2).toFixed(2)
      return { role, games: games.length, wins: w, wr: Math.round((w / games.length) * 100), kda }
    })
    .filter(Boolean) as Array<{ role: string; games: number; wins: number; wr: number; kda: string }>

  const peakLp = d.lpCurvePoints.length > 0
    ? Math.max(...d.lpCurvePoints.map((p: any) => p.lp))
    : null
  const lpDelta = d.lpCurvePoints.length >= 2
    ? d.lpCurvePoints[d.lpCurvePoints.length - 1].lp - d.lpCurvePoints[0].lp
    : null
  const tierColors = rankCardColors(player.rank)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className={`rounded-xl border p-5 space-y-2 ${tierColors}`}>
          <p className="text-xs uppercase tracking-wider opacity-60">Rang actuel</p>
          {player.rank ? (
            <>
              <p className="text-2xl font-bold leading-tight">{player.rank}</p>
              <p className="text-xs opacity-50">{parseTierFromRank(player.rank) || 'Solo/Duo'}</p>
            </>
          ) : (
            <p className="text-gray-500 text-sm">Non classé</p>
          )}
        </div>
        <div className="rounded-xl border border-purple-500/30 bg-purple-500/5 p-5 space-y-2">
          <p className="text-xs text-purple-300/60 uppercase tracking-wider">Peak LP — S16</p>
          {peakLp != null ? (
            <>
              <p className="text-2xl font-bold text-purple-300 leading-tight">{peakLp} LP</p>
              <p className="text-xs text-purple-300/40">{parseTierFromRank(player.rank) || 'Master+'}</p>
            </>
          ) : (
            <p className="text-gray-500 text-sm">—</p>
          )}
        </div>
        <div className="rounded-xl border border-dark-border bg-dark-bg/50 p-5 space-y-2">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Saison S16</p>
          <p className="text-2xl font-bold text-white leading-tight">{lpGraphMatches.length} parties</p>
          <div className="flex items-center gap-3 flex-wrap">
            {wr != null && <span className={`text-sm font-semibold ${wr >= 50 ? 'text-emerald-400' : 'text-rose-400'}`}>{wr}% WR</span>}
            {lpDelta != null && <span className={`text-xs font-medium ${lpDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{lpDelta >= 0 ? '+' : ''}{lpDelta} LP</span>}
          </div>
        </div>
      </div>

      {d.lpGraphLoading && <p className="text-gray-500 text-sm">Chargement des statistiques…</p>}
      {!d.lpGraphLoading && lpGraphMatches.length === 0 && (
        <p className="text-gray-500 text-sm">
          Chargez des parties dans l&apos;onglet <strong>Import</strong> pour voir les statistiques.
        </p>
      )}

      {!d.lpGraphLoading && lpGraphMatches.length > 0 && (
        <>
          {(hasRoleData || hasSideData) && (
            <div className="flex flex-wrap gap-5 items-start">
              {hasRoleData && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs text-gray-500 shrink-0">Rôle :</span>
                  {(['all', ...availableRoles] as string[]).map((r) => (
                    <button key={r} type="button" onClick={() => setRoleFilter(r)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${roleFilter === r ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40' : 'bg-dark-bg/60 border border-dark-border text-gray-400 hover:text-white'}`}
                    >
                      {r === 'all' ? 'Tous' : ROLE_DISPLAY_STATS[r] ?? r}
                    </button>
                  ))}
                </div>
              )}
              {hasSideData && (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-gray-500 shrink-0">Side :</span>
                  {([['all', 'Tous'], ['blue', 'Blue'], ['red', 'Red']] as [string, string][]).map(([val, label]) => (
                    <button key={val} type="button" onClick={() => setSideFilter(val)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${sideFilter === val ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40' : 'bg-dark-bg/60 border border-dark-border text-gray-400 hover:text-white'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatBox label="Parties" value={String(total)} sub={`${wins}V · ${losses}D`} />
              <StatBox label="Winrate" value={wr != null ? `${wr}%` : '—'} valueColor={wr != null ? (wr >= 50 ? 'text-emerald-400' : 'text-rose-400') : 'text-gray-400'} />
              <StatBox label="KDA moyen" value={avgKda ?? '—'} sub={avgK && avgD && avgA ? `${avgK} / ${avgD} / ${avgA}` : undefined} valueColor={avgKda && parseFloat(avgKda) >= 3 ? 'text-emerald-400' : avgKda && parseFloat(avgKda) >= 2 ? 'text-white' : 'text-rose-300'} />
              <StatBox label="Kills / Morts / Assists" value={avgK && avgD && avgA ? `${avgK} / ${avgD} / ${avgA}` : '—'} sub="Moyenne par partie" />
            </div>
            {(avgDmg != null || avgCsPMin != null || avgVision != null || avgGold != null) && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {avgDmg != null && <StatBox label="DMG/partie" value={avgDmg.toLocaleString('fr-FR')} />}
                {avgCsPMin != null && <StatBox label="CS/min" value={avgCsPMin} />}
                {avgVision != null && <StatBox label="Vision moy." value={String(avgVision)} />}
                {avgGold != null && <StatBox label="Or/partie" value={`${(avgGold / 1000).toFixed(1)}k`} />}
              </div>
            )}
          </div>

          {hasSideData && (blueWR != null || redWR != null) && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Winrate par côté</h4>
              <div className="grid grid-cols-2 gap-3">
                {blueWR != null && (
                  <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-4">
                    <div className="flex items-center gap-2 mb-2"><span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" /><span className="text-sm text-gray-300 font-medium">Blue Side</span></div>
                    <p className={`text-2xl font-bold ${blueWR >= 50 ? 'text-emerald-400' : 'text-rose-400'}`}>{blueWR}%</p>
                    <p className="text-xs text-gray-500 mt-0.5 mb-2">{blueWins}V / {blueGames.length - blueWins}D · {blueGames.length} parties</p>
                    <div className="h-1.5 rounded-full bg-dark-border overflow-hidden"><div className={`h-full rounded-full transition-colors ${blueWR >= 50 ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{ width: `${blueWR}%` }} /></div>
                  </div>
                )}
                {redWR != null && (
                  <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4">
                    <div className="flex items-center gap-2 mb-2"><span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" /><span className="text-sm text-gray-300 font-medium">Red Side</span></div>
                    <p className={`text-2xl font-bold ${redWR >= 50 ? 'text-emerald-400' : 'text-rose-400'}`}>{redWR}%</p>
                    <p className="text-xs text-gray-500 mt-0.5 mb-2">{redWins}V / {redGames.length - redWins}D · {redGames.length} parties</p>
                    <div className="h-1.5 rounded-full bg-dark-border overflow-hidden"><div className={`h-full rounded-full transition-colors ${redWR >= 50 ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{ width: `${redWR}%` }} /></div>
                  </div>
                )}
              </div>
            </div>
          )}

          {roleBreakdown.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Winrate par rôle</h4>
              <div className="rounded-xl border border-dark-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-dark-bg/80 text-gray-400 text-left">
                      <th className="px-4 py-2.5 font-medium">Rôle</th>
                      <th className="px-4 py-2.5 font-medium text-center">Parties</th>
                      <th className="px-4 py-2.5 font-medium text-center">Winrate</th>
                      <th className="px-4 py-2.5 font-medium text-center">KDA</th>
                      <th className="px-4 py-2.5 font-medium hidden sm:table-cell">Progression</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roleBreakdown.map(({ role, games, wins: w, wr: roleWr, kda }) => (
                      <tr key={role} className="border-t border-dark-border/50 hover:bg-dark-bg/40">
                        <td className="px-4 py-3 font-medium text-white">{ROLE_DISPLAY_STATS[role] ?? role}</td>
                        <td className="px-4 py-3 text-center text-gray-300">{games}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`font-semibold ${roleWr >= 50 ? 'text-emerald-400' : 'text-rose-400'}`}>{roleWr}%</span>
                          <span className="text-gray-500 text-xs ml-1">({w}V/{games - w}D)</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={parseFloat(kda) >= 3 ? 'text-emerald-400' : parseFloat(kda) >= 2 ? 'text-white' : 'text-rose-300'}>{kda}</span>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 rounded-full bg-dark-border overflow-hidden">
                              <div className={`h-full rounded-full ${roleWr >= 50 ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{ width: `${roleWr}%` }} />
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
