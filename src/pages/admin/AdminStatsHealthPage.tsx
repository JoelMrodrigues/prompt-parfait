import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Server, Database, Wifi, WifiOff, RefreshCw, Clock, CheckCircle, XCircle, AlertCircle, Zap, Key, TrendingUp, AlertTriangle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { getBackendUrl } from '../../lib/constants'

interface CheckResult {
  label: string
  status: 'ok' | 'warn' | 'error' | 'loading'
  latency?: number
  detail?: string
}

const StatusIcon = ({ status }: { status: CheckResult['status'] }) => {
  if (status === 'loading') return <RefreshCw size={16} className="animate-spin text-gray-400" />
  if (status === 'ok')      return <CheckCircle size={16} className="text-emerald-400" />
  if (status === 'warn')    return <AlertCircle size={16} className="text-amber-400" />
  return <XCircle size={16} className="text-red-400" />
}

const statusColor = (s: CheckResult['status']) => {
  if (s === 'ok')      return 'text-emerald-400'
  if (s === 'warn')    return 'text-amber-400'
  if (s === 'loading') return 'text-gray-400'
  return 'text-red-400'
}

const statusBg = (s: CheckResult['status']) => {
  if (s === 'ok')      return 'border-emerald-500/20 bg-emerald-500/5'
  if (s === 'warn')    return 'border-amber-500/20 bg-amber-500/5'
  if (s === 'loading') return 'border-dark-border bg-dark-bg'
  return 'border-red-500/20 bg-red-500/5'
}

export const AdminStatsHealthPage = () => {
  const [checks, setChecks] = useState<CheckResult[]>([
    { label: 'Supabase DB', status: 'loading' },
    { label: 'Backend Express', status: 'loading' },
    { label: 'API Riot (via backend)', status: 'loading' },
  ])
  const [lastChecked, setLastChecked] = useState<Date | null>(null)
  const [dbStats, setDbStats] = useState<{ table: string; count: number }[]>([])
  const [riotMetrics, setRiotMetrics] = useState<{
    per_minute_now: number
    per_minute_5m_avg: number
    rate_limited_total: number
    rate_limited_last5m: number
    total: number
    keys_count: number
    key_configured: boolean
    uptime_seconds: number
  } | null>(null)

  const runChecks = useCallback(async () => {
    setChecks([
      { label: 'Supabase DB', status: 'loading' },
      { label: 'Backend Express', status: 'loading' },
      { label: 'API Riot (via backend)', status: 'loading' },
    ])

    // Check 1 — Supabase
    const t0 = performance.now()
    try {
      const { error } = await supabase!.from('profiles').select('id', { count: 'exact', head: true })
      const latency = Math.round(performance.now() - t0)
      setChecks(c => c.map(x => x.label === 'Supabase DB' ? {
        ...x,
        status: error ? 'error' : latency > 1000 ? 'warn' : 'ok',
        latency,
        detail: error ? error.message : latency > 1000 ? 'Latence élevée' : 'Opérationnel',
      } : x))
    } catch {
      setChecks(c => c.map(x => x.label === 'Supabase DB' ? { ...x, status: 'error', detail: 'Connexion échouée' } : x))
    }

    // Check 2 — Backend Express
    const t1 = performance.now()
    try {
      const res = await fetch(`${getBackendUrl()}/health`, { signal: AbortSignal.timeout(5000) })
      const latency = Math.round(performance.now() - t1)
      setChecks(c => c.map(x => x.label === 'Backend Express' ? {
        ...x,
        status: res.ok ? (latency > 2000 ? 'warn' : 'ok') : 'error',
        latency,
        detail: res.ok ? (latency > 2000 ? 'Lent' : 'Opérationnel') : `HTTP ${res.status}`,
      } : x))
    } catch {
      setChecks(c => c.map(x => x.label === 'Backend Express' ? { ...x, status: 'error', detail: 'Injoignable' } : x))
    }

    // Check 3 — Riot via backend (/riot/status)
    const t2 = performance.now()
    try {
      const res = await fetch(`${getBackendUrl()}/api/riot/status`, { signal: AbortSignal.timeout(8000) })
      const latency = Math.round(performance.now() - t2)
      const json = res.ok ? await res.json().catch(() => ({})) : {}
      setChecks(c => c.map(x => x.label === 'API Riot (via backend)' ? {
        ...x,
        status: res.ok ? 'ok' : res.status === 429 ? 'warn' : 'error',
        latency,
        detail: res.ok ? (json.configured ? 'Clé configurée' : 'Clé manquante') : res.status === 429 ? 'Rate limited' : `HTTP ${res.status}`,
      } : x))
    } catch {
      setChecks(c => c.map(x => x.label === 'API Riot (via backend)' ? { ...x, status: 'error', detail: 'Backend injoignable' } : x))
    }

    // Metrics Riot
    try {
      const res = await fetch(`${getBackendUrl()}/api/riot/metrics`, { signal: AbortSignal.timeout(5000) })
      if (res.ok) setRiotMetrics(await res.json())
    } catch { /* backend injoignable */ }

    setLastChecked(new Date())
  }, [])

  const loadDbStats = useCallback(async () => {
    if (!supabase) return
    const tables = ['teams', 'players', 'profiles', 'team_matches', 'player_soloq_matches']
    const results = await Promise.all(
      tables.map(async table => {
        const { count } = await supabase!.from(table).select('*', { count: 'exact', head: true })
        return { table, count: count ?? 0 }
      })
    )
    setDbStats(results)
  }, [])

  useEffect(() => {
    runChecks()
    loadDbStats()
  }, [])

  const globalStatus = checks.some(c => c.status === 'error') ? 'error'
    : checks.some(c => c.status === 'warn') ? 'warn'
    : checks.every(c => c.status === 'ok') ? 'ok'
    : 'loading'

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-white">Santé de la plateforme</h2>
          <p className="text-sm text-gray-500 mt-1">
            {lastChecked ? `Dernière vérification : ${lastChecked.toLocaleTimeString('fr-FR')}` : 'Vérification en cours…'}
          </p>
        </div>
        <button
          onClick={() => { runChecks(); loadDbStats() }}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dark-border text-xs text-gray-400 hover:text-white hover:border-red-500/30 transition-colors"
        >
          <RefreshCw size={12} />
          Relancer
        </button>
      </div>

      {/* Status global */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className={`rounded-2xl border p-5 flex items-center gap-4 ${statusBg(globalStatus)}`}
      >
        <div className="w-12 h-12 rounded-xl bg-dark-card flex items-center justify-center border border-dark-border shrink-0">
          {globalStatus === 'ok'      ? <Wifi size={22} className="text-emerald-400" />
           : globalStatus === 'error' ? <WifiOff size={22} className="text-red-400" />
           : <Server size={22} className="text-amber-400" />}
        </div>
        <div>
          <p className={`text-lg font-black ${statusColor(globalStatus)}`}>
            {globalStatus === 'ok'      ? 'Tous les systèmes opérationnels'
             : globalStatus === 'error' ? 'Incident détecté'
             : globalStatus === 'warn'  ? 'Dégradation partielle'
             : 'Vérification en cours…'}
          </p>
          <p className="text-xs text-gray-500">{checks.filter(c => c.status === 'ok').length}/{checks.length} services opérationnels</p>
        </div>
      </motion.div>

      {/* Checks individuels */}
      <section>
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-3">Services</p>
        <div className="space-y-3">
          {checks.map((check, i) => (
            <motion.div
              key={check.label}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              className={`flex items-center gap-4 p-4 rounded-xl border ${statusBg(check.status)}`}
            >
              <StatusIcon status={check.status} />
              <div className="flex-1">
                <p className="text-sm font-semibold text-white">{check.label}</p>
                {check.detail && <p className={`text-xs mt-0.5 ${statusColor(check.status)}`}>{check.detail}</p>}
              </div>
              {check.latency !== undefined && (
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Clock size={11} />
                  {check.latency}ms
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </section>

      {/* Métriques Riot API */}
      {riotMetrics && (
        <section>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-3">Riot API — Utilisation</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            {[
              { label: 'Req/min (maintenant)', value: riotMetrics.per_minute_now, icon: Zap, color: riotMetrics.per_minute_now > 80 ? 'text-red-400' : riotMetrics.per_minute_now > 50 ? 'text-amber-400' : 'text-emerald-400' },
              { label: 'Req/min (moy. 5 min)', value: riotMetrics.per_minute_5m_avg, icon: TrendingUp, color: 'text-accent-blue' },
              { label: 'Clés API actives',      value: riotMetrics.keys_count, icon: Key, color: riotMetrics.key_configured ? 'text-emerald-400' : 'text-red-400' },
              { label: 'Rate limits (total)',   value: riotMetrics.rate_limited_total, icon: AlertTriangle, color: riotMetrics.rate_limited_total > 0 ? 'text-amber-400' : 'text-gray-500' },
            ].map(({ label, value, icon: Icon, color }, i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.05 }}
                className="bg-dark-card border border-dark-border rounded-xl p-4 flex items-center gap-3"
              >
                <div className="w-9 h-9 rounded-xl bg-dark-bg border border-dark-border flex items-center justify-center shrink-0">
                  <Icon size={16} className={color} />
                </div>
                <div>
                  <p className={`text-xl font-black ${color}`}>{value}</p>
                  <p className="text-[10px] text-gray-500 leading-tight">{label}</p>
                </div>
              </motion.div>
            ))}
          </div>
          {riotMetrics.per_minute_now > 80 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">
              <AlertTriangle size={13} />
              Taux élevé — tu approches la limite Riot (100 req/min). Envisage une seconde clé API.
            </div>
          )}
          {riotMetrics.rate_limited_last5m > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-400 mt-2">
              <AlertTriangle size={13} />
              {riotMetrics.rate_limited_last5m} rate limit(s) sur les 5 dernières minutes.
            </div>
          )}
          <p className="text-[10px] text-gray-700 mt-2">
            {riotMetrics.total} requêtes tracées depuis le démarrage du serveur ({Math.round(riotMetrics.uptime_seconds / 60)} min uptime)
          </p>
        </section>
      )}

      {/* Stats tables DB */}
      {dbStats.length > 0 && (
        <section>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-3">Volumes en base</p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {dbStats.map(({ table, count }, i) => (
              <motion.div
                key={table}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.05 }}
                className="bg-dark-card border border-dark-border rounded-xl p-3 text-center"
              >
                <Database size={14} className="text-gray-600 mx-auto mb-1.5" />
                <p className="text-lg font-black text-white">{count.toLocaleString()}</p>
                <p className="text-[10px] text-gray-600 capitalize">{table.replace(/_/g, ' ')}</p>
              </motion.div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
