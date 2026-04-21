/**
 * Client HTTP Riot API
 * - Auto-retry sur 429 (respect du retry-after)
 * - Log des 403 pour faciliter le debug
 * - Compteur de requêtes avec fenêtre glissante 60s
 * - Persistence des stats quotidiennes dans Supabase (toutes les 5 min)
 */
import axios from 'axios'
import { sleep } from '../utils/helpers.js'
import type { RiotResponse } from '../types/index.js'
import { getSupabaseAdmin } from './supabaseAdmin.js'

// ─── Métriques ────────────────────────────────────────────────────────────────

interface RequestRecord { ts: number; status: number }

const _records: RequestRecord[] = []
const _startedAt = Date.now()

function _record(status: number) {
  _records.push({ ts: Date.now(), status })
  // Garder seulement les 10 dernières minutes
  const cutoff = Date.now() - 10 * 60 * 1000
  while (_records.length && _records[0].ts < cutoff) _records.shift()
}

export function getRiotMetrics() {
  const now = Date.now()
  const last60s  = _records.filter(r => r.ts > now - 60_000)
  const last1min = _records.filter(r => r.ts > now - 60_000)
  const last5min = _records.filter(r => r.ts > now - 5 * 60_000)
  const last10min = _records.filter(r => r.ts > now - 10 * 60_000)
  return {
    total: _records.length,
    per_minute_now: last60s.length,
    per_minute_5m_avg: Math.round(last5min.length / 5),
    per_minute_10m_avg: Math.round(last10min.length / 10),
    rate_limited_total: _records.filter(r => r.status === 429).length,
    rate_limited_last5m: last5min.filter(r => r.status === 429).length,
    uptime_seconds: Math.round((now - _startedAt) / 1000),
    window: _records.slice(-60).map(r => ({ ts: r.ts, status: r.status })),
  }
}

// ─── Persistence Supabase (toutes les 5 min) ─────────────────────────────────

let _peakPerMinute = 0

async function _persistDailyStats() {
  const supabaseAdmin = getSupabaseAdmin()
  if (!supabaseAdmin) return
  const m = getRiotMetrics()
  const today = new Date().toISOString().slice(0, 10)
  if (m.per_minute_now > _peakPerMinute) _peakPerMinute = m.per_minute_now
  await supabaseAdmin.from('riot_daily_stats').upsert({
    date: today,
    total_requests: m.total,
    rate_limited_count: m.rate_limited_total,
    peak_per_minute: _peakPerMinute,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'date' })
}

setInterval(_persistDailyStats, 5 * 60 * 1000)

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
    _record(res.status)
    if (res.status === 429) {
      const retryAfter = parseInt(res.headers['retry-after'] as string, 10) || 120
      await sleep(retryAfter * 1000)
      return riotFetch<T>(url, apiKey)
    }
    if (res.status === 403) console.error('Riot 403 sur:', url)
    return { ok: res.status >= 200 && res.status < 300, status: res.status, data: res.data }
  } catch (err: unknown) {
    _record(0)
    const error = err as { response?: { status: number; data?: { status?: { message?: string } }; config?: { url?: string } }; code?: string; message?: string; config?: { url?: string } }
    if (error.response?.status === 403) console.error('Riot 403 sur:', error.config?.url)
    const msg = error.response?.data?.status?.message || error.code || error.message || 'Riot API unreachable'
    throw new Error(msg)
  }
}
