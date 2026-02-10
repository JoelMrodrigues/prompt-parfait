/**
 * Sidebar de navigation pour la page Team
 */
import { NavLink } from 'react-router-dom'
import { 
  Home, 
  Users, 
  UserCircle,
  BarChart3, 
  FileText, 
  MessageSquare,
  ChevronRight,
  Gamepad2,
  Upload,
  CalendarDays
} from 'lucide-react'

const SIDEBAR_ITEMS = [
  { id: 'overview', label: 'Vue d\'ensemble', icon: Home, path: '/team/overview' },
  { id: 'joueurs', label: 'Joueurs', icon: UserCircle, path: '/team/joueurs' },
  { id: 'matchs', label: 'Matchs', icon: Gamepad2, path: '/team/matchs' },
  { id: 'stats', label: 'Statistiques', icon: BarChart3, path: '/team/stats' },
  { id: 'import', label: 'Import', icon: Upload, path: '/team/import' },
  { id: 'champion-pool', label: 'Pool de Champions', icon: Users, path: '/team/champion-pool' },
  { id: 'drafts', label: 'Drafts', icon: FileText, path: '/team/drafts' },
  { id: 'coaching', label: 'Coaching', icon: MessageSquare, path: '/team/coaching' },
  { id: 'planning', label: 'Planning', icon: CalendarDays, path: '/team/planning' },
]

export const TeamSidebar = () => {
  return (
    <aside className="w-64 bg-dark-card border-r border-dark-border flex flex-col">
      {/* Logo/Title */}
      <div className="p-6 border-b border-dark-border">
        <h2 className="font-display text-xl font-bold text-white">Mon Équipe</h2>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {SIDEBAR_ITEMS.map((item) => {
            const Icon = item.icon
            return (
              <li key={item.id}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-accent-blue/20 text-accent-blue border border-accent-blue/50'
                        : 'text-gray-400 hover:text-white hover:bg-dark-bg'
                    }`
                  }
                >
                  <Icon size={20} />
                  <span className="flex-1">{item.label}</span>
                  <ChevronRight size={16} className="opacity-50" />
                </NavLink>
              </li>
            )
          })}
        </ul>
      </nav>
    </aside>
  )
}
