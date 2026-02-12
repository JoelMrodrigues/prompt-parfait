/**
 * Backend : récupère les 5 champions les plus joués en Solo Q sur la saison (API Riot).
 * Une seule "requête" côté front = un appel à notre API qui fait N appels Riot avec throttle.
 * Limite Riot : 100 req / 2 min → on espace les requêtes (1,3 s) et on récupère jusqu'à ~90 matchs.
 */
import axios from 'axios'
import { getChampionNameById } from './championsIdToName.js'

const QUEUE_SOLO_RANKED = 420
const MATCH_IDS_PAGE_SIZE = 100
const MAX_MATCH_ID_PAGES = 1
const DELAY_BETWEEN_MATCH_REQUESTS_MS = 1300
const SEASON_START_EPOCH = Math.floor(new Date(Date.UTC(2025, 0, 7, 0, 0, 0)).getTime() / 1000)

const REGION_TO_CLUSTER = {
  euw1: 'europe', eun1: 'europe', tr1: 'europe', ru: 'europe',
  na1: 'americas', br1: 'americas', la1: 'americas', la2: 'americas',
  kr: 'asia', jp1: 'asia', oc1: 'asia',
}

function getCluster(region) {
  return REGION_TO_CLUSTER[(region || 'euw1').toLowerCase()] || 'europe'
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function riotFetch(url, apiKey) {
  try {
    const res = await axios.get(url, {
      headers: { 'X-Riot-Token': apiKey },
      timeout: 45000,
      validateStatus: () => true,
    })
    if (res.status === 429) {
      const retryAfter = parseInt(res.headers['retry-after'], 10) || 120
      await sleep(retryAfter * 1000)
      return riotFetch(url, apiKey)
    }
    if (res.status === 403) {
      console.error('Riot 403 URL:', url)
    }
    return { ok: res.status >= 200 && res.status < 300, status: res.status, data: res.data }
  } catch (err) {
    if (err.response?.status === 403) {
      console.error('Riot 403 URL:', err.config?.url)
    }
    const msg = err.response?.data?.status?.message || err.code || err.message || 'Riot API unreachable'
    throw new Error(msg)
  }
}

async function getPuuid(pseudo, region, apiKey) {
  const { puuid } = await getPuuidAndSummonerId(pseudo, region, apiKey)
  return puuid
}

/** Retourne { puuid, summonerId } pour league-v4 (rank) et match history (top champions). */
export async function getPuuidAndSummonerId(pseudo, region, apiKey) {
  const normalized = pseudo.replace(/\s*#\s*/, '#').trim()
  const cluster = getCluster(region)
  const platform = (region || 'euw1').toLowerCase()

  if (normalized.includes('#')) {
    const [gameName, tagLine] = normalized.split('#').map((s) => s.trim())
    if (!gameName || !tagLine) throw new Error('Riot ID invalide')
    const accUrl = `https://${cluster}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`
    const accRes = await riotFetch(accUrl, apiKey)
    if (!accRes.ok) throw new Error(`Account API ${accRes.status}`)
    const accData = accRes.data
    const puuid = accData.puuid
    const sumUrl = `https://${platform}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${encodeURIComponent(puuid)}`
    const sumRes = await riotFetch(sumUrl, apiKey)
    if (!sumRes.ok) throw new Error(`Summoner API ${sumRes.status}`)
    const sumData = sumRes.data
    return { puuid, summonerId: sumData.id }
  }

  const url = `https://${platform}.api.riotgames.com/lol/summoner/v4/summoners/by-name/${encodeURIComponent(normalized)}`
  const res = await riotFetch(url, apiKey)
  if (!res.ok) throw new Error(`Summoner API ${res.status}`)
  const data = res.data
  return { puuid: data.puuid, summonerId: data.id }
}

async function getMatchIdsForSeason(puuid, region, apiKey) {
  const cluster = getCluster(region)
  const allIds = []
  for (let start = 0; start < MAX_MATCH_ID_PAGES * MATCH_IDS_PAGE_SIZE; start += MATCH_IDS_PAGE_SIZE) {
    const params = new URLSearchParams({
      queue: String(QUEUE_SOLO_RANKED),
      count: String(MATCH_IDS_PAGE_SIZE),
      start: String(start),
      startTime: String(SEASON_START_EPOCH),
    })
    const url = `https://${cluster}.api.riotgames.com/lol/match/v5/matches/by-puuid/${encodeURIComponent(puuid)}/ids?${params}`
    const res = await riotFetch(url, apiKey)
    if (!res.ok) throw new Error(`Match IDs API ${res.status}`)
    const list = res.data
    const ids = Array.isArray(list) ? list : []
    allIds.push(...ids)
    if (ids.length < MATCH_IDS_PAGE_SIZE) break
  }
  return allIds
}

async function getMatchDetail(matchId, region, apiKey) {
  const cluster = getCluster(region)
  const url = `https://${cluster}.api.riotgames.com/lol/match/v5/matches/${matchId}`
  const res = await riotFetch(url, apiKey)
  if (!res.ok) {
    if (res.status === 404) return null
    throw new Error(`Match API ${res.status}`)
  }
  return res.data
}

async function getMatchDetails(matchIds, region, apiKey) {
  const details = []
  for (let i = 0; i < matchIds.length; i++) {
    if (i > 0) await sleep(DELAY_BETWEEN_MATCH_REQUESTS_MS)
    const m = await getMatchDetail(matchIds[i], region, apiKey)
    if (m) details.push(m)
  }
  return details
}

function aggregateTopChampions(matchDetails, puuid) {
  const byChampion = {}
  for (const match of matchDetails) {
    const participants = match.info?.participants || []
    const me = participants.find((p) => p.puuid === puuid)
    if (!me) continue
    const championId = me.championId
    const dbName = getChampionNameById(championId)
    const name = dbName.startsWith('Unknown_') ? (me.championName || dbName) : dbName
    const win = me.win === true
    const kills = me.kills ?? 0
    const deaths = me.deaths ?? 0
    const assists = me.assists ?? 0
    if (!byChampion[name]) {
      byChampion[name] = { name, games: 0, wins: 0, kills: 0, deaths: 0, assists: 0 }
    }
    const c = byChampion[name]
    c.games += 1
    if (win) c.wins += 1
    c.kills += kills
    c.deaths += deaths
    c.assists += assists
  }
  return Object.values(byChampion)
    .sort((a, b) => b.games - a.games)
    .slice(0, 5)
    .map((c) => {
      const winrate = c.games ? (c.wins / c.games) * 100 : 0
      const kda = c.deaths > 0 ? (c.kills + c.assists) / c.deaths : c.kills + c.assists
      return {
        name: c.name,
        games: c.games,
        wins: c.wins,
        winrate: Math.round(winrate * 10) / 10,
        kda: Math.round(kda * 10) / 10,
        kills: c.kills,
        deaths: c.deaths,
        assists: c.assists,
      }
    })
}

/**
 * Récupère le top 5 champions Solo Q de la saison pour un joueur.
 * À appeler côté serveur uniquement (clé API non exposée).
 */
export async function fetchTopChampionsSoloq(pseudo, region, apiKey) {
  if (!pseudo || !apiKey) return { topChampions: [], error: 'pseudo et apiKey requis' }
  try {
    const puuid = await getPuuid(pseudo, region, apiKey)
    if (!puuid) return { topChampions: [], error: 'puuid introuvable' }
    const matchIds = await getMatchIdsForSeason(puuid, region, apiKey)
    if (matchIds.length === 0) return { topChampions: [], error: 'Aucun match Solo Q sur la saison' }
    const matchDetails = await getMatchDetails(matchIds, region, apiKey)
    const topChampions = aggregateTopChampions(matchDetails, puuid)
    return { topChampions }
  } catch (err) {
    console.error('riotSoloqChampions:', err.message)
    return { topChampions: [], error: err.message || 'Erreur API Riot' }
  }
}
