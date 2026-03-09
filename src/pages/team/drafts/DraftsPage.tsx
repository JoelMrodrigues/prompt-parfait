/**
 * Page Drafts — Draft board avec sauvegarde Supabase
 */
import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Plus, Trash2, Search, X, ChevronRight, AlertTriangle, Check, Swords } from 'lucide-react'
import { useTeam } from '../hooks/useTeam'
import { useTeamMatchesFull } from '../hooks/useTeamMatches'
import { loadChampions } from '../../../lib/championLoader'
import { getChampionImage, getChampionDisplayName } from '../../../lib/championImages'
import { FILTER_TO_CHAMPION_ROLE } from '../champion-pool/utils/roleToChampionRole'
import {
  fetchDraftsByTeam,
  createDraft,
  updateDraft,
  deleteDraft,
  EMPTY_SLOTS,
  type Draft,
  type DraftSlots,
} from '../../../services/supabase/draftQueries'

// ─── Types de slot ─────────────────────────────────────────────────────────────

type SlotKind = 'ourPick' | 'ourBan' | 'enemyPick' | 'enemyBan'

interface ActiveSlot {
  kind: SlotKind
  index: number
}

// ─── Utilitaires ─────────────────────────────────────────────────────────────

function slotKey(kind: SlotKind, index: number) {
  return `${kind}-${index}`
}

const ROLE_FILTERS = ['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT'] as const

function computeChampStats(matches: any[]) {
  const m = new Map<string, { games: number; wins: number; k: number; d: number; a: number }>()
  for (const match of matches) {
    const our = (match.team_match_participants || []).filter(
      (p: any) => p.team_side === 'our' || !p.team_side
    )
    for (const p of our) {
      const name = p.champion_name
      if (!name) continue
      if (!m.has(name)) m.set(name, { games: 0, wins: 0, k: 0, d: 0, a: 0 })
      const s = m.get(name)!
      s.games++
      if (match.our_win) s.wins++
      s.k += p.kills ?? 0
      s.d += p.deaths ?? 0
      s.a += p.assists ?? 0
    }
  }
  return m
}

// ─── ChampionPickerModal ───────────────────────────────────────────────────────

function ChampionPickerModal({
  champions,
  usedNames,
  onPick,
  onClose,
  slotKind,
}: {
  champions: any[]
  usedNames: Set<string>
  onPick: (name: string) => void
  onClose: () => void
  slotKind: SlotKind
}) {
  const [query, setQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const filtered = useMemo(() => {
    let list = champions
    if (roleFilter) {
      const cr = FILTER_TO_CHAMPION_ROLE[roleFilter]
      list = list.filter((c) => c.roles?.includes(cr))
    }
    if (query.trim()) {
      const q = query.trim().toLowerCase()
      list = list.filter((c) => c.name?.toLowerCase().includes(q) || c.id?.toLowerCase().includes(q))
    }
    return list
  }, [champions, roleFilter, query])

  const isBan = slotKind === 'ourBan' || slotKind === 'enemyBan'
  const title = isBan ? 'Choisir un ban' : 'Choisir un pick'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
      onClick={onClose}
    >
      <div
        className="bg-dark-card border border-dark-border rounded-2xl shadow-xl w-full max-w-2xl p-5 flex flex-col gap-4 max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-display font-semibold text-white text-lg">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-dark-bg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search + role filter */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Rechercher..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-8 pr-3 py-2 w-full bg-dark-bg border border-dark-border rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-accent-blue/50"
            />
          </div>
          <div className="flex gap-1 flex-wrap">
            {ROLE_FILTERS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRoleFilter((prev) => (prev === r ? null : r))}
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

        {/* Champion grid */}
        <div className="overflow-y-auto flex-1 grid grid-cols-6 sm:grid-cols-8 gap-1.5 pr-1">
          {filtered.map((c) => {
            const used = usedNames.has(c.name)
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => !used && onPick(c.name)}
                disabled={used}
                title={getChampionDisplayName(c.name) || c.name}
                className={`relative flex flex-col items-center gap-1 p-1 rounded-lg transition-all ${
                  used
                    ? 'opacity-30 cursor-not-allowed'
                    : 'hover:bg-dark-bg cursor-pointer hover:scale-105'
                }`}
              >
                <img
                  src={getChampionImage(c.name)}
                  alt={c.name}
                  className="w-10 h-10 rounded object-cover border border-dark-border"
                />
                <span className="text-[10px] text-gray-400 truncate w-full text-center">
                  {getChampionDisplayName(c.name) || c.name}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── SlotButton ───────────────────────────────────────────────────────────────

function SlotButton({
  champion,
  onClick,
  onClear,
  isBan,
  isActive,
}: {
  champion: string | null
  onClick: () => void
  onClear: () => void
  isBan: boolean
  isActive: boolean
}) {
  if (champion) {
    return (
      <div
        className={`relative group rounded-lg border transition-all cursor-pointer ${
          isBan
            ? 'border-rose-500/40 bg-rose-500/10'
            : 'border-emerald-500/30 bg-dark-bg'
        } ${isActive ? 'ring-2 ring-accent-blue' : ''}`}
        onClick={onClick}
      >
        <img
          src={getChampionImage(champion)}
          alt={champion}
          title={getChampionDisplayName(champion) || champion}
          className={`w-full aspect-square object-cover rounded-lg ${isBan ? 'opacity-60 grayscale' : ''}`}
        />
        {isBan && (
          <div className="absolute inset-0 flex items-center justify-center">
            <X size={16} className="text-rose-400" />
          </div>
        )}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onClear() }}
          className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-dark-bg border border-dark-border text-gray-400 hover:text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <X size={10} />
        </button>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full aspect-square rounded-lg border border-dashed transition-all flex items-center justify-center ${
        isActive
          ? 'border-accent-blue bg-accent-blue/10 ring-2 ring-accent-blue'
          : isBan
          ? 'border-rose-500/20 bg-rose-500/5 hover:border-rose-500/40 hover:bg-rose-500/10'
          : 'border-dark-border hover:border-accent-blue/40 hover:bg-dark-bg/50'
      }`}
    >
      <Plus size={14} className="text-gray-600" />
    </button>
  )
}

// ─── DraftBoard ───────────────────────────────────────────────────────────────

function DraftBoard({
  slots,
  activeSlot,
  onSlotClick,
  onClearSlot,
}: {
  slots: DraftSlots
  activeSlot: ActiveSlot | null
  onSlotClick: (kind: SlotKind, index: number) => void
  onClearSlot: (kind: SlotKind, index: number) => void
}) {
  const renderSlots = (kind: SlotKind, list: (string | null)[], isBan: boolean) =>
    list.map((champ, i) => (
      <SlotButton
        key={slotKey(kind, i)}
        champion={champ}
        onClick={() => onSlotClick(kind, i)}
        onClear={() => onClearSlot(kind, i)}
        isBan={isBan}
        isActive={activeSlot?.kind === kind && activeSlot?.index === i}
      />
    ))

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Notre équipe */}
      <div className="bg-dark-card border border-emerald-500/20 rounded-xl p-4">
        <h3 className="font-display font-semibold text-emerald-400 text-sm mb-3">Notre équipe</h3>
        <div className="mb-3">
          <p className="text-xs text-gray-500 mb-2">Picks</p>
          <div className="grid grid-cols-5 gap-1.5">
            {renderSlots('ourPick', slots.ourPicks, false)}
          </div>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-2">Bans</p>
          <div className="grid grid-cols-5 gap-1.5">
            {renderSlots('ourBan', slots.ourBans, true)}
          </div>
        </div>
      </div>

      {/* Équipe adverse */}
      <div className="bg-dark-card border border-rose-500/20 rounded-xl p-4">
        <h3 className="font-display font-semibold text-rose-400 text-sm mb-3">Équipe adverse</h3>
        <div className="mb-3">
          <p className="text-xs text-gray-500 mb-2">Picks</p>
          <div className="grid grid-cols-5 gap-1.5">
            {renderSlots('enemyPick', slots.enemyPicks, false)}
          </div>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-2">Bans</p>
          <div className="grid grid-cols-5 gap-1.5">
            {renderSlots('enemyBan', slots.enemyBans, true)}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── ChampionAnalysis ─────────────────────────────────────────────────────────

function ChampionAnalysis({ picks, champStats }: { picks: (string | null)[]; champStats: Map<string, any> }) {
  const relevant = picks.filter(Boolean) as string[]
  if (!relevant.length) return null

  return (
    <div className="mt-4 bg-dark-card border border-dark-border rounded-xl p-4">
      <h4 className="font-display text-sm font-semibold text-white mb-3">
        Analyse des picks (depuis vos matchs importés)
      </h4>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {relevant.map((name) => {
          const s = champStats.get(name)
          if (!s) {
            return (
              <div key={name} className="flex items-center gap-2 text-xs text-gray-500">
                <img
                  src={getChampionImage(name)}
                  alt={name}
                  className="w-8 h-8 rounded border border-dark-border object-cover"
                />
                <span className="text-gray-600">Aucune donnée</span>
              </div>
            )
          }
          const wr = Math.round((s.wins / s.games) * 100)
          const kda = s.d > 0 ? (s.k + s.a) / s.d : s.k + s.a
          const low = wr < 40
          return (
            <div
              key={name}
              className={`rounded-lg p-2.5 border flex flex-col gap-1 ${
                low
                  ? 'border-rose-500/40 bg-rose-500/5'
                  : 'border-dark-border bg-dark-bg/50'
              }`}
            >
              <div className="flex items-center gap-2">
                <img
                  src={getChampionImage(name)}
                  alt={name}
                  className="w-7 h-7 rounded border border-dark-border object-cover"
                />
                <span className="text-xs text-white font-medium truncate">
                  {getChampionDisplayName(name) || name}
                </span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span
                  className={`text-xs font-semibold ${wr >= 50 ? 'text-emerald-400' : 'text-rose-400'}`}
                >
                  {wr}% WR
                </span>
                <span className="text-xs text-gray-500">{s.games}G</span>
                <span className="text-xs text-gray-400">{kda.toFixed(1)} KDA</span>
              </div>
              {low && (
                <div className="flex items-center gap-1 text-[10px] text-rose-400">
                  <AlertTriangle size={10} />
                  <span>Winrate faible</span>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────

export const DraftsPage = () => {
  const { team } = useTeam()
  const { matches } = useTeamMatchesFull(team?.id)

  const [drafts, setDrafts] = useState<Draft[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [slots, setSlots] = useState<DraftSlots>(EMPTY_SLOTS())
  const [title, setTitle] = useState('Nouvelle draft')
  const [editingTitle, setEditingTitle] = useState(false)
  const [activeSlot, setActiveSlot] = useState<ActiveSlot | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [champions, setChampions] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [savedOk, setSavedOk] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const titleRef = useRef<HTMLInputElement>(null)

  // Load champions
  useEffect(() => {
    loadChampions().then(setChampions)
  }, [])

  // Load drafts
  useEffect(() => {
    if (!team?.id) return
    fetchDraftsByTeam(team.id).then(({ data }) => {
      if (data) setDrafts(data)
    })
  }, [team?.id])

  // Champion stats from matches
  const champStats = useMemo(() => computeChampStats(matches), [matches])

  // All picked champion names (for graying out in picker)
  const usedNames = useMemo(() => {
    const all = [
      ...slots.ourPicks,
      ...slots.ourBans,
      ...slots.enemyPicks,
      ...slots.enemyBans,
    ].filter(Boolean) as string[]
    return new Set(all)
  }, [slots])

  // Select a draft
  const selectDraft = useCallback((draft: Draft) => {
    setSelectedId(draft.id)
    setTitle(draft.title)
    setSlots(draft.champion_picks_json ?? EMPTY_SLOTS())
    setActiveSlot(null)
    setPickerOpen(false)
  }, [])

  // Auto-save with debounce
  const triggerSave = useCallback(
    (id: string, newSlots: DraftSlots, newTitle: string) => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(async () => {
        setSaving(true)
        await updateDraft(id, { champion_picks_json: newSlots, title: newTitle })
        setDrafts((prev) =>
          prev.map((d) =>
            d.id === id ? { ...d, champion_picks_json: newSlots, title: newTitle } : d
          )
        )
        setSaving(false)
        setSavedOk(true)
        setTimeout(() => setSavedOk(false), 2000)
      }, 800)
    },
    []
  )

  // New draft
  const handleNewDraft = async () => {
    if (!team?.id) return
    const { data } = await createDraft(team.id)
    if (data) {
      setDrafts((prev) => [data, ...prev])
      selectDraft(data)
    }
  }

  // Delete draft
  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    await deleteDraft(id)
    setDrafts((prev) => prev.filter((d) => d.id !== id))
    if (selectedId === id) {
      setSelectedId(null)
      setSlots(EMPTY_SLOTS())
    }
  }

  // Slot click → open picker
  const handleSlotClick = (kind: SlotKind, index: number) => {
    if (activeSlot?.kind === kind && activeSlot?.index === index) {
      setActiveSlot(null)
      setPickerOpen(false)
    } else {
      setActiveSlot({ kind, index })
      setPickerOpen(true)
    }
  }

  // Clear slot
  const handleClearSlot = (kind: SlotKind, index: number) => {
    if (!selectedId) return
    const kindMap: Record<SlotKind, keyof DraftSlots> = {
      ourPick: 'ourPicks',
      ourBan: 'ourBans',
      enemyPick: 'enemyPicks',
      enemyBan: 'enemyBans',
    }
    const newSlots = {
      ...slots,
      [kindMap[kind]]: slots[kindMap[kind]].map((v, i) => (i === index ? null : v)),
    }
    setSlots(newSlots)
    triggerSave(selectedId, newSlots, title)
  }

  // Pick a champion
  const handlePick = (name: string) => {
    if (!selectedId || !activeSlot) return
    const kindMap: Record<SlotKind, keyof DraftSlots> = {
      ourPick: 'ourPicks',
      ourBan: 'ourBans',
      enemyPick: 'enemyPicks',
      enemyBan: 'enemyBans',
    }
    const key = kindMap[activeSlot.kind]
    const newSlots = {
      ...slots,
      [key]: slots[key].map((v, i) => (i === activeSlot.index ? name : v)),
    }
    setSlots(newSlots)
    setPickerOpen(false)
    setActiveSlot(null)
    triggerSave(selectedId, newSlots, title)
  }

  // Title save
  const handleTitleBlur = () => {
    setEditingTitle(false)
    if (selectedId) triggerSave(selectedId, slots, title)
  }

  const selectedDraft = drafts.find((d) => d.id === selectedId)

  return (
    <div className="flex gap-0 w-full -ml-6 -mr-6 min-h-0">
      {/* Sidebar */}
      <div className="w-64 shrink-0 border-r border-dark-border bg-dark-bg/30 flex flex-col">
        <div className="p-4 border-b border-dark-border">
          <button
            type="button"
            onClick={handleNewDraft}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-accent-blue hover:bg-accent-blue/90 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus size={16} />
            Nouvelle draft
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {drafts.length === 0 ? (
            <p className="text-xs text-gray-600 text-center mt-6 px-2">
              Aucune draft. Créez-en une pour commencer.
            </p>
          ) : (
            drafts.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => selectDraft(d)}
                className={`w-full text-left flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm transition-colors group mb-1 ${
                  selectedId === d.id
                    ? 'bg-accent-blue/15 text-white border border-accent-blue/30'
                    : 'text-gray-400 hover:text-white hover:bg-dark-card'
                }`}
              >
                <Swords size={14} className="shrink-0 text-gray-500" />
                <span className="flex-1 truncate">{d.title}</span>
                <button
                  type="button"
                  onClick={(e) => handleDelete(d.id, e)}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:text-rose-400 transition-all"
                >
                  <Trash2 size={12} />
                </button>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 min-w-0 p-6 overflow-y-auto">
        {!selectedId ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="w-16 h-16 rounded-2xl bg-accent-blue/10 border border-accent-blue/20 flex items-center justify-center mb-4">
              <Swords size={28} className="text-accent-blue" />
            </div>
            <h3 className="font-display text-lg font-semibold text-white mb-2">Préparez votre draft</h3>
            <p className="text-gray-500 text-sm max-w-xs">
              Créez une nouvelle draft pour commencer à planifier vos picks et bans.
            </p>
            <button
              type="button"
              onClick={handleNewDraft}
              className="mt-4 flex items-center gap-2 px-4 py-2 bg-accent-blue hover:bg-accent-blue/90 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Plus size={16} />
              Nouvelle draft
            </button>
          </div>
        ) : (
          <div>
            {/* Header */}
            <div className="flex items-center gap-3 mb-5">
              {editingTitle ? (
                <input
                  ref={titleRef}
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={handleTitleBlur}
                  onKeyDown={(e) => e.key === 'Enter' && titleRef.current?.blur()}
                  className="font-display text-2xl font-bold bg-transparent border-b border-accent-blue text-white focus:outline-none flex-1"
                  autoFocus
                />
              ) : (
                <h2
                  className="font-display text-2xl font-bold text-white cursor-pointer hover:text-gray-300 transition-colors flex-1"
                  onClick={() => setEditingTitle(true)}
                  title="Cliquer pour renommer"
                >
                  {title}
                </h2>
              )}
              <div className="flex items-center gap-2">
                {saving && <span className="text-xs text-gray-500">Sauvegarde...</span>}
                {savedOk && (
                  <span className="text-xs text-emerald-400 flex items-center gap-1">
                    <Check size={12} />
                    Sauvegardé
                  </span>
                )}
              </div>
            </div>

            {/* Draft board */}
            <DraftBoard
              slots={slots}
              activeSlot={activeSlot}
              onSlotClick={handleSlotClick}
              onClearSlot={handleClearSlot}
            />

            {/* Champion analysis */}
            {matches.length > 0 && (
              <ChampionAnalysis picks={slots.ourPicks} champStats={champStats} />
            )}

            {/* Instructions */}
            {!pickerOpen && (
              <p className="text-xs text-gray-600 mt-4 text-center">
                Cliquez sur un slot pour choisir un champion · Cliquez à nouveau pour le retirer
              </p>
            )}
          </div>
        )}
      </div>

      {/* Champion picker modal */}
      {pickerOpen && activeSlot && (
        <ChampionPickerModal
          champions={champions}
          usedNames={usedNames}
          onPick={handlePick}
          onClose={() => { setPickerOpen(false); setActiveSlot(null) }}
          slotKind={activeSlot.kind}
        />
      )}
    </div>
  )
}
