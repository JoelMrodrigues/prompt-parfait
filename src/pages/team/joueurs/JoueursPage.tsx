/**
 * Page Joueurs - Gestion des joueurs de l'équipe
 */
import { useState, useEffect, useMemo } from 'react'
import { Plus, RefreshCw } from 'lucide-react'
import { useTeam } from '../hooks/useTeam'
import { useTeamMatches } from '../hooks/useTeamMatches'
import { useToast } from '../../../contexts/ToastContext'
import { PlayerList } from '../components/PlayerList'
import { PlayerModal } from '../components/PlayerModal'
import { ConfirmModal } from '../../../components/common/ConfirmModal'
import { MoodSoloQCard, type MoodRow } from './components/MoodSoloQCard'
import { MoodTeamCard } from './components/MoodTeamCard'
import { fetchSoloqMatches, fetchSoloqChampionStats, upsertSoloqMatches } from '../../../services/supabase/playerQueries'
import { supabase } from '../../../lib/supabase'

const getBackendUrl = () =>
  (import.meta.env.VITE_DPM_API_URL || 'http://localhost:3001').replace(/\/$/, '')
const SEASON_16_START_MS = 1767830400000

export const JoueursPage = () => {
  const { error: toastError, success: toastSuccess } = useToast()
  const { team, players, loading, createPlayer, updatePlayer, deletePlayer, refetch } = useTeam()
  const { matches: teamMatches } = useTeamMatches(team?.id)

  const [showPlayerModal, setShowPlayerModal] = useState(false)
  const [editingPlayer, setEditingPlayer] = useState<any>(null)
  const [confirmDelete, setConfirmDelete] = useState<any>(null)
  const [rankedUpdateLoading, setRankedUpdateLoading] = useState(false)
  const [soloqMood, setSoloqMood] = useState<Record<string, MoodRow>>({})

  useEffect(() => {
    if (!players.length) return
    let cancelled = false
    const load = async () => {
      const next: Record<string, MoodRow> = {}
      await Promise.all(
        players.map(async (p) => {
          const { data: matches } = await fetchSoloqMatches({
            playerId: p.id,
            accountSource: 'primary',
            seasonStart: SEASON_16_START_MS,
            offset: 0,
            limit: 5,
          })
          if (cancelled) return
          const list = (matches || []).filter((m: any) => (m.game_duration || 0) >= 180)
          const wins = list.filter((m: any) => m.win).length
          const losses = list.length - wins
          let kda = '—'
          if (list.length > 0) {
            const tK = list.reduce((s: number, m: any) => s + (m.kills ?? 0), 0)
            const tD = list.reduce((s: number, m: any) => s + (m.deaths ?? 0), 0)
            const tA = list.reduce((s: number, m: any) => s + (m.assists ?? 0), 0)
            kda = tD > 0 ? ((tK + tA) / tD).toFixed(1) : (tK + tA).toFixed(1)
          }
          next[p.id] = { wins, losses, kda, count: list.length }
        })
      )
      if (!cancelled) setSoloqMood(next)
    }
    load()
    return () => { cancelled = true }
  }, [players.map((p) => p.id).join(',')])

  const teamMood = useMemo(() => {
    const list = (teamMatches || []).slice().sort((a: any, b: any) => {
      const ta = new Date(a.created_at || 0).getTime()
      const tb = new Date(b.created_at || 0).getTime()
      return tb - ta
    })
    const byPlayer: Record<string, MoodRow> = {}
    for (const p of players) byPlayer[p.id] = { wins: 0, losses: 0, kda: '—', count: 0 }
    for (const p of players) {
      const participations: { win: boolean; kills: number; deaths: number; assists: number }[] = []
      for (const match of list) {
        const part = (match.team_match_participants || []).find(
          (x: any) => (x.team_side === 'our' || !x.team_side) && x.player_id === p.id
        )
        if (part) participations.push({
          win: !!part.win || !!match.our_win,
          kills: part.kills ?? 0,
          deaths: part.deaths ?? 0,
          assists: part.assists ?? 0,
        })
        if (participations.length >= 5) break
      }
      if (participations.length === 0) continue
      const row = byPlayer[p.id]
      row.count = participations.length
      row.wins = participations.filter((x) => x.win).length
      row.losses = row.count - row.wins
      const tK = participations.reduce((s, x) => s + x.kills, 0)
      const tD = participations.reduce((s, x) => s + x.deaths, 0)
      const tA = participations.reduce((s, x) => s + x.assists, 0)
      row.kda = tD > 0 ? ((tK + tA) / tD).toFixed(1) : (tK + tA).toFixed(1)
    }
    return byPlayer
  }, [teamMatches, players])

  const handleSavePlayer = async (playerData: any) => {
    try {
      if (editingPlayer) {
        await updatePlayer(editingPlayer.id, playerData)
      } else {
        await createPlayer(playerData)
      }
      setShowPlayerModal(false)
      setEditingPlayer(null)
    } catch (error: any) {
      toastError(`Erreur lors de la sauvegarde: ${error.message}`)
    }
  }

  const handleDeletePlayer = async () => {
    if (confirmDelete) {
      await deletePlayer(confirmDelete.id)
      setConfirmDelete(null)
    }
  }

  const hasValidPseudo = (p: any) => {
    const pseudo = (p.pseudo || '').trim()
    return pseudo && (pseudo.includes('#') || pseudo.includes('/'))
  }

  const handleRankedUpdate = async () => {
    const toUpdate = players.filter(hasValidPseudo)
    if (!toUpdate.length) {
      toastError('Aucun joueur avec pseudo (GameName#TagLine)')
      return
    }
    setRankedUpdateLoading(true)
    try {
      for (const player of toUpdate) {
        const res = await fetch(
          `${getBackendUrl()}/api/riot/sync-rank-and-matches?pseudo=${encodeURIComponent(player.pseudo.trim())}`
        )
        const data = await res.json().catch(() => ({}))
        if (!data.success) {
          toastError(`${player.player_name || player.pseudo}: ${data.error || 'Erreur API'}`)
          continue
        }
        const updates: Record<string, unknown> = {}
        if (data.rank != null) updates.rank = data.rank
        if (typeof data.totalMatchIds === 'number') updates.soloq_total_match_ids = data.totalMatchIds
        if (Object.keys(updates).length > 0) {
          await updatePlayer(player.id, updates)
        }
        const s16Matches = Array.isArray(data.matches)
          ? data.matches.filter((m: any) => (m.gameCreation || 0) >= SEASON_16_START_MS)
          : []
        if (s16Matches.length > 0 && supabase) {
          const rows = s16Matches.map((m: any) => ({
            player_id: player.id,
            riot_match_id: m.matchId,
            account_source: 'primary',
            champion_id: m.championId ?? null,
            champion_name: m.championName ?? null,
            opponent_champion: m.opponentChampionName ?? null,
            win: !!m.win,
            kills: m.kills ?? 0,
            deaths: m.deaths ?? 0,
            assists: m.assists ?? 0,
            game_duration: m.gameDuration ?? 0,
            game_creation: m.gameCreation ?? 0,
          }))
          await upsertSoloqMatches(rows)
        }
      }
      await refetch()
      const seasonStart = SEASON_16_START_MS
      for (const player of players) {
        const { data: rows } = await fetchSoloqChampionStats({
          playerId: player.id,
          accountSource: 'primary',
          seasonStart,
        })
        if (!rows?.length) continue
        const byChamp: Record<string, { games: number; wins: number }> = {}
        for (const r of rows) {
          const name = r.champion_name
          if (!name) continue
          if (!byChamp[name]) byChamp[name] = { games: 0, wins: 0 }
          byChamp[name].games++
          if (r.win) byChamp[name].wins++
        }
        const top5 = Object.entries(byChamp)
          .sort((a, b) => b[1].games - a[1].games)
          .slice(0, 5)
          .map(([name, s]) => ({
            name,
            games: s.games,
            winrate: s.games > 0 ? Math.round((s.wins / s.games) * 100) : 0,
          }))
        if (top5.length > 0) {
          await updatePlayer(player.id, { top_champions: top5 })
        }
      }
      await refetch()
      toastSuccess('Ranked Update terminé')
    } catch (e: any) {
      toastError(e?.message || 'Erreur Ranked Update')
    } finally {
      setRankedUpdateLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent-blue" />
      </div>
    )
  }

  if (!team) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <p className="text-gray-400">Créez d'abord une équipe depuis la Vue d'ensemble.</p>
      </div>
    )
  }

  return (
    <div className="max-w-[1600px] mx-auto space-y-5 px-2">
      {/* Header style Overview */}
      <div className="bg-dark-card border border-dark-border rounded-2xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-5">
            {/* Logo équipe — mêmes classes que Vue d'ensemble (bg-white si logo) */}
            <div
              className={`shrink-0 w-20 h-20 rounded-full border-2 flex items-center justify-center overflow-hidden ${
                team.logo_url ? 'border-dark-border bg-white' : 'border-dark-border bg-dark-bg/80'
              }`}
            >
              {team.logo_url ? (
                <img
                  src={team.logo_url}
                  alt={team.team_name}
                  className="w-full h-full object-contain p-1.5"
                />
              ) : (
                <span className="text-2xl font-bold text-gray-600">
                  {(team.team_name || 'E').charAt(0)}
                </span>
              )}
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-white leading-tight">
                {team.team_name}
              </h1>
              <h2 className="font-display text-xl font-semibold text-gray-300 mt-0.5">Joueurs</h2>
              <p className="text-gray-500 text-sm mt-0.5">Gérez les joueurs de votre équipe</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRankedUpdate}
              disabled={rankedUpdateLoading || !players.some(hasValidPseudo)}
              className="flex items-center gap-2 px-4 py-2 bg-dark-bg border border-dark-border rounded-lg hover:border-accent-blue/50 hover:text-accent-blue text-gray-300 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Mettre à jour le rang et le Top 5 champions (basé sur les games chargées)"
            >
              <RefreshCw size={18} className={rankedUpdateLoading ? 'animate-spin' : ''} />
              Ranked Update
            </button>
            <button
              onClick={() => {
                setEditingPlayer(null)
                setShowPlayerModal(true)
              }}
              className="flex items-center gap-2 px-4 py-2 bg-accent-blue hover:bg-accent-blue/90 text-white font-medium rounded-lg transition-colors"
            >
              <Plus size={18} />
              Ajouter un joueur
            </button>
          </div>
        </div>
      </div>

      <PlayerList
        players={players}
        onEdit={(p) => {
          setEditingPlayer(p)
          setShowPlayerModal(true)
        }}
        onDelete={(p) => setConfirmDelete(p)}
      />

      {/* Mood des joueurs — 2 cartes (Solo Q + Team) en dessous des cards joueurs */}
      {players.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <MoodSoloQCard players={players} mood={soloqMood} />
          <MoodTeamCard players={players} mood={teamMood} />
        </div>
      )}

      {showPlayerModal && (
        <PlayerModal
          player={editingPlayer}
          onClose={() => {
            setShowPlayerModal(false)
            setEditingPlayer(null)
          }}
          onSave={handleSavePlayer}
        />
      )}

      {confirmDelete && (
        <ConfirmModal
          title="Supprimer le joueur ?"
          message={`Êtes-vous sûr de vouloir supprimer ${confirmDelete.player_name || confirmDelete.pseudo || 'ce joueur'} ?`}
          onConfirm={handleDeletePlayer}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  )
}
