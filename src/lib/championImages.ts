/** Riot renvoie "MonkeyKing", partout sur le site on affiche "Wukong" (nom + image) */
const CHAMPION_DISPLAY_NAMES = {
  MonkeyKing: 'Wukong',
  monkeyking: 'Wukong',
}

/**
 * Nom d'affichage du champion (ex: MonkeyKing → Wukong)
 * @param {string} idOrName - ID ou nom du champion (Riot)
 * @returns {string}
 */
export function getChampionDisplayName(idOrName) {
  if (!idOrName) return ''
  const s = String(idOrName)
  return CHAMPION_DISPLAY_NAMES[s] || CHAMPION_DISPLAY_NAMES[s.toLowerCase()] || s
}

function nameForAsset(championName) {
  const display = getChampionDisplayName(championName) || championName
  return (display || '').toLowerCase().replace(/[^a-z0-9]/g, '')
}

/**
 * Récupère le chemin de l'icône d'un champion
 * @param {string} championName - Nom du champion (Riot ou affichage)
 * @returns {string} - Chemin de l'icône
 */
export function getChampionImage(championName) {
  if (!championName) return '/resources/champions/icons/default.jpg'
  const normalized = nameForAsset(championName)
  if (!normalized) return '/resources/champions/icons/default.jpg'
  return `/resources/champions/icons/${normalized}.jpg`
}

/**
 * Récupère le chemin de l'image big champion (background)
 * @param {string} championName - Nom du champion
 * @returns {string|null} - Chemin ou null si invalide
 */
export function getBigChampionImage(championName) {
  if (!championName || typeof championName !== 'string') return null
  const normalized = nameForAsset(championName)
  if (!normalized) return null
  return `/resources/bigchampions/${normalized}.jpg`
}
