/**
 * Page Matchs — Vue Blocs (sessions groupées) ou Vue Plate (liste simple)
 * Pour les équipes flex : affiche les parties flex SoloQ multi-joueurs.
 */
import { useState, useMemo, useCallback, useTransition, useEffect } from 'react'
import { LayoutList, FolderOpen, Swords, Trophy, Plus, RefreshCw, Users } from 'lucide-react'
import { useTeam } from '../hooks/useTeam'
import { useTeamMatches } from '../hooks/useTeamMatches'
import { useTeamBlocks } from '../hooks/useTeamBlocks'
import { deleteBlock } from '../../../services/supabase/blockQueries'
import { deleteMatch } from '../../../services/supabase/matchQueries'
import { MatchRow } from './components/MatchRow'
import { BlockCard } from './components/BlockCard'
import { CreateBlockModal } from './components/CreateBlockModal'
import { AssignMatchesModal } from './components/AssignMatchesModal'
import type { TeamMatchBlock } from '../../../types/matchBlocks'
import { fetchMultiPlayerSoloqMatches } from '../../../services/supabase/playerQueries'
import { getChampionImage } from '../../../lib/championImages'
import { SEASON_16_START_MS } from '../../../lib/constants'

type MatchType = 'all' | 'scrim' | 'tournament'
type ViewMode  = 'flat' | 'blocks'

const TYPE_FILTERS: { id: MatchType; label: string; Icon: React.ElementType }[] = [
  { id: 'all',        label: 'Tous',     Icon: LayoutList },
  { id: 'scrim',      label: 'Scrims',   Icon: Swords     },
  { id: 'tournament', label: 'Tournois', Icon: Trophy     },
]

export const MatchsPage = () => {
  const { team, players } = useTeam()
  const isFlexTeam = team?.team_type === 'flex'
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

  const handleDeleteMatch = useCallback(async (matchId: string) => {
    if (!confirm('Supprimer cette partie définitivement ?')) return
    await deleteMatch(matchId)
    refetchMatches()
  }, [refetchMatches])

  const handleRefetch = useCallback(() => {
    refetchMatches()
    refetchBlocks()
  }, [refetchMatches, refetchBlocks])

  if (!team) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <p className="text-gray-400">Créez d'abord une équipe depuis la Vue d'ensemble.</p>
      </div>
    )
  }

  // Flex teams: show multi-player flex match history
  if (isFlexTeam) {
    return (
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="bg-dark-card border border-dark-border rounded-2xl p-5">
          <h2 className="font-display text-2xl font-bold">Parties Flex</h2>
          <p className="text-sm text-gray-400 mt-0.5">Parties où plusieurs joueurs de l'équipe ont joué ensemble en Flex</p>
        </div>
        <FlexMatchesView players={players} />
      </div>
    )
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
          {filtered.map((m) => <MatchRow key={m.id} match={m} onDelete={handleDeleteMatch} />)}
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
              {ungrouped.map((m) => <MatchRow key={m.id} match={m} onDelete={handleDeleteMatch} />)}
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

// ─── Vue Flex — parties multi-joueurs ────────────────────────────────────────

function FlexMatchesView({ players }: { players: any[] }) {
  const [allMatches, setAllMatches] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [minPlayers, setMinPlayers] = useState(2)

  const playerIdsKey = players.map((p) => p.id).join(',')

  useEffect(() => {
    if (!players.length) { setLoading(false); return }
    let cancelled = false
    setLoading(true)
    fetchMultiPlayerSoloqMatches({
      playerIds: players.map((p) => p.id),
      accountSource: 'combined',
      seasonStart: SEASON_16_START_MS,
      queueType: 'flex',
      columns: 'player_id,riot_match_id,win,kills,deaths,assists,champion_name,game_creation,game_duration',
    }).then(({ data }) => {
      if (!cancelled) setAllMatches(data ?? [])
    }).finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [playerIdsKey])

  const playerById = useMemo(() => {
    const map: Record<string, any> = {}
    for (const p of players) map[p.id] = p
    return map
  }, [players])

  const groupedGames = useMemo(() => {
    const map = new Map<string, any[]>()
    for (const m of allMatches) {
      if (!m.riot_match_id) continue
      const arr = map.get(m.riot_match_id)
      if (arr) arr.push(m)
      else map.set(m.riot_match_id, [m])
    }
    return [...map.entries()]
      .filter(([, rows]) => rows.length >= minPlayers)
      .map(([matchId, rows]) => ({
        matchId,
        rows: [...rows].sort((a, b) => {
          const pa = players.findIndex((p) => p.id === a.player_id)
          const pb = players.findIndex((p) => p.id === b.player_id)
          return (pa === -1 ? 99 : pa) - (pb === -1 ? 99 : pb)
        }),
        date: rows[0]?.game_creation ?? 0,
        duration: rows[0]?.game_duration ?? 0,
        win: rows[0]?.win ?? false,
      }))
      .sort((a, b) => b.date - a.date)
  }, [allMatches, minPlayers, players])

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-accent-blue" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filtre min joueurs */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500">Minimum de joueurs ensemble :</span>
        {[2, 3, 4, 5].map((n) => (
          <button
            key={n}
            onClick={() => setMinPlayers(n)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              minPlayers === n
                ? 'bg-accent-blue/20 text-accent-blue border border-accent-blue/30'
                : 'bg-dark-card border border-dark-border text-gray-400 hover:text-white'
            }`}
          >
            <Users size={11} />
            {n}+
          </button>
        ))}
        {groupedGames.length > 0 && (
          <span className="ml-auto text-xs text-gray-500">{groupedGames.length} partie{groupedGames.length > 1 ? 's' : ''}</span>
        )}
      </div>

      {groupedGames.length === 0 ? (
        <div className="bg-dark-card border border-dark-border rounded-2xl p-12 text-center text-gray-400">
          {allMatches.length === 0
            ? 'Aucune partie flex enregistrée. La sync automatique va les charger progressivement.'
            : `Aucune partie avec ${minPlayers}+ joueurs de l'équipe. Réduisez le filtre.`}
        </div>
      ) : (
        <div className="space-y-2">
          {groupedGames.map(({ matchId, rows, date, duration, win }) => {
            const dateStr = date
              ? new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
              : '—'
            const durStr = duration ? `${Math.round(duration / 60)} min` : '—'
            return (
              <div
                key={matchId}
                className={`bg-dark-card border rounded-2xl p-4 flex flex-wrap items-center gap-4 ${
                  win ? 'border-emerald-500/20' : 'border-rose-500/20'
                }`}
              >
                {/* Badge V/D */}
                <span
                  className={`px-3 py-1.5 rounded-xl text-sm font-bold shrink-0 ${
                    win
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                  }`}
                >
                  {win ? 'V' : 'D'}
                </span>

                {/* Date + durée */}
                <div className="shrink-0 text-sm">
                  <p className="text-gray-300">{dateStr}</p>
                  <p className="text-gray-600 text-xs">{durStr}</p>
                </div>

                {/* Joueurs */}
                <div className="flex flex-wrap gap-3 flex-1">
                  {rows.map((row: any) => {
                    const p = playerById[row.player_id]
                    return (
                      <div key={row.player_id} className="flex items-center gap-2">
                        <div className="relative">
                          <img
                            src={getChampionImage(row.champion_name)}
                            alt={row.champion_name ?? ''}
                            className="w-9 h-9 rounded-lg object-cover border border-dark-border"
                          />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-white leading-tight">
                            {p?.player_name ?? '—'}
                          </p>
                          <p className="text-[10px] text-gray-500 font-mono leading-tight">
                            {row.kills}/{row.deaths}/{row.assists}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Nb joueurs badge */}
                <span className="text-xs text-gray-600 shrink-0 tabular-nums">
                  {rows.length}/{players.length}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
