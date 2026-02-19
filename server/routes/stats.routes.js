/**
 * Routes /api/stats/*
 * Le backend télécharge et cache les CSV d'Oracle's Elixir.
 * Le frontend ne touche plus jamais Google Drive directement.
 */

import { Router } from 'express'
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
router.get('/years', (req, res) => {
  res.json({ years: getAvailableYears(), cache: getCacheStatus() })
})

// Options de filtre pour une année (leagues, patches, splits)
router.get('/filters', async (req, res) => {
  try {
    const { year = '2026' } = req.query
    const rows = await getRows(year)
    res.json(getFilterOptions(rows))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Stats agrégées par champion
router.get('/champions', async (req, res) => {
  try {
    const { year = '2026', role, league, side, split, leagues } = req.query
    const rows = await getRows(year)
    const leaguesArr = leagues ? leagues.split(',').filter(Boolean) : []
    const filtered = filterRows(rows, { role, league, side, split, leagues: leaguesArr })
    const stats = aggregateChampionStats(filtered)
    res.json(stats)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Toutes les lignes d'un champion spécifique (pour la page de détail champion)
router.get('/champion/:name', async (req, res) => {
  try {
    const { year = '2026', role, league, side, split, leagues } = req.query
    const { name } = req.params
    const rows = await getRows(year)
    const leaguesArr = leagues ? leagues.split(',').filter(Boolean) : []
    const filtered = filterRows(rows, { role, league, side, split, leagues: leaguesArr })
    const champRows = filtered.filter(
      (r) => r.champion?.toLowerCase() === name.toLowerCase()
    )
    res.json(champRows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Détail d'un match spécifique
router.get('/match/:gameid', async (req, res) => {
  try {
    const { year = '2026' } = req.query
    const { gameid } = req.params
    const rows = await getRows(year)
    const matchRows = getMatchRows(rows, gameid)
    if (!matchRows.length) return res.status(404).json({ error: 'Match non trouvé' })
    res.json(matchRows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Noms d'équipes pour une liste de gameids (séparés par virgule)
router.get('/team-names', async (req, res) => {
  try {
    const { year = '2026', gameids } = req.query
    if (!gameids) return res.json({})
    const rows = await getRows(year)
    const ids = gameids.split(',').filter(Boolean)
    res.json(getTeamNames(rows, ids))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
