import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Key, Plus, X, Trash2, Eye, EyeOff, RefreshCw, CheckCircle, AlertCircle, ToggleLeft, ToggleRight } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { getBackendUrl } from '../../lib/constants'
import { logAdminAction } from '../../lib/adminLog'

interface RiotKey {
  id: string
  label: string
  key_value: string
  active: boolean
  created_at: string
}

const maskKey = (k: string) => {
  if (!k || k.length < 12) return '****'
  return `${k.slice(0, 8)}…${k.slice(-6)}`
}

export const AdminRiotKeysPage = () => {
  const [keys, setKeys]       = useState<RiotKey[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showValues, setShowValues] = useState<Record<string, boolean>>({})
  const [reloading, setReloading]   = useState(false)
  const [reloadStatus, setReloadStatus] = useState<'ok' | 'error' | null>(null)
  const [form, setForm] = useState({ label: '', key_value: '' })
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    if (!supabase) return
    const { data } = await supabase.from('riot_api_keys').select('*').order('created_at', { ascending: false })
    setKeys((data || []) as RiotKey[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const toggleActive = async (k: RiotKey) => {
    const newVal = !k.active
    await supabase!.from('riot_api_keys').update({ active: newVal }).eq('id', k.id)
    setKeys(ks => ks.map(x => x.id === k.id ? { ...x, active: newVal } : x))
    await logAdminAction(newVal ? 'add_riot_key' : 'remove_riot_key', 'riot_key', k.id, { label: k.label })
  }

  const deleteKey = async (k: RiotKey) => {
    await supabase!.from('riot_api_keys').delete().eq('id', k.id)
    setKeys(ks => ks.filter(x => x.id !== k.id))
    await logAdminAction('remove_riot_key', 'riot_key', k.id, { label: k.label })
  }

  const handleCreate = async () => {
    if (!form.label.trim() || !form.key_value.trim()) return
    setSaving(true)
    const { data } = await supabase!.from('riot_api_keys').insert({
      label: form.label.trim(), key_value: form.key_value.trim(), active: true,
    }).select().single()
    if (data) {
      setKeys(ks => [data as RiotKey, ...ks])
      await logAdminAction('add_riot_key', 'riot_key', data.id, { label: form.label })
    }
    setForm({ label: '', key_value: '' })
    setSaving(false)
    setShowModal(false)
  }

  const reloadBackend = async () => {
    setReloading(true)
    setReloadStatus(null)
    try {
      const { data: { session } } = await supabase!.auth.getSession()
      const res = await fetch(`${getBackendUrl()}/api/admin/riot-keys/reload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token}` },
        signal: AbortSignal.timeout(5000),
      })
      setReloadStatus(res.ok ? 'ok' : 'error')
    } catch {
      setReloadStatus('error')
    } finally {
      setReloading(false)
      setTimeout(() => setReloadStatus(null), 3000)
    }
  }

  const modal = showModal && createPortal(
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-dark-card border border-dark-border rounded-2xl w-full max-w-md shadow-2xl"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-dark-border">
          <p className="text-sm font-bold text-white">Ajouter une clé Riot API</p>
          <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-white transition-colors"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Label</label>
            <input
              type="text" value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
              className="w-full bg-dark-bg border border-dark-border rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-red-500/50"
              placeholder="ex: Clé principale, Backup 1…"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Clé API (RGAPI-…)</label>
            <input
              type="password" value={form.key_value} onChange={e => setForm(f => ({ ...f, key_value: e.target.value }))}
              className="w-full bg-dark-bg border border-dark-border rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-red-500/50 font-mono"
              placeholder="RGAPI-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            />
          </div>
        </div>
        <div className="flex gap-2 px-5 pb-5">
          <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 rounded-xl border border-dark-border text-sm text-gray-400 hover:text-white transition-colors">Annuler</button>
          <button onClick={handleCreate} disabled={saving || !form.label.trim() || !form.key_value.trim()} className="flex-1 py-2.5 rounded-xl bg-red-500/15 border border-red-500/30 text-sm text-red-400 hover:bg-red-500/25 transition-colors disabled:opacity-50">
            {saving ? 'Ajout…' : 'Ajouter'}
          </button>
        </div>
      </motion.div>
    </div>,
    document.body
  )

  if (loading) return <div className="flex items-center justify-center min-h-[40vh]"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-400" /></div>

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-black text-white">Clés Riot API</h2>
          <p className="text-sm text-gray-500 mt-1">{keys.filter(k => k.active).length} clé(s) active(s) sur {keys.length}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={reloadBackend}
            disabled={reloading}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs transition-colors ${
              reloadStatus === 'ok' ? 'border-emerald-500/30 text-emerald-400' :
              reloadStatus === 'error' ? 'border-red-500/30 text-red-400' :
              'border-dark-border text-gray-400 hover:text-white hover:border-red-500/30'
            }`}
          >
            {reloadStatus === 'ok' ? <CheckCircle size={12} /> : reloadStatus === 'error' ? <AlertCircle size={12} /> : <RefreshCw size={12} className={reloading ? 'animate-spin' : ''} />}
            {reloadStatus === 'ok' ? 'Rechargé !' : reloadStatus === 'error' ? 'Erreur' : 'Recharger backend'}
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/15 border border-red-500/30 text-sm text-red-400 hover:bg-red-500/25 transition-colors"
          >
            <Plus size={14} />Ajouter
          </button>
        </div>
      </div>

      <div className="bg-dark-card border border-dark-border rounded-2xl overflow-hidden">
        {keys.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-3">
            <Key size={28} className="text-gray-700" />
            <p className="text-sm text-gray-600">Aucune clé configurée</p>
            <p className="text-xs text-gray-700">La clé dans <code className="text-gray-500">server/.env</code> reste utilisée comme fallback</p>
          </div>
        ) : (
          keys.map((k, i) => (
            <motion.div
              key={k.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.04 }}
              className={`flex items-center gap-3 px-4 py-3.5 border-b border-dark-border/40 last:border-0 transition-colors ${k.active ? '' : 'opacity-50'}`}
            >
              <Key size={14} className={k.active ? 'text-emerald-400' : 'text-gray-600'} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">{k.label}</p>
                <p className="text-xs font-mono text-gray-600 mt-0.5">
                  {showValues[k.id] ? k.key_value : maskKey(k.key_value)}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button onClick={() => setShowValues(s => ({ ...s, [k.id]: !s[k.id] }))} className="w-7 h-7 rounded-lg bg-dark-bg border border-dark-border flex items-center justify-center text-gray-500 hover:text-white transition-colors">
                  {showValues[k.id] ? <EyeOff size={12} /> : <Eye size={12} />}
                </button>
                <button onClick={() => toggleActive(k)} title={k.active ? 'Désactiver' : 'Activer'} className="w-7 h-7 rounded-lg bg-dark-bg border border-dark-border flex items-center justify-center text-gray-500 hover:text-white transition-colors">
                  {k.active ? <ToggleRight size={14} className="text-emerald-400" /> : <ToggleLeft size={14} />}
                </button>
                <button onClick={() => deleteKey(k)} className="w-7 h-7 rounded-lg bg-dark-bg border border-dark-border flex items-center justify-center text-gray-500 hover:text-red-400 transition-colors">
                  <Trash2 size={12} />
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>

      <p className="text-[11px] text-gray-700 text-center">
        Les clés actives sont chargées par le backend au démarrage. Clique "Recharger backend" après tout changement pour les appliquer sans redéployer.
      </p>

      <AnimatePresence>{showModal && modal}</AnimatePresence>
    </div>
  )
}
