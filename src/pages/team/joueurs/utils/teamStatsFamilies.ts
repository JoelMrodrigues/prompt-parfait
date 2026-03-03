/**
 * Familles de stats Team (alignées sur All Stats, sans runes).
 * Utilisé pour Statistiques (agrégat) et cohérence d'affichage.
 */

export const IGNORED_STAT_KEYS = new Set(
  [
    'causedEarlySurrender',
    'combatPlayerScore',
    'earlySurrenderAccomplice',
    'gameEndedInSurrender',
    'gameEndedInEarlySurrender',
    'neutralMinionsKilledEnemyJungle',
    'neutralMinionsKilledTeamJungle',
    'objectivePlayerScore',
    'playerSubteamId',
    'sightWardsBoughtInGame',
    'subteamPlacement',
    'teamEarlySurrendered',
    'totalPlayerScore',
    'totalScoreRank',
    'unrealKills',
  ].map((k) => k.toLowerCase())
)

export function isStatKeyIgnored(key: string): boolean {
  const kl = key.toLowerCase()
  if (IGNORED_STAT_KEYS.has(kl)) return true
  if (kl.startsWith('playeraugment')) return true
  if (kl.startsWith('playerscore')) return true
  if (kl.startsWith('perkvar')) return true
  return false
}

/** Ordre des familles pour l'affichage */
export const STAT_FAMILY_ORDER = [
  'Performance',
  'Combat',
  'Dégâts',
  'Farm & Or',
  'Vision',
  'Objectifs',
  'Soins & Boucliers',
  'Contrôle',
  'Autres',
] as const

/** Labels français pour les clés courantes (sinon on formate la clé) */
const KEY_LABELS: Record<string, string> = {
  kills: 'Kills',
  deaths: 'Morts',
  assists: 'Assists',
  firstBloodKill: 'First Blood (kill)',
  firstBloodAssist: 'First Blood (assist)',
  doubleKills: 'Double kills',
  tripleKills: 'Triple kills',
  quadraKills: 'Quadra kills',
  pentaKills: 'Penta kills',
  killingSprees: 'Killing sprees',
  largestKillingSpree: 'Plus grande série de kills',
  totalDamageDealtToChampions: 'Dégâts aux champions',
  physicalDamageDealtToChampions: 'Dégâts physiques aux champions',
  magicDamageDealtToChampions: 'Dégâts magiques aux champions',
  trueDamageDealtToChampions: 'Dégâts purs aux champions',
  totalDamageDealt: 'Dégâts totaux infligés',
  physicalDamageDealt: 'Dégâts physiques infligés',
  magicDamageDealt: 'Dégâts magiques infligés',
  trueDamageDealt: 'Dégâts purs infligés',
  totalDamageTaken: 'Dégâts reçus',
  physicalDamageTaken: 'Dégâts physiques reçus',
  magicDamageTaken: 'Dégâts magiques reçus',
  trueDamageTaken: 'Dégâts purs reçus',
  damageSelfMitigated: 'Dégâts mitigés (soi)',
  totalMinionsKilled: 'Minions tués',
  neutralMinionsKilled: 'Monstres neutres tués',
  goldEarned: 'Or gagné',
  goldSpent: 'Or dépensé',
  visionScore: 'Score de vision',
  visionWardsBoughtInGame: 'Pink wards achetés',
  wardsPlaced: 'Wards placés',
  wardsKilled: 'Wards détruits',
  turretKills: 'Tourelles détruites',
  inhibitorKills: 'Inhibiteurs détruits',
  dragonKills: 'Dragons',
  baronKills: 'Barons',
  totalHeal: 'Soins totaux',
  totalHealsOnTeammates: 'Soins sur alliés',
  totalUnitsHealed: 'Unités soignées',
  timeCCingOthers: 'Temps de CC infligé (s)',
  totalTimeCCDealt: 'Durée totale CC infligé (s)',
  longestTimeSpentLiving: 'Plus long temps en vie (s)',
  win: 'Victoire',
}

function getFamilyForKey(key: string): (typeof STAT_FAMILY_ORDER)[number] {
  const kl = key.toLowerCase()
  if (kl === 'win') return 'Performance'
  if (['kills', 'deaths', 'assists', 'firstblood', 'double', 'triple', 'quadra', 'penta', 'killingspree', 'largestkilling'].some((x) => kl.includes(x))) return 'Combat'
  if (['damage', 'dealt', 'taken', 'mitigated'].some((x) => kl.includes(x))) return 'Dégâts'
  if (['minions', 'neutral', 'gold', 'cs'].some((x) => kl.includes(x))) return 'Farm & Or'
  if (['vision', 'ward'].some((x) => kl.includes(x))) return 'Vision'
  if (['turret', 'inhibitor', 'dragon', 'baron', 'tower'].some((x) => kl.includes(x))) return 'Objectifs'
  if (['heal', 'shield'].some((x) => kl.includes(x))) return 'Soins & Boucliers'
  if (['cc', 'timecc', 'stun'].some((x) => kl.includes(x))) return 'Contrôle'
  return 'Autres'
}

export function getStatLabel(key: string): string {
  return KEY_LABELS[key] ?? key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()).trim()
}

export function getStatFamily(key: string): (typeof STAT_FAMILY_ORDER)[number] {
  return getFamilyForKey(key)
}

/** Groupe une liste de clés par famille (ordre fixe) */
export function groupKeysByFamily(keys: string[]): Map<(typeof STAT_FAMILY_ORDER)[number], string[]> {
  const map = new Map<(typeof STAT_FAMILY_ORDER)[number], string[]>()
  for (const k of keys) {
    const fam = getFamilyForKey(k)
    if (!map.has(fam)) map.set(fam, [])
    map.get(fam)!.push(k)
  }
  for (const fam of STAT_FAMILY_ORDER) {
    const list = map.get(fam)
    if (list) list.sort((a, b) => a.localeCompare(b))
  }
  return map
}

export function formatStatValue(key: string, value: unknown, isAverage = true): string {
  if (value === undefined || value === null) return '—'
  if (typeof value === 'boolean') return value ? 'Oui' : 'Non'
  const n = Number(value)
  if (Number.isNaN(n)) return String(value)
  const kl = key.toLowerCase()
  if (kl.includes('percent') || kl.includes('pct')) return `${n.toFixed(1)}%`
  if (n >= 0 && n <= 1 && (kl.includes('kill') || kl.includes('assist') || kl.includes('blood') || kl === 'win'))
    return `${(n * 100).toFixed(0)}%`
  if (n >= 1e6) return (n / 1e6).toFixed(1) + ' M'
  if (n >= 1e3) return n.toLocaleString('fr-FR', { maximumFractionDigits: 0 })
  if (Number.isInteger(n)) return String(n)
  return n.toFixed(1)
}
