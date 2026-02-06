import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Search, X } from 'lucide-react'
import { ROLES } from '../../lib/draftPhases'

export const ChampionSelectModal = ({ champions, onSelect, onClose, bannedChampions = [], pickedChampions = [] }) => {
  const [search, setSearch] = useState('')
  const [selectedRole, setSelectedRole] = useState('All')

  const unavailableChampions = [...bannedChampions, ...pickedChampions]

  const filteredChampions = useMemo(() => {
    return champions.filter(champ => {
      const matchesSearch = champ.name.toLowerCase().includes(search.toLowerCase())
      const matchesRole = selectedRole === 'All' || champ.roles.includes(selectedRole)
      const isAvailable = !unavailableChampions.includes(champ.id)
      return matchesSearch && matchesRole && isAvailable
    })
  }, [champions, search, selectedRole, unavailableChampions])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-dark-card border border-dark-border rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b border-dark-border flex justify-between items-center">
          <h2 className="font-display text-2xl font-bold">Sélectionner un champion</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Filters */}
        <div className="p-6 border-b border-dark-border space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un champion..."
              className="w-full pl-10 pr-4 py-2 bg-dark-bg border border-dark-border rounded-lg focus:border-accent-blue focus:outline-none"
            />
          </div>

          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setSelectedRole('All')}
              className={`px-4 py-2 rounded-lg transition-all ${
                selectedRole === 'All'
                  ? 'bg-accent-blue text-white'
                  : 'bg-dark-bg border border-dark-border hover:border-gray-600'
              }`}
            >
              Tous
            </button>
            {ROLES.map(role => (
              <button
                key={role}
                onClick={() => setSelectedRole(role)}
                className={`px-4 py-2 rounded-lg transition-all ${
                  selectedRole === role
                    ? 'bg-accent-blue text-white'
                    : 'bg-dark-bg border border-dark-border hover:border-gray-600'
                }`}
              >
                {role}
              </button>
            ))}
          </div>
        </div>

        {/* Champions Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
            {filteredChampions.map(champ => (
              <motion.button
                key={champ.id}
                onClick={() => onSelect(champ)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="aspect-square rounded-lg overflow-hidden border-2 border-dark-border hover:border-accent-blue transition-all"
              >
                <img
                  src={champ.image}
                  alt={champ.name}
                  className="w-full h-full object-cover"
                />
                <div className="text-xs mt-1 text-center truncate">{champ.name}</div>
              </motion.button>
            ))}
          </div>
          {filteredChampions.length === 0 && (
            <div className="text-center text-gray-400 py-12">
              Aucun champion trouvé
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}
