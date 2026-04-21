import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Swords, Users, Trophy, Gamepad2, Activity, Clock, TrendingUp } from 'lucide-react'
import { supabase } from '../../lib/supabase'

const TYPE_META: Record<string, { label: string; icon: typeof Swords; color: string }> = {
  scrim: { label: 'Scrims', icon: Swords,  color: 'text-accent-blue' },
  flex:  { label: 'Flex',   icon: Users,   color: 'text-emerald-400' },
  soloq: { label: 'Solo Q', icon: Trophy,  color: 'text-amber-400' },
  fun:   { label: 'Fun',    icon: Gamepad2,color: 'text-pink-400' },
}

interface TeamActivity {
  id: string
  team_name: string
  team_type: string | null
  logo_url: string | null
  created_at: string
  member_count: number
  match_count: number
  soloq_count: number
  last_member_seen: string | null
}

export const AdminStatsActivityPage = () => {
  const [teams, setTeams] = useState<TeamActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [sort, setSort] = useState<'matches' | 'soloq' | 'members' | 'seen'>('matches')

  useEffect(() => {
    if (!supabase) return
    const load = async () => {
      const { data: teamsRaw } = await supabase
        .from('teams')
        .select('id, team_name, team_type, logo_url, created_at, team_members(count)')

      if (!teamsRaw) { setLoading(false); return }

      const teamIds = teamsRaw.map((t: any) => t.id)

      const [
        { data: matchCounts },
        { data: soloqCounts },
        { data: memberActivity },
      ] = await Promise.all([
        supabase.from('team_matches').select('team_id').in('team_id', teamIds),
        supabase.from('player_soloq_matches')
          .select('players!inner(team_id)')
          .in('players.team_id', teamIds),
        supabase.from('team_members')
          .select('team_id, profiles!inner(last_seen_at)')
          .in('team_id', teamIds),
      ])

      const matchMap: Record<string, number> = {}
      for (const m of matchCounts || []) matchMap[m.team_id] = (matchMap[m.team_id] || 0) + 1

      const soloqMap: Record<string, number> = {}
      for (const s of soloqCounts || []) {
        const tid = (s as any).players?.team_id
        if (tid) soloqMap[tid] = (soloqMap[tid] || 0) + 1
      }

      const lastSeenMap: Record<string, string | null> = {}
      for (const m of memberActivity || []) {
        const tid = (m as any).team_id
        const seen = (m as any).profiles?.last_seen_at
        if (!lastSeenMap[tid] || (seen && seen > lastSeenMap[tid]!)) {
          lastSeenMap[tid] = seen || null
        }
      }

      setTeams(teamsRaw.map((t: any) => ({
        id: t.id,
        team_name: t.team_name,
        team_type: t.team_type,
        logo_url: t.logo_url,
        created_at: t.created_at,
        member_count: (t.team_members?.[0]?.count ?? 0) + 1,
        match_count: matchMap[t.id] || 0,
        soloq_count: soloqMap[t.id] || 0,
        last_member_seen: lastSeenMap[t.id] || null,
      })))
      setLoading(false)
    }
    load()
  }, [])

  const sorted = [...teams].sort((a, b) => {
    if (sort === 'matches') return b.match_count - a.match_count
    if (sort === 'soloq')   return b.soloq_count - a.soloq_count
    if (sort === 'members') return b.member_count - a.member_count
    if (sort === 'seen') {
      if (!a.last_member_seen) return 1
      if (!b.last_member_seen) return -1
      return b.last_member_seen.localeCompare(a.last_member_seen)
    }
    return 0
  })

  const relativeTime = (iso: string | null) => {
    if (!iso) return 'Jamais'
    const diff = Date.now() - new Date(iso).getTime()
    const days = Math.floor(diff / 86400000)
    if (days === 0) return "Aujourd'hui"
    if (days === 1) return 'Hier'
    if (days < 30)  return `Il y a ${days}j`
    return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  }

  const maxMatches = Math.max(...teams.map(t => t.match_count), 1)

  if (loading) return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-400" />
    </div>
  )

  const SortBtn = ({ val, label }: { val: typeof sort; label: string }) => (
    <button
      onClick={() => setSort(val)}
      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${sort === val ? 'bg-red-500/15 text-red-400 border border-red-500/25' : 'text-gray-500 hover:text-gray-300 border border-transparent'}`}
    >
      {label}
    </button>
  )

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-black text-white">Activité des équipes</h2>
          <p className="text-sm text-gray-500 mt-1">Classement par usage réel de la plateforme</p>
        </div>
        <div className="flex items-center gap-1 bg-dark-card border border-dark-border rounded-lg p-1">
          <SortBtn val="matches" label="Matchs" />
          <SortBtn val="soloq"   label="SoloQ" />
          <SortBtn val="members" label="Membres" />
          <SortBtn val="seen"    label="Dernière activité" />
        </div>
      </div>

      {/* Top 3 */}
      <div className="grid grid-cols-3 gap-4">
        {sorted.slice(0, 3).map((team, i) => {
          const meta = TYPE_META[team.team_type ?? '']
          const Icon = meta?.icon ?? Swords
          const medals = ['🥇', '🥈', '🥉']
          return (
            <motion.div
              key={team.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="bg-dark-card border border-dark-border rounded-2xl p-4"
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">{medals[i]}</span>
                <div className="w-7 h-7 rounded-lg bg-dark-bg border border-dark-border flex items-center justify-center overflow-hidden shrink-0">
                  {team.logo_url ? <img src={team.logo_url} className="w-full h-full object-contain p-0.5" /> : <span className="text-[10px] font-bold text-gray-500">{team.team_name.charAt(0)}</span>}
                </div>
                <span className="text-sm font-bold text-white truncate flex-1">{team.team_name}</span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500 flex items-center gap-1"><Activity size={10} />Matchs</span>
                  <span className="text-white font-semibold">{team.match_count}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500 flex items-center gap-1"><TrendingUp size={10} />SoloQ</span>
                  <span className="text-white font-semibold">{team.soloq_count}</span>
                </div>
                {meta && <div className="flex justify-between text-xs"><span className="text-gray-500">Type</span><span className={`font-medium ${meta.color}`}>{meta.label}</span></div>}
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Liste complète */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="bg-dark-card border border-dark-border rounded-2xl overflow-hidden"
      >
        <div className="grid grid-cols-[2fr_80px_80px_80px_120px] gap-3 px-4 py-2.5 border-b border-dark-border text-[10px] font-bold uppercase tracking-widest text-gray-600">
          <span>Équipe</span>
          <span className="text-center">Matchs</span>
          <span className="text-center">SoloQ</span>
          <span className="text-center">Membres</span>
          <span className="flex items-center gap-1"><Clock size={10} />Activité</span>
        </div>
        {sorted.map((team, i) => {
          const meta = TYPE_META[team.team_type ?? '']
          const Icon = meta?.icon ?? Swords
          const barPct = team.match_count / maxMatches
          return (
            <motion.div
              key={team.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 + i * 0.02 }}
              className="grid grid-cols-[2fr_80px_80px_80px_120px] gap-3 items-center px-4 py-3 border-b border-dark-border/40 last:border-0 hover:bg-dark-bg/40 transition-colors"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-dark-bg border border-dark-border flex items-center justify-center overflow-hidden shrink-0">
                  {team.logo_url ? <img src={team.logo_url} className="w-full h-full object-contain p-0.5" /> : <span className="text-[10px] font-bold text-gray-500">{team.team_name.charAt(0)}</span>}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white truncate">{team.team_name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {meta && <span className={`text-[10px] ${meta.color} flex items-center gap-0.5`}><Icon size={9} />{meta.label}</span>}
                    <div className="flex-1 h-1 rounded-full bg-dark-bg overflow-hidden max-w-[60px]">
                      <div className="h-full rounded-full bg-accent-blue/50" style={{ width: `${barPct * 100}%` }} />
                    </div>
                  </div>
                </div>
              </div>
              <span className="text-sm text-white font-semibold text-center">{team.match_count}</span>
              <span className="text-sm text-white font-semibold text-center">{team.soloq_count}</span>
              <span className="text-sm text-gray-400 text-center">{team.member_count}</span>
              <span className={`text-xs ${team.last_member_seen ? 'text-gray-400' : 'text-gray-700'}`}>{relativeTime(team.last_member_seen)}</span>
            </motion.div>
          )
        })}
      </motion.div>
    </div>
  )
}
