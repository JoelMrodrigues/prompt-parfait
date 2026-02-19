/**
 * Service Riot API
 * Regroupe toute la logique métier : PUUID, rank, matchs, top champions
 */
import { riotFetch, getCluster } from '../lib/riotClient.js'
import { getChampionNameById } from '../data/champions.js'
import { formatRank } from '../utils/formatters.js'
import { sleep } from '../utils/helpers.js'

export const SEASON_16_START_SEC = 1767830400
export const SEASON_16_START_MS = 1767830400000
export const QUEUE_SOLO_DUO = 420

// ─── PUUID ───────────────────────────────────────────────────────────────────

export async function getPuuidAndSummonerId(pseudo, region, apiKey) {
  const normalized = pseudo.replace(/\s*#\s*/, '#').trim()
  const cluster = getCluster(region)
  const platform = (region || 'euw1').toLowerCase()

  if (normalized.includes('#')) {
    const [gameName, tagLine] = normalized.split('#').map((s) => s.trim())
    if (!gameName || !tagLine) throw new Error('Riot ID invalide')
    const accRes = await riotFetch(
      `https://${cluster}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`,
      apiKey,
    )
    if (!accRes.ok) throw new Error(`Account API ${accRes.status}`)
    const { puuid } = accRes.data
    const sumRes = await riotFetch(
      `https://${platform}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${encodeURIComponent(puuid)}`,
      apiKey,
    )
    if (!sumRes.ok) throw new Error(`Summoner API ${sumRes.status}`)
    return { puuid, summonerId: sumRes.data.id }
  }

  const res = await riotFetch(
    `https://${platform}.api.riotgames.com/lol/summoner/v4/summoners/by-name/${encodeURIComponent(normalized)}`,
    apiKey,
  )
  if (!res.ok) throw new Error(`Summoner API ${res.status}`)
  return { puuid: res.data.puuid, summonerId: res.data.id }
}

export async function getPuuidByRiotId(gameName, tagLine, apiKey) {
  const res = await riotFetch(
    `https://europe.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`,
    apiKey,
  )
  if (!res.ok) {
    return {
      error: res.data?.status?.message || `Joueur introuvable (${res.status})`,
      status: res.status === 404 ? 404 : 400,
    }
  }
  const puuid = res.data?.puuid
  if (!puuid) return { error: 'PUUID non trouvé', status: 400 }
  return { puuid }
}

// ─── RANK ────────────────────────────────────────────────────────────────────

export async function getRankFromPuuid(platform, puuid, apiKey) {
  const res = await riotFetch(
    `https://${(platform || 'euw1').toLowerCase()}.api.riotgames.com/lol/league/v4/entries/by-puuid/${encodeURIComponent(puuid)}`,
    apiKey,
  )
  if (!res.ok) {
    if (res.status === 404) return null
    throw new Error(`League API ${res.status}`)
  }
  const solo = Array.isArray(res.data) ? res.data.find((e) => e.queueType === 'RANKED_SOLO_5x5') : null
  if (!solo) return null
  return formatRank(solo.tier, solo.rank, solo.leaguePoints ?? 0)
}

// ─── TOP CHAMPIONS SOLO Q ────────────────────────────────────────────────────

async function getMatchIdsForSeason(puuid, region, apiKey) {
  const cluster = getCluster(region)
  const allIds = []
  for (let start = 0; start < 100; start += 100) {
    const params = new URLSearchParams({
      queue: String(QUEUE_SOLO_DUO),
      count: '100',
      start: String(start),
      start_time: String(SEASON_16_START_SEC),
    })
    const res = await riotFetch(
      `https://${cluster}.api.riotgames.com/lol/match/v5/matches/by-puuid/${encodeURIComponent(puuid)}/ids?${params}`,
      apiKey,
    )
    if (!res.ok) throw new Error(`Match IDs API ${res.status}`)
    const ids = Array.isArray(res.data) ? res.data : []
    allIds.push(...ids)
    if (ids.length < 100) break
  }
  return allIds
}

function aggregateTopChampions(matchDetails, puuid) {
  const byChampion = {}
  for (const match of matchDetails) {
    const me = (match.info?.participants || []).find((p) => p.puuid === puuid)
    if (!me) continue
    const dbName = getChampionNameById(me.championId)
    const name = dbName.startsWith('Unknown_') ? me.championName || dbName : dbName
    if (!byChampion[name]) byChampion[name] = { name, games: 0, wins: 0, kills: 0, deaths: 0, assists: 0 }
    const c = byChampion[name]
    c.games++
    if (me.win) c.wins++
    c.kills += me.kills ?? 0
    c.deaths += me.deaths ?? 0
    c.assists += me.assists ?? 0
  }
  return Object.values(byChampion)
    .sort((a, b) => b.games - a.games)
    .slice(0, 5)
    .map((c) => ({
      name: c.name,
      games: c.games,
      wins: c.wins,
      winrate: Math.round((c.games ? (c.wins / c.games) * 100 : 0) * 10) / 10,
      kda: Math.round((c.deaths > 0 ? (c.kills + c.assists) / c.deaths : c.kills + c.assists) * 10) / 10,
      kills: c.kills,
      deaths: c.deaths,
      assists: c.assists,
    }))
}

export async function fetchTopChampionsSoloq(pseudo, region, apiKey) {
  if (!pseudo || !apiKey) return { topChampions: [], error: 'pseudo et apiKey requis' }
  try {
    const { puuid } = await getPuuidAndSummonerId(pseudo, region, apiKey)
    if (!puuid) return { topChampions: [], error: 'puuid introuvable' }
    const matchIds = await getMatchIdsForSeason(puuid, region, apiKey)
    if (matchIds.length === 0) return { topChampions: [], error: 'Aucun match Solo Q sur la saison' }
    const matchDetails = []
    for (let i = 0; i < matchIds.length; i++) {
      if (i > 0) await sleep(1300)
      const res = await riotFetch(
        `https://${getCluster(region)}.api.riotgames.com/lol/match/v5/matches/${matchIds[i]}`,
        apiKey,
      )
      if (res.ok) matchDetails.push(res.data)
    }
    return { topChampions: aggregateTopChampions(matchDetails, puuid) }
  } catch (err) {
    console.error('fetchTopChampionsSoloq:', err.message)
    return { topChampions: [], error: err.message || 'Erreur API Riot' }
  }
}

// ─── HELPERS MATCHS ──────────────────────────────────────────────────────────

function extractParticipantData(info, puuid) {
  const participant = info.participants?.find((p) => p.puuid === puuid)
  if (!participant) return null
  const myTeamId = participant.teamId
  const myPos = participant.teamPosition || participant.individualPosition || ''
  const opponent = info.participants?.find(
    (p) => p.teamId !== myTeamId && (p.teamPosition === myPos || p.individualPosition === myPos),
  )
  return {
    championId: participant.championId,
    championName: participant.championName || participant.championId,
    opponentChampionName: opponent ? opponent.championName || String(opponent.championId ?? '') : undefined,
    win: !!participant.win,
    kills: participant.kills ?? 0,
    deaths: participant.deaths ?? 0,
    assists: participant.assists ?? 0,
    gameDuration: info.gameDuration ?? 0,
    gameCreation: info.gameCreation ?? 0,
  }
}

// ─── SYNC RANK + DERNIERS MATCHS ─────────────────────────────────────────────

export async function fetchRankAndMatches(puuid, platform, apiKey, limit = 20) {
  const [leagueRes, idsRes] = await Promise.all([
    riotFetch(
      `https://${platform}.api.riotgames.com/lol/league/v4/entries/by-puuid/${encodeURIComponent(puuid)}`,
      apiKey,
    ),
    riotFetch(
      `https://europe.api.riotgames.com/lol/match/v5/matches/by-puuid/${encodeURIComponent(puuid)}/ids?type=ranked&queue=${QUEUE_SOLO_DUO}&start=0&count=100&start_time=${SEASON_16_START_SEC}`,
      apiKey,
    ),
  ])

  let rank = null
  if (leagueRes.ok) {
    const solo = Array.isArray(leagueRes.data)
      ? leagueRes.data.find((e) => e.queueType === 'RANKED_SOLO_5x5')
      : null
    if (solo) rank = formatRank(solo.tier, solo.rank, solo.leaguePoints ?? 0)
  }

  const allIds = idsRes.ok && Array.isArray(idsRes.data) ? idsRes.data : []
  const matches = []

  for (const matchId of allIds.slice(0, limit)) {
    await sleep(150)
    try {
      const res = await riotFetch(
        `https://europe.api.riotgames.com/lol/match/v5/matches/${encodeURIComponent(matchId)}`,
        apiKey,
      )
      if (!res.ok || !res.data?.info) continue
      const { info } = res.data
      if ((info.queueId ?? 0) !== QUEUE_SOLO_DUO || (info.gameCreation ?? 0) < SEASON_16_START_MS) continue
      const participant = extractParticipantData(info, puuid)
      if (!participant) continue
      matches.push({ matchId, ...participant })
    } catch (e) {
      console.warn('fetchRankAndMatches — match ignoré:', matchId, e.message)
    }
  }

  return { rank, matches, totalMatchIds: allIds.length }
}

// ─── HISTORIQUE MATCHS (paginé) ───────────────────────────────────────────────

export async function fetchMatchHistory(puuid, start, limit, apiKey) {
  const idsRes = await riotFetch(
    `https://europe.api.riotgames.com/lol/match/v5/matches/by-puuid/${encodeURIComponent(puuid)}/ids?type=ranked&queue=${QUEUE_SOLO_DUO}&start=${start}&count=${limit}&start_time=${SEASON_16_START_SEC}`,
    apiKey,
  )
  if (!idsRes.ok) {
    return {
      error: idsRes.data?.status?.message || `Erreur Match IDs (${idsRes.status})`,
      status: idsRes.status >= 500 ? 500 : 400,
    }
  }

  const matchIds = Array.isArray(idsRes.data) ? idsRes.data : []
  const matches = []

  for (const matchId of matchIds) {
    await sleep(150)
    try {
      const res = await riotFetch(
        `https://europe.api.riotgames.com/lol/match/v5/matches/${encodeURIComponent(matchId)}`,
        apiKey,
      )
      if (!res.ok || !res.data?.info) continue
      const { info } = res.data
      if ((info.queueId ?? 0) !== QUEUE_SOLO_DUO || (info.gameCreation ?? 0) < SEASON_16_START_MS) continue
      const participant = extractParticipantData(info, puuid)
      if (!participant) continue
      matches.push({ matchId, ...participant })
    } catch (e) {
      console.warn('fetchMatchHistory — match ignoré:', matchId, e.message)
    }
  }

  return { matches, hasMore: matchIds.length === limit }
}

// ─── COMPTAGE MATCHS SAISON ───────────────────────────────────────────────────

export async function fetchMatchCount(puuid, apiKey) {
  const BATCH = 100
  const allIds = []
  let start = 0

  while (true) {
    const res = await riotFetch(
      `https://europe.api.riotgames.com/lol/match/v5/matches/by-puuid/${encodeURIComponent(puuid)}/ids?type=ranked&queue=${QUEUE_SOLO_DUO}&start=${start}&count=${BATCH}&start_time=${SEASON_16_START_SEC}`,
      apiKey,
    )
    if (!res.ok) {
      return {
        error: res.data?.status?.message || `Erreur Match IDs (${res.status})`,
        status: res.status >= 500 ? 500 : 400,
      }
    }
    const ids = Array.isArray(res.data) ? res.data : []
    allIds.push(...ids)
    if (ids.length < BATCH) break
    start += BATCH
  }

  if (allIds.length === 0) return { total: 0 }

  const isValidS16 = (gc, qId) => gc >= SEASON_16_START_MS && qId === QUEUE_SOLO_DUO

  const fetchMatchInfo = async (matchId) => {
    try {
      const r = await riotFetch(
        `https://europe.api.riotgames.com/lol/match/v5/matches/${matchId}`,
        apiKey,
      )
      if (!r.ok || !r.data?.info) return { gameCreation: 0, queueId: 0 }
      return { gameCreation: r.data.info.gameCreation ?? 0, queueId: r.data.info.queueId ?? 0 }
    } catch (_) {
      return { gameCreation: 0, queueId: 0 }
    }
  }

  // Recherche binaire de la frontière S16 / pré-S16
  const sampleStep = Math.max(1, Math.floor(allIds.length / 15))
  let firstInvalid = allIds.length

  for (let i = 0; i < allIds.length; i += sampleStep) {
    await sleep(130)
    const { gameCreation, queueId } = await fetchMatchInfo(allIds[i])
    if (gameCreation > 0 && !isValidS16(gameCreation, queueId)) {
      firstInvalid = i
      break
    }
  }

  if (firstInvalid < allIds.length) {
    let lo = firstInvalid > sampleStep ? firstInvalid - sampleStep : 0
    let hi = firstInvalid
    while (lo < hi) {
      const mid = Math.floor((lo + hi) / 2)
      await sleep(130)
      const { gameCreation, queueId } = await fetchMatchInfo(allIds[mid])
      if (isValidS16(gameCreation, queueId)) lo = mid + 1
      else hi = mid
    }
    return { total: lo }
  }

  return { total: allIds.length }
}

// ─── GAMES JOUÉES CETTE SEMAINE (ranked soloq) ────────────────────────────────

export async function fetchWeeklyMatchCount(puuid, apiKey) {
  const startOfWeek = Math.floor((Date.now() - 7 * 24 * 3600 * 1000) / 1000)
  const res = await riotFetch(
    `https://europe.api.riotgames.com/lol/match/v5/matches/by-puuid/${encodeURIComponent(puuid)}/ids?type=ranked&queue=${QUEUE_SOLO_DUO}&start_time=${startOfWeek}&count=100`,
    apiKey,
  )
  if (!res.ok) {
    return {
      error: res.data?.status?.message || `Erreur Match IDs (${res.status})`,
      status: res.status >= 500 ? 500 : 400,
    }
  }
  const ids = Array.isArray(res.data) ? res.data : []
  return { count: ids.length }
}
