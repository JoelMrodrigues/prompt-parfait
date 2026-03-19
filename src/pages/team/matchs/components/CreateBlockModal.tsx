import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Swords, Trophy, Layers, Check } from 'lucide-react'
import { createBlock, updateBlock, assignMatchesToBlock } from '../../../../services/supabase/blockQueries'
import type { TeamMatchBlock, BlockType, BlockFormat, CreateBlockPayload } from '../../../../types/matchBlocks'

interface Props {
  teamId: string
  onClose: () => void
  onSaved: (block: TeamMatchBlock) => void
  initialData?: Partial<CreateBlockPayload>
  /** Si fourni, ces parties seront assignées au bloc créé */
  prefillMatchIds?: string[]
  /** Si fourni → mode édition */
  editBlock?: TeamMatchBlock
}

const BLOCK_TYPES: { id: BlockType; label: string; Icon: React.ElementType; color: string }[] = [
  { id: 'scrim',      label: 'Scrim',     Icon: Swords,  color: 'text-violet-400 border-violet-500/40 bg-violet-500/10' },
  { id: 'tournament', label: 'Tournoi',   Icon: Trophy,  color: 'text-amber-400  border-amber-500/40  bg-amber-500/10'  },
  { id: 'other',      label: 'Autre',     Icon: Layers,  color: 'text-gray-400   border-dark-border   bg-dark-bg'       },
]

const FORMATS: { id: BlockFormat; label: string }[] = [
  { id: 'bo1', label: 'BO1' },
  { id: 'bo3', label: 'BO3' },
  { id: 'bo5', label: 'BO5' },
  { id: 'custom', label: 'Autre' },
]

export function CreateBlockModal({ teamId, onClose, onSaved, initialData, prefillMatchIds, editBlock }: Props) {
  const isEdit = !!editBlock

  const [name, setName]             = useState(editBlock?.name ?? initialData?.name ?? '')
  const [blockType, setBlockType]   = useState<BlockType>(editBlock?.block_type ?? initialData?.block_type ?? 'scrim')
  const [opponentName, setOpponent] = useState(editBlock?.opponent_name ?? initialData?.opponent_name ?? '')
  const [format, setFormat]         = useState<BlockFormat>(editBlock?.format ?? initialData?.format ?? 'bo3')
  const [gameCount, setGameCount]   = useState<string>(String(editBlock?.game_count ?? initialData?.game_count ?? ''))
  const [notes, setNotes]           = useState(editBlock?.notes ?? initialData?.notes ?? '')
  const [saving, setSaving]         = useState(false)
  const [err, setErr]               = useState<string | null>(null)

  // Auto-fill name placeholder when opponent changes
  useEffect(() => {
    if (name === '' && opponentName) setName(`Scrim VS ${opponentName}`)
  }, [opponentName])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { setErr('Le nom est requis.'); return }
    setSaving(true)
    setErr(null)

    const payload: CreateBlockPayload = {
      name: name.trim(),
      block_type: blockType,
      opponent_name: opponentName.trim() || null,
      format,
      game_count: format === 'custom' && gameCount ? parseInt(gameCount, 10) : null,
      notes: notes.trim() || null,
    }

    try {
      let savedBlock: TeamMatchBlock | null = null
      if (isEdit) {
        const { error } = await updateBlock(editBlock!.id, payload)
        if (error) throw error
        savedBlock = { ...editBlock!, ...payload }
      } else {
        const { data, error } = await createBlock(teamId, payload)
        if (error) throw error
        savedBlock = data!
      }

      // Assigner les parties si fournies
      if (!isEdit && prefillMatchIds?.length && savedBlock) {
        await assignMatchesToBlock(prefillMatchIds, savedBlock.id)
      }

      onSaved(savedBlock!)
    } catch (e: any) {
      setErr(e.message || 'Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  const modal = (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.15 }}
          className="bg-dark-card border border-dark-border rounded-2xl w-full max-w-md flex flex-col"
          style={{ maxHeight: 'calc(100vh - 2rem)' }}
        >
          {/* Header */}
          <div className="shrink-0 flex items-center justify-between p-5 border-b border-dark-border">
            <h3 className="font-display text-lg font-bold">
              {isEdit ? 'Modifier le bloc' : 'Nouveau bloc'}
            </h3>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-dark-bg transition-colors">
              <X size={16} />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 min-h-0 p-5 space-y-4">
            {/* Type */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Type</label>
              <div className="flex gap-2">
                {BLOCK_TYPES.map(({ id, label, Icon, color }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setBlockType(id)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border text-sm font-medium transition-colors ${
                      blockType === id ? color : 'border-dark-border text-gray-500 bg-dark-bg hover:text-gray-300'
                    }`}
                  >
                    <Icon size={13} />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Nom */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                Nom <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Scrim VS T1, Worlds Qualifier…"
                className="w-full bg-dark-bg border border-dark-border rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-accent-blue/60"
              />
            </div>

            {/* Adversaire */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Adversaire</label>
              <input
                type="text"
                value={opponentName}
                onChange={(e) => setOpponent(e.target.value)}
                placeholder="T1, Gen.G, aucun…"
                className="w-full bg-dark-bg border border-dark-border rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-accent-blue/60"
              />
            </div>

            {/* Format */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Format</label>
              <div className="flex gap-2">
                {FORMATS.map(({ id, label }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setFormat(id)}
                    className={`flex-1 py-2 rounded-xl border text-sm font-medium transition-colors ${
                      format === id
                        ? 'border-accent-blue/50 bg-accent-blue/15 text-accent-blue'
                        : 'border-dark-border text-gray-500 bg-dark-bg hover:text-gray-300'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {format === 'custom' && (
                <input
                  type="number"
                  min={1}
                  max={99}
                  value={gameCount}
                  onChange={(e) => setGameCount(e.target.value)}
                  placeholder="Nombre de parties"
                  className="mt-2 w-full bg-dark-bg border border-dark-border rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-accent-blue/60"
                />
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Objectifs, contexte, résultat…"
                className="w-full bg-dark-bg border border-dark-border rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-accent-blue/60 resize-none"
              />
            </div>

            {prefillMatchIds?.length ? (
              <p className="text-xs text-gray-500">
                {prefillMatchIds.length} partie{prefillMatchIds.length > 1 ? 's' : ''} seront assignées à ce bloc.
              </p>
            ) : null}

            {err && (
              <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">{err}</p>
            )}
          </form>

          {/* Footer */}
          <div className="shrink-0 flex items-center justify-end gap-3 p-5 border-t border-dark-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-400 hover:text-white rounded-xl border border-dark-border hover:border-gray-600 transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleSubmit as any}
              disabled={saving || !name.trim()}
              className="flex items-center gap-2 px-5 py-2 bg-accent-blue hover:bg-accent-blue/90 text-white rounded-xl text-sm font-medium disabled:opacity-50 transition-colors"
            >
              {saving ? (
                <span className="animate-spin h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full inline-block" />
              ) : (
                <Check size={14} />
              )}
              {isEdit ? 'Enregistrer' : 'Créer le bloc'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )

  return createPortal(modal, document.body)
}
