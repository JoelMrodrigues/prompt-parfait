/**
 * Détection automatique de blocs de scrim à partir d'une liste de parties.
 * Algorithme : groupe les parties consécutives séparées de moins de 3h.
 * Fonction pure — aucun appel réseau.
 */
import type { DetectedBlock } from '../../types/matchBlocks'

interface MatchLike {
  id: string
  game_id: number | string
  game_creation: number | null
  game_duration?: number | null
}

const THREE_HOURS_MS = 3 * 60 * 60 * 1000

export function detectBlocks(matches: MatchLike[]): DetectedBlock[] {
  if (!matches.length) return []

  // Trier par date de création croissante
  const sorted = [...matches]
    .filter((m) => m.game_creation != null)
    .sort((a, b) => (a.game_creation ?? 0) - (b.game_creation ?? 0))

  if (!sorted.length) return []

  const groups: MatchLike[][] = []
  let current: MatchLike[] = [sorted[0]]

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]
    const curr = sorted[i]
    const prevEnd = (prev.game_creation ?? 0) + (prev.game_duration ?? 0) * 1000
    const gap = (curr.game_creation ?? 0) - prevEnd
    if (gap <= THREE_HOURS_MS) {
      current.push(curr)
    } else {
      if (current.length >= 2) groups.push(current)
      current = [curr]
    }
  }
  if (current.length >= 2) groups.push(current)

  return groups.map((group) => {
    const first = group[0].game_creation ?? 0
    const last = group[group.length - 1].game_creation ?? 0
    const dateStr = new Date(first).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
    return {
      suggestedName: `Scrim — ${dateStr}`,
      matchGameIds: group.map((m) => Number(m.game_id)),
      firstGameAt: first,
      lastGameAt: last,
    }
  })
}
