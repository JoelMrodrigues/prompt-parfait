/**
 * Parse les matchs Exalty/Riot (JSON de fin de partie)
 * Notre équipe = les participants dont le pseudo (ou compte secondaire) correspond aux joueurs créés.
 * Équipe adverse = les 5 autres.
 */
import { getChampionNameById } from './championsDatabase'

const ROLE_ORDER = ['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT']

/** Jungler adverse = celui qui a le plus de neutralMinionsKilled (monstres jungle). L'autre JUNGLE → TOP. */
function fixEnemyDuplicateRoles(enemyParticipants) {
  if (!enemyParticipants.length) return
  const jungler = enemyParticipants.reduce(
    (best, p) => {
      const n = p.stats?.neutralMinionsKilled ?? 0
      const bestN = best?.stats?.neutralMinionsKilled ?? 0
      return n > bestN ? p : best
    },
    enemyParticipants[0]
  )
  jungler.role = 'JUNGLE'
  for (const p of enemyParticipants) {
    if (p !== jungler && p.role === 'JUNGLE') p.role = 'TOP'
  }
}

/** Normalise pour comparaison : minuscules, espaces collés, accents enlevés */
function norm(s) {
  const t = (s || '').trim().toLowerCase().replace(/\s+/g, ' ')
  return t.normalize('NFD').replace(/\p{Diacritic}/gu, '')
}

/** Retourne le gameName sans le tag (#xxx) pour matching plus souple */
function normWithoutTag(s) {
  const n = norm(s)
  const i = n.indexOf('#')
  return i >= 0 ? n.slice(0, i) : n
}

/** Retourne true si les deux noms (sans tag) matchent : égalité ou l'un contient l'autre */
function nameMatches(aNoTag, bNoTag) {
  if (!aNoTag || !bNoTag) return false
  if (aNoTag === bNoTag) return true
  if (aNoTag.length >= 3 && bNoTag.length >= 3 && (aNoTag.startsWith(bNoTag) || bNoTag.startsWith(aNoTag))) return true
  return false
}

/** Rôle adverse : lane = rôle sauf BOTTOM où on regarde role (CARRY → ADC, SUPPORT → SUPPORT) */
function inferRoleFromTimeline(p) {
  const lane = (p.timeline?.lane || '').toUpperCase()
  const role = (p.timeline?.role || '').toUpperCase()
  if (lane === 'TOP') return 'TOP'
  if (lane === 'JUNGLE') return 'JUNGLE'
  if (lane === 'MIDDLE') return 'MID'
  if (lane === 'BOTTOM') {
    if (role === 'CARRY' || role === 'DUO_CARRY') return 'ADC'
    if (role === 'SUPPORT') return 'SUPPORT'
  }
  return 'UNKNOWN'
}

/** Pseudo complet depuis le JSON (gameName#tagLine) */
function getJsonPseudo(identity) {
  const p = identity?.player
  if (!p?.gameName) return null
  const g = (p.gameName || '').trim()
  const t = (p.tagLine || '').trim()
  return t ? `${g}#${t}` : g
}

/**
 * Retourne true si le pseudo du JSON correspond au joueur.
 * On teste d'abord le pseudo principal, puis le compte secondaire.
 */
function pseudoMatchesPlayer(player, jsonPseudo) {
  if (!jsonPseudo) return false
  const n = norm(jsonPseudo)
  const main = norm(player.pseudo)
  const alt = norm(player.secondary_account)
  if (main && main === n) return true
  if (alt && alt === n) return true
  return false
}

/** Rôle du joueur (position) pour l'affichage — aligné sur les valeurs stockées (TOP, JNG, MID, BOT, SUP) */
function playerRole(player) {
  const r = (player.position || 'UNKNOWN').toUpperCase().trim()
  return r
    .replace('BOT', 'ADC')
    .replace('JNG', 'JUNGLE')
    .replace('SUP', 'SUPPORT')
}

/** Lit une clé stats en tolérant la casse (JSON Riot = camelCase) */
function getStat(s, key) {
  if (!s || typeof s !== 'object') return 0
  const k = Object.keys(s).find((x) => x.toLowerCase() === key.toLowerCase())
  const v = k ? s[k] : s[key]
  return v != null && !Number.isNaN(Number(v)) ? Number(v) : 0
}

/** Construit un participant enrichi (stats + role, teamSide, playerId) */
function buildParticipant(p, identity, matchJson, options) {
  const s = p.stats || {}
  const totalMinions = getStat(s, 'totalMinionsKilled')
  const neutralMinions = getStat(s, 'neutralMinionsKilled')
  const cs = totalMinions + neutralMinions
  const k = s.kills || 0
  const d = s.deaths || 0
  const a = s.assists || 0
  const kda = d === 0 ? (k + a).toFixed(2) : ((k + a) / d).toFixed(2)
  return {
    participantId: p.participantId,
    pseudo: getJsonPseudo(identity),
    championId: p.championId,
    championName: getChampionNameById(p.championId),
    role: options.role || inferRoleFromTimeline(p),
    playerId: options.playerId ?? null,
    teamSide: options.teamSide,
    stats: {
      kills: k,
      deaths: d,
      assists: a,
      kda: parseFloat(kda),
      totalDamageDealtToChampions: s.totalDamageDealtToChampions || 0,
      goldEarned: s.goldEarned || 0,
      cs,
      totalMinionsKilled: totalMinions,
      neutralMinionsKilled: neutralMinions,
      win: s.win || false,
      visionScore: s.visionScore || 0,
      visionWardsBoughtInGame: s.visionWardsBoughtInGame || 0,
      wardsPlaced: s.wardsPlaced || 0,
      wardsKilled: s.wardsKilled || 0,
      item0: s.item0 || 0,
      item1: s.item1 || 0,
      item2: s.item2 || 0,
      item3: s.item3 || 0,
      item4: s.item4 || 0,
      item5: s.item5 || 0,
    },
    teamId: p.teamId,
    side: p.teamId === 100 ? 'BLUE' : 'RED',
  }
}

/**
 * Parse un match JSON.
 * Notre équipe = participants dont le pseudo (principal ou secondaire) correspond à un joueur créé → on remonte son rôle.
 * Les 5 autres = équipe adverse.
 */
export function parseExaltyMatch(matchJson, teamPlayers) {
  if (!matchJson?.participants?.length || !matchJson?.participantIdentities?.length) {
    return null
  }

  const participantIdsByPseudo = new Map()
  for (const identity of matchJson.participantIdentities) {
    const pseudo = getJsonPseudo(identity)
    if (pseudo) {
      const n = norm(pseudo)
      participantIdsByPseudo.set(n, { identity, participantId: identity.participantId })
    }
  }

  const ourParticipantIds = new Set()
  const participantIdToPlayer = new Map()

  for (const player of teamPlayers) {
    const main = norm(player.pseudo)
    const alt = norm(player.secondary_account)
    const mainNoTag = normWithoutTag(player.pseudo)
    const altNoTag = normWithoutTag(player.secondary_account)
    const role = playerRole(player)
    let entry = participantIdsByPseudo.get(main) || participantIdsByPseudo.get(alt)
    if (!entry) {
      for (const [normPseudo, data] of participantIdsByPseudo) {
        if (ourParticipantIds.has(data.participantId)) continue
        const jsonNameNoTag = normWithoutTag(normPseudo)
        if (nameMatches(mainNoTag, jsonNameNoTag)) { entry = data; break }
        if (nameMatches(altNoTag, jsonNameNoTag)) { entry = data; break }
      }
    }
    if (entry) {
      ourParticipantIds.add(entry.participantId)
      participantIdToPlayer.set(entry.participantId, { player, role })
    }
  }

  if (ourParticipantIds.size === 0) {
    return null
  }

  let ourTeamId = null
  const ourParticipants = []
  const enemyParticipants = []

  for (const p of matchJson.participants) {
    const identity = matchJson.participantIdentities.find(i => i.participantId === p.participantId)
    const isOurs = ourParticipantIds.has(p.participantId)
    const mapped = participantIdToPlayer.get(p.participantId)

    if (isOurs && mapped) {
      if (ourTeamId == null) ourTeamId = p.teamId
      // Notre équipe : position du joueur (on sait qui joue quel rôle). Adverses : timeline.lane/role du JSON l’API (timeline.lane/role) quand présente ; sinon position du joueur
      ourParticipants.push(buildParticipant(p, identity, matchJson, {
        role: mapped.role,
        playerId: mapped.player.id,
        teamSide: 'our',
      }))
    } else {
      enemyParticipants.push(buildParticipant(p, identity, matchJson, {
        role: inferRoleFromTimeline(p),
        playerId: null,
        teamSide: 'enemy',
      }))
    }
  }

  // Corriger les rôles adverses quand l’API renvoie 2x le même (ex. 2 JUNGLE) : on réattribue au rôle manquant
  fixEnemyDuplicateRoles(enemyParticipants)

  ourParticipants.sort((a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role))
  enemyParticipants.sort((a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role))

  const durationMin = Math.round((matchJson.gameDuration || 0) / 60)
  const ourWin = ourParticipants.some(p => p.stats.win)

  return {
    match: {
      gameId: matchJson.gameId,
      gameCreation: matchJson.gameCreation,
      gameDuration: matchJson.gameDuration,
      durationMin,
      gameMode: matchJson.gameMode,
      gameType: matchJson.gameType,
      ourTeamId: ourTeamId ?? 100,
      ourWin,
    },
    participants: [...ourParticipants, ...enemyParticipants],
  }
}

/**
 * Parse plusieurs matchs JSON
 */
export function parseExaltyMatches(matchesJson, teamPlayers) {
  const results = []
  for (const m of matchesJson) {
    const parsed = parseExaltyMatch(m, teamPlayers)
    if (parsed) results.push(parsed)
  }
  return results
}
