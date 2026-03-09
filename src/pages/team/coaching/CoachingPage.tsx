/**
 * Page Coaching — Notes, Objectifs, VODs par joueur et équipe
 */
import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Plus,
  Trash2,
  FileText,
  Target,
  Video,
  Users,
  User,
  CheckCircle,
  XCircle,
  Clock,
  ExternalLink,
  Send,
  Search,
  X,
  Shield,
} from 'lucide-react'
import { useTeam } from '../hooks/useTeam'
import {
  fetchNotes, addNote, deleteNote,
  fetchObjectives, addObjective, updateObjectiveStatus, deleteObjective,
  fetchVods, addVod, deleteVod,
  type ObjectiveStatus,
} from '../../../services/supabase/coachingQueries'
import {
  fetchTrainingPool,
  addToTrainingPool,
  removeFromTrainingPool,
} from '../../../services/supabase/championQueries'
import { loadChampions } from '../../../lib/championLoader'
import { getChampionImage, getChampionDisplayName } from '../../../lib/championImages'
import { FILTER_TO_CHAMPION_ROLE } from '../champion-pool/utils/roleToChampionRole'

const ROLE_FILTERS = ['ALL', 'TOP', 'JNG', 'MID', 'ADC', 'SUP'] as const
type RoleFilter = (typeof ROLE_FILTERS)[number]

// ─── Constantes ───────────────────────────────────────────────────────────────

const TEAM_ID = '__team__'

const SUBS = [
  { id: 'notes', label: 'Notes', icon: FileText },
  { id: 'objectives', label: 'Objectifs', icon: Target },
  { id: 'vods', label: 'Liens VOD', icon: Video },
] as const

const PLAYER_SUBS = [
  ...SUBS,
  { id: 'training', label: 'Train Champ', icon: Shield },
] as const

type SubTab = 'notes' | 'objectives' | 'vods' | 'training'

const STATUS_LABELS: Record<ObjectiveStatus, { label: string; color: string; Icon: React.ElementType }> = {
  ongoing: { label: 'En cours', color: 'text-amber-400', Icon: Clock },
  achieved: { label: 'Atteint', color: 'text-emerald-400', Icon: CheckCircle },
  abandoned: { label: 'Abandonné', color: 'text-gray-500', Icon: XCircle },
}

// ─── Formatage date ───────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ─── Sous-onglet Notes ────────────────────────────────────────────────────────

function NotesTab({
  teamId,
  playerId,
}: {
  teamId: string
  playerId: string | null
}) {
  const [notes, setNotes] = useState<any[]>([])
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const { data } = await fetchNotes(teamId, playerId)
    if (data) setNotes(data)
  }, [teamId, playerId])

  useEffect(() => {
    setNotes([])
    setDraft('')
    load()
  }, [load])

  const handleAdd = async () => {
    if (!draft.trim()) return
    setSaving(true)
    const { data } = await addNote(teamId, playerId, draft.trim())
    if (data) setNotes((prev) => [data, ...prev])
    setDraft('')
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    await deleteNote(id)
    setNotes((prev) => prev.filter((n) => n.id !== id))
  }

  return (
    <div className="space-y-4">
      {/* New note */}
      <div className="bg-dark-card border border-dark-border rounded-xl p-4">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ajouter une note de coaching..."
          rows={3}
          className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-accent-blue/50 resize-none"
        />
        <div className="flex justify-end mt-2">
          <button
            type="button"
            onClick={handleAdd}
            disabled={saving || !draft.trim()}
            className="flex items-center gap-2 px-3 py-1.5 bg-accent-blue hover:bg-accent-blue/90 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
          >
            <Send size={14} />
            Ajouter
          </button>
        </div>
      </div>

      {/* Notes list */}
      {notes.length === 0 ? (
        <div className="text-center py-8 text-gray-600 text-sm">Aucune note pour l'instant.</div>
      ) : (
        notes.map((note) => (
          <div
            key={note.id}
            className="bg-dark-card border border-dark-border rounded-xl p-4 group"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm text-gray-200 whitespace-pre-wrap flex-1">{note.content}</p>
              <button
                type="button"
                onClick={() => handleDelete(note.id)}
                className="text-gray-600 hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
              >
                <Trash2 size={14} />
              </button>
            </div>
            <p className="text-xs text-gray-600 mt-2">{fmtDate(note.created_at)}</p>
          </div>
        ))
      )}
    </div>
  )
}

// ─── Sous-onglet Objectifs ────────────────────────────────────────────────────

function ObjectivesTab({
  teamId,
  playerId,
}: {
  teamId: string
  playerId: string | null
}) {
  const [objectives, setObjectives] = useState<any[]>([])
  const [draft, setDraft] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const { data } = await fetchObjectives(teamId, playerId)
    if (data) setObjectives(data)
  }, [teamId, playerId])

  useEffect(() => {
    setObjectives([])
    setDraft('')
    setDueDate('')
    load()
  }, [load])

  const handleAdd = async () => {
    if (!draft.trim()) return
    setSaving(true)
    const { data } = await addObjective(teamId, playerId, draft.trim(), dueDate || null)
    if (data) setObjectives((prev) => [data, ...prev])
    setDraft('')
    setDueDate('')
    setSaving(false)
  }

  const handleStatus = async (id: string, status: ObjectiveStatus) => {
    const { data } = await updateObjectiveStatus(id, status)
    if (data) setObjectives((prev) => prev.map((o) => (o.id === id ? data : o)))
  }

  const handleDelete = async (id: string) => {
    await deleteObjective(id)
    setObjectives((prev) => prev.filter((o) => o.id !== id))
  }

  return (
    <div className="space-y-4">
      {/* New objective */}
      <div className="bg-dark-card border border-dark-border rounded-xl p-4 flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Nouvel objectif..."
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          className="flex-1 bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-accent-blue/50"
        />
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-sm text-gray-400 focus:outline-none focus:border-accent-blue/50"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={saving || !draft.trim()}
          className="flex items-center gap-2 px-3 py-2 bg-accent-blue hover:bg-accent-blue/90 disabled:opacity-50 text-white text-sm rounded-lg transition-colors whitespace-nowrap"
        >
          <Plus size={14} />
          Ajouter
        </button>
      </div>

      {/* Objectives list */}
      {objectives.length === 0 ? (
        <div className="text-center py-8 text-gray-600 text-sm">Aucun objectif pour l'instant.</div>
      ) : (
        objectives.map((obj) => {
          const s = STATUS_LABELS[obj.status as ObjectiveStatus] ?? STATUS_LABELS.ongoing
          const Icon = s.Icon
          return (
            <div
              key={obj.id}
              className={`bg-dark-card border rounded-xl p-4 group flex items-center gap-3 ${
                obj.status === 'achieved'
                  ? 'border-emerald-500/20'
                  : obj.status === 'abandoned'
                  ? 'border-dark-border opacity-60'
                  : 'border-dark-border'
              }`}
            >
              <Icon size={18} className={`${s.color} shrink-0`} />
              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm font-medium ${
                    obj.status === 'abandoned' ? 'line-through text-gray-500' : 'text-white'
                  }`}
                >
                  {obj.title}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-xs ${s.color}`}>{s.label}</span>
                  {obj.due_date && (
                    <span className="text-xs text-gray-600">· Échéance : {obj.due_date}</span>
                  )}
                </div>
              </div>
              {/* Status buttons */}
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {((['ongoing', 'achieved', 'abandoned'] as ObjectiveStatus[]).filter(
                  (st) => st !== obj.status
                )).map((st) => {
                  const lbl = STATUS_LABELS[st]
                  const LblIcon = lbl.Icon
                  return (
                    <button
                      key={st}
                      type="button"
                      onClick={() => handleStatus(obj.id, st)}
                      title={lbl.label}
                      className={`p-1.5 rounded-lg hover:bg-dark-bg transition-colors ${lbl.color}`}
                    >
                      <LblIcon size={14} />
                    </button>
                  )
                })}
                <button
                  type="button"
                  onClick={() => handleDelete(obj.id)}
                  className="p-1.5 rounded-lg text-gray-600 hover:text-rose-400 hover:bg-dark-bg transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}

// ─── Sous-onglet VODs ─────────────────────────────────────────────────────────

function VodsTab({
  teamId,
  playerId,
}: {
  teamId: string
  playerId: string | null
}) {
  const [vods, setVods] = useState<any[]>([])
  const [url, setUrl] = useState('')
  const [desc, setDesc] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const { data } = await fetchVods(teamId, playerId)
    if (data) setVods(data)
  }, [teamId, playerId])

  useEffect(() => {
    setVods([])
    setUrl('')
    setDesc('')
    load()
  }, [load])

  const handleAdd = async () => {
    if (!url.trim()) return
    setSaving(true)
    const { data } = await addVod(teamId, playerId, url.trim(), desc.trim())
    if (data) setVods((prev) => [data, ...prev])
    setUrl('')
    setDesc('')
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    await deleteVod(id)
    setVods((prev) => prev.filter((v) => v.id !== id))
  }

  return (
    <div className="space-y-4">
      {/* New VOD */}
      <div className="bg-dark-card border border-dark-border rounded-xl p-4 space-y-2">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://youtube.com/watch?v=..."
          className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-accent-blue/50"
        />
        <div className="flex gap-2">
          <input
            type="text"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="Description (optionnel)..."
            className="flex-1 bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-accent-blue/50"
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={saving || !url.trim()}
            className="flex items-center gap-2 px-3 py-2 bg-accent-blue hover:bg-accent-blue/90 disabled:opacity-50 text-white text-sm rounded-lg transition-colors whitespace-nowrap"
          >
            <Plus size={14} />
            Ajouter
          </button>
        </div>
      </div>

      {/* VOD list */}
      {vods.length === 0 ? (
        <div className="text-center py-8 text-gray-600 text-sm">Aucun lien VOD pour l'instant.</div>
      ) : (
        vods.map((vod) => (
          <div
            key={vod.id}
            className="bg-dark-card border border-dark-border rounded-xl p-4 group flex items-center gap-3"
          >
            <div className="w-9 h-9 rounded-lg bg-dark-bg border border-dark-border flex items-center justify-center shrink-0">
              <Video size={16} className="text-accent-blue" />
            </div>
            <div className="flex-1 min-w-0">
              <a
                href={vod.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-accent-blue hover:underline truncate block"
              >
                {vod.url}
                <ExternalLink size={11} className="inline ml-1 opacity-70" />
              </a>
              {vod.description && (
                <p className="text-xs text-gray-500 mt-0.5 truncate">{vod.description}</p>
              )}
              <p className="text-xs text-gray-600 mt-0.5">{fmtDate(vod.created_at)}</p>
            </div>
            <button
              type="button"
              onClick={() => handleDelete(vod.id)}
              className="text-gray-600 hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))
      )}
    </div>
  )
}

// ─── Onglet Train Champ ───────────────────────────────────────────────────────

function TrainChampTab({ playerId }: { playerId: string }) {
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

  const trainingIds = useMemo(() => new Set(trainingChamps.map((c) => c.champion_id)), [trainingChamps])

  const filtered = useMemo(() => {
    let list = allChampions
    if (roleFilter !== 'ALL') {
      const cr = FILTER_TO_CHAMPION_ROLE[roleFilter]
      list = list.filter((c) => c.roles?.includes(cr))
    }
    const q = query.trim().toLowerCase()
    if (q) list = list.filter((c) => c.id?.toLowerCase().includes(q) || c.name?.toLowerCase().includes(q))
    return list
  }, [allChampions, query, roleFilter])

  const handleAdd = async (champId: string) => {
    await addToTrainingPool(playerId, champId)
    load()
  }

  const handleRemove = async (champId: string) => {
    await removeFromTrainingPool(playerId, champId)
    setTrainingChamps((prev) => prev.filter((c) => c.champion_id !== champId))
  }

  return (
    <div className="space-y-5">
      {/* Champions en training */}
      <div className="bg-dark-card border border-dark-border rounded-xl p-4">
        <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">
          Champions assignés ({trainingChamps.length})
        </p>
        {trainingChamps.length === 0 ? (
          <p className="text-sm text-gray-600">Aucun champion assigné. Sélectionnez-en ci-dessous.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {trainingChamps.map((c) => (
              <div
                key={c.champion_id}
                className="group flex items-center gap-2 pl-1.5 pr-2.5 py-1.5 bg-dark-bg border border-dark-border hover:border-rose-500/40 rounded-xl transition-colors"
              >
                <img
                  src={getChampionImage(c.champion_id)}
                  alt={c.champion_id}
                  className="w-9 h-9 rounded-lg object-cover border border-dark-border"
                />
                <div className="flex flex-col">
                  <span className="text-sm text-white font-medium leading-tight">
                    {getChampionDisplayName(c.champion_id) || c.champion_id}
                  </span>
                  <span className="text-[10px] text-accent-blue">Training</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemove(c.champion_id)}
                  className="ml-1 text-gray-600 hover:text-rose-400 transition-colors"
                  title="Retirer"
                >
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Picker */}
      <div className="bg-dark-card border border-dark-border rounded-xl p-4">
        <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">Ajouter un champion</p>
        <div className="flex flex-col sm:flex-row gap-2 mb-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Rechercher un champion..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9 pr-3 py-2 w-full bg-dark-bg border border-dark-border rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-accent-blue/50"
            />
          </div>
          <div className="flex gap-1 flex-wrap">
            {ROLE_FILTERS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRoleFilter(r)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  roleFilter === r
                    ? 'bg-accent-blue/20 text-accent-blue border border-accent-blue/40'
                    : 'bg-dark-bg border border-dark-border text-gray-400 hover:text-white'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-8 sm:grid-cols-10 lg:grid-cols-12 gap-1.5 max-h-72 overflow-y-auto pr-1">
          {filtered.map((c) => {
            const used = trainingIds.has(c.id)
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => !used && handleAdd(c.id)}
                disabled={used}
                title={getChampionDisplayName(c.name) || c.name}
                className={`relative rounded-lg overflow-hidden border transition-colors ${
                  used
                    ? 'opacity-25 cursor-not-allowed border-transparent'
                    : 'border-dark-border hover:border-accent-blue/60 cursor-pointer hover:scale-105'
                }`}
              >
                <img
                  src={getChampionImage(c.id)}
                  alt={c.name}
                  className="w-full aspect-square object-cover"
                />
                {used && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <Shield size={12} className="text-accent-blue" />
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────

export const CoachingPage = () => {
  const { team, players = [] } = useTeam()
  const [selectedKey, setSelectedKey] = useState<string>(TEAM_ID)
  const [sub, setSub] = useState<SubTab>('notes')

  // Reset l'onglet training si on bascule sur équipe
  const handleSelectKey = useCallback((key: string) => {
    setSelectedKey(key)
    if (key === TEAM_ID && sub === 'training') setSub('notes')
  }, [sub])

  const isTeam = selectedKey === TEAM_ID
  const playerId = isTeam ? null : selectedKey
  const selectedPlayer = players.find((p) => p.id === playerId)

  return (
    <div className="flex gap-0 w-full -ml-6 -mr-6 min-h-0">
      {/* Sidebar */}
      <div className="w-56 shrink-0 border-r border-dark-border bg-dark-bg/30 flex flex-col">
        <div className="p-3 border-b border-dark-border">
          <p className="text-xs font-semibold tracking-widest text-gray-500 uppercase px-2">
            Coaching
          </p>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {/* Équipe */}
          <button
            type="button"
            onClick={() => handleSelectKey(TEAM_ID)}
            className={`w-full text-left flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm transition-colors mb-1 ${
              selectedKey === TEAM_ID
                ? 'bg-accent-blue/15 text-white border border-accent-blue/30'
                : 'text-gray-400 hover:text-white hover:bg-dark-card'
            }`}
          >
            <Users size={14} className="shrink-0" />
            <span>Équipe</span>
          </button>

          {players.length > 0 && (
            <>
              <p className="text-[10px] text-gray-600 uppercase tracking-widest px-3 mt-3 mb-1">
                Joueurs
              </p>
              {players.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelectKey(p.id)}
                  className={`w-full text-left flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm transition-colors mb-1 ${
                    selectedKey === p.id
                      ? 'bg-accent-blue/15 text-white border border-accent-blue/30'
                      : 'text-gray-400 hover:text-white hover:bg-dark-card'
                  }`}
                >
                  <User size={14} className="shrink-0" />
                  <span className="truncate">{p.player_name || p.pseudo}</span>
                </button>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 min-w-0 p-6 overflow-y-auto">
        {/* Header */}
        <div className="mb-6">
          <h2 className="font-display text-3xl font-bold mb-1">
            {isTeam ? 'Équipe' : (selectedPlayer?.player_name || selectedPlayer?.pseudo || 'Joueur')}
          </h2>
          <p className="text-gray-400 text-sm">
            {isTeam ? 'Notes et objectifs pour toute l\'équipe' : 'Notes et objectifs individuels'}
          </p>
        </div>

        {/* Sub tabs */}
        <div className="flex gap-0 mb-6 border-b border-dark-border">
          {(isTeam ? SUBS : PLAYER_SUBS).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setSub(id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                sub === id
                  ? 'border-accent-blue text-white'
                  : 'border-transparent text-gray-400 hover:text-white hover:border-dark-border'
              }`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        {!team?.id ? (
          <div className="text-gray-600 text-sm">Chargement...</div>
        ) : sub === 'notes' ? (
          <NotesTab teamId={team.id} playerId={playerId} />
        ) : sub === 'objectives' ? (
          <ObjectivesTab teamId={team.id} playerId={playerId} />
        ) : sub === 'training' && playerId ? (
          <TrainChampTab playerId={playerId} />
        ) : (
          <VodsTab teamId={team.id} playerId={playerId} />
        )}
      </div>
    </div>
  )
}
