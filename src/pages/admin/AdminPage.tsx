import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Shield, Search, Users, Swords, Trophy, Gamepad2, LogOut,
  ExternalLink, Loader2, LayoutGrid, List,
} from 'lucide-react'
import { useTeam } from '../team/hooks/useTeam'
import { useAuth } from '../../contexts/AuthContext'

const TYPE_META: Record<string, { label: string; icon: typeof Swords; color: string; bg: string }> = {
  scrim:  { label: 'Scrims',  icon: Swords,   color: 'text-accent-blue',  bg: 'bg-accent-blue/10' },
  flex:   { label: 'Flex',    icon: Users,    color: 'text-emerald-400',  bg: 'bg-emerald-500/10' },
  soloq:  { label: 'Solo Q',  icon: Trophy,   color: 'text-amber-400',    bg: 'bg-amber-500/10' },
  fun:    { label: 'Fun',     icon: Gamepad2, color: 'text-pink-400',     bg: 'bg-pink-500/10' },
}

export const AdminPage = () => {
  const { allTeams, switchTeam } = useTeam()
  const { user, signOut }        = useAuth()
  const navigate                 = useNavigate()

  const [search, setSearch]         = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [view, setView]             = useState<'grid' | 'list'>('grid')
  const [enteringId, setEnteringId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    let list = allTeams
    if (filterType !== 'all') list = list.filter(t => t.team_type === filterType)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(t => t.team_name.toLowerCase().includes(q))
    }
    return list
  }, [allTeams, filterType, search])

  const totalMembers = allTeams.reduce((s, t) => s + (t.member_count ?? 0), 0)

  const handleEnter = async (teamId: string) => {
    if (enteringId) return
    setEnteringId(teamId)
    try {
      await switchTeam(teamId)
      navigate('/team/overview')
    } finally {
      setEnteringId(null)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-dark-bg">
      {/* ── Header ── */}
      <header className="border-b border-red-500/20 bg-dark-card/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center">
              <Shield size={18} className="text-red-400" />
            </div>
            <div>
              <h1 className="font-display text-lg font-black text-white leading-tight">Panel Admin</h1>
              <p className="text-[11px] text-red-400/70">{user?.email}</p>
            </div>
          </div>

          {/* Stats */}
          <div className="hidden sm:flex items-center gap-6">
            <div className="text-center">
              <p className="text-xl font-black text-white">{allTeams.length}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">Équipes</p>
            </div>
            <div className="w-px h-8 bg-dark-border" />
            <div className="text-center">
              <p className="text-xl font-black text-white">{totalMembers}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">Membres</p>
            </div>
          </div>

          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dark-border text-sm text-gray-400 hover:text-red-400 hover:border-red-500/40 transition-colors"
          >
            <LogOut size={14} />
            <span className="hidden sm:inline">Déconnexion</span>
          </button>
        </div>
      </header>

      {/* ── Toolbar ── */}
      <div className="max-w-7xl mx-auto px-6 py-5 flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Rechercher une équipe…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-dark-card border border-dark-border rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-red-500/40 transition-colors"
          />
        </div>

        {/* Type filter */}
        <div className="flex items-center gap-1.5 bg-dark-card border border-dark-border rounded-lg p-1">
          {['all', 'scrim', 'flex', 'soloq', 'fun'].map(t => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                filterType === t
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {t === 'all' ? 'Tous' : TYPE_META[t]?.label ?? t}
            </button>
          ))}
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-1 bg-dark-card border border-dark-border rounded-lg p-1 ml-auto">
          <button
            onClick={() => setView('grid')}
            className={`p-1.5 rounded-md transition-colors ${view === 'grid' ? 'bg-dark-bg text-white' : 'text-gray-600 hover:text-gray-400'}`}
          >
            <LayoutGrid size={14} />
          </button>
          <button
            onClick={() => setView('list')}
            className={`p-1.5 rounded-md transition-colors ${view === 'list' ? 'bg-dark-bg text-white' : 'text-gray-600 hover:text-gray-400'}`}
          >
            <List size={14} />
          </button>
        </div>
      </div>

      {/* ── Teams ── */}
      <div className="max-w-7xl mx-auto px-6 pb-12">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-600">Aucune équipe trouvée</div>
        ) : view === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((team, i) => {
              const meta = TYPE_META[team.team_type ?? '']
              const Icon = meta?.icon ?? Swords
              return (
                <motion.div
                  key={team.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="bg-dark-card border border-dark-border rounded-2xl overflow-hidden hover:border-red-500/30 transition-colors group"
                >
                  {/* Card header */}
                  <div className="h-20 relative bg-gradient-to-br from-dark-bg to-dark-card flex items-center px-4 gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 overflow-hidden ${team.logo_url ? 'bg-white' : 'bg-dark-bg border border-dark-border'}`}
                      style={team.logo_url && team.logo_bg_color ? { backgroundColor: team.logo_bg_color === 'transparent' ? undefined : team.logo_bg_color } : undefined}
                    >
                      {team.logo_url
                        ? <img src={team.logo_url} alt="" className="w-full h-full object-contain p-1" />
                        : <span className="text-sm font-black text-gray-500">{(team.team_name || 'E').charAt(0)}</span>
                      }
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-white text-sm truncate">{team.team_name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {meta && (
                          <span className={`flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${meta.color} ${meta.bg}`}>
                            <Icon size={9} />
                            {meta.label}
                          </span>
                        )}
                        <span className="text-[10px] text-gray-500 flex items-center gap-1">
                          <Users size={9} />
                          {team.member_count ?? 0}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="px-4 py-3 flex items-center justify-between border-t border-dark-border/50">
                    <p className="text-[10px] text-gray-600">
                      {team.created_at
                        ? new Date(team.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: '2-digit' })
                        : '—'}
                    </p>
                    <button
                      onClick={() => handleEnter(team.id)}
                      disabled={!!enteringId}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-400 border border-red-500/30 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                    >
                      {enteringId === team.id
                        ? <Loader2 size={11} className="animate-spin" />
                        : <ExternalLink size={11} />
                      }
                      Accéder
                    </button>
                  </div>
                </motion.div>
              )
            })}
          </div>
        ) : (
          /* ── Vue liste ── */
          <div className="bg-dark-card border border-dark-border rounded-2xl overflow-hidden">
            <div className="grid grid-cols-[auto_1fr_120px_80px_100px] gap-4 px-4 py-2.5 border-b border-dark-border text-[10px] font-bold uppercase tracking-widest text-gray-600">
              <span className="w-8" />
              <span>Équipe</span>
              <span>Type</span>
              <span className="text-center">Membres</span>
              <span />
            </div>
            {filtered.map((team, i) => {
              const meta = TYPE_META[team.team_type ?? '']
              const Icon = meta?.icon ?? Swords
              return (
                <motion.div
                  key={team.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className="grid grid-cols-[auto_1fr_120px_80px_100px] gap-4 items-center px-4 py-3 border-b border-dark-border/40 last:border-0 hover:bg-dark-bg/40 transition-colors"
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden shrink-0 ${team.logo_url ? 'bg-white' : 'bg-dark-bg border border-dark-border'}`}>
                    {team.logo_url
                      ? <img src={team.logo_url} alt="" className="w-full h-full object-contain p-0.5" />
                      : <span className="text-xs font-black text-gray-500">{(team.team_name || 'E').charAt(0)}</span>
                    }
                  </div>
                  <span className="font-semibold text-sm text-white truncate">{team.team_name}</span>
                  {meta
                    ? <span className={`flex items-center gap-1.5 text-xs font-medium ${meta.color}`}><Icon size={12} />{meta.label}</span>
                    : <span className="text-xs text-gray-600">{team.team_type ?? '—'}</span>
                  }
                  <span className="text-sm text-gray-400 text-center">{team.member_count ?? 0}</span>
                  <div className="flex justify-end">
                    <button
                      onClick={() => handleEnter(team.id)}
                      disabled={!!enteringId}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-400 border border-red-500/30 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                    >
                      {enteringId === team.id ? <Loader2 size={11} className="animate-spin" /> : <ExternalLink size={11} />}
                      Accéder
                    </button>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
