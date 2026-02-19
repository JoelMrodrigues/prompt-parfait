/**
 * Rôles partagés (Joueurs, Vue d'ensemble, Roster, etc.)
 * BOT est mappé sur ADC à l'usage.
 */
export const ROSTER_ROLES = ['TOP', 'JNG', 'MID', 'ADC', 'SUP'] as const

export const ROLE_LABELS: Record<string, string> = {
  TOP: 'Top',
  JNG: 'Jungle',
  MID: 'Mid',
  ADC: 'ADC',
  SUP: 'Support',
  BOT: 'ADC',
}

export const ROLE_CONFIG: Record<string, { label: string; text: string; gradient: string }> = {
  TOP: { label: 'Top', text: 'text-blue-400', gradient: 'from-blue-600/20 to-transparent' },
  JNG: { label: 'Jungle', text: 'text-green-400', gradient: 'from-green-600/20 to-transparent' },
  MID: { label: 'Mid', text: 'text-yellow-400', gradient: 'from-yellow-600/20 to-transparent' },
  ADC: { label: 'ADC', text: 'text-red-400', gradient: 'from-red-600/20 to-transparent' },
  SUP: { label: 'Support', text: 'text-purple-400', gradient: 'from-purple-600/20 to-transparent' },
  BOT: { label: 'ADC', text: 'text-red-400', gradient: 'from-red-600/20 to-transparent' },
}
