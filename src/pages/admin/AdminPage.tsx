import { useState, useMemo, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Shield, Search, Users, Swords, Trophy, Gamepad2, LogOut,
  ExternalLink, Loader2, LayoutGrid, List, X, Check, UserCircle,
  Calendar, ChevronRight, Trash2,
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { logAdminAction } from '../../lib/adminLog'
import type { Team } from '../../contexts/TeamContext'

const TYPE_META: Record<string, { label: string; icon: typeof Swords; color: string; bg: string }> = {
  scrim: { label: 'Scrims', icon: Swords,   color: 'text-accent-blue',  bg: 'bg-accent-blue/10' },
  flex:  { label: 'Flex',   icon: Users,    color: 'text-emerald-400',  bg: 'bg-emerald-500/10' },
  soloq: { label: 'Solo Q', icon: Trophy,   color: 'text-amber-400',    bg: 'bg-amber-500/10' },
  fun:   { label: 'Fun',    icon: Gamepad2, color: 'text-pink-400',     bg: 'bg-pink-500/10' },
}

const FEATURES = [
  { key: 'champion_pool', label: 'Pool Champions' },
  { key: 'import',        label: 'Import' },
  { key: 'matchs',        label: 'Matchs' },
  { key: 'analyse',       label: 'Analyse' },
  { key: 'stats',         label: 'Statistiques' },
  { key: 'drafts',        label: 'Drafts' },
  { key: 'coaching',      label: 'Coaching' },
  { key: 'planning',      label: 'Planning' },
  { key: 'plans',         label: 'Plans' },
]

interface TeamDetail {
  members: { user_id: string; role: string; display_name: string | null }[]
  players: { id: string; player_name: string; position: string | null }[]
  matchCount: number
  features: Record<string, boolean>
}

export const AdminPage = () => {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [allTeams, setAllTeams] = useState<Team[]>([])
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [enteringId, setEnteringId] = useState<string | null>(null)
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [detail, setDetail] = useState<TeamDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [savingFeature, setSavingFeature] = useState<string | null>(null)
  const [deletingTeam, setDeletingTeam] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const loadTeams = useCallback(async () => {
    if (!supabase) return
    const { data } = await supabase
      .from('teams')
      .select('*, team_members(count)')
      .order('created_at', { ascending: true })
    if (!data) return
    setAllTeams(data.map((t: any) => ({
      ...t,
      member_count: (t?.team_members?.[0]?.count ?? 0) + 1,
      team_members: undefined,
    })))
  }, [])

  useEffect(() => { loadTeams() }, [loadTeams])

  const openDetail = async (team: Team) => {
    setSelectedTeam(team)
    setDetail(null)
    setDetailLoading(true)
    setConfirmDelete(false)
    if (!supabase) return
    const [
      { data: membersRaw },
      { data: players },
      { count: matchCount },
      { data: teamData },
    ] = await Promise.all([
      supabase.from('team_members').select('user_id, role').eq('team_id', team.id),
      supabase.from('players').select('id, player_name, position').eq('team_id', team.id),
      supabase.from('team_matches').select('*', { count: 'exact', head: true }).eq('team_id', team.id),
      supabase.from('teams').select('features').eq('id', team.id).single(),
    ])
    const userIds = (membersRaw || []).map((m: any) => m.user_id)
    let profileMap: Record<string, string> = {}
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles').select('id, display_name').in('id', userIds)
      for (const p of profiles || []) profileMap[p.id] = p.display_name
    }
    setDetail({
      members: (membersRaw || []).map((m: any) => ({
        user_id: m.user_id, role: m.role, display_name: profileMap[m.user_id] ?? null,
      })),
      players: players || [],
      matchCount: matchCount ?? 0,
      features: teamData?.features || {},
    })
    setDetailLoading(false)
  }

  const toggleFeature = async (featureKey: string) => {
    if (!selectedTeam || !detail || !supabase) return
    setSavingFeature(featureKey)
    const current = detail.features[featureKey] !== false
    const newFeatures = { ...detail.features, [featureKey]: !current }
    const { error } = await supabase.from('teams').update({ features: newFeatures }).eq('id', selectedTeam.id)
    if (!error) {
      setDetail(d => d ? { ...d, features: newFeatures } : d)
      setAllTeams(prev => prev.map(t => t.id === selectedTeam.id ? { ...t, features: newFeatures } : t))
    }
    setSavingFeature(null)
  }

  const deleteTeam = async () => {
    if (!selectedTeam || !supabase) return
    setDeletingTeam(true)
    const { error } = await supabase.rpc('delete_team_admin', { target_team_id: selectedTeam.id })
    if (!error) {
      logAdminAction('delete_team', 'team', selectedTeam.id, { team_name: selectedTeam.team_name })
      setAllTeams(prev => prev.filter(t => t.id !== selectedTeam.id))
      setSelectedTeam(null)
      setDetail(null)
    }
    setDeletingTeam(false)
    setConfirmDelete(false)
  }

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
    if (enteringId || !user) return
    setEnteringId(teamId)
    try {
      await supabase!.from('profiles').update({ active_team_id: teamId }).eq('id', user.id)
      sessionStorage.setItem('adminTeamView', 'true')
      window.location.href = '/team/overview'
    } catch {
      setEnteringId(null)
    }
  }

  return (
    <div className="min-h-screen bg-dark-bg flex">
      {/* ── Main content ── */}
      <div className="flex-1 min-w-0">
        {/* Header */}
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
              onClick={async () => { await signOut(); navigate('/login') }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dark-border text-sm text-gray-400 hover:text-red-400 hover:border-red-500/40 transition-colors"
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">Déconnexion</span>
            </button>
          </div>
        </header>

        {/* Toolbar */}
        <div className="max-w-7xl mx-auto px-6 py-5 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text" placeholder="Rechercher une équipe…" value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-dark-card border border-dark-border rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-red-500/40 transition-colors"
            />
          </div>
          <div className="flex items-center gap-1.5 bg-dark-card border border-dark-border rounded-lg p-1">
            {['all', 'scrim', 'flex', 'soloq', 'fun'].map(t => (
              <button key={t} onClick={() => setFilterType(t)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${filterType === t ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'text-gray-500 hover:text-gray-300'}`}
              >
                {t === 'all' ? 'Tous' : TYPE_META[t]?.label ?? t}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 bg-dark-card border border-dark-border rounded-lg p-1 ml-auto">
            <button onClick={() => setView('grid')} className={`p-1.5 rounded-md transition-colors ${view === 'grid' ? 'bg-dark-bg text-white' : 'text-gray-600 hover:text-gray-400'}`}><LayoutGrid size={14} /></button>
            <button onClick={() => setView('list')} className={`p-1.5 rounded-md transition-colors ${view === 'list' ? 'bg-dark-bg text-white' : 'text-gray-600 hover:text-gray-400'}`}><List size={14} /></button>
          </div>
        </div>

        {/* Teams */}
        <div className="max-w-7xl mx-auto px-6 pb-12">
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-600">Aucune équipe trouvée</div>
          ) : view === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map((team, i) => {
                const meta = TYPE_META[team.team_type ?? '']
                const Icon = meta?.icon ?? Swords
                return (
                  <motion.div key={team.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                    onClick={() => openDetail(team)}
                    className={`bg-dark-card border rounded-2xl overflow-hidden hover:border-red-500/30 transition-colors group cursor-pointer ${selectedTeam?.id === team.id ? 'border-red-500/40' : 'border-dark-border'}`}
                  >
                    <div className="h-20 relative bg-gradient-to-br from-dark-bg to-dark-card flex items-center px-4 gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 overflow-hidden ${team.logo_url ? 'bg-white' : 'bg-dark-bg border border-dark-border'}`}>
                        {team.logo_url ? <img src={team.logo_url} alt="" className="w-full h-full object-contain p-1" /> : <span className="text-sm font-black text-gray-500">{(team.team_name || 'E').charAt(0)}</span>}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-white text-sm truncate">{team.team_name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {meta && <span className={`flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${meta.color} ${meta.bg}`}><Icon size={9} />{meta.label}</span>}
                          <span className="text-[10px] text-gray-500 flex items-center gap-1"><Users size={9} />{team.member_count ?? 0}</span>
                        </div>
                      </div>
                      <ChevronRight size={14} className="text-gray-600 shrink-0 group-hover:text-red-400 transition-colors" />
                    </div>
                    <div className="px-4 py-3 flex items-center justify-between border-t border-dark-border/50">
                      <p className="text-[10px] text-gray-600">{team.created_at ? new Date(team.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: '2-digit' }) : '—'}</p>
                      <button onClick={e => { e.stopPropagation(); handleEnter(team.id) }} disabled={!!enteringId}
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
          ) : (
            <div className="bg-dark-card border border-dark-border rounded-2xl overflow-hidden">
              <div className="grid grid-cols-[auto_1fr_120px_80px_100px] gap-4 px-4 py-2.5 border-b border-dark-border text-[10px] font-bold uppercase tracking-widest text-gray-600">
                <span className="w-8" /><span>Équipe</span><span>Type</span><span className="text-center">Membres</span><span />
              </div>
              {filtered.map((team, i) => {
                const meta = TYPE_META[team.team_type ?? '']
                const Icon = meta?.icon ?? Swords
                return (
                  <motion.div key={team.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }}
                    onClick={() => openDetail(team)}
                    className={`grid grid-cols-[auto_1fr_120px_80px_100px] gap-4 items-center px-4 py-3 border-b border-dark-border/40 last:border-0 hover:bg-dark-bg/40 transition-colors cursor-pointer ${selectedTeam?.id === team.id ? 'bg-red-500/5' : ''}`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden shrink-0 ${team.logo_url ? 'bg-white' : 'bg-dark-bg border border-dark-border'}`}>
                      {team.logo_url ? <img src={team.logo_url} alt="" className="w-full h-full object-contain p-0.5" /> : <span className="text-xs font-black text-gray-500">{(team.team_name || 'E').charAt(0)}</span>}
                    </div>
                    <span className="font-semibold text-sm text-white truncate">{team.team_name}</span>
                    {meta ? <span className={`flex items-center gap-1.5 text-xs font-medium ${meta.color}`}><Icon size={12} />{meta.label}</span> : <span className="text-xs text-gray-600">{team.team_type ?? '—'}</span>}
                    <span className="text-sm text-gray-400 text-center">{team.member_count ?? 0}</span>
                    <div className="flex justify-end">
                      <button onClick={e => { e.stopPropagation(); handleEnter(team.id) }} disabled={!!enteringId}
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

      {/* ── Detail panel ── */}
      <AnimatePresence>
        {selectedTeam && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 360, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="shrink-0 border-l border-red-500/15 bg-dark-card overflow-hidden flex flex-col sticky top-0 h-screen"
          >
            <div className="flex flex-col h-full overflow-y-auto">
              {/* Panel header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-dark-border/60 shrink-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden shrink-0 ${selectedTeam.logo_url ? 'bg-white' : 'bg-accent-blue/15'}`}>
                    {selectedTeam.logo_url ? <img src={selectedTeam.logo_url} className="w-full h-full object-contain p-0.5" /> : <span className="text-xs font-bold text-accent-blue">{selectedTeam.team_name.slice(0, 2).toUpperCase()}</span>}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white truncate">{selectedTeam.team_name}</p>
                    {(() => { const meta = TYPE_META[selectedTeam.team_type ?? '']; const Icon = meta?.icon ?? Swords; return meta ? <span className={`flex items-center gap-1 text-[10px] font-semibold ${meta.color}`}><Icon size={9} />{meta.label}</span> : null })()}
                  </div>
                </div>
                <button onClick={() => { setSelectedTeam(null); setConfirmDelete(false) }} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 hover:text-white hover:bg-dark-bg/60 transition-colors shrink-0">
                  <X size={14} />
                </button>
              </div>

              {detailLoading ? (
                <div className="flex items-center justify-center flex-1">
                  <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-red-400" />
                </div>
              ) : detail ? (
                <div className="flex flex-col gap-4 p-4">

                  {/* Stats rapides */}
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: 'Membres', value: selectedTeam.member_count ?? 0, icon: Users },
                      { label: 'Joueurs', value: detail.players.length, icon: UserCircle },
                      { label: 'Matchs',  value: detail.matchCount, icon: Swords },
                    ].map(({ label, value, icon: Icon }) => (
                      <div key={label} className="bg-dark-bg rounded-xl p-3 text-center border border-dark-border">
                        <Icon size={14} className="text-gray-500 mx-auto mb-1" />
                        <p className="text-lg font-black text-white">{value}</p>
                        <p className="text-[10px] text-gray-600">{label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Date création */}
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Calendar size={12} />
                    Créée le {selectedTeam.created_at ? new Date(selectedTeam.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}
                  </div>

                  {/* Membres */}
                  {detail.members.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-2">Membres</p>
                      <div className="space-y-1.5">
                        {detail.members.map(m => (
                          <div key={m.user_id} className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg bg-dark-bg border border-dark-border/60">
                            <div className="w-6 h-6 rounded-full bg-accent-blue/15 flex items-center justify-center shrink-0">
                              <span className="text-[9px] font-bold text-accent-blue">{(m.display_name || 'U').charAt(0).toUpperCase()}</span>
                            </div>
                            <span className="text-xs text-white flex-1 truncate">{m.display_name || '—'}</span>
                            <span className="text-[10px] text-gray-600 capitalize">{m.role}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Joueurs */}
                  {detail.players.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-2">Joueurs</p>
                      <div className="space-y-1">
                        {detail.players.map(p => (
                          <div key={p.id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-dark-bg border border-dark-border/60">
                            <span className="text-xs text-white flex-1 truncate">{p.player_name}</span>
                            {p.position && <span className="text-[10px] text-gray-600 uppercase">{p.position}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Features */}
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-2">Features</p>
                    <div className="grid grid-cols-3 gap-1.5">
                      {FEATURES.map(f => {
                        const enabled = detail.features[f.key] !== false
                        return (
                          <button
                            key={f.key}
                            onClick={() => toggleFeature(f.key)}
                            disabled={!!savingFeature}
                            className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] font-medium transition-all border ${
                              enabled
                                ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
                                : 'bg-dark-bg border-dark-border text-gray-600 hover:border-red-500/30'
                            }`}
                          >
                            {savingFeature === f.key
                              ? <Loader2 size={10} className="animate-spin shrink-0" />
                              : enabled
                                ? <Check size={10} className="shrink-0" />
                                : <X size={10} className="shrink-0" />
                            }
                            <span className="truncate">{f.label}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Accéder */}
                  <button
                    onClick={() => handleEnter(selectedTeam.id)}
                    disabled={!!enteringId}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-red-400 border border-red-500/30 hover:bg-red-500/10 transition-colors disabled:opacity-50 mt-2"
                  >
                    {enteringId === selectedTeam.id ? <Loader2 size={14} className="animate-spin" /> : <ExternalLink size={14} />}
                    Accéder à l'équipe
                  </button>

                  {/* Supprimer */}
                  {!confirmDelete ? (
                    <button
                      onClick={() => setConfirmDelete(true)}
                      className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-medium text-gray-600 border border-dark-border hover:text-red-400 hover:border-red-500/30 transition-colors"
                    >
                      <Trash2 size={12} />
                      Supprimer l'équipe
                    </button>
                  ) : (
                    <div className="border border-red-500/40 rounded-xl p-3 bg-red-500/5 space-y-2">
                      <p className="text-xs text-red-300 text-center font-medium">Supprimer définitivement ?</p>
                      <p className="text-[11px] text-gray-500 text-center">Cette action est irréversible. Tous les matchs, joueurs et données seront supprimés.</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setConfirmDelete(false)}
                          className="flex-1 py-1.5 rounded-lg text-xs text-gray-500 border border-dark-border hover:text-white transition-colors"
                        >
                          Annuler
                        </button>
                        <button
                          onClick={deleteTeam}
                          disabled={deletingTeam}
                          className="flex-1 py-1.5 rounded-lg text-xs font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                        >
                          {deletingTeam ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
                          Confirmer
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  )
}
