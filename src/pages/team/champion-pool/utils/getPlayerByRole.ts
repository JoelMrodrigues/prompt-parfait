/**
 * Retourne le joueur pour un rôle donné (un seul joueur par rôle)
 * @param {Array} players - Liste des joueurs
 * @param {string} role - Rôle (TOP, JNG, MID, ADC, SUP)
 * @returns {Object|null} Le joueur trouvé ou null
 */
export function getPlayerByRole(players, role) {
  if (!players?.length || !role) return null
  const roleUpper = role.toUpperCase()
  return players.find((p) => (p.position || '').toUpperCase() === roleUpper) || null
}
