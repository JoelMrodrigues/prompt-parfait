import { useState } from 'react'
import { motion } from 'framer-motion'
import { X, Search } from 'lucide-react'

const MOCK_CHAMPIONS = [
  'Aatrox',
  'Ahri',
  'Akali',
  'Alistar',
  'Amumu',
  'Anivia',
  'Annie',
  'Aphelios',
  'Ashe',
  'AurelionSol',
  'Azir',
  'Bard',
  'Blitzcrank',
  'Brand',
  'Braum',
  'Caitlyn',
]

const MASTERY_LEVELS = ['Comfortable', 'Main', 'Pocket']

export const AddChampionModal = ({ player, onSave, onClose }) => {
  const [selectedChampion, setSelectedChampion] = useState('')
  const [masteryLevel, setMasteryLevel] = useState('Comfortable')
  const [search, setSearch] = useState('')

  const filteredChampions = MOCK_CHAMPIONS.filter((champ) =>
    champ.toLowerCase().includes(search.toLowerCase())
  )

  const handleSubmit = (e) => {
    e.preventDefault()
    if (selectedChampion) {
      onSave(player.id, selectedChampion, masteryLevel)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-dark-card border border-dark-border rounded-lg p-6 max-w-md w-full"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="font-display text-xl font-bold">Ajouter un champion - {player?.name}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Rechercher un champion</label>
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                size={20}
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Taper un nom..."
                className="w-full pl-10 pr-4 py-2 bg-dark-bg border border-dark-border rounded-lg focus:border-accent-blue focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Champion</label>
            <select
              value={selectedChampion}
              onChange={(e) => setSelectedChampion(e.target.value)}
              className="w-full px-4 py-2 bg-dark-bg border border-dark-border rounded-lg focus:border-accent-blue focus:outline-none"
              required
            >
              <option value="">-- Sélectionner --</option>
              {filteredChampions.map((champ) => (
                <option key={champ} value={champ}>
                  {champ}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Niveau de maîtrise</label>
            <div className="grid grid-cols-3 gap-2">
              {MASTERY_LEVELS.map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setMasteryLevel(level)}
                  className={`py-2 rounded-lg transition-all ${
                    masteryLevel === level
                      ? 'bg-accent-blue text-white'
                      : 'bg-dark-bg border border-dark-border hover:border-gray-600'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-accent-blue text-white rounded-lg font-semibold hover:bg-accent-blue/90 transition-all"
          >
            Ajouter
          </button>
        </form>
      </motion.div>
    </div>
  )
}
