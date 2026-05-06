import { aggregateChampionStats } from './statsAggregation'

/** CS différentiel équipe/adversaire calculé depuis les participants JSON d'un match. */
export function teamCsFromParticipants(
  participants: Record<string, { minions?: number; jungle?: number; cs?: number }> | null | undefined,
  ourTeamId: number,
): number | null {
  if (!participants || typeof participants !== 'object') return null
  const getCs = (s: { minions?: number; jungle?: number; cs?: number } | undefined) =>
    (s?.minions ?? 0) + (s?.jungle ?? 0) || (s?.cs ?? 0)
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

/** Statistiques de champions agrégées pour toute l'équipe (côté "our"). */
export function computeTeamChampionStats(matches: any[]) {
  const flat: { p: any; win: boolean }[] = []
  for (const m of matches) {
    const our = (m.team_match_participants || []).filter(
      (p: any) => p.team_side === 'our' || !p.team_side,
    )
    for (const p of our) flat.push({ p, win: !!m.our_win })
  }
  return aggregateChampionStats(
    flat,
    (r) => r.p.champion_name,
    (r) => r.win,
    {
      getKills: (r) => r.p.kills ?? 0,
      getDeaths: (r) => r.p.deaths ?? 0,
      getAssists: (r) => r.p.assists ?? 0,
      getGold: (r) => r.p.gold_earned ?? 0,
      getDamage: (r) => r.p.total_damage_dealt_to_champions ?? 0,
    },
  )
}

/** Statistiques de champions agrégées pour un joueur spécifique (côté "our"). */
export function computePlayerChampionStats(playerId: string, matches: any[]) {
  const flat: { p: any; win: boolean }[] = []
  for (const m of matches) {
    const our = (m.team_match_participants || []).filter(
      (x: any) => x.team_side === 'our' || !x.team_side,
    )
    const p = our.find((x: any) => x.player_id === playerId)
    if (p && p.champion_name) flat.push({ p, win: !!m.our_win })
  }
  return aggregateChampionStats(
    flat,
    (r) => r.p.champion_name,
    (r) => r.win,
    {
      getKills: (r) => r.p.kills ?? 0,
      getDeaths: (r) => r.p.deaths ?? 0,
      getAssists: (r) => r.p.assists ?? 0,
      getGold: (r) => r.p.gold_earned ?? 0,
      getDamage: (r) => r.p.total_damage_dealt_to_champions ?? 0,
    },
  )
}

/** Génère toutes les combinaisons de taille `size` depuis un tableau. */
export function getCombinations<T>(arr: T[], size: number): T[][] {
  if (size === 1) return arr.map((item) => [item])
  const result: T[][] = []
  for (let i = 0; i <= arr.length - size; i++) {
    const rest = getCombinations(arr.slice(i + 1), size - 1)
    for (const combo of rest) result.push([arr[i], ...combo])
  }
  return result
}

/** Agrège les statistiques de combos de champions (compos) côté "our" ou "enemy". */
export function computeComboStats(
  matches: any[],
  size: number,
  side: 'our' | 'enemy',
): { names: string[]; games: number; wins: number; losses: number; winrate: number }[] {
  const byCombo = new Map<string, { games: number; wins: number; names: string[] }>()
  for (const m of matches) {
    const parts = m.team_match_participants || []
    const players =
      side === 'our'
        ? parts.filter((p: any) => p.team_side === 'our' || !p.team_side)
        : parts.filter((p: any) => p.team_side === 'enemy')
    const names: string[] = players.map((p: any) => p.champion_name).filter(Boolean)
    if (names.length < size) continue
    for (const combo of getCombinations(names, size)) {
      const sorted = [...combo].sort()
      const key = sorted.join('|')
      if (!byCombo.has(key)) byCombo.set(key, { games: 0, wins: 0, names: sorted })
      const s = byCombo.get(key)!
      s.games++
      if (side === 'our' ? m.our_win : !m.our_win) s.wins++
    }
  }
  return Array.from(byCombo.values())
    .filter((c) => c.games >= 1)
    .map((c) => ({ ...c, winrate: Math.round((c.wins / c.games) * 100), losses: c.games - c.wins }))
    .sort((a, b) => b.games - a.games)
    .slice(0, 20)
}
