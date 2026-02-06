/**
 * Boutons de filtre par rôle pour afficher les champions
 * ALL + Top, Jng, Mid, Adc, Sup
 */
import { ROLE_ORDER, ROLE_LABELS } from '../constants/roleOrder'

export const ChampionRoleFilter = ({ selectedRole, onSelect }) => {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => onSelect?.(null)}
        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
          selectedRole === null
            ? 'bg-accent-blue/20 text-accent-blue border border-accent-blue/50'
            : 'bg-dark-bg text-gray-400 hover:text-white border border-dark-border hover:border-dark-border/80'
        }`}
      >
        All
      </button>
      {ROLE_ORDER.map((role) => {
        const isSelected = selectedRole === role
        return (
          <button
            key={role}
            onClick={() => onSelect?.(role)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              isSelected
                ? 'bg-accent-blue/20 text-accent-blue border border-accent-blue/50'
                : 'bg-dark-bg text-gray-400 hover:text-white border border-dark-border hover:border-dark-border/80'
            }`}
          >
            {ROLE_LABELS[role]}
          </button>
        )
      })}
    </div>
  )
}
