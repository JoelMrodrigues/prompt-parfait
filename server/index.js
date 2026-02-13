/**
 * API backend pour récupérer rank + top champions depuis dpm.lol
 * et top 5 champions Solo Q depuis l'API Riot (1 requête par joueur, backend fait les N appels Riot).
 */
import { fileURLToPath } from 'url'
import { dirname, join, resolve } from 'path'
import { readFileSync, existsSync } from 'fs'
import express from 'express'
import cors from 'cors'
import axios from 'axios'
import * as cheerio from 'cheerio'
import { formatChampionName } from './formatChampionName.js'
import { fetchTopChampionsSoloq, getPuuidAndSummonerId } from './riotSoloqChampions.js'
import { getRankFromPuuid } from './riotRank.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
function loadServerEnv() {
  const envUrl = new URL('.env', import.meta.url)
  const paths = [
    resolve(fileURLToPath(envUrl)),
    resolve(__dirname, '.env'),
    resolve(process.cwd(), 'server', '.env'),
  ]
  for (const p of paths) {
    const exists = existsSync(p)
    if (!exists) continue
    try {
      let raw = readFileSync(p, 'utf8')
      if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1)
      let count = 0
      for (const line of raw.split(/\r?\n/)) {
        const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/)
        if (m) {
          const key = m[1].trim()
          const val = m[2].trim().replace(/^["']|["']$/g, '').replace(/\s+$/, '')
          if (key && val) {
            process.env[key] = val
            count++
          }
        }
      }
      if (count > 0) return
      if (raw.includes('RIOT_API_KEY=')) {
        const m = raw.match(/RIOT_API_KEY\s*=\s*([^\r\n]+)/)
        if (m && m[1].trim()) {
          process.env.RIOT_API_KEY = m[1].trim().replace(/^["']|["']$/g, '')
          return
        }
      }
    } catch (_) {}
  }
  const lastTry = resolve(__dirname, '.env')
  if (existsSync(lastTry)) {
    try {
      const raw = readFileSync(lastTry, 'utf8')
      const idx = raw.indexOf('RIOT_API_KEY=')
      if (idx !== -1) {
        const rest = raw.slice(idx + 13).split(/\r?\n/)[0].trim().replace(/\r/g, '').replace(/^["']|["']$/g, '')
        if (rest) process.env.RIOT_API_KEY = rest
      }
    } catch (_) {}
  }
}
loadServerEnv()

const app = express()
const PORT = process.env.PORT || 3001

// CORS : en production (FRONTEND_URL défini), limiter aux origines autorisées
const corsOptions = process.env.FRONTEND_URL
  ? { origin: process.env.FRONTEND_URL.split(',').map((u) => u.trim()), credentials: true }
  : {}
app.use(cors(corsOptions))
app.use(express.json())

const SOLOQ_CACHE_TTL_MS = 15 * 60 * 1000
const soloqCache = new Map()
const playerStatsCache = new Map()

function getSoloqCacheKey(pseudo, region) {
  return `${(pseudo || '').trim().toLowerCase()}|${(region || 'euw1').toLowerCase()}`
}

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  Accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
  'Accept-Encoding': 'gzip, deflate, br',
  Referer: 'https://dpm.lol/',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'same-origin',
  'Sec-Fetch-User': '?1',
  'Upgrade-Insecure-Requests': '1',
}

/**
 * Extrait le rank depuis le HTML de la page principale dpm.lol
 */
function extractRank(html) {
  const $ = cheerio.load(html)
  const bodyText = $('body').text() || ''
  const patternWithLP =
    /(master|grandmaster|challenger|diamond|emerald|platinum|gold|silver|bronze|iron)\s+(\d+)\s*LP/gi
  const matches = [...bodyText.matchAll(patternWithLP)]
  if (matches.length > 0) {
    const priority = matches.find(
      (m) =>
        /master|grandmaster|challenger/i.test(m[0])
    )
    return (priority || matches[0])[0].trim()
  }
  const noLP =
    /(master|grandmaster|challenger|diamond|emerald|platinum|gold|silver|bronze|iron)\s+(\d+)/gi
  const m2 = bodyText.match(noLP)
  return m2 ? m2[0].trim() : null
}

/**
 * Extrait les top champions depuis le HTML de la page /champions
 * Structure réelle: div.text-bm.grid.grid-cols-5 avec img[src*="champion/XXX"], span pour games, span.text-yellow-300 pour winrate
 */
function extractChampions(html) {
  const $ = cheerio.load(html)
  const champions = []

  // Lignes: div avec grid-cols-5 et col-span-5 (une par champion)
  const rows = $(
    'div.grid.grid-cols-5.col-span-5, div[class*="grid-cols-5"][class*="col-span-5"]'
  )

  rows.each((_, el) => {
    const $row = $(el)
    const $img = $row.find('img[src*="champion"], img[srcset*="champion"]').first()
    const src =
      $img.attr('src') || $img.attr('srcset') || ''
    const match = src.match(/champion[\/%2F](\w+)/i)
    if (!match) return

    const slug = match[1]
    const name = formatChampionName(slug)

    // Winrate: span.text-yellow-300 contenant "75%"
    const winrateText = $row.find('span.text-yellow-300').first().text().trim()
    const winrateMatch = winrateText.match(/(\d+)/)
    const winrate = winrateMatch ? parseInt(winrateMatch[1], 10) : null

    // Games: span qui contient uniquement un nombre (souvent entre KDA et WR)
    let games = null
    $row.find('span').each((_, span) => {
      const t = $(span).text().trim()
      if (/^\d+$/.test(t)) {
        const n = parseInt(t, 10)
        if (n >= 1 && n <= 1000) games = n
        return false // break
      }
    })

    if (name) {
      champions.push({
        name,
        games: games ?? undefined,
        winrate: winrate ?? undefined,
      })
    }
  })

  // Trier par parties (desc), puis winrate (desc)
  champions.sort((a, b) => {
    const ga = a.games || 0
    const gb = b.games || 0
    if (gb !== ga) return gb - ga
    return (b.winrate || 0) - (a.winrate || 0)
  })

  return champions.slice(0, 5)
}

/**
 * GET /api/dpm?pseudo=...
 * Pseudo avec espaces : utiliser %20 dans l’URL (ex: Marcel%20Le%20Zgeg-BACK).
 * Retourne { success, rank, champions } comme attendu par le front (usePlayerSync).
 */
app.get('/api/dpm', async (req, res) => {
  const pseudo = req.query.pseudo
  if (!pseudo || typeof pseudo !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Paramètre pseudo requis (ex: ?pseudo=Marcel%20Le%20Zgeg-BACK)',
    })
  }

  const formatted = pseudo.trim().replace(/#/g, '-')
  const encoded = encodeURIComponent(formatted)
  const mainUrl = `https://dpm.lol/${encoded}?queue=solo`
  const championsUrl = `https://dpm.lol/${encoded}/champions?queue=solo`

  try {
    const [mainRes, championsRes] = await Promise.all([
      axios.get(mainUrl, { headers: HEADERS, timeout: 12000 }),
      axios.get(championsUrl, { headers: HEADERS, timeout: 12000 }),
    ])

    const rank = extractRank(mainRes.data)
    const champions = extractChampions(championsRes.data)

    res.json({
      success: true,
      rank: rank || null,
      topChampions: champions.length > 0 ? champions : null,
      scrapedAt: new Date().toISOString(),
    })
  } catch (err) {
    console.error('DPM API error:', err.message, err.response?.status)
    const status = err.response?.status
    const msg = status === 403 ? 'dpm.lol refuse les requêtes serveur (403)' : (err.response?.data ? 'dpm.lol unreachable' : err.message)
    res.status(status === 403 ? 502 : status || 500).json({
      success: false,
      error: msg,
    })
  }
})

/**
 * GET /api/riot/soloq-top-champions?pseudo=GameName%23TagLine&region=euw1
 * Une requête par joueur : le backend appelle Riot (puuid → match IDs saison → détails avec throttle),
 * agrège le top 5 et renvoie. Cache 15 min par pseudo+region.
 * Nécessite RIOT_API_KEY dans l'environnement du serveur.
 */
app.get('/api/riot/soloq-top-champions', async (req, res) => {
  const pseudo = req.query.pseudo
  const region = (req.query.region || 'euw1').trim()
  if (!pseudo || typeof pseudo !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Paramètre pseudo requis (ex: ?pseudo=GameName%23TagLine&region=euw1)',
    })
  }
  const apiKey = (process.env.RIOT_API_KEY || '').trim()
  if (!apiKey) {
    return res.status(503).json({
      success: false,
      error: 'RIOT_API_KEY non configurée sur le serveur',
    })
  }
  const cacheKey = getSoloqCacheKey(pseudo, region)
  const cached = soloqCache.get(cacheKey)
  if (cached && Date.now() - cached.at < SOLOQ_CACHE_TTL_MS) {
    return res.json({
      success: true,
      topChampions: cached.data,
      cached: true,
      cachedAt: new Date(cached.at).toISOString(),
    })
  }
  try {
    const result = await fetchTopChampionsSoloq(pseudo, region, apiKey)
    if (result.error) {
      return res.status(400).json({
        success: false,
        error: result.error,
      })
    }
    soloqCache.set(cacheKey, { data: result.topChampions, at: Date.now() })
    res.json({
      success: true,
      topChampions: result.topChampions,
      cached: false,
    })
  } catch (err) {
    console.error('Riot soloq API error:', err.message)
    res.status(500).json({
      success: false,
      error: err.message || 'Erreur serveur',
    })
  }
})

/**
 * GET /api/riot/sync-rank?pseudo=GameName%23TagLine
 * Sync rank uniquement : 1) PUUID via account API, 2) Rank via league by-puuid.
 * Pseudo au format GameName#TagLine ou GameName/TagLine.
 */
app.get('/api/riot/sync-rank', async (req, res) => {
  const pseudo = (req.query.pseudo || '').trim()
  if (!pseudo) {
    return res.status(400).json({
      success: false,
      error: 'Paramètre pseudo requis (ex: ?pseudo=GameName%23TagLine)',
    })
  }
  const apiKey = (process.env.RIOT_API_KEY || '').trim().replace(/\r/g, '')
  if (!apiKey) {
    return res.status(503).json({
      success: false,
      error: 'RIOT_API_KEY non configurée',
    })
  }
  try {
    const sep = pseudo.includes('#') ? '#' : (pseudo.includes('/') ? '/' : null)
    const [gameName, tagLine] = sep ? pseudo.split(sep).map((s) => s.trim()) : [pseudo, null]
    if (!gameName || !tagLine) {
      return res.status(400).json({
        success: false,
        error: 'Pseudo au format GameName#TagLine ou GameName/TagLine requis',
      })
    }
    const accUrl = `https://europe.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}?api_key=${apiKey}`
    const accRes = await axios.get(accUrl, {
      timeout: 15000,
      validateStatus: () => true,
    })
    if (accRes.status !== 200) {
      return res.status(accRes.status === 404 ? 404 : 400).json({
        success: false,
        error: accRes.data?.status?.message || `Joueur introuvable (${accRes.status})`,
      })
    }
    const puuid = accRes.data?.puuid
    if (!puuid) {
      return res.status(400).json({ success: false, error: 'PUUID non trouvé' })
    }
    const leagueUrl = `https://euw1.api.riotgames.com/lol/league/v4/entries/by-puuid/${encodeURIComponent(puuid)}?api_key=${apiKey}`
    const leagueRes = await axios.get(leagueUrl, {
      timeout: 15000,
      validateStatus: () => true,
    })
    if (leagueRes.status !== 200) {
      return res.status(leagueRes.status >= 500 ? 500 : 400).json({
        success: false,
        error: leagueRes.data?.status?.message || `Erreur League API (${leagueRes.status})`,
      })
    }
    const entries = leagueRes.data
    const solo = Array.isArray(entries) ? entries.find((e) => e.queueType === 'RANKED_SOLO_5x5') : null
    if (!solo) {
      return res.json({ success: true, rank: null })
    }
    const tier = (solo.tier || '').toLowerCase().replace(/^./, (c) => c.toUpperCase())
    const lp = solo.leaguePoints ?? 0
    const rank = solo.rank || ''
    const rankStr = ['Master', 'Grandmaster', 'Challenger'].includes(tier)
      ? `${tier} ${lp} LP`
      : rank ? `${tier} ${rank} ${lp} LP` : `${tier} ${lp} LP`
    res.json({ success: true, rank: rankStr })
  } catch (err) {
    console.error('sync-rank error:', err.message)
    res.status(500).json({
      success: false,
      error: err.message || 'Erreur serveur',
    })
  }
})

/**
 * GET /api/riot/sync-rank-and-matches?pseudo=GameName%23TagLine
 * Sync rank + récupère les 20 dernières games ranked (pour les sauvegarder en base).
 * Retourne { success, rank, matches: [{ matchId, championName, win, kills, deaths, assists, gameDuration, gameCreation }] }
 */
const SYNC_MATCHES_LIMIT = 20
const SYNC_MATCH_DELAY_MS = 150
// Début saison 16 LoL : 8 janvier 2026 00:00 UTC
const SEASON_16_START_SEC = 1767830400
const SEASON_16_START_MS = 1767830400000

app.get('/api/riot/sync-rank-and-matches', async (req, res) => {
  const pseudo = (req.query.pseudo || '').trim()
  if (!pseudo) {
    return res.status(400).json({
      success: false,
      error: 'Paramètre pseudo requis (ex: ?pseudo=GameName%23TagLine)',
    })
  }
  const apiKey = (process.env.RIOT_API_KEY || '').trim().replace(/\r/g, '')
  if (!apiKey) {
    return res.status(503).json({
      success: false,
      error: 'RIOT_API_KEY non configurée',
    })
  }
  try {
    const sep = pseudo.includes('#') ? '#' : (pseudo.includes('/') ? '/' : null)
    const [gameName, tagLine] = sep ? pseudo.split(sep).map((s) => s.trim()) : [pseudo, null]
    if (!gameName || !tagLine) {
      return res.status(400).json({
        success: false,
        error: 'Pseudo au format GameName#TagLine ou GameName/TagLine requis',
      })
    }
    const accUrl = `https://europe.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}?api_key=${apiKey}`
    const accRes = await axios.get(accUrl, {
      timeout: 15000,
      validateStatus: () => true,
    })
    if (accRes.status !== 200) {
      return res.status(accRes.status === 404 ? 404 : 400).json({
        success: false,
        error: accRes.data?.status?.message || `Joueur introuvable (${accRes.status})`,
      })
    }
    const puuid = accRes.data?.puuid
    if (!puuid) {
      return res.status(400).json({ success: false, error: 'PUUID non trouvé' })
    }

    const leagueUrl = `https://euw1.api.riotgames.com/lol/league/v4/entries/by-puuid/${encodeURIComponent(puuid)}?api_key=${apiKey}`
    const idsUrl = `https://europe.api.riotgames.com/lol/match/v5/matches/by-puuid/${encodeURIComponent(puuid)}/ids?type=ranked&start=0&count=100&startTime=${SEASON_16_START_SEC}&api_key=${apiKey}`

    const [leagueRes, idsRes] = await Promise.all([
      axios.get(leagueUrl, { timeout: 15000, validateStatus: () => true }),
      axios.get(idsUrl, { timeout: 15000, validateStatus: () => true }),
    ])

    let rank = null
    if (leagueRes.status === 200) {
      const entries = leagueRes.data
      const solo = Array.isArray(entries) ? entries.find((e) => e.queueType === 'RANKED_SOLO_5x5') : null
      if (solo) {
        const tier = (solo.tier || '').toLowerCase().replace(/^./, (c) => c.toUpperCase())
        const lp = solo.leaguePoints ?? 0
        const r = solo.rank || ''
        rank = ['Master', 'Grandmaster', 'Challenger'].includes(tier)
          ? `${tier} ${lp} LP`
          : r ? `${tier} ${r} ${lp} LP` : `${tier} ${lp} LP`
      }
    }

    const fullIds = idsRes.status === 200 && Array.isArray(idsRes.data) ? idsRes.data : []
    const totalMatchIds = fullIds.length
    const idsToFetch = fullIds.slice(0, SYNC_MATCHES_LIMIT)
    const matches = []
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
    for (const matchId of idsToFetch) {
      await sleep(SYNC_MATCH_DELAY_MS)
      try {
        const matchUrl = `https://europe.api.riotgames.com/lol/match/v5/matches/${encodeURIComponent(matchId)}?api_key=${apiKey}`
        const matchRes = await axios.get(matchUrl, { timeout: 15000, validateStatus: () => true })
        if (matchRes.status !== 200 || !matchRes.data?.info) continue
        const info = matchRes.data.info
        const gameCreation = info.gameCreation ?? 0
        if (gameCreation < SEASON_16_START_MS) continue
        const participant = info.participants?.find((p) => p.puuid === puuid)
        if (!participant) continue
        matches.push({
          matchId,
          championId: participant.championId,
          championName: participant.championName || participant.championId,
          win: !!participant.win,
          kills: participant.kills ?? 0,
          deaths: participant.deaths ?? 0,
          assists: participant.assists ?? 0,
          gameDuration: info.gameDuration ?? 0,
          gameCreation,
        })
      } catch (e) {
        console.warn('sync-rank-and-matches match fetch failed:', matchId, e.message)
      }
    }

    res.json({ success: true, rank, matches, totalMatchIds })
  } catch (err) {
    console.error('sync-rank-and-matches error:', err.message)
    res.status(500).json({
      success: false,
      error: err.message || 'Erreur serveur',
    })
  }
})

/**
 * GET /api/riot/player-stats?pseudo=...&region=euw1
 * Rank + top 5 champions Solo Q via Riot uniquement (pas dpm.lol).
 * Même format que /api/dpm : { success, rank, topChampions } pour le sync joueur.
 */
app.get('/api/riot/player-stats', async (req, res) => {
  const pseudo = req.query.pseudo
  const region = (req.query.region || 'euw1').trim().toLowerCase()
  if (!pseudo || typeof pseudo !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Paramètre pseudo requis (ex: ?pseudo=GameName%23TagLine&region=euw1)',
    })
  }
  const apiKey = (process.env.RIOT_API_KEY || '').trim()
  if (!apiKey) {
    return res.status(503).json({
      success: false,
      error: 'RIOT_API_KEY non configurée sur le serveur',
    })
  }
  const cacheKey = getSoloqCacheKey(pseudo, region)
  const cached = playerStatsCache.get(cacheKey)
  if (cached && Date.now() - cached.at < SOLOQ_CACHE_TTL_MS) {
    return res.json({
      success: true,
      rank: cached.rank,
      topChampions: cached.topChampions,
      cached: true,
      cachedAt: new Date(cached.at).toISOString(),
    })
  }
  try {
    const platform = region || 'euw1'
    const { puuid } = await getPuuidAndSummonerId(pseudo, region, apiKey)
    let rank = null
    let result = { error: 'unknown', topChampions: [] }
    const rankPromise = getRankFromPuuid(platform, puuid, apiKey).then((r) => r).catch((e) => {
      if (String(e?.message || '').includes('403')) console.warn('League API 403 (rank ignoré, champions conservés)')
      return null
    })
    const championsPromise = fetchTopChampionsSoloq(pseudo, region, apiKey)
    const [rankRes, championsRes] = await Promise.all([rankPromise, championsPromise])
    rank = rankRes || null
    result = championsRes || result
    const topChampions = result.error ? [] : (result.topChampions || [])
    playerStatsCache.set(cacheKey, {
      rank: rank || null,
      topChampions,
      at: Date.now(),
    })
    res.json({
      success: true,
      rank: rank || null,
      topChampions: topChampions.length > 0 ? topChampions : null,
      cached: false,
    })
  } catch (err) {
    const detail = err.cause?.message || err.message
    console.error('Riot player-stats error:', detail)
    let msg = detail || 'Erreur API Riot'
    if (String(detail).includes('403')) {
      msg = `Riot 403 sur: ${detail}. Si le test au démarrage dit "clé valide", ton app Riot n'a peut-être pas accès à tous les endpoints (Account, Summoner, League, Match). Vérifie les permissions sur developer.riotgames.com.`
    } else if (String(detail).includes('ECONNABORTED') || String(detail).includes('timeout')) {
      msg = 'Riot API trop lente (timeout). Réessaie dans quelques secondes.'
    }
    res.status(400).json({
      success: false,
      error: msg,
    })
  }
})

/**
 * GET /api/riot/match-history?pseudo=GameName%23TagLine&start=0&limit=20
 * Récupère une plage de games ranked (start = offset, limit = nombre). Permet de charger au-delà de 100
 * (ex. start=100&limit=20 pour les games 101-120). Retourne { success, matches, hasMore }.
 */
const MATCH_HISTORY_LIMIT = 20
const MATCH_DETAIL_DELAY_MS = 150

app.get('/api/riot/match-history', async (req, res) => {
  const pseudo = (req.query.pseudo || '').trim()
  const start = Math.max(0, parseInt(req.query.start, 10) || 0)
  const limit = Math.min(Math.max(1, parseInt(req.query.limit, 10) || MATCH_HISTORY_LIMIT), 100)
  if (!pseudo) {
    return res.status(400).json({
      success: false,
      error: 'Paramètre pseudo requis (ex: ?pseudo=GameName%23TagLine)',
    })
  }
  const apiKey = (process.env.RIOT_API_KEY || '').trim().replace(/\r/g, '')
  if (!apiKey) {
    return res.status(503).json({
      success: false,
      error: 'RIOT_API_KEY non configurée',
    })
  }
  try {
    const sep = pseudo.includes('#') ? '#' : (pseudo.includes('/') ? '/' : null)
    const [gameName, tagLine] = sep ? pseudo.split(sep).map((s) => s.trim()) : [pseudo, null]
    if (!gameName || !tagLine) {
      return res.status(400).json({
        success: false,
        error: 'Pseudo au format GameName#TagLine ou GameName/TagLine requis',
      })
    }
    const accUrl = `https://europe.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}?api_key=${apiKey}`
    const accRes = await axios.get(accUrl, {
      timeout: 15000,
      validateStatus: () => true,
    })
    if (accRes.status !== 200) {
      return res.status(accRes.status === 404 ? 404 : 400).json({
        success: false,
        error: accRes.data?.status?.message || `Joueur introuvable (${accRes.status})`,
      })
    }
    const puuid = accRes.data?.puuid
    if (!puuid) {
      return res.status(400).json({ success: false, error: 'PUUID non trouvé' })
    }

    const idsUrl = `https://europe.api.riotgames.com/lol/match/v5/matches/by-puuid/${encodeURIComponent(puuid)}/ids?type=ranked&start=${start}&count=${limit}&startTime=${SEASON_16_START_SEC}&api_key=${apiKey}`
    const idsRes = await axios.get(idsUrl, {
      timeout: 15000,
      validateStatus: () => true,
    })
    if (idsRes.status !== 200) {
      return res.status(idsRes.status >= 500 ? 500 : 400).json({
        success: false,
        error: idsRes.data?.status?.message || `Erreur Match IDs (${idsRes.status})`,
      })
    }
    const matchIds = Array.isArray(idsRes.data) ? idsRes.data : []
    const hasMore = matchIds.length === limit

    const matches = []
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
    for (const matchId of matchIds) {
      await sleep(MATCH_DETAIL_DELAY_MS)
      try {
        const matchUrl = `https://europe.api.riotgames.com/lol/match/v5/matches/${encodeURIComponent(matchId)}?api_key=${apiKey}`
        const matchRes = await axios.get(matchUrl, {
          timeout: 15000,
          validateStatus: () => true,
        })
        if (matchRes.status !== 200 || !matchRes.data?.info) continue
        const info = matchRes.data.info
        const gameCreation = info.gameCreation ?? 0
        if (gameCreation < SEASON_16_START_MS) continue
        const participant = info.participants?.find((p) => p.puuid === puuid)
        if (!participant) continue
        matches.push({
          matchId,
          championId: participant.championId,
          championName: participant.championName || participant.championId,
          win: !!participant.win,
          kills: participant.kills ?? 0,
          deaths: participant.deaths ?? 0,
          assists: participant.assists ?? 0,
          gameDuration: info.gameDuration ?? 0,
          gameCreation,
        })
      } catch (e) {
        console.warn('match-history match fetch failed:', matchId, e.message)
      }
    }

    res.json({ success: true, matches, hasMore })
  } catch (err) {
    console.error('match-history error:', err.message)
    res.status(500).json({
      success: false,
      error: err.message || 'Erreur serveur',
    })
  }
})

/**
 * GET /health
 */
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Réponse vide pour Chrome DevTools (évite 404 dans la console)
app.get('/.well-known/appspecific/com.chrome.devtools.json', (req, res) => {
  res.status(204).end()
})

app.listen(PORT, async () => {
  const rawKey = process.env.RIOT_API_KEY || ''
  const apiKey = rawKey.trim().replace(/\r/g, '')
  if (rawKey !== apiKey) process.env.RIOT_API_KEY = apiKey
  const hasRiotKey = !!apiKey
  const envPath = fileURLToPath(new URL('.env', import.meta.url))
  console.log(`\n🚀 API (DPM + Riot): http://localhost:${PORT}`)
  console.log(`   RIOT_API_KEY: ${hasRiotKey ? '✓ chargée' : '✗ manquante'}`)
  if (!hasRiotKey) {
    console.log(`   → Fichier attendu: ${envPath}`)
    console.log(`   → Existe: ${existsSync(envPath) ? 'oui' : 'non'}`)
  } else {
    try {
      const r = await axios.get('https://euw1.api.riotgames.com/lol/status/v4/platform-data', {
        headers: { 'X-Riot-Token': apiKey },
        timeout: 10000,
        validateStatus: () => true,
      })
      if (r.status === 200) {
        console.log(`   Riot API: ✓ clé valide`)
      } else {
        console.log(`   Riot API: ✗ clé refusée (${r.status}) → régénère une clé sur developer.riotgames.com`)
      }
    } catch (_) {
      console.log(`   Riot API: ? test échoué (réseau?)`)
    }
  }
  console.log(`   GET /api/riot/sync-rank?pseudo=GameName%23TagLine  → sync rank (PUUID + league)`)
  console.log(`   GET /api/dpm?pseudo=...  → rank + champions (dpm.lol, peut 403)`)
  console.log(`   GET /api/riot/player-stats?pseudo=...&region=euw1  → rank + top 5 Solo Q (Riot)`)
  console.log(`   GET /api/riot/soloq-top-champions?pseudo=...&region=euw1  → top 5 Solo Q saison`)
  console.log(`   GET /api/riot/match-history?pseudo=...  → historique ranked Solo Q (cache mémoire)`)
  console.log(`   GET /api/riot/sync-rank-and-matches?pseudo=...  → rang + 20 dernières games (pour sauvegarde Supabase)`)
  console.log(`   GET /health\n`)
})
