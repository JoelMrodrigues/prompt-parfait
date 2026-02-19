/**
 * Parse un pseudo Riot au format "GameName#TagLine" ou "GameName/TagLine"
 * Retourne { gameName, tagLine } ou null si le format est invalide
 */
export function parsePseudo(pseudo) {
  const sep = pseudo.includes('#') ? '#' : pseudo.includes('/') ? '/' : null
  if (!sep) return null
  const [gameName, tagLine] = pseudo.split(sep).map((s) => s.trim())
  if (!gameName || !tagLine) return null
  return { gameName, tagLine }
}
