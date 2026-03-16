/**
 * LCU Proxy Routes — bridges browser ↔ League of Legends Client API
 *
 * Le client LoL expose une API locale HTTPS avec cert auto-signé + sans CORS.
 * Ce proxy tourne sur notre serveur local (npm run dev:server) et contourne
 * ces deux limitations : Node.js accepte le cert, pas de CORS browser-to-LCU.
 *
 * ⚠️  Ces routes ne fonctionnent qu'en local (npm run dev).
 *     Le backend Railway ne peut PAS atteindre le localhost de l'utilisateur.
 */

import { Router, type Request, type Response } from 'express'
import axios from 'axios'
import https from 'https'

const router = Router()

/** Agent HTTPS qui ignore le certificat auto-signé du LCU */
const lcuAgent = new https.Agent({ rejectUnauthorized: false })

/** Parse le contenu brut du lockfile et retourne les credentials */
function parseLockfile(raw: string): { port: number; password: string } | null {
  // Format : LeagueClient:PID:PORT:PASSWORD:https
  const parts = raw.trim().split(':')
  if (parts.length < 5) return null
  const port = parseInt(parts[2], 10)
  const password = parts[3]
  if (!port || !password) return null
  return { port, password }
}

/** Crée un client axios configuré pour le LCU */
function lcuClient(port: number, password: string) {
  return axios.create({
    baseURL: `https://127.0.0.1:${port}`,
    auth: { username: 'riot', password },
    httpsAgent: lcuAgent,
    timeout: 8000,
  })
}

// ─── POST /api/lcu/connect ────────────────────────────────────────────────────
// Teste la connexion et retourne les infos du joueur connecté au client LoL

router.post('/connect', async (req: Request, res: Response) => {
  const { lockfile } = req.body
  if (!lockfile) return res.status(400).json({ success: false, error: 'lockfile requis' })

  const creds = parseLockfile(lockfile)
  if (!creds) return res.status(400).json({ success: false, error: 'Format lockfile invalide (attendu : LeagueClient:PID:PORT:PASSWORD:https)' })

  try {
    const client = lcuClient(creds.port, creds.password)
    const { data } = await client.get('/lol-summoner/v1/current-summoner')
    return res.json({
      success: true,
      port: creds.port,
      summoner: {
        displayName: data.displayName,
        summonerLevel: data.summonerLevel,
        profileIconId: data.profileIconId,
        puuid: data.puuid,
        summonerId: data.summonerId,
      },
    })
  } catch (err: any) {
    const status = err?.response?.status
    if (status === 404) return res.status(503).json({ success: false, error: 'League of Legends non démarré ou joueur non connecté' })
    return res.status(503).json({ success: false, error: `Impossible de joindre le client LoL — ${err.message}` })
  }
})

// ─── POST /api/lcu/matches ────────────────────────────────────────────────────
// Retourne les dernières custom games disponibles dans le client

router.post('/matches', async (req: Request, res: Response) => {
  const { port, password, puuid } = req.body
  if (!port || !password || !puuid) return res.status(400).json({ success: false, error: 'port, password et puuid requis' })

  try {
    const client = lcuClient(port, password)
    const { data } = await client.get(
      `/lol-match-history/v1/products/lol/${puuid}/matches?begIndex=0&endIndex=30`
    )

    const games = (data?.games?.games || []) as any[]
    const customGames = games.filter((g: any) => g.gameType === 'CUSTOM_GAME' || g.queueId === 0)

    return res.json({
      success: true,
      games: customGames.map((g: any) => ({
        gameId: g.gameId,
        gameCreation: g.gameCreation,
        gameDuration: g.gameDuration,
        gameMode: g.gameMode,
        participants: (g.participantIdentities || g.participants || []).map((p: any) => ({
          summonerName: p.player?.summonerName || p.summonerName || p.displayName || '?',
        })),
        // On stocke le JSON complet pour pouvoir l'importer ensuite
        _raw: g,
      })),
    })
  } catch (err: any) {
    return res.status(503).json({ success: false, error: `Erreur LCU — ${err.message}` })
  }
})

// ─── POST /api/lcu/game ───────────────────────────────────────────────────────
// Retourne le détail complet d'une game (10 participants) via gameId

router.post('/game', async (req: Request, res: Response) => {
  const { port, password, gameId } = req.body
  if (!port || !password || !gameId) return res.status(400).json({ success: false, error: 'port, password et gameId requis' })

  try {
    const client = lcuClient(port, password)
    const { data } = await client.get(`/lol-match-history/v1/games/${gameId}`)
    return res.json({ success: true, game: data })
  } catch (err: any) {
    return res.status(503).json({ success: false, error: `Erreur LCU game — ${err.message}` })
  }
})

export default router
