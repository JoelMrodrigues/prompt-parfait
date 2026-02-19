/**
 * Formate un rank Riot en chaîne lisible
 * Ex: ("MASTER", "", 454) → "Master 454 LP"
 *     ("DIAMOND", "II", 32) → "Diamond II 32 LP"
 */
export function formatRank(tier, rank, lp) {
  const t = (tier || '').toLowerCase().replace(/^./, (c) => c.toUpperCase())
  if (['Master', 'Grandmaster', 'Challenger'].includes(t)) return `${t} ${lp} LP`
  return rank ? `${t} ${rank} ${lp} LP` : `${t} ${lp} LP`
}

/**
 * Formate un slug champion dpm.lol en nom affichable
 * Ex: "DrMundo" → "Dr. Mundo", "LeeSin" → "Lee Sin"
 */
export function formatChampionName(slug) {
  if (!slug) return ''

  const specialNames = {
    drmundo: 'Dr. Mundo',
    leesin: 'Lee Sin',
    monkeyking: 'Wukong',
    jarvaniv: 'Jarvan IV',
    masteryi: 'Master Yi',
    missfortune: 'Miss Fortune',
    tahmkench: 'Tahm Kench',
    twistedfate: 'Twisted Fate',
    xinzhao: 'Xin Zhao',
    aurelionsol: 'Aurelion Sol',
    kaisa: "Kai'Sa",
    kogmaw: "Kog'Maw",
    velkoz: "Vel'Koz",
    chogath: "Cho'Gath",
    khazix: "Kha'Zix",
    leeblanc: 'LeBlanc',
  }

  const lower = slug.toLowerCase()
  if (specialNames[lower]) return specialNames[lower]

  // CamelCase → "Lee Sin"
  if (/[a-z][A-Z]/.test(slug)) {
    return slug
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ')
      .replace(/Dr /, 'Dr. ')
  }

  return slug
    .split(/[-_]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
    .replace(/Dr /, 'Dr. ')
}
