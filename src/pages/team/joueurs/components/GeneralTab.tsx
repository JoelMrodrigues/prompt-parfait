/**
 * Onglet Général de PlayerDetailPage
 * Extraite pour alléger le fichier principal.
 */
import { getChampionImage } from '../../../../lib/championImages'
import { LpCurveChart } from '../charts/LpCurveChart'
import { REMAKE_THRESHOLD_SEC } from '../../../../lib/constants'

export function GeneralTab({ d, player }: { d: any; player: any }) {
  const realGames = (d.lpGraphMatches as any[]).filter(
    (m: any) => (m.game_duration ?? 0) >= REMAKE_THRESHOLD_SEC
  )
  const wins = realGames.filter((m: any) => m.win).length
  const wr = realGames.length > 0 ? Math.round((wins / realGames.length) * 100) : null

  const sorted = [...realGames].sort((a: any, b: any) => (a.game_creation ?? 0) - (b.game_creation ?? 0))

  const half = Math.max(1, Math.floor(sorted.length / 2))
  const firstHalf = sorted.slice(0, half)
  const lastHalf = sorted.slice(-half)
  const wrFirst = firstHalf.length > 0 ? Math.round((firstHalf.filter((m: any) => m.win).length / firstHalf.length) * 100) : null
  const wrLast = lastHalf.length > 0 ? Math.round((lastHalf.filter((m: any) => m.win).length / lastHalf.length) * 100) : null

  const withDmg = realGames.filter((m: any) => m.total_damage != null)
  const withCs = realGames.filter((m: any) => m.cs != null && m.game_duration > 0)
  const withVision = realGames.filter((m: any) => m.vision_score != null)

  const avgDmg = withDmg.length > 0
    ? Math.round(withDmg.reduce((s: number, m: any) => s + m.total_damage, 0) / withDmg.length)
    : null
  const avgCsPMin = withCs.length > 0
    ? (withCs.reduce((s: number, m: any) => s + m.cs / (m.game_duration / 60), 0) / withCs.length).toFixed(1)
    : null
  const avgVision = withVision.length > 0
    ? Math.round(withVision.reduce((s: number, m: any) => s + m.vision_score, 0) / withVision.length)
    : null

  const totalK = realGames.reduce((s: number, m: any) => s + (m.kills ?? 0), 0)
  const totalD = realGames.reduce((s: number, m: any) => s + (m.deaths ?? 0), 0)
  const totalA = realGames.reduce((s: number, m: any) => s + (m.assists ?? 0), 0)
  const avgKda = realGames.length > 0
    ? (totalD > 0 ? ((totalK + totalA) / totalD).toFixed(2) : (totalK + totalA).toFixed(2))
    : null

  const peakLp = d.lpCurvePoints.length > 0
    ? Math.max(...d.lpCurvePoints.map((p: any) => p.lp))
    : null
  const lpDelta = d.lpCurvePoints.length >= 2
    ? d.lpCurvePoints[d.lpCurvePoints.length - 1].lp - d.lpCurvePoints[0].lp
    : null

  const lpDateRange = d.lpCurvePoints.length >= 2
    ? `${d.lpCurvePoints[0].date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })} → ${d.lpCurvePoints[d.lpCurvePoints.length - 1].date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}`
    : 'Saison en cours'

  const mood = player?.soloq_mood_last_5
  const sq5Wins = mood?.wins ?? 0
  const sq5Losses = mood?.losses ?? 0
  const sq5Total = sq5Wins + sq5Losses

  const last5Team = (d.filteredTeamStats || []).slice(0, 5)
  const t5Wins = last5Team.filter((s: any) => s.win || s.team_matches?.our_win).length
  const t5Losses = last5Team.length - t5Wins

  const poolFlat: any[] = player?.champion_pools
    ? (Object.entries(player.champion_pools as Record<string, any[]>)
        .filter(([tier]) => ['S', 'A', 'B'].includes(tier))
        .flatMap(([, champs]) => champs))
    : []
  const poolCount = player?.champion_pools
    ? Object.values(player.champion_pools as Record<string, any[]>).flat().length
    : null
  const poolPreview = poolFlat.slice(0, 5)

  const last5SoloQ = sorted.slice(-5).reverse()
  const last10 = sorted.slice(-10)

  const champMap = new Map<string, { games: number; wins: number }>()
  for (const m of realGames) {
    const name = m.champion_name || m.champion
    if (!name) continue
    const c = champMap.get(name) ?? { games: 0, wins: 0 }
    c.games++
    if (m.win) c.wins++
    champMap.set(name, c)
  }
  const topChampsData = Array.from(champMap.entries())
    .map(([name, c]) => ({ name, ...c, wr: Math.round((c.wins / c.games) * 100) }))
    .sort((a, b) => b.games - a.games)
    .slice(0, 5)

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-dark-border bg-dark-bg/40 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-dark-border/60">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-5 rounded-full bg-accent-blue" />
            <span className="font-semibold text-white text-sm">Solo Q · Saison en cours</span>
          </div>
          {player.rank && (
            <span className="text-xs font-semibold text-violet-400 bg-violet-400/10 border border-violet-400/20 px-2.5 py-1 rounded-full">
              {player.rank}
            </span>
          )}
        </div>

        {d.lpGraphLoading ? (
          <div className="p-6 text-center text-gray-500 text-sm">Chargement…</div>
        ) : realGames.length === 0 ? (
          <div className="p-6 text-center text-gray-500 text-sm">Aucune partie Solo Q enregistrée.</div>
        ) : (
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-dark-card border border-dark-border rounded-xl p-3 text-center">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Parties</p>
                <p className="text-xl font-bold text-white">{realGames.length}</p>
              </div>
              <div className={`bg-dark-card border rounded-xl p-3 text-center ${wr != null && wr >= 50 ? 'border-emerald-500/30' : 'border-rose-500/30'}`}>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Winrate</p>
                <p className={`text-xl font-bold ${wr != null && wr >= 50 ? 'text-emerald-400' : 'text-rose-400'}`}>{wr ?? '—'}%</p>
                {wr != null && <p className="text-[10px] text-gray-500 mt-0.5">{wins}V · {realGames.length - wins}D</p>}
              </div>
              <div className="bg-dark-card border border-dark-border rounded-xl p-3 text-center">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">KDA moy.</p>
                <p className="text-xl font-bold text-white">{avgKda ?? '—'}</p>
              </div>
              <div className="bg-dark-card border border-dark-border rounded-xl p-3 text-center">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Dernières 5</p>
                {sq5Total > 0 ? (
                  <div className="flex items-center justify-center gap-1">
                    <span className="text-emerald-400 font-bold text-base">{sq5Wins}W</span>
                    <span className="text-gray-600 text-sm">–</span>
                    <span className="text-rose-400 font-bold text-base">{sq5Losses}L</span>
                  </div>
                ) : <p className="text-xl font-bold text-gray-600">—</p>}
              </div>
            </div>

            {(avgDmg != null || avgCsPMin != null || avgVision != null || peakLp != null) && (
              <div className="flex flex-wrap gap-2">
                {peakLp != null && (
                  <div className="flex items-center gap-1.5 bg-dark-card/60 border border-dark-border rounded-lg px-3 py-1.5">
                    <span className="text-[11px] text-gray-500">Peak</span>
                    <span className="text-xs font-semibold text-white">{peakLp} LP</span>
                  </div>
                )}
                {lpDelta != null && (
                  <div className="flex items-center gap-1.5 bg-dark-card/60 border border-dark-border rounded-lg px-3 py-1.5">
                    <span className="text-[11px] text-gray-500">Δ LP</span>
                    <span className={`text-xs font-semibold ${lpDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{lpDelta >= 0 ? '+' : ''}{lpDelta}</span>
                  </div>
                )}
                {avgCsPMin != null && (
                  <div className="flex items-center gap-1.5 bg-dark-card/60 border border-dark-border rounded-lg px-3 py-1.5">
                    <span className="text-[11px] text-gray-500">CS/min</span>
                    <span className="text-xs font-semibold text-white">{avgCsPMin}</span>
                  </div>
                )}
                {avgDmg != null && (
                  <div className="flex items-center gap-1.5 bg-dark-card/60 border border-dark-border rounded-lg px-3 py-1.5">
                    <span className="text-[11px] text-gray-500">DMG/game</span>
                    <span className="text-xs font-semibold text-white">{avgDmg.toLocaleString('fr-FR')}</span>
                  </div>
                )}
                {avgVision != null && (
                  <div className="flex items-center gap-1.5 bg-dark-card/60 border border-dark-border rounded-lg px-3 py-1.5">
                    <span className="text-[11px] text-gray-500">Vision</span>
                    <span className="text-xs font-semibold text-white">{avgVision}</span>
                  </div>
                )}
              </div>
            )}

            {wrFirst != null && wrLast != null && sorted.length >= 4 && (
              <div className="flex items-center gap-3 bg-dark-card/40 border border-dark-border rounded-xl px-3 py-2">
                <span className="text-[10px] text-gray-500 uppercase tracking-wider shrink-0">Progression</span>
                <div className="flex items-center gap-2 flex-1">
                  <span className={`text-sm font-bold ${wrFirst >= 50 ? 'text-emerald-400' : 'text-rose-400'}`}>{wrFirst}%</span>
                  <span className="text-gray-600 text-xs">→</span>
                  <span className={`text-sm font-bold ${wrLast >= 50 ? 'text-emerald-400' : 'text-rose-400'}`}>{wrLast}%</span>
                  {wrLast > wrFirst
                    ? <span className="text-xs text-emerald-400 ml-1">↑ +{wrLast - wrFirst}%</span>
                    : wrLast < wrFirst
                      ? <span className="text-xs text-rose-400 ml-1">↓ {wrLast - wrFirst}%</span>
                      : null}
                </div>
                <span className="text-[10px] text-gray-600 shrink-0">1ère vs 2ème moitié</span>
              </div>
            )}

            {d.lpCurvePoints.length >= 2 && (
              <div className="rounded-xl bg-dark-card/50 border border-dark-border p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-gray-500 uppercase tracking-wider">Courbe LP</span>
                  <span className="text-[10px] text-gray-600">{lpDateRange}</span>
                </div>
                <LpCurveChart points={d.lpCurvePoints} />
              </div>
            )}

            {topChampsData.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider">Champions joués (SoloQ)</p>
                {topChampsData.map((c) => (
                  <div key={c.name} className="flex items-center gap-2">
                    <img src={getChampionImage(c.name)} alt={c.name} className="w-6 h-6 rounded object-cover border border-dark-border shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                    <span className="text-xs text-gray-300 w-24 truncate">{c.name}</span>
                    <div className="flex-1 h-1.5 bg-dark-bg rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${c.wr >= 50 ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{ width: `${c.wr}%` }} />
                    </div>
                    <span className={`text-xs font-semibold w-10 text-right ${c.wr >= 50 ? 'text-emerald-400' : 'text-rose-400'}`}>{c.wr}%</span>
                    <span className="text-xs text-gray-600 w-8 text-right">{c.games}G</span>
                  </div>
                ))}
              </div>
            )}

            {last10.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-500 uppercase tracking-wider shrink-0">10 der.</span>
                <div className="flex gap-1">
                  {last10.map((m: any, i: number) => (
                    <div key={i} title={m.win ? 'Victoire' : 'Défaite'} className={`w-6 h-2 rounded-full ${m.win ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-dark-border bg-dark-bg/40 p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1.5 h-4 rounded-full bg-violet-500" />
            <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Team · 5 der.</span>
          </div>
          {last5Team.length > 0 ? (
            <div className="flex flex-col gap-1">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-emerald-400">{t5Wins}V</span>
                <span className="text-gray-600">–</span>
                <span className="text-2xl font-bold text-rose-400">{t5Losses}D</span>
              </div>
              <div className="flex gap-1 mt-1">
                {last5Team.map((s: any, i: number) => {
                  const win = s.win || s.team_matches?.our_win
                  return <div key={i} className={`flex-1 h-1.5 rounded-full ${win ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                })}
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-sm">Aucune partie équipe</p>
          )}
        </div>

        <button
          type="button"
          onClick={() => d.setSelectedCard('pool-champ')}
          className="rounded-2xl border border-dark-border bg-dark-bg/40 p-4 text-left hover:border-amber-400/40 hover:bg-amber-400/5 transition-all group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-4 rounded-full bg-amber-400" />
              <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Pool Champ</span>
            </div>
            {poolCount != null && poolCount > 0 && (
              <span className="text-xs text-gray-500">{poolCount} champs →</span>
            )}
          </div>
          {poolPreview.length > 0 ? (
            <div className="flex gap-1.5 flex-wrap">
              {poolPreview.map((cp: any, i: number) => {
                const name = cp.champion_id || cp.name || cp
                return (
                  <img key={i} src={getChampionImage(name)} alt={name} title={name}
                    className="w-9 h-9 rounded-lg object-cover border border-dark-border"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                )
              })}
              {poolFlat.length > 5 && (
                <div className="w-9 h-9 rounded-lg bg-dark-card border border-dark-border flex items-center justify-center text-xs text-gray-500">
                  +{poolFlat.length - 5}
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">Aucun champion</p>
          )}
        </button>

        <button
          type="button"
          onClick={() => d.setSelectedCard('coach')}
          className="rounded-2xl border border-dark-border bg-dark-bg/40 p-4 text-left hover:border-accent-blue/40 hover:bg-accent-blue/5 transition-all group"
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1.5 h-4 rounded-full bg-accent-blue group-hover:bg-accent-blue transition-colors" />
            <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Coach</span>
          </div>
          <p className="text-sm text-gray-400 group-hover:text-accent-blue transition-colors">
            Voir les notes du coach →
          </p>
        </button>
      </div>

      {last5SoloQ.length > 0 && (
        <div className="rounded-2xl border border-dark-border bg-dark-bg/40 overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3 border-b border-dark-border/60">
            <div className="w-1.5 h-4 rounded-full bg-accent-blue" />
            <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Dernières games SoloQ</span>
          </div>
          <div className="divide-y divide-dark-border/40">
            {last5SoloQ.map((m: any, i: number) => {
              const champName = m.champion_name || m.champion || null
              const kills = m.kills ?? 0
              const deaths = m.deaths ?? 0
              const assists = m.assists ?? 0
              const kdaStr = deaths > 0 ? ((kills + assists) / deaths).toFixed(1) : (kills + assists).toFixed(1)
              const duration = m.game_duration ? `${Math.floor(m.game_duration / 60)}m` : null
              return (
                <div key={i} className={`flex items-center gap-3 px-4 py-2.5 ${m.win ? 'bg-emerald-500/5' : 'bg-rose-500/5'}`}>
                  <div className={`w-1 h-8 rounded-full shrink-0 ${m.win ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                  {champName ? (
                    <img src={getChampionImage(champName)} alt={champName} className="w-9 h-9 rounded-lg object-cover border border-dark-border shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                  ) : (
                    <div className="w-9 h-9 rounded-lg bg-dark-card border border-dark-border shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{champName || '—'}</p>
                    <p className="text-xs text-gray-500">{kills}/{deaths}/{assists}{duration && <span className="ml-2">{duration}</span>}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-xs font-bold ${m.win ? 'text-emerald-400' : 'text-rose-400'}`}>{m.win ? 'Victoire' : 'Défaite'}</p>
                    <p className={`text-xs ${parseFloat(kdaStr) >= 3 ? 'text-emerald-400' : parseFloat(kdaStr) >= 2 ? 'text-gray-300' : 'text-rose-300'}`}>{kdaStr} KDA</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
