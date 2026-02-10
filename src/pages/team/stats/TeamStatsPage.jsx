/**
 * Page Team Stats - Statistiques de l'équipe
 * ALL = stats globales équipe + avantage en fonction du temps. Sinon (joueur sélectionné) = à venir.
 */
import { useState, useMemo } from 'react'
import { useTeam } from '../../../hooks/useTeam'
import { useTeamMatches } from '../../../hooks/useTeamMatches'
import { useTeamTimelines, TIMELINE_MINUTES } from '../hooks/useTeamTimelines'
import { PlayerFilterSidebar, ALL_ID } from '../champion-pool/components/PlayerFilterSidebar'
import { PlayerTeamStatsSection } from '../joueurs/components/PlayerTeamStatsSection'
import { Users, LayoutGrid, ArrowLeftRight, ArrowLeft } from 'lucide-react'

const STATS_CATEGORY_JOUEURS = 'joueurs'
const STATS_CATEGORY_COMPOS = 'compos'
const STATS_CATEGORY_SIDE = 'side'

function teamCsFromParticipants(participants, ourTeamId) {
  if (!participants || typeof participants !== 'object') return null
  const getCs = (s) => ((s?.minions ?? 0) + (s?.jungle ?? 0)) || (s?.cs ?? 0)
  let ourCs = 0
  let enemyCs = 0
  if (ourTeamId === 100) {
    for (let pid = 1; pid <= 5; pid++) ourCs += getCs(participants[String(pid)])
    for (let pid = 6; pid <= 10; pid++) enemyCs += getCs(participants[String(pid)])
  } else {
    for (let pid = 6; pid <= 10; pid++) ourCs += getCs(participants[String(pid)])
    for (let pid = 1; pid <= 5; pid++) enemyCs += getCs(participants[String(pid)])
  }
  return ourCs - enemyCs
}

function TeamTimelineAdvantage({ matches, timelines }) {
  const advantageByMinute = useMemo(() => {
    if (!matches?.length || !timelines?.length) return null
    const matchById = new Map(matches.map((m) => [m.id, m]))
    const minutes = TIMELINE_MINUTES
    const result = minutes.map((min) => {
      const goldDiffs = []
      const xpDiffs = []
      const csDiffs = []
      for (const t of timelines) {
        const snapshot = t.snapshot && typeof t.snapshot === 'object' ? t.snapshot : null
        const s = snapshot?.[String(min)]
        if (!s) continue
        const match = matchById.get(t.match_id)
        const ourTeamId = match?.our_team_id ?? 100
        const ourGold = ourTeamId === 100 ? (s.gold_100 ?? 0) : (s.gold_200 ?? 0)
        const enemyGold = ourTeamId === 100 ? (s.gold_200 ?? 0) : (s.gold_100 ?? 0)
        const ourXp = ourTeamId === 100 ? (s.xp_100 ?? 0) : (s.xp_200 ?? 0)
        const enemyXp = ourTeamId === 100 ? (s.xp_200 ?? 0) : (s.xp_100 ?? 0)
        goldDiffs.push(ourGold - enemyGold)
        xpDiffs.push(ourXp - enemyXp)
        const csDiff = teamCsFromParticipants(s.participants, ourTeamId)
        if (csDiff !== null) csDiffs.push(csDiff)
      }
      const count = goldDiffs.length
      const avgGold = count ? goldDiffs.reduce((a, b) => a + b, 0) / count : 0
      const avgXp = count ? xpDiffs.reduce((a, b) => a + b, 0) / count : 0
      const avgCs = csDiffs.length ? csDiffs.reduce((a, b) => a + b, 0) / csDiffs.length : null
      return { min, avgGold, avgXp, avgCs, count }
    })
    return result
  }, [matches, timelines])

  if (!advantageByMinute?.length || advantageByMinute.every((r) => r.count === 0)) {
    return (
      <div className="bg-dark-card border border-dark-border rounded-lg p-6">
        <h3 className="font-display text-base font-semibold text-white mb-2">Avantage de l&apos;équipe en fonction du temps</h3>
        <p className="text-gray-500 text-sm">Aucune timeline disponible. Importez des timelines depuis la page Import et associez-les à vos matchs pour afficher l&apos;avantage or/XP/CS à 5, 10, 15, 20, 25 min.</p>
      </div>
    )
  }

  return (
    <div className="bg-dark-card border border-dark-border rounded-lg overflow-hidden">
      <h3 className="font-display text-base font-semibold text-white px-4 py-3 border-b border-dark-border">Avantage de l&apos;équipe en fonction du temps</h3>
      <p className="text-gray-500 text-sm px-4 pt-2">Moyenne de l&apos;avantage or / XP / CS de l&apos;équipe à chaque palier (parties avec timeline uniquement).</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-400 border-b border-dark-border bg-dark-bg/50">
              <th className="py-3 px-4">Minute</th>
              <th className="py-3 px-4 text-right">Avantage or (moy.)</th>
              <th className="py-3 px-4 text-right">Avantage XP (moy.)</th>
              <th className="py-3 px-4 text-right">Avantage CS (moy.)</th>
              <th className="py-3 px-4 text-right">Parties</th>
            </tr>
          </thead>
          <tbody>
            {advantageByMinute.filter((r) => r.count > 0).map((r) => (
              <tr key={r.min} className="border-b border-dark-border/50">
                <td className="py-3 px-4 font-medium text-gray-300">{r.min} min</td>
                <td className={`py-3 px-4 text-right font-medium ${r.avgGold >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {r.avgGold >= 0 ? '+' : ''}{Math.round(r.avgGold).toLocaleString()}
                </td>
                <td className={`py-3 px-4 text-right font-medium ${r.avgXp >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {r.avgXp >= 0 ? '+' : ''}{Math.round(r.avgXp).toLocaleString()}
                </td>
                <td className="py-3 px-4 text-right font-medium text-gray-400">
                  {r.avgCs != null ? (
                    <span className={r.avgCs >= 0 ? 'text-green-400' : 'text-red-400'}>
                      {r.avgCs >= 0 ? '+' : ''}{Math.round(r.avgCs).toLocaleString()}
                    </span>
                  ) : '—'}
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

const ROLE_ORDER = ['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT']

function getOurAndEnemySorted(match) {
  const parts = match?.team_match_participants || []
  const our = parts.filter((p) => p.team_side === 'our' || !p.team_side)
  const enemy = parts.filter((p) => p.team_side === 'enemy')
  const sortByRole = (a, b) => ROLE_ORDER.indexOf(a.role || '') - ROLE_ORDER.indexOf(b.role || '')
  return {
    our: [...our].sort(sortByRole),
    enemy: [...enemy].sort(sortByRole),
  }
}

function PlayerTimelineAdvantage({ playerId, matches, timelines }) {
  const advantageByMinute = useMemo(() => {
    if (!playerId || !matches?.length || !timelines?.length) return null
    const timelineByMatchId = new Map(timelines.map((t) => [t.match_id, t]))
    const getCs = (s) => ((s?.minions ?? 0) + (s?.jungle ?? 0)) || (s?.cs ?? 0)

    return TIMELINE_MINUTES.map((min) => {
      const goldDiffs = []
      const xpDiffs = []
      const csDiffs = []
      for (const m of matches) {
        const { our, enemy } = getOurAndEnemySorted(m)
        const playerIndex = our.findIndex((p) => p.player_id === playerId)
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
        const ourGold = ourSnap?.gold ?? 0
        const enemyGold = enemySnap?.gold ?? 0
        const ourXp = ourSnap?.xp ?? 0
        const enemyXp = enemySnap?.xp ?? 0
        goldDiffs.push(ourGold - enemyGold)
        xpDiffs.push(ourXp - enemyXp)
        csDiffs.push(getCs(ourSnap) - getCs(enemySnap))
      }
      const count = goldDiffs.length
      const avgGold = count ? goldDiffs.reduce((a, b) => a + b, 0) / count : 0
      const avgXp = count ? xpDiffs.reduce((a, b) => a + b, 0) / count : 0
      const avgCs = count ? csDiffs.reduce((a, b) => a + b, 0) / count : 0
      return { min, avgGold, avgXp, avgCs, count }
    })
  }, [playerId, matches, timelines])

  if (!advantageByMinute?.length || advantageByMinute.every((r) => r.count === 0)) {
    return (
      <div className="bg-dark-card border border-dark-border rounded-lg p-6">
        <h3 className="font-display text-base font-semibold text-white mb-2">Avantage vs vis-à-vis en fonction du temps</h3>
        <p className="text-gray-500 text-sm">Aucune timeline disponible. Importez des timelines depuis la page Import et associez-les à vos matchs pour afficher l&apos;avantage or / XP / CS à 5, 10, 15, 20, 25 min.</p>
      </div>
    )
  }

  return (
    <div className="bg-dark-card border border-dark-border rounded-lg overflow-hidden">
      <h3 className="font-display text-base font-semibold text-white px-4 py-3 border-b border-dark-border">Avantage vs vis-à-vis en fonction du temps</h3>
      <p className="text-gray-500 text-sm px-4 pt-2">Moyenne de l&apos;avantage or / XP / CS du joueur face à son vis-à-vis à chaque palier (parties avec timeline uniquement).</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-400 border-b border-dark-border bg-dark-bg/50">
              <th className="py-3 px-4">Minute</th>
              <th className="py-3 px-4 text-right">Avantage or (moy.)</th>
              <th className="py-3 px-4 text-right">Avantage XP (moy.)</th>
              <th className="py-3 px-4 text-right">Avantage CS (moy.)</th>
              <th className="py-3 px-4 text-right">Parties</th>
            </tr>
          </thead>
          <tbody>
            {advantageByMinute.filter((r) => r.count > 0).map((r) => (
              <tr key={r.min} className="border-b border-dark-border/50">
                <td className="py-3 px-4 font-medium text-gray-300">{r.min} min</td>
                <td className={`py-3 px-4 text-right font-medium ${r.avgGold >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {r.avgGold >= 0 ? '+' : ''}{Math.round(r.avgGold).toLocaleString()}
                </td>
                <td className={`py-3 px-4 text-right font-medium ${r.avgXp >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {r.avgXp >= 0 ? '+' : ''}{Math.round(r.avgXp).toLocaleString()}
                </td>
                <td className={`py-3 px-4 text-right font-medium ${r.avgCs >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {r.avgCs >= 0 ? '+' : ''}{Math.round(r.avgCs).toLocaleString()}
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

function TeamGlobalStats({ matches, loading, timelines }) {
  const stats = useMemo(() => {
    if (!matches?.length) return null
    const n = matches.length
    const wins = matches.filter((m) => m.our_win).length
    const winrate = n ? (wins / n) * 100 : 0
    const blue = matches.filter((m) => m.our_team_id === 100)
    const red = matches.filter((m) => m.our_team_id === 200)
    const blueWins = blue.filter((m) => m.our_win).length
    const redWins = red.filter((m) => m.our_win).length
    const blueWR = blue.length ? (blueWins / blue.length) * 100 : null
    const redWR = red.length ? (redWins / red.length) * 100 : null
    const totalDuration = matches.reduce((s, m) => s + (m.game_duration ?? 0), 0)
    const avgDurationSec = n ? totalDuration / n : 0
    const avgDurationMin = avgDurationSec / 60

    let totalKills = 0
    let totalDeaths = 0
    let totalAssists = 0
    let totalGold = 0
    let totalDamage = 0
    let totalCs = 0
    let totalVision = 0
    for (const m of matches) {
      const our = (m.team_match_participants || []).filter((p) => p.team_side === 'our' || !p.team_side)
      for (const p of our) {
        totalKills += p.kills ?? 0
        totalDeaths += p.deaths ?? 0
        totalAssists += p.assists ?? 0
        totalGold += p.gold_earned ?? 0
        totalDamage += p.total_damage_dealt_to_champions ?? 0
        totalCs += p.cs ?? 0
        totalVision += p.vision_score ?? 0
      }
    }
    const kdaRatio = totalDeaths > 0 ? (totalKills + totalAssists) / totalDeaths : totalKills + totalAssists
    const div = n || 1

    let totalDragons = 0
    let totalBarons = 0
    let totalHeralds = 0
    let totalTowers = 0
    let totalInhibs = 0
    let totalGrubs = 0
    let firstTowerCount = 0
    let firstBloodCount = 0
    let firstDragonCount = 0
    let firstBaronCount = 0
    let firstInhibCount = 0
    let objectivesMatchCount = 0
    for (const m of matches) {
      const obj = m.objectives && typeof m.objectives === 'object' ? m.objectives : null
      const ourId = String(m.our_team_id ?? 100)
      const our = obj?.[ourId]
      if (!our) continue
      objectivesMatchCount++
      totalDragons += our.dragonKills ?? 0
      totalBarons += our.baronKills ?? 0
      totalHeralds += our.riftHeraldKills ?? 0
      totalTowers += our.towerKills ?? 0
      totalInhibs += our.inhibitorKills ?? 0
      totalGrubs += our.hordeKills ?? 0
      if (our.firstTower) firstTowerCount++
      if (our.firstBlood) firstBloodCount++
      if (our.firstDragon) firstDragonCount++
      if (our.firstBaron) firstBaronCount++
      if (our.firstInhibitor) firstInhibCount++
    }
    const objDiv = objectivesMatchCount || 1

    return {
      games: n,
      wins,
      winrate,
      blueGames: blue.length,
      blueWins,
      blueWR,
      redGames: red.length,
      redWins,
      redWR,
      avgDurationMin,
      totalKills,
      totalDeaths,
      totalAssists,
      avgKills: totalKills / div,
      avgDeaths: totalDeaths / div,
      avgAssists: totalAssists / div,
      kdaRatio,
      avgGold: totalGold / div,
      avgDamage: totalDamage / div,
      avgCs: totalCs / div,
      avgVision: totalVision / div,
      objectivesMatchCount,
      avgDragons: totalDragons / objDiv,
      avgBarons: totalBarons / objDiv,
      avgHeralds: totalHeralds / objDiv,
      avgTowers: totalTowers / objDiv,
      avgInhibs: totalInhibs / objDiv,
      avgGrubs: totalGrubs / objDiv,
      firstTowerPct: n ? (firstTowerCount / n) * 100 : 0,
      firstBloodPct: n ? (firstBloodCount / n) * 100 : 0,
      firstDragonPct: n ? (firstDragonCount / n) * 100 : 0,
      firstBaronPct: n ? (firstBaronCount / n) * 100 : 0,
      firstInhibPct: n ? (firstInhibCount / n) * 100 : 0,
    }
  }, [matches])

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-accent-blue" />
      </div>
    )
  }
  if (!stats || stats.games === 0) {
    return (
      <div className="bg-dark-card border border-dark-border rounded-lg p-8 text-center">
        <p className="text-gray-500">Aucune donnée. Importez des matchs depuis la page Matchs.</p>
      </div>
    )
  }

  const rows = [
    { label: 'Kills / Morts / Assists moy. par partie', value: `${stats.avgKills.toFixed(1)} / ${stats.avgDeaths.toFixed(1)} / ${stats.avgAssists.toFixed(1)}` },
    { label: 'Or moyen par partie', value: Math.round(stats.avgGold).toLocaleString() },
    { label: 'Dégâts moyens par partie', value: Math.round(stats.avgDamage).toLocaleString() },
    { label: 'CS moyen par partie', value: Math.round(stats.avgCs).toLocaleString() },
    { label: 'Vision moyenne par partie', value: stats.avgVision.toFixed(1) },
    ...(stats.objectivesMatchCount > 0
      ? [
          { label: 'Tours (moy.)', value: stats.avgTowers.toFixed(1) },
          { label: 'Inhibiteurs (moy.)', value: stats.avgInhibs.toFixed(1) },
          { label: 'First inhib %', value: `${stats.firstInhibPct.toFixed(0)}%` },
        ]
      : []),
  ]

  return (
    <div className="space-y-6">
      {/* Games */}
      <div>
        <h3 className="font-display text-base font-semibold text-white mb-2">Games</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          <div className="bg-dark-card border border-dark-border rounded-lg p-4">
            <div className="text-gray-400 text-sm">Parties</div>
            <div className="text-xl font-semibold text-white">{stats.games}</div>
          </div>
          <div className="bg-dark-card border border-dark-border rounded-lg p-4">
            <div className="text-gray-400 text-sm">Winrate</div>
            <div className="text-xl font-semibold text-white">{stats.winrate.toFixed(1)}%</div>
            <div className="text-xs text-gray-500">{stats.wins}V - {stats.games - stats.wins}D</div>
          </div>
          <div className="bg-dark-card border border-dark-border rounded-lg p-4">
            <div className="text-gray-400 text-sm">Temps moy. partie</div>
            <div className="text-xl font-semibold text-white">{stats.avgDurationMin.toFixed(1)} min</div>
          </div>
        </div>
      </div>

      {/* Side */}
      <div>
        <h3 className="font-display text-base font-semibold text-white mb-2">Side</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          <div className="bg-dark-card border border-dark-border rounded-lg p-4">
            <div className="text-gray-400 text-sm">Blue side</div>
            <div className="text-lg font-semibold text-blue-400">{stats.blueWR != null ? `${stats.blueWR.toFixed(1)}%` : '—'}</div>
            {stats.blueGames ? <div className="text-xs text-gray-500">{stats.blueWins}V / {stats.blueGames}</div> : null}
          </div>
          <div className="bg-dark-card border border-dark-border rounded-lg p-4">
            <div className="text-gray-400 text-sm">Red side</div>
            <div className="text-lg font-semibold text-red-400">{stats.redWR != null ? `${stats.redWR.toFixed(1)}%` : '—'}</div>
            {stats.redGames ? <div className="text-xs text-gray-500">{stats.redWins}V / {stats.redGames}</div> : null}
          </div>
        </div>
      </div>

      {/* KDA */}
      <div>
        <h3 className="font-display text-base font-semibold text-white mb-2">KDA</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          <div className="bg-dark-card border border-dark-border rounded-lg p-4">
            <div className="text-gray-400 text-sm">KDA équipe</div>
            <div className="text-xl font-semibold text-white">{stats.kdaRatio.toFixed(1)}</div>
          </div>
          <div className="bg-dark-card border border-dark-border rounded-lg p-4">
            <div className="text-gray-400 text-sm">Kills (total)</div>
            <div className="text-xl font-semibold text-white">{stats.totalKills.toLocaleString()}</div>
          </div>
          <div className="bg-dark-card border border-dark-border rounded-lg p-4">
            <div className="text-gray-400 text-sm">Morts (total)</div>
            <div className="text-xl font-semibold text-white">{stats.totalDeaths.toLocaleString()}</div>
          </div>
          <div className="bg-dark-card border border-dark-border rounded-lg p-4">
            <div className="text-gray-400 text-sm">Assists (total)</div>
            <div className="text-xl font-semibold text-white">{stats.totalAssists.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* Objectifs & First */}
      {stats.objectivesMatchCount > 0 && (
        <>
          <div>
            <h3 className="font-display text-base font-semibold text-white mb-2">Objectifs</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              <div className="bg-dark-card border border-dark-border rounded-lg p-4">
                <div className="text-gray-400 text-sm">🐉 Dragons (moy.)</div>
                <div className="text-xl font-semibold text-white">{stats.avgDragons.toFixed(1)}</div>
                <div className="text-xs text-gray-500">sur {stats.objectivesMatchCount} parties</div>
              </div>
              <div className="bg-dark-card border border-dark-border rounded-lg p-4">
                <div className="text-gray-400 text-sm">🪲 Grubs (moy.)</div>
                <div className="text-xl font-semibold text-white">{stats.avgGrubs.toFixed(1)}</div>
              </div>
              <div className="bg-dark-card border border-dark-border rounded-lg p-4">
                <div className="text-gray-400 text-sm">🦀 Herald (moy.)</div>
                <div className="text-xl font-semibold text-white">{stats.avgHeralds.toFixed(1)}</div>
              </div>
              <div className="bg-dark-card border border-dark-border rounded-lg p-4">
                <div className="text-gray-400 text-sm">👑 Nashor (moy.)</div>
                <div className="text-xl font-semibold text-white">{stats.avgBarons.toFixed(1)}</div>
              </div>
            </div>
          </div>
          <div>
            <h3 className="font-display text-base font-semibold text-white mb-2">First</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              <div className="bg-dark-card border border-dark-border rounded-lg p-4">
                <div className="text-gray-400 text-sm">First tower %</div>
                <div className="text-xl font-semibold text-white">{stats.firstTowerPct.toFixed(0)}%</div>
              </div>
              <div className="bg-dark-card border border-dark-border rounded-lg p-4">
                <div className="text-gray-400 text-sm">First blood %</div>
                <div className="text-xl font-semibold text-white">{stats.firstBloodPct.toFixed(0)}%</div>
              </div>
              <div className="bg-dark-card border border-dark-border rounded-lg p-4">
                <div className="text-gray-400 text-sm">First dragon %</div>
                <div className="text-xl font-semibold text-white">{stats.firstDragonPct.toFixed(0)}%</div>
              </div>
              <div className="bg-dark-card border border-dark-border rounded-lg p-4">
                <div className="text-gray-400 text-sm">First baron %</div>
                <div className="text-xl font-semibold text-white">{stats.firstBaronPct.toFixed(0)}%</div>
              </div>
            </div>
          </div>
        </>
      )}
      <div className="bg-dark-card border border-dark-border rounded-lg overflow-hidden">
        <h3 className="font-display text-base font-semibold text-white px-4 py-3 border-b border-dark-border">Détail des stats globales</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 border-b border-dark-border bg-dark-bg/50">
                <th className="py-3 px-4">Indicateur</th>
                <th className="py-3 px-4 text-right">Valeur</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.label} className="border-b border-dark-border/50">
                  <td className="py-3 px-4 text-gray-300">{r.label}</td>
                  <td className="py-3 px-4 text-right text-white font-medium">
                    {r.value}
                    {r.sub && <span className="text-gray-500 font-normal ml-1">{r.sub}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <TeamTimelineAdvantage matches={matches} timelines={timelines ?? []} />
    </div>
  )
}

const STATS_MODE_TEAM = 'team'
const STATS_MODE_SOLOQ = 'soloq'

function SoloQPlaceholder() {
  return (
    <div className="space-y-6">
      <div className="bg-dark-card border border-dark-border rounded-lg p-6">
        <h3 className="font-display text-base font-semibold text-white mb-4">Stats globales</h3>
        <p className="text-gray-500 text-sm">Remontée des données Solo Q à venir.</p>
      </div>
      <div className="bg-dark-card border border-dark-border rounded-lg p-6">
        <h3 className="font-display text-base font-semibold text-white mb-4">Best champions</h3>
        <p className="text-gray-500 text-sm">Remontée des données Solo Q à venir.</p>
      </div>
    </div>
  )
}

const STATS_CARDS = [
  { id: STATS_CATEGORY_JOUEURS, label: 'Joueurs', description: 'Stats par joueur (ALL + les 5 postes)', icon: Users },
  { id: STATS_CATEGORY_COMPOS, label: 'Compos', description: 'Statistiques par composition', icon: LayoutGrid },
  { id: STATS_CATEGORY_SIDE, label: 'Side', description: 'Stats Blue side vs Red side', icon: ArrowLeftRight },
]

function StatsCategoryPlaceholder({ categoryLabel, onBack }) {
  return (
    <div className="max-w-2xl">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 text-sm"
      >
        <ArrowLeft size={18} />
        Retour au choix
      </button>
      <div className="bg-dark-card border border-dark-border rounded-lg p-12 text-center">
        <h3 className="font-display text-2xl font-bold text-white mb-2">{categoryLabel}</h3>
        <p className="text-gray-500">Bientôt disponible.</p>
      </div>
    </div>
  )
}

export const TeamStatsPage = () => {
  const { team, players = [] } = useTeam()
  const { matches, loading: matchesLoading } = useTeamMatches(team?.id)
  const matchIds = useMemo(() => (matches || []).map((m) => m.id), [matches])
  const { timelines, loading: timelinesLoading } = useTeamTimelines(matchIds)
  const [statsCategory, setStatsCategory] = useState(null)
  const [selectedId, setSelectedId] = useState(ALL_ID)
  const [statsMode, setStatsMode] = useState(STATS_MODE_TEAM)

  const selectedPlayer = players.find((p) => p.id === selectedId)
  const selectedLabel = selectedId === ALL_ID
    ? 'Équipe (tous les joueurs)'
    : (selectedPlayer?.player_name || selectedPlayer?.pseudo) ?? 'Joueur'

  const renderContent = () => {
    if (statsMode === STATS_MODE_SOLOQ) {
      return <SoloQPlaceholder />
    }
    if (selectedId === ALL_ID) {
      return <TeamGlobalStats matches={matches} loading={matchesLoading} timelines={timelines} />
    }
    return (
      <>
        <section className="space-y-6">
          <PlayerTeamStatsSection playerId={selectedId} />
        </section>
        <div className="mt-6">
          <PlayerTimelineAdvantage playerId={selectedId} matches={matches} timelines={timelines ?? []} />
        </div>
      </>
    )
  }

  if (statsCategory === null) {
    return (
      <div className="max-w-4xl">
        <h2 className="font-display text-3xl font-bold mb-2">Statistiques</h2>
        <p className="text-gray-400 mb-8">Choisissez une catégorie à analyser.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {STATS_CARDS.map((card) => {
            const Icon = card.icon
            return (
              <button
                key={card.id}
                type="button"
                onClick={() => setStatsCategory(card.id)}
                className="bg-dark-card border border-dark-border rounded-xl p-6 text-left hover:border-primary/50 hover:bg-dark-card/80 transition-all group"
              >
                <div className="w-12 h-12 rounded-lg bg-dark-bg flex items-center justify-center mb-4 group-hover:bg-primary/20">
                  <Icon className="text-primary" size={24} />
                </div>
                <h3 className="font-display text-lg font-semibold text-white mb-2">{card.label}</h3>
                <p className="text-gray-500 text-sm">{card.description}</p>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  if (statsCategory === STATS_CATEGORY_COMPOS || statsCategory === STATS_CATEGORY_SIDE) {
    const label = STATS_CARDS.find((c) => c.id === statsCategory)?.label ?? statsCategory
    return (
      <div className="max-w-7xl">
        <StatsCategoryPlaceholder
          categoryLabel={label}
          onBack={() => setStatsCategory(null)}
        />
      </div>
    )
  }

  return (
    <div className="flex gap-6 w-full max-w-7xl">
      <PlayerFilterSidebar
        players={players}
        selectedId={selectedId}
        onSelect={setSelectedId}
        showAllButton
      />
      <div className="flex-1 min-w-0">
        <button
          type="button"
          onClick={() => setStatsCategory(null)}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-2 text-sm"
        >
          <ArrowLeft size={18} />
          Retour au choix
        </button>
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <button
            type="button"
            onClick={() => setStatsMode(STATS_MODE_TEAM)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              statsMode === STATS_MODE_TEAM
                ? 'bg-primary text-white'
                : 'bg-dark-card border border-dark-border text-gray-400 hover:text-white hover:border-gray-500'
            }`}
          >
            Team
          </button>
          <button
            type="button"
            onClick={() => setStatsMode(STATS_MODE_SOLOQ)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              statsMode === STATS_MODE_SOLOQ
                ? 'bg-primary text-white'
                : 'bg-dark-card border border-dark-border text-gray-400 hover:text-white hover:border-gray-500'
            }`}
          >
            Solo Q
          </button>
        </div>
        <div className="mb-6">
          <h2 className="font-display text-3xl font-bold mb-2">Statistiques · Joueurs</h2>
          <p className="text-gray-400">
            Analysez les performances de votre équipe
            {selectedId !== ALL_ID && (
              <span className="text-gray-300 ml-1">· {selectedLabel}</span>
            )}
          </p>
        </div>

        {renderContent()}
      </div>
    </div>
  )
}
