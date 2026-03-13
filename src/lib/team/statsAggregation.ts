/**
 * Agrégation de stats par champion — utilisée par PlayerDetail, TeamStats, SoloQStats.
 * Remplace les 5+ copies du même pattern "group by champion → compute winrate/KDA/averages".
 */

interface BaseAccum {
  games: number
  wins: number
  kills: number
  deaths: number
  assists: number
}

export interface ChampionStatRow {
  name: string
  games: number
  wins: number
  losses: number
  winrate: number
  avgK: number
  avgD: number
  avgA: number
  kdaRatio: number
}

/**
 * Agrège des données brutes en stats par champion.
 *
 * @param rows — tableau de données brutes (chaque élément a un nom de champion + stats)
 * @param getChampionName — extracteur du nom du champion depuis un row
 * @param getWin — extracteur du booléen victoire depuis un row
 * @param options.getGold — optionnel, extrait gold pour calculer avgGold
 * @param options.getDamage — optionnel, extrait damage pour calculer avgDamage
 * @param options.collectEntry — optionnel, accumule les entrées brutes dans matchEntries
 */
export function aggregateChampionStats<T>(
  rows: T[],
  getChampionName: (row: T) => string | null | undefined,
  getWin: (row: T) => boolean,
  options?: {
    getKills?: (row: T) => number
    getDeaths?: (row: T) => number
    getAssists?: (row: T) => number
    getGold?: (row: T) => number
    getDamage?: (row: T) => number
    collectEntry?: boolean
  }
): (ChampionStatRow & { avgGold?: number; avgDamage?: number; matchEntries?: T[] })[] {
  const getK = options?.getKills ?? ((r: T) => (r as Record<string, unknown>).kills as number ?? 0)
  const getD = options?.getDeaths ?? ((r: T) => (r as Record<string, unknown>).deaths as number ?? 0)
  const getA = options?.getAssists ?? ((r: T) => (r as Record<string, unknown>).assists as number ?? 0)

  const byChamp = new Map<string, BaseAccum & { gold: number; damage: number; entries: T[] }>()

  for (const row of rows) {
    const name = getChampionName(row)
    if (!name) continue

    if (!byChamp.has(name)) {
      byChamp.set(name, { games: 0, wins: 0, kills: 0, deaths: 0, assists: 0, gold: 0, damage: 0, entries: [] })
    }
    const s = byChamp.get(name)!
    s.games++
    if (getWin(row)) s.wins++
    s.kills += getK(row)
    s.deaths += getD(row)
    s.assists += getA(row)
    if (options?.getGold) s.gold += options.getGold(row)
    if (options?.getDamage) s.damage += options.getDamage(row)
    if (options?.collectEntry) s.entries.push(row)
  }

  return Array.from(byChamp.entries())
    .map(([name, s]) => {
      const base: ChampionStatRow = {
        name,
        games: s.games,
        wins: s.wins,
        losses: s.games - s.wins,
        winrate: s.games > 0 ? Math.round((s.wins / s.games) * 100) : 0,
        avgK: s.games > 0 ? +(s.kills / s.games).toFixed(1) : 0,
        avgD: s.games > 0 ? +(s.deaths / s.games).toFixed(1) : 0,
        avgA: s.games > 0 ? +(s.assists / s.games).toFixed(1) : 0,
        kdaRatio: s.deaths > 0
          ? +((s.kills + s.assists) / s.deaths).toFixed(2)
          : +(s.kills + s.assists).toFixed(2),
      }
      const result: typeof base & { avgGold?: number; avgDamage?: number; matchEntries?: T[] } = base
      if (options?.getGold) result.avgGold = s.games > 0 ? Math.round(s.gold / s.games) : 0
      if (options?.getDamage) result.avgDamage = s.games > 0 ? Math.round(s.damage / s.games) : 0
      if (options?.collectEntry) result.matchEntries = s.entries
      return result
    })
    .sort((a, b) => b.games - a.games)
}
