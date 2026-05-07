/**
 * Retourne le joueur pour un rôle donné (un seul joueur par rôle)
 * @param {Array} players - Liste des joueurs
 * @param {string} role - Rôle (TOP, JNG, MID, ADC, SUP)
 * @returns {Object|null} Le joueur trouvé ou null
 */
const normalizeRole = (r: string) => (r === 'ADC' ? 'BOT' : r)

export function getPlayerByRole(players, role) {
  if (!players?.length || !role) return null
  const target = normalizeRole(role.toUpperCase())
  return players.find((p) => normalizeRole((p.position || '').toUpperCase()) === target) || null
}
