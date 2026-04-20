import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Activity, Clock, TrendingUp, Users } from 'lucide-react'
import { supabase } from '../../lib/supabase'

interface ActivityRow {
  display_name: string | null
  last_seen_at: string | null
  created_at: string
}

export const AdminStatsUsagePage = () => {
  const [rows, setRows] = useState<ActivityRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabase) return
    supabase
      .from('profiles')
      .select('display_name, last_seen_at, created_at')
      .order('last_seen_at', { ascending: false, nullsFirst: false })
      .then(({ data }) => {
        setRows(data || [])
        setLoading(false)
      })
  }, [])

  const now = Date.now()
  const seen  = rows.filter(r => r.last_seen_at)
  const active24h  = seen.filter(r => now - new Date(r.last_seen_at!).getTime() < 86400000).length
  const active7d   = seen.filter(r => now - new Date(r.last_seen_at!).getTime() < 7 * 86400000).length
  const active30d  = seen.filter(r => now - new Date(r.last_seen_at!).getTime() < 30 * 86400000).length
  const neverSeen  = rows.filter(r => !r.last_seen_at).length

  const relativeTime = (iso: string | null) => {
    if (!iso) return 'Jamais connecté'
    const diff = now - new Date(iso).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1)    return "À l'instant"
    if (mins < 60)   return `Il y a ${mins} min`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24)    return `Il y a ${hrs}h`
    const days = Math.floor(hrs / 24)
    if (days < 30)   return `Il y a ${days}j`
    return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: '2-digit' })
  }

  const activityBuckets = [
    { label: 'Dernières 24h',    value: active24h,  color: 'bg-emerald-400/70', pct: rows.length > 0 ? active24h / rows.length : 0 },
    { label: '7 derniers jours', value: active7d,   color: 'bg-accent-blue/70', pct: rows.length > 0 ? active7d / rows.length : 0 },
    { label: '30 derniers jours',value: active30d,  color: 'bg-amber-400/70',   pct: rows.length > 0 ? active30d / rows.length : 0 },
    { label: 'Jamais vus',       value: neverSeen,  color: 'bg-gray-600/50',    pct: rows.length > 0 ? neverSeen / rows.length : 0 },
  ]

  if (loading) return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-400" />
    </div>
  )

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
      <div>
        <h2 className="text-2xl font-black text-white">Utilisation</h2>
        <p className="text-sm text-gray-500 mt-1">Activité des utilisateurs basée sur la dernière visite</p>
      </div>

      {/* Buckets d'activité */}
      <section>
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-3">Fenêtres d'activité</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {activityBuckets.map(({ label, value, color, pct }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="bg-dark-card border border-dark-border rounded-2xl p-4"
            >
              <p className="text-2xl font-black text-white">{value}</p>
              <p className="text-xs text-gray-500 mt-0.5 mb-3">{label}</p>
              <div className="h-1.5 rounded-full bg-dark-bg overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${color}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.round(pct * 100)}%` }}
                  transition={{ delay: 0.3 + i * 0.06, duration: 0.5, ease: 'easeOut' }}
                />
              </div>
              <p className="text-[10px] text-gray-600 mt-1">{Math.round(pct * 100)}% des comptes</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Timeline d'activité */}
      <section>
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-3">Dernières activités</p>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-dark-card border border-dark-border rounded-2xl overflow-hidden"
        >
          <div className="grid grid-cols-[2fr_1fr_1fr] gap-4 px-4 py-2.5 border-b border-dark-border text-[10px] font-bold uppercase tracking-widest text-gray-600">
            <span>Utilisateur</span>
            <span>Dernière activité</span>
            <span>Statut</span>
          </div>
          {rows.map((r, i) => {
            const diff = r.last_seen_at ? now - new Date(r.last_seen_at).getTime() : Infinity
            const statusColor = diff < 86400000 ? 'text-emerald-400' : diff < 7 * 86400000 ? 'text-amber-400' : 'text-gray-600'
            const statusLabel = diff < 86400000 ? 'Actif' : diff < 7 * 86400000 ? 'Récent' : r.last_seen_at ? 'Inactif' : 'Jamais'
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 + i * 0.015 }}
                className="grid grid-cols-[2fr_1fr_1fr] gap-4 items-center px-4 py-3 border-b border-dark-border/40 last:border-0 hover:bg-dark-bg/40 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-dark-bg border border-dark-border flex items-center justify-center shrink-0">
                    <span className="text-[9px] font-bold text-gray-400">
                      {(r.display_name || 'U').charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="text-sm text-white truncate">{r.display_name || '—'}</span>
                </div>
                <span className="text-xs text-gray-400">{relativeTime(r.last_seen_at)}</span>
                <span className={`text-xs font-medium ${statusColor}`}>{statusLabel}</span>
              </motion.div>
            )
          })}
        </motion.div>
      </section>
    </div>
  )
}
