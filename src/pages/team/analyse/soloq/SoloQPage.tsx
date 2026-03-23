/**
 * Page Analyse SoloQ — Panneau de configuration
 * Joueur · Plage de dates · Axes de travail · Lancer
 */
import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Calendar, Check, X, Search, Settings2, ArrowLeft, PanelLeftOpen, PanelLeftClose } from 'lucide-react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useTeam } from '../../hooks/useTeam'
import { getRankColorText } from '../../joueurs/utils/playerDetailHelpers'
import { SEASON_16_START_MS } from '../../../../lib/constants'
import { useLayout } from '../../../../contexts/LayoutContext'
import type { Player } from '../../../../contexts/TeamContext'

// ─── Constantes ───────────────────────────────────────────────────────────────

const SEASON_START = new Date(SEASON_16_START_MS).toISOString().split('T')[0]
const TODAY        = new Date().toISOString().split('T')[0]

const DATE_PRESETS = [
  { id: '7d',     label: '7 jours'      },
  { id: '30d',    label: '30 jours'     },
  { id: 'season', label: 'Saison'       },
  { id: 'custom', label: 'Personnalisé' },
] as const

type DatePresetId = typeof DATE_PRESETS[number]['id']

const ALL_AXES = [
  { id: 'deaths',      label: 'Réduire mes morts',        group: 'Combat'     },
  { id: 'trading',     label: 'Trades / duels',           group: 'Combat'     },
  { id: 'positioning', label: 'Positionnement',           group: 'Combat'     },
  { id: 'early',       label: 'Early game',               group: 'Macro'      },
  { id: 'objectives',  label: 'Gestion des objectifs',    group: 'Macro'      },
  { id: 'macro',       label: 'Macro / décisions',        group: 'Macro'      },
  { id: 'roaming',     label: 'Roaming',                  group: 'Macro'      },
  { id: 'cs',          label: 'CS / Farm',                group: 'Ressources' },
  { id: 'gold',        label: 'Gestion de l\'or',         group: 'Ressources' },
  { id: 'champion',    label: 'Pool de champions',        group: 'Ressources' },
  { id: 'consistency', label: 'Consistance',              group: 'Mental'     },
  { id: 'vision',      label: 'Vision / wards',           group: 'Mental'     },
]

const POSITION_ORDER = ['TOP', 'JUNGLE', 'MID', 'BOT', 'SUPPORT', 'SUP']
const POSITION_LABEL: Record<string, string> = {
  TOP: 'Top', JUNGLE: 'Jungle', MID: 'Mid', BOT: 'Bot', SUPPORT: 'Support', SUP: 'Support',
}

// ─── Modal axes ───────────────────────────────────────────────────────────────

function AxesModal({
  axes,
  onClose,
  onApply,
}: {
  axes: Set<string>
  onClose: () => void
  onApply: (next: Set<string>) => void
}) {
  const [local, setLocal] = useState(() => new Set(axes))

  const toggle = (id: string) => setLocal((prev) => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  const allSelected = local.size === ALL_AXES.length
  const toggleAll   = () => setLocal(allSelected ? new Set() : new Set(ALL_AXES.map(a => a.id)))

  // Groupes
  const groups = [...new Set(ALL_AXES.map(a => a.group))]

  const modal = (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.15 }}
        className="bg-dark-card border border-dark-border rounded-2xl w-full max-w-lg flex flex-col"
        style={{ maxHeight: 'calc(100vh - 2rem)' }}
      >
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between p-5 border-b border-dark-border">
          <div>
            <h3 className="font-display text-lg font-bold">Axes d'analyse</h3>
            <p className="text-xs text-gray-500 mt-0.5">{local.size} / {ALL_AXES.length} sélectionnés</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleAll}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                allSelected
                  ? 'bg-accent-blue/15 border-accent-blue/40 text-accent-blue'
                  : 'border-dark-border text-gray-400 hover:text-white'
              }`}
            >
              TOUT
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-dark-bg transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Liste par groupe */}
        <div className="overflow-y-auto flex-1 min-h-0 p-5 space-y-5">
          {groups.map((group) => (
            <div key={group}>
              <p className="text-[10px] font-bold tracking-widest uppercase text-gray-600 mb-2">{group}</p>
              <div className="space-y-1.5">
                {ALL_AXES.filter(a => a.group === group).map((ax) => (
                  <button
                    key={ax.id}
                    onClick={() => toggle(ax.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-colors ${
                      local.has(ax.id)
                        ? 'border-accent-blue/30 bg-accent-blue/8 text-white'
                        : 'border-dark-border text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                      local.has(ax.id) ? 'bg-accent-blue border-accent-blue' : 'border-gray-600'
                    }`}>
                      {local.has(ax.id) && <Check size={10} className="text-white" strokeWidth={3} />}
                    </div>
                    <span className="text-sm">{ax.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="shrink-0 flex items-center justify-between p-5 border-t border-dark-border">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-400 hover:text-white rounded-xl border border-dark-border hover:border-gray-600 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={() => { onApply(local); onClose() }}
            className="flex items-center gap-2 px-5 py-2 bg-accent-blue hover:bg-accent-blue/90 text-white rounded-xl text-sm font-medium transition-colors"
          >
            <Check size={14} />
            Appliquer
          </button>
        </div>
      </motion.div>
    </div>
  )

  return createPortal(modal, document.body)
}

// ─── Player selector ──────────────────────────────────────────────────────────

function PlayerSelector({ players, selected, onSelect }: {
  players: Player[]
  selected: Player | null
  onSelect: (p: Player) => void
}) {
  const [open, setOpen] = useState(false)

  const sorted = [...players].sort((a, b) => {
    const ia = POSITION_ORDER.indexOf(a.position?.toUpperCase() ?? '')
    const ib = POSITION_ORDER.indexOf(b.position?.toUpperCase() ?? '')
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
  })

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors text-left ${
          open
            ? 'border-accent-blue/50 bg-dark-bg'
            : 'border-dark-border bg-dark-bg hover:border-accent-blue/30'
        }`}
      >
        {selected ? (
          <>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{selected.player_name}</p>
              <p className="text-[11px] text-gray-500 truncate">{selected.pseudo}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {selected.position && (
                <span className="text-[10px] text-gray-500 uppercase">
                  {POSITION_LABEL[selected.position.toUpperCase()] ?? selected.position}
                </span>
              )}
              {selected.rank && (
                <span className="text-xs font-bold" style={{ color: getRankColorText(selected.rank) }}>
                  {selected.rank}
                </span>
              )}
            </div>
          </>
        ) : (
          <span className="text-sm text-gray-500 flex-1">Sélectionner un joueur…</span>
        )}
        <ChevronDown size={15} className={`text-gray-500 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full mt-1.5 left-0 right-0 z-50 bg-dark-card border border-dark-border rounded-xl shadow-2xl overflow-hidden">
          {sorted.length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-4">Aucun joueur dans l'équipe</p>
          ) : (
            <ul className="py-1.5">
              {sorted.map((p) => (
                <li key={p.id}>
                  <button
                    onClick={() => { onSelect(p); setOpen(false) }}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-dark-bg/60 transition-colors text-left ${
                      selected?.id === p.id ? 'bg-accent-blue/5' : ''
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${selected?.id === p.id ? 'text-accent-blue' : 'text-white'}`}>
                        {p.player_name}
                      </p>
                      <p className="text-[11px] text-gray-600 truncate">{p.pseudo}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {p.position && (
                        <span className="text-[10px] text-gray-500 uppercase">
                          {POSITION_LABEL[p.position.toUpperCase()] ?? p.position}
                        </span>
                      )}
                      {p.rank && (
                        <span className="text-xs font-bold" style={{ color: getRankColorText(p.rank) }}>
                          {p.rank}
                        </span>
                      )}
                      {selected?.id === p.id && <Check size={13} className="text-accent-blue" />}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export const SoloQPage = () => {
  const { players } = useTeam()
  const { sidebarOpen, setSidebarOpen } = useLayout()
  const navigate = useNavigate()

  // Replie la sidebar à l'entrée, la restaure à la sortie
  useEffect(() => {
    setSidebarOpen(false)
    return () => setSidebarOpen(true)
  }, [setSidebarOpen])

  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)
  const [datePreset, setDatePreset]         = useState<DatePresetId>('season')
  const [dateFrom, setDateFrom]             = useState(SEASON_START)
  const [dateTo, setDateTo]                 = useState(TODAY)
  const [axes, setAxes]                     = useState<Set<string>>(
    () => new Set(ALL_AXES.map(a => a.id))
  )
  const [axesModalOpen, setAxesModalOpen]   = useState(false)

  const dateFromRef = useRef<HTMLInputElement>(null)
  const dateToRef   = useRef<HTMLInputElement>(null)

  const canLaunch = !!selectedPlayer

  const applyPreset = (id: DatePresetId) => {
    setDatePreset(id)
    if (id === 'season') {
      setDateFrom(SEASON_START); setDateTo(TODAY)
    } else if (id === '30d') {
      const d = new Date(); d.setDate(d.getDate() - 30)
      setDateFrom(d.toISOString().split('T')[0]); setDateTo(TODAY)
    } else if (id === '7d') {
      const d = new Date(); d.setDate(d.getDate() - 7)
      setDateFrom(d.toISOString().split('T')[0]); setDateTo(TODAY)
    } else if (id === 'custom') {
      // Ouvre le picker de la date de début
      setTimeout(() => dateFromRef.current?.showPicker?.(), 50)
    }
  }

  const allAxesSelected = axes.size === ALL_AXES.length
  const toggleAll = () => setAxes(allAxesSelected ? new Set() : new Set(ALL_AXES.map(a => a.id)))

  return (
    <div className="-m-6 flex overflow-hidden" style={{ height: 'calc(100vh - 5rem)' }}>

      {/* ── Panneau config — remplace la sidebar ────────────────────────── */}
      <div className="w-72 shrink-0 bg-dark-card border-r border-dark-border flex flex-col overflow-y-auto">

        {/* Header panneau */}
        <div className="px-4 pt-4 pb-3 border-b border-dark-border shrink-0">
          {/* Retour + toggle sidebar */}
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => navigate('/team/analyse')}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-white transition-colors"
            >
              <ArrowLeft size={13} />
              Retour
            </button>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 rounded-lg text-gray-600 hover:text-white hover:bg-dark-bg/60 transition-colors"
              title={sidebarOpen ? 'Replier la navigation' : 'Afficher la navigation'}
            >
              {sidebarOpen ? <PanelLeftClose size={14} /> : <PanelLeftOpen size={14} />}
            </button>
          </div>
          <h2 className="font-display text-sm font-bold text-white">Configuration</h2>
          <p className="text-[11px] text-gray-500 mt-0.5">Solo Queue · Analyse individuelle</p>
        </div>

        <div className="flex-1 flex flex-col overflow-y-auto">

          {/* 1. Joueur */}
          <div className="px-4 py-4">
            <p className="text-[10px] font-bold tracking-widest uppercase text-gray-600 mb-3">Joueur</p>
            <PlayerSelector players={players} selected={selectedPlayer} onSelect={setSelectedPlayer} />
          </div>

          <div className="border-t border-dark-border/40 mx-4" />

          {/* 2. Période */}
          <div className="px-4 py-4">
            <p className="text-[10px] font-bold tracking-widest uppercase text-gray-600 mb-3">Période</p>

            <div className="grid grid-cols-2 gap-1.5 mb-3">
              {DATE_PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => applyPreset(p.id)}
                  className={`px-2 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                    datePreset === p.id
                      ? 'bg-accent-blue/15 border-accent-blue/40 text-accent-blue'
                      : 'border-dark-border text-gray-500 hover:text-white hover:border-gray-600'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {datePreset === 'custom' ? (
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <p className="text-[10px] text-gray-600 mb-1">Du</p>
                  <div className="relative">
                    <Calendar size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" />
                    <input
                      ref={dateFromRef}
                      type="date"
                      value={dateFrom}
                      min={SEASON_START}
                      max={dateTo}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="w-full pl-7 pr-2 py-1.5 bg-dark-bg border border-dark-border rounded-lg text-xs text-gray-300 focus:outline-none focus:border-accent-blue/50 cursor-pointer"
                    />
                  </div>
                </div>
                <div className="text-gray-700 mt-4 text-xs shrink-0">→</div>
                <div className="flex-1">
                  <p className="text-[10px] text-gray-600 mb-1">Au</p>
                  <div className="relative">
                    <Calendar size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" />
                    <input
                      ref={dateToRef}
                      type="date"
                      value={dateTo}
                      min={dateFrom}
                      max={TODAY}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="w-full pl-7 pr-2 py-1.5 bg-dark-bg border border-dark-border rounded-lg text-xs text-gray-300 focus:outline-none focus:border-accent-blue/50 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-gray-600">
                {new Date(dateFrom).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                {' – '}
                {new Date(dateTo).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
              </p>
            )}
          </div>

          <div className="border-t border-dark-border/40 mx-4" />

          {/* 3. Axes */}
          <div className="px-4 py-4">
            <p className="text-[10px] font-bold tracking-widest uppercase text-gray-600 mb-3">Axes à analyser</p>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleAll}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                  allAxesSelected
                    ? 'bg-accent-blue/15 border-accent-blue/40 text-accent-blue'
                    : 'border-dark-border text-gray-500 hover:text-white'
                }`}
              >
                TOUT ({ALL_AXES.length})
              </button>
              <button
                onClick={() => setAxesModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-dark-border text-gray-500 hover:text-white hover:border-gray-600 transition-colors"
              >
                <Settings2 size={12} />
                Personnaliser
              </button>
              <span className="ml-auto text-[11px] text-gray-600">{axes.size}/{ALL_AXES.length}</span>
            </div>
          </div>

        </div>

        {/* 4. Lancer — sticky en bas */}
        <div className="shrink-0 px-4 py-3 border-t border-dark-border">
          <button
            disabled={!canLaunch}
            className={`w-full py-2.5 rounded-xl font-semibold text-sm transition-all ${
              canLaunch
                ? 'bg-accent-blue hover:bg-accent-blue/90 text-white shadow-lg shadow-accent-blue/20'
                : 'bg-dark-bg border border-dark-border text-gray-600 cursor-not-allowed'
            }`}
          >
            {canLaunch ? 'Lancer l\'analyse →' : 'Sélectionnez un joueur'}
          </button>
        </div>
      </div>

      {/* ── Zone résultat — placeholder ─────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 rounded-3xl bg-dark-card border border-dark-border flex items-center justify-center mx-auto mb-5">
            <Search size={32} className="text-gray-700" />
          </div>
          <p className="text-gray-500 font-medium">Configurez et lancez l'analyse</p>
          <p className="text-gray-700 text-sm mt-1">Le rapport apparaîtra ici</p>
        </div>
      </div>

      {/* ── Modal axes ──────────────────────────────────────────────────── */}
      {axesModalOpen && (
        <AxesModal
          axes={axes}
          onClose={() => setAxesModalOpen(false)}
          onApply={(next) => setAxes(next)}
        />
      )}
    </div>
  )
}
