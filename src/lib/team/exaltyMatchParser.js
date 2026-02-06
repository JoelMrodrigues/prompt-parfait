/**
 * Parse les matchs Exalty/Riot (JSON de fin de partie)
 * Match les joueurs par pseudo ou secondary_account
 */
import { getChampionNameById } from './championsDatabase'

const ROLE_ORDER = ['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT']

/**
 * Construit le pseudo complet depuis le JSON (gameName#tagLine)
 */
function getJsonPseudo(identity) {
  const p = identity?.player
  if (!p?.gameName) return null
  const g = (p.gameName || '').trim()
  const t = (p.tagLine || '').trim()
  return t ? `${g}#${t}` : g
}

/**
 * Vérifie si le pseudo JSON correspond au pseudo ou secondary_account du joueur
 * Format JSON: gameName#tagLine (ex: "Son of No One#EUW")
 */
function pseudoMatchesPlayer(player, jsonPseudo, gameName, tagLine) {
  if (!jsonPseudo) return false
  const main = (player.pseudo || '').trim()
  const alt = (player.secondary_account || '').trim()
  // Match exact (insensible à la casse)
  const jsonNorm = jsonPseudo.toLowerCase()
  if (main && main.toLowerCase() === jsonNorm) return true
  if (alt && alt.toLowerCase() === jsonNorm) return true
  // Match gameName#tagLine si notre pseudo est stocké différemment
  const fullFromJson = gameName && tagLine ? `${gameName.trim()}#${tagLine.trim()}` : jsonPseudo
  if (main && main.toLowerCase() === fullFromJson.toLowerCase()) return true
  if (alt && alt.toLowerCase() === fullFromJson.toLowerCase()) return true
  return false
}

/**
 * Parse un match JSON et extrait les stats pour l'équipe du joueur
 * @param {Object} matchJson - JSON du match (Exalty/Riot)
 * @param {Array} teamPlayers - Liste des joueurs de l'équipe avec pseudo, secondary_account, position
 * @returns {Object|null} - { match, teamStats, ourTeamParticipants } ou null si aucun joueur trouvé
 */
export function parseExaltyMatch(matchJson, teamPlayers) {
  if (!matchJson?.participants?.length || !matchJson?.participantIdentities?.length) {
    return null
  }

  // Trouver au moins un joueur de notre équipe dans le match
  let ourTeamId = null
  const foundIdentities = []

  for (const identity of matchJson.participantIdentities) {
    const jsonPseudo = getJsonPseudo(identity)
    const gameName = identity?.player?.gameName
    const tagLine = identity?.player?.tagLine

    for (const player of teamPlayers) {
      if (pseudoMatchesPlayer(player, jsonPseudo, gameName, tagLine)) {
        const participant = matchJson.participants.find(p => p.participantId === identity.participantId)
        if (participant) {
          ourTeamId = participant.teamId
          foundIdentities.push({ identity, participant, player, jsonPseudo })
          break
        }
      }
    }
  }

  if (!ourTeamId || foundIdentities.length === 0) {
    return null
  }

  // Tous les participants de notre équipe
  const ourParticipants = matchJson.participants
    .filter(p => p.teamId === ourTeamId)
    .map(p => {
      const identity = matchJson.participantIdentities.find(i => i.participantId === p.participantId)
      const jsonPseudo = getJsonPseudo(identity)
      const s = p.stats || {}
      const cs = (s.totalMinionsKilled || 0) + (s.neutralMinionsKilled || 0)
      const k = s.kills || 0
      const d = s.deaths || 0
      const a = s.assists || 0
      const kda = d === 0 ? (k + a).toFixed(2) : ((k + a) / d).toFixed(2)

      // Trouver notre joueur (match par pseudo)
      let matchedPlayer = null
      for (const fp of foundIdentities) {
        if (fp.participant.participantId === p.participantId) {
          matchedPlayer = fp.player
          break
        }
      }
      if (!matchedPlayer && jsonPseudo) {
        const ident = matchJson.participantIdentities.find(i => i.participantId === p.participantId)
        for (const pl of teamPlayers) {
          if (pseudoMatchesPlayer(pl, jsonPseudo, ident?.player?.gameName, ident?.player?.tagLine)) {
            matchedPlayer = pl
            break
          }
        }
      }

      return {
        participantId: p.participantId,
        pseudo: jsonPseudo,
        championId: p.championId,
        championName: getChampionNameById(p.championId),
        role: matchedPlayer ? (matchedPlayer.position || 'UNKNOWN').replace('BOT', 'ADC').replace('JNG', 'JUNGLE') : 'UNKNOWN',
        playerId: matchedPlayer?.id || null,
        stats: {
          kills: k,
          deaths: d,
          assists: a,
          kda: parseFloat(kda),
          totalDamageDealtToChampions: s.totalDamageDealtToChampions || 0,
          goldEarned: s.goldEarned || 0,
          cs,
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
    })

  // Trier par rôle
  ourParticipants.sort((a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role))

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
      ourTeamId,
      ourWin,
    },
    participants: ourParticipants,
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
