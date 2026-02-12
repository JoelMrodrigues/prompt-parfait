/**
 * Page Overview - Vue d'ensemble de l'équipe
 * Gestion de l'équipe et des joueurs
 */
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Plus } from 'lucide-react'
import { useTeam } from '../../../hooks/useTeam'
import { usePlayerSync } from '../hooks/usePlayerSync'
import { TeamForm } from '../components/TeamForm'
import { PlayerList } from '../components/PlayerList'
import { PlayerModal } from '../../../components/team/PlayerModal'
import { ConfirmModal } from '../../../components/common/ConfirmModal'

export const TeamOverviewPage = () => {
  const {
    team,
    players,
    loading,
    createTeam,
    createPlayer,
    updatePlayer,
    deletePlayer,
  } = useTeam()
  const { syncExistingPlayer } = usePlayerSync()

  const [showPlayerModal, setShowPlayerModal] = useState(false)
  const [editingPlayer, setEditingPlayer] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)

  const handleCreateTeam = async (teamName) => {
    await createTeam(teamName)
  }

  const handleSavePlayer = async (playerData) => {
    try {
      if (editingPlayer) {
        await updatePlayer(editingPlayer.id, playerData)
      } else {
        await createPlayer(playerData)
      }
      
      setShowPlayerModal(false)
      setEditingPlayer(null)
    } catch (error) {
      console.error('Erreur sauvegarde joueur:', error)
      alert(`Erreur lors de la sauvegarde: ${error.message}`)
    }
  }

  const handleEditPlayer = (player) => {
    setEditingPlayer(player)
    setShowPlayerModal(true)
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
      console.error('Erreur sync:', error)
      alert(`Erreur sync: ${error.message}`)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent-blue"></div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h2 className="font-display text-3xl font-bold mb-2">Vue d'ensemble</h2>
        <p className="text-gray-400">Gérez votre équipe et vos joueurs</p>
      </div>

      {/* Team Form (si pas d'équipe) */}
      {!team && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <TeamForm onSubmit={handleCreateTeam} />
        </motion.div>
      )}

      {/* Players Section */}
      {team && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-display text-2xl font-bold">Joueurs</h3>
            <button
              onClick={() => {
                setEditingPlayer(null)
                setShowPlayerModal(true)
              }}
              className="flex items-center gap-2 px-4 py-2 bg-accent-blue text-white rounded-lg hover:bg-accent-blue/90 transition-colors"
            >
              <Plus size={20} />
              <span>Ajouter un joueur</span>
            </button>
          </div>

          <PlayerList
            players={players}
            onEdit={handleEditPlayer}
            onDelete={setConfirmDelete}
            onSync={handleSyncPlayer}
          />
        </motion.div>
      )}

      {/* Player Modal */}
      {showPlayerModal && (
        <PlayerModal
          player={editingPlayer}
          onSave={handleSavePlayer}
          onClose={() => {
            setShowPlayerModal(false)
            setEditingPlayer(null)
          }}
        />
      )}

      {/* Confirm Delete Modal */}
      {confirmDelete && (
        <ConfirmModal
          title="Supprimer le joueur"
          message={`Êtes-vous sûr de vouloir supprimer ${confirmDelete.player_name} ?`}
          onConfirm={handleDeletePlayer}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  )
}
