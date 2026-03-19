/**
 * Modal de gestion des parties d'un bloc — ajouter / retirer des parties.
 */
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, Minus, Check } from 'lucide-react'
import { assignMatchesToBlock } from '../../../../services/supabase/blockQueries'
import type { TeamMatchBlock } from '../../../../types/matchBlocks'
import { getChampionImage } from '../../../../lib/championImages'

function ChampionMini({ name }: { name: string }) {
  return (
    <img
      src={getChampionImage(name)}
      alt={name}
      className="w-5 h-5 rounded object-cover border border-dark-border"
    />
  )
}

function MatchMiniRow({ match: m, inBlock, onToggle }: { match: any; inBlock: boolean; onToggle: () => void }) {
  const our = (m.team_match_participants || [])
    .filter((p: any) => p.team_side === 'our' || !p.team_side)
    .slice(0, 5)
  const dateStr = m.game_creation
    ? new Date(m.game_creation).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
    : ''
  const durMin = m.game_duration ? Math.round(m.game_duration / 60) : null

  return (
    <div className={`flex items-center gap-3 p-2.5 rounded-xl border transition-colors ${
      inBlock ? 'border-accent-blue/30 bg-accent-blue/5' : 'border-dark-border bg-dark-bg/30'
    }`}>
      <div className={`shrink-0 w-14 h-7 flex items-center justify-center rounded-lg text-xs font-bold ${
        m.our_win ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'
      }`}>
        {m.our_win ? 'V' : 'D'}
      </div>
      <div className="flex items-center gap-1 flex-1 min-w-0">
        {our.map((p: any, i: number) => p.champion_name && <ChampionMini key={i} name={p.champion_name} />)}
      </div>
      <span className="text-xs text-gray-500 shrink-0">{dateStr}{durMin ? ` · ${durMin}m` : ''}</span>
      <button
        onClick={onToggle}
        className={`shrink-0 p-1 rounded-lg border transition-colors ${
          inBlock
            ? 'border-red-500/30 text-red-400 hover:bg-red-500/10'
            : 'border-accent-blue/30 text-accent-blue hover:bg-accent-blue/10'
        }`}
        title={inBlock ? 'Retirer du bloc' : 'Ajouter au bloc'}
      >
        {inBlock ? <Minus size={13} /> : <Plus size={13} />}
      </button>
    </div>
  )
}

interface Props {
  block: TeamMatchBlock
  allMatches: any[]
  onClose: () => void
  onSaved: () => void
}

export function AssignMatchesModal({ block, allMatches, onClose, onSaved }: Props) {
  // IDs des parties actuellement dans le bloc
  const [assignedIds, setAssignedIds] = useState<Set<string>>(
    () => new Set(allMatches.filter((m) => m.block_id === block.id).map((m) => m.id))
  )
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const toggle = (matchId: string) => {
    setAssignedIds((prev) => {
      const next = new Set(prev)
      if (next.has(matchId)) next.delete(matchId)
      else next.add(matchId)
      return next
    })
  }

  const handleSave = async () => {
    setSaving(true)
    setErr(null)
    try {
      // Parties déjà assignées au bloc
      const originalIds = new Set(allMatches.filter((m) => m.block_id === block.id).map((m) => m.id))

      // À assigner : nouvelles
      const toAdd = [...assignedIds].filter((id) => !originalIds.has(id))
      // À désassigner : retirées
      const toRemove = [...originalIds].filter((id) => !assignedIds.has(id))

      if (toAdd.length) {
        const { error } = await assignMatchesToBlock(toAdd, block.id)
        if (error) throw error
      }
      if (toRemove.length) {
        const { error } = await assignMatchesToBlock(toRemove, null)
        if (error) throw error
      }
      onSaved()
    } catch (e: any) {
      setErr(e.message || 'Erreur')
    } finally {
      setSaving(false)
    }
  }

  // Filtre par type de match cohérent avec le bloc
  const relevantMatches = allMatches.filter((m) => {
    if (block.block_type === 'tournament') return m.match_type === 'tournament'
    if (block.block_type === 'scrim') return !m.match_type || m.match_type === 'scrim'
    return true
  })

  const inBlock = relevantMatches.filter((m) => assignedIds.has(m.id))
  const notInBlock = relevantMatches.filter((m) => !assignedIds.has(m.id))

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
          className="bg-dark-card border border-dark-border rounded-2xl w-full max-w-2xl flex flex-col"
          style={{ maxHeight: 'calc(100vh - 2rem)' }}
        >
          {/* Header */}
          <div className="shrink-0 flex items-center justify-between p-5 border-b border-dark-border">
            <div>
              <h3 className="font-display text-lg font-bold">Gérer les parties</h3>
              <p className="text-xs text-gray-500 mt-0.5">{block.name}</p>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-dark-bg transition-colors">
              <X size={16} />
            </button>
          </div>

          {/* Content */}
          <div className="overflow-y-auto flex-1 min-h-0 p-5">
            <div className="grid grid-cols-2 gap-4">
              {/* Dans le bloc */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                  Dans ce bloc ({inBlock.length})
                </p>
                <div className="space-y-1.5">
                  {inBlock.length === 0 ? (
                    <p className="text-xs text-gray-600 py-4 text-center">Aucune partie</p>
                  ) : (
                    inBlock.map((m) => (
                      <MatchMiniRow key={m.id} match={m} inBlock={true} onToggle={() => toggle(m.id)} />
                    ))
                  )}
                </div>
              </div>

              {/* Disponibles */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                  Disponibles ({notInBlock.length})
                </p>
                <div className="space-y-1.5">
                  {notInBlock.length === 0 ? (
                    <p className="text-xs text-gray-600 py-4 text-center">Tout est déjà assigné</p>
                  ) : (
                    notInBlock.map((m) => (
                      <MatchMiniRow key={m.id} match={m} inBlock={false} onToggle={() => toggle(m.id)} />
                    ))
                  )}
                </div>
              </div>
            </div>

            {err && (
              <p className="mt-3 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">{err}</p>
            )}
          </div>

          {/* Footer */}
          <div className="shrink-0 flex items-center justify-between p-5 border-t border-dark-border">
            <p className="text-xs text-gray-500">{assignedIds.size} partie{assignedIds.size > 1 ? 's' : ''} dans ce bloc</p>
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white rounded-xl border border-dark-border hover:border-gray-600 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2 bg-accent-blue hover:bg-accent-blue/90 text-white rounded-xl text-sm font-medium disabled:opacity-50 transition-colors"
              >
                {saving ? (
                  <span className="animate-spin h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full inline-block" />
                ) : (
                  <Check size={14} />
                )}
                Enregistrer
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )

  return createPortal(modal, document.body)
}
