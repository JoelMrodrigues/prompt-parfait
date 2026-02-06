/**
 * Sidebar interne de la page détail joueur
 * Général, Solo Q, Team, Best Champs, Tableau Solo Q / Team, Points forts / faibles
 */
import { User, Swords, Users, Trophy, Table2, Plus, Minus } from 'lucide-react'
import { PLAYER_DETAIL_SECTIONS } from '../constants/playerDetailSections'

const SECTION_ICONS = {
  user: User,
  solo: Swords,
  team: Users,
  champ: Trophy,
  table: Table2,
  plus: Plus,
  minus: Minus,
}

export const PlayerDetailSidebar = ({ selectedSection, onSelect }) => {
  return (
    <aside className="w-48 flex-shrink-0 border-r border-dark-border bg-dark-card/50 flex flex-col py-4 px-3">
      <nav className="flex flex-col gap-1">
        {PLAYER_DETAIL_SECTIONS.map((section) => {
          const Icon = SECTION_ICONS[section.icon] || User
          const isSelected = selectedSection === section.id

          return (
            <button
              key={section.id}
              onClick={() => onSelect?.(section.id)}
              className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-left text-sm font-medium transition-colors ${
                isSelected
                  ? 'bg-accent-blue/20 text-accent-blue border border-accent-blue/50'
                  : 'text-gray-400 hover:text-white hover:bg-dark-bg border border-transparent'
              }`}
            >
              <Icon size={16} className="flex-shrink-0" />
              <span className="truncate">{section.label}</span>
            </button>
          )
        })}
      </nav>
    </aside>
  )
}
