/**
 * Client HTTP Riot API
 * - Auto-retry sur 429 (respect du retry-after)
 * - Log des 403 pour faciliter le debug
 */
import axios from 'axios'
import { sleep } from '../utils/helpers.js'
import type { RiotResponse } from '../types/index.js'

export const REGION_TO_CLUSTER: Record<string, string> = {
  euw1: 'europe', eun1: 'europe', tr1: 'europe', ru: 'europe',
  na1: 'americas', br1: 'americas', la1: 'americas', la2: 'americas',
  kr: 'asia', jp1: 'asia', oc1: 'sea',
}

export function getCluster(region: string): string {
  return REGION_TO_CLUSTER[(region || 'euw1').toLowerCase()] || 'europe'
}

export async function riotFetch<T = unknown>(url: string, apiKey: string): Promise<RiotResponse<T>> {
  try {
    const res = await axios.get<T>(url, {
      headers: { 'X-Riot-Token': apiKey },
      timeout: 45000,
      validateStatus: () => true,
    })
    if (res.status === 429) {
      const retryAfter = parseInt(res.headers['retry-after'] as string, 10) || 120
      await sleep(retryAfter * 1000)
      return riotFetch<T>(url, apiKey)
    }
    if (res.status === 403) console.error('Riot 403 sur:', url)
    return { ok: res.status >= 200 && res.status < 300, status: res.status, data: res.data }
  } catch (err: unknown) {
    const error = err as { response?: { status: number; data?: { status?: { message?: string } }; config?: { url?: string } }; code?: string; message?: string; config?: { url?: string } }
    if (error.response?.status === 403) console.error('Riot 403 sur:', error.config?.url)
    const msg = error.response?.data?.status?.message || error.code || error.message || 'Riot API unreachable'
    throw new Error(msg)
  }
}
