/**
 * Stats d'un match pro — appelle le backend qui gère le cache CSV.
 * Plus aucun téléchargement de CSV depuis le browser.
 */

import type { MatchDetailData } from '../types'
import { getMatchDetails as fetchMatch, getTeamNames as fetchTeamNames } from './statsApi'

const SEASON_TO_YEAR = {
  S16: '2026', S15: '2025', S14: '2024', S13: '2023', S12: '2022', S11: '2021', S10: '2020',
}

function resolveYear(season) {
  return SEASON_TO_YEAR[season] || season || '2026'
}

/**
 * Détail complet d'un match (tous les joueurs, stats par équipe).
 * @returns {{ data: object|null, error: Error|null }}
 */
export async function getMatchDetails(gameid: string, season = 'S16'): Promise<{ data: MatchDetailData | null; error: Error | null }> {
  try {
    const rows = await fetchMatch(gameid, resolveYear(season)) as import('../types').ProMatchRow[]
    return { data: organizeMatchData(rows), error: null }
  } catch (error) {
    return { data: null, error: error as Error }
  }
}

/**
 * Noms d'équipes pour plusieurs matches : { gameid: "TeamA vs TeamB" }
 */
export async function getMultipleMatchTeamNames(gameids, season = 'S16') {
  try {
    const raw = await fetchTeamNames(gameids, resolveYear(season)) as Record<string, { blue?: string; red?: string }>
    const result: Record<string, string> = {}
    Object.entries(raw).forEach(([id, teams]) => {
      if (teams.blue && teams.red) result[id] = `${teams.blue} vs ${teams.red}`
    })
    return result
  } catch {
    return {}
  }
}

/** @deprecated Utiliser getMultipleMatchTeamNames */
export async function getMatchTeamNames(gameid) {
  const result = await getMultipleMatchTeamNames([gameid])
  const parts = result[gameid]?.split(' vs ') || []
  return { blueTeam: parts[0] || null, redTeam: parts[1] || null }
}

export function formatMatchName(match) {
  return match?.game || match?.gameid || '-'
}

// ─── Traitement des lignes retournées par le backend ─────────────────────────

const POSITION_ORDER = { top: 1, jng: 2, mid: 3, bot: 4, sup: 5, support: 5 }

function organizeMatchData(rows) {
  const info = rows[0]
  const blue = rows.filter((r) => r.side === 'Blue').sort(byPosition)
  const red = rows.filter((r) => r.side === 'Red').sort(byPosition)

  const blueStats = calculateTeamStats(blue)
  const redStats = calculateTeamStats(red)
  const winner = info.result === 1 ? 'blue' : 'red'

  const redFirst = red[0]?.firstpick === 1
  const [teamAPlayers, teamBPlayers] = redFirst ? [red, blue] : [blue, red]
  const [teamAStats, teamBStats] = redFirst ? [redStats, blueStats] : [blueStats, redStats]

  return {
    gameid: info.gameid,
    date: info.date,
    league: info.league,
    split: info.split,
    season: info.season,
    patch: info.patch,
    game: info.game,
    gamelength: info.gamelength,
    blueTeam: { name: blue[0]?.teamname || 'Blue', players: blue, stats: blueStats },
    redTeam: { name: red[0]?.teamname || 'Red', players: red, stats: redStats },
    teamA: { name: teamAPlayers[0]?.teamname || 'A', players: teamAPlayers, stats: teamAStats },
    teamB: { name: teamBPlayers[0]?.teamname || 'B', players: teamBPlayers, stats: teamBStats },
    winner: winner as 'blue' | 'red',
  }
}

function byPosition(a, b) {
  return (POSITION_ORDER[a.position?.toLowerCase()] || 99) - (POSITION_ORDER[b.position?.toLowerCase()] || 99)
}

function calculateTeamStats(players) {
  if (!players.length) return { kills: 0, deaths: 0, assists: 0, gold: 0, towers: 0, dragons: 0, barons: 0, inhibitors: 0, heralds: 0, void_grubs: 0 }
  const p0 = players[0]
  return {
    kills: players.reduce((s, p) => s + (p.kills || 0), 0),
    deaths: players.reduce((s, p) => s + (p.deaths || 0), 0),
    assists: players.reduce((s, p) => s + (p.assists || 0), 0),
    gold: players.reduce((s, p) => s + (p.totalgold || 0), 0),
    towers: p0.towers ?? 0,
    dragons: p0.dragons ?? 0,
    barons: p0.barons ?? 0,
    inhibitors: p0.inhibitors ?? 0,
    heralds: p0.heralds ?? 0,
    void_grubs: p0.void_grubs ?? 0,
  }
}
