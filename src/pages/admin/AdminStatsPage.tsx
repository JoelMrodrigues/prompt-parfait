import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Users, Swords, Trophy, Gamepad2, UserCircle,
  Database, Activity, TrendingUp, Calendar,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'

interface PlatformStats {
  totalTeams: number
  teamsByType: Record<string, number>
  totalProfiles: number
  totalPlayers: number
  totalMatches: number
  totalSoloqMatches: number
  recentTeams: { id: string; team_name: string; team_type: string; created_at: string }[]
}

const TYPE_META: Record<string, { label: string; icon: typeof Swords; color: string; bg: string }> = {
  scrim: { label: 'Scrims',  icon: Swords,    color: 'text-accent-blue', bg: 'bg-accent-blue/10' },
  flex:  { label: 'Flex',    icon: Users,     color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  soloq: { label: 'Solo Q',  icon: Trophy,    color: 'text-amber-400',   bg: 'bg-amber-500/10' },
  fun:   { label: 'Fun',     icon: Gamepad2,  color: 'text-pink-400',    bg: 'bg-pink-500/10' },
}

function StatCard({ label, value, icon: Icon, color = 'text-white', delay = 0 }: {
  label: string; value: number | string; icon: typeof Users; color?: string; delay?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      className="bg-dark-card border border-dark-border rounded-2xl p-5 flex items-center gap-4"
    >
      <div className="w-11 h-11 rounded-xl bg-dark-bg border border-dark-border flex items-center justify-center shrink-0">
        <Icon size={20} className={color} />
      </div>
      <div>
        <p className={`text-2xl font-black ${color}`}>{value}</p>
        <p className="text-xs text-gray-500 mt-0.5">{label}</p>
      </div>
    </motion.div>
  )
}

export const AdminStatsPage = () => {
  const [stats, setStats] = useState<PlatformStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabase) return
    const load = async () => {
      const [
        { data: teams },
        { count: profileCount },
        { count: playerCount },
        { count: matchCount },
        { count: soloqCount },
      ] = await Promise.all([
        supabase.from('teams').select('id, team_name, team_type, created_at').order('created_at', { ascending: false }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('players').select('*', { count: 'exact', head: true }),
        supabase.from('team_matches').select('*', { count: 'exact', head: true }),
        supabase.from('player_soloq_matches').select('*', { count: 'exact', head: true }),
      ])

      const teamsByType: Record<string, number> = {}
      for (const t of teams || []) {
        const type = t.team_type || 'other'
        teamsByType[type] = (teamsByType[type] || 0) + 1
      }

      setStats({
        totalTeams: teams?.length ?? 0,
        teamsByType,
        totalProfiles: profileCount ?? 0,
        totalPlayers: playerCount ?? 0,
        totalMatches: matchCount ?? 0,
        totalSoloqMatches: soloqCount ?? 0,
        recentTeams: (teams || []).slice(0, 8),
      })
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-red-400" />
      </div>
    )
  }

  if (!stats) return null

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">

      {/* ── Titre ── */}
      <div>
        <h2 className="text-2xl font-black text-white">Statistiques plateforme</h2>
        <p className="text-sm text-gray-500 mt-1">Vue globale en temps réel</p>
      </div>

      {/* ── KPIs principaux ── */}
      <section>
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-3">Données globales</p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <StatCard label="Équipes" value={stats.totalTeams} icon={Swords} color="text-red-400" delay={0} />
          <StatCard label="Utilisateurs" value={stats.totalProfiles} icon={UserCircle} color="text-accent-blue" delay={0.05} />
          <StatCard label="Joueurs" value={stats.totalPlayers} icon={Users} color="text-emerald-400" delay={0.1} />
          <StatCard label="Matchs équipe" value={stats.totalMatches} icon={Activity} color="text-amber-400" delay={0.15} />
          <StatCard label="Matchs SoloQ" value={stats.totalSoloqMatches} icon={TrendingUp} color="text-purple-400" delay={0.2} />
        </div>
      </section>

      {/* ── Répartition par type ── */}
      <section>
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-3">Répartition des équipes</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(TYPE_META).map(([type, meta], i) => {
            const Icon = meta.icon
            const count = stats.teamsByType[type] ?? 0
            const pct = stats.totalTeams > 0 ? Math.round((count / stats.totalTeams) * 100) : 0
            return (
              <motion.div
                key={type}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 + i * 0.05 }}
                className="bg-dark-card border border-dark-border rounded-2xl p-5"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className={`flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-full ${meta.color} ${meta.bg}`}>
                    <Icon size={11} />
                    {meta.label}
                  </span>
                  <span className="text-2xl font-black text-white">{count}</span>
                </div>
                <div className="h-1.5 rounded-full bg-dark-bg overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${meta.bg.replace('/10', '/60')}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ delay: 0.4 + i * 0.05, duration: 0.5, ease: 'easeOut' }}
                  />
                </div>
                <p className="text-[10px] text-gray-600 mt-1.5">{pct}% du total</p>
              </motion.div>
            )
          })}
        </div>
      </section>

      {/* ── Activité récente ── */}
      <section>
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-3">Équipes récentes</p>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45 }}
          className="bg-dark-card border border-dark-border rounded-2xl overflow-hidden"
        >
          <div className="grid grid-cols-[1fr_120px_140px] gap-4 px-4 py-2.5 border-b border-dark-border text-[10px] font-bold uppercase tracking-widest text-gray-600">
            <span>Équipe</span>
            <span>Type</span>
            <span className="flex items-center gap-1"><Calendar size={10} />Créée le</span>
          </div>
          {stats.recentTeams.map((team, i) => {
            const meta = TYPE_META[team.team_type ?? '']
            const Icon = meta?.icon ?? Swords
            return (
              <div
                key={team.id}
                className="grid grid-cols-[1fr_120px_140px] gap-4 items-center px-4 py-3 border-b border-dark-border/40 last:border-0 hover:bg-dark-bg/40 transition-colors"
              >
                <span className="font-semibold text-sm text-white truncate">{team.team_name}</span>
                {meta
                  ? <span className={`flex items-center gap-1.5 text-xs font-medium ${meta.color}`}><Icon size={11} />{meta.label}</span>
                  : <span className="text-xs text-gray-500">{team.team_type ?? '—'}</span>
                }
                <span className="text-xs text-gray-500">
                  {team.created_at
                    ? new Date(team.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: '2-digit' })
                    : '—'}
                </span>
              </div>
            )
          })}
        </motion.div>
      </section>

      {/* ── Ratio données ── */}
      <section>
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-3">Ratios</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              label: 'Joueurs / équipe',
              value: stats.totalTeams > 0 ? (stats.totalPlayers / stats.totalTeams).toFixed(1) : '—',
              icon: Database,
              color: 'text-accent-blue',
            },
            {
              label: 'Matchs SoloQ / joueur',
              value: stats.totalPlayers > 0 ? (stats.totalSoloqMatches / stats.totalPlayers).toFixed(1) : '—',
              icon: TrendingUp,
              color: 'text-purple-400',
            },
            {
              label: 'Matchs équipe / équipe',
              value: stats.totalTeams > 0 ? (stats.totalMatches / stats.totalTeams).toFixed(1) : '—',
              icon: Activity,
              color: 'text-amber-400',
            },
          ].map(({ label, value, icon: Icon, color }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + i * 0.05 }}
              className="bg-dark-card border border-dark-border rounded-2xl p-5 flex items-center gap-4"
            >
              <div className="w-10 h-10 rounded-xl bg-dark-bg border border-dark-border flex items-center justify-center shrink-0">
                <Icon size={18} className={color} />
              </div>
              <div>
                <p className={`text-xl font-black ${color}`}>{value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{label}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

    </div>
  )
}
