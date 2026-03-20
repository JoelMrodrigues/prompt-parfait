/**
 * Carte de bloc — dossier dépliable contenant une session de parties.
 * Animation CSS pure (grid-template-rows) — pas de Framer Motion pour éviter
 * l'overhead JS sur chaque re-render de la liste.
 */
import { useState, memo } from 'react'
import { ChevronDown, ChevronUp, Swords, Trophy, Layers, Pencil, Trash2, Settings2, BarChart2 } from 'lucide-react'
import type { TeamMatchBlock, BlockFormat } from '../../../../types/matchBlocks'
import { MatchRow } from './MatchRow'
import { BlockStats } from './BlockStats'

const FORMAT_LABEL: Record<BlockFormat, string> = {
  bo1: 'BO1', bo3: 'BO3', bo5: 'BO5', custom: 'Custom',
}

function BlockTypeIcon({ type }: { type: string }) {
  if (type === 'tournament') return <Trophy size={14} className="text-amber-400" />
  if (type === 'other') return <Layers size={14} className="text-gray-400" />
  return <Swords size={14} className="text-violet-400" />
}

function FormatBadge({ format, gameCount }: { format: BlockFormat; gameCount: number | null }) {
  const label = format === 'custom' && gameCount ? `${gameCount} games` : FORMAT_LABEL[format]
  return (
    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-dark-bg border border-dark-border text-gray-400">
      {label}
    </span>
  )
}

function RecordBadge({ wins, losses }: { wins: number; losses: number }) {
  const total = wins + losses
  if (!total) return null
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${
      wins > losses ? 'text-green-400 bg-green-500/10' :
      losses > wins ? 'text-red-400 bg-red-500/10' :
      'text-gray-400 bg-dark-bg'
    }`}>
      {wins}W – {losses}L
    </span>
  )
}

interface BlockCardProps {
  block: TeamMatchBlock
  matches: any[]
  onEdit: (block: TeamMatchBlock) => void
  onDelete: (block: TeamMatchBlock) => void
  onManageMatches: (block: TeamMatchBlock) => void
}

/** CSS grid trick : grid-template-rows 0fr→1fr pour expand/collapse sans JS animation */
const collapseStyle = (open: boolean): React.CSSProperties => ({
  display: 'grid',
  gridTemplateRows: open ? '1fr' : '0fr',
  transition: 'grid-template-rows 200ms ease',
})

export const BlockCard = memo(function BlockCard({ block, matches, onEdit, onDelete, onManageMatches }: BlockCardProps) {
  const [open, setOpen] = useState(false)
  const [showStats, setShowStats] = useState(false)

  const wins = matches.filter((m) => m.our_win).length
  const losses = matches.length - wins

  const firstDate = matches.length
    ? new Date(Math.min(...matches.map((m) => m.game_creation ?? Infinity))).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
    : null
  const lastDate = matches.length > 1
    ? new Date(Math.max(...matches.map((m) => m.game_creation ?? 0))).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
    : null

  const typeColor =
    block.block_type === 'tournament' ? 'border-amber-500/25 bg-amber-500/5' :
    block.block_type === 'scrim'      ? 'border-violet-500/20 bg-violet-500/5' :
                                        'border-dark-border bg-dark-card'

  return (
    <div className={`rounded-2xl border ${typeColor}`}>
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 p-4">
        {/* Zone cliquable principale (tout sauf les boutons d'action) */}
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-3 flex-1 min-w-0 text-left"
        >
          {/* Chevron */}
          <span className="p-1.5 rounded-lg hover:bg-dark-bg/80 transition-colors shrink-0">
            {open ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
          </span>

          {/* Icône type */}
          <BlockTypeIcon type={block.block_type} />

          {/* Nom + adversaire */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm text-white truncate">{block.name}</span>
              {block.opponent_name && (
                <span className="text-xs text-gray-500">VS {block.opponent_name}</span>
              )}
            </div>
            {(firstDate || matches.length > 0) && (
              <p className="text-[10px] text-gray-600 mt-0.5">
                {matches.length} partie{matches.length > 1 ? 's' : ''}
                {firstDate ? ` · ${firstDate}${lastDate && lastDate !== firstDate ? ` → ${lastDate}` : ''}` : ''}
              </p>
            )}
          </div>

          {/* Format + Bilan */}
          <div className="flex items-center gap-2 shrink-0">
            <FormatBadge format={block.format} gameCount={block.game_count} />
            <RecordBadge wins={wins} losses={losses} />
          </div>
        </button>

        {/* Actions (hors zone cliquable) */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onManageMatches(block)}
            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-200 hover:bg-dark-bg/80 transition-colors"
            title="Gérer les parties"
          >
            <Settings2 size={14} />
          </button>
          <button
            onClick={() => onEdit(block)}
            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-200 hover:bg-dark-bg/80 transition-colors"
            title="Modifier"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={() => onDelete(block)}
            className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            title="Supprimer le bloc"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Notes */}
      {block.notes && (
        <div className="px-4 pb-3">
          <p className="text-xs text-gray-500 italic">{block.notes}</p>
        </div>
      )}

      {/* ── Body dépliable (CSS grid, zéro JS d'animation) ─────────── */}
      <div style={collapseStyle(open)}>
        <div style={{ minHeight: 0, overflow: 'hidden' }}>
          <div className="px-4 pb-4 border-t border-dark-border/40 pt-3 space-y-2">
            {matches.length === 0 ? (
              <p className="text-xs text-gray-600 text-center py-4">
                Aucune partie — utilisez{' '}
                <button onClick={() => onManageMatches(block)} className="underline text-accent-blue">Gérer les parties</button>
                .
              </p>
            ) : (
              <>
                {matches.map((m) => <MatchRow key={m.id} match={m} compact />)}

                {/* Toggle stats */}
                <button
                  onClick={() => setShowStats((v) => !v)}
                  className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors pt-1"
                >
                  <BarChart2 size={12} />
                  {showStats ? 'Masquer les stats' : 'Voir les stats du bloc'}
                  {showStats ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                </button>

                {/* Stats (CSS grid collapse aussi) */}
                <div style={collapseStyle(showStats)}>
                  <div style={{ minHeight: 0, overflow: 'hidden' }}>
                    <BlockStats matches={matches} />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
})
