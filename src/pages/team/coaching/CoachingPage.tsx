/**
 * Page Coaching — redesign 2 colonnes
 * Sidebar joueurs + fiche complète scrollable (Notes + Objectifs + VODs + Train Champ)
 */
import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Plus, Trash2, FileText, Target, Video, Users, User,
  CheckCircle, XCircle, Clock, ExternalLink, Send, Search,
  X, Shield, ChevronDown, ChevronUp,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTeam } from '../hooks/useTeam'
import { useTeamMatches } from '../hooks/useTeamMatches'
import {
  fetchNotes, addNote, deleteNote,
  fetchObjectives, addObjective, updateObjectiveStatus, deleteObjective,
  fetchVods, addVod, deleteVod,
  fetchActivityFeed,
  type ObjectiveStatus,
} from '../../../services/supabase/coachingQueries'
import {
  fetchTrainingPool, addToTrainingPool, removeFromTrainingPool,
} from '../../../services/supabase/championQueries'
import { loadChampions } from '../../../lib/championLoader'
import { getChampionImage, getChampionDisplayName } from '../../../lib/championImages'
import { FILTER_TO_CHAMPION_ROLE } from '../champion-pool/utils/roleToChampionRole'

// ─── Constantes ───────────────────────────────────────────────────────────────

const TEAM_ID = '__team__'
const ROLE_FILTERS = ['ALL', 'TOP', 'JNG', 'MID', 'ADC', 'SUP'] as const
type RoleFilter = (typeof ROLE_FILTERS)[number]

const STATUS_CFG: Record<ObjectiveStatus, { label: string; color: string; bg: string; border: string; Icon: React.ElementType }> = {
  ongoing:   { label: 'En cours',   color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20',   Icon: Clock },
  achieved:  { label: 'Atteint',    color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', Icon: CheckCircle },
  abandoned: { label: 'Abandonné',  color: 'text-gray-500',    bg: 'bg-gray-500/10',    border: 'border-gray-500/20',    Icon: XCircle },
}

const POSITION_COLORS: Record<string, string> = {
  TOP: 'text-orange-400', JNG: 'text-green-400', MID: 'text-blue-400',
  ADC: 'text-red-400',    SUP: 'text-purple-400',
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'À l\'instant'
  if (m < 60) return `Il y a ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `Il y a ${h}h`
  const d = Math.floor(h / 24)
  if (d === 1) return 'Hier'
  if (d < 7)  return `Il y a ${d} jours`
  return fmtDate(iso)
}

// ─── Section wrapper collapsible ─────────────────────────────────────────────

function Section({
  icon: Icon, title, count, action, children, defaultOpen = true,
}: {
  icon: React.ElementType
  title: string
  count?: number
  action?: React.ReactNode
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="bg-dark-card border border-dark-border rounded-2xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-dark-bg/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-accent-blue/10 flex items-center justify-center">
            <Icon size={15} className="text-accent-blue" />
          </div>
          <span className="font-semibold text-white text-sm">{title}</span>
          {count != null && (
            <span className="text-xs text-gray-500 bg-dark-bg border border-dark-border px-2 py-0.5 rounded-full">
              {count}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
          {action}
          {open ? <ChevronUp size={14} className="text-gray-500" /> : <ChevronDown size={14} className="text-gray-500" />}
        </div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 pt-1 border-t border-dark-border/50">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Notes ────────────────────────────────────────────────────────────────────

function NotesSection({ teamId, playerId, onAction }: { teamId: string; playerId: string | null; onAction?: () => void }) {
  const [notes, setNotes] = useState<any[]>([])
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const { data } = await fetchNotes(teamId, playerId)
    if (data) setNotes(data)
  }, [teamId, playerId])

  useEffect(() => { setNotes([]); setDraft(''); load() }, [load])

  const handleAdd = async () => {
    if (!draft.trim()) return
    setSaving(true)
    const { data } = await addNote(teamId, playerId, draft.trim())
    if (data) { setNotes(prev => [data, ...prev]); onAction?.() }
    setDraft('')
    setSaving(false)
  }

  return (
    <Section icon={FileText} title="Notes" count={notes.length}>
      {/* Textarea */}
      <div className="flex gap-2 mt-2 mb-4">
        <textarea
          value={draft}
          onChange={e => setDraft(e.target.value)}
          placeholder="Ajouter une note de coaching..."
          rows={2}
          onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) handleAdd() }}
          className="flex-1 bg-dark-bg border border-dark-border rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-accent-blue/50 resize-none"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={saving || !draft.trim()}
          className="self-end flex items-center gap-1.5 px-3 py-2 bg-accent-blue hover:bg-accent-blue/90 disabled:opacity-40 text-white text-xs font-medium rounded-xl transition-colors whitespace-nowrap"
        >
          <Send size={12} />
          Envoyer
        </button>
      </div>

      {notes.length === 0 ? (
        <p className="text-sm text-gray-600 text-center py-4">Aucune note pour l'instant.</p>
      ) : (
        <div className="space-y-2">
          {notes.map(note => (
            <div key={note.id} className="group flex items-start gap-3 p-3 bg-dark-bg rounded-xl border border-dark-border/50">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-200 whitespace-pre-wrap leading-relaxed">{note.content}</p>
                <p className="text-xs text-gray-600 mt-1.5">{fmtDate(note.created_at)}</p>
              </div>
              <button
                type="button"
                onClick={() => { deleteNote(note.id); setNotes(p => p.filter(n => n.id !== note.id)) }}
                className="text-gray-600 hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100 shrink-0 mt-0.5"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </Section>
  )
}

// ─── Objectifs ────────────────────────────────────────────────────────────────

function ObjectivesSection({ teamId, playerId, onAction }: { teamId: string; playerId: string | null; onAction?: () => void }) {
  const [objectives, setObjectives] = useState<any[]>([])
  const [draft, setDraft] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const { data } = await fetchObjectives(teamId, playerId)
    if (data) setObjectives(data)
  }, [teamId, playerId])

  useEffect(() => { setObjectives([]); setDraft(''); setDueDate(''); load() }, [load])

  const handleAdd = async () => {
    if (!draft.trim()) return
    setSaving(true)
    const { data } = await addObjective(teamId, playerId, draft.trim(), dueDate || null)
    if (data) { setObjectives(prev => [data, ...prev]); onAction?.() }
    setDraft(''); setDueDate(''); setSaving(false)
  }

  const handleStatus = async (id: string, status: ObjectiveStatus) => {
    const { data } = await updateObjectiveStatus(id, status)
    if (data) { setObjectives(prev => prev.map(o => o.id === id ? data : o)); onAction?.() }
  }

  const ongoing   = objectives.filter(o => o.status === 'ongoing')
  const achieved  = objectives.filter(o => o.status === 'achieved')
  const abandoned = objectives.filter(o => o.status === 'abandoned')

  return (
    <Section icon={Target} title="Objectifs" count={objectives.length}>
      {/* Add form */}
      <div className="flex gap-2 mt-2 mb-4 flex-wrap">
        <input
          type="text"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          placeholder="Nouvel objectif..."
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          className="flex-1 min-w-48 bg-dark-bg border border-dark-border rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-accent-blue/50"
        />
        <input
          type="date"
          value={dueDate}
          onChange={e => setDueDate(e.target.value)}
          className="bg-dark-bg border border-dark-border rounded-xl px-3 py-2 text-sm text-gray-400 focus:outline-none focus:border-accent-blue/50"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={saving || !draft.trim()}
          className="flex items-center gap-1.5 px-3 py-2 bg-accent-blue hover:bg-accent-blue/90 disabled:opacity-40 text-white text-xs font-medium rounded-xl transition-colors whitespace-nowrap"
        >
          <Plus size={12} />
          Ajouter
        </button>
      </div>

      {objectives.length === 0 ? (
        <p className="text-sm text-gray-600 text-center py-4">Aucun objectif pour l'instant.</p>
      ) : (
        <div className="space-y-4">
          {[
            { status: 'ongoing' as ObjectiveStatus,   list: ongoing,   label: 'En cours' },
            { status: 'achieved' as ObjectiveStatus,  list: achieved,  label: 'Atteints' },
            { status: 'abandoned' as ObjectiveStatus, list: abandoned, label: 'Abandonnés' },
          ].filter(g => g.list.length > 0).map(group => {
            const cfg = STATUS_CFG[group.status]
            const GroupIcon = cfg.Icon
            return (
              <div key={group.status}>
                <div className={`flex items-center gap-2 mb-2`}>
                  <GroupIcon size={12} className={cfg.color} />
                  <span className={`text-xs font-semibold uppercase tracking-wider ${cfg.color}`}>{group.label}</span>
                  <span className="text-xs text-gray-600">{group.list.length}</span>
                </div>
                <div className="space-y-1.5">
                  {group.list.map(obj => (
                    <div
                      key={obj.id}
                      className={`group flex items-center gap-3 p-3 rounded-xl border ${cfg.border} ${cfg.bg} ${obj.status === 'abandoned' ? 'opacity-50' : ''}`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${obj.status === 'abandoned' ? 'line-through text-gray-500' : 'text-white'}`}>
                          {obj.title}
                        </p>
                        {obj.due_date && (
                          <p className="text-xs text-gray-500 mt-0.5">Échéance : {obj.due_date}</p>
                        )}
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        {(['ongoing', 'achieved', 'abandoned'] as ObjectiveStatus[])
                          .filter(st => st !== obj.status)
                          .map(st => {
                            const c = STATUS_CFG[st]; const CI = c.Icon
                            return (
                              <button key={st} type="button" onClick={() => handleStatus(obj.id, st)}
                                title={c.label}
                                className={`p-1.5 rounded-lg hover:bg-dark-bg/60 transition-colors ${c.color}`}>
                                <CI size={13} />
                              </button>
                            )
                          })}
                        <button type="button"
                          onClick={() => { deleteObjective(obj.id); setObjectives(p => p.filter(o => o.id !== obj.id)) }}
                          className="p-1.5 rounded-lg text-gray-600 hover:text-rose-400 hover:bg-dark-bg/60 transition-colors">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Section>
  )
}

// ─── VODs ─────────────────────────────────────────────────────────────────────

function VodsSection({ teamId, playerId, onAction }: { teamId: string; playerId: string | null; onAction?: () => void }) {
  const [vods, setVods] = useState<any[]>([])
  const [url, setUrl] = useState('')
  const [desc, setDesc] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const { data } = await fetchVods(teamId, playerId)
    if (data) setVods(data)
  }, [teamId, playerId])

  useEffect(() => { setVods([]); setUrl(''); setDesc(''); load() }, [load])

  const handleAdd = async () => {
    if (!url.trim()) return
    setSaving(true)
    const { data } = await addVod(teamId, playerId, url.trim(), desc.trim())
    if (data) { setVods(prev => [data, ...prev]); onAction?.() }
    setUrl(''); setDesc(''); setSaving(false)
  }

  return (
    <Section icon={Video} title="VODs" count={vods.length} defaultOpen={false}>
      <div className="flex flex-col gap-2 mt-2 mb-4">
        <input
          type="url"
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="https://youtube.com/watch?v=..."
          className="w-full bg-dark-bg border border-dark-border rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-accent-blue/50"
        />
        <div className="flex gap-2">
          <input
            type="text"
            value={desc}
            onChange={e => setDesc(e.target.value)}
            placeholder="Titre / description..."
            className="flex-1 bg-dark-bg border border-dark-border rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-accent-blue/50"
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={saving || !url.trim()}
            className="flex items-center gap-1.5 px-3 py-2 bg-accent-blue hover:bg-accent-blue/90 disabled:opacity-40 text-white text-xs font-medium rounded-xl transition-colors whitespace-nowrap"
          >
            <Plus size={12} />
            Ajouter
          </button>
        </div>
      </div>

      {vods.length === 0 ? (
        <p className="text-sm text-gray-600 text-center py-4">Aucune VOD pour l'instant.</p>
      ) : (
        <div className="space-y-2">
          {vods.map(vod => (
            <div key={vod.id} className="group flex items-center gap-3 p-3 bg-dark-bg rounded-xl border border-dark-border/50 hover:border-dark-border transition-colors">
              <div className="w-8 h-8 rounded-lg bg-accent-blue/10 border border-accent-blue/20 flex items-center justify-center shrink-0">
                <Video size={14} className="text-accent-blue" />
              </div>
              <div className="flex-1 min-w-0">
                {vod.description && (
                  <p className="text-sm font-medium text-white truncate">{vod.description}</p>
                )}
                <a
                  href={vod.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-accent-blue/80 hover:text-accent-blue truncate block"
                >
                  {vod.url}
                  <ExternalLink size={10} className="inline ml-1 opacity-70" />
                </a>
                <p className="text-xs text-gray-600 mt-0.5">{fmtDate(vod.created_at)}</p>
              </div>
              <button
                type="button"
                onClick={() => { deleteVod(vod.id); setVods(p => p.filter(v => v.id !== vod.id)) }}
                className="text-gray-600 hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </Section>
  )
}

// ─── Train Champ ──────────────────────────────────────────────────────────────

function TrainChampSection({ playerId }: { playerId: string }) {
  const [trainingChamps, setTrainingChamps] = useState<{ id: string; champion_id: string }[]>([])
  const [allChampions, setAllChampions] = useState<any[]>([])
  const [query, setQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('ALL')

  useEffect(() => { loadChampions().then(setAllChampions) }, [])

  const load = useCallback(async () => {
    const { data } = await fetchTrainingPool(playerId)
    if (data) setTrainingChamps(data as any)
  }, [playerId])

  useEffect(() => { load() }, [load])

  const trainingIds = useMemo(() => new Set(trainingChamps.map(c => c.champion_id)), [trainingChamps])

  const filtered = useMemo(() => {
    let list = allChampions
    if (roleFilter !== 'ALL') {
      const cr = FILTER_TO_CHAMPION_ROLE[roleFilter]
      list = list.filter(c => c.roles?.includes(cr))
    }
    const q = query.trim().toLowerCase()
    if (q) list = list.filter(c => c.id?.toLowerCase().includes(q) || c.name?.toLowerCase().includes(q))
    return list
  }, [allChampions, query, roleFilter])

  return (
    <Section icon={Shield} title="Champions à travailler" count={trainingChamps.length} defaultOpen={false}>
      {/* Assigned */}
      {trainingChamps.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4 mt-2 p-3 bg-dark-bg rounded-xl border border-dark-border/50">
          {trainingChamps.map(c => (
            <div key={c.champion_id}
              className="group flex items-center gap-2 pl-1 pr-2 py-1 bg-dark-card border border-dark-border hover:border-rose-500/30 rounded-xl transition-colors"
            >
              <img src={getChampionImage(c.champion_id)} alt={c.champion_id}
                className="w-8 h-8 rounded-lg object-cover border border-dark-border" />
              <span className="text-xs font-medium text-white">
                {getChampionDisplayName(c.champion_id) || c.champion_id}
              </span>
              <button type="button" onClick={() => { removeFromTrainingPool(playerId, c.champion_id); setTrainingChamps(p => p.filter(x => x.champion_id !== c.champion_id)) }}
                className="text-gray-600 hover:text-rose-400 transition-colors ml-0.5">
                <X size={11} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Picker */}
      <div className="flex flex-col sm:flex-row gap-2 mb-3">
        <div className="relative flex-1">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Rechercher..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="pl-8 pr-3 py-2 w-full bg-dark-bg border border-dark-border rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-accent-blue/50"
          />
        </div>
        <div className="flex gap-1">
          {ROLE_FILTERS.map(r => (
            <button key={r} type="button" onClick={() => setRoleFilter(r)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                roleFilter === r
                  ? 'bg-accent-blue/20 text-accent-blue border border-accent-blue/40'
                  : 'bg-dark-bg border border-dark-border text-gray-400 hover:text-white'
              }`}
            >{r}</button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-8 sm:grid-cols-10 lg:grid-cols-14 gap-1.5 max-h-56 overflow-y-auto pr-1">
        {filtered.map(c => {
          const used = trainingIds.has(c.id)
          return (
            <button key={c.id} type="button" onClick={() => !used && addToTrainingPool(playerId, c.id).then(() => load())}
              disabled={used} title={getChampionDisplayName(c.name) || c.name}
              className={`relative rounded-lg overflow-hidden border transition-all ${
                used ? 'opacity-20 cursor-not-allowed border-transparent' : 'border-dark-border hover:border-accent-blue/60 cursor-pointer'
              }`}
            >
              <img src={getChampionImage(c.id)} alt={c.name} className="w-full aspect-square object-cover" />
            </button>
          )
        })}
      </div>
    </Section>
  )
}

// ─── Activity Feed ────────────────────────────────────────────────────────────

const FEED_CFG = {
  note:                { label: 'Note ajoutée',        dot: 'bg-violet-500',   text: 'text-violet-400',  bg: 'bg-violet-500/10',  border: 'border-violet-500/20' },
  objective_added:     { label: 'Objectif ajouté',     dot: 'bg-accent-blue',  text: 'text-accent-blue', bg: 'bg-accent-blue/10', border: 'border-accent-blue/20' },
  objective_achieved:  { label: 'Objectif atteint',    dot: 'bg-emerald-500',  text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  objective_abandoned: { label: 'Objectif abandonné',  dot: 'bg-gray-500',     text: 'text-gray-500',    bg: 'bg-gray-500/10',    border: 'border-gray-500/20' },
  vod:                 { label: 'VOD ajoutée',          dot: 'bg-amber-500',    text: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20' },
} as const
type FeedType = keyof typeof FEED_CFG

function ActivityFeed({ teamId, players, playerId, refreshKey }: {
  teamId: string
  players: any[]
  playerId: string | null
  refreshKey: number
}) {
  const [items, setItems] = useState<any[]>([])

  useEffect(() => {
    fetchActivityFeed(teamId).then(({ notes, objectives, vods }) => {
      const playerName = (pid: string | null) =>
        pid ? (players.find(p => p.id === pid)?.player_name || players.find(p => p.id === pid)?.pseudo || 'Joueur') : 'Équipe'

      // Filtre selon la sélection : null = équipe (tout le monde), string = joueur spécifique
      const matchPlayer = (pid: string | null) =>
        playerId === null ? true : pid === playerId

      const events: { id: string; type: FeedType; who: string; text: string; at: string }[] = [
        ...notes.filter((n: any) => matchPlayer(n.player_id)).map((n: any) => ({
          id: 'n-' + n.id, type: 'note' as FeedType,
          who: playerName(n.player_id),
          text: n.content.length > 60 ? n.content.slice(0, 58) + '…' : n.content,
          at: n.created_at,
        })),
        ...objectives.filter((o: any) => matchPlayer(o.player_id)).map((o: any) => ({
          id: 'o-' + o.id,
          type: (o.status === 'achieved' ? 'objective_achieved' : o.status === 'abandoned' ? 'objective_abandoned' : 'objective_added') as FeedType,
          who: playerName(o.player_id),
          text: o.title,
          at: o.created_at,
        })),
        ...vods.filter((v: any) => matchPlayer(v.player_id)).map((v: any) => ({
          id: 'v-' + v.id, type: 'vod' as FeedType,
          who: playerName(v.player_id),
          text: v.description || v.url,
          at: v.created_at,
        })),
      ]
      events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
      setItems(events.slice(0, 25))
    })
  }, [teamId, playerId, refreshKey, players])

  const feedTitle = playerId
    ? (players.find(p => p.id === playerId)?.player_name || players.find(p => p.id === playerId)?.pseudo || 'Joueur')
    : 'Toute l\'équipe'

  return (
    <div className="w-72 shrink-0 border-l border-dark-border flex flex-col bg-dark-bg/10 overflow-hidden">
      <div className="px-4 py-4 border-b border-dark-border shrink-0">
        <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Activité récente</p>
        <p className="text-xs text-gray-600 mt-0.5">{feedTitle}</p>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-center">
            <p className="text-xs text-gray-600">Aucune activité pour l'instant.</p>
            <p className="text-xs text-gray-700 mt-1">Les actions apparaîtront ici.</p>
          </div>
        ) : items.map(item => {
          const cfg = FEED_CFG[item.type]
          return (
            <div key={item.id} className={`rounded-xl border ${cfg.border} ${cfg.bg} px-3 py-2.5`}>
              <div className="flex items-center gap-2 mb-1">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
                <span className={`text-[11px] font-semibold ${cfg.text}`}>{cfg.label}</span>
                <span className="ml-auto text-[10px] text-gray-600 shrink-0">{timeAgo(item.at)}</span>
              </div>
              <p className="text-xs font-medium text-white truncate">{item.who}</p>
              <p className="text-xs text-gray-500 line-clamp-2 mt-0.5 leading-relaxed">{item.text}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Sidebar player card ──────────────────────────────────────────────────────

function PlayerCard({
  label, sublabel, position, imageUrl, isActive, onClick,
}: {
  label: string
  sublabel?: string
  position?: string
  imageUrl?: string | null
  isActive: boolean
  onClick: () => void
}) {
  const posColor = position ? (POSITION_COLORS[position.toUpperCase()] ?? 'text-gray-400') : 'text-gray-400'
  const isTeamCard = !!sublabel

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
        isActive
          ? 'bg-accent-blue/15 border border-accent-blue/30 text-white'
          : 'border border-transparent text-gray-400 hover:text-white hover:bg-dark-card hover:border-dark-border'
      }`}
    >
      {/* Avatar */}
      <div className={`w-8 h-8 rounded-lg shrink-0 overflow-hidden flex items-center justify-center ${
        imageUrl ? '' : (isActive ? 'bg-accent-blue/20' : 'bg-dark-bg border border-dark-border')
      }`}>
        {imageUrl
          ? <img src={imageUrl} alt={label} className={`w-full h-full ${isTeamCard ? 'object-contain p-0.5' : 'object-cover'}`} />
          : isTeamCard
            ? <Users size={13} className={isActive ? 'text-accent-blue' : 'text-gray-500'} />
            : <User size={13} className={isActive ? 'text-accent-blue' : 'text-gray-500'} />
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate leading-tight ${isActive ? 'text-white' : ''}`}>{label}</p>
        {sublabel && <p className="text-xs text-gray-600 truncate">{sublabel}</p>}
        {position && (
          <p className={`text-[10px] font-semibold uppercase ${posColor}`}>{position}</p>
        )}
      </div>
    </button>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────

export const CoachingPage = () => {
  const { team, players = [] } = useTeam()
  const { matches } = useTeamMatches(team?.id)
  const [selectedKey, setSelectedKey] = useState<string>(TEAM_ID)
  const [feedKey, setFeedKey] = useState(0)
  const bumpFeed = useCallback(() => setFeedKey(k => k + 1), [])

  // Champion le plus joué en team par joueur
  const topChampByPlayer = useMemo(() => {
    const counts: Record<string, Record<string, number>> = {}
    for (const match of matches) {
      for (const p of (match.team_match_participants ?? [])) {
        if (!p.player_id || !p.champion_name) continue
        if (!counts[p.player_id]) counts[p.player_id] = {}
        counts[p.player_id][p.champion_name] = (counts[p.player_id][p.champion_name] || 0) + 1
      }
    }
    const result: Record<string, string> = {}
    for (const [pid, champCounts] of Object.entries(counts)) {
      result[pid] = Object.entries(champCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? ''
    }
    return result
  }, [matches])

  const POSITION_ORDER = ['TOP', 'JNG', 'MID', 'ADC', 'SUP']
  const sortedPlayers = [...players].sort((a, b) => {
    const ai = POSITION_ORDER.indexOf((a.position ?? '').toUpperCase())
    const bi = POSITION_ORDER.indexOf((b.position ?? '').toUpperCase())
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
  })

  const isTeam   = selectedKey === TEAM_ID
  const playerId = isTeam ? null : selectedKey
  const player   = players.find(p => p.id === playerId)

  return (
    <div className="flex gap-0 w-full -ml-6 -mr-6 min-h-0 h-full">

      {/* ── Sidebar ── */}
      <div className="w-60 shrink-0 border-r border-dark-border flex flex-col bg-dark-bg/20">
        <div className="px-4 py-4 border-b border-dark-border">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Coaching</p>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">

          {/* Équipe */}
          <PlayerCard
            label="Équipe"
            sublabel="Notes globales"
            imageUrl={team?.logo_url}
            isActive={selectedKey === TEAM_ID}
            onClick={() => setSelectedKey(TEAM_ID)}
          />

          {players.length > 0 && (
            <>
              <div className="px-3 pt-4 pb-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600">
                  Joueurs · {players.length}
                </p>
              </div>
              {sortedPlayers.map(p => {
                const champId = topChampByPlayer[p.id]
                return (
                  <PlayerCard
                    key={p.id}
                    label={p.player_name || p.pseudo}
                    position={p.position}
                    imageUrl={champId ? getChampionImage(champId) : null}
                    isActive={selectedKey === p.id}
                    onClick={() => setSelectedKey(p.id)}
                  />
                )
              })}
            </>
          )}
        </div>
      </div>

      {/* ── Contenu ── */}
      <div className="flex-1 min-w-0 flex overflow-hidden">
        <div className="flex-1 overflow-y-auto px-8 py-8 space-y-4 min-w-0">

          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-1">
              <h2 className="font-display text-2xl font-bold text-white">
                {isTeam ? 'Équipe' : (player?.player_name || player?.pseudo || 'Joueur')}
              </h2>
              {player?.position && (
                <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded-full border ${
                  POSITION_COLORS[player.position?.toUpperCase()] ?? 'text-gray-400'
                } bg-dark-card border-dark-border`}>
                  {player.position}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500">
              {isTeam ? 'Notes, objectifs et VODs pour toute l\'équipe' : 'Fiche coaching individuelle'}
            </p>
          </div>

          {/* Sections */}
          {team?.id && (
            <>
              <NotesSection      teamId={team.id} playerId={playerId} onAction={bumpFeed} />
              <ObjectivesSection teamId={team.id} playerId={playerId} onAction={bumpFeed} />
              <VodsSection       teamId={team.id} playerId={playerId} onAction={bumpFeed} />
              {!isTeam && playerId && (
                <TrainChampSection playerId={playerId} />
              )}
            </>
          )}
        </div>

        {/* ── Activity feed ── */}
        {team?.id && (
          <ActivityFeed teamId={team.id} players={sortedPlayers} playerId={playerId} refreshKey={feedKey} />
        )}
      </div>
    </div>
  )
}
