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
  LineChart,
  PanelLeftOpen,
  ShieldCheck,
  Map,
} from 'lucide-react'
import { useTeam } from './hooks/useTeam'
import { TeamEditModal } from './components/TeamEditModal'
import { CreateTeamModal } from '../teams/components/CreateTeamModal'
import { useSyncStatus } from '../../lib/syncStatus'
import { useLayout } from '../../contexts/LayoutContext'
import { RefreshCw } from 'lucide-react'

const SIDEBAR_GROUPS = [
  {
    label: 'Équipe',
    items: [
      { id: 'overview', label: "Vue d'ensemble", icon: Home, path: '/team/overview' },
      { id: 'joueurs', label: 'Joueurs', icon: UserCircle, path: '/team/joueurs' },
      { id: 'champion-pool', label: 'Pool de Champions', icon: Users, path: '/team/champion-pool' },
      { id: 'members', label: 'Membres', icon: ShieldCheck, path: '/team/members', managerOnly: true },
    ],
  },
  {
    label: 'Analyse',
    items: [
      { id: 'import', label: 'Import', icon: Upload, path: '/team/import', hideForSpectateur: true, hideForFlex: true },
      { id: 'matchs', label: 'Matchs', icon: Gamepad2, path: '/team/matchs' },
      { id: 'analyse', label: 'Analyse', icon: LineChart, path: '/team/analyse', hideForSpectateur: true },
      { id: 'stats', label: 'Statistiques', icon: BarChart3, path: '/team/stats' },
    ],
  },
  {
    label: 'Outils',
    items: [
      { id: 'drafts', label: 'Drafts', icon: FileText, path: '/team/drafts', hideForSpectateur: true },
      { id: 'coaching', label: 'Coaching', icon: MessageSquare, path: '/team/coaching', hideForSpectateur: true },
      { id: 'planning', label: 'Planning', icon: CalendarDays, path: '/team/planning', hideForSpectateur: true },
      { id: 'plans', label: 'Plans', icon: Map, path: '/team/plans', hideForSpectateur: true },
    ],
  },
]

export const TeamSidebar = () => {
  const { team, allTeams, switchTeam, createNewTeam, updateTeam, isTeamOwner, myRole, canManageTeam } = useTeam()
  const isFlexTeam = team?.team_type === 'flex'
  const { sidebarOpen, setSidebarOpen } = useLayout()
  const { isSyncing, currentPlayer, currentIndex, totalPlayers, isSecondaryPass, lastCycleAt } = useSyncStatus()
  const [, setTick] = useState(0)
  const [switcherOpen, setSwitcherOpen] = useState(false)
  const [switchingTeamId, setSwitchingTeamId] = useState<string | null>(null)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const switcherRef = useRef<HTMLDivElement>(null)

  const filterItem = (item: any) => {
    if (item.managerOnly && !canManageTeam) return false
    if (item.hideForSpectateur && myRole === 'spectateur') return false
    if (item.hideForFlex && isFlexTeam) return false
    return true
  }

  // Rafraîchir le label "il y a X min" chaque minute quand pas en cours de sync
  useEffect(() => {
    if (isSyncing || !lastCycleAt) return
    const interval = setInterval(() => setTick((t) => t + 1), 60000)
    return () => clearInterval(interval)
  }, [isSyncing, lastCycleAt])

  // Fermer au clic extérieur
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (switcherRef.current && !switcherRef.current.contains(e.target as Node)) {
        setSwitcherOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const lastSyncLabel = lastCycleAt
    ? (() => {
        const mins = Math.floor((Date.now() - lastCycleAt) / 60000)
        return mins < 1 ? "Sync à l'instant" : `Sync il y a ${mins} min`
      })()
    : 'En attente de sync…'

  const handleSwitch = async (teamId: string) => {
    if (switchingTeamId || teamId === team?.id) return
    setSwitchingTeamId(teamId)
    setSwitcherOpen(false)
    try {
      await switchTeam(teamId)
    } finally {
      setSwitchingTeamId(null)
    }
  }

  return (
    <aside
      className="bg-dark-card border-r border-dark-border flex flex-col shrink-0 overflow-hidden"
      style={{ width: sidebarOpen ? '15rem' : '2.5rem', transition: 'width 300ms ease' }}
    >
      {/* Mini strip — icônes seules quand sidebar repliée */}
      {!sidebarOpen && (
        <div className="flex flex-col items-center py-3 gap-1 w-10">
          <button
            onClick={() => setSidebarOpen(true)}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-600 hover:text-white hover:bg-dark-bg/60 transition-colors mb-1"
            title="Ouvrir la navigation"
          >
            <PanelLeftOpen size={15} />
          </button>
          <div className="w-5 h-px bg-dark-border/60 mb-1" />
          {SIDEBAR_GROUPS.flatMap((g) => g.items).filter(filterItem).map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.id}
                to={item.path}
                title={item.label}
                className={({ isActive }) =>
                  `w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
                    isActive
                      ? 'bg-accent-blue/15 text-accent-blue'
                      : 'text-gray-600 hover:text-gray-300 hover:bg-dark-bg/60'
                  }`
                }
              >
                <Icon size={15} />
              </NavLink>
            )
          })}
        </div>
      )}
      {/* Full sidebar — visible uniquement quand sidebarOpen */}
      <div
        className="flex flex-col flex-1 overflow-hidden"
        style={{ display: sidebarOpen ? 'flex' : 'none' }}
      >
      {/* Team Switcher */}
      <div className="px-3 py-3 border-b border-dark-border" ref={switcherRef}>
        <div className="flex items-center gap-1">
        <button
          onClick={() => setSwitcherOpen((v) => !v)}
          aria-expanded={switcherOpen}
          className="flex-1 flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-dark-bg/60 transition-colors"
        >
          <div
            className={`w-7 h-7 rounded-md shrink-0 flex items-center justify-center overflow-hidden ${team?.logo_url ? '' : 'bg-accent-blue/20'}`}
            style={team?.logo_url ? {
              backgroundColor: team.logo_bg_color === 'transparent' ? undefined : (team.logo_bg_color || '#ffffff'),
              backgroundImage: team.logo_bg_color === 'transparent'
                ? 'repeating-conic-gradient(#374151 0% 25%, #1f2937 0% 50%) 0 0 / 8px 8px'
                : undefined,
            } : undefined}
          >
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
                      disabled={!!switchingTeamId}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-dark-card transition-colors disabled:opacity-60"
                    >
                      <div
                        className={`w-5 h-5 rounded shrink-0 flex items-center justify-center overflow-hidden ${t.logo_url ? '' : 'bg-accent-blue/15'}`}
                        style={t.logo_url ? {
                          backgroundColor: t.logo_bg_color === 'transparent' ? undefined : (t.logo_bg_color || '#ffffff'),
                          backgroundImage: t.logo_bg_color === 'transparent'
                            ? 'repeating-conic-gradient(#374151 0% 25%, #1f2937 0% 50%) 0 0 / 8px 8px'
                            : undefined,
                        } : undefined}
                      >
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
                      {switchingTeamId === t.id ? (
                        <span className="w-3 h-3 border-2 border-accent-blue/40 border-t-accent-blue rounded-full animate-spin shrink-0" />
                      ) : t.id === team?.id ? (
                        <Check size={13} className="text-accent-blue shrink-0" />
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="border-t border-dark-border/60 p-2">
              <button
                onClick={() => { setSwitcherOpen(false); setCreateModalOpen(true) }}
                className="w-full flex items-center gap-2 px-2 py-2 text-xs text-gray-400 hover:text-white hover:bg-dark-card rounded-lg transition-colors"
              >
                <Plus size={13} />
                Nouvelle équipe
              </button>
            </div>
          </div>
        )}
      </div>

      {editModalOpen && <TeamEditModal onClose={() => setEditModalOpen(false)} />}
      {createModalOpen && (
        <CreateTeamModal
          onClose={() => setCreateModalOpen(false)}
          onCreate={createNewTeam}
          onUpdateTeam={updateTeam}
        />
      )}

      {/* Indicateur auto-sync */}
      <div className="px-3 py-2 border-b border-dark-border/40">
        {isSyncing ? (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <RefreshCw size={11} className="text-emerald-400 animate-spin shrink-0" />
              <span className="text-[10px] text-emerald-400 font-medium truncate flex-1">
                {currentPlayer}{isSecondaryPass && <span className="text-emerald-400/60"> (alt)</span>}
              </span>
              {totalPlayers > 0 && (
                <span className="text-[10px] text-gray-500 shrink-0 tabular-nums">
                  {currentIndex}/{totalPlayers}
                </span>
              )}
            </div>
            {totalPlayers > 0 && (
              <div className="h-0.5 rounded-full bg-dark-bg overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-400/70 transition-all duration-500"
                  style={{ width: `${Math.round(((currentIndex - 1) / totalPlayers) * 100)}%` }}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-700 shrink-0" />
            <span className="text-[10px] text-gray-600 truncate">{lastSyncLabel}</span>
          </div>
        )}
      </div>

      {/* Navigation groupée */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-5">
        {SIDEBAR_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="px-3 mb-1.5 text-[10px] font-semibold tracking-widest text-gray-600 uppercase">
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.items.filter(filterItem).map((item) => {
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
                      {('soon' in item) && (item as any).soon && (
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
      </div>{/* end full sidebar */}
    </aside>
  )
}
