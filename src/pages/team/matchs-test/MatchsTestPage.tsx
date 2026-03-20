/**
 * MatchsTestPage — reconstruction étape par étape
 * Étape 4 : modals Nouveau bloc / Édition / Suppression / Gestion des parties
 */
import { useState, useMemo, useCallback, useTransition } from 'react'
import { LayoutList, FolderOpen, Swords, Trophy, Plus, RefreshCw } from 'lucide-react'
import { useTeam } from '../hooks/useTeam'
import { useTeamMatches } from '../hooks/useTeamMatches'
import { useTeamBlocks } from '../hooks/useTeamBlocks'
import { deleteBlock } from '../../../services/supabase/blockQueries'
import { MatchRow } from '../matchs/components/MatchRow'
import { BlockCard } from '../matchs/components/BlockCard'
import { CreateBlockModal } from '../matchs/components/CreateBlockModal'
import { AssignMatchesModal } from '../matchs/components/AssignMatchesModal'
import type { TeamMatchBlock } from '../../../types/matchBlocks'

type MatchType = 'all' | 'scrim' | 'tournament'
type ViewMode  = 'flat' | 'blocks'

const TYPE_FILTERS: { id: MatchType; label: string; Icon: React.ElementType }[] = [
  { id: 'all',        label: 'Tous',     Icon: LayoutList },
  { id: 'scrim',      label: 'Scrims',   Icon: Swords     },
  { id: 'tournament', label: 'Tournois', Icon: Trophy     },
]

export const MatchsTestPage = () => {
  const { team } = useTeam()
  const { matches, loading: matchesLoading, refetch: refetchMatches } = useTeamMatches(team?.id)
  const { blocks, refetch: refetchBlocks }                            = useTeamBlocks(team?.id)

  const [filter, setFilter]     = useState<MatchType>('all')
  const [viewMode, setViewMode] = useState<ViewMode>('flat')
  const [, startTransition]     = useTransition()

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editBlock, setEditBlock]             = useState<TeamMatchBlock | null>(null)
  const [assignBlock, setAssignBlock]         = useState<TeamMatchBlock | null>(null)
  const [deletingId, setDeletingId]           = useState<string | null>(null)

  // Matches filtrés
  const filtered = useMemo(() => {
    if (filter === 'all') return matches
    return matches.filter((m) => (m.match_type || 'scrim') === filter)
  }, [matches, filter])

  // Map blockId → matches (O(n))
  const matchesByBlock = useMemo(() => {
    const map = new Map<string, any[]>()
    for (const m of filtered) {
      if (m.block_id) {
        const arr = map.get(m.block_id)
        if (arr) arr.push(m)
        else map.set(m.block_id, [m])
      }
    }
    return map
  }, [filtered])

  // Blocs visibles selon le filtre
  const visibleBlocks = useMemo(() => {
    return blocks.filter((b) => {
      if (filter === 'scrim')      return b.block_type !== 'tournament'
      if (filter === 'tournament') return b.block_type === 'tournament'
      return true
    })
  }, [blocks, filter])

  // Parties sans bloc
  const ungrouped = useMemo(
    () => filtered.filter((m) => !m.block_id),
    [filtered]
  )

  const handleDelete = useCallback(async (block: TeamMatchBlock) => {
    if (!confirm(`Supprimer le bloc "${block.name}" ? Les parties seront conservées.`)) return
    setDeletingId(block.id)
    await deleteBlock(block.id)
    setDeletingId(null)
    refetchBlocks()
    refetchMatches()
  }, [refetchBlocks, refetchMatches])

  const handleRefetch = useCallback(() => {
    refetchMatches()
    refetchBlocks()
  }, [refetchMatches, refetchBlocks])

  if (!team) {
    return <div className="text-gray-400 text-center py-12">Aucune équipe sélectionnée.</div>
  }

  return (
    <div className="max-w-5xl mx-auto space-y-4">

      {/* Header */}
      <div className="bg-dark-card border border-dark-border rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold">Matchs</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            {matches.length} partie{matches.length !== 1 ? 's' : ''}
            {viewMode === 'blocks' && blocks.length > 0 && ` · ${blocks.length} bloc${blocks.length > 1 ? 's' : ''}`}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Toggle Blocs / Plate */}
          <div className="flex items-center bg-dark-bg border border-dark-border rounded-xl p-1 gap-1">
            {(['blocks', 'flat'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => startTransition(() => setViewMode(mode))}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  viewMode === mode
                    ? 'bg-accent-blue/20 text-accent-blue border border-accent-blue/30'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {mode === 'blocks' ? <FolderOpen size={13} /> : <LayoutList size={13} />}
                {mode === 'blocks' ? 'Blocs' : 'Plate'}
              </button>
            ))}
          </div>

          {/* Filtre type */}
          <div className="flex items-center bg-dark-bg border border-dark-border rounded-xl p-1 gap-1">
            {TYPE_FILTERS.map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => startTransition(() => setFilter(id))}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filter === id
                    ? 'bg-accent-blue/20 text-accent-blue border border-accent-blue/30'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Icon size={13} />
                {label}
              </button>
            ))}
          </div>

          {/* Nouveau bloc */}
          {viewMode === 'blocks' && (
            <button
              onClick={() => setCreateModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-accent-blue hover:bg-accent-blue/90 text-white rounded-xl text-sm font-medium transition-colors"
            >
              <Plus size={14} />
              Nouveau bloc
            </button>
          )}

          {/* Refresh */}
          <button
            onClick={handleRefetch}
            disabled={matchesLoading}
            className="p-2 bg-dark-bg border border-dark-border rounded-xl hover:border-accent-blue/50 transition-colors disabled:opacity-50"
            title="Actualiser"
          >
            <RefreshCw size={16} className={matchesLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Contenu */}
      {matchesLoading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-accent-blue" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-dark-card border border-dark-border rounded-2xl p-12 text-center text-gray-400">
          {matches.length === 0 ? 'Aucune partie importée.' : 'Aucune partie dans cette catégorie.'}
        </div>
      ) : viewMode === 'flat' ? (

        /* ── Vue Plate ─────────────────────────────────────────── */
        <div className="space-y-3">
          {filtered.map((m) => <MatchRow key={m.id} match={m} />)}
        </div>

      ) : (

        /* ── Vue Blocs ─────────────────────────────────────────── */
        <div className="space-y-4">
          {visibleBlocks.map((block) => (
            <BlockCard
              key={block.id}
              block={block}
              matches={matchesByBlock.get(block.id) ?? []}
              onEdit={setEditBlock}
              onDelete={handleDelete}
              onManageMatches={setAssignBlock}
            />
          ))}

          {/* Parties non groupées */}
          {ungrouped.length > 0 && (
            <div className="space-y-3">
              {visibleBlocks.length > 0 && (
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-px bg-dark-border/40" />
                  <span className="text-xs text-gray-600 px-2">
                    {ungrouped.length} partie{ungrouped.length > 1 ? 's' : ''} non groupée{ungrouped.length > 1 ? 's' : ''}
                  </span>
                  <div className="flex-1 h-px bg-dark-border/40" />
                </div>
              )}
              {ungrouped.map((m) => <MatchRow key={m.id} match={m} />)}
            </div>
          )}
        </div>

      )}

      {/* Modals */}
      {(createModalOpen || editBlock) && team && (
        <CreateBlockModal
          teamId={team.id}
          editBlock={editBlock ?? undefined}
          onClose={() => { setCreateModalOpen(false); setEditBlock(null) }}
          onSaved={() => {
            setCreateModalOpen(false)
            setEditBlock(null)
            refetchBlocks()
            refetchMatches()
          }}
        />
      )}

      {assignBlock && (
        <AssignMatchesModal
          block={assignBlock}
          allMatches={matches}
          onClose={() => setAssignBlock(null)}
          onSaved={() => {
            setAssignBlock(null)
            refetchMatches()
            refetchBlocks()
          }}
        />
      )}

    </div>
  )
}
