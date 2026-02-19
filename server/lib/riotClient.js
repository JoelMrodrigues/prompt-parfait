/**
 * Client HTTP Riot API
 * - Auto-retry sur 429 (respect du retry-after)
 * - Log des 403 pour faciliter le debug
 */
import axios from 'axios'
import { sleep } from '../utils/helpers.js'

export const REGION_TO_CLUSTER = {
  euw1: 'europe', eun1: 'europe', tr1: 'europe', ru: 'europe',
  na1: 'americas', br1: 'americas', la1: 'americas', la2: 'americas',
  kr: 'asia', jp1: 'asia', oc1: 'asia',
}

export function getCluster(region) {
  return REGION_TO_CLUSTER[(region || 'euw1').toLowerCase()] || 'europe'
}

export async function riotFetch(url, apiKey) {
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
    if (res.status === 403) console.error('Riot 403 sur:', url)
    return { ok: res.status >= 200 && res.status < 300, status: res.status, data: res.data }
  } catch (err) {
    if (err.response?.status === 403) console.error('Riot 403 sur:', err.config?.url)
    const msg = err.response?.data?.status?.message || err.code || err.message || 'Riot API unreachable'
    throw new Error(msg)
  }
}
