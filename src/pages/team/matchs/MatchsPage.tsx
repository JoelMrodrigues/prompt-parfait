/**
 * Page Matchs — Vue Blocs (sessions groupées) ou Vue Plate (liste simple)
 */
import { useState } from 'react'
import { RefreshCw, FileJson, Swords, Trophy, LayoutList, FolderOpen, Plus, Trash2 } from 'lucide-react'
import { useTeam } from '../hooks/useTeam'
import { useTeamMatches } from '../hooks/useTeamMatches'
import { useTeamBlocks } from '../hooks/useTeamBlocks'
import { deleteBlock } from '../../../services/supabase/blockQueries'
import { MatchRow } from './components/MatchRow'
import { BlockCard } from './components/BlockCard'
import { CreateBlockModal } from './components/CreateBlockModal'
import { AssignMatchesModal } from './components/AssignMatchesModal'
import type { TeamMatchBlock } from '../../../types/matchBlocks'

type MatchType  = 'all' | 'scrim' | 'tournament'
type ViewMode   = 'blocks' | 'flat'

const TYPE_FILTERS: { id: MatchType; label: string; Icon: React.ElementType }[] = [
  { id: 'all',        label: 'Tous',     Icon: LayoutList },
  { id: 'scrim',      label: 'Scrims',   Icon: Swords     },
  { id: 'tournament', label: 'Tournois', Icon: Trophy     },
]

export const MatchsPage = () => {
  const { team } = useTeam()
  const { matches, loading: matchesLoading, refetch: refetchMatches } = useTeamMatches(team?.id)
  const { blocks, loading: blocksLoading, refetch: refetchBlocks } = useTeamBlocks(team?.id)

  const [filter, setFilter]     = useState<MatchType>('all')
  const [viewMode, setViewMode] = useState<ViewMode>('blocks')

  // Modals
  const [createModalOpen, setCreateModalOpen]     = useState(false)
  const [editBlock, setEditBlock]                 = useState<TeamMatchBlock | null>(null)
  const [assignBlock, setAssignBlock]             = useState<TeamMatchBlock | null>(null)
  const [deletingId, setDeletingId]               = useState<string | null>(null)

  if (!team) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <p className="text-gray-400">Créez d'abord une équipe depuis la Vue d'ensemble.</p>
      </div>
    )
  }

  // ── Filtrage ─────────────────────────────────────────────────────────────
  const filtered = matches.filter((m) => {
    if (filter === 'all') return true
    return (m.match_type || 'scrim') === filter
  })

  const loading = matchesLoading || blocksLoading

  // ── Helpers blocs ─────────────────────────────────────────────────────────
  const matchesForBlock = (blockId: string) => filtered.filter((m) => m.block_id === blockId)
  const ungrouped = filtered.filter((m) => !m.block_id)

  const visibleBlocks = blocks.filter((b) => {
    if (filter === 'scrim')      return b.block_type !== 'tournament'
    if (filter === 'tournament') return b.block_type === 'tournament'
    return true
  }).filter((b) => matchesForBlock(b.id).length > 0 || viewMode === 'blocks')

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleDelete = async (block: TeamMatchBlock) => {
    if (!confirm(`Supprimer le bloc "${block.name}" ? Les parties seront conservées mais non groupées.`)) return
    setDeletingId(block.id)
    await deleteBlock(block.id)
    setDeletingId(null)
    refetchBlocks()
    refetchMatches()
  }

  const handleRefetch = () => {
    refetchMatches()
    refetchBlocks()
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-dark-card border border-dark-border rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {team.logo_url && (
            <img
              src={team.logo_url}
              alt={team.team_name}
              className="w-12 h-12 rounded-xl object-cover border border-dark-border"
            />
          )}
          <div>
            <h2 className="font-display text-2xl font-bold">Matchs</h2>
            <p className="text-sm text-gray-400 mt-0.5">
              {matches.length} partie{matches.length !== 1 ? 's' : ''}
              {viewMode === 'blocks' && blocks.length > 0 ? ` · ${blocks.length} bloc${blocks.length > 1 ? 's' : ''}` : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Vue toggle */}
          <div className="flex items-center bg-dark-bg border border-dark-border rounded-xl p-1 gap-1">
            <button
              onClick={() => setViewMode('blocks')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'blocks'
                  ? 'bg-accent-blue/20 text-accent-blue border border-accent-blue/30'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <FolderOpen size={13} />
              Blocs
            </button>
            <button
              onClick={() => setViewMode('flat')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'flat'
                  ? 'bg-accent-blue/20 text-accent-blue border border-accent-blue/30'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <LayoutList size={13} />
              Plate
            </button>
          </div>

          {/* Filtre type */}
          <div className="flex items-center bg-dark-bg border border-dark-border rounded-xl p-1 gap-1">
            {TYPE_FILTERS.map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => setFilter(id)}
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
            disabled={loading}
            className="p-2 bg-dark-bg border border-dark-border rounded-xl hover:border-accent-blue/50 transition-colors disabled:opacity-50"
            title="Actualiser"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Contenu */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-accent-blue" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-dark-card border border-dark-border rounded-2xl p-12 text-center">
          <FileJson size={48} className="mx-auto text-gray-500 mb-4" />
          <p className="text-gray-300 font-medium mb-1">
            {matches.length === 0 ? 'Aucune partie importée' : 'Aucune partie dans cette catégorie'}
          </p>
          <p className="text-gray-500 text-sm">
            {matches.length === 0
              ? 'Importez vos parties depuis Import dans le menu.'
              : 'Essayez un autre filtre.'}
          </p>
        </div>
      ) : viewMode === 'flat' ? (
        /* ── Vue Plate ─────────────────────────────────────────────── */
        <div className="space-y-3">
          {filtered.map((m) => <MatchRow key={m.id} match={m} />)}
        </div>
      ) : (
        /* ── Vue Blocs ─────────────────────────────────────────────── */
        <div className="space-y-4">
          {/* Blocs */}
          {visibleBlocks.map((block) => (
            <BlockCard
              key={block.id}
              block={block}
              matches={matchesForBlock(block.id)}
              onEdit={setEditBlock}
              onDelete={handleDelete}
              onManageMatches={setAssignBlock}
            />
          ))}

          {/* Blocs vides (si aucune partie après filtre) */}
          {blocks
            .filter((b) => matchesForBlock(b.id).length === 0)
            .filter((b) => {
              if (filter === 'scrim')      return b.block_type !== 'tournament'
              if (filter === 'tournament') return b.block_type === 'tournament'
              return true
            })
            .map((block) => (
              <div
                key={block.id}
                className="rounded-2xl border border-dark-border/50 bg-dark-card/40 p-4 flex items-center gap-3 opacity-60"
              >
                {block.block_type === 'tournament'
                  ? <Trophy size={14} className="text-amber-400 shrink-0" />
                  : <Swords size={14} className="text-violet-400 shrink-0" />
                }
                <span className="text-sm text-gray-400 flex-1">{block.name}</span>
                <span className="text-xs text-gray-600">Bloc vide</span>
                <button
                  onClick={() => setAssignBlock(block)}
                  className="text-xs text-accent-blue hover:underline"
                >
                  Ajouter des parties
                </button>
                <button
                  onClick={() => handleDelete(block)}
                  disabled={deletingId === block.id}
                  className="p-1 rounded text-gray-600 hover:text-red-400 transition-colors"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))
          }

          {/* Parties non groupées */}
          {ungrouped.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex-1 h-px bg-dark-border/40" />
                <span className="text-xs text-gray-600 px-2">
                  {ungrouped.length} partie{ungrouped.length > 1 ? 's' : ''} non groupée{ungrouped.length > 1 ? 's' : ''}
                </span>
                <div className="flex-1 h-px bg-dark-border/40" />
              </div>
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
