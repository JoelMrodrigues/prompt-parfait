/**
 * TeamContext — singleton qui remplace useTeam() par-instance
 * Un seul fetch Supabase pour toute l'app, partagé entre toutes les pages.
 */
import { createContext, useContext, useState, useEffect, useRef, useMemo, ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'
import { perf } from '../lib/logger'
import {
  createTeam as createTeamQuery,
  updateTeam as updateTeamQuery,
  deleteTeam as deleteTeamQuery,
  getOrCreateInviteToken,
  joinTeamByToken as joinTeamByTokenQuery,
} from '../services/supabase/teamQueries'
import {
  fetchAllTeams,
  upsertProfile,
} from '../services/supabase/profileQueries'
import {
  fetchPlayersByTeam,
  createPlayer as createPlayerQuery,
  updatePlayer as updatePlayerQuery,
  updatePlayerSilent,
  deletePlayer as deletePlayerQuery,
} from '../services/supabase/playerQueries'
import {
  addChampionToPool as addChampionQuery,
  removeChampionFromPool as removeChampionQuery,
} from '../services/supabase/championQueries'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Team {
  id: string
  user_id: string
  team_name: string
  team_type?: string
  logo_url?: string | null
  accent_color?: string | null
  invite_token?: string | null
  created_at?: string
}

export interface Player {
  id: string
  team_id: string
  player_name: string
  pseudo: string
  position: string | null
  rank: string | null
  rank_updated_at?: string | null
  player_type?: 'starter' | 'sub'
  puuid?: string | null
  secondary_account?: string | null
  soloq_mood_last_5?: Record<string, unknown> | null
  team_mood_last_5?: Record<string, unknown> | null
  soloq_total_match_ids?: number | null
  soloq_total_match_ids_secondary?: number | null
  top_champions?: string | unknown[] | null
  champion_pools?: unknown[]
}

export interface TeamContextValue {
  team: Team | null
  allTeams: Team[]
  players: Player[]
  loading: boolean
  createTeam: (teamName: string, teamType?: string) => Promise<Team>
  createNewTeam: (teamName: string, teamType?: string) => Promise<Team>
  switchTeam: (teamId: string) => Promise<void>
  updateTeam: (teamId: string, updates: Partial<Team>) => Promise<Team>
  deleteTeam: (teamId: string) => Promise<void>
  createPlayer: (playerData: Partial<Player>) => Promise<unknown>
  updatePlayer: (playerId: string, updates: Partial<Player>) => Promise<unknown>
  batchUpdatePlayersSilent: (updates: Array<{ id: string; data: Record<string, unknown> }>) => Promise<void>
  deletePlayer: (playerId: string) => Promise<void>
  addChampionToPool: (playerId: string, championId: string, masteryLevel: number) => Promise<unknown>
  removeChampionFromPool: (poolId: string) => Promise<void>
  refetch: () => Promise<void>
  getInviteLink: () => Promise<string | null>
  joinTeamByToken: (token: string) => Promise<{ success: boolean; error?: string; teamName?: string }>
  isTeamOwner: boolean
}

const TeamContext = createContext<TeamContextValue>({} as TeamContextValue)

export const useTeam = () => useContext(TeamContext)

export const TeamProvider = ({ children }: { children: ReactNode }) => {
  const { user, profile, refreshProfile } = useAuth()
  const [team, setTeam] = useState<Team | null>(null)
  const [allTeams, setAllTeams] = useState<Team[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const initializedRef = useRef(false)

  useEffect(() => {
    if (user && supabase) {
      fetchTeam()
    } else {
      setLoading(false)
      if (!user) {
        initializedRef.current = false
        setTeam(null)
        setAllTeams([])
        setPlayers([])
      }
    }
  }, [user, profile?.active_team_id])

  const fetchTeam = async () => {
    if (!supabase) { setLoading(false); return }
    if (!initializedRef.current) setLoading(true)
    perf.start('TeamContext.fetchTeam')
    try {
      perf.start('fetchAllTeams')
      const { data: teamsData, error: teamsError } = await fetchAllTeams(user.id)
      perf.end('fetchAllTeams')
      if (teamsError) {
        setTeam(null); setAllTeams([]); setPlayers([])
        setLoading(false); return
      }

      setAllTeams(teamsData || [])

      let activeTeam = null
      if (profile?.active_team_id) {
        activeTeam = teamsData?.find((t) => t.id === profile.active_team_id) ?? null
      }
      if (!activeTeam && teamsData?.length > 0) {
        activeTeam = teamsData[0]
        if (user && !profile?.active_team_id) {
          await upsertProfile(user.id, { active_team_id: activeTeam.id })
        }
      }

      setTeam(activeTeam)
      if (activeTeam) {
        perf.start('fetchPlayersByTeam')
        const { data: playersData, error: playersError } = await fetchPlayersByTeam(activeTeam.id)
        perf.end('fetchPlayersByTeam')
        if (playersError) throw playersError
        setPlayers(playersData || [])
      } else {
        setPlayers([])
      }
    } catch (error) {
      console.error('[TeamContext] error:', error)
      setTeam(null); setPlayers([])
    } finally {
      initializedRef.current = true
      setLoading(false)
      perf.end('TeamContext.fetchTeam')
    }
  }

  const switchTeam = async (teamId: string) => {
    if (!user) return
    perf.start('switchTeam.upsertProfile')
    await upsertProfile(user.id, { active_team_id: teamId })
    perf.end('switchTeam.upsertProfile')
    perf.start('switchTeam.refreshProfile')
    await refreshProfile()
    perf.end('switchTeam.refreshProfile')
  }

  const createTeam = async (teamName: string, teamType = 'scrim') => {
    const { data, error } = await createTeamQuery(user.id, teamName, teamType)
    if (error) throw error
    await upsertProfile(user.id, { active_team_id: data.id })
    await refreshProfile()
    return data
  }

  const createNewTeam = async (teamName: string, teamType = 'scrim') => createTeam(teamName, teamType)

  const updateTeam = async (teamId: string, updates: Partial<Team>) => {
    const { data, error } = await updateTeamQuery(teamId, updates)
    if (error) throw error
    setTeam(data)
    return data
  }

  const deleteTeam = async (teamId: string) => {
    const { error } = await deleteTeamQuery(teamId)
    if (error) throw error
    // Switch vers une autre équipe si disponible
    const remaining = allTeams.filter((t) => t.id !== teamId)
    if (remaining.length > 0) {
      await upsertProfile(user.id, { active_team_id: remaining[0].id })
    } else {
      await upsertProfile(user.id, { active_team_id: null })
    }
    await refreshProfile()
  }

  const createPlayer = async (playerData: Partial<Player>) => {
    const cleanData = Object.fromEntries(
      Object.entries({ ...playerData, team_id: team.id }).filter(([, v]) => v !== undefined)
    )
    const { data, error } = await createPlayerQuery(cleanData)
    if (error) { console.error('Erreur création joueur:', error); throw error }
    await fetchTeam()
    return data
  }

  const updatePlayer = async (playerId: string, updates: Partial<Player>) => {
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    )
    const onlySoloqTotal = Object.keys(cleanUpdates).every(
      (k) => k === 'soloq_total_match_ids' || k === 'soloq_total_match_ids_secondary'
    )
    if (onlySoloqTotal && Object.keys(cleanUpdates).length > 0) {
      const { error } = await updatePlayerSilent(playerId, cleanUpdates)
      if (error) { console.error('Erreur mise à jour joueur:', error); throw error }
      // Mise à jour locale uniquement — pas de fetchTeam() pour éviter les cascades
      setPlayers(prev => prev.map(p => p.id === playerId ? { ...p, ...cleanUpdates } : p))
      return null
    }
    const { data, error } = await updatePlayerQuery(playerId, cleanUpdates)
    if (error) { console.error('Erreur mise à jour joueur:', error); throw error }
    if (!data || data.length === 0) throw new Error('Joueur non trouvé ou mise à jour échouée')
    // Mise à jour locale O(n) sans roundtrip Supabase supplémentaire
    setPlayers(prev => prev.map(p => p.id === playerId ? { ...p, ...data[0] } : p))
    return data[0]
  }

  // Mise à jour silencieuse groupée — N joueurs, 1 seul setPlayers (évite N re-renders)
  const batchUpdatePlayersSilent = async (updates: Array<{ id: string; data: Record<string, unknown> }>) => {
    if (!updates.length) return
    // Écriture parallèle en DB (silent = pas de setPlayers individuel)
    await Promise.allSettled(updates.map(({ id, data }) => updatePlayerSilent(id, data)))
    // Un seul setPlayers pour tous les joueurs
    setPlayers((prev) =>
      prev.map((p) => {
        const u = updates.find((x) => x.id === p.id)
        return u ? { ...p, ...u.data } : p
      })
    )
  }

  const deletePlayer = async (playerId: string) => {
    const { error } = await deletePlayerQuery(playerId)
    if (error) throw error
    await fetchTeam()
  }

  const addChampionToPool = async (playerId: string, championId: string, masteryLevel: number) => {
    const { data, error } = await addChampionQuery(playerId, championId, masteryLevel)
    if (error) throw error
    await fetchTeam()
    return data
  }

  const removeChampionFromPool = async (poolId: string) => {
    const { error } = await removeChampionQuery(poolId)
    if (error) throw error
    await fetchTeam()
  }

  const getInviteLink = async () => {
    if (!team?.id || !supabase) return null
    try {
      const token = await getOrCreateInviteToken(team.id)
      if (!token) return null
      return `${window.location.origin}/team/join/${token}`
    } catch (e) {
      console.error('getInviteLink', e)
      return null
    }
  }

  const joinTeamByToken = async (token: string) => {
    if (!token || !user || !supabase) return { success: false, error: 'Token ou utilisateur invalide' }
    try {
      const { data, error } = await joinTeamByTokenQuery(token)
      if (error) return { success: false, error: error.message }
      const result = data || {}
      if (!result.success) return { success: false, error: result.error || 'Lien invalide' }
      await fetchTeam()
      return { success: true, teamName: result.team_name }
    } catch (e: unknown) {
      console.error('joinTeamByToken', e)
      return { success: false, error: (e as Error).message }
    }
  }

  const isTeamOwner = !!(team && user && team.user_id === user.id)

  const value = useMemo(() => ({
    team, allTeams, players, loading,
    createTeam, createNewTeam, switchTeam, updateTeam, deleteTeam,
    createPlayer, updatePlayer, batchUpdatePlayersSilent, deletePlayer,
    addChampionToPool, removeChampionFromPool,
    refetch: fetchTeam,
    getInviteLink, joinTeamByToken,
    isTeamOwner,
  }), [team, allTeams, players, loading, isTeamOwner])

  return (
    <TeamContext.Provider value={value}>
      {children}
    </TeamContext.Provider>
  )
}
