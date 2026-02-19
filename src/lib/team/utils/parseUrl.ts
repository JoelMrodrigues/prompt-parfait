/**
 * Extrait le pseudo et la région depuis l'URL OP.gg
 * Formats supportés:
 * - https://www.op.gg/summoners/{region}/{pseudo}
 * - https://op.gg/summoners/{region}/{pseudo}
 * - https://www.op.gg/fr/lol/summoners/{region}/{pseudo}
 */
export function parseOpggUrl(url) {
  if (!url) return null

  try {
    let cleanUrl = url.trim()
    if (!cleanUrl.startsWith('http')) cleanUrl = 'https://' + cleanUrl

    const urlObj = new URL(cleanUrl)

    if (!urlObj.hostname.includes('op.gg')) return null

    const parts = urlObj.pathname.split('/').filter(Boolean)

    // Format: /summoners/{region}/{pseudo}
    if (parts.length >= 3 && parts[0] === 'summoners') {
      return { region: parts[1], summonerName: decodeURIComponent(parts[2]) }
    }

    // Format: /fr/lol/summoners/{region}/{pseudo}
    const summonersIndex = parts.findIndex((p) => p === 'summoners')
    if (summonersIndex !== -1 && parts.length >= summonersIndex + 3) {
      const region = parts[summonersIndex + 1]
      const summonerName = decodeURIComponent(parts[summonersIndex + 2])

      // Détecter le tag Riot ID (ex: "Marcel-BACK" → "Marcel#BACK")
      const lastDashIndex = summonerName.lastIndexOf('-')
      if (lastDashIndex > 0) {
        const potentialTag = summonerName.substring(lastDashIndex + 1)
        if (
          potentialTag.length >= 2 &&
          potentialTag.length <= 5 &&
          /^[A-Z0-9]+$/.test(potentialTag)
        ) {
          const gameName = summonerName.substring(0, lastDashIndex).trim()
          return {
            region,
            summonerName: `${gameName}#${potentialTag}`,
            gameName,
            tagLine: potentialTag,
          }
        }
      }

      return { region, summonerName }
    }

    // Format alternatif: /summoner/?userName={pseudo}
    if (parts.length >= 2 && parts[0] === 'summoner') {
      const userNameParam = urlObj.searchParams.get('userName') || parts[1]
      const region = urlObj.searchParams.get('region') || 'euw'
      return { region, summonerName: decodeURIComponent(userNameParam) }
    }

    return null
  } catch {
    return null
  }
}
