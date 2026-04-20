/**
 * TeamContext — singleton qui remplace useTeam() par-instance
 * Un seul fetch Supabase pour toute l'app, partagé entre toutes les pages.
 */
import { createContext, useContext, useState, useEffect, useRef, useMemo, ReactNode } from 'react'
import { supabase, normalizeStorageUrl } from '../lib/supabase'
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
  logo_bg_color?: string | null
  invite_token?: string | null
  created_at?: string
  lp_goal?: number | null
  lp_goal_deadline?: string | null
  member_count?: number
  features?: Record<string, boolean> | null
}

export type TeamRole = 'owner' | 'co_owner' | 'player' | 'coach' | 'analyst' | 'manager' | 'spectateur'

export interface Player {
  id: string
  team_id: string
  player_name: string
  pseudo: string
  position: string | null
  rank: string | null
  rank_secondary?: string | null
  rank_updated_at?: string | null
  rank_flex?: string | null
  rank_flex_updated_at?: string | null
  peak_lp_s16?: number | null
  peak_rank_s16?: string | null
  peak_lp_s16_secondary?: number | null
  peak_rank_s16_secondary?: string | null
  peak_lp_flex_s16?: number | null
  peak_rank_flex_s16?: string | null
  player_type?: 'starter' | 'sub'
  puuid?: string | null
  puuid_secondary?: string | null
  secondary_account?: string | null
  soloq_mood_last_5?: Record<string, unknown> | null
  team_mood_last_5?: Record<string, unknown> | null
  soloq_total_match_ids?: number | null
  soloq_total_match_ids_secondary?: number | null
  soloq_total_match_ids_flex?: number | null
  top_champions?: string | unknown[] | null
  champion_pools?: unknown[]
  opgg_link?: string | null
  lolpro_link?: string | null
  region?: string | null
  coaching_public?: boolean | null
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
  joinTeamByToken: (token: string, role?: string, position?: string | null, playerId?: string | null) => Promise<{ success: boolean; error?: string; teamName?: string }>
  isTeamOwner: boolean
  myRole: TeamRole | null
  myPlayerId: string | null
  isCoOwner: boolean
  canManageTeam: boolean  // owner or co_owner
}

const TeamContext = createContext<TeamContextValue>({} as TeamContextValue)

export const useTeam = () => useContext(TeamContext)

export const TeamProvider = ({ children }: { children: ReactNode }) => {
  const { user, profile, isAdmin, refreshProfile, loading: authLoading } = useAuth()
  const [team, setTeam] = useState<Team | null>(null)
  const [allTeams, setAllTeams] = useState<Team[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [myRole, setMyRole] = useState<TeamRole | null>(null)
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null)
  const initializedRef = useRef(false)
  const fetchingRef   = useRef(false)
  const lastParamsRef = useRef<string>('')
  const isAdminRef    = useRef(isAdmin)
  isAdminRef.current  = isAdmin

  useEffect(() => {
    // Attendre que le profil soit chargé avant de fetcher l'équipe — évite la race
    // condition où user est défini mais profile.active_team_id est encore undefined,
    // ce qui écrase l'active_team_id en base avec teamsData[0].
    if (authLoading) return

    if (user && supabase) {
      if (isAdmin) {
        fetchingRef.current = false
        lastParamsRef.current = ''
      }
      fetchTeam()
    } else {
      setLoading(false)
      if (!user) {
        initializedRef.current = false
        lastParamsRef.current = ''
        setTeam(null)
        setAllTeams([])
        setPlayers([])
        setMyRole(null)
        setMyPlayerId(null)
      }
    }
  }, [user?.id, profile?.active_team_id, authLoading, isAdmin])

  const fetchTeam = async (overrideTeamId?: string) => {
    if (!supabase) { setLoading(false); return }
    // Dédupliquer : ignorer si un fetch est déjà en cours ou si les params n'ont pas changé
    // overrideTeamId bypasse la closure React (important pour switchTeam)
    const effectiveTeamId = overrideTeamId ?? profile?.active_team_id ?? null
    const params = `${user?.id}|${effectiveTeamId ?? ''}`
    if (fetchingRef.current) return
    if (params === lastParamsRef.current && initializedRef.current) return
    fetchingRef.current = true
    lastParamsRef.current = params
    if (!initializedRef.current) setLoading(true)
    perf.start('TeamContext.fetchTeam')
    try {
      // Parallélisation : teams + players (si active_team_id connu) partent en même temps
      const knownTeamId = effectiveTeamId
      const [
        { data: teamsData, error: teamsError },
        prefetchedPlayers,
      ] = await Promise.all([
        fetchAllTeams(user.id, isAdminRef.current),
        knownTeamId ? fetchPlayersByTeam(knownTeamId) : Promise.resolve(null),
      ])

      if (teamsError) {
        setTeam(null); setAllTeams([]); setPlayers([])
        setLoading(false); return
      }

      const normalizeTeam = (t: Team): Team => ({ ...t, logo_url: normalizeStorageUrl(t.logo_url) })
      const normalizedTeams = (teamsData || []).map(normalizeTeam)
      setAllTeams(normalizedTeams)

      let activeTeam = null
      if (knownTeamId) {
        activeTeam = normalizedTeams.find((t) => t.id === knownTeamId) ?? null
      }
      if (!activeTeam && normalizedTeams.length > 0) {
        activeTeam = normalizedTeams[0]
        if (user && !knownTeamId) {
          await upsertProfile(user.id, { active_team_id: activeTeam.id })
          lastParamsRef.current = `${user.id}|${activeTeam.id}`
        }
      }

      setTeam(activeTeam)

      // Determine current user's role
      if (activeTeam) {
        const isOwner = activeTeam.user_id === user?.id
        if (isAdminRef.current || isOwner) {
          setMyRole('owner')
          setMyPlayerId(null)
        } else if (supabase) {
          const { data: memberRow } = await supabase
            .from('team_members')
            .select('role, player_id')
            .eq('team_id', activeTeam.id)
            .eq('user_id', user.id)
            .maybeSingle()
          setMyRole((memberRow?.role as TeamRole) ?? null)
          setMyPlayerId(memberRow?.player_id ?? null)
        }
      } else {
        setMyRole(null)
        setMyPlayerId(null)
      }

      if (activeTeam) {
        // Si l'équipe active correspond au prefetch, réutiliser — sinon re-fetch
        const players = (prefetchedPlayers && activeTeam.id === knownTeamId)
          ? prefetchedPlayers
          : await fetchPlayersByTeam(activeTeam.id)
        if (players.error) throw players.error
        setPlayers(players.data || [])
      } else {
        setPlayers([])
      }
    } catch (error) {
      console.error('[TeamContext] error:', error)
      setTeam(null); setPlayers([])
    } finally {
      initializedRef.current = true
      fetchingRef.current = false
      setLoading(false)
      perf.end('TeamContext.fetchTeam')
    }
  }

  const switchTeam = async (teamId: string) => {
    if (!user) return
    // Écriture en DB
    await upsertProfile(user.id, { active_team_id: teamId })
    // Reset des guards de déduplication pour que le fetch parte immédiatement,
    // sans attendre que le useEffect se déclenche (qui dépend de profile?.active_team_id
    // mis à jour par refreshProfile, potentiellement bloqué si un fetch est en cours)
    fetchingRef.current = false
    lastParamsRef.current = ''
    // Fetch direct avec le nouvel ID — bypasse la closure React stale
    await fetchTeam(teamId)
    // Sync AuthContext en arrière-plan (non-bloquant)
    refreshProfile().catch(() => {})
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
    const normalized = { ...data, logo_url: normalizeStorageUrl(data.logo_url) }
    setTeam(normalized)
    return normalized
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

  const joinTeamByToken = async (token: string, role = 'member', position: string | null = null, playerId: string | null = null) => {
    if (!token || !user || !supabase) return { success: false, error: 'Token ou utilisateur invalide' }
    try {
      const { data, error } = await joinTeamByTokenQuery(token, role, position, playerId)
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

  const isTeamOwner = !!(team && user && (team.user_id === user.id || isAdmin))
  const isCoOwner = myRole === 'co_owner' || isAdmin
  const canManageTeam = isTeamOwner || isCoOwner

  const value = useMemo(() => ({
    team, allTeams, players, loading,
    createTeam, createNewTeam, switchTeam, updateTeam, deleteTeam,
    createPlayer, updatePlayer, batchUpdatePlayersSilent, deletePlayer,
    addChampionToPool, removeChampionFromPool,
    refetch: fetchTeam,
    getInviteLink, joinTeamByToken,
    isTeamOwner,
    myRole, myPlayerId, isCoOwner, canManageTeam,
  }), [team, allTeams, players, loading, isTeamOwner, myRole, myPlayerId, isCoOwner, canManageTeam])

  return (
    <TeamContext.Provider value={value}>
      {children}
    </TeamContext.Provider>
  )
}
