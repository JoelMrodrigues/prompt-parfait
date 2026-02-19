/**
 * Liste des joueurs de l'équipe
 */
import { PlayerCard } from './PlayerCard'

export const PlayerList = ({ players, onEdit, onDelete, onSync }) => {
  // Organiser les joueurs par rôle
  const playersByRole = {
    TOP: [],
    JNG: [],
    MID: [],
    ADC: [],
    SUP: [],
  }

  players.forEach((player) => {
    const role = player.position?.toUpperCase()
    if (playersByRole[role]) {
      playersByRole[role].push(player)
    }
  })

  // Ordre d'affichage des rôles
  const roleOrder = ['TOP', 'JNG', 'MID', 'ADC', 'SUP']
  const roleLabels = {
    TOP: 'Top',
    JNG: 'Jungle',
    MID: 'Mid',
    ADC: 'ADC',
    SUP: 'Support',
  }

  return (
    <div className="space-y-8">
      {/* Première ligne: TOP, JUNGLE, MID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {['TOP', 'JNG', 'MID'].map((role) => (
          <div key={role}>
            <h4 className="text-sm font-semibold text-gray-400 mb-3 uppercase">
              {roleLabels[role]}
            </h4>
            <div className="space-y-4">
              {playersByRole[role].map((player) => (
                <PlayerCard
                  key={player.id}
                  player={player}
                  onEdit={() => onEdit(player)}
                  onDelete={() => onDelete(player)}
                  onSyncOpgg={onSync ? () => onSync(player) : undefined}
                />
              ))}
              {playersByRole[role].length === 0 && (
                <div className="text-center text-gray-500 py-8 border border-dashed border-dark-border rounded-lg">
                  Aucun joueur
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Deuxième ligne: ADC et SUP (centrés) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        {['ADC', 'SUP'].map((role) => (
          <div key={role}>
            <h4 className="text-sm font-semibold text-gray-400 mb-3 uppercase">
              {roleLabels[role]}
            </h4>
            <div className="space-y-4">
              {playersByRole[role].map((player) => (
                <PlayerCard
                  key={player.id}
                  player={player}
                  onEdit={() => onEdit(player)}
                  onDelete={() => onDelete(player)}
                  onSyncOpgg={onSync ? () => onSync(player) : undefined}
                />
              ))}
              {playersByRole[role].length === 0 && (
                <div className="text-center text-gray-500 py-8 border border-dashed border-dark-border rounded-lg">
                  Aucun joueur
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
