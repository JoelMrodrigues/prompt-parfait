/**
 * Page Planning — Calendrier des scrims + Disponibilités joueurs
 */
import { useState, useEffect, useCallback, useMemo } from 'react'
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
} from 'lucide-react'
import { useTeam } from '../hooks/useTeam'
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

const RESULT_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  win: { label: 'V', color: 'text-emerald-400', bg: 'bg-emerald-500/15 border-emerald-500/30' },
  loss: { label: 'D', color: 'text-rose-400', bg: 'bg-rose-500/15 border-rose-500/30' },
  draw: { label: 'N', color: 'text-amber-400', bg: 'bg-amber-500/15 border-amber-500/30' },
}

const TABS = [
  { id: 'calendar', label: 'Calendrier', icon: CalendarDays },
  { id: 'availability', label: 'Disponibilités', icon: Users },
] as const

type Tab = (typeof TABS)[number]['id']

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDateStr(y: number, m: number, d: number) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function fmtTime(t: string | null) {
  return t ? t.slice(0, 5) : ''
}

// ─── Add Session Modal ────────────────────────────────────────────────────────

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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
      onClick={onClose}
    >
      <div
        className="bg-dark-card border border-dark-border rounded-2xl shadow-xl w-full max-w-sm p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display font-semibold text-white text-lg">Nouvelle session</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-dark-bg transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent-blue/50"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Équipe adverse</label>
            <input
              type="text"
              value={opponent}
              onChange={(e) => setOpponent(e.target.value)}
              placeholder="Ex: Team Alpha"
              className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-accent-blue/50"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Heure (optionnel)</label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent-blue/50"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Notes (optionnel)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Notes pré-match..."
              className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-accent-blue/50 resize-none"
            />
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded-xl border border-dark-border text-gray-400 text-sm hover:text-white transition-colors"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={() => onConfirm(date, opponent, time, notes)}
            disabled={!date}
            className="flex-1 px-4 py-2 rounded-xl bg-accent-blue/20 border border-accent-blue/40 text-accent-blue text-sm font-medium hover:bg-accent-blue/30 transition-colors disabled:opacity-50"
          >
            Créer
          </button>
        </div>
      </div>
    </div>
  )
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
    <div className="bg-dark-card border border-dark-border rounded-xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-white text-sm">
              {session.opponent_team || 'Adversaire inconnu'}
            </span>
            {session.time && (
              <span className="text-xs text-gray-500">{fmtTime(session.time)}</span>
            )}
            {rs && (
              <span className={`text-xs font-semibold px-1.5 py-0.5 rounded border ${rs.bg} ${rs.color}`}>
                {rs.label}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-600 mt-0.5">{session.date}</p>

          {editNotes ? (
            <div className="mt-2">
              <textarea
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                rows={2}
                className="w-full bg-dark-bg border border-dark-border rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-accent-blue/50 resize-none"
              />
              <div className="flex gap-1 mt-1">
                <button
                  type="button"
                  onClick={() => { onNotesChange(session.id, noteDraft); setEditNotes(false) }}
                  className="text-xs text-emerald-400 hover:text-emerald-300"
                >
                  Sauvegarder
                </button>
                <span className="text-gray-600">·</span>
                <button
                  type="button"
                  onClick={() => { setNoteDraft(session.notes || ''); setEditNotes(false) }}
                  className="text-xs text-gray-500 hover:text-gray-300"
                >
                  Annuler
                </button>
              </div>
            </div>
          ) : (
            <>
              {session.notes && (
                <p
                  className="text-xs text-gray-400 mt-1 cursor-pointer hover:text-gray-200 transition-colors"
                  onClick={() => setEditNotes(true)}
                >
                  {session.notes}
                </p>
              )}
              {!session.notes && (
                <button
                  type="button"
                  onClick={() => setEditNotes(true)}
                  className="text-xs text-gray-600 hover:text-gray-400 mt-1 transition-colors"
                >
                  + Ajouter des notes
                </button>
              )}
            </>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {(['win', 'loss', 'draw'] as SessionResult[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => onResultChange(session.id, session.result === r ? null : r)}
              title={r === 'win' ? 'Victoire' : r === 'loss' ? 'Défaite' : 'Nul'}
              className={`p-1.5 rounded-lg transition-colors ${
                session.result === r
                  ? RESULT_STYLES[r].color
                  : 'text-gray-600 hover:text-gray-400'
              }`}
            >
              {r === 'win' ? <CheckCircle size={14} /> : r === 'loss' ? <XCircle size={14} /> : <Minus size={14} />}
            </button>
          ))}
          <button
            type="button"
            onClick={() => onDelete(session.id)}
            className="p-1.5 rounded-lg text-gray-600 hover:text-rose-400 transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Calendar Tab ─────────────────────────────────────────────────────────────

function CalendarTab({ teamId }: { teamId: string }) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1)
  const [sessions, setSessions] = useState<ScrimSession[]>([])
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [addDate, setAddDate] = useState('')

  const load = useCallback(async () => {
    const { data } = await fetchSessions(teamId, year, month)
    if (data) setSessions(data)
  }, [teamId, year, month])

  useEffect(() => {
    setSessions([])
    setSelectedDay(null)
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

  const selectedSessions = selectedDay ? (sessionsByDay.get(selectedDay) ?? []) : []

  const prevMonth = () => {
    if (month === 1) { setYear((y) => y - 1); setMonth(12) }
    else setMonth((m) => m - 1)
  }
  const nextMonth = () => {
    if (month === 12) { setYear((y) => y + 1); setMonth(1) }
    else setMonth((m) => m + 1)
  }

  const handleAdd = async (date: string, opponent: string, time: string, notes: string) => {
    const { data } = await addSession(teamId, date, opponent, time, notes)
    if (data) {
      setSessions((prev) =>
        [...prev, data].sort(
          (a, b) => a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? '')
        )
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

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={prevMonth}
          className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-dark-card transition-colors"
        >
          <ChevronLeft size={18} />
        </button>
        <h3 className="font-display text-lg font-semibold text-white flex-1 text-center">
          {MONTH_NAMES[month - 1]} {year}
        </h3>
        <button
          type="button"
          onClick={nextMonth}
          className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-dark-card transition-colors"
        >
          <ChevronRight size={18} />
        </button>
        <button
          type="button"
          onClick={() => {
            setAddDate(toDateStr(year, month, today.getDate()))
            setShowAddModal(true)
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-blue hover:bg-accent-blue/90 text-white rounded-lg text-sm transition-colors ml-2"
        >
          <Plus size={14} />
          Session
        </button>
      </div>

      <div className="bg-dark-card border border-dark-border rounded-xl overflow-hidden">
        <div className="grid grid-cols-7 border-b border-dark-border">
          {DAY_LABELS.map((d) => (
            <div key={d} className="py-2 text-center text-xs font-semibold text-gray-500">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {calendarDays.map((day, idx) => {
            const daySessions = day ? (sessionsByDay.get(day) ?? []) : []
            const isSelected = day === selectedDay
            const todayDay = day ? isToday(day) : false
            return (
              <div
                key={idx}
                onClick={() => day && setSelectedDay(day === selectedDay ? null : day)}
                className={`min-h-[60px] p-1.5 border-b border-r border-dark-border/50 transition-colors ${
                  day ? 'cursor-pointer hover:bg-dark-bg/50' : 'bg-dark-bg/20'
                } ${isSelected ? 'bg-accent-blue/10' : ''}`}
              >
                {day && (
                  <>
                    <span
                      className={`text-xs font-medium inline-flex w-5 h-5 items-center justify-center rounded-full ${
                        todayDay
                          ? 'bg-accent-blue text-white'
                          : isSelected
                          ? 'text-accent-blue'
                          : 'text-gray-400'
                      }`}
                    >
                      {day}
                    </span>
                    <div className="mt-1 space-y-0.5">
                      {daySessions.slice(0, 2).map((s) => (
                        <div
                          key={s.id}
                          className={`text-[10px] px-1 rounded truncate ${
                            s.result === 'win'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : s.result === 'loss'
                              ? 'bg-rose-500/20 text-rose-400'
                              : 'bg-accent-blue/15 text-accent-blue'
                          }`}
                        >
                          {s.opponent_team || 'Scrim'}
                        </div>
                      ))}
                      {daySessions.length > 2 && (
                        <span className="text-[10px] text-gray-600">+{daySessions.length - 2}</span>
                      )}
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {selectedDay && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-white">
              Sessions du {selectedDay} {MONTH_NAMES[month - 1]}
            </h4>
            <button
              type="button"
              onClick={() => {
                setAddDate(toDateStr(year, month, selectedDay))
                setShowAddModal(true)
              }}
              className="flex items-center gap-1 text-xs text-accent-blue hover:text-accent-blue/80 transition-colors"
            >
              <Plus size={12} />
              Ajouter
            </button>
          </div>
          {selectedSessions.length === 0 ? (
            <p className="text-sm text-gray-600">Aucune session ce jour.</p>
          ) : (
            <div className="space-y-3">
              {selectedSessions.map((s) => (
                <SessionCard
                  key={s.id}
                  session={s}
                  onDelete={handleDelete}
                  onResultChange={handleResult}
                  onNotesChange={handleNotes}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {!selectedDay && sessions.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-white mb-3">
            Sessions du mois ({sessions.length})
          </h4>
          <div className="space-y-3">
            {sessions.map((s) => (
              <SessionCard
                key={s.id}
                session={s}
                onDelete={handleDelete}
                onResultChange={handleResult}
                onNotesChange={handleNotes}
              />
            ))}
          </div>
        </div>
      )}

      {showAddModal && (
        <AddSessionModal
          initialDate={addDate}
          onConfirm={handleAdd}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  )
}

// ─── Availability Tab ─────────────────────────────────────────────────────────

function AvailabilityTab({ teamId, players }: { teamId: string; players: any[] }) {
  const [avail, setAvail] = useState<Map<string, boolean>>(new Map())

  useEffect(() => {
    fetchAvailability(teamId).then(({ data }) => {
      if (!data) return
      const m = new Map<string, boolean>()
      for (const row of data) {
        m.set(`${row.player_id}-${row.day_of_week}-${row.slot}`, row.available)
      }
      setAvail(m)
    })
  }, [teamId])

  const getAvail = (playerId: string, day: number, slot: string) =>
    avail.get(`${playerId}-${day}-${slot}`) ?? false

  const toggle = async (playerId: string, day: number, slot: string) => {
    const next = !getAvail(playerId, day, slot)
    setAvail((prev) => {
      const m = new Map(prev)
      m.set(`${playerId}-${day}-${slot}`, next)
      return m
    })
    await upsertAvailability(teamId, playerId, day, slot, next)
  }

  if (!players.length) {
    return <div className="text-center py-8 text-gray-600 text-sm">Aucun joueur dans l'équipe.</div>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr>
            <th className="text-left px-3 py-2 text-gray-500 text-xs font-semibold w-40">Joueur</th>
            <th className="text-left px-3 py-2 text-gray-500 text-xs font-semibold w-28">Créneau</th>
            {[0, 1, 2, 3, 4, 5, 6].map((d) => (
              <th key={d} className="text-center px-2 py-2 text-gray-500 text-xs font-semibold">
                {DAY_LABELS[d]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {players.map((player) =>
            SLOTS.map((slot, si) => (
              <tr
                key={`${player.id}-${slot}`}
                className={`${si === 0 ? 'border-t border-dark-border/50' : ''}`}
              >
                <td className="px-3 py-1.5">
                  {si === 0 && (
                    <span className="text-sm font-medium text-white">
                      {player.player_name || player.pseudo}
                    </span>
                  )}
                </td>
                <td className="px-3 py-1.5 text-xs text-gray-500">{SLOT_LABELS[slot]}</td>
                {[0, 1, 2, 3, 4, 5, 6].map((day) => {
                  const on = getAvail(player.id, day, slot)
                  return (
                    <td key={day} className="text-center px-2 py-1.5">
                      <button
                        type="button"
                        onClick={() => toggle(player.id, day, slot)}
                        className={`w-7 h-7 rounded-lg border text-xs font-bold transition-all ${
                          on
                            ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                            : 'bg-dark-bg border-dark-border text-transparent hover:border-gray-500'
                        }`}
                      >
                        ✓
                      </button>
                    </td>
                  )
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
      <p className="text-xs text-gray-600 mt-4">
        Cliquez pour activer/désactiver. Sauvegarde automatique.
      </p>
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────

export const PlanningPage = () => {
  const { team, players = [] } = useTeam()
  const [tab, setTab] = useState<Tab>('calendar')

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h2 className="font-display text-3xl font-bold mb-2">Planning</h2>
        <p className="text-gray-400">
          Organisez vos scrims et consultez les disponibilités de l'équipe.
        </p>
      </div>

      <div className="flex gap-0 mb-6 border-b border-dark-border">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === id
                ? 'border-accent-blue text-white'
                : 'border-transparent text-gray-400 hover:text-white hover:border-dark-border'
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
        <CalendarTab teamId={team.id} />
      ) : (
        <AvailabilityTab teamId={team.id} players={players} />
      )}
    </div>
  )
}
