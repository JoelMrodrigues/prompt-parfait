import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../contexts/AuthContext'
import {
  fetchFirstTeam,
  createTeam as createTeamQuery,
  updateTeam as updateTeamQuery,
  getOrCreateInviteToken,
  joinTeamByToken as joinTeamByTokenQuery,
} from '../../../services/supabase/teamQueries'
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
  const { user } = useAuth()
  const [team, setTeam] = useState(null)
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user && supabase) fetchTeam()
    else setLoading(false)
  }, [user])

  const fetchTeam = async () => {
    if (!supabase) {
      setLoading(false)
      return
    }
    try {
      const { data: teamData, error: teamError } = await fetchFirstTeam()
      if (teamError && teamError.code !== 'PGRST116') {
        console.error('Erreur récupération équipe:', teamError)
        setTeam(null)
        setPlayers([])
        setLoading(false)
        return
      }
      setTeam(teamData)
      if (teamData) {
        const { data: playersData, error: playersError } = await fetchPlayersByTeam(teamData.id)
        if (playersError) throw playersError
        setPlayers(playersData || [])
      }
    } catch (error) {
      console.error('Error fetching team:', error)
      setTeam(null)
      setPlayers([])
    } finally {
      setLoading(false)
    }
  }

  const createTeam = async (teamName) => {
    const { data, error } = await createTeamQuery(user.id, teamName)
    if (error) throw error
    setTeam(data)
    return data
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
    players,
    loading,
    createTeam,
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
