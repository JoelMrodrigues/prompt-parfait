import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { UserCircle, Users, Shield, Clock, Pencil, X, Mail, Lock, Check, AlertCircle, RefreshCw } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { getBackendUrl } from '../../lib/constants'

interface UserRow {
  id: string
  email: string | null
  display_name: string | null
  created_at: string
  last_sign_in_at: string | null
  last_seen_at: string | null
  is_admin: boolean
  has_team: boolean
}

const relativeTime = (iso: string | null) => {
  if (!iso) return 'Jamais'
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

// ─── Modal édition ────────────────────────────────────────────────────────────

interface EditModalProps {
  user: UserRow
  onClose: () => void
  onSaved: (id: string, changes: Partial<UserRow>) => void
}

const EditUserModal = ({ user, onClose, onSaved }: EditModalProps) => {
  const [email, setEmail]       = useState(user.email || '')
  const [password, setPassword] = useState('')
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [success, setSuccess]   = useState(false)

  const handleSave = async () => {
    const newEmail    = email.trim() !== user.email ? email.trim() : ''
    const newPassword = password.trim()
    if (!newEmail && !newPassword) return onClose()

    setSaving(true)
    setError(null)

    try {
      const { data: { session } } = await supabase!.auth.getSession()
      const token = session?.access_token
      if (!token) throw new Error('Session expirée')

      const body: Record<string, string> = {}
      if (newEmail)    body.email    = newEmail
      if (newPassword) body.password = newPassword

      const res = await fetch(`${getBackendUrl()}/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`)

      setSuccess(true)
      onSaved(user.id, { email: newEmail || user.email || undefined })
      setTimeout(onClose, 1200)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const modal = (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        className="bg-dark-card border border-dark-border rounded-2xl w-full max-w-md shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-dark-border">
          <div>
            <p className="text-sm font-bold text-white">Modifier le compte</p>
            <p className="text-xs text-gray-500 mt-0.5">{user.display_name || user.email || user.id}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <div>
            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
              <Mail size={11} />Adresse email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-dark-bg border border-dark-border rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-red-500/50 transition-colors"
              placeholder="email@exemple.com"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
              <Lock size={11} />Nouveau mot de passe
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-dark-bg border border-dark-border rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-red-500/50 transition-colors"
              placeholder="Laisser vide pour ne pas changer"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">
              <AlertCircle size={13} />
              {error}
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400">
              <Check size={13} />
              Modifications enregistrées
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-5 pb-5">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-dark-border text-sm text-gray-400 hover:text-white transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={saving || success}
            className="flex-1 py-2.5 rounded-xl bg-red-500/15 border border-red-500/30 text-sm text-red-400 hover:bg-red-500/25 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />}
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </motion.div>
    </div>
  )

  return createPortal(modal, document.body)
}

// ─── Page principale ──────────────────────────────────────────────────────────

export const AdminStatsUsersPage = () => {
  const [users, setUsers]       = useState<UserRow[]>([])
  const [loading, setLoading]   = useState(true)
  const [editing, setEditing]   = useState<UserRow | null>(null)
  const [search, setSearch]     = useState('')

  const loadUsers = useCallback(async () => {
    if (!supabase) return
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    if (!token) { setLoading(false); return }

    const res = await fetch(`${getBackendUrl()}/api/admin/users`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) setUsers(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { loadUsers() }, [loadUsers])

  const handleSaved = (id: string, changes: Partial<UserRow>) => {
    setUsers(u => u.map(x => x.id === id ? { ...x, ...changes } : x))
  }

  const sevenDaysAgo  = Date.now() - 7 * 24 * 60 * 60 * 1000
  const recentSignups = users.filter(u => new Date(u.created_at).getTime() > sevenDaysAgo).length

  const filtered = users.filter(u => {
    if (!search) return true
    const q = search.toLowerCase()
    return (u.display_name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q)
  })

  if (loading) return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-400" />
    </div>
  )

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-black text-white">Utilisateurs</h2>
          <p className="text-sm text-gray-500 mt-1">{users.length} comptes enregistrés</p>
        </div>
        <button
          onClick={loadUsers}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dark-border text-xs text-gray-400 hover:text-white hover:border-red-500/30 transition-colors"
        >
          <RefreshCw size={12} />
          Rafraîchir
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total',           value: users.length,                       icon: UserCircle, color: 'text-white' },
          { label: 'Avec une équipe', value: users.filter(u => u.has_team).length, icon: Users,    color: 'text-emerald-400' },
          { label: 'Inscrits (7j)',   value: recentSignups,                      icon: Clock,      color: 'text-accent-blue' },
          { label: 'Admins',          value: users.filter(u => u.is_admin).length, icon: Shield,   color: 'text-red-400' },
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

      {/* Recherche */}
      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Rechercher par nom ou email…"
        className="w-full bg-dark-card border border-dark-border rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-red-500/40 transition-colors"
      />

      {/* Liste */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="bg-dark-card border border-dark-border rounded-2xl overflow-hidden"
      >
        <div className="grid grid-cols-[2fr_2fr_1fr_1fr_40px] gap-3 px-4 py-2.5 border-b border-dark-border text-[10px] font-bold uppercase tracking-widest text-gray-600">
          <span>Utilisateur</span>
          <span>Email</span>
          <span>Dernière activité</span>
          <span>Inscription</span>
          <span />
        </div>
        {filtered.map((u, i) => (
          <motion.div
            key={u.id}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 + i * 0.015 }}
            className="grid grid-cols-[2fr_2fr_1fr_1fr_40px] gap-3 items-center px-4 py-3 border-b border-dark-border/40 last:border-0 hover:bg-dark-bg/40 transition-colors group"
          >
            {/* Nom */}
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-full bg-accent-blue/15 flex items-center justify-center shrink-0">
                <span className="text-[10px] font-bold text-accent-blue">
                  {(u.display_name || u.email || 'U').charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate">{u.display_name || <span className="text-gray-600 italic">Sans nom</span>}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {u.is_admin && <span className="text-[9px] font-black uppercase text-red-400">Admin</span>}
                  {u.has_team  && <span className="text-[9px] text-emerald-500">● Équipe</span>}
                </div>
              </div>
            </div>

            {/* Email */}
            <span className="text-xs text-gray-400 truncate">{u.email || <span className="text-gray-700 italic">—</span>}</span>

            {/* Activité */}
            <span className="text-xs text-gray-500">{relativeTime(u.last_seen_at || u.last_sign_in_at)}</span>

            {/* Inscription */}
            <span className="text-xs text-gray-500">
              {new Date(u.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: '2-digit' })}
            </span>

            {/* Edit */}
            <button
              onClick={() => setEditing(u)}
              className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-lg bg-dark-bg border border-dark-border flex items-center justify-center text-gray-500 hover:text-white hover:border-red-500/30 transition-all"
            >
              <Pencil size={12} />
            </button>
          </motion.div>
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-sm text-gray-600 py-8">Aucun résultat</p>
        )}
      </motion.div>

      <AnimatePresence>
        {editing && (
          <EditUserModal
            user={editing}
            onClose={() => setEditing(null)}
            onSaved={handleSaved}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
