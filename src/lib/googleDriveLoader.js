// Configuration des CSV par saison (Google Drive)
export const SEASON_DATA = {
  S16: '1hnpbrUpBMS1TZI7IovfpKeZfWJH1Aptm',
  S15: '1v6LRphp2kYciU4SXp0PCjEMuev1bDejc',
  S14: '1IjIEhLc9n8eLKeY-yh_YigKVWbhgGBsN',
  S13: '1XXk2LO0CsNADBB1LRGOV5rUpyZdEZ8s2',
  S12: '1EHmptHyzY8owv0BAcNKtkQpMwfkURwRy',
  S11: '1fzwTTz77hcnYjOnO9ONeoPrkWCoOSecA',
  S10: '1dlSIczXShnv1vIfGNvBjgk-thMKA5j7d',
}

// Convertir lien Google Drive en lien de téléchargement direct
const getDirectDownloadUrl = (fileId) => {
  return `https://drive.google.com/uc?export=download&id=${fileId}`
}

// Charger CSV depuis Google Drive
export const loadSeasonData = async (season) => {
  const fileId = SEASON_DATA[season]
  
  if (!fileId) {
    throw new Error(`Saison ${season} non trouvée`)
  }

  try {
    const url = getDirectDownloadUrl(fileId)
    const response = await fetch(url)
    
    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status}`)
    }
    
    const csvText = await response.text()
    return csvText
  } catch (error) {
    console.error(`Erreur chargement saison ${season}:`, error)
    throw error
  }
}

// Charger toutes les saisons disponibles
export const getAvailableSeasons = () => {
  return Object.keys(SEASON_DATA).sort().reverse() // Plus récent en premier
}

// Cache pour éviter de recharger les mêmes données
const cache = new Map()

export const loadSeasonDataCached = async (season) => {
  if (cache.has(season)) {
    return cache.get(season)
  }
  
  const data = await loadSeasonData(season)
  cache.set(season, data)
  return data
}

// Vider le cache
export const clearCache = () => {
  cache.clear()
}
