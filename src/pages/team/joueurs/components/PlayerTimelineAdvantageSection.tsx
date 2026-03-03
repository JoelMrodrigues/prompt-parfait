import { useMemo } from 'react'
import { TIMELINE_MINUTES } from '../../hooks/useTeamTimelines'

const ROLE_ORDER = ['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT']

function getSortedTeamSides(match: any) {
  const parts = match?.team_match_participants || []
  const our = parts.filter((p: any) => p.team_side === 'our' || !p.team_side)
  const enemy = parts.filter((p: any) => p.team_side === 'enemy')
  const sortByRole = (a: any, b: any) =>
    ROLE_ORDER.indexOf(a.role || '') - ROLE_ORDER.indexOf(b.role || '')
  return { our: [...our].sort(sortByRole), enemy: [...enemy].sort(sortByRole) }
}

interface Props {
  playerId: string
  matches: any[]
  timelines: any[]
}

export function PlayerTimelineAdvantageSection({ playerId, matches, timelines }: Props) {
  const advantageByMinute = useMemo(() => {
    if (!playerId || !matches?.length || !timelines?.length) return null
    const timelineByMatchId = new Map<string, any>(timelines.map((t: any) => [t.match_id, t]))
    const getCs = (s: any) => (s?.minions ?? 0) + (s?.jungle ?? 0) || (s?.cs ?? 0)

    return TIMELINE_MINUTES.map((min) => {
      const goldDiffs: number[] = []
      const xpDiffs: number[] = []
      const csDiffs: number[] = []
      for (const m of matches) {
        const { our, enemy } = getSortedTeamSides(m)
        const playerIndex = our.findIndex((p: any) => p.player_id === playerId)
        if (playerIndex < 0) continue
        const ourPart = our[playerIndex]
        const enemyPart = enemy[playerIndex]
        if (!enemyPart) continue
        const ourPid = ourPart?.participant_id ?? playerIndex + 1
        const enemyPid = enemyPart?.participant_id ?? 6 + playerIndex
        const t = timelineByMatchId.get(m.id)
        const snapshot = t?.snapshot && typeof t.snapshot === 'object' ? t.snapshot : null
        const snap = snapshot?.[String(min)]?.participants
        if (!snap) continue
        const ourSnap = snap[String(ourPid)]
        const enemySnap = snap[String(enemyPid)]
        goldDiffs.push((ourSnap?.gold ?? 0) - (enemySnap?.gold ?? 0))
        xpDiffs.push((ourSnap?.xp ?? 0) - (enemySnap?.xp ?? 0))
        csDiffs.push(getCs(ourSnap) - getCs(enemySnap))
      }
      const count = goldDiffs.length
      const avg = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0)
      return { min, avgGold: avg(goldDiffs), avgXp: avg(xpDiffs), avgCs: avg(csDiffs), count }
    })
  }, [playerId, matches, timelines])

  if (!advantageByMinute?.length || advantageByMinute.every((r) => r.count === 0)) {
    return (
      <div className="bg-dark-card border border-dark-border rounded-lg p-6">
        <h3 className="font-display text-base font-semibold text-white mb-2">
          Avantage vs vis-à-vis
        </h3>
        <p className="text-gray-500 text-sm">
          Aucune timeline disponible. Importez des timelines depuis la page Import et associez-les à
          vos matchs pour afficher l&apos;avantage or / XP / CS à 5, 10, 15, 20, 25 min.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-dark-card border border-dark-border rounded-lg overflow-hidden">
      <h3 className="font-display text-base font-semibold text-white px-4 py-3 border-b border-dark-border">
        Avantage vs vis-à-vis en fonction du temps
      </h3>
      <p className="text-gray-500 text-sm px-4 pt-2 pb-1">
        Moyenne de l&apos;avantage or / XP / CS face au vis-à-vis à chaque palier.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-400 border-b border-dark-border bg-dark-bg/50">
              <th className="py-3 px-4">Minute</th>
              <th className="py-3 px-4 text-right">Or (moy.)</th>
              <th className="py-3 px-4 text-right">XP (moy.)</th>
              <th className="py-3 px-4 text-right">CS (moy.)</th>
              <th className="py-3 px-4 text-right">Parties</th>
            </tr>
          </thead>
          <tbody>
            {advantageByMinute
              .filter((r) => r.count > 0)
              .map((r) => (
                <tr key={r.min} className="border-b border-dark-border/50">
                  <td className="py-3 px-4 font-medium text-gray-300">{r.min} min</td>
                  <td className={`py-3 px-4 text-right font-medium ${r.avgGold >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {r.avgGold >= 0 ? '+' : ''}{Math.round(r.avgGold).toLocaleString()}
                  </td>
                  <td className={`py-3 px-4 text-right font-medium ${r.avgXp >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {r.avgXp >= 0 ? '+' : ''}{Math.round(r.avgXp).toLocaleString()}
                  </td>
                  <td className={`py-3 px-4 text-right font-medium ${r.avgCs >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {r.avgCs >= 0 ? '+' : ''}{Math.round(r.avgCs).toFixed(1)}
                  </td>
                  <td className="py-3 px-4 text-right text-gray-400">{r.count}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
