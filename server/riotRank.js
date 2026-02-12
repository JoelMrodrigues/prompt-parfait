/**
 * Récupère le rank Solo Q via l'API Riot league-v4.
 * Utilise l'endpoint by-puuid : GET /lol/league/v4/entries/by-puuid/{encryptedPUUID}
 * (cf. https://developer.riotgames.com/apis#league-v4/GET_getLeagueEntriesByPUUID)
 */
import axios from 'axios'

const QUEUE_SOLO = 'RANKED_SOLO_5x5'

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

function formatTier(tier) {
  if (!tier) return ''
  const t = tier.toLowerCase()
  return t.charAt(0).toUpperCase() + t.slice(1)
}

/**
 * Retourne le rank Solo Q formaté (ex: "Master 454 LP", "Diamond II 32 LP").
 * Utilise league-v4 entries by-puuid (pas by-summoner).
 * @param {string} platform - euw1, na1, kr, etc.
 * @param {string} puuid - PUUID du joueur (récupéré via account-v1 by-riot-id)
 * @param {string} apiKey - RIOT_API_KEY
 * @returns {Promise<string|null>}
 */
export async function getRankFromPuuid(platform, puuid, apiKey) {
  const p = (platform || 'euw1').toLowerCase()
  const url = `https://${p}.api.riotgames.com/lol/league/v4/entries/by-puuid/${encodeURIComponent(puuid)}`
  const res = await riotFetch(url, apiKey)
  if (!res.ok) {
    if (res.status === 404) return null
    throw new Error(`League API ${res.status}`)
  }
  const entries = res.data
  const solo = Array.isArray(entries) ? entries.find((e) => e.queueType === QUEUE_SOLO) : null
  if (!solo) return null
  const tier = formatTier(solo.tier)
  const lp = solo.leaguePoints ?? 0
  const rank = solo.rank || ''
  if (tier === 'Master' || tier === 'Grandmaster' || tier === 'Challenger') {
    return `${tier} ${lp} LP`
  }
  return rank ? `${tier} ${rank} ${lp} LP` : `${tier} ${lp} LP`
}

/** @deprecated Utiliser getRankFromPuuid. Conservé pour compatibilité. */
export async function getRankFromSummonerId(platform, summonerId, apiKey) {
  const p = (platform || 'euw1').toLowerCase()
  const url = `https://${p}.api.riotgames.com/lol/league/v4/entries/by-summoner/${encodeURIComponent(summonerId)}`
  const res = await riotFetch(url, apiKey)
  if (!res.ok) {
    if (res.status === 404) return null
    throw new Error(`League API ${res.status}`)
  }
  const entries = res.data
  const solo = Array.isArray(entries) ? entries.find((e) => e.queueType === QUEUE_SOLO) : null
  if (!solo) return null
  const tier = formatTier(solo.tier)
  const lp = solo.leaguePoints ?? 0
  const rank = solo.rank || ''
  if (tier === 'Master' || tier === 'Grandmaster' || tier === 'Challenger') {
    return `${tier} ${lp} LP`
  }
  return rank ? `${tier} ${rank} ${lp} LP` : `${tier} ${lp} LP`
}
