/**
 * Corrige les rôles adverses à partir des données déjà en base (sans ré-importer le JSON).
 * Applique les mêmes heuristiques que le parser : 2 TOP/0 MID → 1 MID, UNKNOWN → rôles manquants, 2 JUNGLE → 1 TOP.
 */

const ROLE_ORDER = ['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT']

function countRoles(participants) {
  const count = { TOP: 0, JUNGLE: 0, MID: 0, ADC: 0, SUPPORT: 0, UNKNOWN: 0 }
  for (const p of participants) {
    const r = (p.role || '').toUpperCase().replace('JNG', 'JUNGLE').replace('SUP', 'SUPPORT')
    if (ROLE_ORDER.includes(r)) count[r]++
    else count.UNKNOWN++
  }
  return count
}

/**
 * @param {Array<{ id: string, participant_id: number, role: string, cs?: number }>} enemyParticipants - participants adverses (team_side === 'enemy')
 * @returns {Array<{ id: string, role: string }>} liste des { id, role } à mettre à jour (rôle final par id)
 */
export function computeEnemyRoleFixes(enemyParticipants) {
  if (!enemyParticipants?.length) return []
  const list = enemyParticipants.map((p) => ({
    ...p,
    participant_id: p.participant_id ?? 0,
    role: (p.role || '').trim() || 'UNKNOWN',
    cs: p.cs ?? 0,
  }))

  // 2 JUNGLE → le second (par participant_id) devient TOP
  let count = countRoles(list)
  if (count.JUNGLE >= 2) {
    const jungles = list.filter((p) => (p.role || '').toUpperCase().replace('JNG', 'JUNGLE') === 'JUNGLE')
    const sorted = [...jungles].sort((a, b) => a.participant_id - b.participant_id)
    if (sorted.length >= 2) sorted[1].role = 'TOP'
  }

  // 2 TOP + 0 MID → celui avec le plus de CS devient MID
  count = countRoles(list)
  if (count.TOP === 2 && count.MID === 0) {
    const tops = list.filter((p) => (p.role || '').toUpperCase() === 'TOP')
    const byCs = [...tops].sort((a, b) => (b.cs ?? 0) - (a.cs ?? 0))
    if (byCs.length >= 1) byCs[0].role = 'MID'
  }

  // UNKNOWN → attribuer les rôles manquants par ordre participant_id
  count = countRoles(list)
  if (count.UNKNOWN > 0) {
    const missing = ROLE_ORDER.filter((r) => count[r] === 0)
    if (missing.length > 0) {
      const unknowns = list.filter((p) => {
        const r = (p.role || '').toUpperCase().replace('JNG', 'JUNGLE').replace('SUP', 'SUPPORT')
        return !ROLE_ORDER.includes(r)
      })
      const sorted = [...unknowns].sort((a, b) => a.participant_id - b.participant_id)
      const toAssign = Math.min(sorted.length, missing.length)
      for (let i = 0; i < toAssign; i++) sorted[i].role = missing[i]
    }
  }

  const initial = new Map(enemyParticipants.map((p) => [p.id, (p.role || '').trim() || 'UNKNOWN']))
  return list.filter((p) => (initial.get(p.id) || '').toUpperCase() !== (p.role || '').toUpperCase()).map((p) => ({ id: p.id, role: p.role }))
}
