// Loader pour les champions locaux
// Remplace l'API Riot

let championsCache = null;

/**
 * Charge les champions depuis le fichier local JSON
 * @returns {Promise<Array>} Liste des champions
 */
export async function loadChampions() {
  if (championsCache) {
    return championsCache;
  }

  try {
    const response = await fetch('/resources/champions/champions.json');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const champions = await response.json();
    championsCache = champions;
    return champions;
  } catch (error) {
    console.error('❌ Erreur lors du chargement des champions:', error);
    throw error;
  }
}

/**
 * Récupère un champion par son ID
 * @param {string} id - ID du champion
 * @returns {Promise<Object|null>} Champion trouvé ou null
 */
export async function getChampionById(id) {
  const champions = await loadChampions();
  return champions.find(champ => champ.id === id) || null;
}

/**
 * Filtre les champions par rôle
 * @param {string} role - Rôle à filtrer (Top, Jungle, Mid, ADC, Support)
 * @returns {Promise<Array>} Champions filtrés
 */
export async function getChampionsByRole(role) {
  const champions = await loadChampions();
  return champions.filter(champ => champ.roles.includes(role));
}

/**
 * Recherche des champions par nom
 * @param {string} query - Terme de recherche
 * @returns {Promise<Array>} Champions correspondants
 */
export async function searchChampions(query) {
  const champions = await loadChampions();
  const searchTerm = query.toLowerCase();
  return champions.filter(champ => 
    champ.name.toLowerCase().includes(searchTerm)
  );
}

/**
 * Vide le cache (utile pour tests)
 */
export function clearCache() {
  championsCache = null;
}
