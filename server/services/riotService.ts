/**
 * Service Riot API
 * Regroupe toute la logique métier : PUUID, rank, matchs, top champions
 */
import { riotFetch, getCluster } from '../lib/riotClient.js'
import { getChampionNameById } from '../data/champions.js'
import { formatRank } from '../utils/formatters.js'
import { sleep } from '../utils/helpers.js'
import type {
  PuuidResult,
  Participant,
  MatchInfo,
  ParticipantData,
  ChampionAggregate,
  ChampionStats,
  RankEntry,
} from '../types/index.js'

export const SEASON_16_START_SEC = 1767830400
export const SEASON_16_START_MS = 1767830400000
export const QUEUE_SOLO_DUO = 420

// ─── PUUID ───────────────────────────────────────────────────────────────────

export async function getPuuidAndSummonerId(
  pseudo: string,
  region: string,
  apiKey: string,
): Promise<{ puuid: string; summonerId: string }> {
  const normalized = pseudo.replace(/\s*#\s*/, '#').trim()
  const cluster = getCluster(region)
  const platform = (region || 'euw1').toLowerCase()

  if (normalized.includes('#')) {
    const [gameName, tagLine] = normalized.split('#').map((s) => s.trim())
    if (!gameName || !tagLine) throw new Error('Riot ID invalide')
    const accRes = await riotFetch<{ puuid: string }>(
      `https://${cluster}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`,
      apiKey,
    )
    if (!accRes.ok) throw new Error(`Account API ${accRes.status}`)
    const { puuid } = accRes.data
    const sumRes = await riotFetch<{ id: string }>(
      `https://${platform}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${encodeURIComponent(puuid)}`,
      apiKey,
    )
    if (!sumRes.ok) throw new Error(`Summoner API ${sumRes.status}`)
    return { puuid, summonerId: sumRes.data.id }
  }

  const res = await riotFetch<{ puuid: string; id: string }>(
    `https://${platform}.api.riotgames.com/lol/summoner/v4/summoners/by-name/${encodeURIComponent(normalized)}`,
    apiKey,
  )
  if (!res.ok) throw new Error(`Summoner API ${res.status}`)
  return { puuid: res.data.puuid, summonerId: res.data.id }
}

export async function getPuuidByRiotId(
  gameName: string,
  tagLine: string,
  apiKey: string,
  region = 'euw1',
): Promise<PuuidResult> {
  const cluster = getCluster(region)
  const res = await riotFetch<{ puuid?: string; status?: { message?: string } }>(
    `https://${cluster}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`,
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

export async function getRankFromPuuid(
  platform: string,
  puuid: string,
  apiKey: string,
): Promise<string | null> {
  const res = await riotFetch<RankEntry[]>(
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

async function getMatchIdsForSeason(puuid: string, region: string, apiKey: string): Promise<string[]> {
  const cluster = getCluster(region)
  const allIds: string[] = []
  let start = 0
  while (true) {
    const params = new URLSearchParams({
      queue: String(QUEUE_SOLO_DUO),
      count: '100',
      start: String(start),
      startTime: String(SEASON_16_START_SEC),
    })
    const res = await riotFetch<string[]>(
      `https://${cluster}.api.riotgames.com/lol/match/v5/matches/by-puuid/${encodeURIComponent(puuid)}/ids?${params}`,
      apiKey,
    )
    if (!res.ok) throw new Error(`Match IDs API ${res.status}`)
    const ids = Array.isArray(res.data) ? res.data : []
    allIds.push(...ids)
    if (ids.length < 100) break
    start += 100
  }
  return allIds
}

function aggregateTopChampions(matchDetails: Array<{ info?: MatchInfo }>, puuid: string): ChampionStats[] {
  const byChampion: Record<string, ChampionAggregate> = {}
  for (const match of matchDetails) {
    const me = (match.info?.participants || []).find((p: Participant) => p.puuid === puuid)
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

export async function fetchTopChampionsSoloq(
  pseudo: string,
  region: string,
  apiKey: string,
): Promise<{ topChampions: ChampionStats[]; error?: string }> {
  if (!pseudo || !apiKey) return { topChampions: [], error: 'pseudo et apiKey requis' }
  try {
    const { puuid } = await getPuuidAndSummonerId(pseudo, region, apiKey)
    if (!puuid) return { topChampions: [], error: 'puuid introuvable' }
    const matchIds = await getMatchIdsForSeason(puuid, region, apiKey)
    if (matchIds.length === 0) return { topChampions: [], error: 'Aucun match Solo Q sur la saison' }
    const matchDetails: Array<{ info?: MatchInfo }> = []
    const cluster = getCluster(region)
    for (let i = 0; i < matchIds.length; i++) {
      if (i > 0) await sleep(1300)
      const res = await riotFetch<{ info?: MatchInfo }>(
        `https://${cluster}.api.riotgames.com/lol/match/v5/matches/${matchIds[i]}`,
        apiKey,
      )
      if (res.ok) matchDetails.push(res.data)
    }
    return { topChampions: aggregateTopChampions(matchDetails, puuid) }
  } catch (err: unknown) {
    console.error('fetchTopChampionsSoloq:', (err as Error).message)
    return { topChampions: [], error: (err as Error).message || 'Erreur API Riot' }
  }
}

// ─── HELPERS MATCHS ──────────────────────────────────────────────────────────

function extractParticipantData(info: MatchInfo, puuid: string): ParticipantData | null {
  const participant = info.participants?.find((p) => p.puuid === puuid)
  if (!participant) return null
  const myTeamId = participant.teamId
  const myPos = participant.teamPosition || participant.individualPosition || ''
  const opponent = info.participants?.find(
    (p) => p.teamId !== myTeamId && (p.teamPosition === myPos || p.individualPosition === myPos),
  )
  const items = [
    participant.item0 ?? 0,
    participant.item1 ?? 0,
    participant.item2 ?? 0,
    participant.item3 ?? 0,
    participant.item4 ?? 0,
    participant.item5 ?? 0,
    participant.item6 ?? 0,
  ]
  return {
    championId: participant.championId,
    championName: participant.championName || String(participant.championId),
    opponentChampionName: opponent ? opponent.championName || String(opponent.championId ?? '') : undefined,
    win: !!participant.win,
    kills: participant.kills ?? 0,
    deaths: participant.deaths ?? 0,
    assists: participant.assists ?? 0,
    gameDuration: info.gameDuration ?? 0,
    gameCreation: info.gameCreation ?? 0,
    totalDamage: participant.totalDamageDealtToChampions ?? undefined,
    cs: participant.totalMinionsKilled != null
      ? (participant.totalMinionsKilled ?? 0) + (participant.neutralMinionsKilled ?? 0)
      : undefined,
    visionScore: participant.visionScore ?? undefined,
    goldEarned: participant.goldEarned ?? undefined,
    items,
    runes: participant.perks ?? undefined,
    matchJson: participant,
  }
}

// ─── SYNC RANK + DERNIERS MATCHS ─────────────────────────────────────────────

export async function fetchRankAndMatches(
  puuid: string,
  platform: string,
  apiKey: string,
  limit = 20,
): Promise<{ rank: string | null; matches: Array<{ matchId: string } & ParticipantData>; totalMatchIds: number }> {
  const cluster = getCluster(platform)
  const [leagueRes, idsRes] = await Promise.all([
    riotFetch<RankEntry[]>(
      `https://${(platform || 'euw1').toLowerCase()}.api.riotgames.com/lol/league/v4/entries/by-puuid/${encodeURIComponent(puuid)}`,
      apiKey,
    ),
    riotFetch<string[]>(
      `https://${cluster}.api.riotgames.com/lol/match/v5/matches/by-puuid/${encodeURIComponent(puuid)}/ids?type=ranked&queue=${QUEUE_SOLO_DUO}&start=0&count=100&startTime=${SEASON_16_START_SEC}`,
      apiKey,
    ),
  ])

  let rank: string | null = null
  if (leagueRes.ok) {
    const solo = Array.isArray(leagueRes.data)
      ? leagueRes.data.find((e) => e.queueType === 'RANKED_SOLO_5x5')
      : null
    if (solo) rank = formatRank(solo.tier, solo.rank, solo.leaguePoints ?? 0)
  }

  const allIds = idsRes.ok && Array.isArray(idsRes.data) ? idsRes.data : []
  const matches: Array<{ matchId: string } & ParticipantData> = []

  for (const matchId of allIds.slice(0, limit)) {
    await sleep(150)
    try {
      const res = await riotFetch<{ info?: MatchInfo }>(
        `https://${cluster}.api.riotgames.com/lol/match/v5/matches/${encodeURIComponent(matchId)}`,
        apiKey,
      )
      if (!res.ok || !res.data?.info) continue
      const { info } = res.data
      if ((info.queueId ?? 0) !== QUEUE_SOLO_DUO || (info.gameCreation ?? 0) < SEASON_16_START_MS) continue
      const participant = extractParticipantData(info, puuid)
      if (!participant) continue
      matches.push({ matchId, ...participant })
    } catch (e: unknown) {
      console.warn('fetchRankAndMatches — match ignoré:', matchId, (e as Error).message)
    }
  }

  return { rank, matches, totalMatchIds: allIds.length }
}

// ─── LISTE D'IDS (sans détails, count max 100) ─────────────────────────────────

const MATCH_IDS_PAGE_MAX = 100

export async function fetchMatchIdsOnly(
  puuid: string,
  start: number,
  count: number,
  apiKey: string,
  region = 'euw1',
): Promise<{ matchIds: string[]; hasMore: boolean } | { error: string; status: number }> {
  const cluster = getCluster(region)
  const limit = Math.min(Math.max(1, count || 20), MATCH_IDS_PAGE_MAX)
  const res = await riotFetch<string[]>(
    `https://${cluster}.api.riotgames.com/lol/match/v5/matches/by-puuid/${encodeURIComponent(puuid)}/ids?type=ranked&queue=${QUEUE_SOLO_DUO}&start=${start}&count=${limit}&startTime=${SEASON_16_START_SEC}`,
    apiKey,
  )
  if (!res.ok) {
    return {
      error: (res.data as { status?: { message?: string } })?.status?.message || `Match IDs API (${res.status})`,
      status: res.status >= 500 ? 500 : 400,
    }
  }
  const matchIds = Array.isArray(res.data) ? res.data : []
  return { matchIds, hasMore: matchIds.length === limit }
}

// ─── DÉTAILS DE MATCHS PAR IDS (pour compléter les manquants) ─────────────────

export async function fetchMatchDetailsByIds(
  puuid: string,
  matchIds: string[],
  apiKey: string,
  region = 'euw1',
): Promise<Array<{ matchId: string } & ParticipantData>> {
  const cluster = getCluster(region)
  const matches: Array<{ matchId: string } & ParticipantData> = []
  for (const matchId of matchIds) {
    await sleep(120)
    try {
      const res = await riotFetch<{ info?: MatchInfo }>(
        `https://${cluster}.api.riotgames.com/lol/match/v5/matches/${encodeURIComponent(matchId)}`,
        apiKey,
      )
      if (!res.ok || !res.data?.info) continue
      const { info } = res.data
      if ((info.queueId ?? 0) !== QUEUE_SOLO_DUO || (info.gameCreation ?? 0) < SEASON_16_START_MS) continue
      const participant = extractParticipantData(info, puuid)
      if (!participant) continue
      matches.push({ matchId, ...participant })
    } catch (e: unknown) {
      console.warn('fetchMatchDetailsByIds — match ignoré:', matchId, (e as Error).message)
    }
  }
  return matches
}

// ─── HISTORIQUE MATCHS (paginé) ───────────────────────────────────────────────

export async function fetchMatchHistory(
  puuid: string,
  start: number,
  limit: number,
  apiKey: string,
  region = 'euw1',
): Promise<{ matches: Array<{ matchId: string } & ParticipantData>; hasMore: boolean } | { error: string; status: number }> {
  const cluster = getCluster(region)
  const idsRes = await riotFetch<string[]>(
    `https://${cluster}.api.riotgames.com/lol/match/v5/matches/by-puuid/${encodeURIComponent(puuid)}/ids?type=ranked&queue=${QUEUE_SOLO_DUO}&start=${start}&count=${limit}&startTime=${SEASON_16_START_SEC}`,
    apiKey,
  )
  if (!idsRes.ok) {
    return {
      error: (idsRes.data as { status?: { message?: string } })?.status?.message || `Erreur Match IDs (${idsRes.status})`,
      status: idsRes.status >= 500 ? 500 : 400,
    }
  }

  const matchIds = Array.isArray(idsRes.data) ? idsRes.data : []
  const matches: Array<{ matchId: string } & ParticipantData> = []

  for (const matchId of matchIds) {
    await sleep(150)
    try {
      const res = await riotFetch<{ info?: MatchInfo }>(
        `https://${cluster}.api.riotgames.com/lol/match/v5/matches/${encodeURIComponent(matchId)}`,
        apiKey,
      )
      if (!res.ok || !res.data?.info) continue
      const { info } = res.data
      if ((info.queueId ?? 0) !== QUEUE_SOLO_DUO || (info.gameCreation ?? 0) < SEASON_16_START_MS) continue
      const participant = extractParticipantData(info, puuid)
      if (!participant) continue
      matches.push({ matchId, ...participant })
    } catch (e: unknown) {
      console.warn('fetchMatchHistory — match ignoré:', matchId, (e as Error).message)
    }
  }

  return { matches, hasMore: matchIds.length === limit }
}

// ─── COMPTAGE MATCHS SAISON ───────────────────────────────────────────────────

export async function fetchMatchCount(
  puuid: string,
  apiKey: string,
  region = 'euw1',
): Promise<{ total: number; puuid?: string } | { error: string; status: number }> {
  const cluster = getCluster(region)
  const BATCH = 100
  let total = 0
  let start = 0

  while (true) {
    const res = await riotFetch<string[]>(
      `https://${cluster}.api.riotgames.com/lol/match/v5/matches/by-puuid/${encodeURIComponent(puuid)}/ids?type=ranked&queue=${QUEUE_SOLO_DUO}&start=${start}&count=${BATCH}&startTime=${SEASON_16_START_SEC}`,
      apiKey,
    )
    if (!res.ok) {
      return {
        error: (res.data as { status?: { message?: string } })?.status?.message || `Erreur Match IDs (${res.status})`,
        status: res.status >= 500 ? 500 : 400,
      }
    }
    const ids = Array.isArray(res.data) ? res.data : []
    total += ids.length
    if (ids.length < BATCH) break
    start += BATCH
  }

  return { total }
}

// ─── GAMES JOUÉES CETTE SEMAINE (ranked soloq) ────────────────────────────────

export async function fetchWeeklyMatchCount(
  puuid: string,
  apiKey: string,
  region = 'euw1',
): Promise<{ count: number } | { error: string; status: number }> {
  const cluster = getCluster(region)
  const startOfWeek = Math.floor((Date.now() - 7 * 24 * 3600 * 1000) / 1000)
  const res = await riotFetch<string[]>(
    `https://${cluster}.api.riotgames.com/lol/match/v5/matches/by-puuid/${encodeURIComponent(puuid)}/ids?type=ranked&queue=${QUEUE_SOLO_DUO}&startTime=${startOfWeek}&count=100`,
    apiKey,
  )
  if (!res.ok) {
    return {
      error: (res.data as { status?: { message?: string } })?.status?.message || `Erreur Match IDs (${res.status})`,
      status: res.status >= 500 ? 500 : 400,
    }
  }
  const ids = Array.isArray(res.data) ? res.data : []
  return { count: ids.length }
}
