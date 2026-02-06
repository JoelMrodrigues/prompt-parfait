/**
 * Scraper simple pour récupérer rank et top champions depuis dpm.lol
 * Tout dans un seul fichier pour la simplicité
 */

/**
 * Récupère le HTML depuis une URL via proxy CORS
 */
async function fetchHtml(url) {
  // Liste étendue de proxies CORS avec différents formats
  const proxies = [
    // Format 1: allorigins.win (JSON response)
    {
      url: `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
      parser: async (response) => {
        const data = await response.json()
        return data.contents || data.body || data.html || (typeof data === 'string' ? data : null)
      }
    },
    // Format 2: codetabs.com (JSON response)
    {
      url: `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
      parser: async (response) => {
        const data = await response.json()
        return data.contents || data.body || data.html || (typeof data === 'string' ? data : null)
      }
    },
    // Format 3: corsproxy.io (direct HTML, mais peut avoir des problèmes SSL)
    {
      url: `https://corsproxy.io/?${encodeURIComponent(url)}`,
      parser: async (response) => {
        return await response.text()
      }
    },
    // Format 4: thingproxy.freeboard.io (direct HTML)
    {
      url: `https://thingproxy.freeboard.io/fetch/${encodeURIComponent(url)}`,
      parser: async (response) => {
        return await response.text()
      }
    },
    // Format 5: cors-anywhere (alternative)
    {
      url: `https://cors-anywhere.herokuapp.com/${url}`,
      parser: async (response) => {
        return await response.text()
      }
    },
    // Format 6: yacdn.org
    {
      url: `https://api.yacdn.org/proxy/${encodeURIComponent(url)}`,
      parser: async (response) => {
        return await response.text()
      }
    },
    // Format 7: allorigins.win raw (sans JSON)
    {
      url: `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
      parser: async (response) => {
        return await response.text()
      }
    },
    // Format 8: cors.sh
    {
      url: `https://cors.sh/${encodeURIComponent(url)}`,
      parser: async (response) => {
        return await response.text()
      }
    },
    // Format 9: proxy.cors.sh
    {
      url: `https://proxy.cors.sh/${encodeURIComponent(url)}`,
      parser: async (response) => {
        return await response.text()
      }
    },
  ]

  for (const proxy of proxies) {
    try {
      console.log('🔄 Essai proxy:', proxy.url.substring(0, 80) + '...')
      
      // Timeout de 15 secondes par proxy
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000)
      
      const response = await fetch(proxy.url, {
        signal: controller.signal,
        headers: {
          'Accept': 'text/html,application/json',
        }
      })
      
      clearTimeout(timeoutId)
      
      if (!response.ok) {
        console.log(`⚠️ Proxy retourne ${response.status}:`, proxy.url.substring(0, 50))
        continue
      }

      const contentType = response.headers.get('content-type') || ''
      let html = null

      if (contentType.includes('application/json')) {
        html = await proxy.parser(response)
      } else {
        html = await response.text()
      }

      // Validation du HTML: doit être assez long et contenir des mots-clés
      // Réduire le seuil à 3000 caractères (certains proxies retournent moins mais peuvent contenir les données)
      const minLength = 3000
      const hasKeywords = html && (
        html.includes('summoner') || 
        html.includes('tier') || 
        html.includes('rank') || 
        html.includes('champion') ||
        html.includes('dpm') ||
        html.includes('league') ||
        html.includes('Master') ||
        html.includes('Diamond') ||
        html.includes('LP') ||
        html.includes('winrate') ||
        html.includes('games') ||
        html.includes('parties')
      )
      
      if (html && html.length >= minLength) {
        if (hasKeywords) {
          console.log('✅ Proxy fonctionne:', proxy.url.substring(0, 50), `(${html.length} caractères)`)
          return html
        } else {
          // Si le HTML est assez long mais sans keywords, on l'accepte quand même
          // (peut-être que les données sont là mais avec d'autres mots-clés)
          console.log('⚠️ HTML sans keywords mais assez long, on accepte:', html.length, 'caractères')
          return html
        }
      } else {
        console.log('⚠️ HTML trop court:', html?.length || 0, 'caractères (minimum:', minLength, ')')
      }
    } catch (error) {
      // Ignorer les erreurs SSL, timeout, etc. et essayer le proxy suivant
      if (error.name === 'AbortError') {
        console.log('⏱️ Timeout proxy:', proxy.url.substring(0, 50))
      } else if (error.message?.includes('CERT') || error.message?.includes('SSL')) {
        console.log('🔒 Erreur SSL proxy:', proxy.url.substring(0, 50))
      } else {
        console.log('❌ Erreur proxy:', error.message, proxy.url.substring(0, 50))
      }
      continue
    }
  }

  throw new Error('Impossible de récupérer le HTML - tous les proxies ont échoué')
}

/**
 * Génère l'URL dpm.lol depuis le pseudo
 * Format: https://dpm.lol/{pseudo}/champions?queue=solo (page dédiée champions)
 * Le pseudo garde les espaces encodés et les # deviennent des -
 */
function generateDpmUrl(pseudo) {
  // Format: https://dpm.lol/Marcel%20le%20Zgeg-BACK/champions?queue=solo
  // Convertir # en - et encoder les espaces
  const formattedPseudo = pseudo.replace(/#/g, '-')
  return `https://dpm.lol/${encodeURIComponent(formattedPseudo)}/champions?queue=solo`
}

/**
 * Extrait le rank depuis le HTML de dpm.lol
 */
function extractRank(html) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')

  console.log('🔍 Extraction rank dpm.lol...')

  // Chercher le rank - dpm.lol a probablement une structure différente
  // Chercher "Master 344 LP" ou similaire
  const patternWithLP = /(master|grandmaster|challenger|diamond|emerald|platinum|gold|silver|bronze|iron)\s+(\d+)\s*LP/gi

  // Chercher dans tout le document
  const bodyText = doc.body?.textContent || ''
  const matches = Array.from(bodyText.matchAll(patternWithLP))
  
  if (matches.length > 0) {
    // Prioriser Master/Grandmaster/Challenger
    const priorityRanks = matches
      .map(m => m[0].trim())
      .filter(r => 
        r.toLowerCase().includes('master') || 
        r.toLowerCase().includes('grandmaster') || 
        r.toLowerCase().includes('challenger')
      )
    
    if (priorityRanks.length > 0) {
      console.log('✅ Rank prioritaire trouvé:', priorityRanks[0])
      return priorityRanks[0]
    }
    
    console.log('✅ Rank trouvé:', matches[0][0].trim())
    return matches[0][0].trim()
  }

  // Fallback: chercher sans LP
  const patternWithoutLP = /(master|grandmaster|challenger|diamond|emerald|platinum|gold|silver|bronze|iron)\s+(\d+)/gi
  const matchesWithoutLP = Array.from(bodyText.matchAll(patternWithoutLP))
  if (matchesWithoutLP.length > 0) {
    console.log('⚠️ Rank trouvé (sans LP):', matchesWithoutLP[0][0].trim())
    return matchesWithoutLP[0][0].trim()
  }

  console.warn('⚠️ Aucun rank trouvé')
  return null
}

// Import de la fonction d'extraction des champions depuis le fichier séparé
import { extractChampionsFromDpm } from './dpmChampionsExtractor.js'

/**
 * Fonction principale : récupère rank et champions depuis dpm.lol
 * Si VITE_DPM_API_URL est défini, utilise l'API backend (recommandé, évite CORS).
 * Sinon utilise les proxies CORS + extraction côté client.
 */
export async function fetchDpmData(pseudo, region = null, dpmUrl = null) {
  if (!dpmUrl && !pseudo) {
    console.error('Pseudo requis, ou URL dpm.lol')
    return null
  }

  const apiBase = import.meta.env.VITE_DPM_API_URL
  if (apiBase && pseudo) {
    try {
      const url = `${apiBase.replace(/\/$/, '')}/api/dpm?pseudo=${encodeURIComponent(pseudo.trim().replace(/#/g, '-'))}`
      console.log('📊 Récupération via API backend:', url)
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000)
      const response = await fetch(url, { signal: controller.signal })
      clearTimeout(timeoutId)
      if (!response.ok) throw new Error(`API ${response.status}`)
      const data = await response.json()
      if (!data.success) throw new Error(data.error || 'API error')
      console.log('✅ API:', data.rank, data.topChampions?.length ?? 0, 'champions')
      return {
        rank: data.rank || null,
        topChampions: data.topChampions?.length ? data.topChampions : null,
      }
    } catch (err) {
      console.warn('⚠️ API backend indisponible, fallback proxies:', err.message)
      // Continue avec le flux proxy ci-dessous
    }
  }

  try {
    // URL pour la page principale (pour le rank)
    const formattedPseudo = pseudo.replace(/#/g, '-')
    const mainUrl = dpmUrl?.includes('/champions') 
      ? dpmUrl.replace('/champions', '')
      : dpmUrl || `https://dpm.lol/${encodeURIComponent(formattedPseudo)}?queue=solo`
    
    // URL pour la page champions (plus simple à parser)
    const championsUrl = dpmUrl?.includes('/champions')
      ? dpmUrl
      : `https://dpm.lol/${encodeURIComponent(formattedPseudo)}/champions?queue=solo`
    
    console.log('📊 Récupération rank depuis:', mainUrl)
    console.log('📊 Récupération champions depuis:', championsUrl)
    
    // Récupérer le HTML de la page principale pour le rank
    const mainHtml = await fetchHtml(mainUrl)
    console.log('✅ HTML principal récupéré:', mainHtml.length, 'caractères')

    // Extraire le rank depuis la page principale
    const rank = extractRank(mainHtml)
    console.log('📊 Rank extrait:', rank)

    // Récupérer le HTML de la page champions
    const championsHtml = await fetchHtml(championsUrl)
    console.log('✅ HTML champions récupéré:', championsHtml.length, 'caractères')

    // Extraire les champions depuis la page dédiée (async)
    const topChampions = await extractChampionsFromDpm(championsHtml)
    console.log('📊 Champions extraits:', topChampions.length)

    return {
      rank: rank || null,
      topChampions: topChampions.length > 0 ? topChampions : null,
    }
  } catch (error) {
    console.error('Erreur récupération dpm.lol:', error)
    return null
  }
}
