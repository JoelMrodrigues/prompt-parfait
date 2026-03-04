import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../contexts/AuthContext'
import {
  createTeam as createTeamQuery,
  updateTeam as updateTeamQuery,
  getOrCreateInviteToken,
  joinTeamByToken as joinTeamByTokenQuery,
} from '../../../services/supabase/teamQueries'
import {
  fetchAllTeams,
  upsertProfile,
} from '../../../services/supabase/profileQueries'
import {
  fetchPlayersByTeam,
  createPlayer as createPlayerQuery,
  updatePlayer as updatePlayerQuery,
  updatePlayerSilent,
  deletePlayer as deletePlayerQuery,
} from '../../../services/supabase/playerQueries'
import {
  addChampionToPool as addChampionQuery,
  removeChampionFromPool as removeChampionQuery,
} from '../../../services/supabase/championQueries'

export const useTeam = () => {
  const { user, profile, refreshProfile } = useAuth()
  const [team, setTeam] = useState(null)
  const [allTeams, setAllTeams] = useState([])
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user && supabase) fetchTeam()
    else setLoading(false)
  }, [user, profile?.active_team_id])

  const fetchTeam = async () => {
    if (!supabase) {
      setLoading(false)
      return
    }
    try {
      const { data: teamsData, error: teamsError } = await fetchAllTeams(user.id)
      if (teamsError) {
        console.error('Erreur récupération équipes:', teamsError)
        setTeam(null)
        setAllTeams([])
        setPlayers([])
        setLoading(false)
        return
      }

      setAllTeams(teamsData || [])

      // Déterminer l'équipe active : active_team_id du profil, sinon la première
      let activeTeam = null
      if (profile?.active_team_id) {
        activeTeam = teamsData?.find((t) => t.id === profile.active_team_id) ?? null
      }
      if (!activeTeam && teamsData?.length > 0) {
        activeTeam = teamsData[0]
        // Mémoriser comme active si pas encore défini
        if (user && !profile?.active_team_id) {
          await upsertProfile(user.id, { active_team_id: activeTeam.id })
        }
      }

      setTeam(activeTeam)
      if (activeTeam) {
        const { data: playersData, error: playersError } = await fetchPlayersByTeam(activeTeam.id)
        if (playersError) throw playersError
        setPlayers(playersData || [])
      } else {
        setPlayers([])
      }
    } catch (error) {
      console.error('Error fetching team:', error)
      setTeam(null)
      setPlayers([])
    } finally {
      setLoading(false)
    }
  }

  const switchTeam = async (teamId: string) => {
    if (!user) return
    await upsertProfile(user.id, { active_team_id: teamId })
    await refreshProfile()
    // fetchTeam sera re-déclenché via le useEffect sur profile.active_team_id
  }

  const createTeam = async (teamName: string) => {
    const { data, error } = await createTeamQuery(user.id, teamName)
    if (error) throw error
    // Définir la nouvelle équipe comme active
    await upsertProfile(user.id, { active_team_id: data.id })
    await refreshProfile()
    return data
  }

  const createNewTeam = async (teamName: string) => {
    return createTeam(teamName)
  }

  const updateTeam = async (teamId, updates) => {
    const { data, error } = await updateTeamQuery(teamId, updates)
    if (error) throw error
    setTeam(data)
    return data
  }

  const createPlayer = async (playerData) => {
    const cleanData = Object.fromEntries(
      Object.entries({ ...playerData, team_id: team.id }).filter(([, v]) => v !== undefined)
    )
    const { data, error } = await createPlayerQuery(cleanData)
    if (error) {
      console.error('Erreur création joueur:', error)
      throw error
    }
    await fetchTeam()
    return data
  }

  const updatePlayer = async (playerId, updates) => {
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    )
    const onlySoloqTotal = Object.keys(cleanUpdates).every(
      (k) => k === 'soloq_total_match_ids' || k === 'soloq_total_match_ids_secondary'
    )
    if (onlySoloqTotal && Object.keys(cleanUpdates).length > 0) {
      const { error } = await updatePlayerSilent(playerId, cleanUpdates)
      if (error) {
        console.error('Erreur mise à jour joueur:', error)
        throw error
      }
      await fetchTeam()
      return null
    }
    const { data, error } = await updatePlayerQuery(playerId, cleanUpdates)
    if (error) {
      console.error('Erreur mise à jour joueur:', error)
      throw error
    }
    if (!data || data.length === 0) throw new Error('Joueur non trouvé ou mise à jour échouée')
    await fetchTeam()
    return data[0]
  }

  const deletePlayer = async (playerId) => {
    const { error } = await deletePlayerQuery(playerId)
    if (error) throw error
    await fetchTeam()
  }

  const addChampionToPool = async (playerId, championId, masteryLevel) => {
    const { data, error } = await addChampionQuery(playerId, championId, masteryLevel)
    if (error) throw error
    await fetchTeam()
    return data
  }

  const removeChampionFromPool = async (poolId) => {
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

  const joinTeamByToken = async (token) => {
    if (!token || !user || !supabase)
      return { success: false, error: 'Token ou utilisateur invalide' }
    try {
      const { data, error } = await joinTeamByTokenQuery(token)
      if (error) return { success: false, error: error.message }
      const result = data || {}
      if (!result.success) return { success: false, error: result.error || 'Lien invalide' }
      await fetchTeam()
      return { success: true, teamName: result.team_name }
    } catch (e) {
      console.error('joinTeamByToken', e)
      return { success: false, error: e.message }
    }
  }

  return {
    team,
    allTeams,
    players,
    loading,
    createTeam,
    createNewTeam,
    switchTeam,
    updateTeam,
    createPlayer,
    updatePlayer,
    deletePlayer,
    addChampionToPool,
    removeChampionFromPool,
    refetch: fetchTeam,
    getInviteLink,
    joinTeamByToken,
    isTeamOwner: team && user && team.user_id === user.id,
  }
}
