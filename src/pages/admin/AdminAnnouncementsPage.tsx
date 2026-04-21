import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { Megaphone, Plus, X, Trash2, AlertCircle, AlertTriangle, Info, Eye, EyeOff } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { logAdminAction } from '../../lib/adminLog'

interface Announcement {
  id: string
  message: string
  type: 'info' | 'warn' | 'error'
  active: boolean
  expires_at: string | null
  created_at: string
}

const TYPE_META = {
  info:  { icon: Info,          color: 'text-accent-blue',  bg: 'bg-accent-blue/10 border-accent-blue/20',  label: 'Info' },
  warn:  { icon: AlertTriangle, color: 'text-amber-400',    bg: 'bg-amber-500/10 border-amber-500/20',       label: 'Avertissement' },
  error: { icon: AlertCircle,   color: 'text-red-400',      bg: 'bg-red-500/10 border-red-500/20',           label: 'Urgent' },
}

interface CreateModalProps {
  onClose: () => void
  onCreated: (ann: Announcement) => void
}

function CreateAnnouncementModal({ onClose, onCreated }: CreateModalProps) {
  const [form, setForm] = useState({ message: '', type: 'info' as Announcement['type'], expires_at: '' })
  const [saving, setSaving] = useState(false)

  const handleCreate = async () => {
    if (!form.message.trim() || !supabase) return
    setSaving(true)
    const row: any = { message: form.message.trim(), type: form.type, active: true }
    if (form.expires_at) row.expires_at = new Date(form.expires_at).toISOString()
    const { data } = await supabase.from('system_announcements').insert(row).select().single()
    if (data) {
      onCreated(data as Announcement)
      await logAdminAction('announcement', 'announcement', data.id, { action: 'created', message: form.message.slice(0, 60) })
    }
    setSaving(false)
    onClose()
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-dark-card border border-dark-border rounded-2xl w-full max-w-lg shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-dark-border">
          <p className="text-sm font-bold text-white">Nouvelle annonce</p>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Message</label>
            <textarea
              value={form.message}
              onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
              rows={3}
              className="w-full bg-dark-bg border border-dark-border rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-red-500/50 resize-none"
              placeholder="Message visible par tous les utilisateurs…"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Type</label>
              <select
                value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value as Announcement['type'] }))}
                className="w-full bg-dark-bg border border-dark-border rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-red-500/50"
              >
                <option value="info">Info</option>
                <option value="warn">Avertissement</option>
                <option value="error">Urgent</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Expire le (optionnel)</label>
              <input
                type="datetime-local"
                value={form.expires_at}
                onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))}
                className="w-full bg-dark-bg border border-dark-border rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-red-500/50"
              />
            </div>
          </div>
          {form.message && (
            <div className={`flex items-start gap-2 p-3 rounded-lg border text-xs ${TYPE_META[form.type].bg}`}>
              {(() => { const Icon = TYPE_META[form.type].icon; return <Icon size={14} className={`${TYPE_META[form.type].color} shrink-0 mt-0.5`} /> })()}
              <span className="text-white">{form.message}</span>
            </div>
          )}
        </div>
        <div className="flex gap-2 px-5 pb-5">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-dark-border text-sm text-gray-400 hover:text-white transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleCreate}
            disabled={saving || !form.message.trim()}
            className="flex-1 py-2.5 rounded-xl bg-red-500/15 border border-red-500/30 text-sm text-red-400 hover:bg-red-500/25 transition-colors disabled:opacity-50"
          >
            {saving ? 'Création…' : 'Publier'}
          </button>
        </div>
      </motion.div>
    </div>,
    document.body
  )
}

export const AdminAnnouncementsPage = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    if (!supabase) { setLoading(false); return }
    supabase.from('system_announcements').select('*').order('created_at', { ascending: false })
      .then(({ data }) => { setAnnouncements((data || []) as Announcement[]); setLoading(false) })
  }, [])

  const toggleActive = async (ann: Announcement) => {
    const newVal = !ann.active
    await supabase!.from('system_announcements').update({ active: newVal }).eq('id', ann.id)
    setAnnouncements(a => a.map(x => x.id === ann.id ? { ...x, active: newVal } : x))
    await logAdminAction('announcement', 'announcement', ann.id, { action: newVal ? 'activated' : 'deactivated', message: ann.message.slice(0, 60) })
  }

  const deleteAnn = async (ann: Announcement) => {
    await supabase!.from('system_announcements').delete().eq('id', ann.id)
    setAnnouncements(a => a.filter(x => x.id !== ann.id))
    await logAdminAction('announcement', 'announcement', ann.id, { action: 'deleted', message: ann.message.slice(0, 60) })
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-400" />
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-white">Annonces système</h2>
          <p className="text-sm text-gray-500 mt-1">Visibles par tous les utilisateurs connectés</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/15 border border-red-500/30 text-sm text-red-400 hover:bg-red-500/25 transition-colors"
        >
          <Plus size={14} />Nouvelle annonce
        </button>
      </div>

      {announcements.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Megaphone size={32} className="text-gray-700" />
          <p className="text-sm text-gray-600">Aucune annonce</p>
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map((ann, i) => {
            const meta = TYPE_META[ann.type]
            const Icon = meta.icon
            const isExpired = ann.expires_at && new Date(ann.expires_at) < new Date()
            return (
              <motion.div
                key={ann.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className={`rounded-xl border p-4 ${ann.active && !isExpired ? meta.bg : 'bg-dark-card border-dark-border opacity-50'}`}
              >
                <div className="flex items-start gap-3">
                  <Icon size={16} className={`${meta.color} shrink-0 mt-0.5`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white">{ann.message}</p>
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      <span className={`text-[10px] font-bold uppercase ${meta.color}`}>{meta.label}</span>
                      {ann.expires_at && (
                        <span className={`text-[10px] ${isExpired ? 'text-red-400' : 'text-gray-500'}`}>
                          {isExpired ? 'Expirée' : `Expire ${new Date(ann.expires_at).toLocaleDateString('fr-FR')}`}
                        </span>
                      )}
                      <span className="text-[10px] text-gray-600">
                        {new Date(ann.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: '2-digit' })}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => toggleActive(ann)}
                      title={ann.active ? 'Désactiver' : 'Activer'}
                      className="w-7 h-7 rounded-lg bg-dark-bg border border-dark-border flex items-center justify-center text-gray-500 hover:text-white transition-colors"
                    >
                      {ann.active ? <Eye size={13} /> : <EyeOff size={13} />}
                    </button>
                    <button
                      onClick={() => deleteAnn(ann)}
                      className="w-7 h-7 rounded-lg bg-dark-bg border border-dark-border flex items-center justify-center text-gray-500 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {showModal && (
        <CreateAnnouncementModal
          onClose={() => setShowModal(false)}
          onCreated={ann => setAnnouncements(a => [ann, ...a])}
        />
      )}
    </div>
  )
}
