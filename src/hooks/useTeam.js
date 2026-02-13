import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export const useTeam = () => {
  const { user } = useAuth()
  const [team, setTeam] = useState(null)
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user && supabase) {
      fetchTeam()
    } else {
      setLoading(false)
    }
  }, [user])

  const fetchTeam = async () => {
    if (!supabase) {
      setLoading(false)
      return
    }
    try {
      // Récupérer l'équipe : celle dont l'utilisateur est propriétaire OU membre invité
      const { data: teamsData, error: teamError } = await supabase
        .from('teams')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(1)

      if (teamError && teamError.code !== 'PGRST116') {
        console.error('Erreur récupération équipe:', teamError)
        setTeam(null)
        setPlayers([])
        setLoading(false)
        return
      }

      const teamData = Array.isArray(teamsData) ? teamsData[0] : teamsData
      setTeam(teamData)

      if (teamData) {
        // Récupérer les joueurs
        const { data: playersData, error: playersError } = await supabase
          .from('players')
          .select('*, champion_pools(*)')
          .eq('team_id', teamData.id)
          .order('player_order')

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
    const { data, error } = await supabase
      .from('teams')
      .insert([{ user_id: user.id, team_name: teamName }])
      .select()
      .single()

    if (error) throw error
    setTeam(data)
    return data
  }

  const updateTeam = async (teamId, updates) => {
    const { data, error } = await supabase
      .from('teams')
      .update(updates)
      .eq('id', teamId)
      .select()
      .single()

    if (error) throw error
    setTeam(data)
    return data
  }

  const createPlayer = async (playerData) => {
    // Filtrer les valeurs undefined pour éviter les erreurs Supabase
    const cleanData = Object.fromEntries(
      Object.entries({ ...playerData, team_id: team.id }).filter(([, v]) => v !== undefined)
    )
    // S'assurer que top_champions est bien formaté pour JSONB
    const dataToInsert = cleanData
    
    if (dataToInsert.top_champions) {
      // Si c'est déjà un array, Supabase le convertira automatiquement en JSONB
      // Si c'est null, on le laisse tel quel
      if (Array.isArray(dataToInsert.top_champions)) {
        console.log('💾 Sauvegarde top_champions:', dataToInsert.top_champions)
      }
    }
    
    const { data, error } = await supabase
      .from('players')
      .insert([dataToInsert])
      .select()
      .single()

    if (error) {
      console.error('Erreur création joueur:', error)
      throw error
    }
    await fetchTeam()
    return data
  }

  const updatePlayer = async (playerId, updates) => {
    // Filtrer les valeurs undefined pour éviter les erreurs Supabase
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    )
    // S'assurer que top_champions est bien formaté pour JSONB
    if (cleanUpdates.top_champions) {
      if (Array.isArray(cleanUpdates.top_champions)) {
        console.log('💾 Mise à jour top_champions:', cleanUpdates.top_champions)
      }
    }

    // Mise à jour sans .single() pour éviter l'erreur si aucune ligne n'est retournée
    const { data, error } = await supabase
      .from('players')
      .update(cleanUpdates)
      .eq('id', playerId)
      .select()

    if (error) {
      console.error('Erreur mise à jour joueur:', error)
      throw error
    }
    
    // Vérifier que la mise à jour a réussi
    if (!data || data.length === 0) {
      console.warn('⚠️ Aucune ligne mise à jour pour le joueur:', playerId)
      throw new Error('Joueur non trouvé ou mise à jour échouée')
    }
    
    await fetchTeam()
    return data[0] // Retourner la première ligne
  }

  const deletePlayer = async (playerId) => {
    const { error } = await supabase
      .from('players')
      .delete()
      .eq('id', playerId)

    if (error) throw error
    await fetchTeam()
  }

  const addChampionToPool = async (playerId, championId, masteryLevel) => {
    const { data, error } = await supabase
      .from('champion_pools')
      .insert([{ player_id: playerId, champion_id: championId, mastery_level: masteryLevel }])
      .select()
      .single()

    if (error) throw error
    await fetchTeam()
    return data
  }

  const removeChampionFromPool = async (poolId) => {
    const { error } = await supabase
      .from('champion_pools')
      .delete()
      .eq('id', poolId)

    if (error) throw error
    await fetchTeam()
  }

  /** Génère ou récupère le lien d'invitation pour rejoindre l'équipe */
  const getInviteLink = async () => {
    if (!team?.id || !supabase) return null
    try {
      const { data: teamRow } = await supabase
        .from('teams')
        .select('invite_token')
        .eq('id', team.id)
        .single()
      let token = teamRow?.invite_token
      if (!token) {
        const { data: updated } = await supabase
          .from('teams')
          .update({ invite_token: crypto.randomUUID() })
          .eq('id', team.id)
          .select('invite_token')
          .single()
        token = updated?.invite_token
      }
      if (!token) return null
      return `${window.location.origin}/team/join/${token}`
    } catch (e) {
      console.error('getInviteLink', e)
      return null
    }
  }

  /** Rejoindre une équipe via le token d'invitation (appelle la RPC Supabase) */
  const joinTeamByToken = async (token) => {
    if (!token || !user || !supabase) return { success: false, error: 'Token ou utilisateur invalide' }
    try {
      const { data, error } = await supabase.rpc('join_team_by_token', { p_token: token })
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

  const isTeamOwner = team && user && team.user_id === user.id

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
    isTeamOwner,
  }
}
