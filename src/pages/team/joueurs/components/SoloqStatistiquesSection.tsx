/**
 * Section statistiques Solo Q — version complète avec toutes les stats disponibles
 */
import { useState } from 'react'

const ROLE_ORDER_STATS = ['TOP', 'JUNGLE', 'MIDDLE', 'BOTTOM', 'UTILITY'] as const
const ROLE_DISPLAY_STATS: Record<string, string> = {
  TOP: 'Top', JUNGLE: 'Jungle', MIDDLE: 'Mid', BOTTOM: 'ADC', UTILITY: 'Support',
}

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
function fmtPct(n: number | null): string {
  if (n == null) return '—'
  return `${Math.round(n)}%`
}

// ─── Stat row inside a category card ─────────────────────────────────────────
function StatRow({
  label, value, valueColor = 'text-white', hint,
}: { label: string; value: string; valueColor?: string; hint?: string }) {
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

// ─── Category card ─────────────────────────────────────────────────────────
function StatCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dark-border bg-dark-bg/50 p-4">
      <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{title}</p>
      <div>{children}</div>
    </div>
  )
}

// ─── KPI hero card ──────────────────────────────────────────────────────────
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

export function SoloqStatistiquesSection({ d }: { d: any }) {
  const [roleFilter, setRoleFilter] = useState('all')
  const [sideFilter, setSideFilter] = useState('all')

  const lpGraphMatches: any[] = d.lpGraphMatches ?? []

  const gamesWithMeta = lpGraphMatches.map((m: any) => {
    const json = m.match_json as any
    return {
      ...m,
      _json: json,
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

  const real = filtered.filter((g) => (g.game_duration ?? 0) >= 180)
  const total = filtered.length
  const wins = filtered.filter((g) => g.win).length
  const losses = total - wins
  const wr = total > 0 ? Math.round((wins / total) * 100) : null

  // ── KDA ────────────────────────────────────────────────────────────────────
  const totalK = real.reduce((s, m) => s + (m.kills ?? 0), 0)
  const totalD = real.reduce((s, m) => s + (m.deaths ?? 0), 0)
  const totalA = real.reduce((s, m) => s + (m.assists ?? 0), 0)
  const n = real.length
  const avgKda = n > 0 ? (totalD > 0 ? (totalK + totalA) / totalD : totalK + totalA) : null
  const avgK = n > 0 ? totalK / n : null
  const avgD = n > 0 ? totalD / n : null
  const avgA = n > 0 ? totalA / n : null

  // ── Farming ─────────────────────────────────────────────────────────────────
  const withCs = real.filter((m) => m.cs != null && m.game_duration > 0)
  const withGold = real.filter((m) => m.gold_earned != null && m.game_duration > 0)
  const avgCsPMin = avg(withCs.map((m) => m.cs / (m.game_duration / 60)))
  const avgGold = avg(withGold.map((m) => m.gold_earned))
  const avgGoldPMin = avg(withGold.map((m) => m.gold_earned / (m.game_duration / 60)))
  const avgDurMin = avg(real.filter((m) => m.game_duration > 0).map((m) => m.game_duration / 60))

  // ── Combat ─────────────────────────────────────────────────────────────────
  const withDmg = real.filter((m) => m.total_damage != null && m.game_duration > 0)
  const withDmgTaken = real.filter((m) => m._json?.totalDamageTaken != null)
  const withTurretDmg = real.filter((m) => m._json?.damageDealtToTurrets != null)
  const avgDmg = avg(withDmg.map((m) => m.total_damage))
  const avgDPMin = avg(withDmg.map((m) => m.total_damage / (m.game_duration / 60)))
  const avgDmgTaken = avg(withDmgTaken.map((m) => m._json.totalDamageTaken))
  const avgTurretDmg = avg(withTurretDmg.map((m) => m._json.damageDealtToTurrets))

  // Kill participation (challenges.killParticipation = 0.0–1.0)
  const withKp = real.filter((m) => m._json?.challenges?.killParticipation != null)
  const avgKp = avg(withKp.map((m) => m._json.challenges.killParticipation * 100))

  // First blood
  const withFb = real.filter((m) => m._json?.firstBloodKill != null)
  const fbCount = withFb.filter((m) => m._json.firstBloodKill).length
  const fbRate = withFb.length > 0 ? Math.round((fbCount / withFb.length) * 100) : null

  // Multi-kills
  const doubles = real.reduce((s, m) => s + (m._json?.doubleKills ?? 0), 0)
  const triples = real.reduce((s, m) => s + (m._json?.tripleKills ?? 0), 0)
  const quadras = real.reduce((s, m) => s + (m._json?.quadraKills ?? 0), 0)
  const pentas = real.reduce((s, m) => s + (m._json?.pentaKills ?? 0), 0)

  // ── Vision ─────────────────────────────────────────────────────────────────
  const withVision = real.filter((m) => m.vision_score != null)
  const withWards = real.filter((m) => m._json?.wardsPlaced != null)
  const withCtrl = real.filter((m) => m._json?.visionWardsBoughtInGame != null)
  const withWardKill = real.filter((m) => m._json?.wardsKilled != null)
  const avgVision = avg(withVision.map((m) => m.vision_score))
  const avgVPMin = avg(withVision.filter((m) => m.game_duration > 0).map((m) => m.vision_score / (m.game_duration / 60)))
  const avgWardsPlaced = avg(withWards.map((m) => m._json.wardsPlaced))
  const avgCtrlWards = avg(withCtrl.map((m) => m._json.visionWardsBoughtInGame))
  const avgWardsKilled = avg(withWardKill.map((m) => m._json.wardsKilled))

  // ── Efficacité ─────────────────────────────────────────────────────────────
  const avgLevel = avg(real.filter((m) => m._json?.champLevel != null).map((m) => m._json.champLevel))

  // ── Side breakdown ─────────────────────────────────────────────────────────
  const blueGames = gamesWithMeta.filter((g) => g.side === 'blue')
  const redGames = gamesWithMeta.filter((g) => g.side === 'red')
  const blueWins = blueGames.filter((g) => g.win).length
  const redWins = redGames.filter((g) => g.win).length
  const blueWR = blueGames.length > 0 ? Math.round((blueWins / blueGames.length) * 100) : null
  const redWR = redGames.length > 0 ? Math.round((redWins / redGames.length) * 100) : null

  // ── Role breakdown ─────────────────────────────────────────────────────────
  const roleBreakdown = ROLE_ORDER_STATS.map((role) => {
    const games = gamesWithMeta.filter((g) => g.role === role)
    if (!games.length) return null
    const w = games.filter((g) => g.win).length
    const rK = games.reduce((s, m) => s + (m.kills ?? 0), 0)
    const rD = games.reduce((s, m) => s + (m.deaths ?? 0), 0)
    const rA = games.reduce((s, m) => s + (m.assists ?? 0), 0)
    const kda = rD > 0 ? ((rK + rA) / rD).toFixed(2) : (rK + rA).toFixed(2)
    return { role, games: games.length, wins: w, wr: Math.round((w / games.length) * 100), kda }
  }).filter(Boolean) as Array<{ role: string; games: number; wins: number; wr: number; kda: string }>

  // ── Colors ─────────────────────────────────────────────────────────────────
  const wrColor = wr != null ? (wr >= 50 ? 'text-emerald-400' : 'text-rose-400') : 'text-gray-400'
  const wrBarColor = wr != null ? (wr >= 50 ? 'bg-emerald-500' : 'bg-rose-500') : 'bg-gray-600'
  const kdaVal = avgKda ?? 0
  const kdaColor = n > 0 ? (kdaVal >= 3 ? 'text-emerald-400' : kdaVal >= 2 ? 'text-white' : 'text-rose-300') : 'text-gray-400'

  const hasContent = real.length > 0

  return (
    <div className="space-y-5">
      {d.lpGraphLoading && <p className="text-gray-500 text-sm">Chargement des statistiques…</p>}
      {!d.lpGraphLoading && lpGraphMatches.length === 0 && (
        <p className="text-gray-500 text-sm">
          Chargez des parties dans l&apos;onglet <strong>Import</strong> pour voir les statistiques.
        </p>
      )}

      {!d.lpGraphLoading && lpGraphMatches.length > 0 && (
        <>
          {/* Filtres */}
          {(hasRoleData || hasSideData) && (
            <div className="flex flex-wrap gap-4 items-center justify-end">
              {hasRoleData && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs text-gray-500 shrink-0">Rôle :</span>
                  {(['all', ...availableRoles] as string[]).map((r) => (
                    <button key={r} type="button" onClick={() => setRoleFilter(r)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                        roleFilter === r
                          ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40'
                          : 'bg-dark-bg/60 border border-dark-border text-gray-400 hover:text-white'
                      }`}
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
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                        sideFilter === val
                          ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40'
                          : 'bg-dark-bg/60 border border-dark-border text-gray-400 hover:text-white'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 3 KPI hero cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <KpiCard
              label="Winrate"
              value={wr != null ? `${wr}%` : '—'}
              sub={total > 0 ? `${wins}V · ${losses}D` : undefined}
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
              label="Parties S16"
              value={String(total)}
              sub={avgDurMin != null ? `Durée moy. ${fmt(avgDurMin, 0)} min` : undefined}
              valueColor="text-white"
            />
          </div>

          {hasContent && (
            <>
              {/* 4 catégories de stats */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                {/* Combat */}
                <StatCard title="Combat">
                  {avgDmg != null && (
                    <StatRow
                      label="Dégâts / partie"
                      value={Math.round(avgDmg).toLocaleString('fr-FR')}
                      valueColor="text-white"
                    />
                  )}
                  {avgDPMin != null && (
                    <StatRow
                      label="Dégâts / min (DPM)"
                      value={Math.round(avgDPMin).toLocaleString('fr-FR')}
                      valueColor={avgDPMin >= 600 ? 'text-emerald-400' : avgDPMin >= 350 ? 'text-white' : 'text-rose-300'}
                    />
                  )}
                  {avgDmgTaken != null && (
                    <StatRow
                      label="Dégâts reçus / partie"
                      value={Math.round(avgDmgTaken).toLocaleString('fr-FR')}
                      valueColor="text-gray-300"
                    />
                  )}
                  {avgTurretDmg != null && (
                    <StatRow
                      label="Dégâts tourelles / partie"
                      value={Math.round(avgTurretDmg).toLocaleString('fr-FR')}
                      valueColor="text-amber-400"
                    />
                  )}
                  {avgKp != null && (
                    <StatRow
                      label="Kill participation"
                      value={fmtPct(avgKp)}
                      valueColor={avgKp >= 60 ? 'text-emerald-400' : avgKp >= 40 ? 'text-white' : 'text-rose-300'}
                    />
                  )}
                  {fbRate != null && (
                    <StatRow
                      label="First blood"
                      value={fmtPct(fbRate)}
                      hint={`${fbCount} fois`}
                      valueColor={fbRate >= 20 ? 'text-emerald-400' : 'text-gray-300'}
                    />
                  )}
                  {(doubles + triples + quadras + pentas) > 0 && (
                    <StatRow
                      label="Multi-kills"
                      value={`${doubles}D · ${triples}T · ${quadras}Q · ${pentas}P`}
                      valueColor="text-purple-400"
                    />
                  )}
                </StatCard>

                {/* Farming */}
                <StatCard title="Farming &amp; Économie">
                  {avgCsPMin != null && (
                    <StatRow
                      label="CS / min"
                      value={fmt(avgCsPMin)}
                      valueColor={avgCsPMin >= 8 ? 'text-emerald-400' : avgCsPMin >= 6 ? 'text-white' : 'text-rose-300'}
                    />
                  )}
                  {withCs.length > 0 && (
                    <StatRow
                      label="CS / partie"
                      value={fmt(avg(withCs.map((m) => m.cs)), 0)}
                      valueColor="text-gray-300"
                    />
                  )}
                  {avgGoldPMin != null && (
                    <StatRow
                      label="Or / min"
                      value={fmt(avgGoldPMin, 0)}
                      valueColor={avgGoldPMin >= 400 ? 'text-emerald-400' : avgGoldPMin >= 300 ? 'text-white' : 'text-rose-300'}
                    />
                  )}
                  {avgGold != null && (
                    <StatRow
                      label="Or / partie"
                      value={fmtK(avgGold)}
                      valueColor="text-amber-400"
                    />
                  )}
                  {avgLevel != null && (
                    <StatRow
                      label="Niveau fin de partie"
                      value={fmt(avgLevel, 1)}
                      valueColor="text-gray-300"
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
                    <StatRow
                      label="Vision / min"
                      value={fmt(avgVPMin, 2)}
                      valueColor="text-gray-300"
                    />
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
                      label="Wards de contrôle / partie"
                      value={fmt(avgCtrlWards, 1)}
                      valueColor={avgCtrlWards >= 2 ? 'text-emerald-400' : avgCtrlWards >= 1 ? 'text-white' : 'text-rose-300'}
                    />
                  )}
                  {avgWardsKilled != null && (
                    <StatRow
                      label="Wards détruites / partie"
                      value={fmt(avgWardsKilled, 1)}
                      valueColor="text-gray-300"
                    />
                  )}
                </StatCard>

                {/* KDA détaillé + side */}
                <StatCard title="Performance détaillée">
                  {avgK != null && (
                    <StatRow
                      label="Kills / partie"
                      value={fmt(avgK)}
                      valueColor={avgK >= 6 ? 'text-emerald-400' : 'text-white'}
                    />
                  )}
                  {avgD != null && (
                    <StatRow
                      label="Morts / partie"
                      value={fmt(avgD)}
                      valueColor={avgD <= 3 ? 'text-emerald-400' : avgD <= 5 ? 'text-white' : 'text-rose-400'}
                    />
                  )}
                  {avgA != null && (
                    <StatRow
                      label="Assists / partie"
                      value={fmt(avgA)}
                      valueColor="text-blue-400"
                    />
                  )}
                  {n > 0 && (
                    <StatRow
                      label="Total Kills / Morts / Assists"
                      value={`${totalK} / ${totalD} / ${totalA}`}
                      valueColor="text-gray-300"
                    />
                  )}
                  {hasSideData && blueWR != null && (
                    <StatRow
                      label="Winrate Blue side"
                      value={fmtPct(blueWR)}
                      hint={`${blueGames.length}G`}
                      valueColor={blueWR >= 50 ? 'text-emerald-400' : 'text-rose-400'}
                    />
                  )}
                  {hasSideData && redWR != null && (
                    <StatRow
                      label="Winrate Red side"
                      value={fmtPct(redWR)}
                      hint={`${redGames.length}G`}
                      valueColor={redWR >= 50 ? 'text-emerald-400' : 'text-rose-400'}
                    />
                  )}
                </StatCard>
              </div>

              {/* Breakdown par rôle */}
              {roleBreakdown.length > 0 && (
                <div className="rounded-2xl border border-dark-border bg-dark-bg/50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-dark-border/50">
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Winrate par rôle</p>
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-gray-500 text-left bg-dark-bg/40">
                        <th className="px-4 py-2.5 font-medium text-xs">Rôle</th>
                        <th className="px-4 py-2.5 font-medium text-xs text-center">Parties</th>
                        <th className="px-4 py-2.5 font-medium text-xs text-center">Winrate</th>
                        <th className="px-4 py-2.5 font-medium text-xs text-center">KDA</th>
                        <th className="px-4 py-2.5 hidden sm:table-cell" />
                      </tr>
                    </thead>
                    <tbody>
                      {roleBreakdown.map(({ role, games, wins: w, wr: roleWr, kda }) => (
                        <tr key={role} className="border-t border-dark-border/30 hover:bg-dark-bg/30">
                          <td className="px-4 py-3 font-medium text-white">{ROLE_DISPLAY_STATS[role] ?? role}</td>
                          <td className="px-4 py-3 text-center text-gray-400">{games}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`font-semibold ${roleWr >= 50 ? 'text-emerald-400' : 'text-rose-400'}`}>{roleWr}%</span>
                            <span className="text-gray-600 text-xs ml-1">({w}V/{games - w}D)</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={parseFloat(kda) >= 3 ? 'text-emerald-400' : parseFloat(kda) >= 2 ? 'text-white' : 'text-rose-300'}>{kda}</span>
                          </td>
                          <td className="px-4 py-3 hidden sm:table-cell">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 rounded-full bg-dark-border overflow-hidden">
                                <div className={`h-full rounded-full ${roleWr >= 50 ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{ width: `${roleWr}%` }} />
                              </div>
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
        </>
      )}
    </div>
  )
}
