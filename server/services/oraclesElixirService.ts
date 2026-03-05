/**
 * Service Oracle's Elixir — téléchargement, cache et agrégation des stats pro LoL.
 * Source : https://drive.google.com/drive/folders/1gLSw0RLjBbtaNy0dgnGQDAZOHIgCe-HH
 *
 * Le backend télécharge le CSV côté serveur (pas de CORS), le cache en mémoire,
 * et expose des données agrégées au frontend via /api/stats/*.
 */
import axios from 'axios'
import type { CSVRow } from '../types/index.js'

// ─── Mapping année → file ID Google Drive (Oracle's Elixir public) ──────────
const YEAR_TO_FILE_ID: Record<string, string> = {
  '2026': '1hnpbrUpBMS1TZI7IovfpKeZfWJH1Aptm',
  '2025': '1v6LRphp2kYciU4SXp0PCjEMuev1bDejc',
  '2024': '1IjIEhLc9n8eLKeY-yh_YigKVWbhgGBsN',
  '2023': '1XXk2LO0CsNADBB1LRGOV5rUpyZdEZ8s2',
  '2022': '1EHmptHyzY8owv0BAcNKtkQpMwfkURwRy',
  '2021': '1fzwTTz77hcnYjOnO9ONeoPrkWCoOSecA',
  '2020': '1dlSIczXShnv1vIfGNvBjgk-thMKA5j7d',
}

const SEASON_ALIAS: Record<string, string> = {
  S16: '2026', S15: '2025', S14: '2024', S13: '2023',
  S12: '2022', S11: '2021', S10: '2020',
}

const CURRENT_YEAR = '2026'
const TTL_CURRENT_MS = 60 * 60 * 1000         // 1h  — mis à jour quotidiennement par Oracle's Elixir
const TTL_HISTORICAL_MS = 24 * 60 * 60 * 1000 // 24h — données figées pour les années passées

interface CacheYearEntry {
  rows: CSVRow[]
  cachedAt: number
}

/** Cache mémoire : year → { rows, cachedAt } */
const cache = new Map<string, CacheYearEntry>()

// ─── Parsing CSV (gère correctement les champs entre guillemets) ─────────────
function parseCSVLine(line: string): string[] {
  const values: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') { inQuotes = !inQuotes }
    else if (c === ',' && !inQuotes) { values.push(current.trim()); current = '' }
    else { current += c }
  }
  values.push(current.trim())
  return values
}

function parseCSV(csvText: string): CSVRow[] {
  const lines = csvText.split('\n').filter((l) => l.trim())
  if (lines.length < 2) return []

  const headers = parseCSVLine(lines[0]).map((h) => h.toLowerCase().trim().replace(/\s+/g, '_'))
  const rows: CSVRow[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    if (values.length < headers.length / 2) continue // ligne vide / corrompue
    const row: CSVRow = {}
    headers.forEach((h, idx) => {
      const v = values[idx]?.trim() ?? ''
      const num = parseFloat(v)
      row[h] = v === '' ? null : isNaN(num) ? v : num
    })
    rows.push(row)
  }
  return rows
}

// ─── Téléchargement depuis Google Drive ─────────────────────────────────────
async function downloadYear(year: string): Promise<CSVRow[]> {
  const fileId = YEAR_TO_FILE_ID[year]
  if (!fileId) throw new Error(`Année ${year} non supportée (IDs: ${Object.keys(YEAR_TO_FILE_ID).join(', ')})`)

  // confirm=t bypasse l'avertissement Google Drive pour les gros fichiers
  const url = `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=t`

  console.warn(`[OraclesElixir] Téléchargement ${year}...`)
  const response = await axios.get<string>(url, {
    timeout: 120_000, // 2min pour les gros fichiers (75MB)
    headers: { 'User-Agent': 'Mozilla/5.0' },
    maxRedirects: 5,
  })

  if (typeof response.data !== 'string') {
    throw new Error(`Réponse inattendue pour l'année ${year} (pas du CSV)`)
  }

  const rows = parseCSV(response.data)
  console.warn(`[OraclesElixir] ${year} → ${rows.length} lignes parsées`)
  return rows
}

// ─── Accès avec cache ────────────────────────────────────────────────────────
function resolveYear(yearOrSeason: string): string {
  return SEASON_ALIAS[yearOrSeason] || yearOrSeason
}

export async function getRows(yearOrSeason: string): Promise<CSVRow[]> {
  const year = resolveYear(yearOrSeason)
  const cached = cache.get(year)
  const ttl = year === CURRENT_YEAR ? TTL_CURRENT_MS : TTL_HISTORICAL_MS

  if (cached && Date.now() - cached.cachedAt < ttl) return cached.rows

  const rows = await downloadYear(year)
  cache.set(year, { rows, cachedAt: Date.now() })
  return rows
}

export function getAvailableYears(): string[] {
  return Object.keys(YEAR_TO_FILE_ID).sort((a, b) => Number(b) - Number(a)) // décroissant
}

export function getCacheStatus(): Record<string, { rows: number; ageMin: number }> {
  const status: Record<string, { rows: number; ageMin: number }> = {}
  for (const [year, entry] of cache.entries()) {
    const ageMin = Math.round((Date.now() - entry.cachedAt) / 60_000)
    status[year] = { rows: entry.rows.length, ageMin }
  }
  return status
}

// ─── Filtrage des lignes ─────────────────────────────────────────────────────
interface FilterOptions {
  role?: string
  league?: string
  side?: string
  split?: string
  tournament?: string
  leagues?: string[]
}

export function filterRows(rows: CSVRow[], options: FilterOptions = {}): CSVRow[] {
  const { role, league: _league, side, split, tournament, leagues = [] } = options
  return rows.filter((r) => {
    // Ignorer les lignes "équipe" (participantid >= 100)
    if (r['participantid'] != null && Number(r['participantid']) >= 100) return false
    if (role && role !== 'all' && String(r['position'] || '').toLowerCase() !== role.toLowerCase()) return false
    if (side && side !== 'all' && String(r['side'] || '').toLowerCase() !== side.toLowerCase()) return false
    if (split && split !== 'all' && String(r['split'] || '').toLowerCase() !== split.toLowerCase()) return false
    if (tournament && tournament !== 'all' && r['league'] !== tournament) return false
    if (leagues.length > 0 && !leagues.includes(r['league'] as string)) return false
    return true
  })
}

// ─── Agrégation champion stats ───────────────────────────────────────────────
function avg(arr: number[]): number {
  if (!arr?.length) return 0
  return Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10
}

function formatGameTime(seconds: number): string {
  if (!seconds) return '00:00'
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`
}

interface ChampionAggregation {
  champion: string
  kills: number[]
  deaths: number[]
  assists: number[]
  gameLengths: number[]
  cs: number[]
  damage: number[]
  gold: number[]
  csd15: number[]
  gd15: number[]
  pickGameIds: Set<string>
}

export function aggregateChampionStats(rows: CSVRow[]): Record<string, unknown>[] {
  const champMap = new Map<string, ChampionAggregation>()
  const uniqueGames = new Set<string>()
  const bansPerGame = new Map<string, Set<string>>()
  const picksPerGame = new Map<string, Set<string>>()
  const winsPerGame = new Map<string, string>()

  rows.forEach((r) => {
    const gameid = r['gameid'] as string
    const champion = r['champion'] as string
    const side = r['side'] as string
    const result = r['result'] as number
    if (!gameid) return
    uniqueGames.add(gameid)

    // Picks
    if (champion?.trim()) {
      if (!picksPerGame.has(gameid)) picksPerGame.set(gameid, new Set())
      picksPerGame.get(gameid)!.add(champion)

      if (!champMap.has(champion)) {
        champMap.set(champion, {
          champion, kills: [], deaths: [], assists: [],
          gameLengths: [], cs: [], damage: [], gold: [], csd15: [], gd15: [],
          pickGameIds: new Set(),
        })
      }
      const s = champMap.get(champion)!
      s.pickGameIds.add(gameid)
      const key = `${gameid}|||${champion}`
      if (!winsPerGame.has(key)) winsPerGame.set(key, result === 1 ? 'win' : 'loss')
      if (r['kills'] != null) s.kills.push(r['kills'] as number)
      if (r['deaths'] != null) s.deaths.push(r['deaths'] as number)
      if (r['assists'] != null) s.assists.push(r['assists'] as number)
      if (r['gamelength'] != null) s.gameLengths.push(r['gamelength'] as number)
      if (r['cspm'] != null) s.cs.push(r['cspm'] as number)
      if (r['dpm'] != null) s.damage.push(r['dpm'] as number)
      if (r['earned_gpm'] != null) s.gold.push(r['earned_gpm'] as number)
      if (r['csdiffat15'] != null) s.csd15.push(r['csdiffat15'] as number)
      if (r['golddiffat15'] != null) s.gd15.push(r['golddiffat15'] as number)
    }

    // Bans
    if (!bansPerGame.has(gameid)) bansPerGame.set(gameid, new Set())
    const gameBans = bansPerGame.get(gameid)!
    ;['ban1', 'ban2', 'ban3', 'ban4', 'ban5'].forEach((slot) => {
      const b = r[slot] as string
      if (b?.trim()) {
        gameBans.add(b)
        if (!champMap.has(b)) {
          champMap.set(b, {
            champion: b, kills: [], deaths: [], assists: [],
            gameLengths: [], cs: [], damage: [], gold: [], csd15: [], gd15: [],
            pickGameIds: new Set(),
          })
        }
      }
    })

    void side // utilisé pour getTeamNames, pas ici
  })

  const totalGames = uniqueGames.size
  const picksCount = new Map<string, number>()
  picksPerGame.forEach((set) => set.forEach((c) => picksCount.set(c, (picksCount.get(c) || 0) + 1)))

  const bansCount = new Map<string, number>()
  bansPerGame.forEach((set) => set.forEach((c) => bansCount.set(c, (bansCount.get(c) || 0) + 1)))

  const winsCount = new Map<string, number>()
  const lossesCount = new Map<string, number>()
  winsPerGame.forEach((result, key) => {
    const champion = key.split('|||')[1]
    if (result === 'win') winsCount.set(champion, (winsCount.get(champion) || 0) + 1)
    else lossesCount.set(champion, (lossesCount.get(champion) || 0) + 1)
  })

  return Array.from(champMap.values()).map((s) => {
    const picks = picksCount.get(s.champion) || 0
    const bans = bansCount.get(s.champion) || 0
    const wins = winsCount.get(s.champion) || 0
    const losses = lossesCount.get(s.champion) || 0
    const avgK = avg(s.kills), avgD = avg(s.deaths), avgA = avg(s.assists)
    const kda = avgD > 0 ? (avgK + avgA) / avgD : avgK + avgA
    const prioScore = totalGames > 0 ? ((picks + bans) / totalGames) * 100 : 0
    return {
      champion: s.champion,
      picks, bans,
      prioScore: Math.round(prioScore * 10) / 10,
      wins, losses,
      winrate: picks > 0 ? (wins / picks) * 100 : 0,
      kda: Math.round(kda * 10) / 10,
      gt: formatGameTime(avg(s.gameLengths)),
      csm: avg(s.cs),
      dpm: Math.round(avg(s.damage)),
      gpm: Math.round(avg(s.gold)),
      csd15: avg(s.csd15),
      gd15: Math.round(avg(s.gd15)),
    }
  })
}

// ─── Données d'un match spécifique ───────────────────────────────────────────
export function getMatchRows(rows: CSVRow[], gameid: string): CSVRow[] {
  return rows.filter((r) => r['gameid'] === gameid)
}

// ─── Options de filtre disponibles ───────────────────────────────────────────
export function getFilterOptions(rows: CSVRow[]): { leagues: string[]; patches: string[]; splits: string[] } {
  const leagues = [...new Set(rows.map((r) => r['league'] as string).filter(Boolean))].sort()
  const patches = [...new Set(rows.map((r) => r['patch'] as string).filter(Boolean))].sort(
    (a, b) => parseFloat(b) - parseFloat(a)
  )
  const splits = [...new Set(rows.map((r) => r['split'] as string).filter(Boolean))].sort()
  return { leagues, patches, splits }
}

// ─── Noms d'équipes pour une liste de gameids ─────────────────────────────────
export function getTeamNames(
  rows: CSVRow[],
  gameids: string[],
): Record<string, { blue?: string; red?: string }> {
  const result: Record<string, { blue?: string; red?: string }> = {}
  const ids = new Set(gameids)
  rows.forEach((r) => {
    const gameid = r['gameid'] as string
    const teamname = r['teamname'] as string
    const side = r['side'] as string
    if (!ids.has(gameid) || !teamname || result[gameid]?.blue && result[gameid]?.red) return
    if (!result[gameid]) result[gameid] = {}
    if (side === 'Blue') result[gameid].blue = teamname
    if (side === 'Red') result[gameid].red = teamname
  })
  return result
}

export { resolveYear }
