import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Check, X, Loader2, RefreshCw } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { Team } from '../../contexts/TeamContext'

const FEATURES = [
  { key: 'champion_pool', label: 'Pool Champs' },
  { key: 'import',        label: 'Import' },
  { key: 'matchs',        label: 'Matchs' },
  { key: 'analyse',       label: 'Analyse' },
  { key: 'stats',         label: 'Stats' },
  { key: 'drafts',        label: 'Drafts' },
  { key: 'coaching',      label: 'Coaching' },
  { key: 'planning',      label: 'Planning' },
  { key: 'plans',         label: 'Plans' },
  { key: 'flex',          label: 'Ranked Flex' },
]

type TeamWithFeatures = Team & { features: Record<string, boolean> }

export const AdminFeaturesPage = () => {
  const [teams, setTeams]         = useState<TeamWithFeatures[]>([])
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState<string | null>(null) // "teamId:featureKey"

  const load = useCallback(async () => {
    if (!supabase) return
    setLoading(true)
    const { data } = await supabase
      .from('teams')
      .select('id, team_name, team_type, logo_url, features')
      .order('team_name')
    setTeams((data || []).map((t: any) => ({
      ...t,
      features: t.features || {},
    })))
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const toggle = async (team: TeamWithFeatures, featureKey: string) => {
    if (!supabase) return
    const key = `${team.id}:${featureKey}`
    if (saving === key) return
    setSaving(key)

    const current = team.features[featureKey] !== false
    const newFeatures = { ...team.features, [featureKey]: !current }

    const { error } = await supabase
      .from('teams')
      .update({ features: newFeatures })
      .eq('id', team.id)

    if (!error) {
      setTeams(prev => prev.map(t =>
        t.id === team.id ? { ...t, features: newFeatures } : t
      ))
    }
    setSaving(null)
  }

  const isEnabled = (team: TeamWithFeatures, key: string) =>
    team.features[key] !== false

  if (loading) return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-400" />
    </div>
  )

  return (
    <div className="px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-white">Gestion des features</h2>
          <p className="text-sm text-gray-500 mt-1">Active ou désactive les modules par équipe</p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dark-border text-xs text-gray-400 hover:text-white hover:border-red-500/30 transition-colors"
        >
          <RefreshCw size={12} />
          Actualiser
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-dark-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-dark-border bg-dark-card/60">
              <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-600 w-48">
                Équipe
              </th>
              {FEATURES.map(f => (
                <th key={f.key} className="px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-600 text-center min-w-[80px]">
                  {f.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {teams.map((team, i) => (
              <motion.tr
                key={team.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.02 }}
                className="border-b border-dark-border/40 last:border-0 hover:bg-dark-bg/30 transition-colors"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-md bg-accent-blue/15 flex items-center justify-center shrink-0 overflow-hidden">
                      {team.logo_url
                        ? <img src={team.logo_url} className="w-full h-full object-contain p-0.5" />
                        : <span className="text-[10px] font-bold text-accent-blue">{(team.team_name || 'E').slice(0, 2).toUpperCase()}</span>
                      }
                    </div>
                    <span className="font-medium text-white truncate max-w-[120px]" title={team.team_name}>
                      {team.team_name}
                    </span>
                  </div>
                </td>
                {FEATURES.map(f => {
                  const enabled = isEnabled(team, f.key)
                  const key = `${team.id}:${f.key}`
                  const isSaving = saving === key
                  return (
                    <td key={f.key} className="px-3 py-3 text-center">
                      <button
                        onClick={() => toggle(team, f.key)}
                        disabled={!!saving}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center mx-auto transition-all ${
                          enabled
                            ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25'
                            : 'bg-dark-bg border border-dark-border text-gray-700 hover:border-red-500/30 hover:text-red-400'
                        } disabled:opacity-50`}
                        title={enabled ? 'Désactiver' : 'Activer'}
                      >
                        {isSaving
                          ? <Loader2 size={12} className="animate-spin" />
                          : enabled
                            ? <Check size={13} />
                            : <X size={13} />
                        }
                      </button>
                    </td>
                  )
                })}
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] text-gray-700 text-center">
        {teams.length} équipes — les changements sont appliqués immédiatement
      </p>
    </div>
  )
}
