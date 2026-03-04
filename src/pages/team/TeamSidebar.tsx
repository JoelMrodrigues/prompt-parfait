/**
 * Sidebar de navigation pour la section Team
 * Groupée en 3 sections : Équipe | Analyse | Outils
 */
import { NavLink } from 'react-router-dom'
import {
  Home,
  Users,
  UserCircle,
  BarChart3,
  FileText,
  MessageSquare,
  Gamepad2,
  Upload,
  CalendarDays,
} from 'lucide-react'

const SIDEBAR_GROUPS = [
  {
    label: 'Équipe',
    items: [
      { id: 'overview', label: "Vue d'ensemble", icon: Home, path: '/team/overview' },
      { id: 'joueurs', label: 'Joueurs', icon: UserCircle, path: '/team/joueurs' },
      { id: 'champion-pool', label: 'Pool de Champions', icon: Users, path: '/team/champion-pool' },
    ],
  },
  {
    label: 'Analyse',
    items: [
      { id: 'matchs', label: 'Matchs', icon: Gamepad2, path: '/team/matchs' },
      { id: 'stats', label: 'Statistiques', icon: BarChart3, path: '/team/stats' },
      { id: 'import', label: 'Import', icon: Upload, path: '/team/import' },
    ],
  },
  {
    label: 'Outils',
    items: [
      { id: 'drafts', label: 'Drafts', icon: FileText, path: '/team/drafts' },
      { id: 'coaching', label: 'Coaching', icon: MessageSquare, path: '/team/coaching', soon: true },
      { id: 'planning', label: 'Planning', icon: CalendarDays, path: '/team/planning', soon: true },
    ],
  },
]

export const TeamSidebar = () => {
  return (
    <aside className="w-60 bg-dark-card border-r border-dark-border flex flex-col shrink-0">
      {/* Header */}
      <div className="px-5 py-5 border-b border-dark-border">
        <h2 className="font-display text-base font-bold text-white">Mon Équipe</h2>
      </div>

      {/* Navigation groupée */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-5">
        {SIDEBAR_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="px-3 mb-1.5 text-[10px] font-semibold tracking-widest text-gray-600 uppercase">
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon
                return (
                  <li key={item.id}>
                    <NavLink
                      to={item.path}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                          isActive
                            ? 'bg-accent-blue/15 text-accent-blue font-medium'
                            : 'text-gray-400 hover:text-white hover:bg-dark-bg/60'
                        }`
                      }
                    >
                      <Icon size={17} className="shrink-0" />
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.soon && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-dark-bg border border-dark-border text-gray-600">
                          Bientôt
                        </span>
                      )}
                    </NavLink>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  )
}
