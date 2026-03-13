/**
 * Générateurs de liens vers sites externes LoL (op.gg, dpm.lol)
 * + mappings régions Riot ↔ op.gg
 */

// Mapping région Riot (euw1) → région op.gg (euw)
export const RIOT_TO_OPGG: Record<string, string> = {
  euw1: 'euw',
  eun1: 'eune',
  na1: 'na',
  kr: 'kr',
  br1: 'br',
  la1: 'lan',
  la2: 'las',
  oc1: 'oce',
  tr1: 'tr',
  ru: 'ru',
  jp1: 'jp',
}

// Mapping inverse op.gg → Riot (pour rétro-compatibilité avec anciens opgg_link)
export const OPGG_TO_RIOT: Record<string, string> = Object.fromEntries(
  Object.entries(RIOT_TO_OPGG).map(([riot, opgg]) => [opgg, riot])
)

export function generateOpggLink(pseudo: string, riotRegion: string): string {
  if (!pseudo || !riotRegion) return ''
  const opggRegion = RIOT_TO_OPGG[riotRegion] || riotRegion
  return `https://op.gg/fr/lol/summoners/${opggRegion}/${encodeURIComponent(pseudo.replace(/#/g, '-'))}`
}

export function generateDpmLink(pseudo: string | null | undefined): string {
  if (!pseudo) return ''
  return `https://dpm.lol/${encodeURIComponent(pseudo.replace(/#/g, '-'))}?queue=solo`
}
