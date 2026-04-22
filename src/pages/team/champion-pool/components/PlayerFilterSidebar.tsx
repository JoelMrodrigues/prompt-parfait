/**
 * Sidebar de filtrage par joueur (Pool champ, Statistiques)
 * Optionnel : bouton ALL en premier. Puis Top, Jng, Mid, Adc, Sup (player_name ou pseudo du site)
 * noRoles=true : liste plate sans slots par rôle (équipes flex)
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
  noRoles = false,
}: {
  players?: any[]
  selectedId: string
  onSelect?: (id: string) => void
  showAllButton?: boolean
  noRoles?: boolean
}) => {
  const handlePlayer = (player: any) => onSelect?.(player?.id ?? null)
  const handleAll = () => onSelect?.(ALL_ID)

  const allButton = showAllButton && (
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
  )

  const entries = noRoles
    ? players.map((player) => ({
        key: player.id,
        onClick: () => handlePlayer(player),
        isSelected: selectedId === player?.id,
        label: null as string | null,
        displayName: player?.player_name || player?.pseudo || null,
        rank: player?.rank,
        rankImg: getRankImage(player?.rank),
      }))
    : ROLE_ORDER.map((role) => {
        const player = getPlayerByRole(players, role)
        return {
          key: role,
          onClick: () => handlePlayer(player),
          isSelected: selectedId === player?.id,
          label: ROLE_LABELS[role],
          displayName: player?.player_name || player?.pseudo || null,
          rank: player?.rank,
          rankImg: getRankImage(player?.rank),
        }
      })

  return (
    <>
      {/* Mobile: horizontal scrollable strip at the top */}
      <div className="md:hidden flex gap-2 overflow-x-auto border-b border-dark-border bg-dark-card/50 px-3 py-2 shrink-0">
        {allButton && (
          <button
            onClick={handleAll}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-colors border ${
              selectedId === ALL_ID
                ? 'bg-accent-blue/20 border-accent-blue/50 text-accent-blue'
                : 'border-transparent text-gray-400 hover:bg-dark-bg'
            }`}
          >
            ALL
          </button>
        )}
        {entries.map((e) => (
          <button
            key={e.key}
            onClick={e.onClick}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors border ${
              e.isSelected
                ? 'bg-accent-blue/20 border-accent-blue/50 text-accent-blue'
                : 'border-transparent text-gray-400 hover:bg-dark-bg hover:text-white'
            }`}
          >
            {e.label && <span className="text-[10px] uppercase font-semibold opacity-60">{e.label}</span>}
            <span className="font-medium">{e.displayName || '—'}</span>
            {e.rankImg && <img src={e.rankImg} alt="" aria-hidden className="w-5 h-5 object-contain opacity-80" />}
          </button>
        ))}
      </div>

      {/* Desktop: vertical sidebar (unchanged) */}
      <aside className="hidden md:flex w-52 flex-shrink-0 border-r border-dark-border bg-dark-card/50 flex-col py-4 px-3">
        <div className="flex flex-col gap-1.5">
          {allButton}
          <div className="border-t border-dark-border/30 my-1" />
          {entries.map((e) => (
            <button
              key={e.key}
              onClick={e.onClick}
              className={`w-full px-3 py-2.5 rounded-xl text-left transition-colors ${
                e.isSelected
                  ? 'bg-accent-blue/20 border border-accent-blue/50'
                  : 'hover:bg-dark-bg border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  {e.label && (
                    <span className={`text-[10px] uppercase tracking-wider font-semibold ${e.isSelected ? 'text-accent-blue/70' : 'text-gray-600'}`}>
                      {e.label}
                    </span>
                  )}
                  <p className={`text-sm font-medium truncate leading-tight ${e.isSelected ? 'text-accent-blue' : e.displayName ? 'text-white' : 'text-gray-600'}`}>
                    {e.displayName || '—'}
                  </p>
                  {e.rank && !e.label && (
                    <p className="text-[10px] text-gray-600 truncate">{e.rank}</p>
                  )}
                </div>
                {e.rankImg && (
                  <img src={e.rankImg} alt="" aria-hidden className="w-9 h-9 object-contain shrink-0 opacity-80" />
                )}
              </div>
            </button>
          ))}
        </div>
      </aside>
    </>
  )
}
