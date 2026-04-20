import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { UserCircle, Users, Shield, Clock } from 'lucide-react'
import { supabase } from '../../lib/supabase'

interface ProfileRow {
  id: string
  display_name: string | null
  active_team_id: string | null
  created_at: string
  last_seen_at: string | null
  is_admin: boolean | null
}

export const AdminStatsUsersPage = () => {
  const [profiles, setProfiles] = useState<ProfileRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabase) return
    supabase
      .from('profiles')
      .select('id, display_name, active_team_id, created_at, last_seen_at, is_admin')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setProfiles(data || [])
        setLoading(false)
      })
  }, [])

  const totalActive   = profiles.filter(p => p.active_team_id).length
  const totalAdmin    = profiles.filter(p => p.is_admin).length
  const sevenDaysAgo  = Date.now() - 7 * 24 * 60 * 60 * 1000
  const recentSignups = profiles.filter(p => new Date(p.created_at).getTime() > sevenDaysAgo).length

  const relativeTime = (iso: string | null) => {
    if (!iso) return 'Jamais'
    const diff = Date.now() - new Date(iso).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1)    return "À l'instant"
    if (mins < 60)   return `Il y a ${mins} min`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24)    return `Il y a ${hrs}h`
    const days = Math.floor(hrs / 24)
    if (days < 30)   return `Il y a ${days}j`
    return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: '2-digit' })
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-400" />
    </div>
  )

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
      <div>
        <h2 className="text-2xl font-black text-white">Utilisateurs</h2>
        <p className="text-sm text-gray-500 mt-1">{profiles.length} comptes enregistrés</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total',             value: profiles.length, icon: UserCircle, color: 'text-white' },
          { label: 'Avec une équipe',   value: totalActive,     icon: Users,      color: 'text-emerald-400' },
          { label: 'Inscrits (7j)',     value: recentSignups,   icon: Clock,      color: 'text-accent-blue' },
          { label: 'Admins',            value: totalAdmin,      icon: Shield,     color: 'text-red-400' },
        ].map(({ label, value, icon: Icon, color }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-dark-card border border-dark-border rounded-2xl p-4 flex items-center gap-3"
          >
            <div className="w-9 h-9 rounded-xl bg-dark-bg border border-dark-border flex items-center justify-center shrink-0">
              <Icon size={16} className={color} />
            </div>
            <div>
              <p className={`text-xl font-black ${color}`}>{value}</p>
              <p className="text-[11px] text-gray-500">{label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Liste */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="bg-dark-card border border-dark-border rounded-2xl overflow-hidden"
      >
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-4 px-4 py-2.5 border-b border-dark-border text-[10px] font-bold uppercase tracking-widest text-gray-600">
          <span>Utilisateur</span>
          <span>Équipe active</span>
          <span>Dernière activité</span>
          <span>Inscription</span>
        </div>
        {profiles.map((p, i) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 + i * 0.02 }}
            className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-4 items-center px-4 py-3 border-b border-dark-border/40 last:border-0 hover:bg-dark-bg/40 transition-colors"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-full bg-accent-blue/15 flex items-center justify-center shrink-0">
                <span className="text-[10px] font-bold text-accent-blue">
                  {(p.display_name || 'U').charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate">{p.display_name || '—'}</p>
                {p.is_admin && (
                  <span className="text-[9px] font-black uppercase text-red-400">Admin</span>
                )}
              </div>
            </div>
            <span className={`text-xs ${p.active_team_id ? 'text-emerald-400' : 'text-gray-600'}`}>
              {p.active_team_id ? '● Oui' : '○ Non'}
            </span>
            <span className="text-xs text-gray-500">{relativeTime(p.last_seen_at)}</span>
            <span className="text-xs text-gray-500">
              {new Date(p.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: '2-digit' })}
            </span>
          </motion.div>
        ))}
      </motion.div>
    </div>
  )
}
