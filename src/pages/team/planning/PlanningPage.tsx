/**
 * Page Planning — Calendrier des scrims + Disponibilités joueurs
 */
import { useState, useEffect, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  X,
  CheckCircle,
  XCircle,
  Minus,
  CalendarDays,
  Users,
  Swords,
  TrendingUp,
  Clock,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTeam } from '../hooks/useTeam'
import { useTeamMatches } from '../hooks/useTeamMatches'
import { MatchRow } from '../matchs/components/MatchRow'
import {
  fetchSessions,
  addSession,
  updateSessionResult,
  updateSessionNotes,
  deleteSession,
  fetchAvailability,
  upsertAvailability,
  type ScrimSession,
  type SessionResult,
} from '../../../services/supabase/planningQueries'

// ─── Constantes ───────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]
const DAY_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const SLOTS = ['matin', 'apres-midi', 'soiree'] as const
const SLOT_LABELS: Record<string, string> = { matin: 'Matin', 'apres-midi': 'Après-midi', soiree: 'Soirée' }

const RESULT_STYLES: Record<string, { label: string; color: string; bg: string; dot: string; ring: string }> = {
  win:  { label: 'Victoire', color: 'text-emerald-400', bg: 'bg-emerald-500/15 border-emerald-500/30', dot: 'bg-emerald-400', ring: 'ring-emerald-500/30' },
  loss: { label: 'Défaite',  color: 'text-rose-400',    bg: 'bg-rose-500/15 border-rose-500/30',       dot: 'bg-rose-400',    ring: 'ring-rose-500/30' },
  draw: { label: 'Nul',      color: 'text-amber-400',   bg: 'bg-amber-500/15 border-amber-500/30',     dot: 'bg-amber-400',   ring: 'ring-amber-500/30' },
}

const TABS = [
  { id: 'calendar',     label: 'Calendrier',     icon: CalendarDays },
  { id: 'availability', label: 'Disponibilités', icon: Users },
] as const

type Tab = (typeof TABS)[number]['id']

function toDateStr(y: number, m: number, d: number) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}
function fmtTime(t: string | null) {
  return t ? t.slice(0, 5) : ''
}

// ─── Add Session Modal ─────────────────────────────────────────────────────────

function AddSessionModal({
  initialDate,
  onConfirm,
  onClose,
}: {
  initialDate: string
  onConfirm: (date: string, opponent: string, time: string, notes: string) => void
  onClose: () => void
}) {
  const [date, setDate] = useState(initialDate)
  const [opponent, setOpponent] = useState('')
  const [time, setTime] = useState('')
  const [notes, setNotes] = useState('')

  const modal = (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{ duration: 0.15 }}
        className="bg-dark-card border border-dark-border rounded-2xl shadow-2xl w-full max-w-md flex flex-col"
        style={{ maxHeight: 'calc(100vh - 2rem)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-dark-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-accent-blue/20 flex items-center justify-center">
              <Swords size={15} className="text-accent-blue" />
            </div>
            <h3 className="font-display font-bold text-white text-lg">Nouvelle session</h3>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-dark-bg transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 min-h-0 px-6 py-5 space-y-4">
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block font-semibold uppercase tracking-wide">Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-accent-blue/60 transition-colors" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block font-semibold uppercase tracking-wide">Équipe adverse</label>
            <input type="text" value={opponent} onChange={(e) => setOpponent(e.target.value)} placeholder="Ex : Team Alpha"
              className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-accent-blue/60 transition-colors" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block font-semibold uppercase tracking-wide">
              Heure <span className="text-gray-700 normal-case font-normal">(optionnel)</span>
            </label>
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)}
              className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-accent-blue/60 transition-colors" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block font-semibold uppercase tracking-wide">
              Notes <span className="text-gray-700 normal-case font-normal">(optionnel)</span>
            </label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Stratégie, notes pré-match..."
              className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-accent-blue/60 resize-none transition-colors" />
          </div>
        </div>
        <div className="shrink-0 flex gap-3 px-6 py-4 border-t border-dark-border">
          <button type="button" onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl border border-dark-border text-gray-400 text-sm hover:text-white hover:border-gray-500 transition-colors">
            Annuler
          </button>
          <button type="button" onClick={() => onConfirm(date, opponent, time, notes)} disabled={!date}
            className="flex-1 px-4 py-2.5 rounded-xl bg-accent-blue text-white text-sm font-semibold hover:bg-accent-blue/90 transition-colors disabled:opacity-40">
            Créer la session
          </button>
        </div>
      </motion.div>
    </div>
  )
  return createPortal(modal, document.body)
}

// ─── Session Card ─────────────────────────────────────────────────────────────

function SessionCard({
  session,
  onDelete,
  onResultChange,
  onNotesChange,
}: {
  session: ScrimSession
  onDelete: (id: string) => void
  onResultChange: (id: string, result: SessionResult) => void
  onNotesChange: (id: string, notes: string) => void
}) {
  const [editNotes, setEditNotes] = useState(false)
  const [noteDraft, setNoteDraft] = useState(session.notes || '')
  const rs = session.result ? RESULT_STYLES[session.result] : null

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-dark-bg border rounded-2xl p-4 group transition-all ${
        rs ? `border-dark-border ring-1 ${rs.ring}` : 'border-dark-border'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-bold text-white text-base leading-tight">
              {session.opponent_team || 'Adversaire inconnu'}
            </span>
            {rs && (
              <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${rs.bg} ${rs.color}`}>
                {rs.label}
              </span>
            )}
          </div>
          {session.time && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
              <Clock size={11} />
              {fmtTime(session.time)}
            </div>
          )}
          {editNotes ? (
            <div className="mt-2">
              <textarea value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} rows={2} autoFocus
                className="w-full bg-dark-card border border-dark-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-accent-blue/50 resize-none" />
              <div className="flex gap-3 mt-1.5">
                <button type="button" onClick={() => { onNotesChange(session.id, noteDraft); setEditNotes(false) }}
                  className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold">Sauvegarder</button>
                <button type="button" onClick={() => { setNoteDraft(session.notes || ''); setEditNotes(false) }}
                  className="text-xs text-gray-500 hover:text-gray-300">Annuler</button>
              </div>
            </div>
          ) : session.notes ? (
            <p className="text-xs text-gray-500 hover:text-gray-300 cursor-pointer transition-colors line-clamp-2 mt-1"
              onClick={() => setEditNotes(true)}>{session.notes}</p>
          ) : (
            <button type="button" onClick={() => setEditNotes(true)}
              className="text-xs text-gray-700 hover:text-gray-400 transition-colors mt-1">
              + Ajouter des notes
            </button>
          )}
        </div>

        <div className="flex flex-col items-end gap-1 shrink-0">
          <div className="flex items-center gap-0.5">
            {(['win', 'loss', 'draw'] as SessionResult[]).map((r) => (
              <button key={r} type="button"
                onClick={() => onResultChange(session.id, session.result === r ? null : r)}
                title={r === 'win' ? 'Victoire' : r === 'loss' ? 'Défaite' : 'Nul'}
                className={`p-1.5 rounded-xl transition-all ${
                  session.result === r ? RESULT_STYLES[r].color : 'text-gray-700 hover:text-gray-400'
                }`}
              >
                {r === 'win' ? <CheckCircle size={16} /> : r === 'loss' ? <XCircle size={16} /> : <Minus size={16} />}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => onDelete(session.id)}
            className="p-1.5 rounded-xl text-gray-700 hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100">
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Calendar Tab ─────────────────────────────────────────────────────────────

function CalendarTab({ teamId, allMatches, avail, players }: {
  teamId: string
  allMatches: any[]
  avail: Map<string, boolean>
  players: any[]
}) {
  const today = new Date()
  const [year, setYear]         = useState(today.getFullYear())
  const [month, setMonth]       = useState(today.getMonth() + 1)
  const [sessions, setSessions] = useState<ScrimSession[]>([])
  const [selectedDay, setSelectedDay] = useState<number | null>(today.getDate())
  const [showAddModal, setShowAddModal] = useState(false)
  const [addDate, setAddDate]   = useState('')

  const load = useCallback(async () => {
    const { data } = await fetchSessions(teamId, year, month)
    if (data) setSessions(data)
  }, [teamId, year, month])

  // Matchs joués ce mois-ci, groupés par jour
  const matchesByDay = useMemo(() => {
    const m = new Map<number, any[]>()
    for (const match of allMatches) {
      if (!match.game_creation) continue
      const d = new Date(match.game_creation)
      if (d.getFullYear() !== year || d.getMonth() + 1 !== month) continue
      const day = d.getDate()
      if (!m.has(day)) m.set(day, [])
      m.get(day)!.push(match)
    }
    return m
  }, [allMatches, year, month])

  useEffect(() => {
    setSessions([])
    load()
  }, [load])

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month - 1, 1)
    let startDow = firstDay.getDay() - 1
    if (startDow < 0) startDow = 6
    const daysInMonth = new Date(year, month, 0).getDate()
    const cells: (number | null)[] = []
    for (let i = 0; i < startDow; i++) cells.push(null)
    for (let d = 1; d <= daysInMonth; d++) cells.push(d)
    return cells
  }, [year, month])

  const sessionsByDay = useMemo(() => {
    const m = new Map<number, ScrimSession[]>()
    for (const s of sessions) {
      const d = parseInt(s.date.slice(8, 10))
      if (!m.has(d)) m.set(d, [])
      m.get(d)!.push(s)
    }
    return m
  }, [sessions])

  const stats = useMemo(() => ({
    total:    sessions.length,
    wins:     sessions.filter((s) => s.result === 'win').length,
    losses:   sessions.filter((s) => s.result === 'loss').length,
    draws:    sessions.filter((s) => s.result === 'draw').length,
    upcoming: sessions.filter((s) => !s.result).length,
  }), [sessions])

  const selectedSessions = selectedDay ? (sessionsByDay.get(selectedDay) ?? []) : []

  const upcomingSessions = useMemo(() => {
    const todayStr = toDateStr(today.getFullYear(), today.getMonth() + 1, today.getDate())
    return sessions.filter((s) => s.date >= todayStr && !s.result).slice(0, 8)
  }, [sessions])

  const prevMonth = () => {
    setSelectedDay(null)
    if (month === 1) { setYear((y) => y - 1); setMonth(12) } else setMonth((m) => m - 1)
  }
  const nextMonth = () => {
    setSelectedDay(null)
    if (month === 12) { setYear((y) => y + 1); setMonth(1) } else setMonth((m) => m + 1)
  }

  const handleAdd = async (date: string, opponent: string, time: string, notes: string) => {
    const { data } = await addSession(teamId, date, opponent, time, notes)
    if (data) {
      setSessions((prev) =>
        [...prev, data].sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? ''))
      )
      setSelectedDay(parseInt(date.slice(8, 10)))
    }
    setShowAddModal(false)
  }
  const handleDelete = async (id: string) => {
    await deleteSession(id)
    setSessions((prev) => prev.filter((s) => s.id !== id))
  }
  const handleResult = async (id: string, result: SessionResult) => {
    const { data } = await updateSessionResult(id, result)
    if (data) setSessions((prev) => prev.map((s) => (s.id === id ? data : s)))
  }
  const handleNotes = async (id: string, notes: string) => {
    const { data } = await updateSessionNotes(id, notes)
    if (data) setSessions((prev) => prev.map((s) => (s.id === id ? data : s)))
  }

  const isToday = (d: number) =>
    d === today.getDate() && month === today.getMonth() + 1 && year === today.getFullYear()

  const openAdd = (day?: number) => {
    setAddDate(toDateStr(year, month, day ?? today.getDate()))
    setShowAddModal(true)
  }

  const winRate = stats.total > 0 && (stats.wins + stats.losses + stats.draws) > 0
    ? Math.round((stats.wins / (stats.wins + stats.losses + stats.draws)) * 100)
    : null

  return (
    <div className="flex gap-6 items-start h-full">
      {/* ── Colonne gauche : calendrier ── */}
      <div className="flex-1 min-w-0 flex flex-col gap-5">

        {/* Stats bar */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Sessions',    value: stats.total,    sub: 'ce mois',                                   color: 'text-white',       bg: '',                   icon: <Swords size={14} /> },
            { label: 'Victoires',   value: stats.wins,     sub: winRate != null ? `${winRate}% winrate` : '', color: 'text-emerald-400', bg: 'bg-emerald-500/8',   icon: <CheckCircle size={14} /> },
            { label: 'Défaites',    value: stats.losses,   sub: '',                                           color: 'text-rose-400',    bg: 'bg-rose-500/8',      icon: <XCircle size={14} /> },
            { label: 'À planifier', value: stats.upcoming, sub: 'sans résultat',                              color: 'text-accent-blue', bg: 'bg-accent-blue/8',   icon: <Clock size={14} /> },
          ].map((s) => (
            <div key={s.label} className={`${s.bg} bg-dark-card border border-dark-border rounded-xl px-4 py-3 flex items-center gap-3`}>
              <span className={`${s.color} opacity-60`}>{s.icon}</span>
              <div>
                <div className={`text-2xl font-bold font-display leading-none ${s.color}`}>{s.value}</div>
                <div className="text-[11px] text-gray-600 mt-0.5 leading-tight">
                  <span className="text-gray-500 font-medium">{s.label}</span>
                  {s.sub && <span className="ml-1">{s.sub}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Calendrier */}
        <div className="bg-dark-card border border-dark-border rounded-2xl overflow-hidden flex-1">
          {/* Header navigation */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-dark-border">
            <button type="button" onClick={prevMonth}
              className="p-2 rounded-xl text-gray-500 hover:text-white hover:bg-dark-bg border border-transparent hover:border-dark-border transition-all">
              <ChevronLeft size={16} />
            </button>
            <h3 className="font-display text-xl font-bold text-white">
              {MONTH_NAMES[month - 1]}{' '}
              <span className="text-gray-600 font-normal text-lg">{year}</span>
            </h3>
            <button type="button" onClick={nextMonth}
              className="p-2 rounded-xl text-gray-500 hover:text-white hover:bg-dark-bg border border-transparent hover:border-dark-border transition-all">
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Jours */}
          <div className="grid grid-cols-7 border-b border-dark-border">
            {DAY_LABELS.map((d) => (
              <div key={d} className="py-2 text-center text-[11px] font-bold text-gray-600 uppercase tracking-widest">
                {d}
              </div>
            ))}
          </div>

          {/* Cellules */}
          <div className="grid grid-cols-7">
            {calendarDays.map((day, idx) => {
              const daySessions = day ? (sessionsByDay.get(day) ?? []) : []
              const dayMatches  = day ? (matchesByDay.get(day) ?? []) : []
              const isSelected  = day === selectedDay
              const todayDay    = day ? isToday(day) : false
              const hasActivity = daySessions.length > 0 || dayMatches.length > 0

              // Jour dispo scrim = tous les joueurs dispo sur le même créneau ce jour de semaine
              const dow = day ? (new Date(year, month - 1, day).getDay() + 6) % 7 : -1 // 0=Lun
              const isScrimDay = day && players.length > 0 && SLOTS.some((slot) =>
                players.every((p) => avail.get(`${p.id}-${dow}-${slot}`))
              )

              return (
                <div
                  key={idx}
                  onClick={() => day && setSelectedDay(day === selectedDay ? null : day)}
                  onDoubleClick={() => day && openAdd(day)}
                  className={`
                    min-h-[88px] p-2 border-b border-r border-dark-border/40 transition-all select-none relative
                    ${day ? 'cursor-pointer' : 'bg-dark-bg/20 pointer-events-none'}
                    ${isSelected ? 'bg-accent-blue/10' : day ? 'hover:bg-dark-bg/50' : ''}
                    ${isScrimDay && !isSelected ? 'ring-1 ring-inset ring-emerald-500/20' : ''}
                  `}
                >
                  {day && (
                    <>
                      {/* Numéro du jour + badge scrim */}
                      <div className="flex items-center justify-between">
                        <span className={`
                          text-xs font-bold inline-flex w-6 h-6 items-center justify-center rounded-full transition-all
                          ${todayDay ? 'bg-accent-blue !text-white shadow-lg shadow-accent-blue/30' : isSelected ? 'text-accent-blue' : 'text-gray-400'}
                        `}>
                          {day}
                        </span>
                        {isScrimDay && (
                          <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/25 rounded px-1 leading-4">
                            dispo
                          </span>
                        )}
                      </div>

                      {/* Dots matchs joués — un rond par game */}
                      {dayMatches.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {dayMatches.map((m) => (
                            <span
                              key={m.id}
                              className={`w-2 h-2 rounded-full ${m.our_win ? 'bg-emerald-400' : 'bg-rose-400'}`}
                              title={m.our_win ? 'Victoire' : 'Défaite'}
                            />
                          ))}
                        </div>
                      )}

                      {/* Dots sessions planifiées (sans résultat) */}
                      {daySessions.filter((s) => !s.result).length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {daySessions.filter((s) => !s.result).map((s) => (
                            <span key={s.id} className="w-2 h-2 rounded-full bg-accent-blue/60"
                              title={s.opponent_team || 'Session planifiée'} />
                          ))}
                        </div>
                      )}

                      {/* Nom adversaire scrim planifié */}
                      {!hasActivity && null}
                      {daySessions.filter((s) => !s.result).length > 0 && (
                        <div className="mt-1">
                          <div className="text-[10px] px-1.5 py-0.5 rounded-md truncate font-medium bg-accent-blue/10 text-accent-blue">
                            {daySessions.find((s) => !s.result)?.opponent_team || 'Scrim'}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Légende */}
        <div className="flex items-center gap-4 px-1">
          <span className="text-[11px] text-gray-600 font-semibold">Matchs joués</span>
          {[
            { dot: 'bg-emerald-400', label: 'Victoire' },
            { dot: 'bg-rose-400',    label: 'Défaite' },
          ].map((l) => (
            <div key={l.label} className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${l.dot}`} />
              <span className="text-[11px] text-gray-600">{l.label}</span>
            </div>
          ))}
          <span className="mx-1 text-gray-700">·</span>
          <span className="text-[11px] text-gray-600 font-semibold">Planifié</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-accent-blue/60" />
            <span className="text-[11px] text-gray-600">Session à venir</span>
          </div>
          <span className="text-[11px] text-gray-700 ml-auto">Double-clic → ajouter une session</span>
        </div>
      </div>

      {/* ── Colonne droite : panel ── */}
      <div className="w-[380px] shrink-0 flex flex-col gap-4 sticky top-6 max-h-[calc(100vh-160px)] overflow-y-auto">

        {/* Sessions planifiées — toujours en premier */}
        <div className="bg-dark-card border border-dark-border rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-dark-border">
            <div>
              <h4 className="font-display font-bold text-white text-base leading-tight">
                {selectedDay ? 'Sessions planifiées' : 'À venir'}
              </h4>
              <p className="text-xs text-gray-600 mt-0.5">
                {selectedDay
                  ? selectedSessions.length === 0
                    ? 'Aucune session ce jour'
                    : `${selectedSessions.length} session${selectedSessions.length > 1 ? 's' : ''}`
                  : `${upcomingSessions.length} session${upcomingSessions.length > 1 ? 's' : ''} à venir`}
              </p>
            </div>
            <button type="button" onClick={() => openAdd(selectedDay ?? undefined)}
              className="flex items-center gap-2 px-3 py-1.5 bg-accent-blue hover:bg-accent-blue/90 text-white rounded-xl text-xs font-semibold transition-colors">
              <Plus size={13} />
              Session
            </button>
          </div>

          <div className="p-3 space-y-2">
            <AnimatePresence mode="wait">
              {selectedDay ? (
                selectedSessions.length === 0 ? (
                  <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="py-8 text-center">
                    <p className="text-gray-600 text-sm mb-2">Aucune session planifiée.</p>
                    <button type="button" onClick={() => openAdd(selectedDay)}
                      className="text-xs text-accent-blue hover:text-accent-blue/80 font-medium transition-colors">
                      + Planifier une session
                    </button>
                  </motion.div>
                ) : (
                  <motion.div key="day-sessions" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
                    {selectedSessions.map((s) => (
                      <SessionCard key={s.id} session={s} onDelete={handleDelete} onResultChange={handleResult} onNotesChange={handleNotes} />
                    ))}
                  </motion.div>
                )
              ) : upcomingSessions.length === 0 ? (
                <motion.div key="no-upcoming" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="py-8 text-center">
                  <TrendingUp size={28} className="text-gray-700 mx-auto mb-2" />
                  <p className="text-gray-600 text-sm mb-2">Aucune session à venir.</p>
                  <button type="button" onClick={() => openAdd()}
                    className="text-xs text-accent-blue hover:text-accent-blue/80 font-medium transition-colors">
                    + Planifier une session
                  </button>
                </motion.div>
              ) : (
                <motion.div key="upcoming" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
                  {upcomingSessions.map((s) => (
                    <SessionCard key={s.id} session={s} onDelete={handleDelete} onResultChange={handleResult} onNotesChange={handleNotes} />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Matchs joués ce jour — toujours en dessous */}
        {selectedDay && matchesByDay.get(selectedDay)?.length ? (
          <div className="bg-dark-card border border-dark-border rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-dark-border">
              <div>
                <h4 className="font-display font-bold text-white text-base leading-tight">Matchs joués</h4>
                <p className="text-xs text-gray-600 mt-0.5">
                  {matchesByDay.get(selectedDay)!.length} match{matchesByDay.get(selectedDay)!.length > 1 ? 's' : ''} ce jour
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-emerald-400">
                  {matchesByDay.get(selectedDay)!.filter((m) => m.our_win).length}W
                </span>
                <span className="text-gray-700">–</span>
                <span className="text-xs font-semibold text-rose-400">
                  {matchesByDay.get(selectedDay)!.filter((m) => !m.our_win).length}L
                </span>
              </div>
            </div>
            <div className="p-3 space-y-2">
              {matchesByDay.get(selectedDay)!.map((m) => (
                <MatchRow key={m.id} match={m} compact />
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {showAddModal && (
        <AddSessionModal initialDate={addDate} onConfirm={handleAdd} onClose={() => setShowAddModal(false)} />
      )}
    </div>
  )
}

// ─── Availability Tab ─────────────────────────────────────────────────────────

function AvailabilityTab({
  players,
  avail,
  setAvail,
  teamId,
}: {
  teamId: string
  players: any[]
  avail: Map<string, boolean>
  setAvail: React.Dispatch<React.SetStateAction<Map<string, boolean>>>
}) {

  const getAvail = (playerId: string, day: number, slot: string) =>
    avail.get(`${playerId}-${day}-${slot}`) ?? false

  const toggle = async (playerId: string, day: number, slot: string) => {
    const next = !getAvail(playerId, day, slot)
    setAvail((prev) => { const m = new Map(prev); m.set(`${playerId}-${day}-${slot}`, next); return m })
    await upsertAvailability(teamId, playerId, day, slot, next)
  }

  if (!players.length) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <Users size={40} className="text-gray-700 mb-3" />
        <p className="text-gray-600">Aucun joueur dans l'équipe.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-600">
        Cliquez sur un créneau pour activer / désactiver.{' '}
        <span className="text-gray-700">Sauvegarde automatique.</span>
      </p>

      <div className="bg-dark-card border border-dark-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              {/* Header jours + barres récap */}
              <tr className="border-b border-dark-border">
                <th className="text-left px-4 py-2 text-xs font-bold text-gray-600 uppercase tracking-widest w-36">Joueur</th>
                <th className="text-left px-3 py-2 text-xs font-bold text-gray-600 uppercase tracking-widest w-24">Créneau</th>
                {[0, 1, 2, 3, 4, 5, 6].map((d) => {
                  // Scrim potentiel = au moins un créneau où TOUS les joueurs sont dispo simultanément
                  const sharedSlot = players.length > 0 && SLOTS.some((slot) =>
                    players.every((p) => avail.get(`${p.id}-${d}-${slot}`))
                  )
                  // Barre par joueur = dispo sur au moins un créneau ce jour
                  const playerDispo = players.map((p) =>
                    SLOTS.some((slot) => avail.get(`${p.id}-${d}-${slot}`))
                  )
                  return (
                    <th key={d} className="text-center px-2 py-2">
                      <div className="flex flex-col items-center gap-1.5">
                        <span className="text-[11px] font-bold uppercase tracking-widest text-gray-500">
                          {DAY_LABELS[d]}
                        </span>
                        <div className="flex gap-0.5">
                          {playerDispo.map((dispo, pi) => (
                            <div
                              key={pi}
                              className={`w-1 h-3 rounded-sm transition-all ${dispo ? 'bg-emerald-400' : 'bg-dark-bg border border-dark-border/50'}`}
                              title={`${players[pi]?.player_name || players[pi]?.pseudo}: ${dispo ? 'dispo' : 'indispo'}`}
                            />
                          ))}
                        </div>
                        <span
                          className={`text-[9px] font-bold uppercase tracking-wide px-1 py-0.5 rounded transition-all ${
                            sharedSlot
                              ? 'text-emerald-400 bg-emerald-500/15 border border-emerald-500/30'
                              : 'text-gray-700 bg-dark-bg border border-dark-border/30'
                          }`}
                        >
                          scrim
                        </span>
                      </div>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {players.map((player, pi) =>
                SLOTS.map((slot, si) => (
                  <tr key={`${player.id}-${slot}`} className={`
                    transition-colors hover:bg-dark-bg/20
                    ${si === 0 && pi > 0 ? 'border-t border-dark-border/50' : ''}
                    ${si > 0 ? 'border-t border-dark-border/10' : ''}
                  `}>
                    {si === 0 && (
                      <td rowSpan={3} className="px-4 w-36 align-middle">
                        <span className="text-xs font-bold text-white">
                          {player.player_name || player.pseudo}
                        </span>
                      </td>
                    )}
                    <td className="px-3 py-1.5 w-24">
                      <span className="text-xs text-white">{SLOT_LABELS[slot]}</span>
                    </td>
                    {[0, 1, 2, 3, 4, 5, 6].map((day) => {
                      const on = getAvail(player.id, day, slot)
                      return (
                        <td key={day} className="text-center px-2 py-1.5">
                          <button type="button" onClick={() => toggle(player.id, day, slot)}
                            className={`w-7 h-7 rounded-lg border text-xs font-bold transition-all ${
                              on
                                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                                : 'bg-dark-bg border-dark-border text-transparent hover:border-gray-600'
                            }`}
                          >✓</button>
                        </td>
                      )
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────

export const PlanningPage = () => {
  const { team, players = [] } = useTeam()
  const { matches } = useTeamMatches(team?.id)
  const [tab, setTab] = useState<Tab>('calendar')
  const [avail, setAvail] = useState<Map<string, boolean>>(new Map())

  useEffect(() => {
    if (!team?.id) return
    fetchAvailability(team.id).then(({ data }) => {
      if (!data) return
      const m = new Map<string, boolean>()
      for (const row of data) m.set(`${row.player_id}-${row.day_of_week}-${row.slot}`, row.available)
      setAvail(m)
    })
  }, [team?.id])

  return (
    <div className="w-full flex flex-col">
      {/* Header */}
      <div className="mb-5 flex items-end justify-between">
        <div>
          <h2 className="font-display text-3xl font-bold mb-1">Planning</h2>
          <p className="text-gray-500 text-sm">Organisez vos scrims et consultez les disponibilités de l'équipe.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 mb-5 border-b border-dark-border">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-6 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
              tab === id
                ? 'border-accent-blue text-white'
                : 'border-transparent text-gray-500 hover:text-white hover:border-dark-border'
            }`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {!team?.id ? (
        <div className="text-gray-600 text-sm">Chargement...</div>
      ) : tab === 'calendar' ? (
        <CalendarTab teamId={team.id} allMatches={matches} avail={avail} players={players} />
      ) : (
        <AvailabilityTab teamId={team.id} players={players} avail={avail} setAvail={setAvail} />
      )}
    </div>
  )
}
