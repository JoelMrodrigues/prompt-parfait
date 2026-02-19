/**
 * Stats champion pro — appelle le backend qui gère téléchargement + cache + agrégation.
 * Plus aucun accès direct à Supabase ou Google Drive depuis le frontend.
 */

import type { StatsFilters } from '../types'
import { getChampionStats as fetchChampions, getFilterOptions as fetchFilters } from './statsApi'

/**
 * Stats agrégées par champion.
 * @param {object} filters - { year, role, league, side, split, leagues[] }
 * @returns {{ data: Array|null, error: Error|null }}
 */
export async function getChampionStats(filters: StatsFilters = {}) {
  // Convertir l'ancien format "season" (S16) → "year" (2026)
  const seasonToYear = { S16: '2026', S15: '2025', S14: '2024', S13: '2023', S12: '2022', S11: '2021', S10: '2020' }
  const year = filters.year || seasonToYear[filters.season] || '2026'

  try {
    const data = await fetchChampions({ ...filters, year })
    return { data, error: null }
  } catch (error) {
    return { data: null, error }
  }
}

/**
 * Options de filtre disponibles pour une année (leagues, patches, splits).
 * @param {string} yearOrSeason - ex: "2026" ou "S16"
 */
export async function getFilterOptions(yearOrSeason = 'S16') {
  const seasonToYear = { S16: '2026', S15: '2025', S14: '2024', S13: '2023', S12: '2022', S11: '2021', S10: '2020' }
  const year = seasonToYear[yearOrSeason] || yearOrSeason

  try {
    const options = await fetchFilters(year)
    return {
      tournaments: options.leagues || [],
      patches: options.patches || [],
      leagues: options.leagues || [],
    }
  } catch {
    return { tournaments: [], patches: [], leagues: [] }
  }
}

/** @deprecated Les données viennent maintenant du cache backend, pas de Supabase */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function getLastUpdateDate(_season?: string) {
  return null
}
