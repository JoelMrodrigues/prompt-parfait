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
