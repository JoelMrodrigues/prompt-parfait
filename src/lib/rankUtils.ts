const TIERS = [
  'iron', 'bronze', 'silver', 'gold', 'platinum',
  'emerald', 'diamond', 'master', 'grandmaster', 'challenger',
] as const

const DIVISIONS = ['IV', 'III', 'II', 'I'] as const

/** Extracts LP from a rank string (e.g. "Master 614 LP" → 614). Returns null if not found. */
export function parseLpFromRank(rank: string | null | undefined): number | null {
  if (!rank) return null
  const m = rank.match(/(\d+)\s*LP/i)
  return m ? parseInt(m[1], 10) : null
}

/** Same as parseLpFromRank but returns 0 instead of null — for sort/arithmetic contexts. */
export function parseLP(rank: string | null | undefined): number {
  return parseLpFromRank(rank) ?? 0
}

/** Returns a numeric sort value for a rank string. Higher value = better rank. */
export function rankToSortValue(rank: string | null | undefined): number {
  if (!rank) return -1
  const r = rank.toLowerCase()
  const tierIdx = TIERS.findIndex((t) => r.includes(t))
  const divIdx = DIVISIONS.findIndex(
    (d) => rank.includes(` ${d} `) || rank.includes(` ${d}`) || rank.endsWith(d),
  )
  return (tierIdx >= 0 ? tierIdx * 400 : 0) + (divIdx >= 0 ? divIdx * 100 : 0) + parseLP(rank)
}

/** Strips the LP portion from a rank string (e.g. "Diamond I 72 LP" → "Diamond I"). */
export function stripLP(rank: string | null | undefined): string {
  if (!rank) return '—'
  return rank.replace(/\s*\d+\s*LP/i, '').trim()
}
