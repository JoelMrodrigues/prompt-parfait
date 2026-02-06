/**
 * Récupère le chemin de l'icône d'un champion
 * @param {string} championName - Nom du champion
 * @returns {string} - Chemin de l'icône
 */
export function getChampionImage(championName) {
  if (!championName) return '/resources/champions/icons/default.jpg';

  // Normaliser le nom : minuscules, sans espaces ni caractères spéciaux
  const normalized = championName.toLowerCase().replace(/[^a-z0-9]/g, '');
  
  // Retourner le chemin vers l'icône
  return `/resources/champions/icons/${normalized}.jpg`;
}

/**
 * Récupère le chemin de l'image big champion (background)
 * @param {string} championName - Nom du champion
 * @returns {string|null} - Chemin ou null si invalide
 */
export function getBigChampionImage(championName) {
  if (!championName || typeof championName !== 'string') return null;
  const normalized = championName.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!normalized) return null;
  return `/resources/bigchampions/${normalized}.jpg`;
}
