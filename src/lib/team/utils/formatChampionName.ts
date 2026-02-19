/**
 * Formate le nom du champion depuis un slug
 * Ex: "kaisa" -> "Kai'Sa", "dr-mundo" -> "Dr. Mundo"
 */
export function formatChampionName(slug) {
  if (!slug) return ''

  // Liste des champions avec apostrophes et points
  const specialNames = {
    kaisa: "Kai'Sa",
    kogmaw: "Kog'Maw",
    velkoz: "Vel'Koz",
    'rek sai': "Rek'Sai",
    chogath: "Cho'Gath",
    khazix: "Kha'Zix",
    drmundo: 'Dr. Mundo',
    masteryi: 'Master Yi',
    missfortune: 'Miss Fortune',
    tahmkench: 'Tahm Kench',
    twistedfate: 'Twisted Fate',
    xinzhao: 'Xin Zhao',
    jarvaniv: 'Jarvan IV',
    leeblanc: 'LeBlanc',
  }

  // Nettoyer le slug
  const cleanSlug = slug.toLowerCase().replace(/-/g, '').replace(/_/g, '')

  // Vérifier si c'est un nom spécial
  if (specialNames[cleanSlug]) {
    return specialNames[cleanSlug]
  }

  // Sinon, capitaliser la première lettre et remplacer les tirets par des espaces
  return slug
    .split(/[-_]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}
