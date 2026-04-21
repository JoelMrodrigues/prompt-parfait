import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { UserPlus, Users, Gamepad2, Activity, ArrowRight, TrendingUp } from 'lucide-react'
import { supabase } from '../../lib/supabase'

interface FunnelStep {
  label: string
  description: string
  count: number
  icon: typeof UserPlus
  color: string
}

interface WeeklySignup { week: string; count: number }

export const AdminStatsOnboardingPage = () => {
  const [steps, setSteps]     = useState<FunnelStep[]>([])
  const [weekly, setWeekly]   = useState<WeeklySignup[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabase) return
    const load = async () => {
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString()
      const [
        { count: totalProfiles },
        { count: withTeam },
        { count: withMatch },
        { count: activeRecent },
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).not('active_team_id', 'is', null),
        supabase.from('team_matches').select('team_id', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('last_seen_at', sevenDaysAgo),
      ])

      setSteps([
        { label: 'Inscrits',         description: 'Comptes créés',              count: totalProfiles ?? 0, icon: UserPlus,  color: 'text-accent-blue' },
        { label: 'Avec une équipe',  description: 'Ont créé ou rejoint',         count: withTeam    ?? 0, icon: Users,     color: 'text-emerald-400' },
        { label: 'Matchs importés',  description: 'Équipes avec ≥1 match',       count: withMatch   ?? 0, icon: Gamepad2,  color: 'text-amber-400' },
        { label: 'Actifs (7j)',       description: 'Connectés ces 7 derniers j', count: activeRecent ?? 0, icon: Activity,  color: 'text-red-400' },
      ])

      // Weekly signups — 8 dernières semaines
      const { data: profileDates } = await supabase
        .from('profiles')
        .select('created_at')
        .gte('created_at', new Date(Date.now() - 56 * 86400000).toISOString())

      const weekMap: Record<string, number> = {}
      for (const p of profileDates || []) {
        const d = new Date(p.created_at)
        const monday = new Date(d)
        monday.setDate(d.getDate() - ((d.getDay() + 6) % 7))
        const key = monday.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
        weekMap[key] = (weekMap[key] || 0) + 1
      }
      setWeekly(Object.entries(weekMap).map(([week, count]) => ({ week, count })))
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-400" />
    </div>
  )

  const max = Math.max(...steps.map(s => s.count), 1)
  const maxWeekly = Math.max(...weekly.map(w => w.count), 1)

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
      <div>
        <h2 className="text-2xl font-black text-white">Onboarding</h2>
        <p className="text-sm text-gray-500 mt-1">Funnel d'activation des utilisateurs</p>
      </div>

      {/* Funnel */}
      <section className="space-y-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600">Funnel d'activation</p>
        {steps.map((step, i) => {
          const pct = Math.round((step.count / max) * 100)
          const convPct = i > 0 ? Math.round((step.count / (steps[i - 1].count || 1)) * 100) : 100
          const Icon = step.icon
          return (
            <motion.div
              key={step.label}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              className="bg-dark-card border border-dark-border rounded-xl p-4"
            >
              <div className="flex items-center gap-4 mb-2">
                <div className="w-8 h-8 rounded-lg bg-dark-bg border border-dark-border flex items-center justify-center shrink-0">
                  <Icon size={15} className={step.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white">{step.label}</span>
                      <span className="text-xs text-gray-600">{step.description}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {i > 0 && (
                        <span className={`text-xs font-medium ${convPct > 60 ? 'text-emerald-400' : convPct > 30 ? 'text-amber-400' : 'text-red-400'}`}>
                          {convPct}% conv.
                        </span>
                      )}
                      <span className={`text-lg font-black ${step.color}`}>{step.count}</span>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full bg-dark-bg overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ delay: 0.3 + i * 0.08, duration: 0.5 }}
                      className={`h-full rounded-full ${step.color.replace('text-', 'bg-')}`}
                    />
                  </div>
                </div>
                {i < steps.length - 1 && (
                  <ArrowRight size={14} className="text-gray-700 shrink-0" />
                )}
              </div>
            </motion.div>
          )
        })}
      </section>

      {/* Weekly signups */}
      {weekly.length > 0 && (
        <section>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-3 flex items-center gap-1.5">
            <TrendingUp size={11} />Inscriptions — 8 dernières semaines
          </p>
          <div className="bg-dark-card border border-dark-border rounded-2xl p-4">
            <div className="flex items-end gap-2 h-24">
              {weekly.map((w, i) => (
                <motion.div
                  key={w.week}
                  className="flex-1 flex flex-col items-center gap-1"
                  initial={{ opacity: 0, scaleY: 0 }}
                  animate={{ opacity: 1, scaleY: 1 }}
                  transition={{ delay: 0.2 + i * 0.04, origin: 'bottom' }}
                >
                  <span className="text-[10px] text-gray-500 font-medium">{w.count || ''}</span>
                  <div
                    className="w-full rounded-t bg-accent-blue/50 hover:bg-accent-blue/80 transition-colors min-h-[2px]"
                    style={{ height: `${Math.max((w.count / maxWeekly) * 72, 2)}px` }}
                    title={`${w.week} : ${w.count} inscription(s)`}
                  />
                  <span className="text-[9px] text-gray-700 text-center leading-tight">{w.week}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
