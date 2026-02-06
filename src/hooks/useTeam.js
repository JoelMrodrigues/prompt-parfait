import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export const useTeam = () => {
  const { user } = useAuth()
  const [team, setTeam] = useState(null)
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchTeam()
    }
  }, [user])

  const fetchTeam = async () => {
    try {
      // Récupérer l'équipe de l'utilisateur
      // Les policies RLS filtrent automatiquement par auth.uid()
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select('*')
        .maybeSingle() // Utiliser maybeSingle() au lieu de single() pour éviter les erreurs si aucune équipe

      if (teamError && teamError.code !== 'PGRST116') {
        console.error('Erreur récupération équipe:', teamError)
        throw teamError
      }

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
  }
}
