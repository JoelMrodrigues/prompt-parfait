/**
 * Extrait le pseudo et la région depuis l'URL OP.gg
 * Formats supportés:
 * - https://www.op.gg/summoners/{region}/{pseudo}
 * - https://op.gg/summoners/{region}/{pseudo}
 * - https://www.op.gg/summoners/{region}/{pseudo}?region={region}
 */
export function parseOpggUrl(url) {
  if (!url) {
    console.error('URL vide')
    return null
  }
  
  try {
    // Nettoyer l'URL (enlever les espaces, etc.)
    let cleanUrl = url.trim()
    
    // Si l'URL ne commence pas par http, l'ajouter
    if (!cleanUrl.startsWith('http')) {
      cleanUrl = 'https://' + cleanUrl
    }
    
    const urlObj = new URL(cleanUrl)
    
    // Vérifier que c'est bien un domaine OP.gg
    if (!urlObj.hostname.includes('op.gg')) {
      console.error('URL n\'est pas un domaine OP.gg:', urlObj.hostname)
      return null
    }
    
    const parts = urlObj.pathname.split('/').filter(p => p)
    console.log('Parts de l\'URL:', parts)
    
    // Format 1: /summoners/{region}/{pseudo} (ancien format)
    if (parts.length >= 3 && parts[0] === 'summoners') {
      const region = parts[1]
      const summonerName = decodeURIComponent(parts[2])
      
      console.log('URL parsée (format 1):', { region, summonerName })
      return {
        region,
        summonerName
      }
    }
    
    // Format 2: /fr/lol/summoners/{region}/{pseudo} (nouveau format avec langue)
    // ou /{lang}/lol/summoners/{region}/{pseudo}
    const summonersIndex = parts.findIndex(p => p === 'summoners')
    if (summonersIndex !== -1 && parts.length >= summonersIndex + 3) {
      const region = parts[summonersIndex + 1]
      let summonerName = decodeURIComponent(parts[summonersIndex + 2])
      
      // Détecter si le nom contient un tiret qui pourrait être un tag Riot ID
      // Format OP.gg: "Marcel le Zgeg-BACK" -> Riot ID: "Marcel le Zgeg#BACK"
      // On cherche le dernier tiret qui pourrait séparer le nom du tag
      const lastDashIndex = summonerName.lastIndexOf('-')
      if (lastDashIndex > 0 && lastDashIndex < summonerName.length - 1) {
        // Le tag est généralement court (2-5 caractères) et en majuscules
        const potentialTag = summonerName.substring(lastDashIndex + 1)
        if (potentialTag.length >= 2 && potentialTag.length <= 5 && /^[A-Z0-9]+$/.test(potentialTag)) {
          const gameName = summonerName.substring(0, lastDashIndex).trim()
          const tagLine = potentialTag
          
          console.log('URL parsée (format 2 avec tag détecté):', { region, gameName, tagLine })
          return {
            region,
            summonerName: `${gameName}#${tagLine}`, // Format Riot ID avec #
            gameName,
            tagLine
          }
        }
      }
      
      console.log('URL parsée (format 2):', { region, summonerName })
      return {
        region,
        summonerName
      }
    }
    
    // Format alternatif: /summoner/userName={pseudo} (ancien format)
    if (parts.length >= 2 && parts[0] === 'summoner') {
      const userNameParam = urlObj.searchParams.get('userName') || parts[1]
      const region = urlObj.searchParams.get('region') || 'euw'
      
      return {
        region,
        summonerName: decodeURIComponent(userNameParam)
      }
    }
    
    console.error('Format d\'URL OP.gg non reconnu:', urlObj.pathname)
    console.error('Parts:', parts)
    return null
  } catch (e) {
    console.error('Erreur parsing OP.gg URL:', e, 'URL:', url)
    return null
  }
}
