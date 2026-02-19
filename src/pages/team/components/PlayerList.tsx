/**
 * Liste des joueurs de l'équipe — grille par rôle ou liste triée
 */
import { PlayerCard } from './PlayerCard'
import { ROSTER_ROLES, ROLE_LABELS } from '../constants/roles'
import { Users } from 'lucide-react'

function normalizeRole(position: string | null | undefined): string {
  const r = (position || '').toUpperCase()
  return r === 'BOT' ? 'ADC' : r
}

export const PlayerList = ({
  players,
  onEdit,
  onDelete,
}: {
  players: any[]
  onEdit: (p: any) => void
  onDelete: (p: any) => void
}) => {
  const byRole = (() => {
    const map: Record<string, any[]> = { TOP: [], JNG: [], MID: [], ADC: [], SUP: [] }
    players.forEach((p) => {
      const role = normalizeRole(p.position)
      if (map[role]) map[role].push(p)
    })
    ROSTER_ROLES.forEach((r) => map[r].sort((a, b) => (a.player_name || '').localeCompare(b.player_name || '')))
    return map
  })()

  if (players.length === 0) {
    return (
      <div className="bg-dark-card border border-dark-border rounded-2xl p-12 text-center">
        <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
        <p className="text-gray-400 mb-2">Aucun joueur</p>
        <p className="text-gray-600 text-sm">Ajoutez votre premier joueur pour commencer.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
      {ROSTER_ROLES.map((role) => (
        <div key={role}>
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            {ROLE_LABELS[role] || role}
          </h4>
          <div className="space-y-4">
            {byRole[role].map((player) => (
              <PlayerCard
                key={player.id}
                player={player}
                onEdit={() => onEdit(player)}
                onDelete={() => onDelete(player)}
              />
            ))}
            {byRole[role].length === 0 && (
              <div className="rounded-xl border border-dashed border-dark-border/50 p-6 text-center">
                <p className="text-gray-600 text-sm">Aucun joueur</p>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
