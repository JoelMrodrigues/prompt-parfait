import { Router, Request, Response, NextFunction } from 'express'
import axios from 'axios'
import { cache } from '../services/cacheService.js'
import { parsePseudo } from '../utils/parsers.js'
import {
  getPuuidByRiotId,
  getPuuidAndSummonerId,
  getRankFromPuuid,
  fetchTopChampionsSoloq,
  fetchRankAndMatches,
  fetchMatchHistory,
  fetchMatchCount,
  fetchMatchIdsOnly,
  fetchMatchDetailsByIds,
  fetchWeeklyMatchCount,
} from '../services/riotService.js'
import { getCluster } from '../lib/riotClient.js'
import type { PuuidResult } from '../types/index.js'

const router = Router()

function getApiKey(): string {
  const isProd = process.env.NODE_ENV === 'production'
  const key = isProd
    ? (process.env.RIOT_API_KEY || '')
    : (process.env.RIOT_API_KEY_TEST || process.env.RIOT_API_KEY || '')
  return key.trim().replace(/\r/g, '')
}

// Middleware : vérifie que la clé API est configurée
function requireApiKey(_req: Request, res: Response, next: NextFunction): void {
  if (!getApiKey()) {
    res.status(503).json({ success: false, error: 'RIOT_API_KEY non configurée' })
    return
  }
  next()
}

// Middleware : vérifie et expose req.pseudo
function requirePseudo(req: Request, res: Response, next: NextFunction): void {
  const pseudo = (req.query.pseudo as string || '').trim()
  if (!pseudo) {
    res.status(400).json({ success: false, error: 'Paramètre pseudo requis' })
    return
  }
  req.pseudo = pseudo
  next()
}

/**
 * Résout le PUUID depuis le param ?puuid (cache) ou via lookup Riot.
 * Évite 2 appels API inutiles si le PUUID est déjà connu.
 */
async function resolvePuuid(pseudo: string, region: string, puuidOverride: string): Promise<PuuidResult> {
  if (puuidOverride) return { puuid: puuidOverride }
  const parsed = parsePseudo(pseudo)
  if (!parsed) return { error: 'Pseudo au format GameName#TagLine ou GameName/TagLine requis', status: 400 }
  return getPuuidByRiotId(parsed.gameName, parsed.tagLine, getApiKey(), region)
}

// ─── DIAGNOSTIC (pas d'appel Riot) ───────────────────────────────────────────

router.get('/status', (_req: Request, res: Response) => {
  const key = getApiKey()
  res.json({ ok: true, riotKeySet: !!key?.trim(), message: key ? 'RIOT_API_KEY présente' : 'RIOT_API_KEY absente — ajoute-la dans Railway Variables' })
})

// ─── TEST CLÉ (appel Riot pour valider) ───────────────────────────────────────

router.get('/test-key', async (_req: Request, res: Response) => {
  const apiKey = getApiKey()
  if (!apiKey) return res.status(503).json({ ok: false, error: 'RIOT_API_KEY non configurée' })
  try {
    const r = await axios.get(
      'https://europe.api.riotgames.com/riot/account/v1/accounts/by-riot-id/Riot/Examples',
      { headers: { 'X-Riot-Token': apiKey }, timeout: 10000, validateStatus: () => true },
    )
    if (r.status === 200) return res.json({ ok: true, message: 'Clé valide' })
    return res.json({ ok: false, error: r.data?.status?.message || `HTTP ${r.status}` })
  } catch (err: unknown) {
    return res.json({ ok: false, error: `${(err as NodeJS.ErrnoException).code || 'Erreur'}: ${(err as Error).message}` })
  }
})

// ─── TOP CHAMPIONS SOLO Q ────────────────────────────────────────────────────

router.get('/soloq-top-champions', requireApiKey, requirePseudo, async (req: Request, res: Response) => {
  const region = (req.query.region as string || 'euw1').trim().toLowerCase()
  const cacheKey = cache.buildKey(req.pseudo, region)
  const cached = cache.get(cacheKey)
  if (cached) {
    return res.json({
      success: true,
      topChampions: cached['topChampions'],
      cached: true,
      cachedAt: new Date(cached.at).toISOString(),
    })
  }

  const result = await fetchTopChampionsSoloq(req.pseudo!, region, getApiKey())
  if (result.error) return res.status(400).json({ success: false, error: result.error })

  cache.set(cacheKey, { topChampions: result.topChampions })
  res.json({ success: true, topChampions: result.topChampions, cached: false })
})

// ─── SYNC RANK ───────────────────────────────────────────────────────────────

router.get('/sync-rank', requireApiKey, requirePseudo, async (req: Request, res: Response) => {
  const region = (req.query.region as string || 'euw1').trim().toLowerCase()
  const puuidOverride = (req.query.puuid as string || '').trim()

  try {
    const resolved = await resolvePuuid(req.pseudo!, region, puuidOverride)
    if ('error' in resolved) return res.status(resolved.status).json({ success: false, error: resolved.error })

    const rank = await getRankFromPuuid(region, resolved.puuid, getApiKey())
    res.json({ success: true, rank, puuid: resolved.puuid })
  } catch (err: unknown) {
    const error = err as { response?: { data?: { status?: { message?: string } }; status?: number }; code?: string; message?: string }
    const detail = error.response?.data?.status?.message || error.message
    let msg = detail || 'Erreur serveur'
    if (['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT'].includes(error.code || '')) {
      msg = `Impossible de joindre l'API Riot (${error.code}). Vérifie ta connexion, antivirus et firewall.`
    } else if (error.response?.status === 403) {
      msg = 'Riot 403 : clé invalide ou sans permission. Vérifie developer.riotgames.com.'
    }
    console.error('sync-rank error:', error.message)
    res.status(500).json({ success: false, error: msg })
  }
})

// ─── PLAYER STATS (rank + top 5 champions) ───────────────────────────────────

router.get('/player-stats', requireApiKey, requirePseudo, async (req: Request, res: Response) => {
  const region = (req.query.region as string || 'euw1').trim().toLowerCase()
  const cacheKey = cache.buildKey(req.pseudo, region)
  const cached = cache.get(cacheKey)
  if (cached) {
    return res.json({
      success: true,
      rank: cached['rank'],
      topChampions: cached['topChampions'],
      cached: true,
      cachedAt: new Date(cached.at).toISOString(),
    })
  }

  try {
    const { puuid } = await getPuuidAndSummonerId(req.pseudo!, region, getApiKey())

    const [rankRes, championsRes] = await Promise.all([
      getRankFromPuuid(region, puuid, getApiKey()).catch((e: Error) => {
        if (String(e?.message).includes('403')) console.warn('League API 403 — rank ignoré')
        return null
      }),
      fetchTopChampionsSoloq(req.pseudo!, region, getApiKey()),
    ])

    const rank = rankRes || null
    const topChampions = championsRes.error ? [] : championsRes.topChampions || []

    cache.set(cacheKey, { rank, topChampions })
    res.json({ success: true, rank, topChampions: topChampions.length > 0 ? topChampions : null, cached: false })
  } catch (err: unknown) {
    const error = err as { cause?: { message?: string }; message?: string; response?: { status?: number } }
    const detail = error.cause?.message || error.message
    let msg = detail || 'Erreur API Riot'
    if (String(detail).includes('403')) {
      msg = `Riot 403. Vérifie les permissions de ton app sur developer.riotgames.com.`
    } else if (String(detail).includes('ECONNABORTED') || String(detail).includes('timeout')) {
      msg = 'Riot API trop lente (timeout). Réessaie dans quelques secondes.'
    }
    console.error('player-stats error:', detail)
    res.status(400).json({ success: false, error: msg })
  }
})

// ─── SYNC RANK + 20 DERNIERS MATCHS ──────────────────────────────────────────

router.get('/sync-rank-and-matches', requireApiKey, requirePseudo, async (req: Request, res: Response) => {
  const region = (req.query.region as string || 'euw1').trim().toLowerCase()
  const puuidOverride = (req.query.puuid as string || '').trim()

  try {
    const resolved = await resolvePuuid(req.pseudo!, region, puuidOverride)
    if ('error' in resolved) return res.status(resolved.status).json({ success: false, error: resolved.error })

    const { rank, matches, totalMatchIds } = await fetchRankAndMatches(resolved.puuid, region, getApiKey(), 20)
    res.json({ success: true, rank, matches, totalMatchIds, puuid: resolved.puuid })
  } catch (err: unknown) {
    console.error('sync-rank-and-matches error:', (err as Error).message)
    res.status(500).json({ success: false, error: (err as Error).message || 'Erreur serveur' })
  }
})

// ─── HISTORIQUE MATCHS (paginé) ───────────────────────────────────────────────

router.get('/match-history', requireApiKey, requirePseudo, async (req: Request, res: Response) => {
  const region = (req.query.region as string || 'euw1').trim().toLowerCase()
  const puuidOverride = (req.query.puuid as string || '').trim()
  const start = Math.max(0, parseInt(req.query.start as string, 10) || 0)
  const limit = Math.min(Math.max(1, parseInt(req.query.limit as string, 10) || 20), 100)

  try {
    const resolved = await resolvePuuid(req.pseudo!, region, puuidOverride)
    if ('error' in resolved) return res.status(resolved.status).json({ success: false, error: resolved.error })

    const result = await fetchMatchHistory(resolved.puuid, start, limit, getApiKey(), region)
    if ('error' in result) return res.status(result.status || 500).json({ success: false, error: result.error })

    res.json({ success: true, matches: result.matches, hasMore: result.hasMore, puuid: resolved.puuid })
  } catch (err: unknown) {
    console.error('match-history error:', (err as Error).message)
    res.status(500).json({ success: false, error: (err as Error).message || 'Erreur serveur' })
  }
})

// ─── LISTE D'IDS UNIQUEMENT (count max 100, peu de requêtes) ───────────────────

router.get('/match-ids', requireApiKey, requirePseudo, async (req: Request, res: Response) => {
  const region = (req.query.region as string || 'euw1').trim().toLowerCase()
  const puuidOverride = (req.query.puuid as string || '').trim()
  const start = Math.max(0, parseInt(req.query.start as string, 10) || 0)
  const count = Math.min(100, Math.max(1, parseInt(req.query.count as string, 10) || 100))

  try {
    const resolved = await resolvePuuid(req.pseudo!, region, puuidOverride)
    if ('error' in resolved) return res.status(resolved.status).json({ success: false, error: resolved.error })

    const result = await fetchMatchIdsOnly(resolved.puuid, start, count, getApiKey(), region)
    if ('error' in result) return res.status(result.status || 500).json({ success: false, error: result.error })

    res.json({ success: true, puuid: resolved.puuid, matchIds: result.matchIds, hasMore: result.hasMore })
  } catch (err: unknown) {
    console.error('match-ids error:', (err as Error).message)
    res.status(500).json({ success: false, error: (err as Error).message || 'Erreur serveur' })
  }
})

// ─── DÉTAILS DE MATCHS PAR IDS (pour les manquants uniquement) ─────────────────

router.get('/match-details', requireApiKey, requirePseudo, async (req: Request, res: Response) => {
  const region = (req.query.region as string || 'euw1').trim().toLowerCase()
  const puuidOverride = (req.query.puuid as string || '').trim()
  const matchIdsRaw = (req.query.matchIds as string || req.query.match_ids as string || '').trim()
  const matchIds = matchIdsRaw ? matchIdsRaw.split(/[\s,]+/).filter(Boolean) : []
  if (matchIds.length === 0) {
    return res.status(400).json({ success: false, error: 'Paramètre matchIds requis (ids séparés par des virgules)' })
  }
  // Validation format : XX_NNNNNNN (préfixe région + underscore + chiffres)
  const validMatchId = /^[A-Z]{2,4}_\d+$/
  if (matchIds.some((id) => !validMatchId.test(id))) {
    return res.status(400).json({ success: false, error: 'Format matchId invalide (attendu : EUW1_1234567890)' })
  }
  if (matchIds.length > 50) {
    return res.status(400).json({ success: false, error: 'Maximum 50 match IDs par requête' })
  }

  try {
    const resolved = await resolvePuuid(req.pseudo!, region, puuidOverride)
    if ('error' in resolved) return res.status(resolved.status).json({ success: false, error: resolved.error })

    const matches = await fetchMatchDetailsByIds(resolved.puuid, matchIds, getApiKey(), region)
    res.json({ success: true, matches, puuid: resolved.puuid })
  } catch (err: unknown) {
    console.error('match-details error:', (err as Error).message)
    res.status(500).json({ success: false, error: (err as Error).message || 'Erreur serveur' })
  }
})

// ─── COMPTAGE MATCHS SAISON ───────────────────────────────────────────────────

router.get('/match-count', requireApiKey, requirePseudo, async (req: Request, res: Response) => {
  const region = (req.query.region as string || 'euw1').trim().toLowerCase()
  const puuidOverride = (req.query.puuid as string || '').trim()

  try {
    const resolved = await resolvePuuid(req.pseudo!, region, puuidOverride)
    if ('error' in resolved) return res.status(resolved.status).json({ success: false, error: resolved.error })

    const result = await fetchMatchCount(resolved.puuid, getApiKey(), region)
    if ('error' in result) return res.status(result.status || 500).json({ success: false, error: result.error })

    res.json({ success: true, total: result.total, puuid: resolved.puuid })
  } catch (err: unknown) {
    console.error('match-count error:', (err as Error).message)
    res.status(500).json({ success: false, error: (err as Error).message || 'Erreur serveur' })
  }
})

// ─── ROUTING (utilise REGION_TO_CLUSTER centralisé dans riotClient.ts) ──────
function getRouting(region: string): string {
  return getCluster((region || 'euw1').trim())
}

// ─── DÉTAIL COMPLET D'UN MATCH ────────────────────────────────────────────────

router.get('/match-detail', requireApiKey, async (req: Request, res: Response) => {
  const matchId = (req.query.matchId as string || '').trim()
  if (!matchId || !/^[A-Z]{2,4}_\d+$/.test(matchId)) {
    return res.status(400).json({ success: false, error: 'Paramètre matchId requis (format : EUW1_1234567890)' })
  }

  const cacheKey = `match-detail:${matchId}`
  const cached = cache.get(cacheKey)
  if (cached) return res.json({ success: true, info: cached['info'], cached: true })

  const routing = getRouting(req.query.region as string || 'euw1')

  try {
    const { data } = await axios.get(
      `https://${routing}.api.riotgames.com/lol/match/v5/matches/${matchId}`,
      { headers: { 'X-Riot-Token': getApiKey() }, timeout: 15000 },
    )
    const info = data?.info ?? null
    cache.set(cacheKey, { info })
    res.json({ success: true, info, cached: false })
  } catch (err: unknown) {
    const e = err as { response?: { status?: number; data?: { status?: { message?: string } } }; message?: string }
    const status = e.response?.status ?? 500
    const msg = e.response?.data?.status?.message ?? e.message ?? 'Erreur serveur'
    console.error('match-detail error:', msg)
    res.status(status).json({ success: false, error: msg })
  }
})

// ─── TIMELINE D'UN MATCH (gold diff, CS, events par minute) ─────────────────

router.get('/match-timeline', requireApiKey, async (req: Request, res: Response) => {
  const matchId = (req.query.matchId as string || '').trim()
  if (!matchId || !/^[A-Z]{2,4}_\d+$/.test(matchId)) {
    return res.status(400).json({ success: false, error: 'Paramètre matchId requis (format : EUW1_1234567890)' })
  }

  const cacheKey = `timeline:${matchId}`
  const cached = cache.get(cacheKey)
  if (cached) return res.json({ success: true, timeline: cached['timeline'], cached: true })

  const routing = getRouting(req.query.region as string || 'euw1')

  try {
    const { data } = await axios.get(
      `https://${routing}.api.riotgames.com/lol/match/v5/matches/${matchId}/timeline`,
      { headers: { 'X-Riot-Token': getApiKey() }, timeout: 10000 },
    )
    cache.set(cacheKey, { timeline: data })
    res.json({ success: true, timeline: data, cached: false })
  } catch (err: unknown) {
    const e = err as { response?: { status?: number; data?: { status?: { message?: string } } }; message?: string }
    const status = e.response?.status ?? 500
    const msg = e.response?.data?.status?.message ?? e.message ?? 'Erreur serveur'
    console.error('match-timeline error:', msg)
    res.status(status).json({ success: false, error: msg })
  }
})

// ─── GAMES SEMAINE (soloq ranked, 7 derniers jours) ─────────────────────────

router.get('/weekly-games', requireApiKey, requirePseudo, async (req: Request, res: Response) => {
  const region = (req.query.region as string || 'euw1').trim().toLowerCase()
  const puuidOverride = (req.query.puuid as string || '').trim()

  try {
    const resolved = await resolvePuuid(req.pseudo!, region, puuidOverride)
    if ('error' in resolved) return res.status(resolved.status).json({ success: false, error: resolved.error })

    const result = await fetchWeeklyMatchCount(resolved.puuid, getApiKey(), region)
    if ('error' in result) return res.status(result.status || 500).json({ success: false, error: result.error })

    res.json({ success: true, count: result.count, puuid: resolved.puuid })
  } catch (err: unknown) {
    console.error('weekly-games error:', (err as Error).message)
    res.status(500).json({ success: false, error: (err as Error).message || 'Erreur serveur' })
  }
})

export default router
