/**
 * Sidebar de navigation pour la section Team
 * Groupée en 3 sections : Équipe | Analyse | Outils
 * + Team switcher en haut
 */
import { useState, useRef, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import {
  Home,
  Users,
  UserCircle,
  BarChart3,
  FileText,
  MessageSquare,
  Gamepad2,
  CalendarDays,
  ChevronDown,
  Plus,
  Check,
  Swords,
  Settings,
  Upload,
  FlaskConical,
} from 'lucide-react'
import { useTeam } from './hooks/useTeam'
import { TeamEditModal } from './components/TeamEditModal'

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
      { id: 'import', label: 'Import', icon: Upload, path: '/team/import' },
      { id: 'matchs', label: 'Matchs', icon: Gamepad2, path: '/team/matchs' },
      { id: 'stats', label: 'Statistiques', icon: BarChart3, path: '/team/stats' },
      { id: 'test', label: 'Test', icon: FlaskConical, path: '/team/test' },
    ],
  },
  {
    label: 'Outils',
    items: [
      { id: 'drafts', label: 'Drafts', icon: FileText, path: '/team/drafts' },
      { id: 'coaching', label: 'Coaching', icon: MessageSquare, path: '/team/coaching' },
      { id: 'planning', label: 'Planning', icon: CalendarDays, path: '/team/planning' },
    ],
  },
]

export const TeamSidebar = () => {
  const { team, allTeams, switchTeam, createNewTeam, isTeamOwner } = useTeam()
  const [switcherOpen, setSwitcherOpen] = useState(false)
  const [creatingTeam, setCreatingTeam] = useState(false)
  const [newTeamName, setNewTeamName] = useState('')
  const [creating, setCreating] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const switcherRef = useRef<HTMLDivElement>(null)

  // Fermer au clic extérieur
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (switcherRef.current && !switcherRef.current.contains(e.target as Node)) {
        setSwitcherOpen(false)
        setCreatingTeam(false)
        setNewTeamName('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSwitch = async (teamId: string) => {
    setSwitcherOpen(false)
    await switchTeam(teamId)
  }

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTeamName.trim() || creating) return
    setCreating(true)
    try {
      await createNewTeam(newTeamName.trim())
      setNewTeamName('')
      setCreatingTeam(false)
      setSwitcherOpen(false)
    } catch (err) {
      console.error('Erreur création équipe:', err)
    } finally {
      setCreating(false)
    }
  }

  return (
    <aside className="w-60 bg-dark-card border-r border-dark-border flex flex-col shrink-0">
      {/* Team Switcher */}
      <div className="px-3 py-3 border-b border-dark-border" ref={switcherRef}>
        <div className="flex items-center gap-1">
        <button
          onClick={() => setSwitcherOpen((v) => !v)}
          aria-expanded={switcherOpen}
          className="flex-1 flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-dark-bg/60 transition-colors"
        >
          <div className={`w-7 h-7 rounded-md shrink-0 flex items-center justify-center overflow-hidden ${team?.logo_url ? 'bg-white' : 'bg-accent-blue/20'}`}>
            {team?.logo_url ? (
              <img src={team.logo_url} alt={team.team_name} width={28} height={28} className="w-full h-full object-contain p-0.5" />
            ) : team?.team_name ? (
              <span className="text-[11px] font-bold text-accent-blue leading-none">
                {team.team_name.slice(0, 2).toUpperCase()}
              </span>
            ) : (
              <Swords size={14} className="text-accent-blue" />
            )}
          </div>
          <span className="flex-1 text-sm font-semibold text-white truncate text-left">
            {team?.team_name ?? 'Mon Équipe'}
          </span>
          <ChevronDown
            size={14}
            className={`text-gray-500 shrink-0 transition-transform ${switcherOpen ? 'rotate-180' : ''}`}
          />
        </button>
        {isTeamOwner && (
          <button
            type="button"
            onClick={() => setEditModalOpen(true)}
            className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-dark-bg/60 transition-colors shrink-0"
            title="Paramètres de l'équipe"
            aria-label="Paramètres de l'équipe"
          >
            <Settings size={14} />
          </button>
        )}
        </div>

        {/* Dropdown switcher */}
        {switcherOpen && (
          <div className="mt-1.5 bg-dark-bg border border-dark-border rounded-lg overflow-hidden shadow-xl">
            {allTeams.length > 0 && (
              <ul className="py-1">
                {allTeams.map((t) => (
                  <li key={t.id}>
                    <button
                      onClick={() => handleSwitch(t.id)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-dark-card transition-colors"
                    >
                      <div className={`w-5 h-5 rounded shrink-0 flex items-center justify-center overflow-hidden ${t.logo_url ? 'bg-white' : 'bg-accent-blue/15'}`}>
                        {t.logo_url ? (
                          <img src={t.logo_url} alt={t.team_name} width={20} height={20} className="w-full h-full object-contain p-0.5" />
                        ) : (
                          <span className="text-[9px] font-bold text-accent-blue/80 leading-none">
                            {(t.team_name || 'E').slice(0, 2).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <span
                        className={`flex-1 truncate text-left ${
                          t.id === team?.id ? 'text-white font-medium' : 'text-gray-400'
                        }`}
                      >
                        {t.team_name}
                      </span>
                      {t.id === team?.id && (
                        <Check size={13} className="text-accent-blue shrink-0" />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="border-t border-dark-border/60 p-2">
              {!creatingTeam ? (
                <button
                  onClick={() => setCreatingTeam(true)}
                  className="w-full flex items-center gap-2 px-2 py-2 text-xs text-gray-400 hover:text-white hover:bg-dark-card rounded-lg transition-colors"
                >
                  <Plus size={13} />
                  Nouvelle équipe
                </button>
              ) : (
                <form onSubmit={handleCreateTeam} className="flex gap-1.5">
                  <input
                    autoFocus
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    placeholder="Nom de l'équipe"
                    className="flex-1 bg-dark-card border border-dark-border rounded-lg px-2 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-accent-blue"
                  />
                  <button
                    type="submit"
                    disabled={!newTeamName.trim() || creating}
                    className="px-2 py-1.5 bg-accent-blue rounded-lg text-xs font-medium disabled:opacity-50"
                  >
                    {creating ? '…' : 'OK'}
                  </button>
                </form>
              )}
            </div>
          </div>
        )}
      </div>

      {editModalOpen && <TeamEditModal onClose={() => setEditModalOpen(false)} />}

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
