/**
 * Panneau de statistiques d'un bloc — calculé entièrement en JS depuis les parties déjà en mémoire.
 */
import { getChampionImage, getChampionDisplayName } from '../../../../lib/championImages'

function statRow(label: string, value: string | number) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-dark-border/40 last:border-0">
      <span className="text-xs text-gray-400">{label}</span>
      <span className="text-xs font-semibold text-white">{value}</span>
    </div>
  )
}

interface BlockStatsProps {
  matches: any[]
}

export function BlockStats({ matches }: BlockStatsProps) {
  if (!matches.length) return null

  // ── Bilan global ──────────────────────────────────────────────────────────
  const wins = matches.filter((m) => m.our_win).length
  const losses = matches.length - wins

  // ── Stats moyennes (notre équipe seulement) ───────────────────────────────
  let totalKills = 0, totalDeaths = 0, totalAssists = 0, totalGold = 0, totalDamage = 0
  let participantCount = 0

  for (const m of matches) {
    const our = (m.team_match_participants || []).filter((p: any) => p.team_side === 'our' || !p.team_side)
    for (const p of our) {
      totalKills   += p.kills   ?? 0
      totalDeaths  += p.deaths  ?? 0
      totalAssists += p.assists ?? 0
      totalGold    += p.gold_earned ?? 0
      totalDamage  += p.total_damage_dealt_to_champions ?? 0
      participantCount++
    }
  }

  const perGame = matches.length
  const avgK = perGame ? (totalKills / perGame).toFixed(1) : '—'
  const avgD = perGame ? (totalDeaths / perGame).toFixed(1) : '—'
  const avgA = perGame ? (totalAssists / perGame).toFixed(1) : '—'
  const avgG = participantCount ? Math.round(totalGold / matches.length).toLocaleString('fr-FR') : '—'

  // ── Durée moyenne ─────────────────────────────────────────────────────────
  const durations = matches.map((m) => m.game_duration).filter(Boolean)
  const avgDurMin = durations.length
    ? Math.round(durations.reduce((s: number, d: number) => s + d, 0) / durations.length / 60)
    : null

  // ── Champions les plus joués (notre équipe) ───────────────────────────────
  const champCount: Record<string, number> = {}
  for (const m of matches) {
    const our = (m.team_match_participants || []).filter((p: any) => p.team_side === 'our' || !p.team_side)
    for (const p of our) {
      if (p.champion_name) champCount[p.champion_name] = (champCount[p.champion_name] || 0) + 1
    }
  }
  const topChamps = Object.entries(champCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)

  // ── Champions adverses ────────────────────────────────────────────────────
  const enemyCount: Record<string, number> = {}
  for (const m of matches) {
    const enemy = (m.team_match_participants || []).filter((p: any) => p.team_side === 'enemy')
    for (const p of enemy) {
      if (p.champion_name) enemyCount[p.champion_name] = (enemyCount[p.champion_name] || 0) + 1
    }
  }
  const topEnemy = Object.entries(enemyCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)

  return (
    <div className="mt-3 pt-3 border-t border-dark-border/50 space-y-5">
      {/* Bilan + moyennes */}
      <div className="grid grid-cols-2 gap-3">
        {/* Résultats */}
        <div className="bg-dark-bg/50 rounded-xl p-3">
          <p className="text-[10px] uppercase tracking-wide text-gray-500 font-semibold mb-2">Bilan</p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-green-400">{wins}</span>
            <span className="text-gray-500 font-bold text-lg">—</span>
            <span className="text-2xl font-bold text-red-400">{losses}</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {matches.length} partie{matches.length > 1 ? 's' : ''}
            {avgDurMin != null ? ` · ${avgDurMin} min moy.` : ''}
          </p>
        </div>

        {/* Stats par game */}
        <div className="bg-dark-bg/50 rounded-xl p-3">
          <p className="text-[10px] uppercase tracking-wide text-gray-500 font-semibold mb-2">Par partie (notre team)</p>
          {statRow('Kills', avgK)}
          {statRow('Deaths', avgD)}
          {statRow('Assists', avgA)}
          {statRow('Gold total', avgG)}
        </div>
      </div>

      {/* Champions pool */}
      {topChamps.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wide text-gray-500 font-semibold mb-2">Champions joués (notre équipe)</p>
          <div className="flex flex-wrap gap-2">
            {topChamps.map(([name, count]) => (
              <div key={name} className="flex items-center gap-1.5 bg-dark-bg/60 rounded-lg px-2 py-1">
                <img
                  src={getChampionImage(name)}
                  alt={name}
                  className="w-5 h-5 rounded-md object-cover"
                />
                <span className="text-xs text-gray-300">{getChampionDisplayName(name) || name}</span>
                <span className="text-xs text-gray-500">×{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Champions adverses */}
      {topEnemy.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wide text-gray-500 font-semibold mb-2">Champions adverses</p>
          <div className="flex flex-wrap gap-2">
            {topEnemy.map(([name, count]) => (
              <div key={name} className="flex items-center gap-1.5 bg-dark-bg/60 rounded-lg px-2 py-1 border border-red-500/10">
                <img
                  src={getChampionImage(name)}
                  alt={name}
                  className="w-5 h-5 rounded-md object-cover"
                />
                <span className="text-xs text-gray-300">{getChampionDisplayName(name) || name}</span>
                <span className="text-xs text-gray-500">×{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
