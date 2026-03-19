/**
 * Page Joueurs - Gestion des joueurs de l'équipe
 */
import { useState, useEffect, useMemo, useCallback } from 'react'
import { Plus } from 'lucide-react'
import { useTeam } from '../hooks/useTeam'
import { useTeamMatchesFull } from '../hooks/useTeamMatches'
import { useToast } from '../../../contexts/ToastContext'
import { PlayerList } from '../components/PlayerList'
import { PlayerModal } from '../components/PlayerModal'
import { ConfirmModal } from '../../../components/common/ConfirmModal'
import { MoodSoloQCard, type MoodRow } from './components/MoodSoloQCard'
import { MoodTeamCard } from './components/MoodTeamCard'
import { PlayerStatsComparisonCard, type DetailedStats } from './components/PlayerStatsComparisonCard'
import { fetchMultiPlayerSoloqMatches } from '../../../services/supabase/playerQueries'
import { SEASON_16_START_MS, REMAKE_THRESHOLD_SEC } from '../../../lib/constants'

export const JoueursPage = () => {
  const { error: toastError } = useToast()
  const { team, players, loading, createPlayer, updatePlayer, deletePlayer } = useTeam()
  const { matches: teamMatches } = useTeamMatchesFull(team?.id)

  const [showPlayerModal, setShowPlayerModal] = useState(false)
  const [editingPlayer, setEditingPlayer] = useState<any>(null)
  const [confirmDelete, setConfirmDelete] = useState<any>(null)
  const [soloqMoodFetched, setSoloqMoodFetched] = useState<Record<string, MoodRow>>({})
  const [soloqDetailedStats, setSoloqDetailedStats] = useState<DetailedStats>({})

  // Clé stable : déclenche l'effet uniquement si un joueur est ajouté/supprimé
  // ou si soloq_mood_last_5 passe de null à non-null (données nouvellement disponibles)
  const playersKey = useMemo(
    () => players.map((p) => `${p.id}:${p.soloq_mood_last_5 != null ? '1' : '0'}`).join(','),
    [players]
  )

  // Effet 1 : mood SoloQ (5 dernières parties) — pour les cartes Mood
  // Une seule requête pour tous les joueurs sans cache → pas de N+1
  useEffect(() => {
    if (!players.length) return
    let cancelled = false
    const load = async () => {
      const next: Record<string, MoodRow> = {}
      // Joueurs avec cache : pas de requête
      const cached = players.filter((p) => p.soloq_mood_last_5 && typeof p.soloq_mood_last_5 === 'object')
      for (const p of cached) {
        const m = p.soloq_mood_last_5 as { wins?: number; losses?: number; kda?: string; count?: number }
        next[p.id] = { wins: m.wins ?? 0, losses: m.losses ?? 0, kda: m.kda ?? '—', count: m.count ?? 0 }
      }
      // Joueurs sans cache : une seule requête groupée
      const toFetch = players.filter((p) => !p.soloq_mood_last_5)
      if (toFetch.length > 0) {
        const { data } = await fetchMultiPlayerSoloqMatches({
          playerIds: toFetch.map((p) => p.id),
          accountSource: 'primary',
          seasonStart: SEASON_16_START_MS,
          minDuration: REMAKE_THRESHOLD_SEC,
          columns: 'player_id,win,kills,deaths,assists,game_duration',
        })
        if (cancelled) return
        // Grouper par joueur, prendre les 5 premières (déjà triées desc)
        const byPlayer: Record<string, any[]> = {}
        for (const m of data || []) {
          if (!byPlayer[m.player_id]) byPlayer[m.player_id] = []
          if (byPlayer[m.player_id].length < 5) byPlayer[m.player_id].push(m)
        }
        for (const p of toFetch) {
          const list = byPlayer[p.id] || []
          const wins = list.filter((m) => m.win).length
          const tK = list.reduce((s: number, m: any) => s + (m.kills ?? 0), 0)
          const tD = list.reduce((s: number, m: any) => s + (m.deaths ?? 0), 0)
          const tA = list.reduce((s: number, m: any) => s + (m.assists ?? 0), 0)
          const kda = list.length > 0 ? (tD > 0 ? ((tK + tA) / tD).toFixed(1) : (tK + tA).toFixed(1)) : '—'
          next[p.id] = { wins, losses: list.length - wins, kda, count: list.length }
        }
      }
      if (!cancelled) setSoloqMoodFetched(next)
    }
    load()
    return () => { cancelled = true }
  }, [playersKey])

  // Effet 2 : stats SoloQ complètes — une seule requête pour tous les joueurs
  const playersIdKey = useMemo(() => players.map((p) => p.id).join(','), [players])
  useEffect(() => {
    if (!players.length) return
    let cancelled = false
    const load = async () => {
      const { data } = await fetchMultiPlayerSoloqMatches({
        playerIds: players.map((p) => p.id),
        accountSource: 'primary',
        seasonStart: SEASON_16_START_MS,
        minDuration: REMAKE_THRESHOLD_SEC,
        columns: 'player_id,win,kills,deaths,assists,game_duration,total_damage,gold_earned,match_json',
      })
      if (cancelled) return
      const next: DetailedStats = {}
      for (const m of data || []) {
        const pid = m.player_id
        if (!next[pid]) next[pid] = { k: 0, d: 0, a: 0, wins: 0, count: 0, dmg: 0, gold: 0, durationSec: 0, pinks: 0, winsBlue: 0, gamesBlue: 0, winsRed: 0, gamesRed: 0 }
        next[pid].k += m.kills ?? 0
        next[pid].d += m.deaths ?? 0
        next[pid].a += m.assists ?? 0
        if (m.win) next[pid].wins++
        next[pid].count++
        const getDmg = (): number | null => m.total_damage ?? m.match_json?.totalDamageDealtToChampions ?? null
        const dmg = getDmg()
        if (dmg !== null) {
          next[pid].dmg += dmg
          next[pid].gold += m.gold_earned ?? m.match_json?.goldEarned ?? 0
          next[pid].durationSec += m.game_duration ?? 0
          const teamId = m.match_json?.teamId
          if (teamId === 100) { next[pid].gamesBlue++; if (m.win) next[pid].winsBlue++ }
          else if (teamId === 200) { next[pid].gamesRed++; if (m.win) next[pid].winsRed++ }
        }
      }
      setSoloqDetailedStats(next)
    }
    load()
    return () => { cancelled = true }
  }, [playersIdKey])

  const soloqMood = useMemo(() => {
    const out: Record<string, MoodRow> = { ...soloqMoodFetched }
    for (const p of players) {
      if (p.soloq_mood_last_5 && typeof p.soloq_mood_last_5 === 'object') {
        const m = p.soloq_mood_last_5 as { wins?: number; losses?: number; kda?: string; count?: number }
        out[p.id] = { wins: m.wins ?? 0, losses: m.losses ?? 0, kda: m.kda ?? '—', count: m.count ?? 0 }
      }
    }
    return out
  }, [players, soloqMoodFetched])

  const teamMood = useMemo(() => {
    const byPlayer: Record<string, MoodRow> = {}
    for (const p of players) {
      if (p.team_mood_last_5 && typeof p.team_mood_last_5 === 'object') {
        const m = p.team_mood_last_5 as { wins?: number; losses?: number; kda?: string; count?: number }
        byPlayer[p.id] = { wins: m.wins ?? 0, losses: m.losses ?? 0, kda: m.kda ?? '—', count: m.count ?? 0 }
        continue
      }
      byPlayer[p.id] = { wins: 0, losses: 0, kda: '—', count: 0 }
    }
    const list = (teamMatches || []).slice().sort((a: any, b: any) => {
      const ta = new Date(a.created_at || 0).getTime()
      const tb = new Date(b.created_at || 0).getTime()
      return tb - ta
    })
    for (const p of players) {
      if (byPlayer[p.id]?.count > 0) continue
      const participations: { win: boolean; kills: number; deaths: number; assists: number }[] = []
      for (const match of list) {
        const part = (match.team_match_participants || []).find(
          (x: any) => (x.team_side === 'our' || !x.team_side) && x.player_id === p.id
        )
        if (part) {
          participations.push({
            win: !!part.win || !!match.our_win,
            kills: part.kills ?? 0,
            deaths: part.deaths ?? 0,
            assists: part.assists ?? 0,
          })
          if (participations.length >= 5) break
        }
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

  const teamDetailedStats = useMemo<DetailedStats>(() => {
    const result: DetailedStats = {}
    for (const match of teamMatches || []) {
      const durSec = match.game_duration ?? 0
      for (const p of (match.team_match_participants || [])) {
        if (p.team_side === 'enemy') continue
        if (!p.player_id) continue
        if (!result[p.player_id]) result[p.player_id] = { k: 0, d: 0, a: 0, wins: 0, count: 0, dmg: 0, gold: 0, durationSec: 0, pinks: 0, winsBlue: 0, gamesBlue: 0, winsRed: 0, gamesRed: 0 }
        const isBlue = (match.our_team_id ?? 0) === 100
        result[p.player_id].k += p.kills ?? 0
        result[p.player_id].d += p.deaths ?? 0
        result[p.player_id].a += p.assists ?? 0
        result[p.player_id].wins += p.win ? 1 : 0
        result[p.player_id].dmg += p.total_damage_dealt_to_champions ?? 0
        result[p.player_id].gold += p.gold_earned ?? 0
        result[p.player_id].durationSec += durSec
        result[p.player_id].pinks += p.vision_wards_bought ?? 0
        if (isBlue) { result[p.player_id].gamesBlue++; if (p.win) result[p.player_id].winsBlue++ }
        else        { result[p.player_id].gamesRed++;  if (p.win) result[p.player_id].winsRed++ }
        result[p.player_id].count++
      }
    }
    return result
  }, [teamMatches])

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

  const handleEditPlayer = useCallback((p: any) => {
    setEditingPlayer(p)
    setShowPlayerModal(true)
  }, [])

  const handleRequestDelete = useCallback((p: any) => setConfirmDelete(p), [])

  const handleAddPlayer = useCallback(() => {
    setEditingPlayer(null)
    setShowPlayerModal(true)
  }, [])

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
                  width={80}
                  height={80}
                  loading="lazy"
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
              {(() => {
                const lastSync = players
                  .map((p) => p.rank_updated_at)
                  .filter(Boolean)
                  .sort()
                  .pop()
                if (!lastSync) return null
                return (
                  <p className="text-gray-500 text-xs mt-1">
                    Dernière MAJ rang :{' '}
                    {new Date(lastSync).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                )
              })()}
            </div>
          </div>
          <div className="flex items-center gap-2">
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
        onEdit={handleEditPlayer}
        onDelete={handleRequestDelete}
        onAdd={handleAddPlayer}
      />

      {/* Comparaison des stats moyennes */}
      {players.length > 0 && (
        <PlayerStatsComparisonCard
          players={players}
          teamStats={teamDetailedStats}
          soloqStats={soloqDetailedStats}
        />
      )}

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
