import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Search, X } from 'lucide-react'
import { ROLES } from '../../../lib/draftPhases'

export const ChampionSelectModal = ({
  champions,
  onSelect,
  onClose,
  bannedChampions = [],
  pickedChampions = [],
  currentPhase = null,
}) => {
  const [search, setSearch] = useState('')
  const [selectedRole, setSelectedRole] = useState('All')

  const unavailableChampions = useMemo(
    () => [...bannedChampions, ...pickedChampions],
    [bannedChampions, pickedChampions]
  )

  const { available, unavailable } = useMemo(() => {
    const filtered = champions.filter((champ) => {
      const matchesSearch = champ.name.toLowerCase().includes(search.toLowerCase())
      const matchesRole = selectedRole === 'All' || champ.roles.includes(selectedRole)
      return matchesSearch && matchesRole
    })
    return {
      available: filtered.filter((c) => !unavailableChampions.includes(c.id)),
      unavailable: filtered.filter((c) => unavailableChampions.includes(c.id)),
    }
  }, [champions, search, selectedRole, unavailableChampions])

  const isBan = currentPhase?.phase === 'ban'
  const isBlue = currentPhase?.team === 'blue'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.15 }}
        className="bg-dark-card border border-dark-border rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-dark-border flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h2 className="font-display text-xl font-bold text-white">
              {isBan ? 'Bannir un champion' : 'Choisir un champion'}
            </h2>
            {currentPhase && (
              <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                isBlue
                  ? 'bg-accent-blue/15 text-accent-blue border border-accent-blue/30'
                  : 'bg-red-500/15 text-red-400 border border-red-500/30'
              }`}>
                {currentPhase.label}
              </span>
            )}
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors p-1">
            <X size={20} />
          </button>
        </div>

        {/* Filters */}
        <div className="px-6 py-3 border-b border-dark-border space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
            <input
              autoFocus
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un champion…"
              className="w-full pl-9 pr-4 py-2 bg-dark-bg border border-dark-border rounded-lg text-sm focus:border-accent-blue focus:outline-none text-white placeholder-gray-600"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setSelectedRole('All')}
              className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                selectedRole === 'All'
                  ? 'bg-accent-blue text-white'
                  : 'bg-dark-bg border border-dark-border text-gray-400 hover:border-gray-500'
              }`}
            >
              Tous
            </button>
            {ROLES.map((role) => (
              <button
                key={role}
                onClick={() => setSelectedRole(role)}
                className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                  selectedRole === role
                    ? 'bg-accent-blue text-white'
                    : 'bg-dark-bg border border-dark-border text-gray-400 hover:border-gray-500'
                }`}
              >
                {role}
              </button>
            ))}
          </div>
        </div>

        {/* Champion grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {available.length === 0 && unavailable.length === 0 ? (
            <div className="text-center text-gray-500 py-12">Aucun champion trouvé</div>
          ) : (
            <div className="grid grid-cols-5 sm:grid-cols-7 md:grid-cols-9 gap-2">
              {/* Champions disponibles */}
              {available.map((champ) => (
                <motion.button
                  key={champ.id}
                  onClick={() => onSelect(champ)}
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.94 }}
                  className="flex flex-col items-center gap-1 group"
                >
                  <div className="w-full aspect-square rounded-xl overflow-hidden border-2 border-dark-border group-hover:border-accent-blue transition-colors">
                    <img src={champ.image} alt={champ.name} className="w-full h-full object-cover" />
                  </div>
                  <span className="text-[10px] text-gray-400 group-hover:text-white transition-colors leading-tight text-center w-full truncate px-0.5">
                    {champ.name}
                  </span>
                </motion.button>
              ))}
              {/* Champions indisponibles */}
              {unavailable.map((champ) => (
                <div key={champ.id} className="flex flex-col items-center gap-1 opacity-30 cursor-not-allowed">
                  <div className="w-full aspect-square rounded-xl overflow-hidden border-2 border-dark-border relative">
                    <img src={champ.image} alt={champ.name} className="w-full h-full object-cover saturate-0" />
                    <div className="absolute inset-0 bg-dark-bg/60 flex items-center justify-center">
                      <svg viewBox="0 0 100 100" className="w-8 h-8">
                        <line x1="15" y1="15" x2="85" y2="85" stroke="rgb(239,68,68)" strokeWidth="12" strokeLinecap="round" />
                        <line x1="85" y1="15" x2="15" y2="85" stroke="rgb(239,68,68)" strokeWidth="12" strokeLinecap="round" />
                      </svg>
                    </div>
                  </div>
                  <span className="text-[10px] text-gray-600 leading-tight text-center w-full truncate px-0.5">
                    {champ.name}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}
