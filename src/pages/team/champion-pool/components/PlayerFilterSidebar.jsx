/**
 * Sidebar de filtrage par joueur (Pool champ, Statistiques)
 * Optionnel : bouton ALL en premier. Puis Top, Jng, Mid, Adc, Sup (player_name ou pseudo du site)
 */
import { ROLE_ORDER, ROLE_LABELS } from '../constants/roleOrder'
import { getPlayerByRole } from '../utils/getPlayerByRole'

export const ALL_ID = 'all'

export const PlayerFilterSidebar = ({ players = [], selectedId, onSelect, showAllButton = false }) => {
  const handlePlayer = (player) => onSelect?.(player?.id ?? null)
  const handleAll = () => onSelect?.(ALL_ID)

  return (
    <aside className="w-48 flex-shrink-0 border-r border-dark-border bg-dark-card/50 flex flex-col py-4 px-3">
      <div className="flex flex-col gap-2">
        {showAllButton && (
          <button
            onClick={handleAll}
            className={`w-full px-3 py-2.5 rounded-lg text-left text-sm font-medium transition-colors ${
              selectedId === ALL_ID
                ? 'bg-accent-blue/20 text-accent-blue border border-accent-blue/50'
                : 'text-gray-400 hover:text-white hover:bg-dark-bg border border-transparent'
            }`}
          >
            ALL
          </button>
        )}
        {ROLE_ORDER.map((role) => {
          const player = getPlayerByRole(players, role)
          const label = ROLE_LABELS[role]
          const displayText = player?.player_name || player?.pseudo || label
          const isSelected = selectedId === player?.id

          return (
            <button
              key={role}
              onClick={() => handlePlayer(player)}
              className={`w-full px-3 py-2.5 rounded-lg text-left text-sm font-medium transition-colors truncate ${
                isSelected
                  ? 'bg-accent-blue/20 text-accent-blue border border-accent-blue/50'
                  : 'text-gray-400 hover:text-white hover:bg-dark-bg border border-transparent'
              }`}
              title={player ? `${label}: ${displayText}` : `${label}: Aucun joueur`}
            >
              {displayText}
            </button>
          )
        })}
      </div>
    </aside>
  )
}
