/**
 * Sidebar de filtrage par joueur (Pool champ, Statistiques)
 * Optionnel : bouton ALL en premier. Puis Top, Jng, Mid, Adc, Sup (player_name ou pseudo du site)
 */
import { ROLE_ORDER, ROLE_LABELS } from '../constants/roleOrder'
import { getPlayerByRole } from '../utils/getPlayerByRole'
import { getRankImage } from '../../joueurs/utils/playerDetailHelpers'

export const ALL_ID = 'all'

export const PlayerFilterSidebar = ({
  players = [],
  selectedId,
  onSelect,
  showAllButton = false,
}) => {
  const handlePlayer = (player) => onSelect?.(player?.id ?? null)
  const handleAll = () => onSelect?.(ALL_ID)

  return (
    <aside className="w-52 flex-shrink-0 border-r border-dark-border bg-dark-card/50 flex flex-col py-4 px-3">
      <div className="flex flex-col gap-1.5">
        {showAllButton && (
          <button
            onClick={handleAll}
            className={`w-full px-3 py-3 rounded-xl text-left transition-colors ${
              selectedId === ALL_ID
                ? 'bg-accent-blue/20 border border-accent-blue/50'
                : 'hover:bg-dark-bg border border-transparent'
            }`}
          >
            <span className={`text-xs uppercase tracking-wider font-bold ${selectedId === ALL_ID ? 'text-accent-blue' : 'text-gray-400'}`}>
              ALL
            </span>
            <p className="text-[10px] text-gray-500 font-normal mt-0.5">Tous les joueurs</p>
          </button>
        )}

        <div className="border-t border-dark-border/30 my-1" />

        {ROLE_ORDER.map((role) => {
          const player = getPlayerByRole(players, role)
          const label = ROLE_LABELS[role]
          const displayName = player?.player_name || player?.pseudo || null
          const rankImg = getRankImage(player?.rank)
          const isSelected = selectedId === player?.id

          return (
            <button
              key={role}
              onClick={() => handlePlayer(player)}
              className={`w-full px-3 py-2.5 rounded-xl text-left transition-colors ${
                isSelected
                  ? 'bg-accent-blue/20 border border-accent-blue/50'
                  : 'hover:bg-dark-bg border border-transparent'
              }`}
              title={player ? `${label}: ${displayName}` : `${label}: Aucun joueur`}
            >
              <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <span className={`text-[10px] uppercase tracking-wider font-semibold ${isSelected ? 'text-accent-blue/70' : 'text-gray-600'}`}>
                    {label}
                  </span>
                  <p className={`text-sm font-medium truncate leading-tight ${isSelected ? 'text-accent-blue' : displayName ? 'text-white' : 'text-gray-600'}`}>
                    {displayName || '—'}
                  </p>
                </div>
                {rankImg && (
                  <img src={rankImg} alt="" aria-hidden className="w-9 h-9 object-contain shrink-0 opacity-80" />
                )}
              </div>
            </button>
          )
        })}
      </div>
    </aside>
  )
}
