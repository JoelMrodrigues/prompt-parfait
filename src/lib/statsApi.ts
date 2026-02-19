/**
 * Client API pour les stats pro (Oracle's Elixir).
 * Toute la logique de téléchargement/parsing/cache est dans le backend.
 * Ce fichier fait uniquement des appels fetch vers /api/stats/*.
 */

import type { StatsFilters, FilterOptions, ChampionStats } from '../types'

const getBackendUrl = () =>
  (import.meta.env.VITE_DPM_API_URL || 'http://localhost:3001').replace(/\/$/, '')

async function apiFetch(path) {
  const res = await fetch(`${getBackendUrl()}${path}`)
  if (!res.ok) {
    const { error } = await res.json().catch(() => ({}))
    throw new Error(error || `Erreur ${res.status}`)
  }
  return res.json()
}

/** Années disponibles (2020 → 2026) */
export async function getAvailableYears() {
  const { years } = await apiFetch('/api/stats/years')
  return years
}

/** Options de filtre pour une année (leagues, patches, splits) */
export async function getFilterOptions(year = '2026'): Promise<FilterOptions> {
  return apiFetch(`/api/stats/filters?year=${year}`)
}

/**
 * Stats agrégées par champion.
 * @param filters - { year, role, league, side, split, leagues[] }
 */
export async function getChampionStats(filters: StatsFilters = {}): Promise<ChampionStats[]> {
  const { year = '2026', role, league, side, split, leagues = [] } = filters
  const params = new URLSearchParams({ year })
  if (role && role !== 'all') params.set('role', role)
  if (league && league !== 'all') params.set('league', league)
  if (side && side !== 'all') params.set('side', side)
  if (split && split !== 'all') params.set('split', split)
  if (leagues.length > 0) params.set('leagues', leagues.join(','))
  return apiFetch(`/api/stats/champions?${params}`)
}

/**
 * Toutes les lignes d'un champion (pour la page de détail).
 */
export async function getChampionRows(championName: string, filters: StatsFilters = {}) {
  const { year = '2026', role, league, side, split, leagues = [] } = filters
  const params = new URLSearchParams({ year })
  if (role && role !== 'all') params.set('role', role)
  if (league && league !== 'all') params.set('league', league)
  if (side && side !== 'all') params.set('side', side)
  if (split && split !== 'all') params.set('split', split)
  if (leagues.length > 0) params.set('leagues', leagues.join(','))
  return apiFetch(`/api/stats/champion/${encodeURIComponent(championName)}?${params}`)
}

/**
 * Toutes les lignes d'un match spécifique.
 * @param {string} gameid
 * @param {string} year
 */
export async function getMatchDetails(gameid, year = '2026') {
  return apiFetch(`/api/stats/match/${encodeURIComponent(gameid)}?year=${year}`)
}

/**
 * Noms d'équipes pour une liste de gameids.
 * @param {string[]} gameids
 * @param {string} year
 */
export async function getTeamNames(gameids, year = '2026') {
  if (!gameids?.length) return {}
  return apiFetch(`/api/stats/team-names?year=${year}&gameids=${gameids.join(',')}`)
}
