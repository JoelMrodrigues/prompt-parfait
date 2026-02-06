/**
 * Formulaire de création/modification d'équipe
 */
import { useState } from 'react'
import { motion } from 'framer-motion'

export const TeamForm = ({ onSubmit, initialName = '' }) => {
  const [teamName, setTeamName] = useState(initialName)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (teamName.trim()) {
      onSubmit(teamName.trim())
      setTeamName('')
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-dark-card border border-dark-border rounded-lg p-6"
    >
      <h3 className="font-display text-xl font-bold mb-4">Créer une équipe</h3>
      <form onSubmit={handleSubmit} className="flex gap-3">
        <input
          type="text"
          value={teamName}
          onChange={(e) => setTeamName(e.target.value)}
          placeholder="Nom de l'équipe"
          className="flex-1 px-4 py-2 bg-dark-bg border border-dark-border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-accent-blue"
          required
        />
        <button
          type="submit"
          className="px-6 py-2 bg-accent-blue text-white rounded-lg hover:bg-accent-blue/90 transition-colors"
        >
          Créer
        </button>
      </form>
    </motion.div>
  )
}
