import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { ScrollText, RefreshCw, Trash2, UserX, Settings, Key, Megaphone, Shield } from 'lucide-react'
import { supabase } from '../../lib/supabase'

interface LogRow {
  id: string
  admin_id: string | null
  action: string
  target_type: string | null
  target_id: string | null
  details: Record<string, unknown> | null
  created_at: string
  admin_name?: string | null
}

const ACTION_META: Record<string, { icon: typeof Trash2; color: string; label: string }> = {
  delete_team:      { icon: Trash2,     color: 'text-red-400',     label: 'Suppression équipe' },
  suspend_user:     { icon: UserX,      color: 'text-amber-400',   label: 'Suspension' },
  unsuspend_user:   { icon: Shield,     color: 'text-emerald-400', label: 'Réactivation' },
  toggle_feature:   { icon: Settings,   color: 'text-accent-blue', label: 'Feature modifiée' },
  update_user:      { icon: Settings,   color: 'text-gray-400',    label: 'Compte modifié' },
  add_riot_key:     { icon: Key,        color: 'text-emerald-400', label: 'Clé Riot ajoutée' },
  remove_riot_key:  { icon: Key,        color: 'text-red-400',     label: 'Clé Riot supprimée' },
  announcement:     { icon: Megaphone,  color: 'text-amber-400',   label: 'Annonce' },
}

const relativeTime = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1)  return "À l'instant"
  if (mins < 60) return `Il y a ${mins} min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `Il y a ${hrs}h`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `Il y a ${days}j`
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: '2-digit' })
}

export const AdminStatsLogsPage = () => {
  const [logs, setLogs]     = useState<LogRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')

  const load = useCallback(async () => {
    if (!supabase) return
    setLoading(true)
    const { data } = await supabase
      .from('admin_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)

    if (!data) { setLoading(false); return }

    const adminIds = [...new Set(data.map(l => l.admin_id).filter(Boolean))]
    const { data: profiles } = adminIds.length
      ? await supabase.from('profiles').select('id, display_name').in('id', adminIds)
      : { data: [] }

    const nameMap: Record<string, string> = {}
    for (const p of profiles || []) nameMap[p.id] = p.display_name || 'Admin'

    setLogs(data.map(l => ({ ...l, admin_name: l.admin_id ? nameMap[l.admin_id] : 'Système' })))
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = filter === 'all' ? logs : logs.filter(l => l.action === filter)
  const actionTypes = [...new Set(logs.map(l => l.action))]

  if (loading) return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-400" />
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-black text-white">Logs d'actions</h2>
          <p className="text-sm text-gray-500 mt-1">{logs.length} actions enregistrées</p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dark-border text-xs text-gray-400 hover:text-white hover:border-red-500/30 transition-colors"
        >
          <RefreshCw size={12} />Rafraîchir
        </button>
      </div>

      {/* Filtres */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {['all', ...actionTypes].map(t => {
          const meta = ACTION_META[t]
          return (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${filter === t ? 'bg-red-500/15 text-red-400 border-red-500/25' : 'text-gray-500 hover:text-gray-300 border-transparent'}`}
            >
              {t === 'all' ? 'Toutes' : (meta?.label || t)}
            </button>
          )
        })}
      </div>

      {/* Liste */}
      <div className="bg-dark-card border border-dark-border rounded-2xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <ScrollText size={28} className="text-gray-700" />
            <p className="text-sm text-gray-600">Aucune action enregistrée</p>
          </div>
        ) : (
          filtered.map((log, i) => {
            const meta = ACTION_META[log.action]
            const Icon = meta?.icon ?? ScrollText
            return (
              <motion.div
                key={log.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.01 }}
                className="flex items-start gap-3 px-4 py-3 border-b border-dark-border/40 last:border-0 hover:bg-dark-bg/40 transition-colors"
              >
                <div className="w-7 h-7 rounded-lg bg-dark-bg border border-dark-border flex items-center justify-center shrink-0 mt-0.5">
                  <Icon size={13} className={meta?.color || 'text-gray-500'} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-semibold ${meta?.color || 'text-gray-400'}`}>{meta?.label || log.action}</span>
                    {log.target_type && <span className="text-xs text-gray-600">· {log.target_type}</span>}
                    {log.details && Object.keys(log.details).length > 0 && (
                      <span className="text-xs text-gray-700 truncate max-w-[300px]">
                        {Object.entries(log.details).map(([k, v]) => `${k}: ${v}`).join(', ')}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-600 mt-0.5">par <span className="text-gray-400">{log.admin_name}</span></p>
                </div>
                <span className="text-[11px] text-gray-700 shrink-0">{relativeTime(log.created_at)}</span>
              </motion.div>
            )
          })
        )}
      </div>
    </div>
  )
}
