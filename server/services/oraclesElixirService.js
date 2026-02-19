/**
 * Service Oracle's Elixir — téléchargement, cache et agrégation des stats pro LoL.
 * Source : https://drive.google.com/drive/folders/1gLSw0RLjBbtaNy0dgnGQDAZOHIgCe-HH
 *
 * Le backend télécharge le CSV côté serveur (pas de CORS), le cache en mémoire,
 * et expose des données agrégées au frontend via /api/stats/*.
 */

import axios from 'axios'

// ─── Mapping année → file ID Google Drive (Oracle's Elixir public) ──────────
const YEAR_TO_FILE_ID = {
  '2026': '1hnpbrUpBMS1TZI7IovfpKeZfWJH1Aptm',
  '2025': '1v6LRphp2kYciU4SXp0PCjEMuev1bDejc',
  '2024': '1IjIEhLc9n8eLKeY-yh_YigKVWbhgGBsN',
  '2023': '1XXk2LO0CsNADBB1LRGOV5rUpyZdEZ8s2',
  '2022': '1EHmptHyzY8owv0BAcNKtkQpMwfkURwRy',
  '2021': '1fzwTTz77hcnYjOnO9ONeoPrkWCoOSecA',
  '2020': '1dlSIczXShnv1vIfGNvBjgk-thMKA5j7d',
}

const SEASON_ALIAS = {
  S16: '2026', S15: '2025', S14: '2024', S13: '2023',
  S12: '2022', S11: '2021', S10: '2020',
}

const CURRENT_YEAR = '2026'
const TTL_CURRENT_MS = 60 * 60 * 1000       // 1h  — mis à jour quotidiennement par Oracle's Elixir
const TTL_HISTORICAL_MS = 24 * 60 * 60 * 1000 // 24h — données figées pour les années passées

/** Cache mémoire : year → { rows: Array, cachedAt: number } */
const cache = new Map()

// ─── Parsing CSV (gère correctement les champs entre guillemets) ─────────────
function parseCSVLine(line) {
  const values = []
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

function parseCSV(csvText) {
  const lines = csvText.split('\n').filter((l) => l.trim())
  if (lines.length < 2) return []

  const headers = parseCSVLine(lines[0]).map((h) => h.toLowerCase().trim().replace(/\s+/g, '_'))
  const rows = []

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    if (values.length < headers.length / 2) continue // ligne vide / corrompue
    const row = {}
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
async function downloadYear(year) {
  const fileId = YEAR_TO_FILE_ID[year]
  if (!fileId) throw new Error(`Année ${year} non supportée (IDs: ${Object.keys(YEAR_TO_FILE_ID).join(', ')})`)

  // confirm=t bypasse l'avertissement Google Drive pour les gros fichiers
  const url = `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=t`

  console.warn(`[OraclesElixir] Téléchargement ${year}...`)
  const response = await axios.get(url, {
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
function resolveYear(yearOrSeason) {
  return SEASON_ALIAS[yearOrSeason] || yearOrSeason
}

export async function getRows(yearOrSeason) {
  const year = resolveYear(yearOrSeason)
  const cached = cache.get(year)
  const ttl = year === CURRENT_YEAR ? TTL_CURRENT_MS : TTL_HISTORICAL_MS

  if (cached && Date.now() - cached.cachedAt < ttl) return cached.rows

  const rows = await downloadYear(year)
  cache.set(year, { rows, cachedAt: Date.now() })
  return rows
}

export function getAvailableYears() {
  return Object.keys(YEAR_TO_FILE_ID).sort((a, b) => b - a) // décroissant
}

export function getCacheStatus() {
  const status = {}
  for (const [year, entry] of cache.entries()) {
    const ageMin = Math.round((Date.now() - entry.cachedAt) / 60_000)
    status[year] = { rows: entry.rows.length, ageMin }
  }
  return status
}

// ─── Filtrage des lignes ─────────────────────────────────────────────────────
function filterRows(rows, { role, league, side, split, tournament, leagues = [] } = {}) {
  return rows.filter((r) => {
    // Ignorer les lignes "équipe" (participantid >= 100)
    if (r.participantid != null && r.participantid >= 100) return false
    if (role && role !== 'all' && r.position?.toLowerCase() !== role.toLowerCase()) return false
    if (side && side !== 'all' && r.side?.toLowerCase() !== side.toLowerCase()) return false
    if (split && split !== 'all' && r.split?.toLowerCase() !== split.toLowerCase()) return false
    if (tournament && tournament !== 'all' && r.league !== tournament) return false
    if (leagues.length > 0 && !leagues.includes(r.league)) return false
    return true
  })
}

// ─── Agrégation champion stats ───────────────────────────────────────────────
function avg(arr) {
  if (!arr?.length) return 0
  return Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10
}

function formatGameTime(seconds) {
  if (!seconds) return '00:00'
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`
}

export function aggregateChampionStats(rows) {
  const champMap = new Map()
  const uniqueGames = new Set()
  const bansPerGame = new Map()
  const picksPerGame = new Map()
  const winsPerGame = new Map()

  rows.forEach((r) => {
    const { gameid, champion, side, result } = r
    if (!gameid) return
    uniqueGames.add(gameid)

    // Picks
    if (champion?.trim()) {
      if (!picksPerGame.has(gameid)) picksPerGame.set(gameid, new Set())
      picksPerGame.get(gameid).add(champion)

      if (!champMap.has(champion)) {
        champMap.set(champion, {
          champion, kills: [], deaths: [], assists: [],
          gameLengths: [], cs: [], damage: [], gold: [], csd15: [], gd15: [],
          pickGameIds: new Set(),
        })
      }
      const s = champMap.get(champion)
      s.pickGameIds.add(gameid)
      const key = `${gameid}|||${champion}`
      if (!winsPerGame.has(key)) winsPerGame.set(key, result === 1 ? 'win' : 'loss')
      if (r.kills != null) s.kills.push(r.kills)
      if (r.deaths != null) s.deaths.push(r.deaths)
      if (r.assists != null) s.assists.push(r.assists)
      if (r.gamelength != null) s.gameLengths.push(r.gamelength)
      if (r.cspm != null) s.cs.push(r.cspm)
      if (r.dpm != null) s.damage.push(r.dpm)
      if (r.earned_gpm != null) s.gold.push(r.earned_gpm)
      if (r.csdiffat15 != null) s.csd15.push(r.csdiffat15)
      if (r.golddiffat15 != null) s.gd15.push(r.golddiffat15)
    }

    // Bans
    if (!bansPerGame.has(gameid)) bansPerGame.set(gameid, new Set())
    const gameBans = bansPerGame.get(gameid)
    ;['ban1', 'ban2', 'ban3', 'ban4', 'ban5'].forEach((slot) => {
      const b = r[slot]
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
  })

  const totalGames = uniqueGames.size
  const picksCount = new Map()
  picksPerGame.forEach((set) => set.forEach((c) => picksCount.set(c, (picksCount.get(c) || 0) + 1)))

  const bansCount = new Map()
  bansPerGame.forEach((set) => set.forEach((c) => bansCount.set(c, (bansCount.get(c) || 0) + 1)))

  const winsCount = new Map()
  const lossesCount = new Map()
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
export function getMatchRows(rows, gameid) {
  return rows.filter((r) => r.gameid === gameid)
}

// ─── Options de filtre disponibles ───────────────────────────────────────────
export function getFilterOptions(rows) {
  const leagues = [...new Set(rows.map((r) => r.league).filter(Boolean))].sort()
  const patches = [...new Set(rows.map((r) => r.patch).filter(Boolean))].sort(
    (a, b) => parseFloat(b) - parseFloat(a)
  )
  const splits = [...new Set(rows.map((r) => r.split).filter(Boolean))].sort()
  return { leagues, patches, splits }
}

// ─── Noms d'équipes pour une liste de gameids ─────────────────────────────────
export function getTeamNames(rows, gameids) {
  const result = {}
  const ids = new Set(gameids)
  rows.forEach((r) => {
    if (!ids.has(r.gameid) || !r.teamname || result[r.gameid]) return
    if (!result[r.gameid]) result[r.gameid] = {}
    if (r.side === 'Blue') result[r.gameid].blue = r.teamname
    if (r.side === 'Red') result[r.gameid].red = r.teamname
  })
  return result
}

export { filterRows, resolveYear }
