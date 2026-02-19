import { Router } from 'express'
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
} from '../services/riotService.js'
import { riotFetch } from '../lib/riotClient.js'

const router = Router()

function getApiKey() {
  return (process.env.RIOT_API_KEY || '').trim().replace(/\r/g, '')
}

// Middleware : vérifie que la clé API est configurée
function requireApiKey(req, res, next) {
  if (!getApiKey()) return res.status(503).json({ success: false, error: 'RIOT_API_KEY non configurée' })
  next()
}

// Middleware : vérifie et expose req.pseudo
function requirePseudo(req, res, next) {
  const pseudo = (req.query.pseudo || '').trim()
  if (!pseudo) return res.status(400).json({ success: false, error: 'Paramètre pseudo requis' })
  req.pseudo = pseudo
  next()
}

// ─── TEST CLÉ ────────────────────────────────────────────────────────────────

router.get('/test-key', async (req, res) => {
  const apiKey = getApiKey()
  if (!apiKey) return res.status(503).json({ ok: false, error: 'RIOT_API_KEY non configurée' })
  try {
    const r = await axios.get(
      'https://europe.api.riotgames.com/riot/account/v1/accounts/by-riot-id/Riot/Examples',
      { headers: { 'X-Riot-Token': apiKey }, timeout: 10000, validateStatus: () => true },
    )
    if (r.status === 200) return res.json({ ok: true, message: 'Clé valide' })
    return res.json({ ok: false, error: r.data?.status?.message || `HTTP ${r.status}` })
  } catch (err) {
    return res.json({ ok: false, error: `${err.code || 'Erreur'}: ${err.message}` })
  }
})

// ─── TOP CHAMPIONS SOLO Q ────────────────────────────────────────────────────

router.get('/soloq-top-champions', requireApiKey, requirePseudo, async (req, res) => {
  const region = (req.query.region || 'euw1').trim()
  const cacheKey = cache.buildKey(req.pseudo, region)
  const cached = cache.get(cacheKey)
  if (cached) {
    return res.json({
      success: true,
      topChampions: cached.topChampions,
      cached: true,
      cachedAt: new Date(cached.at).toISOString(),
    })
  }

  const result = await fetchTopChampionsSoloq(req.pseudo, region, getApiKey())
  if (result.error) return res.status(400).json({ success: false, error: result.error })

  cache.set(cacheKey, { topChampions: result.topChampions })
  res.json({ success: true, topChampions: result.topChampions, cached: false })
})

// ─── SYNC RANK ───────────────────────────────────────────────────────────────

router.get('/sync-rank', requireApiKey, requirePseudo, async (req, res) => {
  const parsed = parsePseudo(req.pseudo)
  if (!parsed) {
    return res.status(400).json({
      success: false,
      error: 'Pseudo au format GameName#TagLine ou GameName/TagLine requis',
    })
  }

  try {
    const puuidResult = await getPuuidByRiotId(parsed.gameName, parsed.tagLine, getApiKey())
    if (puuidResult.error) return res.status(puuidResult.status).json({ success: false, error: puuidResult.error })

    const rank = await getRankFromPuuid('euw1', puuidResult.puuid, getApiKey())
    res.json({ success: true, rank })
  } catch (err) {
    const detail = err.response?.data?.status?.message || err.message
    let msg = detail || 'Erreur serveur'
    if (['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT'].includes(err.code)) {
      msg = `Impossible de joindre l'API Riot (${err.code}). Vérifie ta connexion, antivirus et firewall.`
    } else if (err.response?.status === 403) {
      msg = 'Riot 403 : clé invalide ou sans permission. Vérifie developer.riotgames.com.'
    }
    console.error('sync-rank error:', err.message)
    res.status(500).json({ success: false, error: msg })
  }
})

// ─── PLAYER STATS (rank + top 5 champions) ───────────────────────────────────

router.get('/player-stats', requireApiKey, requirePseudo, async (req, res) => {
  const region = (req.query.region || 'euw1').trim().toLowerCase()
  const cacheKey = cache.buildKey(req.pseudo, region)
  const cached = cache.get(cacheKey)
  if (cached) {
    return res.json({
      success: true,
      rank: cached.rank,
      topChampions: cached.topChampions,
      cached: true,
      cachedAt: new Date(cached.at).toISOString(),
    })
  }

  try {
    const { puuid } = await getPuuidAndSummonerId(req.pseudo, region, getApiKey())

    const [rankRes, championsRes] = await Promise.all([
      getRankFromPuuid(region, puuid, getApiKey()).catch((e) => {
        if (String(e?.message).includes('403')) console.warn('League API 403 — rank ignoré')
        return null
      }),
      fetchTopChampionsSoloq(req.pseudo, region, getApiKey()),
    ])

    const rank = rankRes || null
    const topChampions = championsRes.error ? [] : championsRes.topChampions || []

    cache.set(cacheKey, { rank, topChampions })
    res.json({ success: true, rank, topChampions: topChampions.length > 0 ? topChampions : null, cached: false })
  } catch (err) {
    const detail = err.cause?.message || err.message
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

router.get('/sync-rank-and-matches', requireApiKey, requirePseudo, async (req, res) => {
  const parsed = parsePseudo(req.pseudo)
  if (!parsed) {
    return res.status(400).json({
      success: false,
      error: 'Pseudo au format GameName#TagLine ou GameName/TagLine requis',
    })
  }

  try {
    const puuidResult = await getPuuidByRiotId(parsed.gameName, parsed.tagLine, getApiKey())
    if (puuidResult.error) return res.status(puuidResult.status).json({ success: false, error: puuidResult.error })

    const { rank, matches, totalMatchIds } = await fetchRankAndMatches(puuidResult.puuid, 'euw1', getApiKey(), 20)
    res.json({ success: true, rank, matches, totalMatchIds })
  } catch (err) {
    console.error('sync-rank-and-matches error:', err.message)
    res.status(500).json({ success: false, error: err.message || 'Erreur serveur' })
  }
})

// ─── HISTORIQUE MATCHS (paginé) ───────────────────────────────────────────────

router.get('/match-history', requireApiKey, requirePseudo, async (req, res) => {
  const parsed = parsePseudo(req.pseudo)
  if (!parsed) {
    return res.status(400).json({
      success: false,
      error: 'Pseudo au format GameName#TagLine ou GameName/TagLine requis',
    })
  }

  const start = Math.max(0, parseInt(req.query.start, 10) || 0)
  const limit = Math.min(Math.max(1, parseInt(req.query.limit, 10) || 20), 100)

  try {
    const puuidResult = await getPuuidByRiotId(parsed.gameName, parsed.tagLine, getApiKey())
    if (puuidResult.error) return res.status(puuidResult.status).json({ success: false, error: puuidResult.error })

    const result = await fetchMatchHistory(puuidResult.puuid, start, limit, getApiKey())
    if (result.error) return res.status(result.status || 500).json({ success: false, error: result.error })

    res.json({ success: true, matches: result.matches, hasMore: result.hasMore })
  } catch (err) {
    console.error('match-history error:', err.message)
    res.status(500).json({ success: false, error: err.message || 'Erreur serveur' })
  }
})

// ─── COMPTAGE MATCHS SAISON ───────────────────────────────────────────────────

router.get('/match-count', requireApiKey, requirePseudo, async (req, res) => {
  const parsed = parsePseudo(req.pseudo)
  if (!parsed) {
    return res.status(400).json({
      success: false,
      error: 'Pseudo au format GameName#TagLine requis',
    })
  }

  try {
    const puuidResult = await getPuuidByRiotId(parsed.gameName, parsed.tagLine, getApiKey())
    if (puuidResult.error) return res.status(puuidResult.status).json({ success: false, error: puuidResult.error })

    const result = await fetchMatchCount(puuidResult.puuid, getApiKey())
    if (result.error) return res.status(result.status || 500).json({ success: false, error: result.error })

    res.json({ success: true, total: result.total })
  } catch (err) {
    console.error('match-count error:', err.message)
    res.status(500).json({ success: false, error: err.message || 'Erreur serveur' })
  }
})

export default router
