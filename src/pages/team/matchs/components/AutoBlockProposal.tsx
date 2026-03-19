/**
 * Proposition automatique de blocs après import — mode Auto.
 * Affiche les groupes détectés et permet de les créer en un clic.
 */
import { useState } from 'react'
import { Sparkles, Check, ChevronRight } from 'lucide-react'
import { createBlock, assignMatchesToBlock } from '../../../../services/supabase/blockQueries'
import type { DetectedBlock } from '../../../../types/matchBlocks'

interface Props {
  teamId: string
  detected: DetectedBlock[]
  /** Toutes les parties (incluant les nouvelles) pour résoudre game_id → match UUID */
  allMatches: any[]
  onDone: () => void
}

function formatTime(ms: number) {
  return new Date(ms).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

export function AutoBlockProposal({ teamId, detected, allMatches, onDone }: Props) {
  const [names, setNames] = useState<string[]>(detected.map((d) => d.suggestedName))
  const [creating, setCreating] = useState(false)
  const [done, setDone] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  if (!detected.length) return null

  const handleCreate = async () => {
    setCreating(true)
    setErr(null)
    try {
      for (let i = 0; i < detected.length; i++) {
        const d = detected[i]
        const name = names[i]?.trim() || d.suggestedName

        // Résoudre les game_id → UUIDs Supabase
        const matchIds = allMatches
          .filter((m) => d.matchGameIds.includes(Number(m.game_id)))
          .map((m) => m.id as string)

        const { data: block, error: createErr } = await createBlock(teamId, {
          name,
          block_type: 'scrim',
          opponent_name: null,
          format: 'bo3',
          game_count: null,
          notes: null,
          played_at: new Date(d.firstGameAt).toISOString(),
        })
        if (createErr) throw createErr

        if (matchIds.length && block) {
          const { error: assignErr } = await assignMatchesToBlock(matchIds, block.id)
          if (assignErr) throw assignErr
        }
      }
      setDone(true)
      onDone()
    } catch (e: any) {
      setErr(e.message || 'Erreur lors de la création')
    } finally {
      setCreating(false)
    }
  }

  if (done) {
    return (
      <div className="mt-4 p-3 bg-green-500/15 border border-green-500/30 rounded-xl flex items-center gap-2 text-sm text-green-400">
        <Check size={14} />
        {detected.length} bloc{detected.length > 1 ? 's' : ''} créé{detected.length > 1 ? 's' : ''} avec succès.
      </div>
    )
  }

  return (
    <div className="mt-4 p-4 bg-dark-bg/50 border border-accent-blue/20 rounded-xl space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-accent-blue">
        <Sparkles size={14} />
        {detected.length} bloc{detected.length > 1 ? 's' : ''} détecté{detected.length > 1 ? 's' : ''} automatiquement
      </div>

      <div className="space-y-2">
        {detected.map((d, i) => (
          <div key={i} className="bg-dark-card border border-dark-border rounded-xl p-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <input
                type="text"
                value={names[i]}
                onChange={(e) => {
                  const next = [...names]
                  next[i] = e.target.value
                  setNames(next)
                }}
                className="w-full bg-transparent text-sm text-white focus:outline-none"
              />
              <p className="text-xs text-gray-500 mt-0.5">
                {d.matchGameIds.length} partie{d.matchGameIds.length > 1 ? 's' : ''}
                {' · '}{formatTime(d.firstGameAt)} → {formatTime(d.lastGameAt)}
              </p>
            </div>
            <ChevronRight size={14} className="text-gray-600 shrink-0" />
          </div>
        ))}
      </div>

      {err && (
        <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">{err}</p>
      )}

      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={handleCreate}
          disabled={creating}
          className="flex items-center gap-2 px-4 py-2 bg-accent-blue hover:bg-accent-blue/90 text-white rounded-xl text-sm font-medium disabled:opacity-50 transition-colors"
        >
          {creating ? (
            <span className="animate-spin h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full inline-block" />
          ) : (
            <Check size={13} />
          )}
          Créer ces blocs
        </button>
        <button
          onClick={onDone}
          className="px-4 py-2 text-xs text-gray-500 hover:text-gray-300 transition-colors"
        >
          Ignorer
        </button>
      </div>
    </div>
  )
}
