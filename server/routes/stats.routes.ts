/**
 * Routes /api/stats/*
 * Le backend télécharge et cache les CSV d'Oracle's Elixir.
 * Le frontend ne touche plus jamais Google Drive directement.
 */
import { Router, Request, Response } from 'express'
import {
  getRows,
  getAvailableYears,
  getCacheStatus,
  aggregateChampionStats,
  getMatchRows,
  getFilterOptions,
  getTeamNames,
  filterRows,
} from '../services/oraclesElixirService.js'

const router = Router()

// Années disponibles + statut du cache
router.get('/years', (_req: Request, res: Response) => {
  res.json({ years: getAvailableYears(), cache: getCacheStatus() })
})

// Options de filtre pour une année (leagues, patches, splits)
router.get('/filters', async (req: Request, res: Response) => {
  try {
    const { year = '2026' } = req.query
    const rows = await getRows(year as string)
    res.json(getFilterOptions(rows))
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message })
  }
})

// Stats agrégées par champion
router.get('/champions', async (req: Request, res: Response) => {
  try {
    const { year = '2026', role, league, side, split, leagues } = req.query
    const rows = await getRows(year as string)
    const leaguesArr = leagues ? (leagues as string).split(',').filter(Boolean) : []
    const filtered = filterRows(rows, {
      role: role as string,
      league: league as string,
      side: side as string,
      split: split as string,
      leagues: leaguesArr,
    })
    const stats = aggregateChampionStats(filtered)
    res.json(stats)
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message })
  }
})

// Toutes les lignes d'un champion spécifique (pour la page de détail champion)
router.get('/champion/:name', async (req: Request, res: Response) => {
  try {
    const { year = '2026', role, league, side, split, leagues } = req.query
    const { name } = req.params
    const rows = await getRows(year as string)
    const leaguesArr = leagues ? (leagues as string).split(',').filter(Boolean) : []
    const filtered = filterRows(rows, {
      role: role as string,
      league: league as string,
      side: side as string,
      split: split as string,
      leagues: leaguesArr,
    })
    const champRows = filtered.filter(
      (r) => String(r.champion).toLowerCase() === String(name).toLowerCase()
    )
    res.json(champRows)
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message })
  }
})

// Détail d'un match spécifique
router.get('/match/:gameid', async (req: Request, res: Response) => {
  try {
    const { year = '2026' } = req.query
    const { gameid } = req.params
    const rows = await getRows(year as string)
    const matchRows = getMatchRows(rows, gameid as string)
    if (!matchRows.length) return res.status(404).json({ error: 'Match non trouvé' })
    res.json(matchRows)
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message })
  }
})

// Noms d'équipes pour une liste de gameids (séparés par virgule)
router.get('/team-names', async (req: Request, res: Response) => {
  try {
    const { year = '2026', gameids } = req.query
    if (!gameids) return res.json({})
    const rows = await getRows(year as string)
    const ids = (gameids as string).split(',').filter(Boolean)
    res.json(getTeamNames(rows, ids))
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message })
  }
})

export default router
