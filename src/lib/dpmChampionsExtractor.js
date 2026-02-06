/**
 * Extrait les top 5 champions depuis le HTML de dpm.lol
 * Fichier séparé pour faciliter la maintenance et les corrections
 */

// Liste des mots à exclure (pas des champions)
const EXCLUDED_WORDS = [
  'Tierlist', 'Leaderboards', 'Esports', 'Games', 'Winrate', 'KDA', 
  'Damage', 'Gold', 'CS', 'Vision', 'Wards', 'Objectives', 'Not found',
  'Rewind', 'Next', 'Previous', 'Home', 'Menu', 'Search', 'Filter',
  'Settings', 'Profile', 'Stats', 'Matches', 'Build', 'Runes', 'Items',
  'Performance', 'Champion', 'Parties', 'WR', 'All', 'Tous', 'View',
  'More', 'See', 'Show', 'Hide', 'Toggle', 'Click', 'Button', 'Link'
]

// Cache pour la liste des champions valides
let validChampionsList = null

/**
 * Charge la liste des champions valides depuis champions.json
 */
async function loadValidChampions() {
  if (validChampionsList) return validChampionsList
  
  try {
    const response = await fetch('/resources/champions/champions.json')
    if (response.ok) {
      const champions = await response.json()
      validChampionsList = champions.map(c => c.name.toLowerCase())
      console.log('✅ Liste des champions chargée:', validChampionsList.length, 'champions')
      return validChampionsList
    }
  } catch (error) {
    console.warn('⚠️ Impossible de charger champions.json, validation désactivée')
  }
  
  return []
}

/**
 * Vérifie si un nom est un champion valide
 */
function isValidChampion(name) {
  if (!name || name.length < 3) return false
  
  // Exclure les mots de la liste noire
  if (EXCLUDED_WORDS.some(word => name.toLowerCase().includes(word.toLowerCase()))) {
    return false
  }
  
  // Si on a la liste des champions, vérifier
  if (validChampionsList && validChampionsList.length > 0) {
    return validChampionsList.includes(name.toLowerCase())
  }
  
  // Sinon, validation basique (pas de mots communs)
  const commonWords = ['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'its', 'let', 'put', 'say', 'she', 'too', 'use']
  if (commonWords.includes(name.toLowerCase())) return false
  
  return true
}

/**
 * Extrait les top 5 champions depuis le HTML de dpm.lol
 * @param {string} html - Le HTML de la page dpm.lol
 * @returns {Promise<Array>} Tableau de champions avec { name, winrate, games }
 */
export async function extractChampionsFromDpm(html) {
  try {
    // Charger la liste des champions valides
    await loadValidChampions()
    
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')

    console.log('🔍 Extraction champions dpm.lol...')
    console.log('📄 Longueur HTML:', html.length, 'caractères')

    const champions = []

    // Méthode 1: Chercher dans le HTML brut pour les patterns de champions
    // Les URLs dpm.lol sont souvent encodées: champion%2FJayce%2Fsquare
    console.log('🔍 Recherche dans le HTML brut...')
    
    // Normaliser les encodages pour faciliter les regex (sans casser le HTML)
    const normalizedForUrls = html
      .replace(/%252F/gi, '/')
      .replace(/%2F/gi, '/')
    
    const championUrlPatterns = [
      /champion\/([A-Za-z0-9]+)(?:\/|%2F|$)/gi,  // champion/Jayce/ ou champion/Jayce%2F ou fin
      /champion\/([A-Za-z0-9]+)/gi,              // champion/Jayce (slug seul)
      /cdn\.dpm\.lol\/[^"'\s]*champion\/([A-Za-z0-9]+)/gi,
      /champion%2F([A-Za-z0-9]+)(?:%2F|$)/gi,     // au cas où normalisation insuffisante
    ]
    
    const championMatches = []
    const seen = new Set()
    for (const pattern of championUrlPatterns) {
      let match
      const str = pattern.source.includes('cdn\.') ? html : normalizedForUrls
      while ((match = pattern.exec(str)) !== null) {
        const slug = match[1]
        if (slug && slug.length >= 2 && !seen.has(slug.toLowerCase())) {
          seen.add(slug.toLowerCase())
          championMatches.push(slug)
        }
      }
    }
    
    console.log('📊 URLs champions trouvées dans HTML:', championMatches.length)
    console.log('📊 Premiers slugs:', championMatches.slice(0, 10))
    
    // Méthode 2: Chercher dans le HTML brut pour les patterns de stats avec champions
    console.log('🔍 Recherche directe dans le HTML brut...')
    
    // Charger les champions avec leurs slugs
    const response = await fetch('/resources/champions/champions.json')
    let championsData = []
    if (response.ok) {
      championsData = await response.json()
      console.log('📊 Champions chargés pour recherche:', championsData.length)
    }
    
    // Méthode 2a: Chercher les patterns "winrate% games" dans le HTML
    // Format: "75% 8" ou "75%8 parties" ou similaire
    const statsPatterns = [
      /(\d+)%\s*(\d+)\s*(?:parties|games|played|match)/gi,
      /(\d+)%\s*(\d+)/gi,
      /(\d+)\s*(?:parties|games|played)\s*(\d+)%/gi,
    ]
    
    const statsMatches = []
    for (const pattern of statsPatterns) {
      let match
      while ((match = pattern.exec(html)) !== null) {
        const winrate = parseFloat(match[1] || match[2])
        const games = parseInt(match[2] || match[1])
        if (winrate >= 0 && winrate <= 100 && games >= 1 && games <= 1000) {
          statsMatches.push({ winrate, games, index: match.index, context: match[0] })
        }
      }
    }
    
    console.log('📊 Patterns de stats trouvés:', statsMatches.length)
    
    // Pour chaque pattern de stats, chercher le champion à proximité
    for (const stats of statsMatches) {
      const startIndex = Math.max(0, stats.index - 300)
      const endIndex = Math.min(html.length, stats.index + 300)
      const context = html.substring(startIndex, endIndex).toLowerCase()
      
      // Chercher chaque champion dans ce contexte
      for (const champ of championsData) {
        const name = champ.name || ''
        const id = champ.id || ''
        
        // Variations du nom à chercher
        const searchTerms = [
          name.toLowerCase(),
          name.replace(/\s+/g, '').toLowerCase(),
          name.replace(/\./g, '').toLowerCase(),
          name.replace(/\s+/g, '').replace(/\./g, '').toLowerCase(),
          id.toLowerCase(),
        ]
        
        // Chercher si un des termes est dans le contexte
        const found = searchTerms.some(term => {
          if (!term) return false
          return context.includes(term)
        })
        
        if (found) {
          if (!champions.find(c => c.name.toLowerCase() === name.toLowerCase())) {
            champions.push({ name, winrate: stats.winrate, games: stats.games })
            console.log(`✅ Champion trouvé (pattern stats): ${name} (${stats.winrate}%, ${stats.games} parties)`)
            break // Un seul champion par pattern
          }
        }
      }
    }
    
    // Méthode 2b: Chercher dans le texte du DOM (après décodage HTML)
    if (champions.length < 5) {
      console.log('🔍 Recherche dans le texte du DOM...')
      const bodyText = doc.body?.textContent || ''
      console.log('📄 Texte du DOM:', bodyText.length, 'caractères')
      
      // Chercher les patterns de stats dans le texte décodé
      const textStatsPatterns = [
        /(\d+)%\s*(\d+)\s*(?:parties|games|played)/gi,
        /(\d+)%\s*(\d+)/gi,
      ]
      
      const textStatsMatches = []
      for (const pattern of textStatsPatterns) {
        let match
        while ((match = pattern.exec(bodyText)) !== null) {
          const winrate = parseFloat(match[1] || match[2])
          const games = parseInt(match[2] || match[1])
          if (winrate >= 0 && winrate <= 100 && games >= 1 && games <= 1000) {
            textStatsMatches.push({ winrate, games, index: match.index, context: match[0] })
          }
        }
      }
      
      console.log('📊 Patterns de stats dans texte DOM:', textStatsMatches.length)
      
      // Pour chaque pattern, chercher le champion à proximité
      for (const stats of textStatsMatches) {
        const startIndex = Math.max(0, stats.index - 200)
        const endIndex = Math.min(bodyText.length, stats.index + 200)
        const context = bodyText.substring(startIndex, endIndex).toLowerCase()
        
        for (const champ of championsData) {
          const name = champ.name || ''
          if (!name) continue
          
          const nameLower = name.toLowerCase()
          const nameVariations = [
            nameLower,
            nameLower.replace(/\s+/g, ''),
            nameLower.replace(/\./g, ''),
          ]
          
          const found = nameVariations.some(variation => context.includes(variation))
          
          if (found) {
            if (!champions.find(c => c.name.toLowerCase() === name.toLowerCase())) {
              champions.push({ name, winrate: stats.winrate, games: stats.games })
              console.log(`✅ Champion trouvé (texte DOM): ${name} (${stats.winrate}%, ${stats.games} parties)`)
              break
            }
          }
        }
      }
    }
    
    // Méthode 2c: Si toujours pas assez, recherche directe par nom dans le HTML
    if (champions.length < 5) {
      console.log('🔍 Recherche complémentaire par nom de champion dans HTML...')
      
      for (const champ of championsData.slice(0, 100)) {
        const name = champ.name || ''
        if (!name) continue
        
        const nameVariations = [
          name.toLowerCase(),
          name.replace(/\s+/g, '').toLowerCase(),
          name.replace(/\./g, '').toLowerCase(),
        ]
        
        for (const nameVar of nameVariations) {
          if (!nameVar || nameVar.length < 3) continue
          
          const nameIndex = html.toLowerCase().indexOf(nameVar)
          if (nameIndex === -1) continue
          
          const startIndex = Math.max(0, nameIndex - 200)
          const endIndex = Math.min(html.length, nameIndex + 200)
          const context = html.substring(startIndex, endIndex)
          
          const wrMatch = context.match(/(\d+)%/)
          const gamesMatch = context.match(/\b([1-9]\d{0,2})\b/)
          
          if (wrMatch) {
            const winrate = parseFloat(wrMatch[1])
            const games = gamesMatch ? parseInt(gamesMatch[1]) : null
            
            if (winrate >= 0 && winrate <= 100 && (!games || (games >= 1 && games <= 1000))) {
              if (!champions.find(c => c.name.toLowerCase() === name.toLowerCase())) {
                champions.push({ name, winrate, games })
                console.log(`✅ Champion trouvé (nom direct HTML): ${name} (${winrate}%, ${games || 'N/A'} parties)`)
                break
              }
            }
          }
        }
      }
    }
    
    // Méthode 3: Si pas de matches dans les URLs, chercher directement les noms de champions dans le texte
    if (championMatches.length === 0) {
      console.log('⚠️ Aucun champion trouvé dans les URLs, recherche dans le texte brut...')
      
      // Chercher les patterns de stats dans le HTML (format: "75%", "8 Parties", etc.)
      const statsPattern = /(\d+)%\s*[^\d]*(\d+)\s*(?:parties|games|played)/gi
      const statsMatches = []
      let statsMatch
      while ((statsMatch = statsPattern.exec(html)) !== null) {
        const winrate = parseFloat(statsMatch[1])
        const games = parseInt(statsMatch[2])
        if (winrate >= 0 && winrate <= 100 && games >= 1 && games <= 1000) {
          statsMatches.push({ winrate, games, index: statsMatch.index })
        }
      }
      
      console.log('📊 Patterns de stats trouvés:', statsMatches.length)
      
      // Charger les noms complets des champions
      const response = await fetch('/resources/champions/champions.json')
      if (response.ok) {
        const championsData = await response.json()
        const championNames = championsData.map(c => c.name).filter(Boolean)
        
        // Pour chaque pattern de stats, chercher le nom du champion à proximité
        for (const stats of statsMatches) {
          const startIndex = Math.max(0, stats.index - 200)
          const endIndex = Math.min(html.length, stats.index + 200)
          const context = html.substring(startIndex, endIndex)
          
          // Chercher un nom de champion dans ce contexte
          for (const championName of championNames) {
            const nameLower = championName.toLowerCase()
            const contextLower = context.toLowerCase()
            
            // Chercher le nom du champion dans le contexte
            if (contextLower.includes(nameLower) || contextLower.includes(nameLower.replace(/[.\s]/g, ''))) {
              if (!champions.find(c => c.name.toLowerCase() === championName.toLowerCase())) {
                champions.push({ name: championName, winrate: stats.winrate, games: stats.games })
                console.log(`✅ Champion trouvé (méthode texte): ${championName} (${stats.winrate}%, ${stats.games} parties)`)
                break // Un seul champion par pattern de stats
              }
            }
          }
        }
      }
    }
    
    // Méthode 4: Chercher les noms de champions dans les URLs trouvées avec leurs stats
    console.log('🔍 Recherche des champions dans les URLs avec stats...')
    
    for (const championSlug of championMatches) {
      const slugLower = championSlug.toLowerCase()
      
      // Exclure les mots non-champions
      const isExcludedSlug = EXCLUDED_WORDS.some(word => 
        slugLower === word.toLowerCase() || 
        slugLower.includes(word.toLowerCase())
      )
      
      if (isExcludedSlug) {
        console.log(`⏭️ Slug exclu: ${championSlug}`)
        continue
      }
      
      // Formater le nom
      const championName = formatChampionName(championSlug)
      
      // Vérifier que c'est un champion valide
      if (!isValidChampion(championName)) {
        continue
      }
      
      // Chercher les stats autour de ce champion dans le HTML (normalisé pour trouver le slug)
      const slugPattern = new RegExp(
        championSlug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[\\s\\S]{0,800}',
        'gi'
      )
      const contextMatch = slugPattern.exec(normalizedForUrls)
      
      if (contextMatch) {
        const context = contextMatch[0]
        console.log(`🔍 Contexte trouvé pour ${championName}:`, context.substring(0, 200))
        
        // Extraire winrate (format: "75%", "67%")
        const wrMatch = context.match(/(\d+)%/)
        const winrate = wrMatch ? parseFloat(wrMatch[1]) : null
        
        // Extraire games (format: "8", "6 parties", "8 Parties")
        const gamesMatch1 = context.match(/\b([1-9]\d{0,2})\b/)
        const gamesMatch2 = context.match(/(\d+)\s*(?:parties|games|played)/i)
        const games = gamesMatch2 ? parseInt(gamesMatch2[1]) : (gamesMatch1 ? parseInt(gamesMatch1[1]) : null)
        
        if (winrate || games) {
          if (!champions.find(c => c.name.toLowerCase() === championName.toLowerCase())) {
            champions.push({ name: championName, winrate, games })
            console.log(`✅ Champion trouvé: ${championName} (${winrate || 'N/A'}%, ${games || 'N/A'} parties)`)
          }
        }
      }
    }


    // Trier par nombre de parties (desc), puis par winrate (desc)
    champions.sort((a, b) => {
      // Priorité 1: Nombre de parties
      if (a.games && b.games) {
        const diff = b.games - a.games
        if (diff !== 0) return diff
        // Si égalité de parties, trier par winrate
        if (a.winrate && b.winrate) return b.winrate - a.winrate
        return 0
      }
      if (a.games && !b.games) return -1
      if (!a.games && b.games) return 1
      
      // Priorité 2: Winrate (si pas de games)
      if (a.winrate && b.winrate) return b.winrate - a.winrate
      if (a.winrate && !b.winrate) return -1
      if (!a.winrate && b.winrate) return 1
      
      return 0
    })

    // Limiter à 5
    const top5 = champions.slice(0, 5)
    
    console.log('📊 Top 5 champions extraits:', top5)
    
    return top5
  } catch (error) {
    console.error('Erreur extraction champions dpm.lol:', error)
    return []
  }
}

/**
 * Formate un nom de champion depuis un slug
 * Ex: "DrMundo" -> "Dr. Mundo", "LeeSin" -> "Lee Sin", "Jayce" -> "Jayce"
 */
function formatChampionName(slug) {
  if (!slug) return ''
  
  // Noms spéciaux (format dpm.lol utilise souvent CamelCase)
  const specialNames = {
    'drmundo': 'Dr. Mundo',
    'drMundo': 'Dr. Mundo',
    'DrMundo': 'Dr. Mundo',
    'leesin': 'Lee Sin',
    'leeSin': 'Lee Sin',
    'LeeSin': 'Lee Sin',
    'monkeyking': 'Wukong',
    'monkeyKing': 'Wukong',
    'MonkeyKing': 'Wukong',
    'jarvaniv': 'Jarvan IV',
    'jarvanIv': 'Jarvan IV',
    'JarvanIv': 'Jarvan IV',
    'jarvanIV': 'Jarvan IV',
    'masteryi': 'Master Yi',
    'masterYi': 'Master Yi',
    'MasterYi': 'Master Yi',
    'missfortune': 'Miss Fortune',
    'missFortune': 'Miss Fortune',
    'MissFortune': 'Miss Fortune',
    'tahmkench': 'Tahm Kench',
    'tahmKench': 'Tahm Kench',
    'TahmKench': 'Tahm Kench',
    'twistedfate': 'Twisted Fate',
    'twistedFate': 'Twisted Fate',
    'TwistedFate': 'Twisted Fate',
    'xinzhao': 'Xin Zhao',
    'xinZhao': 'Xin Zhao',
    'XinZhao': 'Xin Zhao',
    'aurelionsol': 'Aurelion Sol',
    'aurelionSol': 'Aurelion Sol',
    'AurelionSol': 'Aurelion Sol',
  }
  
  const lowerSlug = slug.toLowerCase()
  if (specialNames[lowerSlug] || specialNames[slug]) {
    return specialNames[lowerSlug] || specialNames[slug]
  }
  
  // Détecter CamelCase et le convertir
  // Ex: "LeeSin" -> "Lee Sin", "DrMundo" -> "Dr Mundo"
  if (/[a-z][A-Z]/.test(slug)) {
    // CamelCase détecté
    return slug
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/Dr /, 'Dr. ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
      .replace(/Dr /, 'Dr. ')
  }
  
  // Formater normalement (snake_case ou kebab-case)
  return slug
    .split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
    .replace(/Dr /, 'Dr. ')
}
