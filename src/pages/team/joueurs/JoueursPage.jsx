/**
 * Page Joueurs - Gestion des joueurs de l'équipe
 */
import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useTeam } from '../../../hooks/useTeam'
import { usePlayerSync } from '../hooks/usePlayerSync'
import { PlayerList } from '../components/PlayerList'
import { PlayerModal } from '../../../components/team/PlayerModal'
import { ConfirmModal } from '../../../components/common/ConfirmModal'

export const JoueursPage = () => {
  const {
    team,
    players,
    loading,
    createPlayer,
    updatePlayer,
    deletePlayer,
  } = useTeam()

  const { syncPlayerData, syncExistingPlayer } = usePlayerSync()

  const [showPlayerModal, setShowPlayerModal] = useState(false)
  const [editingPlayer, setEditingPlayer] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)

  const handleSavePlayer = async (playerData) => {
    try {
      const syncedData = await syncPlayerData(playerData)
      if (editingPlayer) {
        await updatePlayer(editingPlayer.id, syncedData)
      } else {
        await createPlayer(syncedData)
      }
      setShowPlayerModal(false)
      setEditingPlayer(null)
    } catch (error) {
      console.error('Erreur sauvegarde joueur:', error)
      alert(`Erreur lors de la sauvegarde: ${error.message}`)
    }
  }

  const handleDeletePlayer = async () => {
    if (confirmDelete) {
      await deletePlayer(confirmDelete.id)
      setConfirmDelete(null)
    }
  }

  const handleSyncPlayer = async (player) => {
    try {
      const updateData = await syncExistingPlayer(player)
      await updatePlayer(player.id, updateData)
    } catch (error) {
      console.error('Erreur synchronisation:', error)
      alert(`Erreur lors de la synchronisation: ${error.message}`)
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
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="font-display text-3xl font-bold mb-2">Joueurs</h2>
          <p className="text-gray-400">Gérez les joueurs de votre équipe</p>
        </div>
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

      <PlayerList
        players={players}
        onEdit={(p) => {
          setEditingPlayer(p)
          setShowPlayerModal(true)
        }}
        onDelete={(p) => setConfirmDelete(p)}
        onSync={handleSyncPlayer}
      />

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
