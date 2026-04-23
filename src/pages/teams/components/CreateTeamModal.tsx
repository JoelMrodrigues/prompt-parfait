import { useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Loader2, Plus, Camera, X, ChevronRight, ChevronLeft,
  Swords, Users, Trophy, Gamepad2,
  Upload, LineChart, BarChart3, FileText, MessageSquare, CalendarDays, Map, Check,
  Zap, Shield, Shuffle,
} from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import type { Team } from '../../../contexts/TeamContext'

// ─── Types d'équipe ───────────────────────────────────────────────────────────

export const TEAM_TYPES = [
  {
    id: 'scrim',
    label: 'Scrims',
    icon: Swords,
    desc: 'Équipe compétitive avec matchs organisés',
    color: 'text-accent-blue',
    border: 'border-accent-blue',
    bg: 'bg-accent-blue/10',
    glow: 'shadow-[0_0_24px_rgba(99,102,241,0.35)]',
  },
  {
    id: 'flex',
    label: 'Flex',
    icon: Users,
    desc: 'Classé 5v5 sans rôles fixes',
    color: 'text-emerald-400',
    border: 'border-emerald-400',
    bg: 'bg-emerald-500/10',
    glow: 'shadow-[0_0_24px_rgba(52,211,153,0.35)]',
  },
  {
    id: 'soloq',
    label: 'Solo Q',
    icon: Trophy,
    desc: 'Progression et suivi de rang individuel',
    color: 'text-amber-400',
    border: 'border-amber-400',
    bg: 'bg-amber-500/10',
    glow: 'shadow-[0_0_24px_rgba(251,191,36,0.35)]',
  },
  {
    id: 'fun',
    label: 'Fun',
    icon: Gamepad2,
    desc: 'Parties détendues sans pression',
    color: 'text-pink-400',
    border: 'border-pink-400',
    bg: 'bg-pink-500/10',
    glow: 'shadow-[0_0_24px_rgba(244,114,182,0.35)]',
  },
] as const

// ─── Modes de jeu Fun ────────────────────────────────────────────────────────

export const FUN_MODES = [
  { id: 'aram',       label: 'ARAM',           desc: 'Howling Abyss classique',       icon: Swords  },
  { id: 'chaos_aram', label: 'ARAM du Chaos',  desc: 'Modificateurs aléatoires',      icon: Shuffle },
  { id: 'arena',      label: 'Arena',          desc: 'Combat 2v2 en arène',           icon: Shield  },
]

// ─── Fonctionnalités ──────────────────────────────────────────────────────────

const FEATURE_GROUPS = [
  {
    label: 'Analyse & Compétitif',
    features: [
      { key: 'import',  label: 'Import de matchs',     desc: 'Importez vos parties depuis Exalty',       icon: Upload },
      { key: 'matchs',  label: 'Matchs & Résultats',   desc: 'Historique et scores de vos rencontres',   icon: Gamepad2 },
      { key: 'analyse', label: 'Analyse de timeline',  desc: 'Analyse détaillée des matchs importés',    icon: LineChart },
      { key: 'stats',   label: 'Statistiques',          desc: "Performances d'équipe et comparaisons",    icon: BarChart3 },
      { key: 'drafts',  label: 'Drafts',                desc: 'Créez et analysez vos stratégies pick/ban', icon: FileText },
    ],
  },
  {
    label: 'Outils',
    features: [
      { key: 'coaching',      label: 'Coaching & Objectifs', desc: 'Notes, objectifs et suivi des joueurs',    icon: MessageSquare },
      { key: 'planning',      label: 'Planning',              desc: "Calendrier et sessions d'entraînement",   icon: CalendarDays },
      { key: 'plans',         label: 'Plans de jeu',          desc: 'Schémas tactiques et stratégies',          icon: Map },
      { key: 'champion_pool', label: 'Pool de Champions',     desc: 'Champions maîtrisés par joueur',           icon: Users },
    ],
  },
]

const TYPE_DEFAULTS: Record<string, string[]> = {
  scrim:  ['import', 'matchs', 'analyse', 'stats', 'drafts', 'coaching', 'planning', 'plans', 'champion_pool'],
  flex:   ['matchs', 'stats', 'coaching', 'planning', 'champion_pool'],
  soloq:  ['stats', 'coaching', 'champion_pool'],
  fun:    ['coaching', 'planning', 'champion_pool'],
}

function getDefaultFeatures(type: string): Record<string, boolean> {
  const enabled = new Set(TYPE_DEFAULTS[type] ?? [])
  const all = FEATURE_GROUPS.flatMap(g => g.features.map(f => f.key))
  return Object.fromEntries(all.map(k => [k, enabled.has(k)]))
}

// ─── Animation des étapes ─────────────────────────────────────────────────────

const slideVariants = {
  enter: (dir: number) => ({ opacity: 0, x: dir > 0 ? 28 : -28 }),
  center: { opacity: 1, x: 0, transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] } },
  exit:  (dir: number) => ({ opacity: 0, x: dir > 0 ? -28 : 28, transition: { duration: 0.16, ease: 'easeIn' } }),
}

const STEP_LABELS = ['Identité', 'Type', 'Fonctionnalités']

// ─── Modal ────────────────────────────────────────────────────────────────────

export function CreateTeamModal({
  onClose,
  onCreate,
  onUpdateTeam,
}: {
  onClose: () => void
  onCreate: (name: string, type: string) => Promise<Team>
  onUpdateTeam: (teamId: string, updates: Partial<Team>) => Promise<Team>
}) {
  const logoInputRef = useRef<HTMLInputElement>(null)
  const [step, setStep]           = useState(1)
  const [direction, setDirection] = useState(1)

  const [name, setName]               = useState('')
  const [logoFile, setLogoFile]       = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)

  const [teamType, setTeamType]   = useState<string>('scrim')
  const [features, setFeatures]   = useState<Record<string, boolean>>(getDefaultFeatures('scrim'))
  const [funModes, setFunModes]   = useState<string[]>(['aram', 'chaos_aram', 'arena'])

  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const goTo = (next: number) => {
    setDirection(next > step ? 1 : -1)
    setStep(next)
  }

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  const handleTypeSelect = (type: string) => {
    setTeamType(type)
    setFeatures(getDefaultFeatures(type))
    if (type === 'fun') setFunModes(['aram', 'chaos_aram', 'arena'])
  }

  const toggleFunMode = (id: string) =>
    setFunModes(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id])

  const toggleFeature = (key: string) =>
    setFeatures(prev => ({ ...prev, [key]: !prev[key] }))

  const handleSubmit = async () => {
    if (!name.trim()) return
    setLoading(true)
    setError('')
    try {
      const newTeam = await onCreate(name.trim(), teamType)

      if (logoFile && supabase) {
        const ext  = logoFile.name.split('.').pop() || 'jpg'
        const path = `${newTeam.id}/logo.${ext}`
        const buf  = await logoFile.arrayBuffer()
        const { error: upErr } = await supabase.storage
          .from('team-logos')
          .upload(path, buf, { upsert: true, contentType: logoFile.type })
        if (!upErr) {
          const { data: urlData } = supabase.storage.from('team-logos').getPublicUrl(path)
          await onUpdateTeam(newTeam.id, { logo_url: urlData.publicUrl })
        }
      }

      // Features — graceful fail si la colonne n'existe pas encore en DB
      const finalFeatures = teamType === 'fun'
        ? {
            ...features,
            mode_aram:       funModes.includes('aram'),
            mode_chaos_aram: funModes.includes('chaos_aram'),
            mode_arena:      funModes.includes('arena'),
          }
        : features
      try { await onUpdateTeam(newTeam.id, { features: finalFeatures } as any) } catch (_) { /* noop */ }

      onClose()
    } catch (err) {
      setError('Erreur lors de la création.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const selectedType  = TEAM_TYPES.find(t => t.id === teamType)
  const enabledCount  = Object.values(features).filter(Boolean).length

  return createPortal(
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 12 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        className="bg-dark-card border border-dark-border rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div className="px-6 pt-5 pb-4 border-b border-dark-border/50">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display text-lg font-bold text-white">Nouvelle équipe</h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-dark-bg transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Stepper */}
          <div className="flex items-center">
            {STEP_LABELS.map((label, i) => {
              const n    = i + 1
              const done = n < step
              const active = n === step
              return (
                <div key={n} className="flex items-center flex-1 last:flex-none">
                  <div className={`flex items-center gap-2 transition-opacity ${active ? 'opacity-100' : done ? 'opacity-80' : 'opacity-30'}`}>
                    <motion.div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-colors ${
                        done    ? 'bg-accent-blue border-accent-blue text-white'
                        : active ? 'bg-accent-blue/10 border-accent-blue text-accent-blue'
                        :          'bg-transparent border-gray-700 text-gray-600'
                      }`}
                    >
                      {done ? <Check size={11} strokeWidth={3} /> : n}
                    </motion.div>
                    <span className={`text-xs font-medium whitespace-nowrap ${active ? 'text-white' : 'text-gray-500'}`}>
                      {label}
                    </span>
                  </div>
                  {i < STEP_LABELS.length - 1 && (
                    <div className="flex-1 mx-3">
                      <motion.div
                        className="h-px rounded-full bg-dark-border overflow-hidden"
                      >
                        <motion.div
                          className="h-full bg-accent-blue/50"
                          initial={{ scaleX: 0 }}
                          animate={{ scaleX: done ? 1 : 0 }}
                          style={{ originX: 0 }}
                          transition={{ duration: 0.3 }}
                        />
                      </motion.div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Steps ──────────────────────────────────────────────────────────── */}
        <div className="relative" style={{ minHeight: '340px' }}>
          <AnimatePresence mode="wait" custom={direction}>

            {/* ─ Étape 1 : Identité ─ */}
            {step === 1 && (
              <motion.div
                key="step1"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="px-6 py-7 space-y-6"
              >
                <div className="flex flex-col items-center gap-3">
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => logoInputRef.current?.click()}
                    className={`relative w-24 h-24 rounded-full border-2 border-dashed flex items-center justify-center overflow-hidden transition-colors group ${
                      logoPreview ? 'border-accent-blue/40' : 'border-dark-border bg-dark-bg hover:border-accent-blue/40'
                    }`}
                  >
                    {logoPreview ? (
                      <>
                        <img src={logoPreview} alt="logo" className="w-full h-full object-contain p-2" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                          <Camera size={18} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center gap-1.5 text-gray-600 group-hover:text-gray-400 transition-colors">
                        <Camera size={22} />
                        <span className="text-[10px] font-medium">Logo</span>
                      </div>
                    )}
                  </motion.button>
                  {logoPreview && (
                    <button
                      type="button"
                      onClick={() => { setLogoFile(null); setLogoPreview(null) }}
                      className="text-[11px] text-gray-600 hover:text-red-400 transition-colors"
                    >
                      Retirer le logo
                    </button>
                  )}
                  <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    Nom de l'équipe
                  </label>
                  <input
                    autoFocus
                    type="text"
                    placeholder="Ex : Team ZOB, ShortCut..."
                    value={name}
                    onChange={e => setName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && name.trim()) goTo(2) }}
                    className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-accent-blue/60 transition-colors"
                  />
                </div>
              </motion.div>
            )}

            {/* ─ Étape 2 : Type ─ */}
            {step === 2 && (
              <motion.div
                key="step2"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="px-6 py-6"
              >
                <p className="text-xs text-gray-500 mb-4">
                  Le type définit les fonctionnalités activées par défaut.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {TEAM_TYPES.map(({ id, label, icon: Icon, desc, color, border, bg, glow }) => {
                    const selected = teamType === id
                    return (
                      <motion.button
                        key={id}
                        type="button"
                        onClick={() => handleTypeSelect(id)}
                        whileHover={{ scale: 1.025 }}
                        whileTap={{ scale: 0.975 }}
                        className={`relative flex flex-col items-start gap-3 p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                          selected
                            ? `${border} ${bg} ${glow}`
                            : 'border-dark-border bg-dark-bg/40 hover:border-gray-600 hover:bg-dark-bg/70'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-colors ${
                          selected ? `${bg} ${border}` : 'bg-dark-card border-dark-border'
                        }`}>
                          <Icon size={20} className={selected ? color : 'text-gray-500'} />
                        </div>
                        <div>
                          <p className={`text-sm font-bold leading-tight ${selected ? color : 'text-white'}`}>
                            {label}
                          </p>
                          <p className="text-[11px] text-gray-500 mt-1 leading-snug">{desc}</p>
                        </div>
                        <AnimatePresence>
                          {selected && (
                            <motion.div
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              exit={{ scale: 0, opacity: 0 }}
                              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                              className={`absolute top-2.5 right-2.5 w-5 h-5 rounded-full flex items-center justify-center ${bg} border ${border}`}
                            >
                              <Check size={10} className={color} strokeWidth={3} />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.button>
                    )
                  })}
                </div>

                {/* Modes de jeu — uniquement pour Fun */}
                <AnimatePresence>
                  {teamType === 'fun' && (
                    <motion.div
                      key="fun-modes"
                      initial={{ opacity: 0, height: 0, marginTop: 0 }}
                      animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
                      exit={{ opacity: 0, height: 0, marginTop: 0 }}
                      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="pt-4 border-t border-dark-border/50">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-3">
                          Modes de jeu suivis
                        </p>
                        <div className="grid grid-cols-3 gap-2">
                          {FUN_MODES.map(({ id, label, desc, icon: ModeIcon }) => {
                            const active = funModes.includes(id)
                            return (
                              <motion.button
                                key={id}
                                type="button"
                                onClick={() => toggleFunMode(id)}
                                whileTap={{ scale: 0.97 }}
                                className={`relative flex flex-col items-start gap-2 p-3 rounded-xl border text-left transition-all duration-150 ${
                                  active
                                    ? 'border-pink-400/50 bg-pink-500/10'
                                    : 'border-dark-border/40 bg-dark-bg/30 opacity-50'
                                }`}
                              >
                                <ModeIcon size={15} className={active ? 'text-pink-400' : 'text-gray-600'} />
                                <div>
                                  <p className={`text-xs font-bold leading-tight ${active ? 'text-pink-300' : 'text-gray-500'}`}>
                                    {label}
                                  </p>
                                  <p className="text-[10px] text-gray-600 mt-0.5 leading-snug">{desc}</p>
                                </div>
                                <AnimatePresence>
                                  {active && (
                                    <motion.div
                                      initial={{ scale: 0, opacity: 0 }}
                                      animate={{ scale: 1, opacity: 1 }}
                                      exit={{ scale: 0, opacity: 0 }}
                                      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                                      className="absolute top-2 right-2 w-4 h-4 rounded-full bg-pink-500/20 border border-pink-400/60 flex items-center justify-center"
                                    >
                                      <Check size={9} className="text-pink-400" strokeWidth={3} />
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </motion.button>
                            )
                          })}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {/* ─ Étape 3 : Fonctionnalités ─ */}
            {step === 3 && (
              <motion.div
                key="step3"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="px-6 py-5"
              >
                {/* Badge type sélectionné */}
                {selectedType && (
                  <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold mb-4 ${selectedType.color} ${selectedType.bg} ${selectedType.border}`}>
                    <selectedType.icon size={11} />
                    {selectedType.label} · {enabledCount} fonctionnalité{enabledCount > 1 ? 's' : ''} active{enabledCount > 1 ? 's' : ''}
                  </div>
                )}

                <div className="space-y-5 max-h-[300px] overflow-y-auto pr-1">
                  {FEATURE_GROUPS.map(group => (
                    <div key={group.label}>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-2.5">
                        {group.label}
                      </p>
                      <div className="space-y-1.5">
                        {group.features.map(({ key, label, desc, icon: Icon }) => {
                          const enabled = !!features[key]
                          return (
                            <motion.button
                              key={key}
                              type="button"
                              onClick={() => toggleFeature(key)}
                              whileTap={{ scale: 0.99 }}
                              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all duration-150 ${
                                enabled
                                  ? 'bg-dark-bg border-dark-border'
                                  : 'bg-dark-bg/20 border-dark-border/30'
                              }`}
                            >
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border transition-colors ${
                                enabled
                                  ? 'bg-accent-blue/10 border-accent-blue/30'
                                  : 'bg-dark-card border-dark-border/40'
                              }`}>
                                <Icon size={14} className={enabled ? 'text-accent-blue' : 'text-gray-700'} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`text-xs font-semibold leading-tight transition-colors ${enabled ? 'text-white' : 'text-gray-600'}`}>
                                  {label}
                                </p>
                                <p className="text-[10px] text-gray-600 mt-0.5 truncate">{desc}</p>
                              </div>
                              {/* Toggle switch */}
                              <div className={`shrink-0 w-9 h-5 rounded-full relative transition-colors duration-200 ${enabled ? 'bg-accent-blue' : 'bg-dark-border'}`}>
                                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-200 ${enabled ? 'left-[18px]' : 'left-[2px]'}`} />
                              </div>
                            </motion.button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* ── Footer ─────────────────────────────────────────────────────────── */}
        <div className="px-6 pb-5 pt-3 border-t border-dark-border/50 flex items-center justify-between gap-3">
          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={() => step > 1 ? goTo(step - 1) : onClose()}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-dark-border text-sm text-gray-400 hover:text-white hover:border-gray-600 transition-colors"
          >
            <ChevronLeft size={15} />
            {step === 1 ? 'Annuler' : 'Retour'}
          </motion.button>

          {error && <p className="flex-1 text-xs text-red-400 text-center">{error}</p>}

          {step < 3 ? (
            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={() => goTo(step + 1)}
              disabled={step === 1 && !name.trim()}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-accent-blue text-white text-sm font-semibold disabled:opacity-40 hover:bg-accent-blue/90 transition-colors"
            >
              Suivant
              <ChevronRight size={15} />
            </motion.button>
          ) : (
            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={handleSubmit}
              disabled={loading || !name.trim()}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-accent-blue text-white text-sm font-semibold disabled:opacity-40 hover:bg-accent-blue/90 transition-colors"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Créer l'équipe
            </motion.button>
          )}
        </div>
      </motion.div>
    </div>,
    document.body,
  )
}
