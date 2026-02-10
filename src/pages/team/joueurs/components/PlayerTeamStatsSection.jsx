/**
 * Bloc stats Team d'un joueur : stats globales + best champions (réutilisé détail joueur + page Statistiques)
 */
import { usePlayerTeamStats } from '../../hooks/usePlayerTeamStats'
import { getChampionImage } from '../../../../lib/championImages'

export function PlayerTeamStatsSection({ playerId }) {
  const { stats: teamStats, teamTotalsByMatch, loading: teamStatsLoading } = usePlayerTeamStats(playerId)

  const n = teamStats.length
  const wins = teamStats.filter((s) => s.team_matches?.our_win).length
  const winrate = n ? (wins / n) * 100 : 0
  const blueRows = teamStats.filter((s) => s.team_matches?.our_team_id === 100)
  const redRows = teamStats.filter((s) => s.team_matches?.our_team_id === 200)
  const blueGames = blueRows.length
  const redGames = redRows.length
  const blueWins = blueRows.filter((s) => s.team_matches?.our_win).length
  const redWins = redRows.filter((s) => s.team_matches?.our_win).length
  const winrateBlue = blueGames ? (blueWins / blueGames) * 100 : 0
  const winrateRed = redGames ? (redWins / redGames) * 100 : 0
  const sumK = teamStats.reduce((a, s) => a + (s.kills ?? 0), 0)
  const sumD = teamStats.reduce((a, s) => a + (s.deaths ?? 0), 0)
  const sumA = teamStats.reduce((a, s) => a + (s.assists ?? 0), 0)
  const avgK = n ? sumK / n : 0
  const avgD = n ? sumD / n : 0
  const avgA = n ? sumA / n : 0
  const kdaRatio = sumD > 0 ? (sumK + sumA) / sumD : sumK + sumA
  const kpPcts = teamStats
    .map((s) => {
      const tot = teamTotalsByMatch[s.match_id]
      if (!tot || tot.kills === 0) return null
      return (((s.kills ?? 0) + (s.assists ?? 0)) / tot.kills) * 100
    })
    .filter((x) => x != null)
  const goldPcts = teamStats
    .map((s) => {
      const tot = teamTotalsByMatch[s.match_id]
      if (!tot || tot.gold === 0) return null
      return ((s.gold_earned ?? 0) / tot.gold) * 100
    })
    .filter((x) => x != null)
  const dmgPcts = teamStats
    .map((s) => {
      const tot = teamTotalsByMatch[s.match_id]
      if (!tot || tot.damage === 0) return null
      return ((s.total_damage_dealt_to_champions ?? 0) / tot.damage) * 100
    })
    .filter((x) => x != null)
  const avgKp = kpPcts.length ? kpPcts.reduce((a, b) => a + b, 0) / kpPcts.length : 0
  const avgGoldPct = goldPcts.length ? goldPcts.reduce((a, b) => a + b, 0) / goldPcts.length : 0
  const avgDmgPct = dmgPcts.length ? dmgPcts.reduce((a, b) => a + b, 0) / dmgPcts.length : 0
  const csPerMinList = teamStats
    .map((s) => {
      const dur = s.team_matches?.game_duration
      if (!dur || dur <= 0) return null
      return (s.cs ?? 0) / (dur / 60)
    })
    .filter((x) => x != null)
  const avgCsPerMin = csPerMinList.length ? csPerMinList.reduce((a, b) => a + b, 0) / csPerMinList.length : 0

  const sumVision = teamStats.reduce((a, s) => a + (s.vision_score ?? 0), 0)
  const sumPinkWards = teamStats.reduce((a, s) => a + (s.vision_wards_bought ?? 0), 0)
  const sumWardsPlaced = teamStats.reduce((a, s) => a + (s.wards_placed ?? 0), 0)
  const sumWardsKilled = teamStats.reduce((a, s) => a + (s.wards_killed ?? 0), 0)
  const sumGold = teamStats.reduce((a, s) => a + (s.gold_earned ?? 0), 0)
  const sumDamage = teamStats.reduce((a, s) => a + (s.total_damage_dealt_to_champions ?? 0), 0)
  const avgVision = n ? sumVision / n : 0
  const avgPinkWards = n ? sumPinkWards / n : 0
  const avgWardsPlaced = n ? sumWardsPlaced / n : 0
  const avgWardsKilled = n ? sumWardsKilled / n : 0
  const avgGoldPerGame = n ? sumGold / n : 0
  const avgDamagePerGame = n ? sumDamage / n : 0

  const detailRows = [
    { label: 'Score de vision (moy.)', value: avgVision.toFixed(1) },
    { label: 'Pink wards achetés (moy.)', value: avgPinkWards.toFixed(1) },
    { label: 'Wards placés (moy.)', value: avgWardsPlaced.toFixed(1) },
    { label: 'Wards détruits (moy.)', value: avgWardsKilled.toFixed(1) },
    { label: 'Or moyen par partie', value: Math.round(avgGoldPerGame).toLocaleString() },
    { label: 'Dégâts moyens par partie', value: Math.round(avgDamagePerGame).toLocaleString() },
  ]

  const byChamp = {}
  for (const s of teamStats) {
    const name = s.champion_name || 'Inconnu'
    if (!byChamp[name]) {
      byChamp[name] = {
        champion_name: name,
        games: 0,
        wins: 0,
        kills: 0,
        deaths: 0,
        assists: 0,
        damage: 0,
        gold: 0,
        cs: 0,
        csPerMinSum: 0,
        csPerMinCount: 0,
      }
    }
    const c = byChamp[name]
    c.games += 1
    if (s.team_matches?.our_win) c.wins += 1
    c.kills += s.kills ?? 0
    c.deaths += s.deaths ?? 0
    c.assists += s.assists ?? 0
    c.damage += s.total_damage_dealt_to_champions ?? 0
    c.gold += s.gold_earned ?? 0
    c.cs += s.cs ?? 0
    const dur = s.team_matches?.game_duration
    if (dur && dur > 0) {
      c.csPerMinSum += (s.cs ?? 0) / (dur / 60)
      c.csPerMinCount += 1
    }
  }
  const championList = Object.values(byChamp).sort((a, b) => b.games - a.games)

  if (teamStatsLoading) {
    return <p className="text-gray-500 text-sm">Chargement...</p>
  }
  if (!playerId || n === 0) {
    return (
      <div className="bg-dark-card border border-dark-border rounded-lg p-6">
        <p className="text-gray-500 text-sm">
          Aucune donnée en équipe. Ajoutez des parties depuis <strong>Matchs</strong>.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-dark-card border border-dark-border rounded-lg p-6">
        <h3 className="font-display text-base font-semibold text-white mb-4">Stats globales</h3>
        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            <div>
              <div className="text-gray-400">Parties</div>
              <div className="text-white font-medium">{n}</div>
            </div>
            <div>
              <div className="text-gray-400">Winrate</div>
              <div className="text-white font-medium">{winrate.toFixed(1)}%</div>
            </div>
            <div>
              <div className="text-gray-400">Winrate Blue</div>
              <div className="text-blue-300 font-medium">{blueGames ? `${winrateBlue.toFixed(1)}%` : '—'} <span className="text-gray-500">({blueGames})</span></div>
            </div>
            <div>
              <div className="text-gray-400">Winrate Red</div>
              <div className="text-red-300 font-medium">{redGames ? `${winrateRed.toFixed(1)}%` : '—'} <span className="text-gray-500">({redGames})</span></div>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            <div>
              <div className="text-gray-400">Kills (total)</div>
              <div className="text-white font-medium">{sumK.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-gray-400">Morts (total)</div>
              <div className="text-white font-medium">{sumD.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-gray-400">Assists (total)</div>
              <div className="text-white font-medium">{sumA.toLocaleString()}</div>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            <div>
              <div className="text-gray-400">KDA moyen</div>
              <div className="text-white font-medium">{kdaRatio.toFixed(1)}</div>
            </div>
            <div>
              <div className="text-gray-400">K / D / A moy.</div>
              <div className="text-white font-medium">{avgK.toFixed(1)} / {avgD.toFixed(1)} / {avgA.toFixed(1)}</div>
            </div>
            <div>
              <div className="text-gray-400">CS/min moy.</div>
              <div className="text-white font-medium">{avgCsPerMin.toFixed(1)}</div>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            <div>
              <div className="text-gray-400">KP%</div>
              <div className="text-white font-medium">{avgKp.toFixed(1)}%</div>
            </div>
            <div>
              <div className="text-gray-400">Gold %</div>
              <div className="text-white font-medium">{avgGoldPct.toFixed(1)}%</div>
            </div>
            <div>
              <div className="text-gray-400">Dmg %</div>
              <div className="text-white font-medium">{avgDmgPct.toFixed(1)}%</div>
            </div>
          </div>
        </div>
      </div>
      <div className="bg-dark-card border border-dark-border rounded-lg overflow-hidden">
        <h3 className="font-display text-base font-semibold text-white px-4 py-3 border-b border-dark-border">Détail des stats globales</h3>
        <p className="text-gray-500 text-sm px-4 pt-2 pb-2">Indicateurs non affichés dans les cartes ci-dessus.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 border-b border-dark-border bg-dark-bg/50">
                <th className="py-3 px-4">Indicateur</th>
                <th className="py-3 px-4 text-right">Valeur</th>
              </tr>
            </thead>
            <tbody>
              {detailRows.map((r) => (
                <tr key={r.label} className="border-b border-dark-border/50">
                  <td className="py-3 px-4 text-gray-300">{r.label}</td>
                  <td className="py-3 px-4 text-right text-white font-medium">{r.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="bg-dark-card border border-dark-border rounded-lg p-6">
        <h3 className="font-display text-base font-semibold text-white mb-4">Best champions</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 border-b border-dark-border">
                <th className="py-2 pr-4">Champion</th>
                <th className="py-2 pr-4">Games</th>
                <th className="py-2 pr-4">Winrate</th>
                <th className="py-2 pr-4">K/D/A moy.</th>
                <th className="py-2 pr-4">KDA</th>
                <th className="py-2 pr-4">CS/min moy.</th>
              </tr>
            </thead>
            <tbody>
              {championList.map((c) => {
                const wr = c.games ? (c.wins / c.games) * 100 : 0
                const kda = c.deaths > 0 ? (c.kills + c.assists) / c.deaths : c.kills + c.assists
                const avgCsMin = c.csPerMinCount ? c.csPerMinSum / c.csPerMinCount : 0
                const avgK = c.games ? c.kills / c.games : 0
                const avgD = c.games ? c.deaths / c.games : 0
                const avgA = c.games ? c.assists / c.games : 0
                return (
                  <tr key={c.champion_name} className="border-b border-dark-border/50">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <img
                          src={getChampionImage(c.champion_name)}
                          alt={c.champion_name}
                          className="w-8 h-8 rounded object-cover"
                        />
                        <span className="text-white">{c.champion_name}</span>
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-gray-200">
                      {c.games} partie{c.games > 1 ? 's' : ''}
                    </td>
                    <td className="py-3 pr-4">
                      <span className={wr >= 50 ? 'text-green-400' : 'text-red-400'}>
                        {wr.toFixed(0)}%
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-gray-200">
                      {avgK.toFixed(1)}/{avgD.toFixed(1)}/{avgA.toFixed(1)}
                    </td>
                    <td className="py-3 pr-4 text-gray-200">
                      {kda.toFixed(1)}
                    </td>
                    <td className="py-3 pr-4 text-gray-200">
                      {avgCsMin.toFixed(1)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
