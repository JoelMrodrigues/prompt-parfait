/**
 * Stats détaillées d'un champion — appelle le backend pour les lignes brutes,
 * puis agrège côté frontend (données légères : uniquement les matchs du champion).
 */

import { getChampionRows } from './statsApi'

const SEASON_TO_YEAR = {
  S16: '2026', S15: '2025', S14: '2024', S13: '2023', S12: '2022', S11: '2021', S10: '2020',
}

function resolveYear(filters) {
  return filters.year || SEASON_TO_YEAR[filters.season] || '2026'
}

/**
 * Stats agrégées pour UN champion (page ChampionDetail).
 * @returns {{ data: object|null, error: Error|null }}
 */
export async function getChampionDetailStats(championName, filters = {}) {
  try {
    const rows = await getChampionRows(championName, { ...filters, year: resolveYear(filters) })
    const data = rows.length ? calculateChampionStats(rows) : null
    return { data, error: null }
  } catch (error) {
    return { data: null, error }
  }
}

/**
 * Lignes brutes d'un champion (pour liste de matchs).
 * @returns {{ data: Array|null, error: Error|null }}
 */
// Le 3e argument `limit` n'est plus utilisé (le backend gère côté serveur)
export async function getChampionMatches(championName: string, filters = {}, _limit?: number) {
  try {
    const rows = await getChampionRows(championName, { ...filters, year: resolveYear(filters) })
    return { data: rows, error: null }
  } catch (error) {
    return { data: null, error }
  }
}

// ─── Agrégation locale (données légères, uniquement les lignes du champion) ──

function avg(arr) {
  if (!arr?.length) return 0
  return Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10
}

function formatTime(seconds) {
  if (!seconds) return '00:00'
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`
}

function calculateKDA(kills, deaths, assists) {
  const k = avg(kills), d = avg(deaths), a = avg(assists)
  return d > 0 ? (k + a) / d : k + a
}

function calculateChampionStats(matches) {
  const wins = matches.filter((m) => m.result === 1).length
  const total = matches.length
  return {
    general: {
      picks: total,
      bans: 0,
      wins,
      losses: total - wins,
      winrate: total > 0 ? (wins / total) * 100 : 0,
      kda: calculateKDA(matches.map((m) => m.kills || 0), matches.map((m) => m.deaths || 0), matches.map((m) => m.assists || 0)),
      csm: avg(matches.map((m) => m.cspm || 0)),
      gpm: Math.round(avg(matches.map((m) => m.earned_gpm || 0))),
      dpm: Math.round(avg(matches.map((m) => m.dpm || 0))),
      csd15: avg(matches.map((m) => m.csdiffat15 || 0)),
      gd15: Math.round(avg(matches.map((m) => m.golddiffat15 || 0))),
      xpd15: Math.round(avg(matches.map((m) => m.xpdiffat15 || 0))),
      avgGameLength: formatTime(avg(matches.map((m) => m.gamelength || 0))),
      prioScore: 0,
    },
    roleStats: calculateRoleStats(matches),
    playerStats: calculatePlayerStats(matches).slice(0, 10),
    leagueStats: calculateLeagueStats(matches),
    patchStats: calculatePatchStats(matches),
  }
}

function calculateRoleStats(matches) {
  const map = { top: 'TOP', jng: 'JUNGLE', mid: 'MID', bot: 'BOT', sup: 'SUPPORT' }
  const stats = {}
  Object.entries(map).forEach(([role, label]) => {
    const rm = matches.filter((m) => m.position?.toLowerCase() === role)
    if (!rm.length) { stats[label] = null; return }
    const wins = rm.filter((m) => m.result === 1).length
    stats[label] = {
      nb: rm.length,
      winrate: (wins / rm.length) * 100,
      kda: calculateKDA(rm.map((m) => m.kills || 0), rm.map((m) => m.deaths || 0), rm.map((m) => m.assists || 0)),
      dpm: Math.round(avg(rm.map((m) => m.dpm || 0))),
    }
  })
  return stats
}

function calculatePlayerStats(matches) {
  const map = new Map()
  matches.forEach((m) => {
    if (!m.playername) return
    const s = map.get(m.playername) || { name: m.playername, games: 0, wins: 0, kills: [], deaths: [], assists: [], csd15: [] }
    s.games++
    if (m.result === 1) s.wins++
    if (m.kills != null) s.kills.push(m.kills)
    if (m.deaths != null) s.deaths.push(m.deaths)
    if (m.assists != null) s.assists.push(m.assists)
    if (m.csdiffat15 != null) s.csd15.push(m.csdiffat15)
    map.set(m.playername, s)
  })
  return Array.from(map.values())
    .map((p) => ({ name: p.name, games: p.games, winrate: (p.wins / p.games) * 100, kda: calculateKDA(p.kills, p.deaths, p.assists), csd15: avg(p.csd15) }))
    .sort((a, b) => b.games - a.games)
}

function calculateLeagueStats(matches) {
  const map = new Map()
  matches.forEach((m) => {
    if (!m.league) return
    const s = map.get(m.league) || { league: m.league, games: 0, wins: 0 }
    s.games++
    if (m.result === 1) s.wins++
    map.set(m.league, s)
  })
  return Array.from(map.values())
    .map((l) => ({ league: l.league, games: l.games, presence: (l.games / matches.length) * 100, winrate: (l.wins / l.games) * 100 }))
    .sort((a, b) => b.presence - a.presence)
}

function calculatePatchStats(matches) {
  const map = new Map()
  matches.forEach((m) => {
    if (!m.patch) return
    map.set(m.patch, (map.get(m.patch) || 0) + 1)
  })
  return Array.from(map.entries())
    .map(([patch, games]) => ({ patch, games, percentage: (games / matches.length) * 100 }))
    .sort((a, b) => parseFloat(b.patch) - parseFloat(a.patch))
}
